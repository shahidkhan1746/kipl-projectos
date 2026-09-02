import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';

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
      lastReading: (json['lastReading'] as num?)?.toDouble() ?? 0.0,
      totalHours: (json['totalHours'] as num?)?.toDouble() ?? 0.0,
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
      hourStart: (json['hourStart'] as num?)?.toDouble(),
      hourClose: (json['hourClose'] as num?)?.toDouble(),
      hoursWorked: (json['hoursWorked'] as num?)?.toDouble(),
      vehicle: json['vehicle'] as String?,
      driver: json['driver'] as String?,
      meterStart: (json['meterStart'] as num?)?.toDouble(),
      meterEnd: (json['meterEnd'] as num?)?.toDouble(),
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      fuelLitres: (json['fuelLitres'] as num?)?.toDouble(),
      breakdown: json['breakdown'] as bool? ?? false,
      breakdownDetails: json['breakdownDetails'] as String?,
      workZone: json['workZone'] as String?,
      workDescription: json['workDescription'] as String?,
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
  return FleetNotifier(dio, user?.projectId);
});

class FleetNotifier extends StateNotifier<FleetState> {
  final Dio _dio;
  final String? _projectId;

  FleetNotifier(this._dio, this._projectId) : super(const FleetState()) {
    init();
  }

  Future<void> init() async {
    state = state.copyWith(isLoading: true, error: null);
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
    try {
      final response = await _dio.get(
        '${ApiEndpoints.fleet}/dashboard',
        queryParameters: {
          if (_projectId != null) 'projectId': _projectId,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final rawList = data['fleet'] as List? ?? data['allPlant'] as List? ?? [];
      final machines = rawList.map((m) => MachineSummary.fromJson(m)).toList();
      state = state.copyWith(machines: machines);
    } catch (_) {}
  }

  Future<void> fetchRecentLogs() async {
    try {
      final response = await _dio.get(
        ApiEndpoints.fleet,
        queryParameters: {
          if (_projectId != null) 'projectId': _projectId,
        },
      );

      final List raw = response.data is List ? response.data : [];
      final logs = raw.map((i) => FleetLogItem.fromJson(i)).toList();
      state = state.copyWith(recentLogs: logs);
    } catch (_) {}
  }

  Future<bool> submitLog(Map<String, dynamic> payload) async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    try {
      if (_projectId != null && !payload.containsKey('projectId')) {
        payload['projectId'] = _projectId;
      }

      await _dio.post(ApiEndpoints.fleet, data: payload);
      state = state.copyWith(
        isSubmitting: false,
        message: '✓ Fleet log recorded successfully!',
      );
      await init();
      return true;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to submit fleet log.';
      state = state.copyWith(isSubmitting: false, error: msg.toString());
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Unexpected error: $e');
      return false;
    }
  }
}
