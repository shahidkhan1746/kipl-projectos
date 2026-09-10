import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_provider.dart';
import '../../../core/project_info.dart';
import '../../../core/sync/sync_service.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';

/// Everything the four tabs do not reach.
///
/// Seven screens — Site Orders, Materials, Plant & Fleet, QA, Team, Site
/// Updates and Approvals — were reachable only by tapping a tile on the
/// dashboard. Each is a real destination with its own state, and each was
/// effectively a modal launched from one specific place: no tab, no identity
/// in the back stack, and no way to reach it except by first going home.
///
/// They keep their existing top-level paths, so `context.push('/qa')` from the
/// dashboard, from Approvals or from a notification still lands where it did.
/// This screen simply gives them a permanent front door.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final sync = ref.watch(syncServiceProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: Space.huge),
        children: [
          const _GroupHeader('Site records'),
          const _Destination(
            icon: Icons.gavel_outlined,
            title: 'Site orders',
            subtitle: 'EIC instructions and compliance',
            route: '/site-orders',
          ),
          const _Destination(
            icon: Icons.inventory_2_outlined,
            title: 'Material register',
            subtitle: 'Gate receipt against consumption',
            route: '/materials',
          ),
          const _Destination(
            icon: Icons.agriculture_outlined,
            title: 'Plant & fleet',
            subtitle: 'Hours, distance and diesel',
            route: '/fleet',
          ),

          const _GroupHeader('Quality'),
          const _Destination(
            icon: Icons.fact_check_outlined,
            title: 'QA & safety',
            subtitle: 'Inspections and non-conformance',
            route: '/qa',
          ),

          const _GroupHeader('Project'),
          const _Destination(
            icon: Icons.newspaper_outlined,
            title: 'Site updates',
            subtitle: 'Milestones and the photo feed',
            route: '/site-updates',
          ),
          const _Destination(
            icon: Icons.contacts_outlined,
            title: 'Team directory',
            subtitle: 'Call or message anyone on site',
            route: '/team',
          ),

          // The route guard in the router already redirects a non-manager away
          // from /approvals; hiding it here means they never meet that bounce.
          if (user?.isProjectManager == true) ...[
            const _GroupHeader('Management'),
            const _Destination(
              icon: Icons.verified_user_outlined,
              title: 'Approvals',
              subtitle: 'Sign off submitted diaries',
              route: '/approvals',
            ),
          ],

          const _GroupHeader('You'),
          const _Destination(
            icon: Icons.event_available_outlined,
            title: 'Leave',
            subtitle: 'Apply, and see where an application stands',
            route: '/leave',
          ),

          const _GroupHeader('This device'),
          _SyncTile(sync: sync),

          const Divider(),
          ListTile(
            leading: CircleAvatar(
              radius: 20,
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Text(
                _initials(user?.name),
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.onPrimaryContainer,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            title: Text(user?.name ?? 'Signed in'),
            subtitle: Text(
              [
                if (user?.designation?.isNotEmpty == true) user!.designation!,
                if (user?.employeeId?.isNotEmpty == true) user!.employeeId!,
              ].join(' · '),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Space.gutter,
              Space.sm,
              Space.gutter,
              Space.lg,
            ),
            child: OutlinedButton.icon(
              icon: const Icon(Icons.logout, size: Sizes.icon),
              label: const Text('Sign out'),
              style: OutlinedButton.styleFrom(
                foregroundColor: context.status.danger,
                minimumSize: const Size(double.infinity, Sizes.control),
              ),
              onPressed: () => _confirmSignOut(context, ref, sync),
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            child: Text(
              '${ProjectInfo.schemeWithCapacity}\n'
              '${ProjectInfo.clientName} · ${ProjectInfo.siteLocation}',
              style: theme.textTheme.labelSmall,
            ),
          ),
        ],
      ),
    );
  }

  static String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return 'KP';
    return name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .map((p) => p[0])
        .take(2)
        .join()
        .toUpperCase();
  }

  Future<void> _confirmSignOut(
    BuildContext context,
    WidgetRef ref,
    SyncState sync,
  ) async {
    final pending = sync.pendingCount;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign out?'),
        // The queue lives against the signed-in session, so signing out with
        // unsent work in it loses that work. Saying how much is the difference
        // between an informed decision and a surprise on Monday.
        content: Text(
          pending == 0
              ? 'You will need to sign in again to record anything on site.'
              : pending == 1
                  ? 'One record has not reached the server yet and will be '
                      'lost. Reconnect and let it sync before signing out.'
                  : '$pending records have not reached the server yet and '
                      'will be lost. Reconnect and let them sync before '
                      'signing out.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    await ref.read(authStateProvider.notifier).logout();
  }
}

/// Whether this phone is holding anything it has not managed to send.
class _SyncTile extends ConsumerWidget {
  const _SyncTile({required this.sync});

  final SyncState sync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final status = context.status;
    final pending = sync.pendingCount;

    final (Color tone, IconData icon, String title, String subtitle) =
        switch ((sync.isSyncing, sync.isOnline, pending)) {
      (true, _, _) => (
          theme.colorScheme.primary,
          Icons.sync,
          'Syncing',
          'Sending what this phone has been holding',
        ),
      (_, false, final p) when p > 0 => (
          status.danger,
          Icons.cloud_off_outlined,
          'Offline · $p waiting',
          'Nothing is lost — it sends when you reconnect',
        ),
      (_, false, _) => (
          status.warning,
          Icons.cloud_off_outlined,
          'Offline',
          'Records are kept on this phone until you reconnect',
        ),
      (_, true, final p) when p > 0 => (
          status.warning,
          Icons.cloud_upload_outlined,
          '$p waiting to send',
          'Tap to send them now',
        ),
      _ => (
          status.success,
          Icons.cloud_done_outlined,
          'Everything synced',
          'Nothing is waiting on this phone',
        ),
    };

    return ListTile(
      leading: Icon(icon, color: tone, size: Sizes.iconAction),
      title:
          Text(title, style: theme.textTheme.titleSmall?.copyWith(color: tone)),
      subtitle: Text(subtitle),
      trailing: pending > 0 && !sync.isSyncing
          ? const Icon(Icons.chevron_right)
          : null,
      onTap: pending > 0 && !sync.isSyncing
          ? () => ref.read(syncServiceProvider.notifier).flushQueue()
          : null,
    );
  }
}

class _GroupHeader extends StatelessWidget {
  const _GroupHeader(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Space.gutter,
        Space.xl,
        Space.gutter,
        Space.sm,
      ),
      child: Text(label, style: Theme.of(context).textTheme.titleSmall),
    );
  }
}

class _Destination extends StatelessWidget {
  const _Destination({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.route,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String route;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: Sizes.iconAction),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: Icon(
        Icons.chevron_right,
        color: Theme.of(context).colorScheme.outline,
      ),
      // push, not go: these keep their own back stack, so the phone's back
      // gesture returns here rather than to the dashboard.
      onTap: () => context.push(route),
    );
  }
}
