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

  /// Writes are sequential, never `Future.wait`. On web the vault derives its
  /// AES key on first write, so parallel writes each generate a key and the last
  /// one wins — every value written under an earlier key then fails to decrypt,
  /// which reads as "logged in, but the token vanished".
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: AppConstants.keyAccessToken, value: accessToken);
    await _storage.write(key: AppConstants.keyRefreshToken, value: refreshToken);
  }

  static Future<void> saveUserMeta({
    required String userId,
    required String userName,
    required String role,
  }) async {
    await _storage.write(key: AppConstants.keyUserId, value: userId);
    await _storage.write(key: AppConstants.keyUserName, value: userName);
    await _storage.write(key: AppConstants.keyUserRole, value: role);
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  /// ponytail: on web the vault is AES-GCM in localStorage — a key/ciphertext
  /// mismatch throws `OperationError` and poisons every request. Wipe and treat
  /// as logged out instead of letting it escape into the Dio interceptor.
  static Future<String?> _read(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      await clearAll();
      return null;
    }
  }

  static Future<String?> getAccessToken() => _read(AppConstants.keyAccessToken);

  static Future<String?> getRefreshToken() =>
      _read(AppConstants.keyRefreshToken);

  static Future<String?> getUserRole() => _read(AppConstants.keyUserRole);

  static Future<String?> getUserName() => _read(AppConstants.keyUserName);

  static Future<String?> getUserId() => _read(AppConstants.keyUserId);

  static Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
