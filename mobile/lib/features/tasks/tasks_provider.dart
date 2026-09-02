import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';

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
      progressPct: (json['progressPct'] as num?)?.toDouble() ?? 0,
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
  return TasksNotifier(dio, user?.projectId);
});

class TasksNotifier extends StateNotifier<TasksState> {
  final Dio _dio;
  final String? _projectId;

  TasksNotifier(this._dio, this._projectId) : super(const TasksState()) {
    fetchTasks();
  }

  void setFilter(String filter) {
    state = state.copyWith(filter: filter);
  }

  Future<void> fetchTasks() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(
        ApiEndpoints.tasks,
        queryParameters: {
          if (_projectId != null) 'projectId': _projectId,
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

      // Optimistically update local state
      final updated = state.tasks.map((t) {
        if (t.id == taskId) {
          return TaskItem(
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: newStatus,
            assignedName: t.assignedName,
            dueDate: t.dueDate,
            wbsCode: t.wbsCode,
            progressPct: newStatus == 'done' ? 100 : t.progressPct,
          );
        }
        return t;
      }).toList();

      state = state.copyWith(tasks: updated);
      return true;
    } catch (e) {
      state = state.copyWith(error: 'Failed to update task: $e');
      return false;
    }
  }
}
