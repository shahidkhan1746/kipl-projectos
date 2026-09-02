import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'endpoints.dart';

// Default Production API endpoint
const kDefaultBaseUrl = 'https://kiplstpsrinagar.com/api/v1';

// Key for custom server URL stored in device secure storage
const kServerUrlStorageKey = 'kipl_server_url';
const kAccessTokenStorageKey = 'access_token';
const kRefreshTokenStorageKey = 'refresh_token';
const kUserStorageKey = 'user_data';

final storageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(storageProvider);
  return ApiClient(storage);
});

final dioProvider = Provider<Dio>((ref) {
  return ref.watch(apiClientProvider).dio;
});

class ApiClient {
  final FlutterSecureStorage _storage;
  late final Dio dio;

  ApiClient(this._storage) {
    dio = Dio(BaseOptions(
      baseUrl: kDefaultBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ));

    dio.interceptors.add(_AuthInterceptor(dio, _storage));
    _initBaseUrl();
  }

  Future<void> _initBaseUrl() async {
    final customUrl = await _storage.read(key: kServerUrlStorageKey);
    if (customUrl != null && customUrl.trim().isNotEmpty) {
      dio.options.baseUrl = customUrl.trim();
    }
  }

  Future<void> setBaseUrl(String url) async {
    final cleaned = url.trim().replaceAll(RegExp(r'/$'), '');
    await _storage.write(key: kServerUrlStorageKey, value: cleaned);
    dio.options.baseUrl = cleaned;
  }

  Future<String> getBaseUrl() async {
    final stored = await _storage.read(key: kServerUrlStorageKey);
    return stored ?? kDefaultBaseUrl;
  }
}

class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  _AuthInterceptor(this._dio, this._storage);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Inject Authorization header if token exists and not already provided
    if (!options.headers.containsKey('Authorization')) {
      final token = await _storage.read(key: kAccessTokenStorageKey);
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Auto-refresh token on 401 Unauthorized
    if (err.response?.statusCode == 401 && !err.requestOptions.path.contains('/auth/')) {
      try {
        final refreshToken = await _storage.read(key: kRefreshTokenStorageKey);
        if (refreshToken == null || refreshToken.isEmpty) {
          throw Exception('No refresh token available');
        }

        // Dedicated Dio instance for refresh request to avoid interceptor loop
        final refreshDio = Dio(BaseOptions(baseUrl: _dio.options.baseUrl));
        final response = await refreshDio.post(
          ApiEndpoints.refresh,
          data: {'refresh_token': refreshToken},
        );

        final newAccessToken = response.data['access_token'] as String;
        await _storage.write(key: kAccessTokenStorageKey, value: newAccessToken);

        // Retry original request with newly refreshed token
        final retryOptions = err.requestOptions;
        retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final clonedRequest = await _dio.fetch(retryOptions);
        return handler.resolve(clonedRequest);
      } catch (refreshErr) {
        // Refresh failed: clear credentials
        await _storage.delete(key: kAccessTokenStorageKey);
        await _storage.delete(key: kRefreshTokenStorageKey);
        await _storage.delete(key: kUserStorageKey);
      }
    }
    handler.next(err);
  }
}
