/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Notification Provider (`notification_provider.dart`).
 * Reads the authenticated user's durable notification feed from
 * `GET /notifications`, exposes it with an unread tally, raises an OS-level local
 * notification for every row this device has not shown before, and writes read
 * state back through `PATCH /notifications/:id/read` and `/notifications/read-all`.
 *
 * IN SIMPLE WORDS:
 * Fetches your notifications from the server, pings your phone when a new one
 * arrives, and keeps "read"/"unread" in sync with the backend.
 */

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/services/api_service.dart';
import '../../../shared/models/models.dart';

class NotificationProvider extends ChangeNotifier {
  /// Notification ids this device has already raised a banner for. Without it,
  /// every poll would re-notify the whole feed.
  static const _prefsAlerted = 'ammunation_alerted_ids';

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();

  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  Set<String> _alertedIds = {};

  Timer? _poller;
  bool _syncing = false;
  bool _ready = false;

  List<NotificationModel> get notifications => List.unmodifiable(_notifications);
  int get unreadCount => _unreadCount;

  NotificationProvider() {
    _init();
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
  }

  Future<void> _init() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _plugin.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
    );

    final prefs = await SharedPreferences.getInstance();
    _alertedIds = (prefs.getStringList(_prefsAlerted) ?? []).toSet();
    _ready = true;
  }

  /// Starts polling once a user is logged in. Safe to call more than once.
  void startPolling() {
    if (_poller != null) return;
    syncFromServer();
    // ponytail: 60s poll instead of FCM. The backend persists the feed but has no
    // push channel, so this is the whole delivery mechanism. Swap for FCM if
    // alerts need to arrive while the app is backgrounded or killed.
    _poller = Timer.periodic(const Duration(seconds: 60), (_) => syncFromServer());
  }

  void stopPolling() {
    _poller?.cancel();
    _poller = null;
  }

  /// Pulls the feed and raises a banner for every row not seen on this device.
  Future<void> syncFromServer() async {
    if (_syncing) return;
    _syncing = true;
    try {
      final res = await apiService.get('/notifications', params: {'limit': 50});
      final data = res.data as Map<String, dynamic>;

      final incoming = ((data['notifications'] ?? []) as List)
          .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
          .toList();

      // The very first sync on a device records the baseline instead of firing a
      // banner per historical row.
      final firstRun = _alertedIds.isEmpty && _notifications.isEmpty;

      for (final n in incoming) {
        if (_alertedIds.contains(n.id)) continue;
        _alertedIds.add(n.id);
        // Already-read rows are history, never worth a banner.
        if (!firstRun && !n.isRead) {
          await _raiseBanner(n.title, n.body);
        }
      }

      _notifications = incoming;
      _unreadCount = (data['unreadCount'] as num?)?.toInt() ??
          incoming.where((n) => !n.isRead).length;

      await _persistAlerted();
      notifyListeners();
    } catch (_) {
      // Offline or logged out — try again on the next tick.
    } finally {
      _syncing = false;
    }
  }

  /// Marks one notification read on the server, updating the UI immediately.
  Future<void> markRead(String id) async {
    final i = _notifications.indexWhere((n) => n.id == id);
    if (i == -1 || _notifications[i].isRead) return;

    _notifications[i] = _copyRead(_notifications[i]);
    if (_unreadCount > 0) _unreadCount--;
    notifyListeners();

    try {
      await apiService.patch('/notifications/$id/read');
    } catch (_) {
      // The next sync re-reads server truth, so a failed write self-heals.
    }
  }

  Future<void> markAllRead() async {
    if (_unreadCount == 0) return;

    _notifications = _notifications.map(_copyRead).toList();
    _unreadCount = 0;
    notifyListeners();

    try {
      await apiService.patch('/notifications/read-all');
    } catch (_) {
      // Same self-healing as markRead.
    }
  }

  NotificationModel _copyRead(NotificationModel n) => NotificationModel(
        id: n.id,
        title: n.title,
        body: n.body,
        receivedAt: n.receivedAt,
        isRead: true,
        type: n.type,
        entityId: n.entityId,
      );

  Future<void> _persistAlerted() async {
    if (!_ready) return;
    final prefs = await SharedPreferences.getInstance();
    // Keep the tail bounded — only recent ids can still appear in a 50-row feed.
    final ids = _alertedIds.toList();
    final trimmed = ids.length > 200 ? ids.sublist(ids.length - 200) : ids;
    _alertedIds = trimmed.toSet();
    await prefs.setStringList(_prefsAlerted, trimmed);
  }

  /// Clears device state on logout so the next user starts with a clean baseline.
  Future<void> reset() async {
    stopPolling();
    _alertedIds = {};
    _notifications = [];
    _unreadCount = 0;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsAlerted);
    notifyListeners();
  }

  /// Shows an OS notification banner.
  Future<void> _raiseBanner(String title, String body) async {
    const androidDetails = AndroidNotificationDetails(
      'ammunation_channel',
      'AmmuNation Notifications',
      channelDescription: 'Equipment reservation alerts',
      importance: Importance.high,
      priority: Priority.high,
      styleInformation: BigTextStyleInformation(''),
    );
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
    );
  }
}
