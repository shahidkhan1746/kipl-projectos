import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/status_pill.dart';
import '../../attendance/attendance_provider.dart';
import '../../../core/project_info.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final authNotifier = ref.read(authStateProvider.notifier);
    final attState = ref.watch(attendanceProvider);
    final syncState = ref.watch(syncServiceProvider);
    final syncNotifier = ref.read(syncServiceProvider.notifier);

    final geo = attState.geofence;
    final isInside = geo?.isInside ?? false;
    final locationStatus = attState.isCheckingProximity
        ? 'Acquiring GPS location…'
        : geo?.errorMessage != null
            ? geo!.errorMessage!
            : geo == null
                ? 'GPS location not available'
                : isInside
                    ? 'Inside Dal Lake STP boundary (GPS verified)'
                    : 'Outside STP site geofence (${geo.distanceMeters.round()}m away)';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.accentBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.water_drop, color: AppColors.accent, size: 18),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('KIPL ProjectOS',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text(ProjectInfo.shortTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
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
                    ? AppColors.accentBg
                    : (syncState.pendingCount > 0
                        ? AppColors.amberBg
                        : (!syncState.isOnline ? AppColors.redBg : AppColors.greenBg)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    syncState.isSyncing
                        ? Icons.sync
                        : (!syncState.isOnline
                            ? Icons.cloud_off
                            : (syncState.pendingCount > 0 ? Icons.cloud_upload : Icons.cloud_done)),
                    size: 13,
                    color: syncState.isSyncing
                        ? AppColors.accent
                        : (syncState.pendingCount > 0
                            ? AppColors.amber
                            : (!syncState.isOnline ? AppColors.red : AppColors.green)),
                  ),
                  if (MediaQuery.sizeOf(context).width >= 390) ...[
                    const SizedBox(width: 4),
                    Text(
                      syncState.isSyncing
                          ? 'Syncing'
                          : (!syncState.isOnline
                              ? 'Offline'
                              : (syncState.pendingCount > 0 ? '${syncState.pendingCount} Queued' : 'Synced')),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: syncState.isSyncing
                            ? AppColors.accent
                            : (syncState.pendingCount > 0
                                ? AppColors.amber
                                : (!syncState.isOnline ? AppColors.red : AppColors.green)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout_outlined, size: 20),
            tooltip: 'Sign Out',
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppColors.bgCard,
                  title: const Text('Sign Out', style: TextStyle(color: AppColors.textBase)),
                  content: const Text('Are you sure you want to sign out of KIPL ProjectOS?',
                      style: TextStyle(color: AppColors.textMuted)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Sign Out', style: TextStyle(color: AppColors.red)),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                authNotifier.logout();
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(attendanceProvider.notifier).init();
        },
        color: AppColors.accent,
        backgroundColor: AppColors.bgCard,
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

              // 1. User welcome banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF161B22), Color(0xFF1F2B3E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.borderDim),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Welcome back,',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        StatusPill(
                          label: user?.roleDisplay ?? 'Field User',
                          type: StatusPillType.info,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.name.isNotEmpty == true ? user!.name : 'Site Engineer',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textBase,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          isInside ? Icons.verified_rounded : Icons.location_on_outlined,
                          size: 16,
                          color: isInside ? AppColors.green : AppColors.amber,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            locationStatus,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: isInside ? AppColors.green : AppColors.amber,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // 2. Today's Date & Quick stats
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      'TODAY',
                      DateFormatters.formatIndian(DateTime.now()),
                      Icons.calendar_today_outlined,
                      AppColors.accent,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      'PUNCH STATUS',
                      attState.todayRecord?.isCheckedIn == true ? 'Active on Site' : 'Not Punched',
                      Icons.timer_outlined,
                      attState.todayRecord?.isCheckedIn == true ? AppColors.green : AppColors.amber,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // 3. Quick Actions
              const Text(
                'QUICK ACTIONS',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 12),

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
                    color: AppColors.teal,
                    onTap: () => context.go('/attendance'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Site Diary',
                    subtitle: 'Daily progress log',
                    icon: Icons.menu_book_outlined,
                    color: AppColors.accent,
                    onTap: () => context.go('/diary'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Field Tasks',
                    subtitle: 'Assigned checklists',
                    icon: Icons.assignment_turned_in_outlined,
                    color: AppColors.amber,
                    onTap: () => context.go('/tasks'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Plant & Fleet',
                    subtitle: 'Hours & fuel intake',
                    icon: Icons.construction_outlined,
                    color: const Color(0xFFA855F7),
                    onTap: () => context.push('/fleet'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Material Register',
                    subtitle: 'Gate receipt & usage',
                    icon: Icons.inventory_2_outlined,
                    color: const Color(0xFFEC4899),
                    onTap: () => context.push('/materials'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'QA & Safety',
                    subtitle: 'Inspections & NCRs',
                    icon: Icons.fact_check_outlined,
                    color: const Color(0xFF06B6D4),
                    onTap: () => context.push('/qa'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Site Orders',
                    subtitle: 'Clause 42.3 book',
                    icon: Icons.gavel_outlined,
                    color: const Color(0xFFF59E0B),
                    onTap: () => context.push('/site-orders'),
                  ),
                  _buildActionCard(
                    context,
                    title: 'Team Directory',
                    subtitle: 'Call & WhatsApp',
                    icon: Icons.contacts_outlined,
                    color: const Color(0xFF10B981),
                    onTap: () => context.push('/team'),
                  ),
                      if (user?.isProjectManager == true)
                        _buildActionCard(
                          context,
                          title: 'Approvals',
                          subtitle: 'Diaries & approvals',
                          icon: Icons.verified_user_outlined,
                          color: const Color(0xFF3B82F6),
                          onTap: () => context.push('/approvals'),
                        ),
                    ],
                  );
                },
              ),

              const SizedBox(height: 24),

              // 4. Project Reference Details
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.borderDim),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PROJECT REFERENCE',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Survey, Design & Execution of Sewerage Scheme Dal Lake '
                      '(${ProjectInfo.stpCapacity} STP Srinagar)',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textBase),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Client: J&K Lakes Conservation & Management Authority (LCMA)',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Contractor: M/S Khilari Infrastructure Pvt. Ltd.',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
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

  Widget _buildMetricCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderDim),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderDim),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textBase),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 11, color: AppColors.textFaint),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
        ),
      ),
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
        color: AppColors.redBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.red.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.sync_problem, color: AppColors.red, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${entries.length} offline change(s) could not be saved',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textBase,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'These will not sync on their own. Retry them, or discard them if '
            'the work was recorded another way.',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.4),
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
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textBase,
                    ),
                  ),
                  if (e.failureReason != null)
                    Text(
                      e.failureReason!,
                      style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                    ),
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => onRetry(e.id),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: const Size(0, 32),
                        ),
                        child: const Text('Retry', style: TextStyle(fontSize: 12, color: AppColors.accent)),
                      ),
                      TextButton(
                        onPressed: () => onDiscard(e.id),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: const Size(0, 32),
                        ),
                        child: const Text('Discard', style: TextStyle(fontSize: 12, color: AppColors.red)),
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
