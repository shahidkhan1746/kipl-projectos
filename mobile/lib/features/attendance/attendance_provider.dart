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
  final syncService = ref.watch(syncServiceProvider.notifier);
  return AttendanceNotifier(dio, user?.employeeId ?? '', user?.projectId, syncService);
});

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final Dio _dio;
  final String _employeeId;
  final String? _projectId;
  final SyncService _syncService;

  AttendanceNotifier(this._dio, this._employeeId, this._projectId, this._syncService)
      : super(const AttendanceState()) {
    init();
  }

  /// Queues a punch that could not be delivered.
  ///
  /// The GPS fix travels with it and the server re-validates it against the
  /// geofence, so queuing cannot be used to punch in from off site. What it
  /// CANNOT preserve is the moment of the punch: for a self-service record the
  /// server stamps its own clock, so a punch queued at 08:00 and delivered at
  /// 17:00 is recorded at 17:00. The captured time is carried in `remarks` so
  /// HR can reconcile it. Recording the device's own time as the official one
  /// would mean trusting a clock the worker controls, on a payroll figure —
  /// that is a decision for KIPL, not a default.
  Future<bool> _queuePunch({
    required Map<String, dynamic> payload,
    required DateTime capturedAt,
    required String kind,
  }) async {
    final captured = capturedAt.toIso8601String();
    final queued = await _syncService.enqueue(
      endpoint: ApiEndpoints.attendance,
      payload: {
        ...payload,
        'remarks': 'Captured offline on device at $captured ($kind).',
      },
      // The same day's punch replaces an earlier queued one rather than
      // stacking duplicates for the same employee and date.
      replaceKey: 'attendance:${payload['employeeId']}:${payload['date']}',
    );
    if (!queued) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'No connection, and the punch could not be saved offline. '
            'Ask a supervisor or HR to mark your attendance.',
      );
      return false;
    }
    state = state.copyWith(
      isSubmitting: false,
      message: '✓ No connection — punch saved on this phone and will sync '
          'automatically. The recorded time will be the sync time, so tell '
          'your supervisor the actual $kind time was '
          '${DateFormatters.formatTime(capturedAt)}.',
    );
    return true;
  }

  Future<void> init() async {
    await refreshProximity();
    await fetchTodayRecord();
  }

  Future<void> refreshProximity() async {
    state = state.copyWith(isCheckingProximity: true, error: null);
    // Never prompts on its own — a result flagged needsPermission tells the UI
    // to show the location disclosure first.
    final result = await GeofenceHelper.evaluateProximity();
    state = state.copyWith(
      isCheckingProximity: false,
      geofence: result,
      error: result.errorMessage,
    );
  }

  /// Requests location access. The caller MUST have shown the disclosure and
  /// received the worker's agreement before calling this.
  Future<void> grantLocationAccess() async {
    state = state.copyWith(isCheckingProximity: true, error: null);
    final result = await GeofenceHelper.requestAccessAfterDisclosure();
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
    // Declared outside the try so the offline handler can still queue them.
    DateTime? capturedAt;
    Map<String, dynamic>? built;
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
      if (geo.needsPermission) {
        state = state.copyWith(
          isSubmitting: false,
          error: 'Site location access is required. Tap "Enable site location" above.',
        );
        return false;
      }
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
      capturedAt = now;
      built = payload;

      final response = await _dio.post(ApiEndpoints.attendance, data: payload);
      final record = AttendanceRecord.fromJson(response.data);

      state = state.copyWith(
        isSubmitting: false,
        todayRecord: record,
        message: '✓ Punched in successfully (GPS geofence verified)',
      );
      return true;
    } on DioException catch (e) {
      if (shouldQueueOffline(e) && built != null && capturedAt != null) {
        return _queuePunch(payload: built, capturedAt: capturedAt, kind: 'check-in');
      }
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
    DateTime? capturedAt;
    Map<String, dynamic>? built;
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
      capturedAt = now;
      built = payload;

      final response = await _dio.post(ApiEndpoints.attendance, data: payload);
      final record = AttendanceRecord.fromJson(response.data);

      state = state.copyWith(
        isSubmitting: false,
        todayRecord: record,
        message: '✓ Punched out successfully. Have a great evening!',
      );
      return true;
    } on DioException catch (e) {
      if (shouldQueueOffline(e) && built != null && capturedAt != null) {
        return _queuePunch(payload: built, capturedAt: capturedAt, kind: 'check-out');
      }
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
