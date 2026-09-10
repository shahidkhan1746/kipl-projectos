import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/state_views.dart';
import '../approvals_provider.dart';

/// The project manager's queue: diaries waiting to be signed off, and the
/// three registers worth auditing.
///
/// The page opened with two KPI tiles, then a section header, then the queue,
/// then three "audit hub" rows in cyan, amber and pink — three accent colours
/// that mean nothing, on a screen whose only job is to get the queue to zero.
///
///   the goal      approve what is waiting, and see what else needs a look
///   primary       the diaries in the queue
///   secondary     open NCRs and pending site orders, as counts
///   primary act   approve — one button per row
///   removed       the KPI tiles duplicating the audit rows' counts, and the
///                 three unrelated accent colours
class ApprovalsScreen extends ConsumerWidget {
  const ApprovalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(approvalsProvider);
    final notifier = ref.read(approvalsProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Approvals'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload the queue',
            onPressed: state.isLoading ? null : notifier.fetchPendingApprovals,
          ),
        ],
      ),
      body: state.isLoading && state.pendingDiaries.isEmpty
          ? const LoadingState(message: 'Loading the approval queue…')
          : RefreshIndicator(
              onRefresh: notifier.fetchPendingApprovals,
              child: CustomScrollView(
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                      Space.gutter,
                      Space.lg,
                      Space.gutter,
                      0,
                    ),
                    sliver: SliverList.list(
                      children: [
                        if (state.message != null) ...[
                          _Note(
                            icon: Icons.check_circle_outline,
                            tone: context.status.success,
                            text: state.message!,
                          ),
                          const SizedBox(height: Space.lg),
                        ],
                        if (state.error != null) ...[
                          _Note(
                            icon: Icons.error_outline,
                            tone: context.status.danger,
                            text: state.error!,
                          ),
                          const SizedBox(height: Space.lg),
                        ],
                        _SectionTitle(
                          'Diaries awaiting sign-off',
                          trailing: state.pendingDiaries.isEmpty
                              ? null
                              : '${state.pendingDiaries.length}',
                        ),
                        const SizedBox(height: Space.sm),
                        if (state.pendingDiaries.isEmpty) const _QueueClear(),
                      ],
                    ),
                  ),

                  // The only part of this page that grows without bound. Built
                  // lazily so a long queue does not construct every row before
                  // the first is on screen.
                  SliverPadding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: Space.gutter),
                    sliver: SliverList.builder(
                      itemCount: state.pendingDiaries.length,
                      itemBuilder: (context, i) => _PendingDiaryCard(
                        diary: state.pendingDiaries[i],
                        isSubmitting: state.isSubmitting,
                        onApprove: () =>
                            notifier.approveDiary(state.pendingDiaries[i].id),
                      ),
                    ),
                  ),

                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                      Space.gutter,
                      Space.xxl,
                      Space.gutter,
                      Space.huge,
                    ),
                    sliver: SliverList.list(
                      children: [
                        const _SectionTitle('Registers'),
                        const SizedBox(height: Space.sm),
                        _AuditRow(
                          title: 'Quality and safety',
                          subtitle: 'Open non-conformance reports',
                          icon: Icons.fact_check_outlined,
                          count: state.openNcrsCount,
                          onTap: () => context.push('/qa'),
                        ),
                        _AuditRow(
                          title: 'Site order book',
                          subtitle: 'EIC instructions awaiting compliance',
                          icon: Icons.gavel_outlined,
                          count: state.pendingOrdersCount,
                          onTap: () => context.push('/site-orders'),
                        ),
                        const _AuditRow(
                          title: 'Material register',
                          subtitle: 'Receipt against consumption',
                          icon: Icons.inventory_2_outlined,
                          count: 0,
                          route: '/materials',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _QueueClear extends StatelessWidget {
  const _QueueClear();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    return Container(
      padding: const EdgeInsets.all(Space.xl),
      decoration: BoxDecoration(
        color: status.successContainer,
        borderRadius: Radii.cardAll,
        border: Border.all(color: status.success.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline,
              size: Sizes.icon, color: status.onSuccessContainer),
          const SizedBox(width: Space.md),
          Expanded(
            child: Text(
              'Every submitted diary has been signed off.',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: status.onSuccessContainer),
            ),
          ),
        ],
      ),
    );
  }
}

/// One diary in the queue.
///
/// A card here rather than a row, because approving is a decision and the
/// facts behind it — weather, manpower, what was executed — have to be on
/// screen at the moment the button is pressed.
class _PendingDiaryCard extends StatelessWidget {
  const _PendingDiaryCard({
    required this.diary,
    required this.isSubmitting,
    required this.onApprove,
  });

  final PendingDiaryItem diary;
  final bool isSubmitting;
  final VoidCallback onApprove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    final date = DateFormatters.formatIndian(DateTime.tryParse(diary.date));
    final hoursLost = diary.hoursLostWeather ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: Space.md),
      padding: const EdgeInsets.all(Space.lg),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: Radii.cardAll,
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(date, style: theme.textTheme.titleSmall),
          const SizedBox(height: Space.sm),
          Wrap(
            spacing: Space.md,
            runSpacing: Space.xs,
            children: [
              Text(
                diary.submittedBy ?? 'Site engineer',
                style: theme.textTheme.labelMedium,
              ),
              Text(
                '${diary.totalManpower} on site',
                style: theme.textTheme.labelMedium,
              ),
              if (diary.weatherCondition?.isNotEmpty == true)
                Text(diary.weatherCondition!,
                    style: theme.textTheme.labelMedium),
              if (hoursLost > 0)
                Text(
                  '${hoursLost.toStringAsFixed(1)} h lost',
                  style: theme.textTheme.labelMedium
                      ?.copyWith(color: status.warning),
                ),
            ],
          ),
          if (diary.workExecuted?.isNotEmpty == true) ...[
            const SizedBox(height: Space.md),
            Text(diary.workExecuted!, style: theme.textTheme.bodySmall),
          ],
          const SizedBox(height: Space.lg),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: isSubmitting ? null : () => _confirm(context, date),
              icon: const Icon(Icons.check, size: Sizes.icon),
              label: const Text('Approve'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirm(BuildContext context, String date) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Approve this diary?'),
        content: Text(
          'The site diary for $date will be signed off, and your user ID '
          'recorded as the approver.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Approve'),
          ),
        ],
      ),
    );
    if (confirmed == true) onApprove();
  }
}

/// A register worth auditing, with how much is outstanding in it.
class _AuditRow extends StatelessWidget {
  const _AuditRow({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.count,
    this.onTap,
    this.route,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final int count;
  final VoidCallback? onTap;

  /// An alternative to [onTap] so a row with no closure can stay const.
  final String? route;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;

    return ListTile(
      contentPadding: EdgeInsets.zero,
      // One icon colour, not three unrelated accents. Colour on this screen
      // means "outstanding", and it appears only on the count.
      leading: Icon(icon, size: Sizes.iconAction),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: count == 0
          ? Icon(Icons.chevron_right, color: theme.colorScheme.outline)
          : Container(
              padding: const EdgeInsets.symmetric(
                horizontal: Space.sm,
                vertical: Space.xs,
              ),
              decoration: BoxDecoration(
                color: status.warningContainer,
                borderRadius: Radii.fullAll,
              ),
              child: Text(
                '$count',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: status.onWarningContainer,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
      onTap: onTap ?? (route == null ? null : () => context.push(route!)),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {this.trailing});

  final String title;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(child: Text(title, style: theme.textTheme.titleSmall)),
        if (trailing != null)
          Text(trailing!, style: theme.textTheme.labelMedium),
      ],
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.tone, required this.text});

  final IconData icon;
  final Color tone;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        borderRadius: Radii.controlAll,
        border: Border.all(color: tone.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: Sizes.iconInline, color: tone),
          const SizedBox(width: Space.sm),
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }
}
