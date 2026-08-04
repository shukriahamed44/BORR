/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Encrypted JWT Token Storage Service (`secure_storage_service.dart`).
 * Wraps FlutterSecureStorage to provide type-safe read/write/delete operations
 * for access tokens, refresh tokens, user role, and user metadata.
 * Uses Android Keystore / iOS Keychain encryption under the hood.
 *
 * IN SIMPLE WORDS:
 * The secure vault that stores your login tokens so they persist across app restarts
 * and cannot be read by other apps.
 */

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  // ─── Write ───────────────────────────────────────────────────────────────

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: AppConstants.keyAccessToken, value: accessToken),
      _storage.write(key: AppConstants.keyRefreshToken, value: refreshToken),
    ]);
  }

  static Future<void> saveUserMeta({
    required String userId,
    required String userName,
    required String role,
  }) async {
    await Future.wait([
      _storage.write(key: AppConstants.keyUserId, value: userId),
      _storage.write(key: AppConstants.keyUserName, value: userName),
      _storage.write(key: AppConstants.keyUserRole, value: role),
    ]);
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  static Future<String?> getAccessToken() async {
    return _storage.read(key: AppConstants.keyAccessToken);
  }

  static Future<String?> getRefreshToken() async {
    return _storage.read(key: AppConstants.keyRefreshToken);
  }

  static Future<String?> getUserRole() async {
    return _storage.read(key: AppConstants.keyUserRole);
  }

  static Future<String?> getUserName() async {
    return _storage.read(key: AppConstants.keyUserName);
  }

  static Future<String?> getUserId() async {
    return _storage.read(key: AppConstants.keyUserId);
  }

  static Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
