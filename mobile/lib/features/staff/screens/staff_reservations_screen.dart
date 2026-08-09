/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Staff Reservation Management Screen (`staff_reservations_screen.dart`).
 * Fetches every reservation from GET /api/v1/reservations for review, filtered by
 * status. Allows staff to Approve / Reject, check equipment out (ACTIVE) and back
 * in (RETURNED). Offered transitions mirror the backend state machine.
 * Role-restricted to STAFF/ADMIN/WAREHOUSE_OPERATOR.
 *
 * IN SIMPLE WORDS:
 * The staff queue — every customer booking, filterable, with the approve, reject,
 * hand-over and take-back actions on each card.
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
import '../../../shared/widgets/glass.dart';

class StaffReservationsScreen extends StatefulWidget {
  const StaffReservationsScreen({super.key});

  @override
  State<StaffReservationsScreen> createState() => _StaffReservationsScreenState();
}

class _StaffReservationsScreenState extends State<StaffReservationsScreen> {
  List<ReservationModel> _reservations = [];
  bool _loading = true;
  String? _error;
  final _fmt = DateFormat('dd MMM');

  String _filter = 'ALL';
  final _filters = ['ALL', ...AppConstants.reservationStatuses];

  @override
  void initState() {
    super.initState();
    _load();
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

  Future<void> _updateStatus(String reservationId, String newStatus) async {
    try {
      await apiService
          .patch('/reservations/$reservationId/status', data: {'status': newStatus});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Moved to ${AppConstants.statusLabels[newStatus] ?? newStatus}.'),
          backgroundColor: AppTheme.textPrimary,
        ),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppTheme.danger,
        ),
      );
    }
  }

  void _showStatusSheet(ReservationModel res) {
    final statuses = AppConstants.nextStatuses(res.status);
    if (statuses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              '${AppConstants.statusLabels[res.status]} is final — no further changes.'),
          backgroundColor: AppTheme.textMuted,
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
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
              const SizedBox(height: 20),
              Text('Update status',
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 4),
              Text('BORR-${res.id.substring(0, 8).toUpperCase()}',
                  style: Theme.of(context).textTheme.labelSmall),
              const SizedBox(height: 16),
              ...statuses.map((s) {
                final color = AppTheme.statusColor(s);
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    ),
                    child: Icon(Icons.arrow_forward_rounded, size: 17, color: color),
                  ),
                  title: Text(AppConstants.statusLabels[s] ?? s,
                      style: Theme.of(context).textTheme.titleLarge),
                  trailing: const Icon(Icons.chevron_right_rounded,
                      color: AppTheme.textMuted),
                  onTap: () {
                    Navigator.pop(context);
                    _updateStatus(res.id, s);
                  },
                );
              }),
            ],
          ),
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
    final role = context.select<AuthProvider, String?>((a) => a.user?.role);
    final pending = _reservations.where((r) => r.status == 'PENDING').length;

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
                        Text('Requests',
                            style: Theme.of(context).textTheme.displayMedium),
                        const SizedBox(height: 2),
                        Text(
                          pending == 0
                              ? 'Nothing waiting · ${role ?? 'STAFF'}'
                              : '$pending awaiting approval · ${role ?? 'STAFF'}',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  GlassIconButton(
                    icon: Icons.logout_rounded,
                    onPressed: () => context.read<AuthProvider>().logout(),
                  ),
                ],
              ),
            ),

            SizedBox(
              height: 40,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: _filters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final f = _filters[i];
                  return ChoiceChip(
                    label: Text(f == 'ALL' ? 'All' : (AppConstants.statusLabels[f] ?? f)),
                    selected: _filter == f,
                    onSelected: (_) => setState(() => _filter = f),
                  );
                },
              ),
            ),

            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : _error != null
                      ? EmptyState(
                          icon: Icons.wifi_off_rounded,
                          title: 'Could not load requests',
                          message: _error,
                          actionLabel: 'Retry',
                          onAction: _load,
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          color: AppTheme.primary,
                          child: _filteredList.isEmpty
                              ? ListView(
                                  children: const [
                                    SizedBox(height: 60),
                                    EmptyState(
                                      icon: Icons.inbox_rounded,
                                      title: 'Nothing here',
                                      message: 'No reservations match this filter.',
                                    ),
                                  ],
                                )
                              : ListView.separated(
                                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
                                  itemCount: _filteredList.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                                  itemBuilder: (_, i) {
                                    final r = _filteredList[i];
                                    return _RequestCard(
                                      reservation: r,
                                      dateLabel:
                                          '${_fmt.format(r.startDate)} → ${_fmt.format(r.endDate)}',
                                      onStatusTap: () => _showStatusSheet(r),
                                      onUpdate: (s) => _updateStatus(r.id, s),
                                    )
                                        .animate(delay: Duration(milliseconds: i * 55))
                                        .fadeIn(duration: 300.ms)
                                        .slideY(begin: 0.06, end: 0);
                                  },
                                ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final ReservationModel reservation;
  final String dateLabel;
  final VoidCallback onStatusTap;
  final ValueChanged<String> onUpdate;

  const _RequestCard({
    required this.reservation,
    required this.dateLabel,
    required this.onStatusTap,
    required this.onUpdate,
  });

  @override
  Widget build(BuildContext context) {
    final r = reservation;
    final color = AppTheme.statusColor(r.status);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppTheme.bgElevated,
                child: Text(
                  (r.customerName ?? 'C').characters.first.toUpperCase(),
                  style: const TextStyle(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r.customerName ?? 'Customer',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 2),
                    Text('BORR-${r.id.substring(0, 8).toUpperCase()} · $dateLabel',
                        style: Theme.of(context).textTheme.labelSmall),
                  ],
                ),
              ),
              GestureDetector(
                onTap: onStatusTap,
                child: StatusPill(
                  label: AppConstants.statusLabels[r.status] ?? r.status,
                  color: color,
                  icon: Icons.edit_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...r.items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  const Icon(Icons.circle, size: 5, color: AppTheme.textMuted),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('${item.productName} × ${item.quantity}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                '\$${r.totalPrice.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                  letterSpacing: -0.3,
                ),
              ),
              const Spacer(),
              // Primary action per state: approve/reject pending, check out
              // approved, check in active.
              if (r.status == 'PENDING') ...[
                _SmallButton(
                  label: 'Reject',
                  onPressed: () => onUpdate('REJECTED'),
                  outlined: true,
                  color: AppTheme.danger,
                ),
                const SizedBox(width: 8),
                _SmallButton(label: 'Approve', onPressed: () => onUpdate('APPROVED')),
              ] else if (r.status == 'APPROVED')
                _SmallButton(
                  label: 'Check out',
                  icon: Icons.outbox_rounded,
                  onPressed: () => onUpdate('ACTIVE'),
                )
              else if (r.status == 'ACTIVE')
                _SmallButton(
                  label: 'Check in',
                  icon: Icons.assignment_turned_in_outlined,
                  color: AppTheme.accent,
                  onPressed: () => onUpdate('RETURNED'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SmallButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final IconData? icon;
  final bool outlined;
  final Color? color;

  const _SmallButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.outlined = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final tint = color ?? AppTheme.primary;
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[Icon(icon, size: 15), const SizedBox(width: 6)],
        Text(label),
      ],
    );

    if (outlined) {
      return OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: tint,
          side: BorderSide(color: tint.withOpacity(0.4)),
          minimumSize: const Size(0, 40),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          textStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
        ),
        child: child,
      );
    }

    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: tint,
        minimumSize: const Size(0, 40),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        textStyle: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
      ),
      child: child,
    );
  }
}
