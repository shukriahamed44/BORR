/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Reservation Notification Provider (`notification_provider.dart`).
 * Polls GET /reservations, diffs each reservation's status against the last
 * status seen on this device (persisted in SharedPreferences) and raises a real
 * local push notification whenever the backend moved a reservation — approved,
 * rejected, expired — or a return falls due within 24 hours.
 *
 * IN SIMPLE WORDS:
 * Watches your reservations in the background and pings you when staff approves,
 * rejects, or when equipment is due back — no Firebase, no server push needed.
 */

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/services/api_service.dart';
import '../../../shared/models/models.dart';

class NotificationProvider extends ChangeNotifier {
  static const _prefsStatuses = 'ammunation_seen_statuses';
  static const _prefsFired = 'ammunation_fired_alerts';

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  final List<NotificationModel> _notifications = [];
  int _unreadCount = 0;

  /// reservationId → last status this device has already told the user about.
  Map<String, String> _seenStatuses = {};

  /// One-shot alert keys (e.g. "<id>:upcoming") so reminders fire only once.
  Set<String> _firedAlerts = {};

  Timer? _poller;
  bool _syncing = false;

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
    final raw = prefs.getString(_prefsStatuses);
    if (raw != null) {
      _seenStatuses = (jsonDecode(raw) as Map).map((k, v) => MapEntry(k.toString(), v.toString()));
    }
    _firedAlerts = (prefs.getStringList(_prefsFired) ?? []).toSet();
  }

  /// Starts polling once a user is logged in. Safe to call more than once.
  void startPolling() {
    if (_poller != null) return;
    syncFromServer();
    // ponytail: 60s poll instead of FCM/websockets — the backend has no push
    // channel, and this keeps the whole feature client-side. Swap for FCM if
    // instant delivery while backgrounded ever matters.
    _poller = Timer.periodic(const Duration(seconds: 60), (_) => syncFromServer());
  }

  void stopPolling() {
    _poller?.cancel();
    _poller = null;
  }

  /// Pulls reservations and raises a notification for anything that changed.
  Future<void> syncFromServer() async {
    if (_syncing) return;
    _syncing = true;
    try {
      final res = await apiService.get('/reservations');
      final reservations = ((res.data['reservations'] ?? []) as List)
          .map((e) => ReservationModel.fromJson(e as Map<String, dynamic>))
          .toList();

      final firstRun = _seenStatuses.isEmpty;

      for (final r in reservations) {
        final previous = _seenStatuses[r.id];
        _seenStatuses[r.id] = r.status;

        // First sync on a device just records the baseline — no notification storm.
        if (firstRun || previous == null || previous == r.status) {
          _checkUpcomingReturn(r);
          continue;
        }

        final message = _messageFor(r);
        if (message != null) {
          await sendNotification(title: message.$1, body: message.$2);
        }
        _checkUpcomingReturn(r);
      }

      await _persist();
    } catch (_) {
      // Offline or logged out — try again on the next tick.
    } finally {
      _syncing = false;
    }
  }

  /// Spec notification types driven by a status transition.
  (String, String)? _messageFor(ReservationModel r) {
    final ref = 'RES-${r.id.substring(0, 8).toUpperCase()}';
    switch (r.status) {
      case 'APPROVED':
        return ('Reservation Approved', 'Your reservation $ref has been approved. Equipment is reserved for you.');
      case 'REJECTED':
        return ('Reservation Rejected', 'Your reservation $ref was rejected. Contact support for details.');
      case 'CANCELLED':
        return ('Reservation Expired', 'Reservation $ref is no longer active — it was cancelled or expired.');
      case 'ACTIVE':
        return ('Equipment Checked Out', 'Equipment for $ref is now in your possession.');
      case 'RETURNED':
        return ('Return Completed', 'Equipment for $ref has been checked back in. Thank you.');
      default:
        return null;
    }
  }

  /// "Upcoming Return" reminder — fires once per reservation, 24h before due.
  void _checkUpcomingReturn(ReservationModel r) {
    if (r.status != 'ACTIVE') return;
    final hoursLeft = r.endDate.difference(DateTime.now()).inHours;
    if (hoursLeft < 0 || hoursLeft > 24) return;

    final key = '${r.id}:upcoming';
    if (_firedAlerts.contains(key)) return;
    _firedAlerts.add(key);

    final ref = 'RES-${r.id.substring(0, 8).toUpperCase()}';
    sendNotification(
      title: 'Upcoming Return',
      body: 'Equipment for $ref is due back within 24 hours.',
    );
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsStatuses, jsonEncode(_seenStatuses));
    await prefs.setStringList(_prefsFired, _firedAlerts.toList());
  }

  /// Clears device state on logout so the next user starts with a clean baseline.
  Future<void> reset() async {
    stopPolling();
    _seenStatuses = {};
    _firedAlerts = {};
    _notifications.clear();
    _unreadCount = 0;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsStatuses);
    await prefs.remove(_prefsFired);
    notifyListeners();
  }

  /// Show a local push notification banner and add it to the inbox.
  Future<void> sendNotification({required String title, required String body}) async {
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

    final id = DateTime.now().millisecondsSinceEpoch.remainder(100000);

    await _plugin.show(
      id,
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
    );

    // ponytail: inbox is in-memory only — the alert itself is delivered by the OS.
    // Persist the list if users start expecting history across restarts.
    _notifications.insert(
      0,
      NotificationModel(
        id: id.toString(),
        title: title,
        body: body,
        receivedAt: DateTime.now(),
        isRead: false,
      ),
    );
    _unreadCount++;
    notifyListeners();
  }

  void markAllRead() {
    for (var i = 0; i < _notifications.length; i++) {
      _notifications[i] = NotificationModel(
        id: _notifications[i].id,
        title: _notifications[i].title,
        body: _notifications[i].body,
        receivedAt: _notifications[i].receivedAt,
        isRead: true,
      );
    }
    _unreadCount = 0;
    notifyListeners();
  }
}
