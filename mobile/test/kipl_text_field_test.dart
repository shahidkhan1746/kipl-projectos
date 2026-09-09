import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';
import 'package:kipl_projectos/shared/widgets/kipl_text_field.dart';

/// A multiline [KiplTextField] must build.
///
/// It did not. The widget defaults textInputAction to newline when maxLines is
/// greater than one, but left keyboardType at its TextInputType.text default,
/// and Flutter asserts on precisely that combination:
///
///   Use keyboardType TextInputType.multiline when using
///   TextInputAction.newline on a multiline TextField
///
/// Sixteen fields across five screens were built that way. Both halves are
/// individually legal, so the analyzer saw nothing; the assertion only fires
/// when the widget is actually laid out.
void main() {
  Widget harness(Widget child) => MaterialApp(
        theme: AppTheme.dark,
        home: Scaffold(
            body: Padding(padding: const EdgeInsets.all(16), child: child)),
      );

  testWidgets('a multiline field builds without throwing', (tester) async {
    await tester.pumpWidget(harness(
      KiplTextField(
        controller: TextEditingController(),
        label: 'Remarks',
        maxLines: 3,
      ),
    ));

    expect(tester.takeException(), isNull);

    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.keyboardType, TextInputType.multiline);
    expect(field.textInputAction, TextInputAction.newline);
  });

  testWidgets('a single-line field still gets done, not newline',
      (tester) async {
    await tester.pumpWidget(harness(
      KiplTextField(
        controller: TextEditingController(),
        label: 'Reference',
      ),
    ));

    expect(tester.takeException(), isNull);
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.textInputAction, TextInputAction.done);
  });

  testWidgets('an explicit keyboardType is never overridden', (tester) async {
    await tester.pumpWidget(harness(
      KiplTextField(
        controller: TextEditingController(),
        label: 'Quantity',
        maxLines: 2,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textInputAction: TextInputAction.next,
      ),
    ));

    expect(tester.takeException(), isNull);
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.keyboardType,
        const TextInputType.numberWithOptions(decimal: true));
  });

  testWidgets('a password field is never treated as multiline', (tester) async {
    await tester.pumpWidget(harness(
      KiplTextField(
        controller: TextEditingController(),
        label: 'Password',
        isPassword: true,
        maxLines: 3,
      ),
    ));

    expect(tester.takeException(), isNull);
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.maxLines, 1);
    expect(field.textInputAction, TextInputAction.done);
    // Never learned by the keyboard, never autocorrected.
    expect(field.autocorrect, isFalse);
    expect(field.enableSuggestions, isFalse);
  });
}
