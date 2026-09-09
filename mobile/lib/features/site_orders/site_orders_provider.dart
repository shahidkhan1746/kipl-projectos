import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/sync/sync_service.dart';
import '../../core/utils/date_formatters.dart';

class SiteOrderItem {
  final String id;
  final String? orderNo;
  final String date;
  final String issuedBy;
  final String instruction;
  final String? acknowledgedBy;
  final String? acknowledgedDate;
  final String complianceStatus; // 'pending', 'complied', 'na'
  final String? remarks;

  const SiteOrderItem({
    required this.id,
    this.orderNo,
    required this.date,
    required this.issuedBy,
    required this.instruction,
    this.acknowledgedBy,
    this.acknowledgedDate,
    this.complianceStatus = 'pending',
    this.remarks,
  });

  factory SiteOrderItem.fromJson(Map<String, dynamic> json) => SiteOrderItem(
    id: json['id'] as String? ?? '',
    orderNo: json['orderNo'] as String?,
    date: json['date'] as String? ?? '',
    issuedBy: json['issuedBy'] as String? ?? 'Engineer-in-Charge',
    instruction: json['instruction'] as String? ?? '',
    acknowledgedBy: json['acknowledgedBy'] as String?,
    acknowledgedDate: json['acknowledgedDate'] as String?,
    complianceStatus: (json['complianceStatus'] as String? ?? 'pending').toLowerCase(),
    remarks: json['remarks'] as String?,
  );

  bool get isPending => complianceStatus == 'pending';
  bool get isComplied => complianceStatus == 'complied';
  bool get isAcknowledged => acknowledgedBy != null && acknowledgedBy!.isNotEmpty;
}

class SiteOrdersState {
  final bool isLoading;
  final bool isSubmitting;
  final List<SiteOrderItem> orders;
  final String filter; // 'all', 'pending', 'complied'
  final String? message;
  final String? error;

  const SiteOrdersState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.orders = const [],
    this.filter = 'all',
    this.message,
    this.error,
  });

  List<SiteOrderItem> get filteredOrders {
    if (filter == 'pending') return orders.where((o) => o.isPending).toList();
    if (filter == 'complied') return orders.where((o) => o.isComplied).toList();
    return orders;
  }

  SiteOrdersState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    List<SiteOrderItem>? orders,
    String? filter,
    String? message,
    String? error,
  }) => SiteOrdersState(
    isLoading: isLoading ?? this.isLoading,
    isSubmitting: isSubmitting ?? this.isSubmitting,
    orders: orders ?? this.orders,
    filter: filter ?? this.filter,
    message: message,
    error: error,
  );
}

final siteOrdersProvider = StateNotifierProvider<SiteOrdersNotifier, SiteOrdersState>((ref) {
  final dio = ref.watch(dioProvider);
  final user = ref.watch(currentUserProvider);
  final syncService = ref.watch(syncServiceProvider.notifier);
  return SiteOrdersNotifier(dio, user?.projectId, user?.name, syncService);
});

class SiteOrdersNotifier extends StateNotifier<SiteOrdersState> {
  final Dio _dio;
  final String? _projectId;
  final String? _userName;
  final SyncService _syncService;

  SiteOrdersNotifier(this._dio, this._projectId, this._userName, this._syncService)
      : super(const SiteOrdersState()) {
    fetchOrders();
  }

  void setFilter(String filter) {
    state = state.copyWith(filter: filter);
  }

  Future<void> fetchOrders() async {
    state = state.copyWith(isLoading: true, error: null);
    if (_projectId == null || _projectId.isEmpty) {
      state = state.copyWith(
        isLoading: false,
        error: 'Your project assignment is missing. Contact an administrator.',
      );
      return;
    }
    try {
      final res = await _dio.get('/site-orders', queryParameters: {
        'projectId': _projectId,
      });
      final List raw = res.data is List ? res.data : [];
      final list = raw.map((i) => SiteOrderItem.fromJson(i)).toList();
      state = state.copyWith(isLoading: false, orders: list);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to load site orders: $e');
    }
  }

  Future<bool> createOrder(Map<String, dynamic> payload) async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    if (_projectId == null || _projectId.isEmpty) {
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

      await _dio.post('/site-orders', data: payload);
      state = state.copyWith(
        isSubmitting: false,
        message: 'Site order recorded successfully!',
      );
      await fetchOrders();
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        final queued = await _syncService.enqueue(
          endpoint: '/site-orders',
          payload: payload,
        );
        if (!queued) {
          state = state.copyWith(isSubmitting: false, error: 'Could not save offline — you may have been signed out. Reconnect and try again.');
          return false;
        }
        state = state.copyWith(
          isSubmitting: false,
          message: 'Saved offline. Will sync once connected.',
        );
        return true;
      }
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Failed to record the site order.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Failed: $e');
      return false;
    }
  }

  Future<bool> acknowledgeOrder(String orderId) async {
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    final payload = {
      'acknowledgedBy': _userName ?? 'Site Engineer',
      'acknowledgedDate': DateFormatters.toApiDate(DateTime.now()),
    };
    try {
      await _dio.patch('/site-orders/$orderId', data: payload);
      await fetchOrders();
      state = state.copyWith(isSubmitting: false, message: 'Site order acknowledged.');
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        final queued = await _syncService.enqueue(
          endpoint: '/site-orders/$orderId',
          method: 'PATCH',
          payload: payload,
          replaceKey: 'site-order-ack:$orderId',
        );
        if (!queued) {
          state = state.copyWith(isSubmitting: false, error: 'Could not save offline — you may have been signed out. Reconnect and try again.');
          return false;
        }
        state = state.copyWith(isSubmitting: false, message: 'Acknowledgement saved offline.');
        return true;
      }
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Failed to acknowledge the site order.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Failed to acknowledge order: $e');
      return false;
    }
  }

  Future<bool> markComplied(String orderId, String remarks) async {
    if (remarks.trim().isEmpty) {
      state = state.copyWith(error: 'Compliance remarks are required.');
      return false;
    }
    state = state.copyWith(isSubmitting: true, error: null, message: null);
    final payload = {
      'complianceStatus': 'complied',
      'remarks': remarks.trim(),
    };
    try {
      await _dio.patch('/site-orders/$orderId', data: payload);
      await fetchOrders();
      state = state.copyWith(isSubmitting: false, message: 'Compliance action recorded.');
      return true;
    } on DioException catch (error) {
      if (shouldQueueOffline(error)) {
        final queued = await _syncService.enqueue(
          endpoint: '/site-orders/$orderId',
          method: 'PATCH',
          payload: payload,
          replaceKey: 'site-order-comply:$orderId',
        );
        if (!queued) {
          state = state.copyWith(isSubmitting: false, error: 'Could not save offline — you may have been signed out. Reconnect and try again.');
          return false;
        }
        state = state.copyWith(isSubmitting: false, message: 'Compliance saved offline.');
        return true;
      }
      state = state.copyWith(
        isSubmitting: false,
        error: dioErrorMessage(error, 'Failed to mark the site order complied.'),
      );
      return false;
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: 'Failed to comply order: $e');
      return false;
    }
  }
}
