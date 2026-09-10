import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/sync/sync_service.dart';

class LeaveRecord {
  final String id;
  final String leaveType;
  final String fromDate;
  final String toDate;
  final String status;
  final String? reason;

  const LeaveRecord({
    required this.id,
    required this.leaveType,
    required this.fromDate,
    required this.toDate,
    required this.status,
    this.reason,
  });

  factory LeaveRecord.fromJson(Map<String, dynamic> json) => LeaveRecord(
        id: json['id'] as String? ?? '',
        leaveType: json['leaveType'] as String? ?? '',
        fromDate: json['fromDate'] as String? ?? '',
        toDate: json['toDate'] as String? ?? '',
        status: json['status'] as String? ?? 'pending',
        reason: json['reason'] as String?,
      );
}

class LeaveState {
  final bool isLoading;
  final bool isSubmitting;
  final List<LeaveRecord> items;
  final String? error;
  final String? message;

  const LeaveState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.items = const [],
    this.error,
    this.message,
  });

  LeaveState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    List<LeaveRecord>? items,
    String? error,
    String? message,
  }) =>
      LeaveState(
        isLoading: isLoading ?? this.isLoading,
        isSubmitting: isSubmitting ?? this.isSubmitting,
        items: items ?? this.items,
        error: error,
        message: message,
      );
}

final leaveProvider = StateNotifierProvider<LeaveNotifier, LeaveState>((ref) {
  return LeaveNotifier(
      ref.watch(dioProvider), ref.watch(syncServiceProvider.notifier));
});

class LeaveNotifier extends StateNotifier<LeaveState> {
  final Dio _dio;
  final SyncService _sync;
  LeaveNotifier(this._dio, this._sync) : super(const LeaveState()) {
    refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final res = await _dio.get('/hr/leave');
      final list = (res.data as List?) ?? [];
      state = state.copyWith(
        isLoading: false,
        items: list
            .whereType<Map>()
            .map((e) => LeaveRecord.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
    } on DioException catch (e) {
      state = state.copyWith(
          isLoading: false, error: dioErrorMessage(e, 'Could not load leave.'));
    }
  }

  Future<bool> apply(
      {required String type,
      required String from,
      required String to,
      String? reason}) async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    final payload = {
      'leaveType': type,
      'fromDate': from,
      'toDate': to,
      'reason': reason,
      'employeeId': 'self'
    };
    try {
      await _dio.post('/hr/leave', data: payload);
      await refresh();
      state = state.copyWith(
          isSubmitting: false, message: 'Leave application submitted.');
      return true;
    } on DioException catch (e) {
      if (shouldQueueOffline(e)) {
        final queued =
            await _sync.enqueue(endpoint: '/hr/leave', payload: payload);
        state = state.copyWith(
          isSubmitting: false,
          message: queued
              ? 'Saved offline. Leave will sync when you have signal.'
              : null,
          error: queued ? null : 'Could not queue leave offline.',
        );
        return queued;
      }
      state = state.copyWith(
          isSubmitting: false,
          error: dioErrorMessage(e, 'Could not apply for leave.'));
      return false;
    }
  }
}
