import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/filter_bar.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/status_pill.dart';
import '../tasks_provider.dart';

/// Field tasks, as a list you triage rather than a stack of posters.
///
/// The previous version gave every task a bordered card carrying a WBS chip,
/// two saturated status pills, a title, a description, two metadata rows, a
/// divider and three action buttons — about seven visual elements and five
/// hues per row, of which roughly two and a half fitted a 390×844 screen. A
/// foreman with thirty tasks scrolled twelve screens to see them.
///
/// The information is the same. The hierarchy is not:
///
///   the goal      find the next job, and record that it moved
///   primary       the task title
///   secondary     status, who owns it, when it is due
///   primary act   the ONE status change this task can next make
///   secondary     everything else, behind a tap on the row
///   removed       the second status pill, the per-card divider, the
///                 description (it lives in the detail sheet), and the
///                 priority badge on anything below "high" — "MEDIUM" on
///                 two-thirds of rows is not information, it is wallpaper
class TasksScreen extends ConsumerWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(tasksProvider);
    final notifier = ref.read(tasksProvider.notifier);
    final tasks = state.filteredTasks;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Tasks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload tasks',
            onPressed: state.isLoading ? null : notifier.fetchTasks,
          ),
        ],
      ),
      body: Column(
        children: [
          FilterBar<String>(
            options: _filterOptions(state),
            selected: state.filter,
            onSelected: notifier.setFilter,
          ),
          const Divider(),

          // An error with rows already on screen is a banner, not a takeover:
          // replacing a list the worker can still act on with an apology costs
          // them the only copy of the data they have when the site has no
          // signal.
          if (state.error != null && tasks.isNotEmpty)
            InlineErrorBanner(
              message: state.error!,
              onRetry: notifier.fetchTasks,
            ),

          Expanded(child: _body(context, state, tasks, notifier)),
        ],
      ),
    );
  }

  List<FilterOption<String>> _filterOptions(TasksState state) {
    int countOf(String status) =>
        state.tasks.where((t) => t.status == status).length;

    // The count is why the filter is worth a tap. "Blocked 3" answers the
    // question the tap was going to ask.
    return [
      FilterOption(value: 'all', label: 'All', count: state.tasks.length),
      FilterOption(value: 'todo', label: 'To do', count: countOf('todo')),
      FilterOption(
          value: 'in_progress',
          label: 'In progress',
          count: countOf('in_progress')),
      FilterOption(
          value: 'blocked', label: 'Blocked', count: countOf('blocked')),
      FilterOption(value: 'done', label: 'Done', count: countOf('done')),
    ];
  }

  Widget _body(
    BuildContext context,
    TasksState state,
    List<TaskItem> tasks,
    TasksNotifier notifier,
  ) {
    if (state.isLoading && state.tasks.isEmpty) {
      return const LoadingState(message: 'Loading your tasks…');
    }

    if (state.error != null && tasks.isEmpty) {
      return ErrorState(
        message: state.error!,
        onRetry: notifier.fetchTasks,
      );
    }

    if (tasks.isEmpty) {
      return RefreshIndicator(
        onRefresh: notifier.fetchTasks,
        // Always scrollable, or pull-to-refresh cannot be started from an
        // empty state — the one place a person most wants to retry.
        //
        // The height comes from the parent's constraints, not from
        // MediaQuery: this widget sits under an AppBar, a filter bar and
        // sometimes an error banner, so the screen height is the wrong
        // number, and a MediaQuery that has been replaced rather than
        // extended reports zero and renders nothing at all.
        child: LayoutBuilder(
          builder: (context, constraints) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: _emptyFor(state, notifier),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: notifier.fetchTasks,
      child: ListView.separated(
        padding: const EdgeInsets.only(bottom: Space.huge),
        itemCount: tasks.length,
        separatorBuilder: (_, __) =>
            const Divider(indent: Space.gutter, endIndent: Space.gutter),
        itemBuilder: (context, i) => _TaskRow(
          task: tasks[i],
          notifier: notifier,
        ),
      ),
    );
  }

  Widget _emptyFor(TasksState state, TasksNotifier notifier) {
    // An empty state has to say what is missing, why, and what to do next.
    // "No tasks found" managed only the first.
    if (state.filter == 'all') {
      return const EmptyState(
        icon: Icons.task_alt,
        title: 'No tasks assigned to you',
        message:
            'Tasks appear here once your project manager assigns them against '
            'a WBS activity. Pull down to check again.',
      );
    }

    const names = {
      'todo': 'to do',
      'in_progress': 'in progress',
      'blocked': 'blocked',
      'done': 'done',
    };
    final name = names[state.filter] ?? state.filter;

    return EmptyState(
      icon: Icons.filter_alt_off_outlined,
      title: 'Nothing $name right now',
      message: 'You have ${state.tasks.length} '
          '${state.tasks.length == 1 ? 'task' : 'tasks'} in total.',
      actionLabel: 'Show all tasks',
      onAction: () => notifier.setFilter('all'),
    );
  }
}

/// The next status this task can move to, and what to call that move.
///
/// One action, not three. A task that is already in progress cannot be
/// started, and offering "Start Work", "Mark Blocked" and "Complete" on every
/// row at once made the common case — advancing the task — no easier to find
/// than the rare one.
({String status, String label, IconData icon})? _primaryMove(String status) =>
    switch (status) {
      'todo' => (status: 'in_progress', label: 'Start', icon: Icons.play_arrow),
      'in_progress' => (status: 'done', label: 'Complete', icon: Icons.check),
      'blocked' => (
          status: 'in_progress',
          label: 'Resume',
          icon: Icons.play_arrow
        ),
      _ => null,
    };

StatusPillType _statusTone(String status) => switch (status) {
      'done' => StatusPillType.success,
      'blocked' => StatusPillType.error,
      'in_progress' => StatusPillType.info,
      _ => StatusPillType.neutral,
    };

String _statusLabel(String status) => switch (status) {
      'todo' => 'To do',
      'in_progress' => 'In progress',
      'blocked' => 'Blocked',
      'done' => 'Done',
      _ => status.replaceAll('_', ' '),
    };

/// Due, in the fewest words that still carry urgency.
({String text, bool overdue})? _due(String? raw) {
  final date = DateTime.tryParse(raw ?? '');
  if (date == null) return null;

  final today = DateTime.now();
  final dueDay = DateTime(date.year, date.month, date.day);
  final startOfToday = DateTime(today.year, today.month, today.day);
  final days = dueDay.difference(startOfToday).inDays;

  if (days < 0) {
    return (
      text: days == -1 ? 'Overdue by 1 day' : 'Overdue by ${-days} days',
      overdue: true
    );
  }
  if (days == 0) return (text: 'Due today', overdue: false);
  if (days == 1) return (text: 'Due tomorrow', overdue: false);
  return (text: 'Due ${DateFormatters.shortDate.format(date)}', overdue: false);
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.task, required this.notifier});

  final TaskItem task;
  final TasksNotifier notifier;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = context.status;
    final move = _primaryMove(task.status);
    // A finished task cannot be late. Showing "Overdue by 1 day" in red next
    // to a struck-through, completed row is just wrong, and it puts the
    // loudest colour on the screen against the one row nobody needs to act on.
    final due = task.isDone ? null : _due(task.dueDate);
    final isUrgent = task.priority == 'critical' || task.priority == 'high';

    return Semantics(
      button: true,
      label: '${task.title}. ${_statusLabel(task.status)}.'
          '${due == null ? '' : ' ${due.text}.'}'
          '${isUrgent ? ' ${task.priority} priority.' : ''}',
      child: InkWell(
        onTap: () => _showDetail(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: Space.gutter,
            vertical: Space.md,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        // Done is history, not work. Dimming it keeps the
                        // live rows first to the eye without hiding anything.
                        color: task.isDone
                            ? theme.colorScheme.onSurfaceVariant
                            : theme.colorScheme.onSurface,
                        decoration:
                            task.isDone ? TextDecoration.lineThrough : null,
                        decorationColor: theme.colorScheme.outline,
                      ),
                    ),
                    const SizedBox(height: Space.sm),

                    // Status, urgency and timing on one wrapping line. Wrap,
                    // not Row, so nothing is clipped when the system font
                    // size goes up — it takes a second line instead.
                    Wrap(
                      spacing: Space.sm,
                      runSpacing: Space.xs,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        StatusPill(
                          label: _statusLabel(task.status),
                          type: _statusTone(task.status),
                          emphasis: StatusEmphasis.subtle,
                        ),
                        // Only critical and high earn a badge. "MEDIUM" on
                        // two-thirds of the list tells nobody anything.
                        if (isUrgent)
                          StatusPill(
                            label: task.priority.toUpperCase(),
                            type: task.priority == 'critical'
                                ? StatusPillType.error
                                : StatusPillType.warning,
                          ),
                        if (task.assignedName != null &&
                            task.assignedName!.isNotEmpty)
                          Text(
                            task.assignedName!,
                            style: theme.textTheme.labelMedium,
                          ),
                        if (due != null)
                          Text(
                            due.text,
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: due.overdue ? status.danger : null,
                              fontWeight: due.overdue ? FontWeight.w600 : null,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              if (move != null) ...[
                const SizedBox(width: Space.md),
                // Neutral ground, primary ink. Not filled, because thirty
                // filled buttons down a list is a wall of colour in which
                // none of them looks like the important one; and explicitly
                // NOT FilledButton.tonal, whose secondaryContainer is teal
                // here — a green button on a task row reads as "done" and
                // means "start".
                FilledButton.icon(
                  onPressed: () => _move(context, move.status, move.label),
                  icon: Icon(move.icon, size: Sizes.iconInline),
                  label: Text(move.label),
                  style: FilledButton.styleFrom(
                    backgroundColor: theme.colorScheme.surfaceContainerHigh,
                    foregroundColor: theme.colorScheme.primary,
                    minimumSize: const Size(0, 40),
                    padding: const EdgeInsets.symmetric(horizontal: Space.md),
                    textStyle: theme.textTheme.labelMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _move(
    BuildContext context,
    String newStatus,
    String label,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = await notifier.updateTaskStatus(task.id, newStatus);
    if (!context.mounted) return;

    // Only confirm the happy path here. A failure has already been written
    // into state.error, which the banner renders and keeps on screen —
    // a SnackBar for it would vanish after four seconds.
    if (ok) {
      messenger.showSnackBar(
        SnackBar(content: Text('$label — ${task.title}')),
      );
    }
  }

  void _showDetail(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => _TaskDetailSheet(
        task: task,
        notifier: notifier,
      ),
    );
  }
}

/// Everything the row does not show, plus every action it does not offer.
///
/// This is where the description, the WBS code and the non-obvious status
/// moves live. Putting them one tap away costs a foreman nothing on the common
/// path and gives the list back about 60% of its vertical space.
class _TaskDetailSheet extends StatelessWidget {
  const _TaskDetailSheet({required this.task, required this.notifier});

  final TaskItem task;
  final TasksNotifier notifier;

  static const _allMoves = [
    (status: 'todo', label: 'Move to To do', icon: Icons.undo),
    (status: 'in_progress', label: 'Mark in progress', icon: Icons.play_arrow),
    (status: 'blocked', label: 'Mark blocked', icon: Icons.block),
    (status: 'done', label: 'Mark complete', icon: Icons.check_circle_outline),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final due = _due(task.dueDate);

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          Space.xl,
          0,
          Space.xl,
          Space.xl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(task.title, style: theme.textTheme.titleMedium),
            const SizedBox(height: Space.md),

            Wrap(
              spacing: Space.sm,
              runSpacing: Space.sm,
              children: [
                StatusPill(
                  label: _statusLabel(task.status),
                  type: _statusTone(task.status),
                ),
                StatusPill(
                  label: '${task.priority.toUpperCase()} PRIORITY',
                  type: switch (task.priority) {
                    'critical' => StatusPillType.error,
                    'high' => StatusPillType.warning,
                    'medium' => StatusPillType.info,
                    _ => StatusPillType.neutral,
                  },
                ),
              ],
            ),

            if (task.description != null && task.description!.isNotEmpty) ...[
              const SizedBox(height: Space.lg),
              Text(task.description!, style: theme.textTheme.bodyMedium),
            ],

            const SizedBox(height: Space.lg),
            _Fact(label: 'Assigned to', value: task.assignedName),
            _Fact(label: 'Due', value: due?.text),
            _Fact(label: 'WBS activity', value: task.wbsCode),
            if (task.progressPct > 0)
              _Fact(
                label: 'Progress',
                value: '${task.progressPct.toStringAsFixed(0)}%',
              ),

            const SizedBox(height: Space.lg),
            const Divider(),
            const SizedBox(height: Space.md),

            Text('Change status', style: theme.textTheme.labelMedium),
            const SizedBox(height: Space.sm),

            // The current status is offered as a disabled entry rather than
            // hidden, so the list of moves does not reshuffle under the
            // finger as the task advances.
            for (final move in _allMoves)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(move.icon, size: Sizes.icon),
                title: Text(move.label),
                enabled: move.status != task.status,
                onTap: move.status == task.status
                    ? null
                    : () async {
                        final navigator = Navigator.of(context);
                        final messenger = ScaffoldMessenger.of(context);
                        final ok = await notifier.updateTaskStatus(
                            task.id, move.status);
                        if (!context.mounted) return;
                        navigator.pop();
                        if (ok) {
                          messenger.showSnackBar(
                            SnackBar(
                                content: Text('${move.label} — ${task.title}')),
                          );
                        }
                      },
                trailing: move.status == task.status
                    ? Text('Current', style: theme.textTheme.labelSmall)
                    : null,
              ),
          ],
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: Space.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 108,
            child: Text(label, style: theme.textTheme.labelMedium),
          ),
          Expanded(
            child: Text(
              // An em dash, never a plausible substitute. This is read by
              // people making calls on a live ₹280 Cr contract.
              value == null || value!.isEmpty ? '—' : value!,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }
}
