/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Staff Equipment Inspection Screen (`staff_equipment_screen.dart`).
 * Destination of a staff QR scan. Loads the scanned equipment item and the
 * reservations currently holding it, then exposes the legal state transitions
 * (check out → ACTIVE, check in → RETURNED) directly on each reservation.
 *
 * IN SIMPLE WORDS:
 * Scan a QR sticker on a piece of gear and this page tells you what it is, who
 * has it booked right now, and lets you hand it over or take it back on the spot.
 */

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/glass.dart';

class StaffEquipmentScreen extends StatefulWidget {
  final String productId;
  const StaffEquipmentScreen({super.key, required this.productId});

  @override
  State<StaffEquipmentScreen> createState() => _StaffEquipmentScreenState();
}

class _StaffEquipmentScreenState extends State<StaffEquipmentScreen> {
  ProductModel? _product;
  List<ReservationModel> _holders = [];
  bool _loading = true;
  String? _error;

  final _fmt = DateFormat('dd MMM yyyy');

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
      final results = await Future.wait([
        apiService.get('/products/${widget.productId}'),
        apiService.get('/reservations'),
      ]);

      final product = ProductModel.fromJson(results[0].data as Map<String, dynamic>);

      // Staff receive every reservation; keep the live ones holding this item.
      final holders = ((results[1].data['reservations'] ?? []) as List)
          .map((e) => ReservationModel.fromJson(e as Map<String, dynamic>))
          .where((r) =>
              (r.status == 'APPROVED' || r.status == 'ACTIVE') &&
              r.items.any((i) => i.productId == widget.productId))
          .toList();

      setState(() {
        _product = product;
        _holders = holders;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _updateStatus(ReservationModel r, String newStatus) async {
    try {
      await apiService.patch('/reservations/${r.id}/status', data: {'status': newStatus});
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newStatus == 'ACTIVE'
              ? 'Equipment checked out.'
              : 'Equipment checked in.'),
          backgroundColor: AppTheme.accent,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppTheme.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(
        title: Text(_product?.name ?? 'Equipment'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? EmptyState(
                  icon: Icons.error_outline_rounded,
                  title: 'Could not load this item',
                  message: _error,
                  actionLabel: 'Retry',
                  onAction: _load,
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppTheme.primary,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
                    children: [
                      _buildIdentityCard(),
                      const SizedBox(height: 24),
                      Text('Current holders',
                          style: Theme.of(context).textTheme.headlineSmall),
                      const SizedBox(height: 12),
                      if (_holders.isEmpty)
                        AppCard(
                          padding: const EdgeInsets.all(18),
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: AppTheme.accent.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                ),
                                child: const Icon(Icons.check_circle_outline,
                                    color: AppTheme.accent, size: 19),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'On the shelf — no approved or active booking holds this item.',
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        ..._holders.map(_buildHolderCard),
                    ],
                  ),
                ),
    );
  }

  Widget _buildIdentityCard() {
    final p = _product!;
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
              border: Border.all(color: AppTheme.borderSubtle),
            ),
            child: QrImageView(
              data: 'ammunation:product:${p.id}',
              version: QrVersions.auto,
              size: 72,
              backgroundColor: Colors.white,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.name, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 3),
                Text('SKU ${p.sku.isEmpty ? '—' : p.sku}',
                    style: Theme.of(context).textTheme.labelSmall),
                if (p.categoryName != null) ...[
                  const SizedBox(height: 3),
                  Text(p.categoryName!,
                      style: const TextStyle(
                          color: AppTheme.primary,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600)),
                ],
                const SizedBox(height: 10),
                StatusPill(
                  label: '${p.totalStock} in stock',
                  color: p.inStock ? AppTheme.accent : AppTheme.danger,
                  icon: Icons.inventory_2_rounded,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHolderCard(ReservationModel r) {
    final statusColor = AppTheme.statusColor(r.status);
    // Only offer what the backend state machine will actually accept.
    final canCheckOut = AppConstants.nextStatuses(r.status).contains('ACTIVE');
    final canCheckIn = AppConstants.nextStatuses(r.status).contains('RETURNED');
    final qty = r.items
        .where((i) => i.productId == widget.productId)
        .fold<int>(0, (sum, i) => sum + i.quantity);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 19,
                  backgroundColor: AppTheme.bgElevated,
                  child: Text(
                    (r.customerName ?? 'C').characters.first.toUpperCase(),
                    style: const TextStyle(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
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
                      Text('BORR-${r.id.substring(0, 8).toUpperCase()} · $qty unit(s)',
                          style: Theme.of(context).textTheme.labelSmall),
                    ],
                  ),
                ),
                StatusPill(
                  label: AppConstants.statusLabels[r.status] ?? r.status,
                  color: statusColor,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.calendar_today_rounded, size: 13, color: AppTheme.textMuted),
                const SizedBox(width: 8),
                Text('${_fmt.format(r.startDate)}  →  ${_fmt.format(r.endDate)}',
                    style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
            if (canCheckOut || canCheckIn) ...[
              const SizedBox(height: 14),
              if (canCheckOut)
                PrimaryButton(
                  label: 'Check out to customer',
                  icon: Icons.outbox_rounded,
                  onPressed: () => _updateStatus(r, 'ACTIVE'),
                ),
              if (canCheckIn)
                PrimaryButton(
                  label: 'Check in return',
                  icon: Icons.assignment_turned_in_outlined,
                  color: AppTheme.accent,
                  onPressed: () => _updateStatus(r, 'RETURNED'),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
