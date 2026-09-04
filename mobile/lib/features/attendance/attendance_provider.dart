import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';
import '../../core/utils/date_formatters.dart';
import '../../core/utils/geofence_helper.dart';
import '../../core/utils/json_parsers.dart';

class AttendanceRecord {
  final String? id;
  final String employeeId;
  final String date;
  final String status;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final double? checkInLat;
  final double? checkInLng;
  final bool geoVerified;
  final int? distanceFromSite;
  final double? hoursWorked;

  const AttendanceRecord({
    this.id,
    required this.employeeId,
    required this.date,
    required this.status,
    this.checkInTime,
    this.checkOutTime,
    this.checkInLat,
    this.checkInLng,
    this.geoVerified = false,
    this.distanceFromSite,
    this.hoursWorked,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] as String?,
      employeeId: json['employeeId'] as String? ?? '',
      date: json['date'] as String? ?? '',
      status: json['status'] as String? ?? 'absent',
      checkInTime: json['checkInTime'] != null ? DateTime.tryParse(json['checkInTime']) : null,
      checkOutTime: json['checkOutTime'] != null ? DateTime.tryParse(json['checkOutTime']) : null,
      checkInLat: jsonDouble(json['checkInLat']),
      checkInLng: jsonDouble(json['checkInLng']),
      geoVerified: json['geoVerified'] as bool? ?? false,
      distanceFromSite: jsonInt(json['distanceFromSite']),
      hoursWorked: jsonDouble(json['hoursWorked']),
    );
  }

  bool get isCheckedIn => checkInTime != null;
  bool get isCheckedOut => checkOutTime != null;
}

class AttendanceState {
  final bool isCheckingProximity;
  final GeofenceResult? geofence;
  final AttendanceRecord? todayRecord;
  final bool isSubmitting;
  final String? message;
  final String? error;

  const AttendanceState({
    this.isCheckingProximity = false,
    this.geofence,
    this.todayRecord,
    this.isSubmitting = false,
    this.message,
    this.error,
  });

  AttendanceState copyWith({
    bool? isCheckingProximity,
    GeofenceResult? geofence,
    AttendanceRecord? todayRecord,
    bool? isSubmitting,
    String? message,
    String? error,
  }) {
    return AttendanceState(
      isCheckingProximity: isCheckingProximity ?? this.isCheckingProximity,
      geofence: geofence ?? this.geofence,
      todayRecord: todayRecord ?? this.todayRecord,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      message: message,
      error: error,
    );
  }
}

final attendanceProvider = StateNotifierProvider<AttendanceNotifier, AttendanceState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  return AttendanceNotifier(dio, user?.employeeId ?? '', user?.projectId);
});

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final Dio _dio;
  final String _employeeId;
  final String? _projectId;

  AttendanceNotifier(this._dio, this._employeeId, this._projectId)
      : super(const AttendanceState()) {
    init();
  }

  Future<void> init() async {
    await refreshProximity();
    await fetchTodayRecord();
  }

  Future<void> refreshProximity() async {
    state = state.copyWith(isCheckingProximity: true, error: null);
    final result = await GeofenceHelper.evaluateProximity();
    state = state.copyWith(
      isCheckingProximity: false,
      geofence: result,
      error: result.errorMessage,
    );
  }

  Future<void> fetchTodayRecord() async {
    if (_employeeId.isEmpty) return;
    try {
      final todayStr = DateFormatters.toApiDate(DateTime.now());
      final response = await _dio.get(
        ApiEndpoints.attendance,
        queryParameters: {
          'employeeId': _employeeId,
          'date': todayStr,
          if (_projectId != null) 'projectId': _projectId,
        },
      );

      if (response.data is List && (response.data as List).isNotEmpty) {
        final record = AttendanceRecord.fromJson((response.data as List).first);
        state = state.copyWith(todayRecord: record);
      }
    } on DioException catch (error) {
      if (!shouldQueueOffline(error)) {
        state = state.copyWith(
          error: dioErrorMessage(error, 'Failed to load today\'s attendance.'),
        );
      }
    }
  }

  Future<bool> punchCheckIn() async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    try {
      if (_employeeId.isEmpty || _projectId == null || _projectId.isEmpty) {
        state = state.copyWith(
          isSubmitting: false,
          error: 'Your employee or project assignment is missing. Contact an administrator.',
        );
        return false;
      }

      final geo = await GeofenceHelper.evaluateProximity();
      state = state.copyWith(geofence: geo);
      if (geo.errorMessage != null || geo.position == null) {
        state = state.copyWith(
          isSubmitting: false,
          error: geo.errorMessage ?? 'A valid GPS position is required to check in.',
        );
        return false;
      }
      if (geo.isMocked) {
        state = state.copyWith(
          isSubmitting: false,
          error: 'Mocked GPS locations cannot be used for attendance.',
        );
        return false;
      }
      if (geo.accuracyMeters > 100) {
        state = state.copyWith(
          isSubmitting: false,
          error: 'GPS accuracy is too low (${geo.accuracyMeters.round()}m). Move outdoors and try again.',
        );
        return false;
      }
      if (!geo.isInside) {
        state = state.copyWith(
          isSubmitting: false,
          error: 'You are outside the 500m site attendance geofence.',
        );
        return false;
      }

      final now = DateTime.now();
      final todayStr = DateFormatters.toApiDate(now);

      final payload = {
        'employeeId': _employeeId,
        'projectId': _projectId,
        'date': todayStr,
        'status': 'present',
        'source': 'mobile',
        'checkInTime': now.toIso8601String(),
        'checkInLat': geo.position?.latitude,
        'checkInLng': geo.position?.longitude,
      };

      final response = await _dio.post(ApiEndpoints.attendance, data: payload);
      final record = AttendanceRecord.fromJson(response.data);

      state = state.copyWith(
        isSubmitting: false,
        todayRecord: record,
        message: '✓ Punched in successfully (GPS geofence verified)',
      );
      return true;
    } on DioException catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(e, 'Failed to punch check-in. Try again.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Unexpected error: $e');
      return false;
    }
  }

  Future<bool> punchCheckOut() async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    try {
      if (_employeeId.isEmpty || _projectId == null || _projectId.isEmpty) {
        state = state.copyWith(
          isSubmitting: false,
          error: 'Your employee or project assignment is missing. Contact an administrator.',
        );
        return false;
      }
      if (state.todayRecord?.checkInTime == null) {
        state = state.copyWith(
          isSubmitting: false,
          error: 'You must check in before checking out.',
        );
        return false;
      }
      final now = DateTime.now();
      final todayStr = DateFormatters.toApiDate(now);

      final payload = {
        'employeeId': _employeeId,
        'projectId': _projectId,
        'date': todayStr,
        'status': state.todayRecord?.status ?? 'present',
        'source': 'mobile',
        if (state.todayRecord?.checkInTime != null)
          'checkInTime': state.todayRecord!.checkInTime!.toIso8601String(),
        'checkOutTime': now.toIso8601String(),
      };

      final response = await _dio.post(ApiEndpoints.attendance, data: payload);
      final record = AttendanceRecord.fromJson(response.data);

      state = state.copyWith(
        isSubmitting: false,
        todayRecord: record,
        message: '✓ Punched out successfully. Have a great evening!',
      );
      return true;
    } on DioException catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(e, 'Failed to punch check-out.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Unexpected error: $e');
      return false;
    }
  }
}
