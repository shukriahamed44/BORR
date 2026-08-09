/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Staff Bottom Navigation Shell (`staff_shell.dart`).
 * Wraps the staff-facing screens in the shared floating frosted tab bar with tabs
 * for Reservations, the QR Scanner, and Alerts. Restricted by the GoRouter guard
 * to STAFF / ADMIN / WAREHOUSE_OPERATOR.
 *
 * IN SIMPLE WORDS:
 * The floating tab bar staff see, with Reservations, Scanner and Alerts.
 */

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/notifications/providers/notification_provider.dart';
import '../widgets/app_tab_bar.dart';

class StaffShell extends StatelessWidget {
  final Widget child;
  const StaffShell({super.key, required this.child});

  int _selectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/staff/qr-scanner')) return 1;
    if (location.startsWith('/staff/notifications')) return 2;
    return 0; // reservations
  }

  @override
  Widget build(BuildContext context) {
    final unread = context.select<NotificationProvider, int>((n) => n.unreadCount);
    final role = context.select<AuthProvider, String?>((a) => a.user?.role);

    final tabs = [
      const AppTab(
        icon: Icons.assignment_outlined,
        activeIcon: Icons.assignment_rounded,
        label: 'Requests',
        route: '/staff/reservations',
      ),
      const AppTab(
        icon: Icons.qr_code_scanner_outlined,
        activeIcon: Icons.qr_code_scanner_rounded,
        label: 'Scan',
        route: '/staff/qr-scanner',
      ),
      AppTab(
        icon: Icons.notifications_none_rounded,
        activeIcon: Icons.notifications_rounded,
        label: role == 'WAREHOUSE_OPERATOR' ? 'Warehouse' : 'Alerts',
        route: '/staff/notifications',
        badge: unread,
      ),
    ];

    return Scaffold(
      extendBody: true,
      body: child,
      bottomNavigationBar: AppTabBar(
        tabs: tabs,
        currentIndex: _selectedIndex(context),
        onTap: (i) => context.go(tabs[i].route),
      ),
    );
  }
}
