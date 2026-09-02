import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';

const kOutboxStorageKey = 'kipl_sync_outbox';

class OutboxEntry {
  final String id;
  final String endpoint;
  final String method; // 'POST' or 'PATCH'
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  int retryCount;
  String status; // 'pending', 'syncing', 'failed'

  OutboxEntry({
    required this.id,
    required this.endpoint,
    this.method = 'POST',
    required this.payload,
    required this.createdAt,
    this.retryCount = 0,
    this.status = 'pending',
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'endpoint': endpoint,
    'method': method,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'retryCount': retryCount,
    'status': status,
  };

  factory OutboxEntry.fromJson(Map<String, dynamic> json) => OutboxEntry(
    id: json['id'] as String,
    endpoint: json['endpoint'] as String,
    method: json['method'] as String? ?? 'POST',
    payload: Map<String, dynamic>.from(json['payload'] as Map),
    createdAt: DateTime.parse(json['createdAt'] as String),
    retryCount: json['retryCount'] as int? ?? 0,
    status: json['status'] as String? ?? 'pending',
  );
}

class SyncState {
  final bool isOnline;
  final bool isSyncing;
  final List<OutboxEntry> queue;
  final String? lastError;

  const SyncState({
    this.isOnline = true,
    this.isSyncing = false,
    this.queue = const [],
    this.lastError,
  });

  int get pendingCount => queue.where((e) => e.status == 'pending' || e.status == 'failed').length;

  SyncState copyWith({
    bool? isOnline,
    bool? isSyncing,
    List<OutboxEntry>? queue,
    String? lastError,
  }) {
    return SyncState(
      isOnline: isOnline ?? this.isOnline,
      isSyncing: isSyncing ?? this.isSyncing,
      queue: queue ?? this.queue,
      lastError: lastError,
    );
  }
}

final syncServiceProvider = StateNotifierProvider<SyncService, SyncState>((ref) {
  final dio = ref.watch(dioProvider);
  final storage = ref.watch(storageProvider);
  return SyncService(dio, storage);
});

class SyncService extends StateNotifier<SyncState> {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  final Connectivity _connectivity = Connectivity();

  SyncService(this._dio, this._storage) : super(const SyncState()) {
    _init();
  }

  Future<void> _init() async {
    await _loadQueue();
    await _checkConnectivity();

    // Listen for network changes to auto-flush
    _connectivity.onConnectivityChanged.listen((results) {
      final hasNet = !results.contains(ConnectivityResult.none);
      state = state.copyWith(isOnline: hasNet);
      if (hasNet && state.pendingCount > 0) {
        flushQueue();
      }
    });
  }

  Future<void> _checkConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    final hasNet = !results.contains(ConnectivityResult.none);
    state = state.copyWith(isOnline: hasNet);
  }

  Future<void> _loadQueue() async {
    try {
      final raw = await _storage.read(key: kOutboxStorageKey);
      if (raw != null && raw.isNotEmpty) {
        final List list = jsonDecode(raw);
        final queue = list.map((item) => OutboxEntry.fromJson(item)).toList();
        state = state.copyWith(queue: queue);
      }
    } catch (_) {}
  }

  Future<void> _persistQueue() async {
    try {
      final jsonStr = jsonEncode(state.queue.map((e) => e.toJson()).toList());
      await _storage.write(key: kOutboxStorageKey, value: jsonStr);
    } catch (_) {}
  }

  Future<void> enqueue({
    required String endpoint,
    String method = 'POST',
    required Map<String, dynamic> payload,
  }) async {
    final entry = OutboxEntry(
      id: 'outbox_${DateTime.now().millisecondsSinceEpoch}',
      endpoint: endpoint,
      method: method,
      payload: payload,
      createdAt: DateTime.now(),
    );

    final updated = [...state.queue, entry];
    state = state.copyWith(queue: updated);
    await _persistQueue();

    if (state.isOnline) {
      flushQueue();
    }
  }

  Future<void> flushQueue() async {
    if (state.isSyncing || state.queue.isEmpty) return;
    state = state.copyWith(isSyncing: true, lastError: null);

    final remaining = <OutboxEntry>[];

    for (final entry in state.queue) {
      try {
        entry.status = 'syncing';
        if (entry.method == 'POST') {
          await _dio.post(entry.endpoint, data: entry.payload);
        } else if (entry.method == 'PATCH') {
          await _dio.patch(entry.endpoint, data: entry.payload);
        }
        // Successfully synced, don't keep in remaining
      } catch (e) {
        entry.retryCount++;
        entry.status = 'failed';
        remaining.add(entry);
      }
    }

    state = state.copyWith(
      isSyncing: false,
      queue: remaining,
    );
    await _persistQueue();
  }
}
