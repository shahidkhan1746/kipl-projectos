import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/dashboard/screens/dashboard_screen.dart';
import '../features/attendance/screens/attendance_screen.dart';
import '../features/site_updates/screens/site_update_screen.dart';
import '../features/tasks/screens/tasks_screen.dart';
import 'auth/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggedIn = authState.value != null;
      final isLoginPage = state.matchedLocation == '/login';
      if (!isLoggedIn && !isLoginPage) return '/login';
      if (isLoggedIn && isLoginPage) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login',       builder: (ctx, _) => const LoginScreen()),
      GoRoute(path: '/dashboard',   builder: (ctx, _) => const DashboardScreen()),
      GoRoute(path: '/attendance',  builder: (ctx, _) => const AttendanceScreen()),
      GoRoute(path: '/site-update', builder: (ctx, _) => const SiteUpdateScreen()),
      GoRoute(path: '/tasks',       builder: (ctx, _) => const TasksScreen()),
    ],
  );
});
