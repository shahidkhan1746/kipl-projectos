import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _baseUrl = 'http://10.0.2.2:3000/api/v1';
// Note: 10.0.2.2 = localhost on Android emulator
// For physical device: use your computer's local IP e.g. 192.168.1.x

final _storage = FlutterSecureStorage();

class ApiClient {
  late final Dio dio;

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
    ));
    dio.interceptors.add(_AuthInterceptor(dio));
  }
}

class _AuthInterceptor extends Interceptor {
  final Dio dio;
  _AuthInterceptor(this.dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      // Try refresh
      try {
        final refreshToken = await _storage.read(key: 'refresh_token');
        if (refreshToken == null) throw Exception('No refresh token');
        final res = await dio.post('/auth/refresh',
            data: {'refresh_token': refreshToken},
            options: Options(headers: {}));
        final newToken = res.data['access_token'] as String;
        await _storage.write(key: 'access_token', value: newToken);
        err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
        final retry = await dio.fetch(err.requestOptions);
        handler.resolve(retry);
        return;
      } catch (_) {
        await _storage.deleteAll();
      }
    }
    handler.next(err);
  }
}

final apiClient = ApiClient();
