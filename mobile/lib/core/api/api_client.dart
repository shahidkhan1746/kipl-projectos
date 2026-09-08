import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'endpoints.dart';

// Default Production API endpoint
const kDefaultBaseUrl = 'https://kiplstpsrinagar.com/api/v1';

// The API runs on Render's free tier, which spins the instance down when idle
// and takes roughly 50 seconds to wake. Render's router accepts the TCP
// connection immediately and holds the request while the instance starts, so a
// cold start does NOT look like a connect failure — it looks like a slow
// response. A 30s receive timeout therefore gave up before the server had
// finished waking, and the first request after an idle period could never
// succeed. That is why site staff saw "Login failed" on a perfectly healthy
// backend.
//
// Normal requests keep the short timeout so a genuinely dead server fails
// quickly; a request that times out is retried once with the long one.
const kWarmReceiveTimeout = Duration(seconds: 30);
const kColdStartReceiveTimeout = Duration(seconds: 90);

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
  late final Future<void> ready;
  void Function()? _onSessionExpired;

  ApiClient(this._storage) {
    dio = Dio(BaseOptions(
      baseUrl: kDefaultBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      // Without a send timeout a stalled upload — a site photo over a weak
      // link — hangs forever instead of failing. Generous enough for a
      // multi-megabyte multipart body on a slow connection.
      sendTimeout: const Duration(seconds: 60),
      receiveTimeout: kWarmReceiveTimeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ));

    ready = _initBaseUrl();
    // Ordered before auth so a cold-start retry happens before any token work.
    dio.interceptors.add(ColdStartInterceptor(dio));
    dio.interceptors.add(_AuthInterceptor(
      dio,
      _storage,
      waitUntilReady: () => ready,
      onSessionExpired: () => _onSessionExpired?.call(),
    ));
  }

  Future<void> _initBaseUrl() async {
    final customUrl = await _storage.read(key: kServerUrlStorageKey);
    if (customUrl != null && customUrl.trim().isNotEmpty) {
      try {
        dio.options.baseUrl = _normalizeBaseUrl(customUrl);
      } on FormatException {
        // Ignore an invalid legacy value and stay on the production endpoint.
        dio.options.baseUrl = kDefaultBaseUrl;
      }
    }
  }

  Future<void> setBaseUrl(String url) async {
    final cleaned = _normalizeBaseUrl(url);
    await _storage.write(key: kServerUrlStorageKey, value: cleaned);
    dio.options.baseUrl = cleaned;
  }

  Future<String> getBaseUrl() async {
    await ready;
    return dio.options.baseUrl;
  }

  void setSessionExpiredHandler(void Function()? handler) {
    _onSessionExpired = handler;
  }

  static String _normalizeBaseUrl(String value) {
    final cleaned = value.trim().replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(cleaned);
    if (uri == null || !uri.isAbsolute || uri.host.isEmpty) {
      throw const FormatException('Enter a complete server URL.');
    }

    final isLocalHost = uri.host == 'localhost' ||
        uri.host == '127.0.0.1' ||
        uri.host == '10.0.2.2';
    if (uri.scheme != 'https' && !(uri.scheme == 'http' && isLocalHost)) {
      throw const FormatException(
        'The server URL must use HTTPS (HTTP is allowed only for localhost).',
      );
    }
    return cleaned;
  }
}

class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  final Future<void> Function() waitUntilReady;
  final void Function() onSessionExpired;
  Future<String>? _refreshInFlight;

  _AuthInterceptor(
    this._dio,
    this._storage, {
    required this.waitUntilReady,
    required this.onSessionExpired,
  });

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    await waitUntilReady();
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
    final alreadyRetried = err.requestOptions.extra['_authRetried'] == true;
    if (err.response?.statusCode == 401 &&
        !err.requestOptions.path.contains('/auth/') &&
        !alreadyRetried) {
      try {
        _refreshInFlight ??= _refreshAccessToken();
        final newAccessToken = await _refreshInFlight!;

        // Retry original request with newly refreshed token
        final retryOptions = err.requestOptions;
        retryOptions.extra['_authRetried'] = true;
        retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final clonedRequest = await _dio.fetch(retryOptions);
        return handler.resolve(clonedRequest);
      } catch (_) {
        // Refresh failed: clear credentials
        await _storage.delete(key: kAccessTokenStorageKey);
        await _storage.delete(key: kRefreshTokenStorageKey);
        await _storage.delete(key: kUserStorageKey);
        onSessionExpired();
      } finally {
        _refreshInFlight = null;
      }
    }
    handler.next(err);
  }

  Future<String> _refreshAccessToken() async {
    await waitUntilReady();
    final refreshToken = await _storage.read(key: kRefreshTokenStorageKey);
    if (refreshToken == null || refreshToken.isEmpty) {
      throw StateError('No refresh token available');
    }

    // Dedicated Dio instance avoids an interceptor loop while preserving timeouts.
    final refreshDio = Dio(BaseOptions(
      baseUrl: _dio.options.baseUrl,
      connectTimeout: _dio.options.connectTimeout,
      sendTimeout: _dio.options.sendTimeout,
      receiveTimeout: _dio.options.receiveTimeout,
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ));
    final response = await refreshDio.post(
      ApiEndpoints.refresh,
      data: {'refresh_token': refreshToken},
    );
    final data = response.data;
    if (data is! Map || data['access_token'] is! String) {
      throw const FormatException('Invalid token refresh response');
    }

    final newAccessToken = data['access_token'] as String;
    await _storage.write(key: kAccessTokenStorageKey, value: newAccessToken);
    return newAccessToken;
  }
}

/// Retries one request that timed out waiting for a sleeping backend to wake.
///
/// Only requests that are safe to send twice are retried. A GET changes
/// nothing, and a repeated login at worst issues an extra refresh token. A
/// POST or PATCH is never retried here: a receive timeout means the request
/// WAS delivered, so the server may already have committed it, and replaying
/// it would duplicate a diary entry or an attendance record. Those keep the
/// existing behaviour — surfaced to the user, and queued only when the request
/// provably never left the device.
class ColdStartInterceptor extends Interceptor {
  final Dio _dio;

  ColdStartInterceptor(this._dio);

  static const _retriedFlag = '_coldStartRetried';

  @visibleForTesting
  static bool safeToRepeat(RequestOptions options) {
    if (options.method.toUpperCase() == 'GET') return true;
    return options.path.contains('/auth/login');
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final isTimeout = err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionTimeout;
    final alreadyRetried = err.requestOptions.extra[_retriedFlag] == true;

    if (!isTimeout || alreadyRetried || !safeToRepeat(err.requestOptions)) {
      handler.next(err);
      return;
    }

    final retryOptions = err.requestOptions;
    retryOptions.extra[_retriedFlag] = true;
    retryOptions.receiveTimeout = kColdStartReceiveTimeout;
    retryOptions.connectTimeout = kColdStartReceiveTimeout;

    try {
      handler.resolve(await _dio.fetch(retryOptions));
    } on DioException catch (retryErr) {
      handler.next(retryErr);
    } catch (_) {
      handler.next(err);
    }
  }
}
