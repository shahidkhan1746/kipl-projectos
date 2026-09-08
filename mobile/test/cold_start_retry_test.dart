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

  group('timeout budget', () {
    test('the cold-start allowance exceeds a Render free-tier wake', () {
      // ~50s to wake; the allowance must clear it with headroom.
      expect(kColdStartReceiveTimeout.inSeconds, greaterThan(60));
    });

    test('the warm timeout stays short so a dead server fails fast', () {
      expect(kWarmReceiveTimeout.inSeconds, lessThanOrEqualTo(30));
      expect(kWarmReceiveTimeout, lessThan(kColdStartReceiveTimeout));
    });
  });
}
