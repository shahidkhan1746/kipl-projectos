import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';

class MaterialRecord {
  final String id;
  final String date;
  final String material;
  final String? unit;
  final double receivedQty;
  final double consumedQty;
  final String? contractorRep;
  final String? ueedRep;
  final String? remarks;

  const MaterialRecord({
    required this.id,
    required this.date,
    required this.material,
    this.unit,
    this.receivedQty = 0,
    this.consumedQty = 0,
    this.contractorRep,
    this.ueedRep,
    this.remarks,
  });

  factory MaterialRecord.fromJson(Map<String, dynamic> json) {
    return MaterialRecord(
      id: json['id'] as String? ?? '',
      date: json['date'] as String? ?? '',
      material: json['material'] as String? ?? 'General Material',
      unit: json['unit'] as String?,
      receivedQty: (json['receivedQty'] as num?)?.toDouble() ?? 0,
      consumedQty: (json['consumedQty'] as num?)?.toDouble() ?? 0,
      contractorRep: json['contractorRep'] as String?,
      ueedRep: json['ueedRep'] as String?,
      remarks: json['remarks'] as String?,
    );
  }

  double get balanceQty => receivedQty - consumedQty;
}

class MaterialsState {
  final bool isLoading;
  final bool isSubmitting;
  final List<MaterialRecord> records;
  final String? message;
  final String? error;

  const MaterialsState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.records = const [],
    this.message,
    this.error,
  });

  MaterialsState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    List<MaterialRecord>? records,
    String? message,
    String? error,
  }) {
    return MaterialsState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      records: records ?? this.records,
      message: message,
      error: error,
    );
  }
}

final materialsProvider = StateNotifierProvider<MaterialsNotifier, MaterialsState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  final syncService = ref.watch(syncServiceProvider.notifier);
  return MaterialsNotifier(dio, user?.projectId, syncService);
});

class MaterialsNotifier extends StateNotifier<MaterialsState> {
  final Dio _dio;
  final String? _projectId;
  final SyncService _syncService;

  MaterialsNotifier(this._dio, this._projectId, this._syncService) : super(const MaterialsState()) {
    fetchMaterials();
  }

  Future<void> fetchMaterials() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _dio.get(
        '/material-register',
        queryParameters: {
          if (_projectId != null) 'projectId': _projectId,
        },
      );

      final List raw = response.data is List ? response.data : [];
      final list = raw.map((i) => MaterialRecord.fromJson(i)).toList();
      state = state.copyWith(isLoading: false, records: list);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load materials register: $e');
    }
  }

  Future<bool> createRecord(Map<String, dynamic> payload) async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    try {
      if (_projectId != null && !payload.containsKey('projectId')) {
        payload['projectId'] = _projectId;
      }

      await _dio.post('/material-register', data: payload);
      state = state.copyWith(
        isSubmitting: false,
        message: '✓ Material gate register entry saved successfully!',
      );
      await fetchMaterials();
      return true;
    } on DioException {
      await _syncService.enqueue(
        endpoint: '/material-register',
        payload: payload,
      );
      state = state.copyWith(
        isSubmitting: false,
        message: '✓ Saved offline. Material entry will sync once connected.',
      );
      return true;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Unexpected error: $e');
      return false;
    }
  }
}
