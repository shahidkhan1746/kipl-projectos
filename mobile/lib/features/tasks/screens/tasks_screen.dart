import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/date_formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/status_pill.dart';
import '../tasks_provider.dart';

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
            onPressed: state.isLoading ? null : () => notifier.fetchTasks(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          _buildFilterBar(state, notifier),

          if (state.error != null)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.redBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.red.withOpacity(0.4)),
              ),
              child: Text(state.error!, style: const TextStyle(color: AppColors.textBase, fontSize: 13)),
            ),

          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                : tasks.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.task_alt, size: 48, color: AppColors.textFaint),
                            const SizedBox(height: 12),
                            Text(
                              'No tasks found for ${state.filter.replaceAll('_', ' ')}',
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => notifier.fetchTasks(),
                        color: AppColors.accent,
                        backgroundColor: AppColors.bgCard,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: tasks.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (ctx, i) => _buildTaskCard(context, tasks[i], notifier),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(TasksState state, TasksNotifier notifier) {
    final filters = [
      {'val': 'all', 'label': 'All'},
      {'val': 'todo', 'label': 'To Do'},
      {'val': 'in_progress', 'label': 'In Progress'},
      {'val': 'blocked', 'label': 'Blocked'},
      {'val': 'done', 'label': 'Done'},
    ];

    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      color: AppColors.bgCard,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final f = filters[i];
          final isSel = state.filter == f['val'];
          return Center(
            child: InkWell(
              onTap: () => notifier.setFilter(f['val']!),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: isSel ? AppColors.accent : AppColors.bgSubtle,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  f['label']!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSel ? FontWeight.w600 : FontWeight.normal,
                    color: isSel ? Colors.white : AppColors.textMuted,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTaskCard(BuildContext context, TaskItem task, TasksNotifier notifier) {
    StatusPillType pType;
    switch (task.priority) {
      case 'critical':
        pType = StatusPillType.error;
        break;
      case 'high':
        pType = StatusPillType.warning;
        break;
      case 'medium':
        pType = StatusPillType.info;
        break;
      default:
        pType = StatusPillType.neutral;
    }

    StatusPillType sType;
    switch (task.status) {
      case 'done':
        sType = StatusPillType.success;
        break;
      case 'blocked':
        sType = StatusPillType.error;
        break;
      case 'in_progress':
        sType = StatusPillType.info;
        break;
      default:
        sType = StatusPillType.neutral;
    }

    final formattedDue = task.dueDate != null
        ? DateFormatters.formatIndian(DateTime.tryParse(task.dueDate!))
        : null;

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
              if (task.wbsCode != null && task.wbsCode!.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.bgSubtle,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    task.wbsCode!,
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                  ),
                )
              else
                const SizedBox.shrink(),
              Row(
                children: [
                  StatusPill(label: task.priority.toUpperCase(), type: pType),
                  const SizedBox(width: 6),
                  StatusPill(label: task.status.replaceAll('_', ' ').toUpperCase(), type: sType),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            task.title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textBase,
            ),
          ),
          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              task.description!,
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.person_outline, size: 14, color: AppColors.textFaint),
                  const SizedBox(width: 4),
                  Text(
                    task.assignedName ?? 'Unassigned',
                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ],
              ),
              if (formattedDue != null)
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 12, color: AppColors.textFaint),
                    const SizedBox(width: 4),
                    Text(
                      'Due: $formattedDue',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: AppColors.borderDim),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (task.status != 'in_progress' && task.status != 'done')
                TextButton(
                  onPressed: () => notifier.updateTaskStatus(task.id, 'in_progress'),
                  child: const Text('Start Work', style: TextStyle(fontSize: 12, color: AppColors.accent)),
                ),
              if (task.status != 'blocked' && task.status != 'done')
                TextButton(
                  onPressed: () => notifier.updateTaskStatus(task.id, 'blocked'),
                  child: const Text('Mark Blocked', style: TextStyle(fontSize: 12, color: AppColors.red)),
                ),
              if (task.status != 'done')
                TextButton(
                  onPressed: () => notifier.updateTaskStatus(task.id, 'done'),
                  child: const Text('✓ Complete', style: TextStyle(fontSize: 12, color: AppColors.green)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
