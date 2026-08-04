/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Local Push Notification Provider (`notification_provider.dart`).
 * Manages an in-memory notification inbox for the app. Simulates receiving
 * push notifications using flutter_local_notifications (no Firebase needed).
 * Staff and customers can receive role-based notification messages.
 *
 * IN SIMPLE WORDS:
 * Manages the in-app notification list — adds notifications and tracks unread count.
 */

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../../../shared/models/models.dart';

class NotificationProvider extends ChangeNotifier {
  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  final List<NotificationModel> _notifications = [];
  int _unreadCount = 0;

  List<NotificationModel> get notifications => List.unmodifiable(_notifications);
  int get unreadCount => _unreadCount;

  NotificationProvider() {
    _init();
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

    // Seed with initial notifications for demo
    _seedDemoNotifications();
  }

  void _seedDemoNotifications() {
    final now = DateTime.now();
    _notifications.addAll([
      NotificationModel(
        id: '1',
        title: 'Reservation Approved',
        body: 'Your reservation RES-A1B2C3 has been confirmed by staff.',
        receivedAt: now.subtract(const Duration(minutes: 15)),
        isRead: false,
      ),
      NotificationModel(
        id: '2',
        title: 'Equipment Ready',
        body: 'Your reserved equipment is ready for pickup at Warehouse B.',
        receivedAt: now.subtract(const Duration(hours: 2)),
        isRead: false,
      ),
      NotificationModel(
        id: '3',
        title: 'Reservation Reminder',
        body: 'Your reservation starts tomorrow. Please arrive on time.',
        receivedAt: now.subtract(const Duration(hours: 6)),
        isRead: true,
      ),
    ]);
    _unreadCount = _notifications.where((n) => !n.isRead).length;
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
