import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Stands in for the platform plugins the app reaches on startup.
///
/// Several screens pull in providers that touch the platform before they draw
/// anything: [SyncService] asks connectivity_plus whether there is a network,
/// and ApiClient reads the saved base URL out of secure storage. Neither has an
/// implementation in a widget test, so both throw MissingPluginException and
/// take the test down before a single pixel is rendered — which looks exactly
/// like a screen defect and is not one.
///
/// Call [installPlatformMocks] from `setUp`.
void installPlatformMocks({bool online = true}) {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  // flutter_secure_storage — the saved API base URL.
  messenger.setMockMethodCallHandler(
    const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
    (call) async => call.method == 'readAll' ? <String, String>{} : null,
  );

  // connectivity_plus — SyncService checks this before flushing its queue.
  messenger.setMockMethodCallHandler(
    const MethodChannel('dev.fluttercommunity.plus/connectivity'),
    (call) async => call.method == 'check' ? [online ? 'wifi' : 'none'] : null,
  );

  // The matching event channel. Without a handler the stream subscription
  // itself throws, which is a separate failure from the check above.
  messenger.setMockStreamHandler(
    const EventChannel('dev.fluttercommunity.plus/connectivity_status'),
    MockStreamHandler.inline(
      onListen: (arguments, sink) => sink.success([online ? 'wifi' : 'none']),
    ),
  );
}

/// Undo, for tests that want the real (absent) plugins back.
void removePlatformMocks() {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(
    const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
    null,
  );
  messenger.setMockMethodCallHandler(
    const MethodChannel('dev.fluttercommunity.plus/connectivity'),
    null,
  );
  messenger.setMockStreamHandler(
    const EventChannel('dev.fluttercommunity.plus/connectivity_status'),
    null,
  );
}
