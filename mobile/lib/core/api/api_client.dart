import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'endpoints.dart';

/// The API endpoint a fresh install talks to.
///
/// Override it at build time:
///   flutter build apk --dart-define=KIPL_API_BASE_URL=https://<host>/api/v1
///
/// This points at Render DIRECTLY, not at `kiplstpsrinagar.com`, even though
/// `frontend/vercel.json` now rewrites `/api/v1/*` through to the same
/// service. The proxy exists for the web app, which benefits from a single
/// origin and no CORS configuration. A native app gets nothing from it and
/// pays for it: the free-tier instance takes ~50 seconds to wake, and a proxy
/// in front of it enforces its own, shorter deadline, so a cold start turns
/// into a 504 the client has to retry around instead of a slow response it can
/// simply wait out. One fewer hop, on the path where the wake actually has to
/// be survived.
///
/// It used to default to `https://kiplstpsrinagar.com/api/v1` with no rewrite
/// in place, so every request landed on the Vercel-served website: a GET
/// returned HTML and a POST returned 405. Site staff were told to check
/// credentials that were never wrong.
const kDefaultBaseUrl = String.fromEnvironment(
  'KIPL_API_BASE_URL',
  defaultValue: 'https://kipl-projectos.onrender.com/api/v1',
);

/// The outcome of checking an address under Server Configuration.
enum EndpointStatus {
  /// The KIPL API answered.
  reachable,

  /// Something answered, but it was not the API.
  notTheApi,

  /// Nothing answered at all.
  unreachable,

  /// The request timed out, which on the free tier may just be a cold start.
  slow,
}

class EndpointProbe {
  const EndpointProbe(this.status, this.message);

  final EndpointStatus status;
  final String message;

  bool get ok => status == EndpointStatus.reachable;
}

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

  /// Drops any saved override and returns to the built-in endpoint.
  ///
  /// A stale override is invisible and permanent: a device that once held
  /// `http://10.0.2.2:3000/api/v1` — the Android emulator's loopback alias —
  /// keeps talking to an address that cannot exist on a physical phone, on
  /// every launch, forever, and reports it as a failed login.
  Future<void> clearBaseUrl() async {
    await _storage.delete(key: kServerUrlStorageKey);
    dio.options.baseUrl = kDefaultBaseUrl;
  }

  /// True for addresses that only resolve inside an emulator or on the machine
  /// running the server. Saved on a real device they can never work.
  static bool isDeveloperOnlyHost(String url) {
    final host = Uri.tryParse(url.trim())?.host ?? '';
    return host == '10.0.2.2' || host == 'localhost' || host == '127.0.0.1';
  }

  /// Checks whether [url] actually serves the KIPL API, without signing in.
  ///
  /// Runs on a throwaway Dio so neither the live base URL nor the auth
  /// interceptors are touched — the address under test is usually one the user
  /// has not saved yet. Statuses are read rather than thrown on, because the
  /// status *is* the diagnosis: 405 identifies the website, not a fault.
  static Future<EndpointProbe> probeBaseUrl(String url, {Dio? client}) async {
    final String base;
    try {
      base = _normalizeBaseUrl(url);
    } on FormatException catch (error) {
      return EndpointProbe(EndpointStatus.notTheApi, error.message);
    }

    final dio = client ??
        Dio(BaseOptions(
          connectTimeout: const Duration(seconds: 20),
          receiveTimeout: kColdStartReceiveTimeout,
          headers: {'Accept': 'application/json'},
        ));

    try {
      final res = await dio.get<dynamic>(
        '$base/health',
        options: Options(validateStatus: (_) => true),
      );
      return _readProbe(res);
    } on DioException catch (err) {
      switch (err.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.sendTimeout:
          return const EndpointProbe(
            EndpointStatus.slow,
            'No reply in 90 seconds. The server sleeps when idle and takes '
            'about a minute to wake — check once more before changing the '
            'address.',
          );
        case DioExceptionType.badCertificate:
          return const EndpointProbe(
            EndpointStatus.notTheApi,
            'The security certificate for that address was rejected.',
          );
        default:
          return const EndpointProbe(
            EndpointStatus.unreachable,
            'Could not reach that address. Check the spelling and your '
            'network connection.',
          );
      }
    }
  }

  @visibleForTesting
  static EndpointProbe readProbeResponse(Response<dynamic> res) => _readProbe(res);

  static EndpointProbe _readProbe(Response<dynamic> res) {
    final status = res.statusCode ?? 0;
    final body = res.data;

    // The marker the API's own health endpoint returns.
    if (body is Map && body['service'] == 'kipl-projectos-api') {
      return const EndpointProbe(
        EndpointStatus.reachable,
        'Reached the KIPL API. This address is correct.',
      );
    }

    // 405 is the signature of the Vercel-hosted website: its catch-all rewrite
    // serves index.html for every path, so nothing there accepts a POST.
    if (status == 405) {
      return const EndpointProbe(
        EndpointStatus.notTheApi,
        'That address is the KIPL website, not the API — it refuses POST '
        '(HTTP 405). The API runs on a separate host.',
      );
    }

    if (body is String && body.trimLeft().startsWith('<')) {
      return const EndpointProbe(
        EndpointStatus.notTheApi,
        'That address returns a web page, not the API.',
      );
    }

    // A deployment older than the health endpoint still answers as JSON
    // through the API's exception filter, so a JSON object is good evidence a
    // NestJS app is on the other end.
    if (body is Map) {
      return EndpointProbe(
        EndpointStatus.reachable,
        'An API answered (HTTP $status) but has no health check yet — most '
        'likely an older deployment. Sign-in should still work.',
      );
    }

    return EndpointProbe(
      EndpointStatus.notTheApi,
      'The address answered with HTTP $status, but not as the KIPL API.',
    );
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

  static const _retriesKey = '_coldStartRetries';

  /// Gateway statuses a sleeping instance produces once something in front of
  /// it stops waiting. Render answers 502/503 while an instance is still
  /// starting, and a proxy in front of it — the `/api/v1` rewrite in
  /// `frontend/vercel.json` — answers 504 when the upstream has not replied by
  /// the edge network's own deadline, which is shorter than a ~50 second
  /// free-tier wake. Treating those as permanent turns a cold start into a
  /// hard failure the client never recovers from.
  static const _gatewayStatuses = {502, 503, 504};

  /// Two rather than one, because of the proxied path. Going direct, the first
  /// attempt times out at 30s and the retry gets the full 90s, which clears a
  /// ~50s wake on its own. Behind a proxy the retry inherits the proxy's
  /// deadline instead of ours, so it can expire a second time while the
  /// instance is still coming up — a third attempt is what actually lands.
  static const maxColdStartRetries = 2;

  @visibleForTesting
  static bool safeToRepeat(RequestOptions options) {
    if (options.method.toUpperCase() == 'GET') return true;
    return options.path.contains('/auth/login');
  }

  @visibleForTesting
  static bool looksLikeColdStart(DioException err) {
    switch (err.type) {
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionTimeout:
        return true;
      case DioExceptionType.badResponse:
        return _gatewayStatuses.contains(err.response?.statusCode);
      default:
        return false;
    }
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final attempts = (err.requestOptions.extra[_retriesKey] as int?) ?? 0;

    if (!looksLikeColdStart(err) ||
        attempts >= maxColdStartRetries ||
        !safeToRepeat(err.requestOptions)) {
      handler.next(err);
      return;
    }

    final retryOptions = err.requestOptions;
    retryOptions.extra[_retriesKey] = attempts + 1;
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
