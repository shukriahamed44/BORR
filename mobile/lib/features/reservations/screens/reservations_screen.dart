/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Customer Reservations Screen (`reservations_screen.dart`).
 * Fetches the signed-in user's reservations from GET /api/v1/reservations and
 * groups them into Upcoming / Ongoing / Completed segments, rendering each as a
 * status-badged booking card with an inline cancel action where the backend
 * state machine still permits it.
 *
 * IN SIMPLE WORDS:
 * The "My Bookings" page — your rentals split into upcoming, in progress and
 * finished, with a cancel button while cancelling is still allowed.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/glass.dart';

class ReservationsScreen extends StatefulWidget {
  const ReservationsScreen({super.key});

  @override
  State<ReservationsScreen> createState() => _ReservationsScreenState();
}

class _ReservationsScreenState extends State<ReservationsScreen>
    with SingleTickerProviderStateMixin {
  List<ReservationModel> _reservations = [];
  bool _loading = true;
  String? _error;
  final _fmt = DateFormat('dd MMM yyyy');

  late final TabController _tabs = TabController(length: 3, vsync: this);

  static const _upcoming = ['PENDING', 'APPROVED'];
  static const _ongoing = ['ACTIVE'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await apiService.get('/reservations');
      // Backend wraps the collection: { count, reservations: [...] }
      final list = ((res.data['reservations'] ?? []) as List)
          .map((e) => ReservationModel.fromJson(e as Map<String, dynamic>))
          .toList();
      setState(() {
        _reservations = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _cancel(ReservationModel r) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      builder: (_) => _CancelSheet(reference: _ref(r)),
    );
    if (confirmed != true) return;

    try {
      await apiService.patch('/reservations/${r.id}/status', data: {'status': 'CANCELLED'});
      await _load();
      _toast('Reservation cancelled.', AppTheme.textPrimary);
    } catch (e) {
      _toast(e.toString().replaceFirst('Exception: ', ''), AppTheme.danger);
    }
  }

  void _toast(String message, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: color),
    );
  }

  String _ref(ReservationModel r) => 'BORR-${r.id.substring(0, 8).toUpperCase()}';

  List<ReservationModel> _bucket(int index) {
    switch (index) {
      case 0:
        return _reservations.where((r) => _upcoming.contains(r.status)).toList();
      case 1:
        return _reservations.where((r) => _ongoing.contains(r.status)).toList();
      default:
        return _reservations
            .where((r) => !_upcoming.contains(r.status) && !_ongoing.contains(r.status))
            .toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('My Bookings',
                      style: Theme.of(context).textTheme.displayMedium),
                  GlassIconButton(icon: Icons.refresh_rounded, onPressed: _load),
                ],
              ),
            ),
            _SegmentedTabs(controller: _tabs),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : _error != null
                      ? EmptyState(
                          icon: Icons.wifi_off_rounded,
                          title: 'Could not load bookings',
                          message: _error,
                          actionLabel: 'Retry',
                          onAction: _load,
                        )
                      : TabBarView(
                          controller: _tabs,
                          children: [
                            for (var i = 0; i < 3; i++) _buildList(_bucket(i), i),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildList(List<ReservationModel> items, int bucket) {
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        color: AppTheme.primary,
        child: ListView(
          children: [
            const SizedBox(height: 60),
            EmptyState(
              icon: Icons.receipt_long_outlined,
              title: switch (bucket) {
                0 => 'No upcoming bookings',
                1 => 'Nothing out right now',
                _ => 'No past bookings',
              },
              message: bucket == 0
                  ? 'Browse the catalog and reserve equipment to see it here.'
                  : null,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      color: AppTheme.primary,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final r = items[i];
          return _BookingCard(
            reservation: r,
            reference: _ref(r),
            dateLabel:
                '${_fmt.format(r.startDate)}  →  ${_fmt.format(r.endDate)}',
            onCancel: AppConstants.nextStatuses(r.status).contains('CANCELLED')
                ? () => _cancel(r)
                : null,
          )
              .animate(delay: Duration(milliseconds: i * 60))
              .fadeIn(duration: 300.ms)
              .slideY(begin: 0.06, end: 0);
        },
      ),
    );
  }
}

// ─── Segmented control ────────────────────────────────────────────────────────

class _SegmentedTabs extends StatelessWidget {
  final TabController controller;
  const _SegmentedTabs({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppTheme.bgInput,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        ),
        child: TabBar(
          controller: controller,
          indicator: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppTheme.radiusSm - 3),
            boxShadow: AppTheme.shadowSoft,
          ),
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: Colors.transparent,
          labelColor: AppTheme.textPrimary,
          unselectedLabelColor: AppTheme.textMuted,
          labelStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
          unselectedLabelStyle:
              const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500),
          tabs: const [
            Tab(height: 36, text: 'Upcoming'),
            Tab(height: 36, text: 'Ongoing'),
            Tab(height: 36, text: 'Completed'),
          ],
        ),
      ),
    );
  }
}

// ─── Booking card ─────────────────────────────────────────────────────────────

class _BookingCard extends StatelessWidget {
  final ReservationModel reservation;
  final String reference;
  final String dateLabel;
  final VoidCallback? onCancel;

  const _BookingCard({
    required this.reservation,
    required this.reference,
    required this.dateLabel,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final r = reservation;
    final color = AppTheme.statusColor(r.status);

    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: AppTheme.bgElevated,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                ),
                child: const Icon(Icons.handyman_rounded,
                    color: AppTheme.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.items.isEmpty
                          ? 'Reservation'
                          : r.items.first.productName +
                              (r.items.length > 1
                                  ? ' +${r.items.length - 1} more'
                                  : ''),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 2),
                    Text(reference,
                        style: Theme.of(context).textTheme.labelSmall),
                  ],
                ),
              ),
              StatusPill(
                label: AppConstants.statusLabels[r.status] ?? r.status,
                color: color,
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded,
                  size: 14, color: AppTheme.textMuted),
              const SizedBox(width: 8),
              Text(dateLabel, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
          if (r.items.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.inventory_2_outlined,
                    size: 14, color: AppTheme.textMuted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    r.items
                        .map((i) => '${i.productName} × ${i.quantity}')
                        .join(', '),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Total', style: Theme.of(context).textTheme.labelSmall),
                  const SizedBox(height: 2),
                  Text(
                    '\$${r.totalPrice.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                      letterSpacing: -0.4,
                    ),
                  ),
                ],
              ),
              if (onCancel != null)
                TextButton(
                  onPressed: onCancel,
                  style: TextButton.styleFrom(foregroundColor: AppTheme.danger),
                  child: const Text('Cancel booking'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CancelSheet extends StatelessWidget {
  final String reference;
  const _CancelSheet({required this.reference});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.borderMedium,
                  borderRadius: BorderRadius.circular(AppTheme.radiusPill),
                ),
              ),
            ),
            const SizedBox(height: 22),
            Text('Cancel $reference?',
                style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 6),
            Text(
              'The equipment goes back on the shelf and this booking cannot be reopened.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 22),
            PrimaryButton(
              label: 'Yes, cancel it',
              color: AppTheme.danger,
              onPressed: () => Navigator.pop(context, true),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Keep booking'),
            ),
          ],
        ),
      ),
    );
  }
}
