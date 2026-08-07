/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Staff Reservation Management Screen (`staff_reservations_screen.dart`).
 * Fetches all reservations from GET /api/v1/reservations for staff review.
 * Allows staff to Approve / Reject (PATCH status), check equipment out (ACTIVE)
 * and back in (RETURNED). Offered transitions mirror the backend state machine.
 * Role-restricted to STAFF/ADMIN/WAREHOUSE_OPERATOR.
 *
 * IN SIMPLE WORDS:
 * The staff page to see all customer reservations and approve or update their status.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../shared/models/models.dart';

class StaffReservationsScreen extends StatefulWidget {
  const StaffReservationsScreen({super.key});

  @override
  State<StaffReservationsScreen> createState() => _StaffReservationsScreenState();
}

class _StaffReservationsScreenState extends State<StaffReservationsScreen> {
  List<ReservationModel> _reservations = [];
  bool _loading = true;
  String? _error;
  final _fmt = DateFormat('dd MMM yyyy');

  // Status filter
  String _filter = 'ALL';
  final _filters = ['ALL', ...AppConstants.reservationStatuses];

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

  Future<void> _updateStatus(String reservationId, String newStatus) async {
    try {
      await apiService.patch('/reservations/$reservationId/status', data: {'status': newStatus});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Status updated to $newStatus'),
          backgroundColor: AppTheme.accent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showStatusDialog(ReservationModel res) {
    final statuses = AppConstants.nextStatuses(res.status);
    if (statuses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${res.status} is a final state — no further changes.'),
          backgroundColor: AppTheme.textMuted,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Update Status',
                style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 18)),
            const SizedBox(height: 4),
            Text('RES-${res.id.substring(0, 8).toUpperCase()}',
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
            const SizedBox(height: 20),
            ...statuses.map((s) => ListTile(
                  leading: Container(
                    width: 10, height: 10,
                    decoration: BoxDecoration(
                      color: AppTheme.statusColor(s),
                      shape: BoxShape.circle,
                    ),
                  ),
                  title: Text(AppConstants.statusLabels[s] ?? s,
                      style: const TextStyle(color: AppTheme.textPrimary)),
                  onTap: () {
                    Navigator.pop(context);
                    _updateStatus(res.id, s);
                  },
                )),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  List<ReservationModel> get _filteredList {
    if (_filter == 'ALL') return _reservations;
    return _reservations.where((r) => r.status == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Reservations'),
            Text(
              user?.role ?? 'STAFF',
              style: const TextStyle(fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
      body: Column(
        children: [
          // ─── Filter Chips ─────────────────────────────────────────────
          SizedBox(
            height: 50,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              scrollDirection: Axis.horizontal,
              itemCount: _filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final f = _filters[i];
                final isSelected = _filter == f;
                return ChoiceChip(
                  label: Text(f == 'ALL' ? 'All' : (AppConstants.statusLabels[f] ?? f)),
                  selected: isSelected,
                  onSelected: (_) => setState(() => _filter = f),
                  selectedColor: AppTheme.primary.withOpacity(0.2),
                  labelStyle: TextStyle(
                    color: isSelected ? AppTheme.primary : AppTheme.textMuted,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  ),
                );
              },
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : _error != null
                    ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.danger)))
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppTheme.primary,
                        child: _filteredList.isEmpty
                            ? const Center(
                                child: Text('No reservations found.',
                                    style: TextStyle(color: AppTheme.textMuted)))
                            : ListView.separated(
                                padding: const EdgeInsets.all(16),
                                itemCount: _filteredList.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 12),
                                itemBuilder: (_, i) {
                                  final r = _filteredList[i];
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
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  r.customerName ?? 'Customer',
                                                  style: const TextStyle(
                                                      color: AppTheme.textPrimary,
                                                      fontWeight: FontWeight.w600),
                                                ),
                                                Text(
                                                  'RES-${r.id.substring(0, 8).toUpperCase()}',
                                                  style: const TextStyle(
                                                      color: AppTheme.textMuted, fontSize: 11),
                                                ),
                                              ],
                                            ),
                                            GestureDetector(
                                              onTap: () => _showStatusDialog(r),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: statusColor.withOpacity(0.15),
                                                  borderRadius: BorderRadius.circular(20),
                                                  border: Border.all(color: statusColor.withOpacity(0.3)),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Text(AppConstants.statusLabels[r.status] ?? r.status,
                                                        style: TextStyle(
                                                            color: statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
                                                    const SizedBox(width: 4),
                                                    Icon(Icons.edit_rounded, size: 10, color: statusColor),
                                                  ],
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            const Icon(Icons.calendar_today_outlined, size: 13, color: AppTheme.textMuted),
                                            const SizedBox(width: 6),
                                            Text(
                                              '${_fmt.format(r.startDate)} → ${_fmt.format(r.endDate)}',
                                              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        ...r.items.map((item) => Text(
                                              '• ${item.productName} × ${item.quantity}',
                                              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                            )),
                                        const SizedBox(height: 12),
                                        const Divider(color: AppTheme.borderSubtle),
                                        const SizedBox(height: 8),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text('\$${r.totalPrice.toStringAsFixed(2)}',
                                                style: const TextStyle(
                                                    color: AppTheme.primary,
                                                    fontWeight: FontWeight.w700,
                                                    fontSize: 16)),
                                            // Primary action per state: approve/reject pending,
                                            // check out approved, check in active.
                                            if (r.status == 'PENDING') ...[
                                              Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  OutlinedButton(
                                                    onPressed: () => _updateStatus(r.id, 'REJECTED'),
                                                    style: OutlinedButton.styleFrom(
                                                      foregroundColor: AppTheme.danger,
                                                      side: const BorderSide(color: AppTheme.danger),
                                                      minimumSize: const Size(80, 36),
                                                    ),
                                                    child: const Text('Reject'),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  ElevatedButton.icon(
                                                    onPressed: () => _updateStatus(r.id, 'APPROVED'),
                                                    icon: const Icon(Icons.check_circle_outline, size: 16),
                                                    label: const Text('Approve'),
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: AppTheme.accent,
                                                      minimumSize: const Size(100, 36),
                                                      padding: const EdgeInsets.symmetric(horizontal: 12),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ] else if (r.status == 'APPROVED')
                                              ElevatedButton.icon(
                                                onPressed: () => _updateStatus(r.id, 'ACTIVE'),
                                                icon: const Icon(Icons.outbox_rounded, size: 16),
                                                label: const Text('Check Out'),
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: AppTheme.primary,
                                                  minimumSize: const Size(110, 36),
                                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                                ),
                                              )
                                            else if (r.status == 'ACTIVE')
                                              ElevatedButton.icon(
                                                onPressed: () => _updateStatus(r.id, 'RETURNED'),
                                                icon: const Icon(Icons.assignment_turned_in_outlined, size: 16),
                                                label: const Text('Check In'),
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: AppTheme.accent,
                                                  minimumSize: const Size(110, 36),
                                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                                ),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ).animate(delay: Duration(milliseconds: i * 80)).fadeIn().slideY(begin: 0.1, end: 0);
                                },
                              ),
                      ),
          ),
        ],
      ),
    );
  }
}
