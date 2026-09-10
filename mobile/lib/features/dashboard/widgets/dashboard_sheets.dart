import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/project_info.dart';
import '../../../core/sync/sync_service.dart';
import '../../../shared/theme/field_theme.dart';
import '../../../shared/widgets/field_components.dart';

class DashboardAccountSheet extends ConsumerWidget {
  const DashboardAccountSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        const Expanded(child: Text('Your account', style: FieldType.section)),
        IconButton(
            tooltip: 'Close account',
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close)),
      ]),
      const SizedBox(height: FieldSpace.md),
      Text(user?.name ?? 'Site user', style: FieldType.section),
      const SizedBox(height: FieldSpace.sm),
      SelectableText(user?.email ?? '', style: FieldType.supporting),
      const SizedBox(height: FieldSpace.sm),
      Text(user?.roleDisplay ?? 'Field user', style: FieldType.supporting),
      const SizedBox(height: FieldSpace.section),
      const Text(ProjectInfo.schemeWithCapacity, style: FieldType.label),
      const SizedBox(height: FieldSpace.sm),
      const Text(
          '${ProjectInfo.siteLocation}\nEmployer: ${ProjectInfo.clientName}',
          style: FieldType.supporting),
      const SizedBox(height: FieldSpace.section),
      const Divider(),
      FieldNavigationRow(
          title: 'Sync status',
          subtitle: 'Review pending and blocked changes',
          icon: Icons.sync,
          onTap: () =>
              showFieldSheet<void>(context, child: const DashboardSyncSheet())),
      const Divider(),
      const SizedBox(height: FieldSpace.md),
      TextButton.icon(
        style: TextButton.styleFrom(foregroundColor: FieldColors.danger),
        onPressed: () async {
          final confirm = await showDialog<bool>(
              context: context,
              builder: (dialogContext) => AlertDialog(
                    title: const Text('Sign out?'),
                    content: const Text(
                        'Are you sure you want to sign out of KIPL ProjectOS?'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(dialogContext, false),
                          child: const Text('Cancel')),
                      TextButton(
                          onPressed: () => Navigator.pop(dialogContext, true),
                          child: const Text('Sign out')),
                    ],
                  ));
          if (confirm == true && context.mounted) {
            final auth = ref.read(authStateProvider.notifier);
            Navigator.pop(context);
            await auth.logout();
          }
        },
        icon: const Icon(Icons.logout),
        label: const Text('Sign out'),
      ),
    ]);
  }
}

/// Watches live queue state so an open sheet updates when sync finishes.
class DashboardSyncSheet extends ConsumerStatefulWidget {
  const DashboardSyncSheet({super.key});
  @override
  ConsumerState<DashboardSyncSheet> createState() => _DashboardSyncSheetState();
}

class _DashboardSyncSheetState extends ConsumerState<DashboardSyncSheet> {
  final Set<String> _busy = {};

  Future<void> _run(String id, Future<void> Function() action) async {
    if (_busy.contains(id)) return;
    setState(() => _busy.add(id));
    try {
      await action();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content:
                Text('This action could not be completed. Please try again.')));
      }
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  String _label(OutboxEntry entry) {
    final words = entry.endpoint
        .split('/')
        .where((part) =>
            part.isNotEmpty && !RegExp(r'^[0-9a-fA-F-]{16,}$').hasMatch(part))
        .expand((part) => part.split('-'))
        .where((word) => word.isNotEmpty)
        .map((word) => '${word[0].toUpperCase()}${word.substring(1)}')
        .join(' ');
    return words.isEmpty ? 'Offline change' : words;
  }

  @override
  Widget build(BuildContext context) {
    final sync = ref.watch(syncServiceProvider);
    final notifier = ref.read(syncServiceProvider.notifier);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        const Expanded(child: Text('Sync status', style: FieldType.section)),
        IconButton(
            tooltip: 'Close sync status',
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close)),
      ]),
      const SizedBox(height: FieldSpace.md),
      Text(
          sync.isSyncing
              ? 'Syncing saved changes…'
              : sync.isOnline
                  ? 'Connection available'
                  : 'You’re offline',
          style: FieldType.label),
      const SizedBox(height: FieldSpace.sm),
      Text(
          '${sync.pendingCount} waiting to sync · ${sync.blockedCount} need review',
          style: FieldType.supporting),
      if (sync.lastError != null) ...[
        const SizedBox(height: FieldSpace.sm),
        Text(sync.lastError!,
            style: FieldType.supporting.copyWith(color: FieldColors.warning)),
      ],
      const SizedBox(height: FieldSpace.lg),
      FilledButton(
        onPressed: !sync.isOnline || sync.isSyncing || _busy.contains('flush')
            ? null
            : () => _run('flush', notifier.flushQueue),
        child: Text(sync.isSyncing || _busy.contains('flush')
            ? 'Syncing…'
            : 'Sync now'),
      ),
      if (sync.blockedCount > 0) ...[
        const SizedBox(height: FieldSpace.section),
        const Text('Changes needing review', style: FieldType.section),
        const SizedBox(height: FieldSpace.sm),
        const Text(
            'These will not retry automatically. Retry a change, or discard it only if the work was recorded another way.',
            style: FieldType.supporting),
        for (final entry in sync.blocked) ...[
          const SizedBox(height: FieldSpace.lg),
          const Divider(),
          const SizedBox(height: FieldSpace.lg),
          Text(_label(entry), style: FieldType.label),
          if (entry.failureReason != null)
            Text(entry.failureReason!, style: FieldType.supporting),
          Wrap(spacing: FieldSpace.sm, children: [
            TextButton(
              onPressed: _busy.contains(entry.id) ||
                      !sync.isOnline ||
                      sync.isSyncing
                  ? null
                  : () => _run(entry.id, () => notifier.retryEntry(entry.id)),
              child: Text(_busy.contains(entry.id) ? 'Please wait…' : 'Retry'),
            ),
            TextButton(
              style: TextButton.styleFrom(foregroundColor: FieldColors.danger),
              onPressed: _busy.contains(entry.id)
                  ? null
                  : () async {
                      final discard = await showDialog<bool>(
                          context: context,
                          builder: (dialogContext) => AlertDialog(
                                title: const Text('Discard this change?'),
                                content: Text(
                                    '${_label(entry)} will be removed from this device’s queue. This does not delete a server record.'),
                                actions: [
                                  TextButton(
                                      onPressed: () =>
                                          Navigator.pop(dialogContext, false),
                                      child: const Text('Keep change')),
                                  TextButton(
                                      onPressed: () =>
                                          Navigator.pop(dialogContext, true),
                                      child: const Text('Discard change')),
                                ],
                              ));
                      if (discard == true && mounted) {
                        await _run(
                            entry.id, () => notifier.discardEntry(entry.id));
                      }
                    },
              child: const Text('Discard'),
            ),
          ]),
        ],
      ],
    ]);
  }
}
