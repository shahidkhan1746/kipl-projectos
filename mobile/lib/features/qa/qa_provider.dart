import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';
import '../../core/utils/json_parsers.dart';

class QaChecklistQuestion {
  final String id;
  final String question;
  final bool required;
  final String? referenceSpec;

  const QaChecklistQuestion({
    required this.id,
    required this.question,
    this.required = true,
    this.referenceSpec,
  });

  factory QaChecklistQuestion.fromJson(Map<String, dynamic> json) => QaChecklistQuestion(
    id: json['id'] as String? ?? '',
    question: json['question'] as String? ?? '',
    required: json['required'] as bool? ?? true,
    referenceSpec: json['referenceSpec'] as String?,
  );
}

class QaChecklistModel {
  final String id;
  final String title;
  final String category;
  final String workItem;
  final List<QaChecklistQuestion> items;

  const QaChecklistModel({
    required this.id,
    required this.title,
    required this.category,
    required this.workItem,
    required this.items,
  });

  factory QaChecklistModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List? ?? [];
    return QaChecklistModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      category: json['category'] as String? ?? 'general',
      workItem: json['workItem'] as String? ?? '',
      items: rawItems.map((i) => QaChecklistQuestion.fromJson(i)).toList(),
    );
  }
}

class QaInspectionItem {
  final String id;
  final String date;
  final String workItem;
  final String? location;
  final String? chainage;
  final String inspectedBy;
  final String overallResult; // 'passed', 'failed', 'conditional', 'draft'
  final int passCount;
  final int failCount;
  final int naCount;
  final bool ncrRaised;
  final String? remarks;

  const QaInspectionItem({
    required this.id,
    required this.date,
    required this.workItem,
    this.location,
    this.chainage,
    required this.inspectedBy,
    required this.overallResult,
    this.passCount = 0,
    this.failCount = 0,
    this.naCount = 0,
    this.ncrRaised = false,
    this.remarks,
  });

  factory QaInspectionItem.fromJson(Map<String, dynamic> json) => QaInspectionItem(
    id: json['id'] as String? ?? '',
    date: json['date'] as String? ?? '',
    workItem: json['workItem'] as String? ?? '',
    location: json['location'] as String?,
    chainage: json['chainage'] as String?,
    inspectedBy: json['inspectedBy'] as String? ?? '',
    overallResult: (json['overallResult'] as String? ?? 'passed').toLowerCase(),
    passCount: jsonInt(json['passCount']) ?? 0,
    failCount: jsonInt(json['failCount']) ?? 0,
    naCount: jsonInt(json['naCount']) ?? 0,
    ncrRaised: json['ncrRaised'] as bool? ?? false,
    remarks: json['remarks'] as String?,
  );
}

class NcrItem {
  final String id;
  final String ncrNo;
  final String title;
  final String description;
  final String severity; // 'critical', 'major', 'minor'
  final String status; // 'open', 'closed', 'under_review'
  final String? location;
  final String? targetDate;
  final String? closedDate;
  final String? correctiveAction;

  const NcrItem({
    required this.id,
    required this.ncrNo,
    required this.title,
    required this.description,
    required this.severity,
    required this.status,
    this.location,
    this.targetDate,
    this.closedDate,
    this.correctiveAction,
  });

  factory NcrItem.fromJson(Map<String, dynamic> json) => NcrItem(
    id: json['id'] as String? ?? '',
    ncrNo: json['ncrNo'] as String? ?? 'NCR-XXXX',
    title: json['workItem'] as String? ?? '',
    description: json['description'] as String? ?? '',
    severity: (json['severity'] as String? ?? 'minor').toLowerCase(),
    status: (json['status'] as String? ?? 'open').toLowerCase(),
    location: json['location'] as String?,
    targetDate: json['targetDate'] as String?,
    closedDate: json['closedDate'] as String?,
    correctiveAction: json['correctiveAction'] as String?,
  );

  bool get isOpen => status == 'open';
}

class QaState {
  final bool isLoading;
  final bool isSubmitting;
  final List<QaInspectionItem> inspections;
  final List<QaChecklistModel> checklists;
  final List<NcrItem> ncrs;
  final String? message;
  final String? error;

  const QaState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.inspections = const [],
    this.checklists = const [],
    this.ncrs = const [],
    this.message,
    this.error,
  });

  QaState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    List<QaInspectionItem>? inspections,
    List<QaChecklistModel>? checklists,
    List<NcrItem>? ncrs,
    String? message,
    String? error,
  }) => QaState(
    isLoading: isLoading ?? this.isLoading,
    isSubmitting: isSubmitting ?? this.isSubmitting,
    inspections: inspections ?? this.inspections,
    checklists: checklists ?? this.checklists,
    ncrs: ncrs ?? this.ncrs,
    message: message,
    error: error,
  );
}

final qaProvider = StateNotifierProvider<QaNotifier, QaState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  final syncService = ref.watch(syncServiceProvider.notifier);
  return QaNotifier(dio, user?.projectId, user?.name, syncService);
});

class QaNotifier extends StateNotifier<QaState> {
  final Dio _dio;
  final String? _projectId;
  final String? _userName;
  final SyncService _syncService;

  QaNotifier(this._dio, this._projectId, this._userName, this._syncService)
      : super(const QaState()) {
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
        fetchInspections(),
        fetchChecklists(),
        fetchNcrs(),
      ]);
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load QA data: $e');
    }
  }

  Future<void> fetchInspections() async {
    final res = await _dio.get('/qa/inspections', queryParameters: {
        'projectId': _projectId,
      });
      final List raw = res.data is List ? res.data : [];
      final list = raw.map((i) => QaInspectionItem.fromJson(i)).toList();
      state = state.copyWith(inspections: list);
  }

  Future<void> fetchChecklists() async {
    final res = await _dio.get('/qa/checklists', queryParameters: {
        'projectId': _projectId,
      });
      final List raw = res.data is List ? res.data : [];
      final list = raw.map((i) => QaChecklistModel.fromJson(i)).toList();
      state = state.copyWith(checklists: list);
  }

  Future<void> fetchNcrs() async {
    final res = await _dio.get('/qa/ncrs', queryParameters: {
        'projectId': _projectId,
      });
      final List raw = res.data is List ? res.data : [];
      final list = raw.map((i) => NcrItem.fromJson(i)).toList();
      state = state.copyWith(ncrs: list);
  }

  Future<bool> submitInspection(Map<String, dynamic> payload) async {
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
      payload['inspectedBy'] = _userName ?? 'Field QA Engineer';
      payload['submitted'] = true;

      await _dio.post('/qa/inspections', data: payload);
      state = state.copyWith(
        isSubmitting: false,
        message: '✓ QA inspection report submitted successfully!',
      );
      await fetchInspections();
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        await _syncService.enqueue(
          endpoint: '/qa/inspections',
          payload: payload,
        );
        state = state.copyWith(
          isSubmitting: false,
          message: '✓ Saved offline. Will sync automatically once connected.',
        );
        return true;
      }
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Failed to submit the inspection.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Failed: $e');
      return false;
    }
  }

  Future<bool> createNcr(Map<String, dynamic> payload) async {
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
      payload['raisedBy'] = _userName ?? 'Field QA Engineer';

      await _dio.post('/qa/ncrs', data: payload);
      state = state.copyWith(
        isSubmitting: false,
        message: '✓ Non-Conformance Report (NCR) raised successfully!',
      );
      await fetchNcrs();
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        await _syncService.enqueue(
          endpoint: '/qa/ncrs',
          payload: payload,
        );
        state = state.copyWith(
          isSubmitting: false,
          message: '✓ Saved offline. NCR will sync once connected.',
        );
        return true;
      }
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Failed to create the NCR.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Failed: $e');
      return false;
    }
  }

  Future<bool> closeNcr(String ncrId, String correctiveAction) async {
    if (correctiveAction.trim().isEmpty) {
      state = state.copyWith(error: 'Corrective action is required to close an NCR.');
      return false;
    }
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    try {
      await _dio.patch('/qa/ncrs/$ncrId/close', data: {
        'correctiveAction': correctiveAction.trim(),
      });
      await fetchNcrs();
      state = state.copyWith(
        isSubmitting: false,
        message: '✓ NCR closed with corrective action recorded.',
      );
      return true;
    } on DioException catch (error) {
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Failed to close the NCR.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Failed to close NCR: $e');
      return false;
    }
  }
}
