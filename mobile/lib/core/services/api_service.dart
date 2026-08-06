/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Centralized Dio HTTP API Client Service (`api_service.dart`).
 * Configures a Dio instance with the NestJS backend base URL, request timeout,
 * a Bearer JWT auth interceptor (reads token from SecureStorage), and a global
 * error handler that converts HTTP error responses into readable exceptions.
 *
 * IN SIMPLE WORDS:
 * The HTTP client that talks to the NestJS backend — automatically attaches
 * your login token to every request so you don't have to do it manually.
 */

import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../constants/app_constants.dart';
import 'secure_storage_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // ─── Auth Interceptor ─────────────────────────────────────────────────
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorageService.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          // Access token expired → swap it for a fresh one and replay the request once.
          // `_retried` stops a still-401 replay from refreshing in a loop.
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra['_retried'] != true &&
              !error.requestOptions.path.startsWith('/auth/')) {
            if (await _refreshToken()) {
              try {
                final retry = await _retry(error.requestOptions);
                return handler.resolve(retry);
              } catch (_) {
                // fall through to the normal rejection below
              }
            } else {
              onSessionExpired?.call();
            }
          }

          final message = _parseError(error);
          handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              message: message,
              error: error.error,
              response: error.response,
              type: error.type,
            ),
          );
        },
      ),
    );

    // ─── Request Logger (debug only) ─────────────────────────────────────
    _dio.interceptors.add(
      PrettyDioLogger(
        requestHeader: false,
        requestBody: true,
        responseBody: true,
        error: true,
        compact: true,
      ),
    );
  }

  /// Called when the refresh token itself is dead — AuthProvider hooks this up to log out.
  void Function()? onSessionExpired;

  /// Exchanges the stored refresh token for a new access token.
  /// Uses a bare Dio so the auth/error interceptors above cannot recurse.
  Future<bool> _refreshToken() async {
    final refreshToken = await SecureStorageService.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final res = await Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl))
          .post('/auth/refresh', data: {'refreshToken': refreshToken});
      await SecureStorageService.saveTokens(
        accessToken: res.data['accessToken'] as String,
        refreshToken: res.data['refreshToken'] as String,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Response> _retry(RequestOptions options) async {
    final token = await SecureStorageService.getAccessToken();
    options.headers['Authorization'] = 'Bearer $token';
    options.extra['_retried'] = true;
    return _dio.fetch(options);
  }

  // ─── HTTP Methods ─────────────────────────────────────────────────────────

  Future<Response> get(String path, {Map<String, dynamic>? params}) async {
    return _dio.get(path, queryParameters: params);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return _dio.post(path, data: data);
  }

  Future<Response> patch(String path, {dynamic data}) async {
    return _dio.patch(path, data: data);
  }

  Future<Response> delete(String path) async {
    return _dio.delete(path);
  }

  // ─── Error Parser ─────────────────────────────────────────────────────────

  String _parseError(DioException error) {
    if (error.response?.data is Map) {
      final data = error.response!.data as Map;
      final msg = data['message'];
      if (msg is List) return msg.join(', ');
      if (msg is String) return msg;
    }
    return error.message ?? 'An unexpected error occurred.';
  }
}

// Singleton accessor
final apiService = ApiService();
