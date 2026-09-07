import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';
import '../../core/utils/json_parsers.dart';

class TaskItem {
  final String id;
  final String title;
  final String? description;
  final String priority;
  final String status;
  final String? assignedName;
  final String? dueDate;
  final String? wbsCode;
  final double progressPct;

  const TaskItem({
    required this.id,
    required this.title,
    this.description,
    required this.priority,
    required this.status,
    this.assignedName,
    this.dueDate,
    this.wbsCode,
    this.progressPct = 0,
  });

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    return TaskItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      priority: (json['priority'] as String? ?? 'medium').toLowerCase(),
      status: (json['status'] as String? ?? 'todo').toLowerCase(),
      assignedName: json['assignedName'] as String?,
      dueDate: json['dueDate'] as String?,
      wbsCode: json['wbsCode'] as String?,
      progressPct: jsonDouble(json['progressPct']) ?? 0,
    );
  }

  bool get isDone => status == 'done';
  bool get isBlocked => status == 'blocked';
  bool get isInProgress => status == 'in_progress';
}

class TasksState {
  final bool isLoading;
  final List<TaskItem> tasks;
  final String filter;
  final String? error;

  const TasksState({
    this.isLoading = false,
    this.tasks = const [],
    this.filter = 'all',
    this.error,
  });

  List<TaskItem> get filteredTasks {
    if (filter == 'all') return tasks;
    return tasks.where((t) => t.status == filter).toList();
  }

  TasksState copyWith({
    bool? isLoading,
    List<TaskItem>? tasks,
    String? filter,
    String? error,
  }) {
    return TasksState(
      isLoading: isLoading ?? this.isLoading,
      tasks: tasks ?? this.tasks,
      filter: filter ?? this.filter,
      error: error,
    );
  }
}

final tasksProvider = StateNotifierProvider<TasksNotifier, TasksState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  final syncService = ref.watch(syncServiceProvider.notifier);
  return TasksNotifier(dio, user?.id, user?.projectId, syncService);
});

class TasksNotifier extends StateNotifier<TasksState> {
  final Dio _dio;
  final String? _userId;
  final String? _projectId;
  final SyncService _syncService;

  TasksNotifier(this._dio, this._userId, this._projectId, this._syncService)
      : super(const TasksState()) {
    fetchTasks();
  }

  void setFilter(String filter) {
    state = state.copyWith(filter: filter);
  }

  Future<void> fetchTasks() async {
    state = state.copyWith(isLoading: true, error: null);
    if (_userId == null || _userId.isEmpty || _projectId == null || _projectId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        error: 'Your user or project assignment is missing. Contact an administrator.',
      );
      return;
    }
    try {
      final response = await _dio.get(
        ApiEndpoints.tasks,
        queryParameters: {
          'projectId': _projectId,
          'assignedTo': _userId,
        },
      );

      final List raw = response.data is List ? response.data : (response.data['items'] ?? []);
      final tasks = raw.map((i) => TaskItem.fromJson(i)).toList();
      state = state.copyWith(isLoading: false, tasks: tasks);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load tasks: $e');
    }
  }

  Future<bool> updateTaskStatus(String taskId, String newStatus) async {
    try {
      await _dio.patch(
        '${ApiEndpoints.tasks}/$taskId',
        data: {'status': newStatus},
      );

      _applyStatus(taskId, newStatus);
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        final queued = await _syncService.enqueue(
          endpoint: '${ApiEndpoints.tasks}/$taskId',
          method: 'PATCH',
          payload: {'status': newStatus},
          // Latest status for a task wins; no point queuing three moves.
          replaceKey: 'task-status:$taskId',
        );
        if (!queued) {
          state = state.copyWith(error: 'Could not save offline — you may have been signed out. Reconnect and try again.');
          return false;
        }
        _applyStatus(taskId, newStatus);
        return true;
      }
      state = state.copyWith(
        error: dioErrorMessage(error, 'Failed to update task.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(error: 'Failed to update task: $e');
      return false;
    }
  }

  void _applyStatus(String taskId, String newStatus) {
    final updated = state.tasks.map((task) {
      if (task.id != taskId) return task;
      return TaskItem(
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: newStatus,
        assignedName: task.assignedName,
        dueDate: task.dueDate,
        wbsCode: task.wbsCode,
        progressPct: newStatus == 'done' ? 100 : task.progressPct,
      );
    }).toList();
    state = state.copyWith(tasks: updated);
  }
}
