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
  final bool showAllTasks;

  const TasksState({
    this.isLoading = false,
    this.tasks = const [],
    this.filter = 'all',
    this.error,
    this.showAllTasks = true,
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
    bool? showAllTasks,
  }) {
    return TasksState(
      isLoading: isLoading ?? this.isLoading,
      tasks: tasks ?? this.tasks,
      filter: filter ?? this.filter,
      error: error,
      showAllTasks: showAllTasks ?? this.showAllTasks,
    );
  }
}

final tasksProvider = StateNotifierProvider<TasksNotifier, TasksState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  final syncService = ref.watch(syncServiceProvider.notifier);
  return TasksNotifier(
    dio,
    user?.id,
    user?.projectId,
    syncService,
    user: user,
  );
});

class TasksNotifier extends StateNotifier<TasksState> {
  final Dio _dio;
  final String? _userId;
  final String? _projectId;
  final SyncService _syncService;
  final UserModel? user;

  TasksNotifier(
    this._dio,
    this._userId,
    this._projectId,
    this._syncService, {
    this.user,
  }) : super(TasksState(
          showAllTasks: user?.isAdmin == true ||
              user?.isProjectManager == true ||
              user?.isEngineer == true,
        )) {
    fetchTasks();
  }

  bool get canManageTasks =>
      user?.isAdmin == true ||
      user?.isProjectManager == true ||
      user?.isEngineer == true;

  void setFilter(String filter) {
    state = state.copyWith(filter: filter);
  }

  void setShowAllTasks(bool showAll) {
    if (state.showAllTasks == showAll) return;
    state = state.copyWith(showAllTasks: showAll);
    fetchTasks();
  }

  Future<void> fetchTasks() async {
    state = state.copyWith(isLoading: true, error: null);
    if (_userId == null ||
        _userId.isEmpty ||
        _projectId == null ||
        _projectId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        error:
            'Your user or project assignment is missing. Contact an administrator.',
      );
      return;
    }
    try {
      final query = <String, dynamic>{
        'projectId': _projectId,
      };

      // Privileged roles see all project tasks by default; non-privileged roles or
      // users who toggle "My Tasks" query assignedTo only.
      if (!state.showAllTasks || !canManageTasks) {
        query['assignedTo'] = _userId;
      }

      final response = await _dio.get(
        ApiEndpoints.tasks,
        queryParameters: query,
      );

      final List raw = response.data is List
          ? response.data
          : (response.data['items'] ?? []);
      final tasks = raw.map((i) => TaskItem.fromJson(i)).toList();
      state = state.copyWith(isLoading: false, tasks: tasks);
    } catch (e) {
      // Never the raw exception. "DioException [connection error]: ..." is a
      // stack trace in a friendly font; it tells a site supervisor nothing
      // they can act on. dioErrorMessage is what updateTaskStatus already
      // uses, so both paths now speak the same language.
      state = state.copyWith(
        isLoading: false,
        error: e is DioException
            ? dioErrorMessage(e, 'Could not load tasks.')
            : 'Could not load tasks. Check your connection and try again.',
      );
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
          state = state.copyWith(
              error:
                  'Could not save offline — you may have been signed out. Reconnect and try again.');
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

  Future<bool> assignTask(
    String taskId, {
    required String assignedTo,
    required String assignedName,
  }) async {
    try {
      await _dio.patch(
        '${ApiEndpoints.tasks}/$taskId',
        data: {
          'assignedTo': assignedTo,
          'assignedName': assignedName,
        },
      );

      final updated = state.tasks.map((task) {
        if (task.id != taskId) return task;
        return TaskItem(
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          assignedName: assignedName,
          dueDate: task.dueDate,
          wbsCode: task.wbsCode,
          progressPct: task.progressPct,
        );
      }).toList();
      state = state.copyWith(tasks: updated);
      return true;
    } catch (e) {
      state = state.copyWith(
        error: e is DioException
            ? dioErrorMessage(e, 'Failed to assign task.')
            : 'Failed to assign task: $e',
      );
      return false;
    }
  }

  Future<bool> createTask({
    required String title,
    String? description,
    String priority = 'medium',
    String? dueDate,
    String? assignedTo,
    String? assignedName,
    String? wbsCode,
  }) async {
    try {
      final payload = <String, dynamic>{
        'projectId': _projectId,
        'title': title,
        'priority': priority,
        'status': 'todo',
      };
      if (description != null && description.trim().isNotEmpty) {
        payload['description'] = description.trim();
      }
      if (dueDate != null && dueDate.trim().isNotEmpty) {
        payload['dueDate'] = dueDate.trim();
      }
      if (assignedTo != null && assignedTo.trim().isNotEmpty) {
        payload['assignedTo'] = assignedTo.trim();
      }
      if (assignedName != null && assignedName.trim().isNotEmpty) {
        payload['assignedName'] = assignedName.trim();
      }
      if (wbsCode != null && wbsCode.trim().isNotEmpty) {
        payload['wbsCode'] = wbsCode.trim();
      }

      final response = await _dio.post(
        ApiEndpoints.tasks,
        data: payload,
      );

      if (response.data is Map) {
        final newTask = TaskItem.fromJson(Map<String, dynamic>.from(response.data));
        state = state.copyWith(tasks: [newTask, ...state.tasks]);
      } else {
        await fetchTasks();
      }
      return true;
    } catch (e) {
      state = state.copyWith(
        error: e is DioException
            ? dioErrorMessage(e, 'Failed to create task.')
            : 'Failed to create task: $e',
      );
      return false;
    }
  }
}
