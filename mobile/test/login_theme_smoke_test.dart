import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/features/auth/screens/login_screen.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

/// The old theme forced every ElevatedButton to `minimumSize: (infinity, 48)`.
/// The new one uses `(0, 48)`, so a dialog's action buttons and a Wrap's
/// children size to their content instead of stretching.
///
/// Nothing relied on the old value — every deliberately full-width button
/// wraps itself in `SizedBox(width: double.infinity)` — but "nothing relied on
/// it" is a claim about seventeen call sites, so this renders the screen where
/// a regression would show first.
void main() {
  // LoginScreen reads the saved API base URL from secure storage on init, and
  // there is no platform plugin behind that channel in a widget test.
  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async => call.method == 'readAll' ? <String, String>{} : null,
    );
  });

  testWidgets('login still renders under the new theme', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.dark,
          home: const LoginScreen(),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));

    await expectLater(
      find.byType(LoginScreen),
      matchesGoldenFile('goldens/login_theme_smoke.png'),
    );
  });
}
