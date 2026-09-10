import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/auth/user_model.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/features/fleet/fleet_provider.dart';
import 'package:kipl_projectos/features/fleet/screens/fleet_screen.dart';
import 'package:kipl_projectos/features/qa/qa_provider.dart';
import 'package:kipl_projectos/features/qa/screens/qa_screen.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

import 'support/platform_mocks.dart';

/// Renders the two largest screens in the app.
///
/// QA's New Check tab is a form whose length comes from the checklist, and
/// Fleet's is a form whose labels all switch on one segmented control, so both
/// have states that only exist under particular data. These are those states.
class _SeededQa extends QaNotifier {
  _SeededQa(super.dio, super.projectId, super.userName, super.sync, this._seed);
  final QaState _seed;
  @override
  Future<void> init() async => state = _seed;
}

class _SeededFleet extends FleetNotifier {
  _SeededFleet(
      super.dio, super.projectId, super.userName, super.sync, this._seed);
  final FleetState _seed;
  @override
  Future<void> init() async => state = _seed;
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

  const checklist = QaChecklistModel(
    id: 'cl1',
    title: 'RCC pour — pre-concrete',
    category: 'civil',
    workItem: 'RCC raft, Aeration Tank 1',
    items: [
      QaChecklistQuestion(
        id: 'q1',
        question: 'Reinforcement placed as per approved bar bending schedule',
        required: true,
        referenceSpec: 'IS 2502 / drawing STP-STR-014 Rev C',
      ),
      QaChecklistQuestion(
        id: 'q2',
        question: 'Cover blocks fixed at the specified spacing',
        required: true,
        referenceSpec: 'IS 456 cl. 26.4',
      ),
      QaChecklistQuestion(
        id: 'q3',
        question: 'Shuttering line, level and props checked',
        required: true,
      ),
      QaChecklistQuestion(
        id: 'q4',
        question: 'Slump test carried out and within tolerance',
        required: true,
        referenceSpec: 'IS 1199',
      ),
    ],
  );

  const qa = QaState(
    checklists: [checklist],
    inspections: [
      QaInspectionItem(
        id: 'i1',
        date: '2026-09-08',
        workItem: 'RCC raft, Aeration Tank 1',
        chainage: '1+250',
        inspectedBy: 'Shahid Parvez Khan',
        overallResult: 'passed',
        passCount: 12,
        failCount: 0,
        naCount: 2,
      ),
      QaInspectionItem(
        id: 'i2',
        date: '2026-09-06',
        workItem: 'Trench shoring, Zone 2',
        inspectedBy: 'Bilal Ahmad',
        overallResult: 'failed',
        passCount: 6,
        failCount: 3,
        naCount: 1,
        ncrRaised: true,
      ),
    ],
    ncrs: [
      NcrItem(
        id: 'n1',
        ncrNo: 'NCR-2026-004',
        title: 'Honeycombing in RCC wall, Aeration Tank 1',
        description:
            'Inadequate vibration during the pour has left voids on the '
            'north face between 1.2m and 1.8m above the raft.',
        severity: 'major',
        status: 'open',
        location: 'Aeration Tank wall 3',
        targetDate: '2026-09-16',
      ),
      NcrItem(
        id: 'n2',
        ncrNo: 'NCR-2026-003',
        title: 'Compaction below specification on the approach road',
        description: 'Field density at 89% MDD against 95% specified.',
        severity: 'critical',
        status: 'closed',
        location: 'Northern approach',
        correctiveAction:
            'Re-rolled in 150mm layers and re-tested on 04/09, passed at 96%.',
      ),
    ],
  );

  const fleet = FleetState(
    machines: [
      MachineSummary(
        machineId: 'EX-01',
        machineType: 'Excavator',
        lastReading: 1240.5,
        totalHours: 1240.5,
      ),
      MachineSummary(
        machineId: 'BP-01',
        machineType: 'Batching plant',
        lastReading: 806.0,
        totalHours: 806.0,
      ),
      MachineSummary(
        machineId: 'TM-02',
        machineType: 'Transit mixer',
        lastReading: 0,
        totalHours: 0,
      ),
    ],
    recentLogs: [
      FleetLogItem(
        id: 'f1',
        logType: 'plant',
        date: '2026-09-08',
        machineId: 'EX-01',
        machineType: 'Excavator',
        operator: 'Ghulam Nabi',
        hourStart: 1232.5,
        hourClose: 1240.5,
        hoursWorked: 8.0,
        fuelLitres: 45,
        workZone: 'Zone 2 trench',
        workDescription: 'Earthwork excavation for chamber 14',
      ),
      FleetLogItem(
        id: 'f2',
        logType: 'plant',
        date: '2026-09-07',
        machineId: 'BP-01',
        machineType: 'Batching plant',
        operator: 'Tariq Ahmad',
        hoursWorked: 5.5,
        fuelLitres: 30,
        breakdown: true,
        breakdownDetails: 'Hydraulic hose leak, 2.5h down, repaired on site',
        workZone: 'Batching yard',
      ),
      FleetLogItem(
        id: 'f3',
        logType: 'vehicle',
        date: '2026-09-07',
        vehicle: 'JK01-AB-1234',
        driver: 'Irfan Bhat',
        distanceKm: 42,
        fuelLitres: 12,
        fromLocation: 'Nishat STP to UEED office',
        purpose: 'Collected mill test certificates',
      ),
    ],
  );

  Widget harness(Widget screen, List<Override> overrides) => ProviderScope(
        overrides: [
          currentUserProvider.overrideWith((ref) => manager),
          ...overrides,
        ],
        child: MaterialApp(
          theme: AppTheme.dark,
          debugShowCheckedModeBanner: false,
          home: screen,
        ),
      );

  Widget qaApp(QaState seed) => harness(
        const QaScreen(),
        [
          qaProvider.overrideWith((ref) => _SeededQa(Dio(), 'p1', 'Shahid',
              ref.watch(syncServiceProvider.notifier), seed)),
        ],
      );

  Widget fleetApp(FleetState seed) => harness(
        const FleetScreen(),
        [
          fleetProvider.overrideWith((ref) => _SeededFleet(Dio(), 'p1',
              'Shahid', ref.watch(syncServiceProvider.notifier), seed)),
        ],
      );

  Future<void> settle(
    WidgetTester tester,
    Widget app, {
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
          child: app,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));
  }

  Future<void> snap(WidgetTester tester, String name) => expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('goldens/$name.png'),
      );

  testWidgets('qa — completed inspections', (t) async {
    await settle(t, qaApp(qa));
    await snap(t, 'qa_inspections');
  });

  testWidgets('qa — a checklist part-answered, submit still blocked',
      (t) async {
    await settle(t, qaApp(qa));
    await t.tap(find.text('New check'));
    await t.pumpAndSettle();
    await t.tap(find.text('RCC pour — pre-concrete'));
    await t.pumpAndSettle();
    // Answer two of the four, so the progress bar and the blocker both have
    // something to say.
    await t.tap(find.text('Pass').first);
    await t.pumpAndSettle();
    await t.tap(find.text('Fail').at(1));
    await t.pumpAndSettle();
    await snap(t, 'qa_checklist');
  });

  testWidgets('qa — the NCR log', (t) async {
    await settle(t, qaApp(qa));
    await t.tap(find.textContaining('NCRs'));
    await t.pumpAndSettle();
    await snap(t, 'qa_ncrs');
  });

  testWidgets('fleet — the plant log form', (t) async {
    await settle(t, fleetApp(fleet));
    await snap(t, 'fleet_form');
  });

  testWidgets('fleet — recent logs', (t) async {
    await settle(t, fleetApp(fleet));
    await t.tap(find.text('Recent'));
    await t.pumpAndSettle();
    await snap(t, 'fleet_history');
  });

  testWidgets('fleet — 200% system text', (t) async {
    await settle(t, fleetApp(fleet), textScale: 2.0);
    await snap(t, 'fleet_large_text');
  });
}
