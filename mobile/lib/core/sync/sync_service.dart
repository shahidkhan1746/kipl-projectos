import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';
import '../auth/auth_provider.dart';
import '../utils/json_parsers.dart';

const kOutboxStorageKey = 'kipl_sync_outbox';
const _maxAutomaticRetries = 5;

bool shouldQueueOffline(DioException error) {
  // Only queue failures where the request was not delivered. Send/receive
  // timeouts are ambiguous: the server may already have committed a POST, and
  // replaying it later can create duplicate operational records.
  return error.type == DioExceptionType.connectionError ||
      error.type == DioExceptionType.connectionTimeout;
}

String dioErrorMessage(DioException error, String fallback) {
  final data = error.response?.data;
  if (data is Map && data['message'] != null) {
    final message = data['message'];
    return message is List ? message.join(', ') : message.toString();
  }
  return fallback;
}

class OutboxEntry {
  final String id;
  final String endpoint;
  final String method; // 'POST' or 'PATCH'
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final String? ownerUserId;
  final String? serverBaseUrl;
  int retryCount;
  String status; // 'pending', 'syncing', 'failed'

  OutboxEntry({
    required this.id,
    required this.endpoint,
    this.method = 'POST',
    required this.payload,
    required this.createdAt,
    this.ownerUserId,
    this.serverBaseUrl,
    this.retryCount = 0,
    this.status = 'pending',
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'endpoint': endpoint,
    'method': method,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'ownerUserId': ownerUserId,
    'serverBaseUrl': serverBaseUrl,
    'retryCount': retryCount,
    'status': status,
  };

  factory OutboxEntry.fromJson(Map<String, dynamic> json) => OutboxEntry(
    id: json['id'] as String,
    endpoint: json['endpoint'] as String,
    method: json['method'] as String? ?? 'POST',
    payload: Map<String, dynamic>.from(json['payload'] as Map),
    createdAt: DateTime.parse(json['createdAt'] as String),
    ownerUserId: json['ownerUserId'] as String?,
    serverBaseUrl: json['serverBaseUrl'] as String?,
    retryCount: jsonInt(json['retryCount']) ?? 0,
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
  final userId = ref.watch(currentUserProvider)?.id;
  return SyncService(dio, storage, userId);
});

class SyncService extends StateNotifier<SyncState> {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  final String? _ownerUserId;
  final Connectivity _connectivity = Connectivity();
  late final Future<void> ready;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  List<OutboxEntry> _otherScopes = const [];

  SyncService(this._dio, this._storage, this._ownerUserId)
      : super(const SyncState()) {
    ready = _init();
  }

  Future<void> _init() async {
    await _loadQueue();
    await _checkConnectivity();

    // Listen for network changes to auto-flush
    _connectivitySubscription =
        _connectivity.onConnectivityChanged.listen((results) {
      final hasNet = !results.contains(ConnectivityResult.none);
      state = state.copyWith(isOnline: hasNet);
      if (hasNet && state.pendingCount > 0) {
        flushQueue();
      }
    });
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
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
        final allEntries = list
            .whereType<Map>()
            .map((item) => OutboxEntry.fromJson(
                  Map<String, dynamic>.from(item),
                ))
            .toList();
        final currentServer = _dio.options.baseUrl;
        final queue = <OutboxEntry>[];
        final otherScopes = <OutboxEntry>[];
        for (final entry in allEntries) {
          if (_ownerUserId != null &&
              entry.ownerUserId == _ownerUserId &&
              entry.serverBaseUrl == currentServer) {
            queue.add(entry);
          } else {
            // Legacy and other-account/server entries are retained, but never
            // replayed under the current identity.
            otherScopes.add(entry);
          }
        }
        _otherScopes = otherScopes;
        state = state.copyWith(
          queue: queue,
          lastError: otherScopes.isEmpty
              ? null
              : 'Some older offline changes are isolated to another account or server.',
        );
      }
    } catch (_) {}
  }

  Future<void> _persistQueue() async {
    try {
      final allEntries = [..._otherScopes, ...state.queue];
      final jsonStr = jsonEncode(allEntries.map((e) => e.toJson()).toList());
      await _storage.write(key: kOutboxStorageKey, value: jsonStr);
    } catch (_) {}
  }

  Future<void> enqueue({
    required String endpoint,
    String method = 'POST',
    required Map<String, dynamic> payload,
  }) async {
    await ready;
    if (_ownerUserId == null || _ownerUserId!.isEmpty) {
      throw StateError('Cannot queue an offline change without a signed-in user.');
    }
    final entry = OutboxEntry(
      id: 'outbox_${DateTime.now().microsecondsSinceEpoch}',
      endpoint: endpoint,
      method: method,
      payload: payload,
      createdAt: DateTime.now(),
      ownerUserId: _ownerUserId,
      serverBaseUrl: _dio.options.baseUrl,
    );

    final updated = [...state.queue, entry];
    state = state.copyWith(queue: updated);
    await _persistQueue();

    // Do not immediately replay a timed-out request: the server may already
    // have committed it. A connectivity transition or explicit sync will retry.
  }

  Future<void> flushQueue() async {
    await ready;
    if (state.isSyncing || state.queue.isEmpty) return;
    state = state.copyWith(isSyncing: true, lastError: null);

    final remaining = <OutboxEntry>[];
    final snapshot = List<OutboxEntry>.from(state.queue);
    final snapshotIds = snapshot.map((entry) => entry.id).toSet();
    String? lastError;

    for (final entry in snapshot) {
      if (entry.retryCount >= _maxAutomaticRetries) {
        remaining.add(entry);
        continue;
      }
      try {
        entry.status = 'syncing';
        if (entry.method == 'POST') {
          await _dio.post(entry.endpoint, data: entry.payload);
        } else if (entry.method == 'PATCH') {
          await _dio.patch(entry.endpoint, data: entry.payload);
        }
        // Successfully synced, don't keep in remaining
      } on DioException catch (error) {
        entry.retryCount++;
        entry.status = 'failed';
        remaining.add(entry);
        lastError = dioErrorMessage(error, 'An offline change could not be synchronized.');
      } catch (_) {
        entry.retryCount++;
        entry.status = 'failed';
        remaining.add(entry);
        lastError = 'An offline change could not be synchronized.';
      }
    }

    // Keep entries added while the snapshot was being flushed.
    final newlyQueued = state.queue
        .where((entry) => !snapshotIds.contains(entry.id))
        .toList();

    state = state.copyWith(
      isSyncing: false,
      queue: [...remaining, ...newlyQueued],
      lastError: lastError,
    );
    await _persistQueue();
  }
}
