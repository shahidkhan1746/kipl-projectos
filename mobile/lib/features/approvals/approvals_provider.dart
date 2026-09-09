import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';
import '../../core/utils/json_parsers.dart';

class PendingDiaryItem {
  final String id;
  final String date;
  final String? weatherCondition;
  final double? hoursLostWeather;
  final int totalManpower;
  final String? workExecuted;
  final String? submittedBy;
  final String status;

  const PendingDiaryItem({
    required this.id,
    required this.date,
    this.weatherCondition,
    this.hoursLostWeather,
    this.totalManpower = 0,
    this.workExecuted,
    this.submittedBy,
    required this.status,
  });

  factory PendingDiaryItem.fromJson(Map<String, dynamic> json) {
    final skilled = jsonInt(json['labourSkilled']) ?? 0;
    final unskilled = jsonInt(json['labourUnskilled']) ?? 0;
    final superv = jsonInt(json['labourSupervisory']) ?? 0;
    final workDone = json['workDone'];
    final workSummary = workDone is List
        ? workDone
            .map((item) => item is Map ? item['activity']?.toString() ?? '' : item.toString())
            .where((text) => text.isNotEmpty)
            .join('; ')
        : workDone?.toString();

    return PendingDiaryItem(
      id: json['id'] as String? ?? '',
      date: json['date'] as String? ?? '',
      weatherCondition: json['weatherMorning'] as String?,
      hoursLostWeather: jsonDouble(json['hoursLost']),
      totalManpower: skilled + unskilled + superv,
      workExecuted: workSummary,
      submittedBy: json['submittedBy'] as String?,
      status: json['status'] as String? ?? 'submitted',
    );
  }
}

class ApprovalsState {
  final bool isLoading;
  final bool isSubmitting;
  final List<PendingDiaryItem> pendingDiaries;
  final int openNcrsCount;
  final int pendingOrdersCount;
  final String? message;
  final String? error;

  const ApprovalsState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.pendingDiaries = const [],
    this.openNcrsCount = 0,
    this.pendingOrdersCount = 0,
    this.message,
    this.error,
  });

  int get totalPendingActions => pendingDiaries.length + openNcrsCount + pendingOrdersCount;

  ApprovalsState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    List<PendingDiaryItem>? pendingDiaries,
    int? openNcrsCount,
    int? pendingOrdersCount,
    String? message,
    String? error,
  }) => ApprovalsState(
    isLoading: isLoading ?? this.isLoading,
    isSubmitting: isSubmitting ?? this.isSubmitting,
    pendingDiaries: pendingDiaries ?? this.pendingDiaries,
    openNcrsCount: openNcrsCount ?? this.openNcrsCount,
    pendingOrdersCount: pendingOrdersCount ?? this.pendingOrdersCount,
    message: message,
    error: error,
  );
}

final approvalsProvider = StateNotifierProvider<ApprovalsNotifier, ApprovalsState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  return ApprovalsNotifier(dio, user?.projectId);
});

class ApprovalsNotifier extends StateNotifier<ApprovalsState> {
  final Dio _dio;
  final String? _projectId;

  ApprovalsNotifier(this._dio, this._projectId) : super(const ApprovalsState()) {
    fetchPendingApprovals();
  }

  Future<void> fetchPendingApprovals() async {
    state = state.copyWith(isLoading: true, error: null);
    if (_projectId == null || _projectId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return;
    }
    try {
      final diaryFuture = _dio.get('/diary', queryParameters: {
        'projectId': _projectId,
        'status': 'submitted',
      }).then((r) => r.data is List ? (r.data as List) : <dynamic>[]);

      final ncrsFuture = _dio.get('/qa/ncrs', queryParameters: {
        'projectId': _projectId,
        'status': 'open',
      }).then((r) => r.data is List ? (r.data as List) : <dynamic>[]);

      final ordersFuture = _dio.get('/site-orders', queryParameters: {
        'projectId': _projectId,
        'status': 'pending',
      }).then((r) => r.data is List ? (r.data as List) : <dynamic>[]);

      final results = await Future.wait([diaryFuture, ncrsFuture, ordersFuture]);

      final diaries = results[0].map((d) => PendingDiaryItem.fromJson(d)).toList();
      final ncrsCount = results[1].length;
      final ordersCount = results[2].length;

      state = state.copyWith(
        isLoading: false,
        pendingDiaries: diaries,
        openNcrsCount: ncrsCount,
        pendingOrdersCount: ordersCount,
      );
    } on DioException catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: dioErrorMessage(error, 'Failed to load approvals.'),
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load approvals: $e');
    }
  }

  Future<bool> approveDiary(String diaryId) async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    try {
      await _dio.patch('/diary/$diaryId/approve');
      state = state.copyWith(
        isSubmitting: false,
        message: 'Site diary approved successfully!',
      );
      await fetchPendingApprovals();
      return true;
    } on DioException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Failed to approve the diary.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Failed to approve diary: $e');
      return false;
    }
  }
}
