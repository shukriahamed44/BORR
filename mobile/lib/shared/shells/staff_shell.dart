/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Staff Bottom Navigation Shell (`staff_shell.dart`).
 * Wraps staff-facing screens (Reservations, QR Scanner, Notifications) in a
 * persistent bottom navigation bar. Only accessible to STAFF, ADMIN, and
 * WAREHOUSE_OPERATOR roles — enforced by GoRouter redirect in app_router.dart.
 *
 * IN SIMPLE WORDS:
 * The bottom navigation bar for Staff — Reservations, QR Scanner, and Notifications.
 */

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../features/auth/providers/auth_provider.dart';

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
    final auth = context.watch<AuthProvider>();
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
                context.go('/staff/reservations');
                break;
              case 1:
                context.go('/staff/qr-scanner');
                break;
              case 2:
                context.go('/staff/notifications');
                break;
            }
          },
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.assignment_outlined),
              activeIcon: Icon(Icons.assignment_rounded),
              label: 'Reservations',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.qr_code_scanner_outlined),
              activeIcon: Icon(Icons.qr_code_scanner_rounded),
              label: 'QR Scanner',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.notifications_outlined),
              activeIcon: const Icon(Icons.notifications_rounded),
              label: auth.user?.role == 'STAFF' ? 'Staff Alerts' : 'Warehouse',
            ),
          ],
        ),
      ),
    );
  }
}
