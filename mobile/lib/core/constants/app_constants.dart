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
  // A real device is not on the emulator's loopback alias, so the host must be
  // overridable at launch:
  //   flutter run --dart-define=API_BASE_URL=http://192.168.1.5:3000/api/v1
  // Falling back to localhost on web and the 10.0.2.2 emulator alias on Android.
  static const String _override = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    if (_override.isNotEmpty) return _override;
    // 10.0.2.2 is the Android *emulator's* alias for the host loopback. It means
    // nothing on a physical phone, and nothing on web/desktop/iOS-sim either,
    // where the host is plain localhost. A real device needs the dart-define.
    final onAndroid = !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
    // 127.0.0.1 rather than localhost: under WSL the API is relayed to the IPv4
    // loopback only, and `localhost` resolves to [::1] first.
    return onAndroid
        ? 'http://10.0.2.2:3000/api/v1'
        : 'http://127.0.0.1:3000/api/v1';
  }

  /// Absolute URL for a backend asset path like `/equipment/tl-drill-001.jpg`.
  /// Static files sit at the server root, outside the `/api/v1` prefix.
  static String? assetUrl(String? path) {
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http')) return path;
    final origin = Uri.parse(apiBaseUrl).origin;
    return '$origin${path.startsWith('/') ? '' : '/'}$path';
  }

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
  // Keys must match the backend `ReservationStatus` Prisma enum exactly.
  static const Map<String, String> statusLabels = {
    'PENDING': 'Pending',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'ACTIVE': 'Active',
    'RETURNED': 'Returned',
    'CANCELLED': 'Cancelled',
  };

  static const List<String> reservationStatuses = [
    'PENDING',
    'APPROVED',
    'REJECTED',
    'ACTIVE',
    'RETURNED',
    'CANCELLED',
  ];

  /// Mirrors the backend reservation state machine
  /// (`ReservationsService.validateStatusTransition`) so the UI never offers a
  /// move the API will reject with a 400. RETURNED/REJECTED/CANCELLED are terminal.
  static const Map<String, List<String>> allowedTransitions = {
    'PENDING': ['APPROVED', 'REJECTED', 'CANCELLED'],
    'APPROVED': ['ACTIVE', 'CANCELLED'],
    'ACTIVE': ['RETURNED'],
    'RETURNED': <String>[],
    'REJECTED': <String>[],
    'CANCELLED': <String>[],
  };

  static List<String> nextStatuses(String current) =>
      allowedTransitions[current] ?? const [];
}
