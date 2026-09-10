import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:kipl_projectos/core/router.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/features/attendance/attendance_provider.dart';
import 'package:kipl_projectos/features/dashboard/project_summary_provider.dart';

import 'support/platform_mocks.dart';

/// Every destination the More tab offers must be a route that exists.
///
/// The seven screens behind that tab are addressed by string — '/site-orders',
/// '/qa', '/fleet' and so on — and a string that does not match a GoRoute
/// compiles perfectly, passes the analyzer, renders a perfectly good list tile
/// and then fails when a person on site taps it. This walks the real router
/// and checks the paths are all there.
///
/// It also holds the bottom bar and the shell to the same length. Those are
/// two separate lists that have to agree: add a destination without its
/// branch and the app throws when it is tapped; add a branch without its
/// destination and the branch is unreachable. The branch count can be read
/// off the route configuration, but the destinations are built inside the
/// shell's builder closure, so counting those means rendering the thing.
List<String> _paths(List<RouteBase> routes) => [
      for (final route in routes) ...[
        if (route is GoRoute) route.path,
        ..._paths(route.routes),
        if (route is StatefulShellRoute)
          for (final branch in route.branches) ..._paths(branch.routes),
      ],
    ];

void main() {
  setUp(installPlatformMocks);

  late ProviderContainer container;
  late GoRouter router;

  setUp(() {
    container = ProviderContainer();
    router = container.read(routerProvider);
  });

  tearDown(() => container.dispose());

  test('every More destination resolves to a real route', () {
    final paths = _paths(router.configuration.routes).toSet();

    for (final destination in const [
      '/site-orders',
      '/materials',
      '/fleet',
      '/qa',
      '/site-updates',
      '/team',
      '/approvals',
    ]) {
      expect(
        paths,
        contains(destination),
        reason: 'The More tab links to $destination, which no GoRoute serves.',
      );
    }
  });

  test('the shell declares the five branches the bar needs', () {
    final shell =
        router.configuration.routes.whereType<StatefulShellRoute>().single;

    expect(shell.branches, hasLength(5));
    expect(
      _paths(shell.branches.expand((b) => b.routes).toList()),
      containsAll(['/dashboard', '/attendance', '/diary', '/tasks', '/more']),
    );
  });

  testWidgets('the bottom bar shows exactly one destination per branch',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    // A seeded session in secure storage, so the real restoreSession() runs
    // and redirect() lets the shell render instead of bouncing to /login.
    installPlatformMocks(signedInAs: const {
      'id': 'u1',
      'name': 'Shahid Parvez Khan',
      'email': 'shahid@kipl.com',
      'role': 'project_manager',
      'projectId': 'p1',
    });
    // Signing in lands on the dashboard, whose providers would otherwise make
    // real requests and leave their connection timers pending at teardown.
    // Neither has anything to do with what this test is checking.
    final scope = ProviderContainer(overrides: [
      projectSummaryProvider
          .overrideWith((ref) async => const ProjectSummary()),
      attendanceProvider.overrideWith((ref) => _IdleAttendance(
            Dio(),
            'u1',
            'p1',
            ref.watch(syncServiceProvider.notifier),
          )),
    ]);
    addTearDown(scope.dispose);

    final shellRouter = scope.read(routerProvider);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: scope,
        child: MaterialApp.router(routerConfig: shellRouter),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));

    final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    final shell =
        shellRouter.configuration.routes.whereType<StatefulShellRoute>().single;

    expect(
      bar.destinations,
      hasLength(shell.branches.length),
      reason: 'The bar and the shell disagree: NavigationBar has '
          '${bar.destinations.length} destinations against '
          '${shell.branches.length} branches. goBranch would throw on the '
          'unbacked one.',
    );
  });
}

/// The attendance notifier without its startup fetch — the dashboard reads it
/// for the geofence line, which this test does not care about.
class _IdleAttendance extends AttendanceNotifier {
  _IdleAttendance(super.dio, super.userId, super.projectId, super.sync);

  @override
  Future<void> init() async {}

  @override
  Future<void> refreshProximity() async {}
}
