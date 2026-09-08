import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/api/api_client.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';

/// The mobile app shipped pointing at `https://kiplstpsrinagar.com/api/v1`.
/// That host is the Vercel-served website, not the API: `frontend/vercel.json`
/// rewrites `/(.*)` to `/index.html`, so every path there is a static asset —
/// a GET returns HTML and a POST returns 405 Method Not Allowed.
///
/// The app reported all of it as "Login failed. Please check credentials.",
/// which sent a site engineer hunting for a password problem that never
/// existed. These pin the diagnosis, because the wording *is* the fix: it is
/// the only thing that tells someone in the field to change the address.
void main() {
  Response<dynamic> res(int status, dynamic body) => Response<dynamic>(
        requestOptions: RequestOptions(path: '/health'),
        statusCode: status,
        data: body,
      );

  group('endpoint probe', () {
    test('accepts the API by its health marker', () {
      final probe = ApiClient.readProbeResponse(
        res(200, {'service': 'kipl-projectos-api', 'status': 'ok'}),
      );
      expect(probe.ok, isTrue);
      expect(probe.status, EndpointStatus.reachable);
    });

    test('names the website when a 405 comes back', () {
      // Vercel's catch-all rewrite serves index.html for every path, so
      // nothing on that host accepts a POST. 405 identifies it exactly.
      final probe = ApiClient.readProbeResponse(res(405, null));
      expect(probe.ok, isFalse);
      expect(probe.message, contains('website'));
      expect(probe.message, contains('405'));
    });

    test('rejects a host that answers with a web page', () {
      final probe = ApiClient.readProbeResponse(
        res(200, '<!doctype html><html><body>KIPL</body></html>'),
      );
      expect(probe.ok, isFalse);
      expect(probe.message, contains('web page'));
    });

    test('accepts an older deployment that predates the health endpoint', () {
      // Nest answers an unknown route as JSON through its exception filter,
      // which is still proof an API is on the other end. Rejecting it would
      // tell staff a correct address was wrong.
      final probe = ApiClient.readProbeResponse(
        res(404, {'statusCode': 404, 'message': 'Cannot GET /api/v1/health'}),
      );
      expect(probe.ok, isTrue);
      expect(probe.message, contains('older deployment'));
    });

    test('rejects anything else that answers', () {
      final probe = ApiClient.readProbeResponse(res(502, 'Bad Gateway'));
      expect(probe.ok, isFalse);
      expect(probe.message, contains('502'));
    });

    test('rejects a malformed address without touching the network', () async {
      final probe = await ApiClient.probeBaseUrl('not a url');
      expect(probe.ok, isFalse);
    });

    test('rejects a plain-HTTP public address without touching the network', () async {
      // _normalizeBaseUrl allows http only for loopback; anything else must
      // fail here rather than downgrading site traffic to cleartext.
      final probe = await ApiClient.probeBaseUrl('http://example.com/api/v1');
      expect(probe.ok, isFalse);
      expect(probe.message.toLowerCase(), contains('https'));
    });
  });

  group('developer-only addresses', () {
    test('flags the emulator loopback alias', () {
      // A device that saved this keeps calling an address that cannot resolve
      // on a physical phone, silently, on every launch.
      expect(ApiClient.isDeveloperOnlyHost('http://10.0.2.2:3000/api/v1'), isTrue);
      expect(ApiClient.isDeveloperOnlyHost('http://localhost:3000/api/v1'), isTrue);
      expect(ApiClient.isDeveloperOnlyHost('http://127.0.0.1:3000/api/v1'), isTrue);
    });

    test('leaves a real address alone', () {
      expect(
        ApiClient.isDeveloperOnlyHost('https://kiplstpsrinagar.com/api/v1'),
        isFalse,
      );
    });

    test('tolerates junk instead of throwing', () {
      expect(ApiClient.isDeveloperOnlyHost(''), isFalse);
      expect(ApiClient.isDeveloperOnlyHost('   '), isFalse);
    });
  });

  group('login failure wording', () {
    DioException badResponse(int status) => DioException(
          requestOptions: RequestOptions(path: '/auth/login'),
          response: Response<dynamic>(
            requestOptions: RequestOptions(path: '/auth/login'),
            statusCode: status,
          ),
          type: DioExceptionType.badResponse,
        );

    test('a 405 blames the address, not the password', () {
      final message = loginErrorMessageForTest(badResponse(405));
      expect(message, contains('website'));
      expect(message, contains('Server Configuration'));
      expect(message.toLowerCase(), isNot(contains('credential')));
    });

    test('another unexpected status still points at the address', () {
      expect(loginErrorMessageForTest(badResponse(502)), contains('502'));
    });
  });
}
