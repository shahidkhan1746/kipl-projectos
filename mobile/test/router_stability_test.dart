import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kipl_projectos/core/api/api_client.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/router.dart';

/// routerProvider used to `ref.watch(authStateProvider)` in its body, so every
/// auth transition produced a NEW GoRouter. MaterialApp.router then swapped in
/// a new RouterDelegate whose Navigator carries the same GlobalKey, which
/// reparents the Navigator: the outgoing element deactivates while the
/// incoming one adopts the key, leaving an InheritedElement holding dependents
/// as it goes down. Debug builds abort with
///
///   'package:flutter/src/widgets/framework.dart': Failed assertion:
///   line 6281 pos 12: '_dependents.isEmpty': is not true
///
/// which is the red screen site staff hit when they signed in. A single login
/// pushes at least two transitions (loading, then data or error), so this was
/// not a rare race.
///
/// The router must therefore be built once and refreshed through a listenable.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final store = <String, String>{};

  setUp(() {
    store.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async {
        final args = Map<String, dynamic>.from(call.arguments as Map);
        switch (call.method) {
          case 'read':
            return store[args['key'] as String];
          case 'write':
            store[args['key'] as String] = args['value'] as String;
            return null;
          case 'delete':
            store.remove(args['key'] as String);
            return null;
          case 'readAll':
            return Map<String, String>.from(store);
          case 'deleteAll':
            store.clear();
            return null;
          case 'containsKey':
            return store.containsKey(args['key'] as String);
        }
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      null,
    );
  });

  test('the GoRouter is the same instance after a failed sign-in', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final api = container.read(apiClientProvider);
    await api.ready;
    // Every request is rejected locally, so the transition is deterministic
    // and no network is touched.
    api.dio.httpClientAdapter = _RejectingAdapter();

    final before = container.read(routerProvider);

    final signedIn = await container
        .read(authStateProvider.notifier)
        .login('engineer@kipl.in', 'wrong-password');

    expect(signedIn, isFalse);
    expect(container.read(authStateProvider).hasError, isTrue,
        reason: 'the auth state must actually have changed for this to prove '
            'anything');

    expect(
      identical(before, container.read(routerProvider)),
      isTrue,
      reason: 'A rebuilt GoRouter reuses the navigator GlobalKey and reparents '
          'the Navigator — that is the _dependents.isEmpty crash.',
    );
  });

  test('the GoRouter is the same instance after signing out', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final api = container.read(apiClientProvider);
    await api.ready;
    api.dio.httpClientAdapter = _RejectingAdapter();

    store[kAccessTokenStorageKey] = 'stale-token';
    store[kRefreshTokenStorageKey] = 'stale-refresh';

    final before = container.read(routerProvider);
    await container.read(authStateProvider.notifier).logout();

    expect(store[kAccessTokenStorageKey], isNull);
    expect(identical(before, container.read(routerProvider)), isTrue);
  });
}

/// Answers every request with the API's own 401 shape, offline.
class _RejectingAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      '{"statusCode":401,"message":"Invalid credentials"}',
      401,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
