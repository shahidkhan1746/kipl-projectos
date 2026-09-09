import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/auth/user_model.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/core/utils/geofence_helper.dart';
import 'package:kipl_projectos/features/attendance/attendance_provider.dart';
import 'package:kipl_projectos/features/dashboard/project_summary_provider.dart';
import 'package:kipl_projectos/features/dashboard/screens/dashboard_screen.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

import 'support/platform_mocks.dart';

/// The dashboard, painted, in both themes.
///
/// This file took the largest mechanical change of the migration — sixty-three
/// colour substitutions and twenty-six const keywords dropped to make room for
/// Theme.of(context) — and mechanical changes to colour are exactly the kind
/// that compile perfectly and look wrong. Nothing but the rendered frame
/// establishes that the screen still reads.
class _SeededAttendance extends AttendanceNotifier {
  _SeededAttendance(
      super.dio, super.userId, super.projectId, super.sync, this._seed);
  final AttendanceState _seed;
  @override
  Future<void> init() async => state = _seed;
  @override
  Future<void> refreshProximity() async => state = _seed;
}

void main() {
  setUp(installPlatformMocks);

  const manager = UserModel(
    id: 'u1',
    name: 'Shahid Parvez Khan',
    email: 'shahid@kipl.com',
    role: 'project_manager',
    projectId: 'p1',
  );

  final inside = GeofenceResult(
    distanceMeters: 84,
    isInside: true,
    accuracyMeters: 12,
    isMocked: false,
    position: Position(
      latitude: 34.1381,
      longitude: 74.8725,
      timestamp: DateTime(2026, 9, 9, 9, 12),
      accuracy: 12,
      altitude: 1585,
      altitudeAccuracy: 3,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
      isMocked: false,
    ),
  );

  const summary = ProjectSummary(
    workDonePct: 4.2,
    timeElapsedPct: 34.0,
    daysRemaining: 606,
    totalTasks: 25,
    completed: 1,
    inProgress: 4,
    delayed: 3,
    milestones: 8,
    milestonesHit: 2,
    criticalTasks: 9,
    contractStart: '2025-11-07',
    contractEnd: '2028-05-07',
  );

  Future<void> shoot(
    WidgetTester tester,
    ThemeData theme,
    String name,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          currentUserProvider.overrideWith((ref) => manager),
          attendanceProvider.overrideWith(
            (ref) => _SeededAttendance(
              Dio(),
              'u1',
              'p1',
              ref.watch(syncServiceProvider.notifier),
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
            ),
          ),
          projectSummaryProvider.overrideWith((ref) async => summary),
        ],
        child: MaterialApp(
          theme: theme,
          debugShowCheckedModeBanner: false,
          home: const DashboardScreen(),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 600));

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/$name.png'),
    );
  }

  testWidgets('dashboard — dark', (t) async {
    await shoot(t, AppTheme.dark, 'dashboard_dark');
  });

  testWidgets('dashboard — light', (t) async {
    await shoot(t, AppTheme.light, 'dashboard_light');
  });
}
