/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Push Notification Inbox Screen (`notifications_screen.dart`).
 * Displays the notification inbox for both Customer and Staff roles.
 * Shows time-relative timestamps, read/unread states, and a "Mark All Read" action.
 * Includes a test button to trigger a local push notification (demo purposes).
 *
 * IN SIMPLE WORDS:
 * The notifications inbox — shows all received push alerts with time stamps
 * and lets you clear them as read.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/notification_provider.dart';
import '../../../shared/models/models.dart';

class NotificationsScreen extends StatelessWidget {
  final bool isStaff;
  const NotificationsScreen({super.key, this.isStaff = false});

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return DateFormat('dd MMM').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();
    final notifications = provider.notifications;

    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifications'),
            if (provider.unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${provider.unreadCount}',
                  style: const TextStyle(
                      color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (provider.unreadCount > 0)
            TextButton(
              onPressed: provider.markAllRead,
              child: const Text('Mark all read',
                  style: TextStyle(color: AppTheme.primary, fontSize: 13)),
            ),
        ],
      ),
      body: Column(
        children: [
          // ─── Test Notification Button (Demo) ──────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: OutlinedButton.icon(
              onPressed: () async {
                await context.read<NotificationProvider>().sendNotification(
                      title: isStaff
                          ? '⚠️ New Reservation Needs Approval'
                          : '✅ Reservation Status Updated',
                      body: isStaff
                          ? 'Customer John Doe has submitted a new reservation for review.'
                          : 'Your reservation RES-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)} has been confirmed.',
                    );
              },
              icon: const Icon(Icons.notifications_active_outlined, size: 16),
              label: const Text('Trigger Test Notification'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 44),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // ─── Notification List ────────────────────────────────────────
          Expanded(
            child: notifications.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.notifications_none_rounded,
                            color: AppTheme.textMuted, size: 48),
                        SizedBox(height: 16),
                        Text('No notifications yet.',
                            style: TextStyle(color: AppTheme.textMuted)),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: notifications.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final n = notifications[i];
                      return _NotificationTile(
                        notification: n,
                        relativeTime: _relativeTime(n.receivedAt),
                        index: i,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final NotificationModel notification;
  final String relativeTime;
  final int index;

  const _NotificationTile({
    required this.notification,
    required this.relativeTime,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    final n = notification;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: n.isRead ? AppTheme.bgSurface : AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: n.isRead ? AppTheme.borderSubtle : AppTheme.primary.withOpacity(0.35),
          width: n.isRead ? 1 : 1.5,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── Icon ──────────────────────────────────────────────────
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: n.isRead
                  ? AppTheme.bgElevated
                  : AppTheme.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              n.isRead
                  ? Icons.notifications_outlined
                  : Icons.notifications_active_rounded,
              color: n.isRead ? AppTheme.textMuted : AppTheme.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          // ─── Content ────────────────────────────────────────────────
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        n.title,
                        style: TextStyle(
                          color: n.isRead ? AppTheme.textSecondary : AppTheme.textPrimary,
                          fontWeight: n.isRead ? FontWeight.w400 : FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      relativeTime,
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  n.body,
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
          // ─── Unread Dot ──────────────────────────────────────────────
          if (!n.isRead)
            Container(
              margin: const EdgeInsets.only(left: 8, top: 2),
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppTheme.primary,
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
    ).animate(delay: Duration(milliseconds: index * 60)).fadeIn().slideX(begin: 0.05, end: 0);
  }
}
