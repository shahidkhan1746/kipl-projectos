import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/features/dashboard/project_summary_provider.dart';
import 'package:kipl_projectos/features/dashboard/widgets/project_hero_card.dart';
import 'package:kipl_projectos/shared/theme/field_theme.dart';
import 'support/design_fonts.dart';

void main() {
  setUpAll(loadDesignFonts);
  Widget harness(ProjectSummary summary, {double width = 390}) => MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: FieldTheme.dark,
        home: Scaffold(
            body: Center(
                child: SizedBox(
                    width: width,
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(FieldSpace.lg),
                      child: ProjectHeroCard(
                          summary: summary,
                          locationStatus: 'Location access not enabled',
                          isInsideGeofence: false),
                    )))),
      );

  const behind = ProjectSummary(
      workDonePct: 4.2,
      timeElapsedPct: 34,
      daysRemaining: 606,
      totalTasks: 25,
      completed: 1,
      inProgress: 4,
      delayed: 3,
      milestones: 8,
      milestonesHit: 2,
      criticalTasks: 9,
      contractStart: '2025-11-07',
      contractEnd: '2028-05-07');

  testWidgets('hero — real figures, behind programme', (tester) async {
    await tester.pumpWidget(harness(behind));
    await tester.pumpAndSettle();
    expect(
        find.textContaining('29.8 percentage points behind'), findsOneWidget);
    await expectLater(
        find.byType(Scaffold), matchesGoldenFile('goldens/hero_behind.png'));
  });

  testWidgets('hero — nothing known yet, everything an em dash',
      (tester) async {
    await tester.pumpWidget(harness(const ProjectSummary()));
    await tester.pumpAndSettle();
    expect(find.text('—'), findsNWidgets(2));
    expect(find.text('Schedule comparison unavailable'), findsOneWidget);
    await expectLater(
        find.byType(Scaffold), matchesGoldenFile('goldens/hero_unknown.png'));
  });

  testWidgets('hero — narrow 320dp screen', (tester) async {
    await tester.pumpWidget(harness(behind, width: 320));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await expectLater(
        find.byType(Scaffold), matchesGoldenFile('goldens/hero_narrow.png'));
  });
}
