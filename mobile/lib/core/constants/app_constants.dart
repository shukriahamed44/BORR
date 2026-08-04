/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Global Application Constants (`app_constants.dart`).
 * Centralized definition of the NestJS backend base URL, route name strings,
 * and shared configuration values used throughout the Flutter application.
 *
 * IN SIMPLE WORDS:
 * One place to set the backend URL and all navigation route names.
 */

import 'package:flutter/foundation.dart';

class AppConstants {
  // ─── Backend API ─────────────────────────────────────────────────────────
  // Web/Chrome uses localhost:3000, Android emulator uses 10.0.2.2:3000
  static String get apiBaseUrl =>
      kIsWeb ? 'http://localhost:3000/api/v1' : 'http://10.0.2.2:3000/api/v1';

  // ─── Secure Storage Keys ─────────────────────────────────────────────────
  static const String keyAccessToken = 'ammunation_access_token';
  static const String keyRefreshToken = 'ammunation_refresh_token';
  static const String keyUserRole = 'ammunation_user_role';
  static const String keyUserName = 'ammunation_user_name';
  static const String keyUserId = 'ammunation_user_id';

  // ─── Route Names ─────────────────────────────────────────────────────────
  static const String routeLogin = '/login';
  static const String routeCustomerHome = '/customer';
  static const String routeStaffHome = '/staff';
  static const String routeCatalog = '/catalog';
  static const String routeProductDetail = '/catalog/:id';
  static const String routeReservations = '/reservations';
  static const String routeCreateReservation = '/reservations/create';
  static const String routeNotifications = '/notifications';
  static const String routeQrScanner = '/qr-scanner';

  // ─── Reservation Status Labels ───────────────────────────────────────────
  static const Map<String, String> statusLabels = {
    'PENDING': 'Pending',
    'CONFIRMED': 'Confirmed',
    'ACTIVE': 'Active',
    'COMPLETED': 'Completed',
    'CANCELLED': 'Cancelled',
  };
}
