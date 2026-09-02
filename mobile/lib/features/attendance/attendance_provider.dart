import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/utils/date_formatters.dart';
import '../../core/utils/geofence_helper.dart';

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
      checkInLat: (json['checkInLat'] as num?)?.toDouble(),
      checkInLng: (json['checkInLng'] as num?)?.toDouble(),
      geoVerified: json['geoVerified'] as bool? ?? false,
      distanceFromSite: json['distanceFromSite'] as int?,
      hoursWorked: (json['hoursWorked'] as num?)?.toDouble(),
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
  return AttendanceNotifier(dio, user?.id ?? user?.employeeId ?? '');
});

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final Dio _dio;
  final String _employeeId;

  AttendanceNotifier(this._dio, this._employeeId) : super(const AttendanceState()) {
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
        },
      );

      if (response.data is List && (response.data as List).isNotEmpty) {
        final record = AttendanceRecord.fromJson((response.data as List).first);
        state = state.copyWith(todayRecord: record);
      }
    } catch (_) {
      // Ignored for offline or new day
    }
  }

  Future<bool> punchCheckIn() async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    try {
      final geo = await GeofenceHelper.evaluateProximity();
      state = state.copyWith(geofence: geo);

      final now = DateTime.now();
      final todayStr = DateFormatters.toApiDate(now);

      final payload = {
        'employeeId': _employeeId,
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
        message: geo.isInside
            ? '✓ Punched in successfully (GPS Geofence Verified)'
            : '✓ Punched in (Recorded outside 500m geofence)',
      );
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to punch check-in. Try again.';
      state = state.copyWith(isSubmitting: false, error: msg.toString());
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Unexpected error: $e');
      return false;
    }
  }

  Future<bool> punchCheckOut() async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    try {
      final now = DateTime.now();
      final todayStr = DateFormatters.toApiDate(now);

      final payload = {
        'employeeId': _employeeId,
        'date': todayStr,
        'status': state.todayRecord?.status ?? 'present',
        'source': 'mobile',
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
      final msg = e.response?.data?['message'] ?? 'Failed to punch check-out.';
      state = state.copyWith(isSubmitting: false, error: msg.toString());
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Unexpected error: $e');
      return false;
    }
  }
}
