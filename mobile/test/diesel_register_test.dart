import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/auth/user_model.dart';
import 'package:kipl_projectos/core/sync/sync_service.dart';
import 'package:kipl_projectos/features/fleet/diesel_provider.dart';
import 'package:kipl_projectos/features/fleet/screens/diesel_screen.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

import 'support/platform_mocks.dart';

class _SeededDiesel extends DieselNotifier {
  _SeededDiesel(super.dio, super.projectId, super.userName, super.sync, this._seed);
  final DieselState _seed;
  @override
  Future<void> init() async => state = _seed;
}

/// The Dal Lake register as the spreadsheet left it on 23 Nov 2026.
const _register = DieselState(
  machines: [
    FuelMachine(id: 'pc210', name: 'Komatsu PC210 excavator', operator: 'Rinku'),
    FuelMachine(id: 'jcb', name: 'JCB 3DX backhoe loader', operator: 'Yasir'),
    FuelMachine(id: 'dg', name: 'Mahindra Powerol DG set'),
    FuelMachine(id: 'sany', name: 'Sany excavator', hired: true, ownerName: 'Wani Infra'),
    FuelMachine(id: 'roller', name: 'Road roller', hired: true, ownerName: 'Wani Infra'),
  ],
  entries: [
    FuelEntryRow(id: 'e9', entryType: 'issue', date: '2026-11-23', litres: 50, balance: 300, machineId: 'jcb', operator: 'Yasir'),
    FuelEntryRow(id: 'e8', entryType: 'issue', date: '2026-11-23', litres: 50, balance: 350, machineId: 'roller'),
    FuelEntryRow(id: 'e7', entryType: 'issue', date: '2026-11-22', litres: 200, balance: 400, machineId: 'sany'),
    FuelEntryRow(id: 'e6', entryType: 'receipt', date: '2026-11-22', litres: 600, balance: 820),
  ],
  machineUse: [
    MachineUse(machineId: 'pc210', name: 'Komatsu PC210 excavator', litres: 400, fills: 2, rateBasis: 'record the hour meter at each fill'),
    MachineUse(machineId: 'jcb', name: 'JCB 3DX backhoe loader', litres: 70, fills: 2, rate: 6.4, rateBasis: 'from meter readings'),
    MachineUse(machineId: 'sany', name: 'Sany excavator', hired: true, ownerName: 'Wani Infra', litres: 200, fills: 1, rateBasis: 'record the hour meter at each fill'),
  ],
  stockNow: 300,
  openingStock: 0,
  receivedThisMonth: 1000,
  issuedThisMonth: 720,
  hiredByFirm: {'Wani Infra': 250},
  warnings: ['Komatsu PC210 excavator: no meter reading at any fill, so its consumption cannot be checked.'],
);

void main() {
  group('diesel register data', () {
    test('litres read the Indian way', () {
      expect(litresLabel(300), '300 L');
      expect(litresLabel(1234.5), '1,234.5 L');
      expect(litresLabel(1234567), '12,34,567 L');
      expect(litresLabel(-20), '-20 L');
    });

    test('a machine use says where its burn figure came from', () {
      final meter = MachineUse.fromJson({'machineId': 'j', 'name': 'JCB', 'litres': '70', 'fills': 2, 'meterRate': 6.4, 'meterUnit': 'hours'});
      expect(meter.rate, 6.4);
      expect(meter.rateBasis, 'from meter readings');
      final none = MachineUse.fromJson({'machineId': 'p', 'name': 'PC210', 'litres': 400, 'fills': 2, 'meterUnit': 'hours'});
      expect(none.rate, isNull);
      expect(none.rateBasis, 'record the hour meter at each fill');
    });

    test('register lines parse the API, including decimals sent as text', () {
      final row = FuelEntryRow.fromJson({'id': 'x', 'entryType': 'issue', 'date': '2026-11-22', 'litres': '200.00', 'balance': 400, 'fleetLogId': 'log1'});
      expect(row.litres, 200);
      expect(row.isOut, isTrue);
      expect(row.fromLogbook, isTrue);
      final machine = FuelMachine.fromJson({'id': 's', 'name': 'Sany excavator', 'ownership': 'hired', 'ownerName': 'Wani Infra'});
      expect(machine.subtitle, 'Hired · Wani Infra');
    });

    test('reads the register exactly as the API sends it', () {
      // Captured from GET /fuel on a local server loaded with the Dal Lake
      // opening register: the contract between the server and this app.
      final api = jsonDecode(File('test/fixtures/fuel_register_api.json').readAsStringSync()) as Map<String, dynamic>;
      final state = parseRegister(api);
      expect(state.stockNow, 300);
      expect(state.receivedThisMonth, 1000);
      expect(state.issuedThisMonth, 720);
      expect(state.machines.map((m) => m.name), containsAll(['Komatsu PC210 excavator', 'Sany excavator', 'Road roller']));
      expect(state.machines.firstWhere((m) => m.name == 'Sany excavator').subtitle, 'Hired · Wani Infra');
      expect(state.machines.firstWhere((m) => m.name == 'Komatsu PC210 excavator').subtitle, 'Own · Rinku');
      expect(state.entries.first.date, '2026-11-23');
      expect(state.entries.first.balance, 300);
      expect(state.entries.last.entryType, 'adjustment');
      expect(state.hiredByFirm, {'Wani Infra': 250});
      expect(state.machineUse.firstWhere((m) => m.name == 'Komatsu PC210 excavator').litres, 400);
      expect(state.warnings, [
        '2 purchases this month (1,000 L) without a rate. Enter the rate on the website so the diesel can be costed.',
        startsWith('No meter reading at any fill for '),
      ]);
    });

    test('warnings are put in words', () {
      expect(describeWarnings([
        {'kind': 'negative_stock', 'fuelType': 'diesel', 'date': '2026-11-22', 'balance': -20},
        {'kind': 'unlisted_machine', 'logbookMachine': 'Tipper', 'litres': 5},
      ]), [
        'Stock goes below zero (-20 L) on 2026-11-22. A purchase is missing or an issue is wrong.',
        '5 L went to "Tipper", which is not on the machine list.',
      ]);
    });
  });

  group('diesel register screen', () {
    setUp(installPlatformMocks);

    const supervisor = UserModel(id: 'u1', name: 'Site Supervisor', email: 's@kipl.com', role: 'supervisor', projectId: 'p1');
    const viewer = UserModel(id: 'u2', name: 'Accounts', email: 'a@kipl.com', role: 'accounts', projectId: 'p1');

    Widget app({UserModel user = supervisor}) => ProviderScope(
          overrides: [
            currentUserProvider.overrideWith((ref) => user),
            dieselProvider.overrideWith((ref) => _SeededDiesel(Dio(), 'p1', 'Site Supervisor', ref.watch(syncServiceProvider.notifier), _register)),
          ],
          child: MaterialApp(theme: AppTheme.dark, debugShowCheckedModeBanner: false, home: const DieselScreen()),
        );

    Future<void> settle(WidgetTester tester, Widget widget, {double textScale = 1.0}) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(Builder(
        builder: (context) => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
          child: widget,
        ),
      ));
      await tester.pump(const Duration(milliseconds: 400));
    }

    /// The form is a lazy list: what is below the fold is not built until scrolled to.
    final vertical = find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first;
    Future<void> scrollTo(WidgetTester tester, Finder finder) => tester.scrollUntilVisible(finder, 200, scrollable: vertical);
    bool fieldHolds(WidgetTester tester, String text) =>
        tester.widgetList<EditableText>(find.byType(EditableText)).any((e) => e.controller.text == text);

    Future<void> snap(WidgetTester tester, String name) =>
        expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/$name.png'));

    testWidgets('picking a machine fills in its operator', (t) async {
      await settle(t, app());
      await t.tap(find.text('Komatsu PC210 excavator'));
      await t.pumpAndSettle();
      expect(find.text('Own · Rinku'), findsOneWidget);
      // Nothing typed yet, so nothing is flagged.
      expect(find.text('Enter the litres'), findsNothing);
      await snap(t, 'diesel_issue_form');
      await scrollTo(t, find.text('Operator'));
      expect(fieldHolds(t, 'Rinku'), isTrue);
    });

    testWidgets('a hired machine says whose bill to check', (t) async {
      await settle(t, app());
      await t.tap(find.text('Sany excavator'));
      await t.pumpAndSettle();
      await scrollTo(t, find.textContaining('hired from Wani Infra'));
      expect(find.textContaining('hired from Wani Infra'), findsOneWidget);
    });

    testWidgets('the meter reading is asked for unless it is marked not read', (t) async {
      await settle(t, app());
      await t.tap(find.text('JCB 3DX backhoe loader'));
      await t.pumpAndSettle();
      await scrollTo(t, find.text('Litres'));
      await t.enterText(find.byWidgetPredicate((w) => w is TextField && w.decoration?.hintText == 'e.g. 200'), '50');
      await scrollTo(t, find.text('Save issue'));
      await t.tap(find.text('Save issue'));
      await t.pumpAndSettle();
      await scrollTo(t, find.text('Enter the meter reading, or tick "Meter not read"'));
      expect(find.text('Enter the meter reading, or tick "Meter not read"'), findsOneWidget);
      // Ticking "not read" moves the question to the remarks.
      await scrollTo(t, find.text('Meter not read'));
      await t.tap(find.text('Meter not read'));
      await t.pumpAndSettle();
      await scrollTo(t, find.text('Save issue'));
      await t.tap(find.text('Save issue'));
      await t.pumpAndSettle();
      await scrollTo(t, find.text('Say why the meter was not read'));
      expect(find.text('Say why the meter was not read'), findsOneWidget);
    });

    testWidgets('the stock tab shows the balance, the burn and the hired total', (t) async {
      await settle(t, app());
      await t.tap(find.text('Stock'));
      await t.pumpAndSettle();
      expect(find.text('300 L'), findsWidgets);
      expect(find.textContaining("250 L went into Wani Infra's machines"), findsOneWidget);
      expect(find.textContaining('6.4 L/hr'), findsOneWidget);
      await snap(t, 'diesel_stock');
    });

    testWidgets('people without field rights can look but not record', (t) async {
      await settle(t, app(user: viewer));
      expect(find.textContaining('only supervisors'), findsOneWidget);
      await scrollTo(t, find.text('Save issue'));
      final save = t.widget<FilledButton>(find.ancestor(of: find.text('Save issue'), matching: find.byWidgetPredicate((w) => w is FilledButton)));
      expect(save.onPressed, isNull);
    });

    testWidgets('200% system text', (t) async {
      await settle(t, app(), textScale: 2.0);
      await snap(t, 'diesel_large_text');
    });
  });
}
