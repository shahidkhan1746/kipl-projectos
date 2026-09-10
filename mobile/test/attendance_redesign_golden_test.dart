import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/core/utils/geofence_helper.dart';
import 'package:kipl_projectos/features/attendance/attendance_provider.dart';
import 'package:kipl_projectos/features/attendance/screens/attendance_screen.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

/// Renders Attendance in every state a worker can actually meet it in.
///
/// This screen is the app's most-used surface and its states are the ones
/// hardest to reach by hand: you cannot stand outside a geofence in Srinagar
/// from a desk. Each case below is one of the six conditions that gate a
/// check-in, plus the two shift states.
class _SeededAttendance extends AttendanceNotifier {
  _SeededAttendance(
      super.dio, super.userId, super.projectId, super.sync, this._seed);

  final AttendanceState _seed;

  @override
  Future<void> init() async => state = _seed;

  @override
  Future<void> refreshProximity() async => state = _seed;
}

Position _fix({double accuracy = 12}) => Position(
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
      isMocked: false,
    );

void main() {
  final inside = GeofenceResult(
    distanceMeters: 84,
    isInside: true,
    accuracyMeters: 12,
    isMocked: false,
    position: _fix(),
  );

  final outside = GeofenceResult(
    distanceMeters: 1240,
    isInside: false,
    accuracyMeters: 14,
    isMocked: false,
    position: _fix(accuracy: 14),
  );

  final coarse = GeofenceResult(
    distanceMeters: 60,
    isInside: true,
    accuracyMeters: 180,
    isMocked: false,
    position: _fix(accuracy: 180),
  );

  Widget harness(AttendanceState seed) => ProviderScope(
        overrides: [
          attendanceProvider.overrideWith(
            (ref) => _SeededAttendance(Dio(), 'u1', 'p1',
                ref.watch(syncServiceProvider.notifier), seed),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.dark,
          home: const AttendanceScreen(),
        ),
      );

  Future<void> shoot(
    WidgetTester tester,
    AttendanceState seed,
    String name, {
    Size size = const Size(390, 844),
    double textScale = 1.0,
  }) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      Builder(
        builder: (context) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(textScale)),
          child: harness(seed),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));

    await expectLater(
      find.byType(AttendanceScreen),
      matchesGoldenFile('goldens/attendance_$name.png'),
    );
  }

  testWidgets('attendance — at the gate, ready to punch in', (t) async {
    await shoot(t, AttendanceState(geofence: inside), 'ready');
  });

  testWidgets('attendance — outside the fence, button off and reason shown',
      (t) async {
    await shoot(t, AttendanceState(geofence: outside), 'outside');
  });

  testWidgets('attendance — fix too coarse to trust', (t) async {
    await shoot(t, AttendanceState(geofence: coarse), 'coarse');
  });

  testWidgets('attendance — on shift', (t) async {
    await shoot(
      t,
      AttendanceState(
        geofence: inside,
        todayRecord: AttendanceRecord(
          employeeId: 'e1',
          date: '2026-09-09',
          status: 'present',
          checkInTime: DateTime(2026, 9, 9, 9, 12),
          geoVerified: true,
        ),
      ),
      'on_shift',
    );
  });

  testWidgets('attendance — day recorded', (t) async {
    await shoot(
      t,
      AttendanceState(
        geofence: inside,
        todayRecord: AttendanceRecord(
          employeeId: 'e1',
          date: '2026-09-09',
          status: 'present',
          checkInTime: DateTime(2026, 9, 9, 9, 12),
          checkOutTime: DateTime(2026, 9, 9, 18, 4),
          geoVerified: true,
          hoursWorked: 8.9,
        ),
      ),
      'done',
    );
  });

  testWidgets('attendance — 200% system text', (t) async {
    await shoot(t, AttendanceState(geofence: outside), 'large_text',
        textScale: 2.0);
  });
}
