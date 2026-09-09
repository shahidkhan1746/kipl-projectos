import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/auth/user_model.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/status_pill.dart';
import '../../attendance/attendance_provider.dart';
import '../../../core/project_info.dart';
import '../project_summary_provider.dart';
import '../widgets/attention_strip.dart';
import '../widgets/project_hero_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final authNotifier = ref.read(authStateProvider.notifier);
    final attState = ref.watch(attendanceProvider);
    final syncState = ref.watch(syncServiceProvider);
    final syncNotifier = ref.read(syncServiceProvider.notifier);
    final summaryAsync = ref.watch(projectSummaryProvider);

    final geo = attState.geofence;
    final isInside = geo?.isInside ?? false;
    // Via statusLabel, never distanceMeters: that is double.infinity until
    // there is a fix, and .round() on it threw "Infinity or NaN toInt",
    // replacing the dashboard with a red error screen on any phone that had
    // not granted location yet.
    final locationStatus = attState.isCheckingProximity
        ? 'Acquiring GPS location…'
        : geo?.statusLabel ?? 'GPS location not available';

    // All three branches render the same card; only the summary differs, so
    // loading and failure keep the layout rather than collapsing it.
    ProjectHeroCard heroFor(ProjectSummary summary) => ProjectHeroCard(
          summary: summary,
          locationStatus: locationStatus,
          isInsideGeofence: isInside,
        );

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.water_drop,
                  color: Theme.of(context).colorScheme.primary, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('KIPL ProjectOS',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text(ProjectInfo.shortTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 10,
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Live Sync Status Pill
          InkWell(
            onTap: () => syncNotifier.flushQueue(),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: syncState.isSyncing
                    ? Theme.of(context).colorScheme.primaryContainer
                    : (syncState.pendingCount > 0
                        ? context.status.warningContainer
                        : (!syncState.isOnline
                            ? context.status.dangerContainer
                            : context.status.successContainer)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    syncState.isSyncing
                        ? Icons.sync
                        : (!syncState.isOnline
                            ? Icons.cloud_off
                            : (syncState.pendingCount > 0
                                ? Icons.cloud_upload
                                : Icons.cloud_done)),
                    size: 13,
                    color: syncState.isSyncing
                        ? Theme.of(context).colorScheme.primary
                        : (syncState.pendingCount > 0
                            ? context.status.warning
                            : (!syncState.isOnline
                                ? context.status.danger
                                : context.status.success)),
                  ),
                  if (MediaQuery.sizeOf(context).width >= 390) ...[
                    const SizedBox(width: 4),
                    Text(
                      syncState.isSyncing
                          ? 'Syncing'
                          : (!syncState.isOnline
                              ? 'Offline'
                              : (syncState.pendingCount > 0
                                  ? '${syncState.pendingCount} Queued'
                                  : 'Synced')),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: syncState.isSyncing
                            ? Theme.of(context).colorScheme.primary
                            : (syncState.pendingCount > 0
                                ? context.status.warning
                                : (!syncState.isOnline
                                    ? context.status.danger
                                    : context.status.success)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          // Crafted User Profile Avatar Chip
          GestureDetector(
            onTap: () => _showAccountSheet(
              context,
              ref,
              user,
              syncState,
              syncNotifier,
              authNotifier,
            ),
            child: Container(
              margin: const EdgeInsets.only(
                  right: 12, top: 11, bottom: 11, left: 4),
              padding: const EdgeInsets.all(1.5),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Theme.of(context)
                      .colorScheme
                      .primary
                      .withValues(alpha: 0.5),
                  width: 1.5,
                ),
              ),
              child: CircleAvatar(
                radius: 14,
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                child: Text(
                  _getInitials(user?.name),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          // Not autoDispose, so the schedule is refetched only when asked.
          ref.invalidate(projectSummaryProvider);
          await ref.read(attendanceProvider.notifier).init();
        },
        color: Theme.of(context).colorScheme.primary,
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 0. Offline changes that will never sync on their own.
              //    Without this the sync badge shows a count that can never
              //    reach zero and the worker has no way to act on it.
              if (syncState.blockedCount > 0) ...[
                _BlockedSyncCard(
                  entries: syncState.blocked,
                  onRetry: syncNotifier.retryEntry,
                  onDiscard: syncNotifier.discardEntry,
                ),
                const SizedBox(height: 16),
              ],

              // 1. Who is signed in. One line now — the hero below owns the
              //    card-sized space the welcome banner used to take.
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.name.isNotEmpty == true
                              ? user!.name
                              : 'Site Engineer',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        Text(
                          DateFormatters.formatIndian(DateTime.now()),
                          style: TextStyle(
                              fontSize: 11.5,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  StatusPill(
                    label: user?.roleDisplay ?? 'Field User',
                    type: StatusPillType.info,
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // 2. Where the job stands — the web dashboard's project banner,
              //    laid out for a phone. Loading and failure both render the
              //    card with an empty summary, so the layout never jumps and
              //    every unknown figure shows as an em dash rather than a zero
              //    that would read as "nothing is done".
              summaryAsync.when(
                data: heroFor,
                loading: () => heroFor(const ProjectSummary()),
                error: (_, __) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    heroFor(const ProjectSummary()),
                    const SizedBox(height: 6),
                    Text(
                      'Schedule figures unavailable — pull down to retry.',
                      style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context).colorScheme.outline),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // 3. Only what needs a decision. Empty means one green line.
              AttentionStrip(
                items: [
                  AttentionItem(
                    count: summaryAsync.valueOrNull?.delayed,
                    label: 'delayed tasks',
                    tone: context.status.warning,
                    icon: Icons.schedule_outlined,
                    onTap: () => context.go('/tasks'),
                  ),
                  AttentionItem(
                    count: syncState.pendingCount,
                    label: 'waiting to sync',
                    tone: Theme.of(context).colorScheme.primary,
                    icon: Icons.cloud_upload_outlined,
                    onTap: () => syncNotifier.flushQueue(),
                  ),
                  AttentionItem(
                    count: attState.todayRecord?.isCheckedIn == true ? 0 : 1,
                    label: 'not punched in',
                    tone: context.status.danger,
                    icon: Icons.fingerprint,
                    onTap: () => context.go('/attendance'),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // 2. Today's Date & Quick stats
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      context,
                      'TODAY',
                      DateFormatters.formatIndian(DateTime.now()),
                      Icons.calendar_today_outlined,
                      Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      context,
                      'PUNCH STATUS',
                      attState.todayRecord?.isCheckedIn == true
                          ? 'Active on Site'
                          : 'Not Punched',
                      Icons.timer_outlined,
                      attState.todayRecord?.isCheckedIn == true
                          ? context.status.success
                          : context.status.warning,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // 3. Quick Actions
              Text('Go to', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: Space.md),

              LayoutBuilder(
                builder: (context, constraints) {
                  final columns = constraints.maxWidth < 340
                      ? 1
                      : constraints.maxWidth >= 720
                          ? 3
                          : 2;
                  return GridView.count(
                    crossAxisCount: columns,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: columns == 1 ? 2.8 : 1.25,
                    children: [
                      _buildActionCard(
                        context,
                        title: 'Field Attendance',
                        subtitle: 'GPS Geofence punch',
                        icon: Icons.fingerprint,
                        onTap: () => context.go('/attendance'),
                      ),
                      _buildActionCard(
                        context,
                        title: 'Site Diary',
                        subtitle: 'Daily progress log',
                        icon: Icons.menu_book_outlined,
                        onTap: () => context.go('/diary'),
                      ),
                      _buildActionCard(
                        context,
                        title: 'Field Tasks',
                        subtitle: 'Assigned checklists',
                        icon: Icons.assignment_turned_in_outlined,
                        onTap: () => context.go('/tasks'),
                      ),
                      _buildActionCard(
                        context,
                        title: 'Plant & Fleet',
                        subtitle: 'Hours & fuel intake',
                        icon: Icons.construction_outlined,
                        onTap: () => context.push('/fleet'),
                      ),
                      _buildActionCard(
                        context,
                        title: 'Material Register',
                        subtitle: 'Gate receipt & usage',
                        icon: Icons.inventory_2_outlined,
                        onTap: () => context.push('/materials'),
                      ),
                      _buildActionCard(
                        context,
                        title: 'QA & Safety',
                        subtitle: 'Inspections & NCRs',
                        icon: Icons.fact_check_outlined,
                        onTap: () => context.push('/qa'),
                      ),
                      _buildActionCard(
                        context,
                        title: 'Site Orders',
                        subtitle: 'Clause 42.3 book',
                        icon: Icons.gavel_outlined,
                        onTap: () => context.push('/site-orders'),
                      ),
                      _buildActionCard(
                        context,
                        title: 'Team Directory',
                        subtitle: 'Call & WhatsApp',
                        icon: Icons.contacts_outlined,
                        onTap: () => context.push('/team'),
                      ),
                      _buildActionCard(
                        context,
                        title: 'Site Updates',
                        subtitle: 'Milestones & photo feed',
                        icon: Icons.newspaper_outlined,
                        onTap: () => context.push('/site-updates'),
                      ),
                      if (user?.isProjectManager == true)
                        _buildActionCard(
                          context,
                          title: 'Approvals',
                          subtitle: 'Diaries & approvals',
                          icon: Icons.verified_user_outlined,
                          onTap: () => context.push('/approvals'),
                        ),
                    ],
                  );
                },
              ),

              const SizedBox(height: 24),

              // 4. Project Reference Details
              Container(
                padding: const EdgeInsets.all(Space.lg),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  borderRadius: Radii.cardAll,
                  border: Border.all(
                      color: Theme.of(context).colorScheme.outlineVariant),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Survey, Design & Execution of Sewerage Scheme Dal Lake '
                      '(${ProjectInfo.stpCapacity} STP Srinagar)',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: Space.sm),
                    Text(
                      'Employer: J&K Urban Environmental Engineering '
                      'Department (UEED)',
                      style: Theme.of(context).textTheme.labelMedium,
                    ),
                    const SizedBox(height: Space.xs),
                    Text(
                      'Contractor: M/S Khilari Infrastructure Pvt. Ltd.',
                      style: Theme.of(context).textTheme.labelMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// A small fact with a state colour.
  ///
  /// [color] survives here, unlike on the launcher tiles, because on these two
  /// it carries meaning: green for on site, amber for not punched in.
  Widget _buildMetricCard(
    BuildContext context,
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: Radii.cardAll,
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(label, style: theme.textTheme.labelMedium),
              ),
              Icon(icon, size: Sizes.iconInline, color: color),
            ],
          ),
          const SizedBox(height: Space.sm),
          Text(
            value,
            style: theme.textTheme.titleSmall?.copyWith(color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  /// One destination in the launcher grid.
  ///
  /// These carried ten different accent colours — teal, blue, amber, purple,
  /// pink, cyan, a second amber, green, indigo and a second blue — none of
  /// which meant anything. Ten hues competing on the first screen after login
  /// is what makes an app look assembled rather than designed, and it left no
  /// colour free to mean "this needs attention", which is the one thing this
  /// screen should be able to say. The icon shape is the identity; the tint is
  /// the same everywhere.
  Widget _buildActionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surfaceContainerLow,
      borderRadius: Radii.cardAll,
      child: InkWell(
        onTap: onTap,
        borderRadius: Radii.cardAll,
        child: Container(
          padding: const EdgeInsets.all(Space.md),
          decoration: BoxDecoration(
            borderRadius: Radii.cardAll,
            border: Border.all(color: theme.colorScheme.outlineVariant),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon,
                  color: theme.colorScheme.primary, size: Sizes.iconAction),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleSmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: Space.xs),
                  Text(
                    subtitle,
                    style: theme.textTheme.labelMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getInitials(String? name) {
    if (name == null || name.trim().isEmpty) return 'U';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  void _showAccountSheet(
    BuildContext context,
    WidgetRef ref,
    UserModel? user,
    SyncState syncState,
    SyncService syncNotifier,
    AuthNotifier authNotifier,
  ) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor:
                          Theme.of(context).colorScheme.primaryContainer,
                      child: Text(
                        _getInitials(user?.name),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.name.isNotEmpty == true
                                ? user!.name
                                : 'Site Engineer',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            user?.email ?? '',
                            style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    StatusPill(
                      label: user?.roleDisplay ?? 'Field Staff',
                      type: StatusPillType.info,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: Theme.of(context).colorScheme.outlineVariant),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ASSIGNED PROJECT',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.outline,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        ProjectInfo.schemeWithCapacity,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${ProjectInfo.clientName} · ${ProjectInfo.siteLocation}',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: Theme.of(context).colorScheme.outlineVariant),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        syncState.isOnline ? Icons.cloud_done : Icons.cloud_off,
                        size: 16,
                        color: syncState.isOnline
                            ? context.status.success
                            : context.status.warning,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          syncState.isOnline
                              ? (syncState.pendingCount > 0
                                  ? '${syncState.pendingCount} offline records queued'
                                  : 'All site data synchronized with server')
                              : 'Offline mode active',
                          style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(context).colorScheme.onSurface),
                        ),
                      ),
                      if (syncState.isOnline && syncState.pendingCount > 0)
                        TextButton(
                          onPressed: () => syncNotifier.flushQueue(),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            minimumSize: const Size(0, 30),
                          ),
                          child: Text('Sync',
                              style: TextStyle(
                                  fontSize: 12,
                                  color:
                                      Theme.of(context).colorScheme.primary)),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                InkWell(
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor:
                            Theme.of(context).colorScheme.surfaceContainerLow,
                        title: Text('Sign Out',
                            style: TextStyle(
                                color:
                                    Theme.of(context).colorScheme.onSurface)),
                        content: Text(
                            'Are you sure you want to sign out of KIPL ProjectOS?',
                            style: TextStyle(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant)),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: Text('Cancel',
                                style: TextStyle(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant)),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: Text('Sign Out',
                                style: TextStyle(color: context.status.danger)),
                          ),
                        ],
                      ),
                    );
                    if (confirm == true) {
                      authNotifier.logout();
                    }
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    decoration: BoxDecoration(
                      color: context.status.dangerContainer,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: context.status.danger.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.logout_rounded,
                            size: 18, color: context.status.danger),
                        SizedBox(width: 8),
                        Text(
                          'Sign Out of Account',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: context.status.danger,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Surfaces outbox entries that stopped retrying — the server rejected them,
/// or automatic attempts ran out. Each needs a human decision, so each gets
/// one.
class _BlockedSyncCard extends StatelessWidget {
  final List<OutboxEntry> entries;
  final Future<void> Function(String id) onRetry;
  final Future<void> Function(String id) onDiscard;

  const _BlockedSyncCard({
    required this.entries,
    required this.onRetry,
    required this.onDiscard,
  });

  static final _idSegment = RegExp(r'^[0-9a-fA-F-]{16,}$');

  /// The endpoint is the only description the outbox keeps, so turn it into
  /// something readable: '/qa/ncrs' -> 'Qa Ncrs', '/site-orders/<uuid>' ->
  /// 'Site Orders'. Record ids are dropped — they mean nothing to a worker.
  String _label(OutboxEntry e) {
    final words = e.endpoint
        .split('/')
        .where((p) => p.isNotEmpty && !_idSegment.hasMatch(p))
        .expand((p) => p.split('-'))
        .where((w) => w.isNotEmpty)
        .map((w) => '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
    return words.isEmpty ? e.endpoint : words;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.status.dangerContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.status.danger.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.sync_problem, color: context.status.danger, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${entries.length} offline change(s) could not be saved',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'These will not sync on their own. Retry them, or discard them if '
            'the work was recorded another way.',
            style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                height: 1.4),
          ),
          const SizedBox(height: 10),
          for (final e in entries)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _label(e),
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  if (e.failureReason != null)
                    Text(
                      e.failureReason!,
                      style: TextStyle(
                          fontSize: 11.5,
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => onRetry(e.id),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: const Size(0, 32),
                        ),
                        child: Text('Retry',
                            style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).colorScheme.primary)),
                      ),
                      TextButton(
                        onPressed: () => onDiscard(e.id),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: const Size(0, 32),
                        ),
                        child: Text('Discard',
                            style: TextStyle(
                                fontSize: 12, color: context.status.danger)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
