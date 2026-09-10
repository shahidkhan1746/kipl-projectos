import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/status_colors.dart';
import '../../../shared/theme/tokens.dart';
import '../../../shared/widgets/filter_bar.dart';
import '../../../shared/widgets/state_views.dart';
import '../../../shared/widgets/status_pill.dart';
import '../../../core/auth/auth_provider.dart';
import '../../team/team_provider.dart';
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
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isAdmin == true ||
        user?.isProjectManager == true ||
        user?.isEngineer == true;
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
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => _showCreateTaskSheet(context, notifier, ref),
              icon: const Icon(Icons.add_task),
              label: const Text('New Task'),
            )
          : null,
      body: Column(
        children: [
          if (canManage)
            Padding(
              padding: const EdgeInsets.fromLTRB(Space.gutter, Space.xs, Space.gutter, Space.xs),
              child: SizedBox(
                width: double.infinity,
                child: SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(
                      value: true,
                      label: Text('All Project Tasks'),
                      icon: Icon(Icons.list_alt, size: 16),
                    ),
                    ButtonSegment(
                      value: false,
                      label: Text('Assigned to Me'),
                      icon: Icon(Icons.person, size: 16),
                    ),
                  ],
                  selected: {state.showAllTasks},
                  onSelectionChanged: (set) => notifier.setShowAllTasks(set.first),
                  style: const ButtonStyle(visualDensity: VisualDensity.compact),
                ),
              ),
            ),
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
      return EmptyState(
        icon: Icons.task_alt,
        title: notifier.canManageTasks && state.showAllTasks
            ? 'No tasks on this site yet'
            : 'No tasks assigned to you',
        message: notifier.canManageTasks && state.showAllTasks
            ? 'Tap "New Task" to assign work to your field engineering team.'
            : 'Tasks appear here once your project manager assigns them against '
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
class _TaskDetailSheet extends ConsumerWidget {
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
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final due = _due(task.dueDate);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isAdmin == true ||
        user?.isProjectManager == true ||
        user?.isEngineer == true;

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
            if (canManage) ...[
              const SizedBox(height: Space.xs),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => _showAssignSheet(context, task, notifier, ref),
                  icon: const Icon(Icons.person_add_alt_1, size: 16),
                  label: Text(
                    task.assignedName != null && task.assignedName!.isNotEmpty
                        ? 'Reassign to team member'
                        : 'Assign to team member',
                  ),
                ),
              ),
            ],
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

void _showAssignSheet(
  BuildContext context,
  TaskItem task,
  TasksNotifier notifier,
  WidgetRef ref,
) {
  final teamState = ref.read(teamProvider);
  if (teamState.members.isEmpty) {
    ref.read(teamProvider.notifier).fetchTeam();
  }

  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) => Consumer(
      builder: (context, ref, _) {
        final team = ref.watch(teamProvider);
        final theme = Theme.of(context);
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.7,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(Space.xl, Space.lg, Space.xl, Space.sm),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Assign Task', style: theme.textTheme.titleMedium),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(sheetContext).pop(),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: Space.xl),
                  child: Text(
                    task.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                const Divider(),
                if (team.isLoading && team.members.isEmpty)
                  const Expanded(
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (team.members.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(Space.xl),
                    child: Text('No team members found for this project.'),
                  )
                else
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: Space.xs),
                      itemCount: team.members.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (ctx, i) {
                        final member = team.members[i];
                        final isAssigned = task.assignedName == member.name;
                        return ListTile(
                          leading: CircleAvatar(
                            child: Text(member.name.isNotEmpty ? member.name[0].toUpperCase() : '?'),
                          ),
                          title: Text(member.name),
                          subtitle: Text('${member.designation} • ${member.department}'),
                          trailing: isAssigned ? const Icon(Icons.check, color: Colors.green) : null,
                          onTap: () async {
                            final nav = Navigator.of(sheetContext);
                            final messenger = ScaffoldMessenger.of(context);
                            nav.pop();
                            final ok = await notifier.assignTask(
                              task.id,
                              assignedTo: member.id,
                              assignedName: member.name,
                            );
                            if (ok && context.mounted) {
                              messenger.showSnackBar(
                                SnackBar(content: Text('Assigned to ${member.name}')),
                              );
                            }
                          },
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    ),
  );
}

void _showCreateTaskSheet(
  BuildContext context,
  TasksNotifier notifier,
  WidgetRef ref,
) {
  final teamState = ref.read(teamProvider);
  if (teamState.members.isEmpty) {
    ref.read(teamProvider.notifier).fetchTeam();
  }

  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) => _CreateTaskModal(notifier: notifier),
  );
}

class _CreateTaskModal extends ConsumerStatefulWidget {
  const _CreateTaskModal({required this.notifier});
  final TasksNotifier notifier;

  @override
  ConsumerState<_CreateTaskModal> createState() => _CreateTaskModalState();
}

class _CreateTaskModalState extends ConsumerState<_CreateTaskModal> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _priority = 'medium';
  String? _assignedId;
  String? _assignedName;
  DateTime? _dueDate;
  bool _submitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final team = ref.watch(teamProvider);

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: Space.xl,
          right: Space.xl,
          top: Space.lg,
        ),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Assign New Task', style: theme.textTheme.titleMedium),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: Space.md),
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: 'Task Title *',
                    hintText: 'e.g. Inspect formwork before RCC pour',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Title is required' : null,
                ),
                const SizedBox(height: Space.md),
                TextFormField(
                  controller: _descController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Description (optional)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: Space.md),
                DropdownButtonFormField<String>(
                  value: _priority,
                  decoration: const InputDecoration(
                    labelText: 'Priority',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'critical', child: Text('Critical')),
                    DropdownMenuItem(value: 'high', child: Text('High')),
                    DropdownMenuItem(value: 'medium', child: Text('Medium')),
                    DropdownMenuItem(value: 'low', child: Text('Low')),
                  ],
                  onChanged: (v) {
                    if (v != null) setState(() => _priority = v);
                  },
                ),
                const SizedBox(height: Space.md),
                DropdownButtonFormField<String>(
                  value: _assignedId,
                  decoration: const InputDecoration(
                    labelText: 'Assign To',
                    border: OutlineInputBorder(),
                  ),
                  hint: const Text('Select team member'),
                  items: team.members.map((m) {
                    return DropdownMenuItem(
                      value: m.id,
                      child: Text('${m.name} (${m.designation})'),
                    );
                  }).toList(),
                  onChanged: (v) {
                    setState(() {
                      _assignedId = v;
                      final member = team.members.where((m) => m.id == v).firstOrNull;
                      _assignedName = member?.name;
                    });
                  },
                ),
                const SizedBox(height: Space.md),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _dueDate == null
                            ? 'No due date set'
                            : 'Due: ${DateFormatters.shortDate.format(_dueDate!)}',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    TextButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 16),
                      label: Text(_dueDate == null ? 'Set Date' : 'Change Date'),
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now().add(const Duration(days: 1)),
                          firstDate: DateTime.now().subtract(const Duration(days: 30)),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) setState(() => _dueDate = picked);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: Space.lg),
                FilledButton(
                  onPressed: _submitting
                      ? null
                      : () async {
                          if (!_formKey.currentState!.validate()) return;
                          setState(() => _submitting = true);
                          final nav = Navigator.of(context);
                          final messenger = ScaffoldMessenger.of(context);
                          final ok = await widget.notifier.createTask(
                            title: _titleController.text.trim(),
                            description: _descController.text.trim(),
                            priority: _priority,
                            assignedTo: _assignedId,
                            assignedName: _assignedName,
                            dueDate: _dueDate?.toIso8601String().split('T')[0],
                          );
                          if (!mounted) return;
                          setState(() => _submitting = false);
                          if (ok) {
                            nav.pop();
                            messenger.showSnackBar(
                              SnackBar(content: Text('Task created & assigned: ${_titleController.text.trim()}')),
                            );
                          }
                        },
                  child: _submitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Create & Assign Task'),
                ),
                const SizedBox(height: Space.xl),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
