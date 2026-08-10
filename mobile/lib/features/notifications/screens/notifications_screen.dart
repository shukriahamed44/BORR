/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Notification Inbox Screen (`notifications_screen.dart`).
 * Renders the alert inbox for both Customer and Staff roles — relative
 * timestamps, unread emphasis, a manual sync against the reservations feed and a
 * mark-all-read action.
 *
 * IN SIMPLE WORDS:
 * The alerts page — every booking update the app has told you about, newest first.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/glass.dart';
import '../providers/notification_provider.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('dd MMM').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();
    final notifications = provider.notifications;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Alerts',
                            style: Theme.of(context).textTheme.displayMedium),
                        const SizedBox(height: 2),
                        Text(
                          provider.unreadCount > 0
                              ? '${provider.unreadCount} unread'
                              : 'You are all caught up',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  GlassIconButton(
                    icon: Icons.sync_rounded,
                    onPressed: provider.syncFromServer,
                  ),
                ],
              ),
            ),

            if (provider.unreadCount > 0)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: provider.markAllRead,
                    icon: const Icon(Icons.done_all_rounded, size: 17),
                    label: const Text('Mark all read'),
                  ),
                ),
              ),

            Expanded(
              child: notifications.isEmpty
                  ? const EmptyState(
                      icon: Icons.notifications_none_rounded,
                      title: 'No alerts yet',
                      message:
                          'Approvals, rejections and return reminders land here automatically.',
                    )
                  : RefreshIndicator(
                      onRefresh: provider.syncFromServer,
                      color: AppTheme.primary,
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
                        itemCount: notifications.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) => GestureDetector(
                          onTap: () => provider.markRead(notifications[i].id),
                          child: _NotificationTile(
                            notification: notifications[i],
                            relativeTime: _relativeTime(notifications[i].receivedAt),
                          ),
                        )
                            .animate(delay: Duration(milliseconds: i * 50))
                            .fadeIn(duration: 280.ms)
                            .slideY(begin: 0.06, end: 0),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final NotificationModel notification;
  final String relativeTime;

  const _NotificationTile({required this.notification, required this.relativeTime});

  /// Icon and tint come from the backend `NotificationType` where present, and
  /// fall back to the subject line for locally-raised alerts that carry no type.
  (IconData, Color) get _visual {
    switch (notification.type) {
      case 'RESERVATION_APPROVED':
        return (Icons.check_circle_rounded, AppTheme.accent);
      case 'RESERVATION_REJECTED':
        return (Icons.cancel_rounded, AppTheme.danger);
      case 'RESERVATION_EXPIRED':
        return (Icons.history_toggle_off_rounded, AppTheme.danger);
      case 'UPCOMING_RETURN':
        return (Icons.schedule_rounded, AppTheme.warning);
      case 'PAYMENT_RECEIVED':
        return (Icons.payments_rounded, AppTheme.accent);
      case 'DOCUMENT_VERIFIED':
        return (Icons.verified_rounded, AppTheme.primary);
    }

    final title = notification.title.toLowerCase();
    if (title.contains('approved')) return (Icons.check_circle_rounded, AppTheme.accent);
    if (title.contains('rejected')) return (Icons.cancel_rounded, AppTheme.danger);
    if (title.contains('expired')) return (Icons.history_toggle_off_rounded, AppTheme.danger);
    if (title.contains('upcoming')) return (Icons.schedule_rounded, AppTheme.warning);
    if (title.contains('checked out')) return (Icons.outbox_rounded, AppTheme.primary);
    if (title.contains('return')) return (Icons.assignment_turned_in_rounded, AppTheme.accent);
    return (Icons.notifications_rounded, AppTheme.primary);
  }

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _visual;
    final unread = !notification.isRead;

    return AppCard(
      padding: const EdgeInsets.all(14),
      border: unread
          ? Border.all(color: AppTheme.primary.withOpacity(0.25), width: 1.2)
          : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(notification.title,
                          style: Theme.of(context).textTheme.titleLarge),
                    ),
                    Text(relativeTime,
                        style: Theme.of(context).textTheme.labelSmall),
                  ],
                ),
                const SizedBox(height: 3),
                Text(notification.body,
                    style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
          if (unread)
            Container(
              margin: const EdgeInsets.only(left: 8, top: 6),
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppTheme.primary,
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
    );
  }
}
