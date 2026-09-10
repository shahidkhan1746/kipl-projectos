import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/auth/user_model.dart';
import 'package:kipl_projectos/features/more/screens/more_screen.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

import 'support/platform_mocks.dart';

/// The More tab, which is the front door for the seven screens that had none.
///
/// Two things here are conditional on state rather than on layout, so they are
/// the ones worth rendering: the Approvals group appears only for a project
/// manager, and the sync tile says five different things depending on whether
/// the phone is online, syncing, and holding anything.
void main() {
  setUp(installPlatformMocks);

  const manager = UserModel(
    id: 'u1',
    name: 'Shahid Parvez Khan',
    email: 'shahid@kipl.com',
    role: 'project_manager',
    designation: 'Liaisoning Officer',
    employeeId: 'KIPL-001',
    projectId: 'p1',
  );

  const supervisor = UserModel(
    id: 'u2',
    name: 'Bilal Ahmad',
    email: 'bilal@kipl.com',
    role: 'supervisor',
    designation: 'Site Supervisor',
    employeeId: 'KIPL-014',
    projectId: 'p1',
  );

  Future<void> shoot(
    WidgetTester tester,
    UserModel user,
    ThemeData theme,
    String name,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [currentUserProvider.overrideWith((ref) => user)],
        child: MaterialApp(
          theme: theme,
          debugShowCheckedModeBanner: false,
          home: const MoreScreen(),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));

    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('goldens/more_$name.png'),
    );
  }

  testWidgets('more — a project manager sees Approvals', (t) async {
    await shoot(t, manager, AppTheme.dark, 'manager');
    expect(find.text('Approvals'), findsOneWidget);
    expect(find.text('Management'), findsOneWidget);
  });

  testWidgets('more — a supervisor does not', (t) async {
    await shoot(t, supervisor, AppTheme.dark, 'supervisor');
    // Hidden rather than shown-and-bounced: the router already redirects a
    // non-manager away from /approvals, and offering a door that closes in
    // your face is worse than no door.
    expect(find.text('Approvals'), findsNothing);
    expect(find.text('Management'), findsNothing);
    // Everything they can actually use is still there.
    expect(find.text('Site orders'), findsOneWidget);
    expect(find.text('QA & safety'), findsOneWidget);
    expect(find.text('Team directory'), findsOneWidget);
  });

  testWidgets('more — light', (t) async {
    await shoot(t, manager, AppTheme.light, 'light');
  });
}
