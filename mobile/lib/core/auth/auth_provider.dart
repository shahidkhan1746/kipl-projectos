import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';
import 'user_model.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AsyncValue<UserModel?>>((ref) {
  final dio = ref.watch(dioProvider);
  final storage = ref.watch(storageProvider);
  return AuthNotifier(dio, storage);
});

final currentUserProvider = Provider<UserModel?>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value;
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user != null;
});

class AuthNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthNotifier(this._dio, this._storage) : super(const AsyncValue.loading()) {
    restoreSession();
  }

  Future<void> restoreSession() async {
    try {
      final token = await _storage.read(key: kAccessTokenStorageKey);
      final userRaw = await _storage.read(key: kUserStorageKey);

      if (token != null && userRaw != null) {
        final Map<String, dynamic> userMap = jsonDecode(userRaw);
        state = AsyncValue.data(UserModel.fromJson(userMap));
        return;
      }

      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<bool> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
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
        headers: {'Authorization': 'Bearer $accessToken'},
      ));

      // 1. Resolve Active Project ID
      try {
        final projRes = await authedDio.get(ApiEndpoints.projects);
        if (projRes.data is List && (projRes.data as List).isNotEmpty) {
          userMap['projectId'] = projRes.data[0]['id'];
        }
      } catch (_) {}

      // 2. Resolve Employee ID matching user email
      try {
        final userEmail = userMap['email'] as String? ?? email.trim();
        final empRes = await authedDio.get(
          ApiEndpoints.employees,
          queryParameters: {'search': userEmail},
        );
        final List empList = empRes.data is List ? empRes.data : (empRes.data?['data'] is List ? empRes.data['data'] : []);
        if (empList.isNotEmpty) {
          userMap['employeeId'] = empList[0]['id'];
        }
      } catch (_) {}

      await _storage.write(key: kUserStorageKey, value: jsonEncode(userMap));

      final user = UserModel.fromJson(userMap);
      state = AsyncValue.data(user);
      return true;
    } on DioException catch (dioErr) {
      String msg = 'Login failed. Please check your credentials.';
      if (dioErr.response?.data != null && dioErr.response?.data['message'] != null) {
        final serverMsg = dioErr.response?.data['message'];
        msg = serverMsg is List ? serverMsg.join(', ') : serverMsg.toString();
      } else if (dioErr.type == DioExceptionType.connectionTimeout ||
          dioErr.type == DioExceptionType.connectionError) {
        msg = 'Unable to connect to KIPL server. Check your network or server URL.';
      }
      state = AsyncValue.error(msg, StackTrace.current);
      return false;
    } catch (e, st) {
      state = AsyncValue.error('Unexpected error: $e', st);
      return false;
    }
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _storage.read(key: kRefreshTokenStorageKey);
      if (refreshToken != null) {
        await _dio.post(
          ApiEndpoints.logout,
          data: {'refresh_token': refreshToken},
        ).catchError((_) {});
      }
    } finally {
      await _storage.delete(key: kAccessTokenStorageKey);
      await _storage.delete(key: kRefreshTokenStorageKey);
      await _storage.delete(key: kUserStorageKey);
      state = const AsyncValue.data(null);
    }
  }
}
