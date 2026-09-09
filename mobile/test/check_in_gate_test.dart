import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kipl_projectos/core/project_info.dart';
import 'package:kipl_projectos/core/utils/geofence_helper.dart';
import 'package:kipl_projectos/features/attendance/attendance_provider.dart';

/// [checkInBlocker] decides whether a worker may record attendance, which is
/// the payroll evidence for a government contract. It was extracted from the
/// middle of punchCheckIn so the screen could show the reason before the tap;
/// these tests exist because moving a gate is exactly the kind of refactor
/// that silently opens one.
Position _at({double accuracy = 10, bool mocked = false}) => Position(
      latitude: 34.1381,
      longitude: 74.8725,
      timestamp: DateTime(2026, 9, 9, 9, 12),
      accuracy: accuracy,
      altitude: 1585,
      altitudeAccuracy: 3,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
      isMocked: mocked,
    );

void main() {
  group('a check-in is refused when', () {
    test('there is no reading at all', () {
      expect(checkInBlocker(null), 'Waiting for a GPS position.');
    });

    test('location access has never been granted', () {
      final blocker = checkInBlocker(GeofenceResult.permissionRequired());
      expect(blocker, contains('Site location access is required'));
    });

    test('the fix failed, and the reason is passed through verbatim', () {
      const reason = 'Device location services (GPS) are disabled.';
      expect(checkInBlocker(GeofenceResult.error(reason)), reason);
    });

    test('the position is mocked', () {
      final blocker = checkInBlocker(GeofenceResult(
        distanceMeters: 10,
        isInside: true,
        accuracyMeters: 5,
        isMocked: true,
        position: _at(mocked: true),
      ));
      expect(blocker, 'Mocked GPS locations cannot be used for attendance.');
    });

    test('the fix is too coarse to place them inside a 500m fence', () {
      final blocker = checkInBlocker(GeofenceResult(
        distanceMeters: 60,
        isInside: true,
        accuracyMeters: kMaxPunchAccuracyMeters + 1,
        isMocked: false,
        position: _at(accuracy: kMaxPunchAccuracyMeters + 1),
      ));
      expect(blocker, contains('GPS accuracy is too low (101m)'));
    });

    test('they are outside the fence', () {
      final blocker = checkInBlocker(GeofenceResult(
        distanceMeters: 1240,
        isInside: false,
        accuracyMeters: 12,
        isMocked: false,
        position: _at(),
      ));
      // The radius is quoted from ProjectInfo, not typed into the sentence, so
      // the message cannot drift from the fence it describes.
      expect(
        blocker,
        'You are outside the '
        '${ProjectInfo.defaultGeofenceRadiusMeters.round()}m site attendance '
        'geofence.',
      );
    });
  });

  test('a check-in is allowed from a good fix inside the fence', () {
    expect(
      checkInBlocker(GeofenceResult(
        distanceMeters: 84,
        isInside: true,
        accuracyMeters: 12,
        isMocked: false,
        position: _at(accuracy: 12),
      )),
      isNull,
    );
  });

  test('accuracy exactly at the limit is accepted, not rejected', () {
    // A boundary the old inline guard also drew at `> 100`. Stated here so a
    // later tightening to `>=` is a deliberate change rather than a typo.
    expect(
      checkInBlocker(GeofenceResult(
        distanceMeters: 84,
        isInside: true,
        accuracyMeters: kMaxPunchAccuracyMeters,
        isMocked: false,
        position: _at(accuracy: kMaxPunchAccuracyMeters),
      )),
      isNull,
    );
  });

  test('permission is reported before anything else it would also fail', () {
    // permissionRequired() carries distanceMeters: infinity and isInside:
    // false, so it trips the fence check too. The worker must be told to grant
    // access, not that they are standing in the wrong place.
    final blocker = checkInBlocker(GeofenceResult.permissionRequired());
    expect(blocker, isNot(contains('outside')));
  });
}
