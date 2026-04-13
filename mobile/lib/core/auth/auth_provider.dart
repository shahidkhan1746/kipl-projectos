import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final _storage = FlutterSecureStorage();

// Holds the current user — null means logged out
final authStateProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final token = await _storage.read(key: 'access_token');
  if (token == null) return null;
  // In a real app, decode the JWT to get user info
  // For now just return a non-null value to indicate logged in
  return {'token': token};
});

final authActionsProvider = Provider((ref) => AuthActions(ref));

class AuthActions {
  final Ref _ref;
  AuthActions(this._ref);

  Future<void> logout() async {
    await _storage.deleteAll();
    _ref.invalidate(authStateProvider);
  }
}
