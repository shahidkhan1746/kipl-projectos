import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/utils/geofence_helper.dart';
import 'package:kipl_projectos/core/utils/json_parsers.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:dio/dio.dart';

/// Unit coverage for the pure logic behind field operations. These run on the
/// Dart VM with no device or emulator, so they gate a release build.
void main() {
  group('GeofenceHelper.calculateDistanceMeters', () {
    // The Nishat STP site, as used for attendance.
    const siteLat = GeofenceHelper.dalLakeStpLat;
    const siteLng = GeofenceHelper.dalLakeStpLng;

    double fromSite(double lat, double lng) =>
        GeofenceHelper.calculateDistanceMeters(
          startLatitude: lat,
          startLongitude: lng,
          endLatitude: siteLat,
          endLongitude: siteLng,
        );

    test('is zero at the site itself', () {
      expect(fromSite(siteLat, siteLng), closeTo(0, 0.001));
    });

    test('measures a known northward offset', () {
      // 1 degree of latitude is ~111.32 km, so +0.001796 deg is ~200 m.
      expect(fromSite(siteLat + 0.001796, siteLng), closeTo(200, 1.0));
    });

    test('is symmetric between the two points', () {
      final there = GeofenceHelper.calculateDistanceMeters(
        startLatitude: siteLat,
        startLongitude: siteLng,
        endLatitude: 34.10,
        endLongitude: 74.88,
      );
      final back = GeofenceHelper.calculateDistanceMeters(
        startLatitude: 34.10,
        startLongitude: 74.88,
        endLatitude: siteLat,
        endLongitude: siteLng,
      );
      expect(there, closeTo(back, 0.001));
    });

    test('puts Srinagar city centre outside the 500 m fence', () {
      // Lal Chowk is ~6 km from the site — a worker punching in from town.
      final distance = fromSite(34.0754, 74.8060);
      expect(distance, greaterThan(GeofenceHelper.defaultGeofenceRadiusMeters));
      expect(distance, closeTo(6400, 400));
    });
  });

  group('GeofenceResult.error', () {
    test('reports an unreachable distance so it can never read as inside', () {
      final result = GeofenceResult.error('GPS disabled');
      expect(result.isInside, isFalse);
      expect(result.distanceMeters, double.infinity);
      expect(result.errorMessage, 'GPS disabled');
      expect(result.position, isNull);
    });
  });

  group('json parsers', () {
    test('reads numbers straight through', () {
      expect(jsonDouble(12.5), 12.5);
      expect(jsonInt(7), 7);
    });

    test('reads the strings Postgres returns for decimal columns', () {
      // TypeORM hands back decimals as strings; distanceFromSite and
      // hoursWorked arrive this way.
      expect(jsonDouble('12.5'), 12.5);
      expect(jsonInt('7'), 7);
      expect(jsonDouble(' 12.5 '), 12.5);
    });

    test('truncates a double toward zero when an int is wanted', () {
      expect(jsonInt(7.9), 7);
    });

    test('returns null rather than throwing on junk', () {
      expect(jsonDouble(null), isNull);
      expect(jsonDouble('abc'), isNull);
      expect(jsonDouble(''), isNull);
      expect(jsonInt(null), isNull);
      expect(jsonInt('abc'), isNull);
      expect(jsonInt(<String>[]), isNull);
    });
  });

  group('shouldQueueOffline', () {
    DioException of(DioExceptionType type) => DioException(
          requestOptions: RequestOptions(path: '/hr/attendance'),
          type: type,
        );

    test('queues failures where the request never reached the server', () {
      expect(shouldQueueOffline(of(DioExceptionType.connectionError)), isTrue);
      expect(shouldQueueOffline(of(DioExceptionType.connectionTimeout)), isTrue);
    });

    test('does not queue a send or receive timeout', () {
      // These are ambiguous: the server may already have committed the POST,
      // so replaying would double-write a diary entry or attendance record.
      expect(shouldQueueOffline(of(DioExceptionType.sendTimeout)), isFalse);
      expect(shouldQueueOffline(of(DioExceptionType.receiveTimeout)), isFalse);
    });

    test('does not queue a rejection the server actually issued', () {
      expect(shouldQueueOffline(of(DioExceptionType.badResponse)), isFalse);
      expect(shouldQueueOffline(of(DioExceptionType.cancel)), isFalse);
    });
  });

  group('dioErrorMessage', () {
    DioException withData(dynamic data) => DioException(
          requestOptions: RequestOptions(path: '/hr/attendance'),
          response: Response(
            requestOptions: RequestOptions(path: '/hr/attendance'),
            data: data,
          ),
        );

    test('surfaces the server message', () {
      expect(
        dioErrorMessage(withData({'message': 'Outside geofence'}), 'fallback'),
        'Outside geofence',
      );
    });

    test('joins the list of messages class-validator returns', () {
      expect(
        dioErrorMessage(
          withData({
            'message': ['date must be a date string', 'status is required'],
          }),
          'fallback',
        ),
        'date must be a date string, status is required',
      );
    });

    test('falls back when the body carries no message', () {
      expect(dioErrorMessage(withData({'error': 'x'}), 'fallback'), 'fallback');
      expect(dioErrorMessage(withData('plain text'), 'fallback'), 'fallback');
    });
  });

  group('OutboxEntry serialisation', () {
    test('round-trips through JSON', () {
      final entry = OutboxEntry(
        id: 'outbox_1',
        endpoint: '/hr/attendance',
        method: 'POST',
        payload: {'employeeId': 'emp-1', 'status': 'present'},
        createdAt: DateTime.parse('2026-04-10T09:00:00.000Z'),
        ownerUserId: 'user-1',
        serverBaseUrl: 'https://kiplstpsrinagar.com/api/v1',
        retryCount: 2,
        status: 'failed',
      );

      final restored = OutboxEntry.fromJson(entry.toJson());

      expect(restored.id, entry.id);
      expect(restored.endpoint, entry.endpoint);
      expect(restored.method, entry.method);
      expect(restored.payload, entry.payload);
      expect(restored.createdAt, entry.createdAt);
      expect(restored.ownerUserId, entry.ownerUserId);
      expect(restored.serverBaseUrl, entry.serverBaseUrl);
      expect(restored.retryCount, 2);
      expect(restored.status, 'failed');
    });

    test('defaults the fields an older queued entry will not carry', () {
      final restored = OutboxEntry.fromJson({
        'id': 'outbox_legacy',
        'endpoint': '/diary',
        'payload': <String, dynamic>{},
        'createdAt': '2026-04-10T09:00:00.000Z',
      });

      expect(restored.method, 'POST');
      expect(restored.retryCount, 0);
      expect(restored.status, 'pending');
      expect(restored.ownerUserId, isNull);
      expect(restored.serverBaseUrl, isNull);
    });
  });

  group('SyncState', () {
    OutboxEntry entry(String status) => OutboxEntry(
          id: 'outbox_$status',
          endpoint: '/diary',
          payload: const {},
          createdAt: DateTime.now(),
          status: status,
        );

    test('counts pending and failed entries as outstanding', () {
      final state = SyncState(queue: [entry('pending'), entry('failed')]);
      expect(state.pendingCount, 2);
    });

    test('does not count an entry mid-flight', () {
      final state = SyncState(queue: [entry('syncing')]);
      expect(state.pendingCount, 0);
    });

    test('clears lastError unless one is supplied', () {
      // copyWith deliberately drops lastError so a successful flush does not
      // leave a stale failure banner on screen.
      const state = SyncState(lastError: 'previous failure');
      expect(state.copyWith(isSyncing: false).lastError, isNull);
    });
  });
}
