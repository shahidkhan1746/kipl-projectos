import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/field_theme.dart';
import '../../../shared/widgets/field_components.dart';
import '../../attendance/attendance_provider.dart';
import '../project_summary_provider.dart';
import '../widgets/dashboard_sheets.dart';
import '../widgets/project_hero_card.dart';

/// Presentation clock only; operational record dates remain in their providers.
final dashboardClockProvider =
    Provider<DateTime Function()>((ref) => DateTime.now);

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => Theme(
        data: FieldTheme.dark,
        child: Builder(builder: (context) => _buildDashboard(context, ref)),
      );

  Widget _buildDashboard(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final attendance = ref.watch(attendanceProvider);
    final sync = ref.watch(syncServiceProvider);
    final summary = ref.watch(projectSummaryProvider);
    final location = attendance.isCheckingProximity
        ? 'Acquiring GPS location…'
        : attendance.geofence?.statusLabel ?? 'GPS location not available';
    final attention = sync.blockedCount > 0 ||
        sync.pendingCount > 0 ||
        !sync.isOnline ||
        sync.lastError != null;

    void openSync() =>
        showFieldSheet<void>(context, child: const DashboardSyncSheet());
    ProjectHeroCard snapshot(ProjectSummary value) => ProjectHeroCard(
          summary: value,
          locationStatus: location,
          isInsideGeofence: attendance.geofence?.isInside ?? false,
        );

    final tools = <Widget>[
      FieldNavigationRow(
          title: 'Fleet',
          subtitle: 'Equipment & usage logs',
          icon: Icons.local_shipping_outlined,
          onTap: () => context.push('/fleet')),
      FieldNavigationRow(
          title: 'Materials',
          subtitle: 'Stock & site movements',
          icon: Icons.inventory_2_outlined,
          onTap: () => context.push('/materials')),
      FieldNavigationRow(
          title: 'QA & Safety',
          subtitle: 'Inspections & NCRs',
          icon: Icons.fact_check_outlined,
          onTap: () => context.push('/qa')),
      FieldNavigationRow(
          title: 'Site Orders',
          subtitle: 'Instructions & follow-up',
          icon: Icons.description_outlined,
          onTap: () => context.push('/site-orders')),
      FieldNavigationRow(
          title: 'Team',
          subtitle: 'People on the project',
          icon: Icons.people_outline,
          onTap: () => context.push('/team')),
      FieldNavigationRow(
          title: 'Leave',
          subtitle: 'Apply and track applications',
          icon: Icons.event_busy_outlined,
          onTap: () => context.push('/leave')),
      FieldNavigationRow(
          title: 'Site Updates',
          subtitle: 'Progress & site photos',
          icon: Icons.photo_library_outlined,
          onTap: () => context.push('/site-updates')),
      if (user?.isProjectManager == true)
        FieldNavigationRow(
            title: 'Approvals',
            subtitle: 'Review submitted diaries',
            icon: Icons.verified_user_outlined,
            onTap: () => context.push('/approvals')),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('KIPL ProjectOS'),
        actions: [
          IconButton(
            tooltip: 'Sync status',
            onPressed: openSync,
            icon: Icon(
                sync.blockedCount > 0
                    ? Icons.sync_problem
                    : !sync.isOnline
                        ? Icons.cloud_off_outlined
                        : Icons.sync,
                color: attention
                    ? FieldColors.warning
                    : FieldColors.textSecondary),
          ),
          IconButton(
            tooltip: 'Account',
            onPressed: () => showFieldSheet<void>(context,
                child: const DashboardAccountSheet()),
            icon: const Icon(Icons.account_circle_outlined),
          ),
          const SizedBox(width: FieldSpace.sm),
        ],
      ),
      body: SafeArea(
        top: false,
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(projectSummaryProvider);
            await ref.read(attendanceProvider.notifier).init();
          },
          child: SingleChildScrollView(
            key: const PageStorageKey('dashboard-scroll'),
            physics: const AlwaysScrollableScrollPhysics(),
            child: Center(
                child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: FieldSize.maxContent),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(FieldSpace.gutter,
                    FieldSpace.md, FieldSpace.gutter, FieldSpace.xl),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Semantics(
                          header: true,
                          child: const Text('Your workday',
                              style: FieldType.title)),
                      const SizedBox(height: FieldSpace.sm),
                      Text(
                          '${DateFormatters.formatIndian(ref.watch(dashboardClockProvider)())} · ${user?.name.trim().isNotEmpty == true ? user!.name : 'Site team'}',
                          style: FieldType.supporting),
                      const SizedBox(height: FieldSpace.gutter),
                      if (attention) ...[
                        FieldNavigationRow(
                          title: sync.blockedCount > 0
                              ? '${sync.blockedCount} changes need review'
                              : !sync.isOnline
                                  ? 'You’re offline'
                                  : sync.lastError != null
                                      ? 'Sync needs attention'
                                      : '${sync.pendingCount} changes waiting to sync',
                          subtitle: sync.blockedCount > 0
                              ? 'Open sync status to retry or review.'
                              : !sync.isOnline
                                  ? 'Open sync status to review saved changes.'
                                  : sync.lastError != null
                                      ? 'Last sync did not complete. Review status.'
                                      : 'Open sync status for details.',
                          icon: Icons.sync_problem_outlined,
                          onTap: openSync,
                        ),
                        const SizedBox(height: FieldSpace.md),
                      ],
                      _AttendanceAction(state: attendance, location: location),
                      const SizedBox(height: FieldSpace.section),
                      FieldSection(
                        title: 'Project snapshot',
                        child: summary.when(
                          skipLoadingOnRefresh: false,
                          data: snapshot,
                          loading: () => Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const LinearProgressIndicator(
                                    semanticsLabel: 'Loading project figures'),
                                const SizedBox(height: FieldSpace.sm),
                                const Text('Loading project figures…',
                                    style: FieldType.supporting),
                                const SizedBox(height: FieldSpace.md),
                                snapshot(const ProjectSummary()),
                              ]),
                          error: (_, __) => Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const Text(
                                    'Project figures couldn’t be loaded. Your site tools are still available.',
                                    style: FieldType.supporting),
                                Align(
                                    alignment: Alignment.centerLeft,
                                    child: TextButton.icon(
                                      onPressed: () => ref
                                          .invalidate(projectSummaryProvider),
                                      icon: const Icon(Icons.refresh),
                                      label:
                                          const Text('Retry project figures'),
                                    )),
                                snapshot(const ProjectSummary()),
                              ]),
                        ),
                      ),
                      const SizedBox(height: FieldSpace.section),
                      FieldSection(
                          title: 'Site tools',
                          child: FieldAdaptiveGroup(
                            spacing: FieldSpace.sm,
                            children: [
                              for (final tool in tools)
                                Column(children: [tool, const Divider()])
                            ],
                          )),
                    ]),
              ),
            )),
          ),
        ),
      ),
    );
  }
}

class _AttendanceAction extends StatelessWidget {
  const _AttendanceAction({required this.state, required this.location});
  final AttendanceState state;
  final String location;

  @override
  Widget build(BuildContext context) {
    final checkedOut = state.todayRecord?.isCheckedOut == true;
    final checkedIn = state.todayRecord?.isCheckedIn == true;
    final title = state.error != null
        ? 'Review your attendance'
        : checkedOut
            ? 'Checked out for today'
            : checkedIn
                ? 'You’re checked in'
                : 'Start with attendance';
    final details =
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(checkedIn ? Icons.check_circle_outline : Icons.fingerprint,
            color: checkedIn ? FieldColors.success : FieldColors.primary),
        const SizedBox(width: FieldSpace.md),
        Expanded(child: Text(title, style: FieldType.label)),
      ]),
      const SizedBox(height: FieldSpace.sm),
      Text(
          state.error != null
              ? 'Attendance status needs checking. Open attendance for details.'
              : location,
          style: FieldType.supporting),
    ]);
    final action = FilledButton(
      onPressed: () => context.go('/attendance'),
      child: Text(
          checkedIn || state.error != null
              ? 'View attendance'
              : 'Open attendance',
          textAlign: TextAlign.center),
    );
    return Container(
      padding: const EdgeInsets.all(FieldSpace.lg),
      decoration: BoxDecoration(
          color: FieldColors.surface,
          borderRadius: BorderRadius.circular(FieldShape.surface)),
      child: LayoutBuilder(builder: (context, constraints) {
        final scale = MediaQuery.textScalerOf(context).scale(16) / 16;
        if (constraints.maxWidth >= 560 * scale) {
          return Row(children: [
            Expanded(child: details),
            const SizedBox(width: FieldSpace.section),
            SizedBox(width: 200 * scale, child: action),
          ]);
        }
        return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              details,
              const SizedBox(height: FieldSpace.lg),
              action,
            ]);
      }),
    );
  }
}
