import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';
import '../../core/utils/json_parsers.dart';

class MachineSummary {
  final String machineId;
  final String machineType;
  final double lastReading;
  final double totalHours;
  final String? lastDate;

  const MachineSummary({
    required this.machineId,
    required this.machineType,
    required this.lastReading,
    required this.totalHours,
    this.lastDate,
  });

  factory MachineSummary.fromJson(Map<String, dynamic> json) {
    return MachineSummary(
      machineId: json['machineId'] as String? ?? '',
      machineType: json['machineType'] as String? ?? 'Equipment',
      lastReading: jsonDouble(json['lastReading']) ?? 0.0,
      totalHours: jsonDouble(json['totalHours']) ?? 0.0,
      lastDate: json['lastDate'] as String?,
    );
  }
}

class FleetLogItem {
  final String id;
  final String logType; // 'plant' or 'vehicle'
  final String date;
  final String? machineId;
  final String? machineType;
  final String? operator;
  final double? hourStart;
  final double? hourClose;
  final double? hoursWorked;
  final String? vehicle;
  final String? driver;
  final double? meterStart;
  final double? meterEnd;
  final double? distanceKm;
  final double? fuelLitres;
  final bool breakdown;
  final String? breakdownDetails;
  final String? workZone;
  final String? workDescription;
  final String? fromLocation;
  final String? purpose;
  final String? remarks;

  const FleetLogItem({
    required this.id,
    required this.logType,
    required this.date,
    this.machineId,
    this.machineType,
    this.operator,
    this.hourStart,
    this.hourClose,
    this.hoursWorked,
    this.vehicle,
    this.driver,
    this.meterStart,
    this.meterEnd,
    this.distanceKm,
    this.fuelLitres,
    this.breakdown = false,
    this.breakdownDetails,
    this.workZone,
    this.workDescription,
    this.fromLocation,
    this.purpose,
    this.remarks,
  });

  factory FleetLogItem.fromJson(Map<String, dynamic> json) {
    return FleetLogItem(
      id: json['id'] as String? ?? '',
      logType: json['logType'] as String? ?? 'plant',
      date: json['date'] as String? ?? '',
      machineId: json['machineId'] as String?,
      machineType: json['machineType'] as String?,
      operator: json['operator'] as String?,
      hourStart: jsonDouble(json['hourStart']),
      hourClose: jsonDouble(json['hourClose']),
      hoursWorked: jsonDouble(json['hoursWorked']),
      vehicle: json['vehicle'] as String?,
      driver: json['driver'] as String?,
      meterStart: jsonDouble(json['meterStart']),
      meterEnd: jsonDouble(json['meterEnd']),
      distanceKm: jsonDouble(json['distanceKm']),
      fuelLitres: jsonDouble(json['fuelLitres']),
      breakdown: json['breakdown'] as bool? ?? false,
      breakdownDetails: json['breakdownDetails'] as String?,
      workZone: json['workZone'] as String?,
      workDescription: json['workDescription'] as String?,
      fromLocation: json['fromLocation'] as String?,
      purpose: json['purpose'] as String?,
      remarks: json['remarks'] as String?,
    );
  }
}

class FleetState {
  final bool isLoading;
  final bool isSubmitting;
  final List<MachineSummary> machines;
  final List<FleetLogItem> recentLogs;
  final String? message;
  final String? error;

  const FleetState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.machines = const [],
    this.recentLogs = const [],
    this.message,
    this.error,
  });

  FleetState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    List<MachineSummary>? machines,
    List<FleetLogItem>? recentLogs,
    String? message,
    String? error,
  }) {
    return FleetState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      machines: machines ?? this.machines,
      recentLogs: recentLogs ?? this.recentLogs,
      message: message,
      error: error,
    );
  }
}

final fleetProvider = StateNotifierProvider<FleetNotifier, FleetState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  final syncService = ref.watch(syncServiceProvider.notifier);
  return FleetNotifier(dio, user?.projectId, user?.name, syncService);
});

class FleetNotifier extends StateNotifier<FleetState> {
  final Dio _dio;
  final String? _projectId;
  final String? _userName;
  final SyncService _syncService;

  FleetNotifier(this._dio, this._projectId, this._userName, this._syncService)
      : super(const FleetState()) {
    init();
  }

  Future<void> init() async {
    state = state.copyWith(isLoading: true, error: null);
    if (_projectId == null || _projectId!.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return;
    }
    try {
      await Future.wait([
        fetchDashboard(),
        fetchRecentLogs(),
      ]);
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load fleet data: $e');
    }
  }

  Future<void> fetchDashboard() async {
    final response = await _dio.get(
        '${ApiEndpoints.fleet}/dashboard',
        queryParameters: {
          'projectId': _projectId,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final rawList = data['fleet'] as List? ?? data['allPlant'] as List? ?? [];
      final machines = rawList.map((m) => MachineSummary.fromJson(m)).toList();
      state = state.copyWith(machines: machines);
  }

  Future<void> fetchRecentLogs() async {
    final response = await _dio.get(
        ApiEndpoints.fleet,
        queryParameters: {
          'projectId': _projectId,
        },
      );

      final List raw = response.data is List ? response.data : [];
      final logs = raw.map((i) => FleetLogItem.fromJson(i)).toList();
      state = state.copyWith(recentLogs: logs);
  }

  Future<bool> submitLog(Map<String, dynamic> payload) async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    if (_projectId == null || _projectId!.isEmpty) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return false;
    }
    try {
      if (!payload.containsKey('projectId')) {
        payload['projectId'] = _projectId;
      }
      payload['reportedBy'] = _userName;
      payload['reportedVia'] = 'app';

      await _dio.post(ApiEndpoints.fleet, data: payload);
      state = state.copyWith(
        isSubmitting: false,
        message: '✓ Fleet log recorded successfully!',
      );
      await init();
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        await _syncService.enqueue(
          endpoint: ApiEndpoints.fleet,
          payload: payload,
        );
        state = state.copyWith(
          isSubmitting: false,
          message: '✓ Saved offline. Machinery log will sync once connected.',
        );
        return true;
      }
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Failed to save the fleet log.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Unexpected error: $e');
      return false;
    }
  }
}
