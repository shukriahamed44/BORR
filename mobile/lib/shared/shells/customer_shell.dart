/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Customer Bottom Navigation Shell (`customer_shell.dart`).
 * StatefulWidget wrapping the customer-facing screens in a persistent bottom
 * navigation bar with tabs for Catalog, Reservations, and Notifications.
 * Uses GoRouter ShellRoute — child is the active tab's screen.
 *
 * IN SIMPLE WORDS:
 * The bottom navigation bar that customers see with Catalog, Reservations, and Notification tabs.
 */

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

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
    final idx = _selectedIndex(context);
    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppTheme.borderSubtle)),
        ),
        child: BottomNavigationBar(
          currentIndex: idx,
          onTap: (i) {
            switch (i) {
              case 0:
                context.go('/catalog');
                break;
              case 1:
                context.go('/reservations');
                break;
              case 2:
                context.go('/notifications');
                break;
            }
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_rounded),
              activeIcon: Icon(Icons.grid_view_rounded),
              label: 'Catalog',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined),
              activeIcon: Icon(Icons.receipt_long_rounded),
              label: 'Reservations',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.notifications_outlined),
              activeIcon: Icon(Icons.notifications_rounded),
              label: 'Notifications',
            ),
          ],
        ),
      ),
    );
  }
}
