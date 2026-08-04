/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * GoRouter Application Router with Role-Based Guards (`app_router.dart`).
 * Defines all named routes, a redirect guard that prevents unauthenticated access,
 * and role-aware routing that sends CUSTOMER to the catalog shell and
 * STAFF/ADMIN/WAREHOUSE_OPERATOR to the staff shell after login.
 *
 * IN SIMPLE WORDS:
 * The navigation map of the app — handles where you go when you log in
 * based on your role, and blocks you from accessing pages you shouldn't.
 */

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/catalog/screens/catalog_screen.dart';
import '../../features/catalog/screens/product_detail_screen.dart';
import '../../features/reservations/screens/reservations_screen.dart';
import '../../features/reservations/screens/create_reservation_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/qr_scanner/screens/qr_scanner_screen.dart';
import '../../features/staff/screens/staff_reservations_screen.dart';
import '../../shared/screens/splash_screen.dart';
import '../../shared/shells/customer_shell.dart';
import '../../shared/shells/staff_shell.dart';

class AppRouter {
  static GoRouter createRouter(AuthProvider auth) {
    return GoRouter(
      initialLocation: '/',
      refreshListenable: auth,
      redirect: (context, state) {
        final isLoading = auth.status == AuthStatus.unknown;
        final isAuthenticated = auth.status == AuthStatus.authenticated;
        final atLogin = state.matchedLocation == '/login';
        final atSplash = state.matchedLocation == '/';

        if (isLoading) return atSplash ? null : '/';
        if (!isAuthenticated && !atLogin) return '/login';
        if (isAuthenticated && (atLogin || atSplash)) {
          return auth.isCustomer ? '/customer' : '/staff';
        }
        return null;
      },
      routes: [
        // ─── Splash ────────────────────────────────────────────────────────
        GoRoute(
          path: '/',
          builder: (_, __) => const SplashScreen(),
        ),

        // ─── Login ─────────────────────────────────────────────────────────
        GoRoute(
          path: '/login',
          builder: (_, __) => const LoginScreen(),
        ),

        // ─── Customer Shell ────────────────────────────────────────────────
        ShellRoute(
          builder: (context, state, child) => CustomerShell(child: child),
          routes: [
            GoRoute(
              path: '/customer',
              redirect: (_, __) => '/catalog',
            ),
            GoRoute(
              path: '/catalog',
              builder: (_, __) => const CatalogScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  builder: (_, state) => ProductDetailScreen(
                    productId: state.pathParameters['id']!,
                  ),
                ),
              ],
            ),
            GoRoute(
              path: '/reservations',
              builder: (_, __) => const ReservationsScreen(),
              routes: [
                GoRoute(
                  path: 'create',
                  builder: (_, state) {
                    final productId = state.uri.queryParameters['productId'];
                    return CreateReservationScreen(productId: productId);
                  },
                ),
              ],
            ),
            GoRoute(
              path: '/notifications',
              builder: (_, __) => const NotificationsScreen(),
            ),
          ],
        ),

        // ─── Staff Shell ───────────────────────────────────────────────────
        ShellRoute(
          builder: (context, state, child) => StaffShell(child: child),
          routes: [
            GoRoute(
              path: '/staff',
              redirect: (_, __) => '/staff/reservations',
            ),
            GoRoute(
              path: '/staff/reservations',
              builder: (_, __) => const StaffReservationsScreen(),
            ),
            GoRoute(
              path: '/staff/qr-scanner',
              builder: (_, __) => const QrScannerScreen(),
            ),
            GoRoute(
              path: '/staff/notifications',
              builder: (_, __) => const NotificationsScreen(isStaff: true),
            ),
          ],
        ),
      ],
    );
  }
}
