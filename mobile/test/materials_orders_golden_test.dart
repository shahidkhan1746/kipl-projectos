import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/auth/user_model.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/features/materials/materials_provider.dart';
import 'package:kipl_projectos/features/materials/screens/materials_screen.dart';
import 'package:kipl_projectos/features/site_orders/screens/site_orders_screen.dart';
import 'package:kipl_projectos/features/site_orders/site_orders_provider.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

import 'support/platform_mocks.dart';

/// Renders the two rewritten record screens.
///
/// Both write evidence against a government contract, and both are read on a
/// phone in the field, so the cases that matter are the populated list, the
/// entry form, and what happens when the system font is doubled.
class _SeededMaterials extends MaterialsNotifier {
  _SeededMaterials(super.dio, super.projectId, super.sync, this._seed);
  final MaterialsState _seed;
  @override
  Future<void> fetchMaterials() async => state = _seed;
}

class _SeededOrders extends SiteOrdersNotifier {
  _SeededOrders(
      super.dio, super.projectId, super.userName, super.sync, this._seed);
  final SiteOrdersState _seed;
  @override
  Future<void> fetchOrders() async => state = _seed;
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

  const materials = MaterialsState(
    records: [
      MaterialRecord(
        id: 'm1',
        date: '2026-09-08',
        material: 'Cement (OPC 43/53)',
        unit: 'Bags',
        receivedQty: 400,
        consumedQty: 120,
        runningBalance: 1860,
        contractorRep: 'Bilal Ahmad',
        ueedRep: 'AEE Nishat',
        remarks: 'Challan 9821, JK01-1234, mill test certificate seen',
      ),
      MaterialRecord(
        id: 'm2',
        date: '2026-09-07',
        material: 'Steel / TMT Fe 500D',
        unit: 'MT',
        receivedQty: 0,
        consumedQty: 3.4,
        runningBalance: 18.6,
        contractorRep: 'Mudasir Khan',
      ),
      MaterialRecord(
        id: 'm3',
        date: '2026-09-06',
        material: 'Coarse Aggregate (20mm)',
        unit: 'CuM',
        receivedQty: 60,
        consumedQty: 74,
        runningBalance: -14,
      ),
    ],
  );

  const orders = SiteOrdersState(
    orders: [
      SiteOrderItem(
        id: 'o1',
        orderNo: 'SOB-2026-0012',
        date: '2026-09-08',
        issuedBy: 'Er. Zahoor Ahmad (EE, UEED)',
        instruction: 'Deep trench shoring required at Chainage 2+100 due to '
            'loose strata. Work to stop until shoring is in place.',
        complianceStatus: 'pending',
      ),
      SiteOrderItem(
        id: 'o2',
        orderNo: 'SOB-2026-0011',
        date: '2026-09-05',
        issuedBy: 'Engineer-in-Charge',
        instruction: 'Provide barricading and night signage along the northern '
            'approach road.',
        acknowledgedBy: 'Shahid Parvez Khan',
        acknowledgedDate: '05/09/2026',
        complianceStatus: 'pending',
      ),
      SiteOrderItem(
        id: 'o3',
        date: '2026-09-02',
        issuedBy: 'Er. Zahoor Ahmad (EE, UEED)',
        instruction: 'Re-test compaction at the inlet chamber approach.',
        acknowledgedBy: 'Shahid Parvez Khan',
        acknowledgedDate: '02/09/2026',
        complianceStatus: 'complied',
        remarks: 'Re-tested on 04/09, passed at 96% MDD.',
      ),
    ],
  );

  Widget harness(Widget screen, List<Override> overrides) => ProviderScope(
        overrides: [
          currentUserProvider.overrideWith((ref) => manager),
          ...overrides,
        ],
        // The banner is painted over the AppBar's actions, which is exactly
        // where a golden most needs to be readable.
        child: MaterialApp(
          theme: AppTheme.dark,
          debugShowCheckedModeBanner: false,
          home: screen,
        ),
      );

  Future<void> shoot(
    WidgetTester tester,
    Widget app,
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
          child: app,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/$name.png'),
    );
  }

  Widget materialsApp(MaterialsState seed) => harness(
        const MaterialsScreen(),
        [
          materialsProvider.overrideWith((ref) => _SeededMaterials(
              Dio(), 'p1', ref.watch(syncServiceProvider.notifier), seed)),
        ],
      );

  Widget ordersApp(SiteOrdersState seed) => harness(
        const SiteOrdersScreen(),
        [
          siteOrdersProvider.overrideWith((ref) => _SeededOrders(
              Dio(),
              'p1',
              'Shahid Parvez Khan',
              ref.watch(syncServiceProvider.notifier),
              seed)),
        ],
      );

  testWidgets('materials — entry form', (t) async {
    await shoot(t, materialsApp(materials), 'materials_form');
  });

  testWidgets('materials — the register tab', (t) async {
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1.0;
    addTearDown(t.view.reset);
    await t.pumpWidget(materialsApp(materials));
    await t.pump(const Duration(milliseconds: 300));
    await t.tap(find.text('Register'));
    await t.pumpAndSettle();
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/materials_register.png'),
    );
  });

  testWidgets('site orders — the book', (t) async {
    await shoot(t, ordersApp(orders), 'orders_list');
  });

  testWidgets('site orders — nothing pending', (t) async {
    await shoot(
      t,
      ordersApp(const SiteOrdersState(filter: 'pending')),
      'orders_empty_pending',
    );
  });

  testWidgets('site orders — 200% system text', (t) async {
    await shoot(t, ordersApp(orders), 'orders_large_text', textScale: 2.0);
  });
}
