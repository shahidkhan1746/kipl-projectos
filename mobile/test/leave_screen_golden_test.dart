import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/features/leave/leave_provider.dart';
import 'package:kipl_projectos/features/leave/screens/leave_screen.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

import 'support/platform_mocks.dart';

/// The leave screen, rebuilt onto the design system the rest of the app uses.
///
/// Rendered rather than merely compiled, because the two things most likely to
/// be wrong here are invisible to the analyzer: the date pair sitting in one
/// Row has to survive 200% system text without clipping, and the history rows
/// have to read as a verdict rather than as a status string.
void main() {
  setUp(installPlatformMocks);

  const applied = [
    LeaveRecord(
      id: '1',
      leaveType: 'casual',
      fromDate: '2026-09-14',
      toDate: '2026-09-16',
      status: 'approved',
      reason: 'Family function in Anantnag.',
    ),
    LeaveRecord(
      id: '2',
      leaveType: 'sick',
      fromDate: '2026-08-02',
      toDate: '2026-08-02',
      status: 'pending',
      reason: 'Fever, seen at the site clinic.',
    ),
    LeaveRecord(
      id: '3',
      leaveType: 'unpaid',
      fromDate: '2026-07-20',
      toDate: '2026-07-27',
      status: 'rejected',
      reason: 'Personal travel during the pour window.',
    ),
  ];

  Future<void> shoot(
    WidgetTester tester,
    LeaveState state,
    String name, {
    double textScale = 1.0,
  }) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          leaveProvider.overrideWith(
            (ref) => _SeededLeave(
                Dio(), ref.watch(syncServiceProvider.notifier), state),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.dark,
          debugShowCheckedModeBanner: false,
          home: Builder(
            builder: (context) => MediaQuery(
              // copyWith, not a bare MediaQueryData: building one from scratch
              // zeroes the size, and every layout below then renders blank.
              data: MediaQuery.of(context)
                  .copyWith(textScaler: TextScaler.linear(textScale)),
              child: const LeaveScreen(),
            ),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/leave_$name.png'),
    );
  }

  testWidgets('leave — nothing applied for yet', (t) async {
    await shoot(t, const LeaveState(), 'empty');
    expect(find.text('No applications yet'), findsOneWidget);
    expect(find.text('Submit application'), findsOneWidget);
  });

  testWidgets('leave — three applications, three verdicts', (t) async {
    await shoot(t, const LeaveState(items: applied), 'history');
    // Asserted on the verdicts and the spans, not the type names: "Casual" is
    // also the dropdown's default, so matching on it finds the form too.
    expect(find.text('approved'), findsOneWidget);
    expect(find.text('pending'), findsOneWidget);
    expect(find.text('rejected'), findsOneWidget);
    // A single-day leave collapses to one date rather than "X → X".
    expect(find.text('02/08/2026'), findsOneWidget);
    expect(find.text('14/09/2026 → 16/09/2026'), findsOneWidget);
    expect(find.text('No applications yet'), findsNothing);
  });

  testWidgets('leave — at 200% system text', (t) async {
    await shoot(t, const LeaveState(items: applied), 'large_text',
        textScale: 2.0);
  });
}

/// The real notifier with its one network call stubbed out.
///
/// LeaveNotifier calls refresh() from its constructor, so without this the
/// harness would make a live request and the golden would race it.
class _SeededLeave extends LeaveNotifier {
  _SeededLeave(super.dio, super.sync, this._seed);

  final LeaveState _seed;

  @override
  Future<void> refresh() async => state = _seed;
}
