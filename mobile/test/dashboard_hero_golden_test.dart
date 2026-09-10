import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/features/dashboard/project_summary_provider.dart';
import 'package:kipl_projectos/features/dashboard/widgets/attention_strip.dart';
import 'package:kipl_projectos/features/dashboard/widgets/project_hero_card.dart';
import 'package:kipl_projectos/shared/theme/app_theme.dart';

/// Renders the new dashboard components to a PNG so the layout can actually be
/// looked at. A design that only ever passed `flutter analyze` has not been
/// checked — overflow, clipping and cramped figures are invisible to the
/// analyzer and obvious in an image.
void main() {
  Widget harness(Widget child, {double width = 390}) => MaterialApp(
        theme: AppTheme.dark,
        home: Scaffold(
          backgroundColor: AppColors.bgPage,
          body: Center(
            child: SizedBox(
              width: width,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: child,
              ),
            ),
          ),
        ),
      );

  const behind = ProjectSummary(
    workDonePct: 4.2,
    timeElapsedPct: 34.0,
    daysRemaining: 606,
    totalTasks: 25,
    completed: 1,
    inProgress: 4,
    delayed: 3,
    milestones: 8,
    milestonesHit: 2,
    criticalTasks: 9,
    contractStart: '2025-11-07',
    contractEnd: '2028-05-07',
  );

  testWidgets('hero — real figures, behind programme', (tester) async {
    await tester.pumpWidget(harness(Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const ProjectHeroCard(
          summary: behind,
          locationStatus: 'Outside geofence — 1.2 km away',
          isInsideGeofence: false,
        ),
        const SizedBox(height: 14),
        AttentionStrip(items: [
          AttentionItem(count: 3, label: 'delayed tasks', tone: AppColors.amber, icon: Icons.schedule_outlined),
          AttentionItem(count: 2, label: 'waiting to sync', tone: AppColors.accent, icon: Icons.cloud_upload_outlined),
          AttentionItem(count: 1, label: 'not punched in', tone: AppColors.red, icon: Icons.fingerprint),
        ]),
      ],
    )));
    await tester.pumpAndSettle();
    await expectLater(find.byType(Scaffold), matchesGoldenFile('goldens/hero_behind.png'));
  });

  testWidgets('hero — nothing known yet, everything an em dash', (tester) async {
    await tester.pumpWidget(harness(Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: const [
        ProjectHeroCard(
          summary: ProjectSummary(),
          locationStatus: 'Location access not enabled',
          isInsideGeofence: false,
        ),
        SizedBox(height: 14),
        AttentionStrip(items: []),
      ],
    )));
    await tester.pumpAndSettle();
    await expectLater(find.byType(Scaffold), matchesGoldenFile('goldens/hero_unknown.png'));
  });

  testWidgets('hero — narrow 320dp screen', (tester) async {
    await tester.pumpWidget(harness(
      const ProjectHeroCard(
        summary: behind,
        locationStatus: 'Inside site geofence (180 m)',
        isInsideGeofence: true,
      ),
      width: 320,
    ));
    await tester.pumpAndSettle();
    await expectLater(find.byType(Scaffold), matchesGoldenFile('goldens/hero_narrow.png'));
  });
}
