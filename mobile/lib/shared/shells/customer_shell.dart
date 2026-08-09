/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Customer Bottom Navigation Shell (`customer_shell.dart`).
 * Wraps the customer-facing screens in the shared floating frosted tab bar with
 * tabs for Catalog, Reservations, and Notifications (unread-badged).
 * Uses GoRouter ShellRoute — child is the active tab's screen.
 *
 * IN SIMPLE WORDS:
 * The floating tab bar customers see, with Catalog, Reservations and Notifications.
 */

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../features/notifications/providers/notification_provider.dart';
import '../widgets/app_tab_bar.dart';

class CustomerShell extends StatelessWidget {
  final Widget child;
  const CustomerShell({super.key, required this.child});

  int _selectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/reservations')) return 1;
    if (location.startsWith('/notifications')) return 2;
    return 0; // catalog
  }

  @override
  Widget build(BuildContext context) {
    final unread = context.select<NotificationProvider, int>((n) => n.unreadCount);
    final tabs = [
      const AppTab(
        icon: Icons.grid_view_outlined,
        activeIcon: Icons.grid_view_rounded,
        label: 'Catalog',
        route: '/catalog',
      ),
      const AppTab(
        icon: Icons.receipt_long_outlined,
        activeIcon: Icons.receipt_long_rounded,
        label: 'Bookings',
        route: '/reservations',
      ),
      AppTab(
        icon: Icons.notifications_none_rounded,
        activeIcon: Icons.notifications_rounded,
        label: 'Alerts',
        route: '/notifications',
        badge: unread,
      ),
    ];

    return Scaffold(
      // The tab bar floats, so content runs beneath it.
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
