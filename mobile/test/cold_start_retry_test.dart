import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/api/api_client.dart';

/// The API runs on Render's free tier: it sleeps when idle and takes ~50s to
/// wake, while the router holds the request open. A 30s receive timeout gave
/// up first, so the first request after an idle period always failed — which
/// is what site staff saw as "Login failed" on a healthy backend.
///
/// The retry must be limited to requests that are safe to send twice: a
/// receive timeout means the request WAS delivered, so replaying a write could
/// duplicate an attendance record or a diary entry.
void main() {
  RequestOptions req(String method, String path) =>
      RequestOptions(path: path, method: method);

  group('cold-start retry safety', () {
    test('retries a GET, which changes nothing on the server', () {
      expect(ColdStartInterceptor.safeToRepeat(req('GET', '/diary')), isTrue);
      expect(ColdStartInterceptor.safeToRepeat(req('get', '/hr/attendance')), isTrue);
    });

    test('retries login, because a repeat costs at most a spare token', () {
      expect(ColdStartInterceptor.safeToRepeat(req('POST', '/auth/login')), isTrue);
    });

    test('never retries a write that may already have been committed', () {
      // These are the duplicate-record risks the outbox also guards against.
      expect(ColdStartInterceptor.safeToRepeat(req('POST', '/hr/attendance')), isFalse);
      expect(ColdStartInterceptor.safeToRepeat(req('POST', '/diary')), isFalse);
      expect(ColdStartInterceptor.safeToRepeat(req('PATCH', '/site-orders/abc')), isFalse);
      expect(ColdStartInterceptor.safeToRepeat(req('POST', '/qa/ncrs')), isFalse);
      expect(ColdStartInterceptor.safeToRepeat(req('DELETE', '/tasks-board/abc')), isFalse);
    });
  });

  group('what counts as a cold start', () {
    DioException of(DioExceptionType type, {int? status}) => DioException(
          requestOptions: req('GET', '/diary'),
          type: type,
          response: status == null
              ? null
              : Response<dynamic>(
                  requestOptions: req('GET', '/diary'), statusCode: status),
        );

    test('a timeout is one', () {
      expect(
        ColdStartInterceptor.looksLikeColdStart(
            of(DioExceptionType.receiveTimeout)),
        isTrue,
      );
      expect(
        ColdStartInterceptor.looksLikeColdStart(
            of(DioExceptionType.connectionTimeout)),
        isTrue,
      );
    });

    test('a gateway status is one', () {
      // Render answers 502/503 while the instance is starting, and a proxy in
      // front of it answers 504 when it gives up before the wake completes.
      // Treating these as permanent is what makes the proxied path unusable.
      for (final status in [502, 503, 504]) {
        expect(
          ColdStartInterceptor.looksLikeColdStart(
              of(DioExceptionType.badResponse, status: status)),
          isTrue,
          reason: 'HTTP $status should be retried',
        );
      }
    });

    test('a real rejection is not', () {
      // Retrying these would hide a genuine fault behind extra requests.
      for (final status in [400, 401, 403, 404, 405, 409, 422, 500]) {
        expect(
          ColdStartInterceptor.looksLikeColdStart(
              of(DioExceptionType.badResponse, status: status)),
          isFalse,
          reason: 'HTTP $status must not be retried',
        );
      }
    });

    test('a cancellation is not', () {
      expect(
        ColdStartInterceptor.looksLikeColdStart(of(DioExceptionType.cancel)),
        isFalse,
      );
    });
  });

  group('timeout budget', () {
    test('the cold-start allowance exceeds a Render free-tier wake', () {
      // ~50s to wake; the allowance must clear it with headroom.
      expect(kColdStartReceiveTimeout.inSeconds, greaterThan(60));
    });

    test('the warm timeout stays short so a dead server fails fast', () {
      expect(kWarmReceiveTimeout.inSeconds, lessThanOrEqualTo(30));
      expect(kWarmReceiveTimeout, lessThan(kColdStartReceiveTimeout));
    });

    test('more than one retry, so the proxied path can also clear a wake', () {
      // Direct to Render one retry suffices, because the retry gets the full
      // 90s. Behind a proxy the retry inherits the proxy's shorter deadline
      // and can expire again while the instance is still coming up.
      expect(ColdStartInterceptor.maxColdStartRetries, greaterThanOrEqualTo(2));
    });
  });
}
