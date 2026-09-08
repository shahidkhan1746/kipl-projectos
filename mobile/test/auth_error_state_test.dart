import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kipl_projectos/core/auth/auth_provider.dart';
import 'package:kipl_projectos/core/auth/user_model.dart';
import 'package:dio/dio.dart';

/// A failed login used to crash the app to a full-screen Flutter ErrorWidget.
///
/// AuthNotifier sets AsyncValue.error on a failed login and on a failed session
/// restore. currentUserProvider and the router's redirect then read that state,
/// and AsyncValue.value RETHROWS when there is no value — so the error escaped
/// during build. The worker saw a red screen reading "Login failed. Please
/// check your credentials." with no way to dismiss or retry.
///
/// userFromAuthState is the single sanctioned read. These pin its contract.
void main() {
  final user = UserModel(
    id: 'u1',
    name: 'Site Engineer',
    email: 'engineer@kipl.in',
    role: 'engineer',
  );

  group('userFromAuthState', () {
    test('returns null for an errored state instead of throwing', () {
      const errored = AsyncValue<UserModel?>.error(
        'Login failed. Please check your credentials.',
        StackTrace.empty,
      );
      expect(userFromAuthState(errored), isNull);
    });

    test('returns null while loading', () {
      expect(userFromAuthState(const AsyncValue<UserModel?>.loading()), isNull);
    });

    test('returns null for a signed-out state', () {
      expect(userFromAuthState(const AsyncValue<UserModel?>.data(null)), isNull);
    });

    test('returns the user when one is signed in', () {
      expect(userFromAuthState(AsyncValue.data(user))?.id, 'u1');
    });

    test('AsyncValue.value is the trap it exists to avoid', () {
      // If anyone swaps userFromAuthState back to `.value`, the first test
      // above starts throwing — this records why.
      const errored = AsyncValue<UserModel?>.error('boom', StackTrace.empty);
      expect(() => errored.value, throwsA(anything));
    });
  });

  /// A wrong password and a wrong server address used to produce the same
  /// sentence, which sent a site engineer hunting for a credential problem
  /// that did not exist.
  group('login error messages', () {
    DioException err({int? status, dynamic body, DioExceptionType type = DioExceptionType.badResponse}) {
      final req = RequestOptions(path: '/auth/login');
      return DioException(
        requestOptions: req,
        type: type,
        response: status == null
            ? null
            : Response(requestOptions: req, statusCode: status, data: body),
      );
    }

    test('shows the API\'s own rejection when it sends one', () {
      final msg = loginErrorMessageForTest(
        err(status: 401, body: {'statusCode': 401, 'message': 'Invalid credentials'}),
      );
      expect(msg, 'Invalid credentials');
    });

    test('joins a validation message list', () {
      final msg = loginErrorMessageForTest(
        err(status: 400, body: {'message': ['email must be an email', 'password required']}),
      );
      expect(msg, contains('email must be an email'));
      expect(msg, contains('password required'));
    });

    test('names the network as the problem when nothing was reached', () {
      final msg = loginErrorMessageForTest(err(type: DioExceptionType.connectionError));
      expect(msg, contains('Cannot reach'));
      expect(msg, isNot(contains('credentials')));
    });

    test('points at the address when a non-API page answers', () {
      // The exact case behind the field report: something replied, but not the
      // API, so blaming the password would be wrong.
      final msg = loginErrorMessageForTest(err(status: 404, body: '<html>Not Found</html>'));
      expect(msg, contains('404'));
      expect(msg, contains('Server Configuration'));
      expect(msg, isNot(contains('check your credentials')));
    });

    test('distinguishes a slow server from a wrong one', () {
      final msg = loginErrorMessageForTest(err(type: DioExceptionType.receiveTimeout));
      expect(msg, contains('did not respond in time'));
    });
  });
}
