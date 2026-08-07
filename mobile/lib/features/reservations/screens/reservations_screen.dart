/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Customer Reservations List Screen (`reservations_screen.dart`).
 * Fetches the current user's reservations from GET /api/v1/reservations,
 * renders them as status-badged cards with date range and amount,
 * and provides a pull-to-refresh gesture.
 *
 * IN SIMPLE WORDS:
 * The "My Reservations" page — shows all your equipment bookings with status badges.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';

class ReservationsScreen extends StatefulWidget {
  const ReservationsScreen({super.key});

  @override
  State<ReservationsScreen> createState() => _ReservationsScreenState();
}

class _ReservationsScreenState extends State<ReservationsScreen> {
  List<ReservationModel> _reservations = [];
  bool _loading = true;
  String? _error;
  final _fmt = DateFormat('dd MMM yyyy');

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await apiService.get('/reservations');
      // Backend wraps the collection: { count, reservations: [...] }
      final list = ((res.data['reservations'] ?? []) as List)
          .map((e) => ReservationModel.fromJson(e as Map<String, dynamic>))
          .toList();
      setState(() { _reservations = list; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _cancel(ReservationModel r) async {
    try {
      await apiService.patch('/reservations/${r.id}/status', data: {'status': 'CANCELLED'});
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Reservation cancelled.'),
            backgroundColor: AppTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(title: const Text('My Reservations')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.danger)))
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppTheme.primary,
                  child: _reservations.isEmpty
                      ? const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.receipt_long_outlined, color: AppTheme.textMuted, size: 48),
                              SizedBox(height: 16),
                              Text('No reservations yet.',
                                  style: TextStyle(color: AppTheme.textMuted)),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _reservations.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (_, i) {
                            final r = _reservations[i];
                            final statusColor = AppTheme.statusColor(r.status);
                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.bgSurface,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppTheme.borderSubtle),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'RES-${r.id.substring(0, 8).toUpperCase()}',
                                        style: const TextStyle(
                                          color: AppTheme.textMuted,
                                          fontSize: 12,
                                          fontFamily: 'monospace',
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: statusColor.withOpacity(0.15),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          AppConstants.statusLabels[r.status] ?? r.status,
                                          style: TextStyle(
                                            color: statusColor,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      const Icon(Icons.calendar_today_outlined,
                                          size: 14, color: AppTheme.textMuted),
                                      const SizedBox(width: 6),
                                      Text(
                                        '${_fmt.format(r.startDate)} → ${_fmt.format(r.endDate)}',
                                        style: const TextStyle(
                                            color: AppTheme.textSecondary, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  // Items
                                  ...r.items.map((item) => Padding(
                                        padding: const EdgeInsets.only(top: 4),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.construction_rounded,
                                                size: 14, color: AppTheme.textMuted),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                '${item.productName} × ${item.quantity}',
                                                style: const TextStyle(
                                                    color: AppTheme.textSecondary, fontSize: 13),
                                              ),
                                            ),
                                          ],
                                        ),
                                      )),
                                  const SizedBox(height: 12),
                                  const Divider(color: AppTheme.borderSubtle),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('Total Amount',
                                          style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                                      Text(
                                        '\$${r.totalPrice.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          color: AppTheme.primary,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ],
                                  ),
                                  // Only PENDING/APPROVED reservations can still be cancelled —
                                  // the backend state machine rejects anything else.
                                  if (r.status == 'PENDING' || r.status == 'APPROVED') ...[
                                    const SizedBox(height: 8),
                                    SizedBox(
                                      width: double.infinity,
                                      child: TextButton.icon(
                                        onPressed: () => _cancel(r),
                                        icon: const Icon(Icons.close_rounded, size: 16),
                                        label: const Text('Cancel Reservation'),
                                        style: TextButton.styleFrom(
                                          foregroundColor: AppTheme.danger,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ).animate(delay: Duration(milliseconds: i * 80)).fadeIn().slideY(begin: 0.1, end: 0);
                          },
                        ),
                ),
    );
  }
}
