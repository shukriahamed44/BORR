/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Authentication State Provider (`auth_provider.dart`).
 * ChangeNotifier managing the current user session — login, logout, token restore.
 * On app start, reads stored tokens from SecureStorage to restore previous session.
 * On login success, stores tokens and user metadata securely.
 *
 * IN SIMPLE WORDS:
 * The global "who is logged in" manager — handles login, logout, and remembering
 * you between app sessions.
 */

import 'package:flutter/material.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/secure_storage_service.dart';
import '../../../shared/models/models.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.unknown;
  UserModel? _user;
  String? _errorMessage;
  bool _isLoading = false;

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isCustomer => _user?.role == 'CUSTOMER';
  bool get isStaff =>
      _user?.role == 'STAFF' ||
      _user?.role == 'ADMIN' ||
      _user?.role == 'WAREHOUSE_OPERATOR';

  // ─── Restore Session on App Start ─────────────────────────────────────────

  Future<void> tryRestoreSession() async {
    final loggedIn = await SecureStorageService.isLoggedIn();
    if (!loggedIn) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    try {
      final response = await apiService.get('/auth/me');
      final userData = response.data['user'] as Map<String, dynamic>;
      _user = UserModel.fromJson(userData);
      _status = AuthStatus.authenticated;
    } catch (_) {
      await SecureStorageService.clearAll();
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await apiService.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      final data = response.data as Map<String, dynamic>;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final userData = data['user'] as Map<String, dynamic>;

      _user = UserModel.fromJson(userData);

      await SecureStorageService.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      await SecureStorageService.saveUserMeta(
        userId: _user!.id,
        userName: _user!.name,
        role: _user!.role,
      );

      _status = AuthStatus.authenticated;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  Future<void> logout() async {
    await SecureStorageService.clearAll();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
