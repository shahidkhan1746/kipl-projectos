import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';
import 'user_model.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AsyncValue<UserModel?>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(storageProvider);
  return AuthNotifier(apiClient, storage);
});

/// Test seam for AuthNotifier's login-failure message mapping.
String loginErrorMessageForTest(DioException err) =>
    AuthNotifier.loginErrorMessage(err);

/// The ONLY sanctioned way to read a user out of the auth state.
///
/// Never use `AsyncValue.value` for this. It RETHROWS when the state carries
/// an error and no previous data, and both login() and restoreSession() set
/// AsyncValue.error on failure — so `.value` turned every failed login into an
/// uncaught throw during build and a full-screen Flutter ErrorWidget reading
/// "Login failed. Please check your credentials.", which the worker could not
/// dismiss or retry from.
UserModel? userFromAuthState(AsyncValue<UserModel?> state) => state.valueOrNull;

final currentUserProvider = Provider<UserModel?>((ref) {
  return userFromAuthState(ref.watch(authStateProvider));
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user != null;
});

class AuthNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  final ApiClient _apiClient;
  final FlutterSecureStorage _storage;
  Dio get _dio => _apiClient.dio;

  AuthNotifier(this._apiClient, this._storage) : super(const AsyncValue.loading()) {
    _apiClient.setSessionExpiredHandler(_handleSessionExpired);
    restoreSession();
  }

  void _handleSessionExpired() {
    state = const AsyncValue.data(null);
  }

  @override
  void dispose() {
    _apiClient.setSessionExpiredHandler(null);
    super.dispose();
  }

  Future<void> restoreSession() async {
    try {
      await _apiClient.ready;
      final token = await _storage.read(key: kAccessTokenStorageKey);
      final userRaw = await _storage.read(key: kUserStorageKey);

      if (token != null && userRaw != null) {
        final Map<String, dynamic> userMap = jsonDecode(userRaw);
        state = AsyncValue.data(UserModel.fromJson(userMap));
        return;
      }

      await _clearLocalSession();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      await _clearLocalSession();
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      await _apiClient.ready;
      final response = await _dio.post(
        ApiEndpoints.login,
        data: {
          'email': email.trim(),
          'password': password,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final accessToken = data['access_token'] as String;
      final refreshToken = data['refresh_token'] as String;
      final userMap = Map<String, dynamic>.from(data['user'] as Map);

      await _storage.write(key: kAccessTokenStorageKey, value: accessToken);
      await _storage.write(key: kRefreshTokenStorageKey, value: refreshToken);

      // Dedicated dio with fresh token to resolve project and employee records
      final authedDio = Dio(BaseOptions(
        baseUrl: _dio.options.baseUrl,
        connectTimeout: _dio.options.connectTimeout,
        sendTimeout: _dio.options.sendTimeout,
        receiveTimeout: _dio.options.receiveTimeout,
        headers: {'Authorization': 'Bearer $accessToken'},
      ));

      // Resolve the authenticated account's employee through the dedicated
      // self-service endpoint; never infer identity from a broad directory.
      Map<String, dynamic>? employee;
      try {
        final empRes = await authedDio.get(ApiEndpoints.myEmployee);
        final data = empRes.data;
        if (data is Map) employee = Map<String, dynamic>.from(data);
        if (employee != null) {
          userMap['employeeId'] = employee['id'];
          if (employee['projectId'] != null) {
            userMap['projectId'] = employee['projectId'];
          }
        }
      } catch (_) {}

      // A single active project is an unambiguous fallback for accounts without
      // an employee project assignment. Never select an arbitrary first project.
      if (userMap['projectId'] == null) {
        try {
          final projRes = await authedDio.get(ApiEndpoints.projects);
          if (projRes.data is List) {
            final activeProjects = (projRes.data as List).where((raw) {
              return raw is Map &&
                  (raw['status']?.toString().toLowerCase() == 'active');
            }).toList();
            if (activeProjects.length == 1 && activeProjects.first is Map) {
              userMap['projectId'] = (activeProjects.first as Map)['id'];
            }
          }
        } catch (_) {}
      }

      await _storage.write(key: kUserStorageKey, value: jsonEncode(userMap));

      final user = UserModel.fromJson(userMap);
      state = AsyncValue.data(user);
      return true;
    } on DioException catch (dioErr) {
      await _clearLocalSession();
      state = AsyncValue.error(loginErrorMessage(dioErr), StackTrace.current);
      return false;
    } catch (e, st) {
      await _clearLocalSession();
      state = AsyncValue.error('Unexpected error: $e', st);
      return false;
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _storage.read(key: kRefreshTokenStorageKey);
      if (refreshToken != null) {
        try {
          await _dio.post(
            ApiEndpoints.logout,
            data: {'refresh_token': refreshToken},
          );
        } catch (_) {}
      }
    } finally {
      await _clearLocalSession();
      state = const AsyncValue.data(null);
    }
  }

  /// Turns a failed login into something a site engineer can act on.
  ///
  /// The old version fell back to "check your credentials" for every failure
  /// whose body was not a JSON object, which made a misrouted request look
  /// identical to a wrong password. The API answers a genuine rejection with
  /// {"statusCode":401,"message":"Invalid credentials"} — so if that message
  /// is absent, the request very likely never reached the API.
  @visibleForTesting
  static String loginErrorMessage(DioException err) {
    final status = err.response?.statusCode;
    final body = err.response?.data;

    // A message the API itself sent — always the most useful thing to show.
    if (body is Map && body['message'] != null) {
      final m = body['message'];
      return m is List ? m.join(', ') : m.toString();
    }

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.connectionError:
        return 'Cannot reach the KIPL server. Check your network, or the '
            'address under Server Configuration.';
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return 'The KIPL server is waking up and did not respond in time. '
            'It sleeps when idle and takes about a minute to start — wait a '
            'moment and sign in again.';
      case DioExceptionType.badCertificate:
        return 'The server\'s security certificate was rejected. Check the '
            'address under Server Configuration.';
      default:
        break;
    }

    // A response arrived but it was not the API's JSON. Almost always the
    // wrong address — a web page or proxy error answering instead of the API.
    if (status != null) {
      return 'The server answered with HTTP $status but not in the expected '
          'format, so this is probably not the KIPL API. Check the address '
          'under Server Configuration.';
    }
    return 'Login failed and the server gave no usable reply. Check the '
        'address under Server Configuration.';
  }

  Future<void> _clearLocalSession() async {
    await _storage.delete(key: kAccessTokenStorageKey);
    await _storage.delete(key: kRefreshTokenStorageKey);
    await _storage.delete(key: kUserStorageKey);
  }
}
