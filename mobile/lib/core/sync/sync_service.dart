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

/// A failure the server itself issued and will issue again for the same
/// payload. Retrying is pointless: the entry is parked rather than burning
/// retries and sitting in the queue forever. 408 and 429 are excluded — those
/// are "try again", not "never".
bool isPermanentFailure(DioException error) {
  final code = error.response?.statusCode;
  if (code == null) return false;
  if (code == 408 || code == 429) return false;
  return code >= 400 && code < 500;
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

  /// Identifies the real-world record this entry writes, e.g. one diary for
  /// one project on one date. Re-queuing with the same key replaces the
  /// pending entry instead of appending a second one, so editing a record
  /// twice while offline still creates it once.
  final String? replaceKey;

  int retryCount;

  /// 'pending' | 'syncing' | 'failed' | 'blocked'.
  /// 'blocked' is terminal: the server rejected it, or automatic retries are
  /// spent. It stays for the user to inspect and discard — it is never retried
  /// automatically and is reported separately from work still in flight.
  String status;

  /// Why it is blocked, shown to the user.
  String? failureReason;

  OutboxEntry({
    required this.id,
    required this.endpoint,
    this.method = 'POST',
    required this.payload,
    required this.createdAt,
    this.ownerUserId,
    this.serverBaseUrl,
    this.replaceKey,
    this.retryCount = 0,
    this.status = 'pending',
    this.failureReason,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'endpoint': endpoint,
        'method': method,
        'payload': payload,
        'createdAt': createdAt.toIso8601String(),
        'ownerUserId': ownerUserId,
        'serverBaseUrl': serverBaseUrl,
        'replaceKey': replaceKey,
        'retryCount': retryCount,
        'status': status,
        'failureReason': failureReason,
      };

  factory OutboxEntry.fromJson(Map<String, dynamic> json) => OutboxEntry(
        id: json['id'] as String,
        endpoint: json['endpoint'] as String,
        method: json['method'] as String? ?? 'POST',
        payload: Map<String, dynamic>.from(json['payload'] as Map),
        createdAt: DateTime.parse(json['createdAt'] as String),
        ownerUserId: json['ownerUserId'] as String?,
        serverBaseUrl: json['serverBaseUrl'] as String?,
        replaceKey: json['replaceKey'] as String?,
        retryCount: jsonInt(json['retryCount']) ?? 0,
        status: json['status'] as String? ?? 'pending',
        failureReason: json['failureReason'] as String?,
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

  /// Work still expected to sync. Excludes blocked entries so the badge can
  /// reach zero instead of counting failures that will never clear.
  int get pendingCount => queue
      .where((e) =>
          e.status == 'pending' ||
          e.status == 'failed' ||
          e.status == 'syncing')
      .length;

  /// Entries that need a human decision — retry or discard.
  List<OutboxEntry> get blocked =>
      queue.where((e) => e.status == 'blocked').toList();

  int get blockedCount => blocked.length;

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

final syncServiceProvider =
    StateNotifierProvider<SyncService, SyncState>((ref) {
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

  /// Queues a write for later delivery. Returns false when it could not be
  /// queued, so the caller can tell the user the truth instead of reporting a
  /// save that did not happen.
  ///
  /// This NEVER throws. Callers invoke it from inside `on DioException catch`,
  /// and in Dart an exception raised in one catch clause is not caught by a
  /// sibling catch on the same try — it would escape the provider entirely.
  Future<bool> enqueue({
    required String endpoint,
    String method = 'POST',
    required Map<String, dynamic> payload,
    String? replaceKey,
  }) async {
    try {
      await ready;
      if (_ownerUserId == null || _ownerUserId.isEmpty) {
        // The session ended while offline; there is no identity to replay as.
        return false;
      }
      if (method != 'POST' && method != 'PATCH') {
        // flushQueue can only deliver these two. Refuse rather than accept a
        // write that would be silently dropped at flush time.
        return false;
      }

      final entry = OutboxEntry(
        id: 'outbox_${DateTime.now().microsecondsSinceEpoch}',
        endpoint: endpoint,
        method: method,
        payload: payload,
        createdAt: DateTime.now(),
        ownerUserId: _ownerUserId,
        serverBaseUrl: _dio.options.baseUrl,
        replaceKey: replaceKey,
      );

      // Editing the same record twice while offline must not create it twice.
      final updated = <OutboxEntry>[
        for (final e in state.queue)
          if (!(replaceKey != null &&
              e.replaceKey == replaceKey &&
              e.status != 'blocked'))
            e,
        entry,
      ];
      state = state.copyWith(queue: updated);
      await _persistQueue();
      return true;

      // Do not immediately replay: a connectivity transition or explicit sync
      // will deliver it.
    } catch (_) {
      return false;
    }
  }

  /// Removes a blocked entry the user has chosen to abandon.
  Future<void> discardEntry(String id) async {
    state =
        state.copyWith(queue: state.queue.where((e) => e.id != id).toList());
    await _persistQueue();
  }

  /// Puts a blocked entry back in line for one more attempt.
  Future<void> retryEntry(String id) async {
    for (final e in state.queue) {
      if (e.id == id) {
        e.retryCount = 0;
        e.status = 'pending';
        e.failureReason = null;
      }
    }
    state = state.copyWith(queue: List<OutboxEntry>.from(state.queue));
    await _persistQueue();
    await flushQueue();
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
      // Terminal — waiting on the user, not on the network.
      if (entry.status == 'blocked') {
        remaining.add(entry);
        continue;
      }
      if (entry.retryCount >= _maxAutomaticRetries) {
        entry.status = 'blocked';
        entry.failureReason ??=
            'Gave up after $_maxAutomaticRetries attempts. Retry or discard it.';
        remaining.add(entry);
        lastError = 'An offline change could not be synchronized.';
        continue;
      }
      try {
        entry.status = 'syncing';
        switch (entry.method) {
          case 'POST':
            await _dio.post(entry.endpoint, data: entry.payload);
            break;
          case 'PATCH':
            await _dio.patch(entry.endpoint, data: entry.payload);
            break;
          default:
            // Never silently treat an undeliverable entry as delivered.
            entry.status = 'blocked';
            entry.failureReason = 'Unsupported method ${entry.method}.';
            remaining.add(entry);
            lastError = 'An offline change could not be synchronized.';
            continue;
        }
        // Delivered — drop it from the queue.
      } on DioException catch (error) {
        final message = dioErrorMessage(
            error, 'An offline change could not be synchronized.');
        if (isPermanentFailure(error)) {
          // The server rejected it and will reject it again. Park it for the
          // user rather than spending retries on a certain failure.
          entry.status = 'blocked';
          entry.failureReason = message;
        } else {
          entry.retryCount++;
          entry.status = 'failed';
        }
        remaining.add(entry);
        lastError = message;
      } catch (_) {
        entry.retryCount++;
        entry.status = 'failed';
        remaining.add(entry);
        lastError = 'An offline change could not be synchronized.';
      }
    }

    // Keep entries added while the snapshot was being flushed.
    final newlyQueued =
        state.queue.where((entry) => !snapshotIds.contains(entry.id)).toList();

    state = state.copyWith(
      isSyncing: false,
      queue: [...remaining, ...newlyQueued],
      lastError: lastError,
    );
    await _persistQueue();
  }
}
