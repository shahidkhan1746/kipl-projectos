import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/dashboard/screens/dashboard_screen.dart';
import '../features/more/screens/more_screen.dart';
import '../features/attendance/screens/attendance_screen.dart';
import '../features/diary/screens/diary_screen.dart';
import '../features/tasks/screens/tasks_screen.dart';
import '../features/fleet/screens/fleet_screen.dart';
import '../features/materials/screens/materials_screen.dart';
import '../features/qa/screens/qa_screen.dart';
import '../features/site_orders/screens/site_orders_screen.dart';
import '../features/team/screens/team_screen.dart';
import '../features/approvals/screens/approvals_screen.dart';
import '../features/site_updates/screens/site_update_screen.dart';
import '../features/leave/screens/leave_screen.dart';
import 'auth/auth_provider.dart';
import 'auth/user_model.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

/// Bridges [authStateProvider] into the [Listenable] go_router refreshes on.
///
/// It exists so the GoRouter can be built exactly ONCE. This provider used to
/// `ref.watch(authStateProvider)` in its body, which handed MaterialApp.router
/// a brand-new GoRouter — and therefore a brand-new RouterDelegate — on every
/// auth transition. A single sign-in pushes at least two of those (loading,
/// then data or error). The replacement delegate builds its Navigator with the
/// same `_rootNavigatorKey`, so the outgoing Navigator was deactivated while
/// the incoming one adopted the key: a GlobalKey reparent, which leaves an
/// InheritedElement holding dependents at the moment it deactivates. Debug
/// builds catch that as
///
///   'package:flutter/src/widgets/framework.dart': Failed assertion:
///   line 6281 pos 12: '_dependents.isEmpty': is not true
///
/// in InheritedElement.debugDeactivated — the red screen site staff hit on
/// sign-in. Rebuilding the router also discarded navigation state and leaked
/// every previous router, none of which were ever disposed.
///
/// Auth state must therefore be read inside redirect(), never captured in the
/// provider body.
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(Ref ref) {
    _subscription = ref.listen<AsyncValue<UserModel?>>(
      authStateProvider,
      (_, __) => notifyListeners(),
    );
  }

  late final ProviderSubscription<AsyncValue<UserModel?>> _subscription;

  @override
  void dispose() {
    _subscription.close();
    super.dispose();
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refreshListenable = _AuthRefreshNotifier(ref);

  final router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);

      // While restoring session, do not redirect
      if (authState.isLoading) return null;

      // Via userFromAuthState, never AsyncValue.value: a failed login puts
      // this state into AsyncValue.error, and `.value` would rethrow it from
      // inside the redirect, crashing the app instead of returning to /login.
      final user = userFromAuthState(authState);
      final isLoggedIn = user != null;
      final isLoginPage = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLoginPage) return '/login';
      if (isLoggedIn && isLoginPage) return '/dashboard';
      if (state.matchedLocation == '/approvals' &&
          user?.isProjectManager != true) {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (ctx, _) => const LoginScreen(),
      ),
      GoRoute(
        path: '/fleet',
        builder: (ctx, _) => const FleetScreen(),
      ),
      GoRoute(
        path: '/materials',
        builder: (ctx, _) => const MaterialsScreen(),
      ),
      GoRoute(
        path: '/qa',
        builder: (ctx, _) => const QaScreen(),
      ),
      GoRoute(
        path: '/site-orders',
        builder: (ctx, _) => const SiteOrdersScreen(),
      ),
      GoRoute(
        path: '/team',
        builder: (ctx, _) => const TeamScreen(),
      ),
      GoRoute(
        path: '/approvals',
        builder: (ctx, _) => const ApprovalsScreen(),
      ),
      GoRoute(
        path: '/site-updates',
        builder: (ctx, _) => const SiteUpdateScreen(),
      ),
      GoRoute(
        path: '/leave',
        builder: (ctx, _) => const LeaveScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return Scaffold(
            body: navigationShell,
            // Ground, indicator, height, elevation and every icon colour used
            // to be set here by hand, in fixed dark values — which meant the
            // one chrome element visible on every screen in the app would have
            // stayed dark when the rest of it went light. navigationBarTheme
            // carries all of it now, correctly per theme.
            bottomNavigationBar: DecoratedBox(
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: Theme.of(context).colorScheme.outlineVariant,
                  ),
                ),
              ),
              child: NavigationBar(
                // The one property the theme cannot set. NavigationBar caps
                // label scaling at 1.3x internally, so at large system text the
                // labels grow into a bar whose height was fixed — giving the
                // cap the same 1.3x of room is what stops them being clipped.
                height: 68 +
                    68 *
                        (MediaQuery.textScalerOf(context).scale(14) / 14 - 1)
                            .clamp(0, 0.3),
                selectedIndex: navigationShell.currentIndex,
                onDestinationSelected: (index) {
                  navigationShell.goBranch(
                    index,
                    initialLocation: index == navigationShell.currentIndex,
                  );
                },
                destinations: const [
                  NavigationDestination(
                    icon: Icon(Icons.dashboard_outlined),
                    selectedIcon: Icon(Icons.dashboard),
                    label: 'Dashboard',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.fingerprint_outlined),
                    selectedIcon: Icon(Icons.fingerprint),
                    label: 'Attendance',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.menu_book_outlined),
                    selectedIcon: Icon(Icons.menu_book),
                    label: 'Diary',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.assignment_outlined),
                    selectedIcon: Icon(Icons.assignment),
                    label: 'Tasks',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.more_horiz),
                    selectedIcon: Icon(Icons.more_horiz),
                    label: 'More',
                  ),
                ],
              ),
            ),
          );
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (ctx, _) => const DashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/attendance',
                builder: (ctx, _) => const AttendanceScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/diary',
                builder: (ctx, _) => const DiaryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/tasks',
                builder: (ctx, _) => const TasksScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/more',
                builder: (ctx, _) => const MoreScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );

  ref.onDispose(() {
    router.dispose();
    refreshListenable.dispose();
  });

  return router;
});
