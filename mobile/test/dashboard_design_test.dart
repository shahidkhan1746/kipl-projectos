import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:kipl_projectos/core/api/api_client.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/auth/user_model.dart';
import 'package:kipl_projectos/core/router.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/core/utils/geofence_helper.dart';
import 'package:kipl_projectos/features/attendance/attendance_provider.dart';
import 'package:kipl_projectos/features/dashboard/project_summary_provider.dart';
import 'package:kipl_projectos/features/dashboard/screens/dashboard_screen.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';
import 'package:kipl_projectos/shared/theme/field_theme.dart';
import 'package:kipl_projectos/shared/widgets/field_components.dart';

import 'support/design_fonts.dart';

const _user = UserModel(
    id: 'fixture-user',
    name: 'Site Engineer',
    email: 'engineer@example.test',
    role: 'site_engineer');
const _summary = ProjectSummary(
    workDonePct: 42.6,
    timeElapsedPct: 48.0,
    daysRemaining: 606,
    totalTasks: 125,
    completed: 46,
    inProgress: 18,
    delayed: 3,
    criticalTasks: 9,
    milestones: 8,
    milestonesHit: 2,
    contractStart: '2025-11-07',
    contractEnd: '2028-05-07');
const _attendance = AttendanceState(
    geofence: GeofenceResult(
        distanceMeters: 180,
        isInside: true,
        accuracyMeters: 8,
        isMocked: false));

class _Auth extends StateNotifier<AsyncValue<UserModel?>>
    implements AuthNotifier {
  _Auth(UserModel user) : super(AsyncValue.data(user));
  int logouts = 0;
  @override
  Future<void> logout() async {
    logouts++;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Attendance extends StateNotifier<AttendanceState>
    implements AttendanceNotifier {
  _Attendance(super.state);
  int refreshes = 0;
  @override
  Future<void> init() async {
    refreshes++;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Sync extends StateNotifier<SyncState> implements SyncService {
  _Sync(super.state);
  int flushes = 0;
  final retried = <String>[];
  final discarded = <String>[];
  @override
  Future<void> flushQueue() async {
    flushes++;
  }

  @override
  Future<void> retryEntry(String id) async {
    retried.add(id);
  }

  @override
  Future<void> discardEntry(String id) async {
    discarded.add(id);
    state = state.copyWith(
        queue: state.queue.where((entry) => entry.id != id).toList());
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Fixture {
  _Fixture(this.container, this.auth, this.attendance, this.sync);
  final ProviderContainer container;
  final _Auth auth;
  final _Attendance attendance;
  final _Sync sync;
}

Future<_Fixture> _pump(
  WidgetTester tester, {
  Size size = const Size(390, 844),
  double textScale = 1,
  UserModel user = _user,
  AttendanceState attendance = _attendance,
  SyncState sync = const SyncState(),
  Future<ProjectSummary> Function()? summary,
  bool settle = true,
  bool reducedMotion = false,
  bool stubDestinations = false,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  tester.view.padding = const FakeViewPadding(top: 24, bottom: 24);
  final authNotifier = _Auth(user);
  final attendanceNotifier = _Attendance(attendance);
  final syncNotifier = _Sync(sync);
  final container = ProviderContainer(overrides: [
    apiClientProvider.overrideWith((ref) =>
        throw StateError('Design fixtures must never create a network client')),
    authStateProvider.overrideWith((ref) => authNotifier),
    attendanceProvider.overrideWith((ref) => attendanceNotifier),
    syncServiceProvider.overrideWith((ref) => syncNotifier),
    projectSummaryProvider.overrideWith(
        (ref) => summary == null ? Future.value(_summary) : summary()),
    dashboardClockProvider.overrideWithValue(() => DateTime(2026, 9, 9)),
    if (stubDestinations)
      routerProvider.overrideWith((ref) {
        final router = GoRouter(initialLocation: '/dashboard', routes: [
          GoRoute(
              path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          for (final path in [
            '/fleet',
            '/materials',
            '/qa',
            '/site-orders',
            '/team',
            '/site-updates',
            '/approvals'
          ])
            GoRoute(path: path, builder: (_, __) => Scaffold(body: Text(path))),
        ]);
        ref.onDispose(router.dispose);
        return router;
      }),
  ]);
  addTearDown(() async {
    await tester.pumpWidget(const SizedBox.shrink());
    container.dispose();
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
    tester.view.resetPadding();
  });
  await tester.pumpWidget(UncontrolledProviderScope(
    container: container,
    child: RepaintBoundary(
      key: const Key('design-preview'),
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.dark,
        routerConfig: container.read(routerProvider),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(textScale),
              disableAnimations: reducedMotion),
          child: child!,
        ),
      ),
    ),
  ));
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
  return _Fixture(container, authNotifier, attendanceNotifier, syncNotifier);
}

Future<void> _reveal(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(loadDesignFonts);

  for (final viewport in <String, Size>{
    'phone': const Size(390, 844),
    'narrow': const Size(320, 740),
    'tablet': const Size(768, 1024),
    'landscape': const Size(844, 390),
  }.entries) {
    testWidgets(
        'dashboard renders ${viewport.key} with the real navigation shell',
        (tester) async {
      await _pump(tester, size: viewport.value);
      expect(tester.takeException(), isNull);
      expect(find.byType(NavigationBar), findsOneWidget);
      await expectLater(find.byKey(const Key('design-preview')),
          matchesGoldenFile('goldens/dashboard_${viewport.key}.png'));
      await _reveal(tester, find.text('Site Updates'));
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('200 percent text, narrow layout, long name and account sheet',
      (tester) async {
    await _pump(tester,
        size: const Size(320, 740),
        textScale: 2,
        user: const UserModel(
            id: 'fixture',
            name: 'Senior Site Engineering and Construction Supervisor',
            email: 'long.account.name@example.test',
            role: 'project_manager'));
    expect(tester.takeException(), isNull);
    await expectLater(find.byKey(const Key('design-preview')),
        matchesGoldenFile('goldens/dashboard_large_text.png'));
    await _reveal(tester, find.text('Project details'));
    await tester.tap(find.text('Project details'));
    await tester.pumpAndSettle();
    await _reveal(tester, find.text('Critical tasks'));
    expect(tester.takeException(), isNull);
    await tester.tap(find.byTooltip('Account'));
    await tester.pumpAndSettle();
    await _reveal(tester, find.text('Sign out'));
    expect(tester.takeException(), isNull);
    await expectLater(find.byKey(const Key('design-preview')),
        matchesGoldenFile('goldens/dashboard_account_large_text.png'));
  });

  testWidgets(
      'phone touch targets, labels and contrast meet Flutter guidelines',
      (tester) async {
    final semantics = tester.ensureSemantics();
    try {
      await _pump(tester);
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      await _reveal(tester, find.text('Site Updates'));
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    } finally {
      semantics.dispose();
    }
  });

  testWidgets(
      'project metrics stay unknown on failure and retry remains available',
      (tester) async {
    var requests = 0;
    await _pump(tester, summary: () async {
      requests++;
      throw StateError('fixture only');
    });
    expect(find.textContaining('couldn’t be loaded'), findsOneWidget);
    expect(find.text('—'), findsNWidgets(2));
    expect(find.textContaining('Nothing needs your attention'), findsNothing);
    await _reveal(tester, find.text('Retry project figures'));
    await tester.tap(find.text('Retry project figures'));
    await tester.pumpAndSettle();
    expect(requests, 2);
    expect(tester.takeException(), isNull);
  });

  testWidgets('loading shows progress instead of invented metrics',
      (tester) async {
    final pending = Completer<ProjectSummary>();
    await _pump(tester, summary: () => pending.future, settle: false);
    expect(find.text('Loading project figures…'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    expect(find.text('—'), findsNWidgets(2));
    pending.complete(_summary);
    await tester.pumpAndSettle();
    expect(find.text('42.6%'), findsOneWidget);
  });

  testWidgets(
      'unknown GPS uses safe status and opens the existing attendance route',
      (tester) async {
    final fixture = await _pump(tester,
        attendance: const AttendanceState(
            geofence: GeofenceResult(
                distanceMeters: double.infinity,
                isInside: false,
                accuracyMeters: 0,
                isMocked: false,
                needsPermission: true)));
    expect(find.text('Location access not enabled'), findsOneWidget);
    await tester.tap(find.text('Open attendance'));
    await tester.pumpAndSettle();
    expect(
        fixture.container
            .read(routerProvider)
            .routeInformationProvider
            .value
            .uri
            .path,
        '/attendance');
    expect(tester.takeException(), isNull);
  });

  testWidgets('checked-out attendance does not claim an active shift',
      (tester) async {
    await _pump(tester,
        attendance: AttendanceState(
            todayRecord: AttendanceRecord(
                employeeId: 'fixture',
                date: '2026-09-09',
                status: 'present',
                checkInTime: DateTime(2026, 9, 9, 9),
                checkOutTime: DateTime(2026, 9, 9, 17))));
    expect(find.text('Checked out for today'), findsOneWidget);
    expect(find.text('You’re checked in'), findsNothing);
    expect(find.text('View attendance'), findsOneWidget);
  });

  testWidgets(
      'role-gated approvals and every secondary navigation contract remain',
      (tester) async {
    final fixture = await _pump(tester,
        stubDestinations: true,
        user: const UserModel(
            id: 'manager',
            name: 'Project Manager',
            email: 'manager@example.test',
            role: 'project_manager'));
    final rows = tester
        .widgetList<FieldNavigationRow>(find.byType(FieldNavigationRow))
        .toList();
    expect(
        rows.map((row) => row.title),
        containsAll([
          'Fleet',
          'Materials',
          'QA & Safety',
          'Site Orders',
          'Team',
          'Site Updates',
          'Approvals'
        ]));
    // Destination screens are stubs: exercise real dashboard callbacks and back,
    // without creating operational providers or making API calls.
    final routes = {
      'Fleet': '/fleet',
      'Materials': '/materials',
      'QA & Safety': '/qa',
      'Site Orders': '/site-orders',
      'Team': '/team',
      'Site Updates': '/site-updates',
      'Approvals': '/approvals'
    };
    final router = fixture.container.read(routerProvider);
    for (final route in routes.entries) {
      rows.singleWhere((row) => row.title == route.key).onTap();
      await tester.pumpAndSettle();
      expect(find.text(route.value), findsOneWidget);
      expect(router.canPop(), isTrue);
      router.pop();
      await tester.pumpAndSettle();
    }
  });

  testWidgets('non-manager does not see approvals', (tester) async {
    await _pump(tester);
    expect(find.text('Approvals'), findsNothing);
  });

  testWidgets(
      'blocked queue retry and discard are explicit; sheet updates live',
      (tester) async {
    final entry = OutboxEntry(
        id: 'fixture-entry',
        endpoint: '/diaries',
        payload: {},
        createdAt: DateTime(2026, 9, 9),
        status: 'blocked',
        failureReason: 'Fixture validation failure');
    final fixture = await _pump(tester, sync: SyncState(queue: [entry]));
    expect(find.text('1 changes need review'), findsOneWidget);
    await tester.tap(find.byTooltip('Sync status'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(fixture.sync.retried, ['fixture-entry']);
    await tester.tap(find.text('Discard'));
    await tester.pumpAndSettle();
    expect(fixture.sync.discarded, isEmpty);
    await tester.tap(find.text('Keep change'));
    await tester.pumpAndSettle();
    expect(fixture.sync.discarded, isEmpty);
    await tester.tap(find.text('Discard'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Discard change'));
    await tester.pumpAndSettle();
    expect(fixture.sync.discarded, ['fixture-entry']);
    expect(find.text('0 waiting to sync · 0 need review'), findsOneWidget);
  });

  testWidgets('offline sync is disabled; sign-out requires confirmation',
      (tester) async {
    final fixture = await _pump(tester, sync: const SyncState(isOnline: false));
    await tester.tap(find.byTooltip('Sync status'));
    await tester.pumpAndSettle();
    final button = tester
        .widget<FilledButton>(find.widgetWithText(FilledButton, 'Sync now'));
    expect(button.onPressed, isNull);
    await tester.tap(find.byTooltip('Close sync status'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Account'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(fixture.auth.logouts, 0);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(fixture.auth.logouts, 0);
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(
        of: find.byType(AlertDialog), matching: find.text('Sign out')));
    await tester.pumpAndSettle();
    expect(fixture.auth.logouts, 1);
  });

  testWidgets(
      'project disclosure obeys reduced motion and retains contract figures',
      (tester) async {
    await _pump(tester, reducedMotion: true);
    final tile = tester.widget<ExpansionTile>(find.byType(ExpansionTile));
    expect(tile.expansionAnimationStyle?.duration, Duration.zero);
    await _reveal(tester, find.text('Project details'));
    await tester.tap(find.text('Project details'));
    await tester.pumpAndSettle();
    expect(find.text('606'), findsOneWidget);
    expect(find.text('2 / 8'), findsOneWidget);
    expect(find.text('07/05/2028'), findsOneWidget);
    expect(find.textContaining('5.4 percentage points behind'), findsOneWidget);
  });

  test('semantic palette body foregrounds have at least 4.5 contrast', () {
    for (final foreground in [
      FieldColors.textPrimary,
      FieldColors.textSecondary,
      FieldColors.textMuted,
      FieldColors.primary,
      FieldColors.success,
      FieldColors.warning,
      FieldColors.danger
    ]) {
      for (final background in [
        FieldColors.background,
        FieldColors.surface,
        FieldColors.surfaceElevated
      ]) {
        final ratio = (foreground.computeLuminance() + .05) /
            (background.computeLuminance() + .05);
        expect(ratio, greaterThanOrEqualTo(4.5));
      }
    }
  });
}
