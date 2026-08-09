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
          icon: const Icon(Icons.arrow_back_ios_rounded),
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
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: AppTheme.danger, size: 40),
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: AppTheme.textMuted)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppTheme.primary,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      _buildIdentityCard(),
                      const SizedBox(height: 24),
                      Text('Current Holders',
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 12),
                      if (_holders.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: AppTheme.bgSurface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppTheme.borderSubtle),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.check_circle_outline,
                                  color: AppTheme.accent, size: 20),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'No active or approved reservation holds this item — it is on the shelf.',
                                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
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
                Text(p.name,
                    style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 16)),
                const SizedBox(height: 4),
                Text('SKU ${p.sku.isEmpty ? '—' : p.sku}',
                    style: const TextStyle(
                        color: AppTheme.textMuted, fontSize: 12, fontFamily: 'monospace')),
                if (p.categoryName != null) ...[
                  const SizedBox(height: 4),
                  Text(p.categoryName!,
                      style: const TextStyle(color: AppTheme.primaryLight, fontSize: 12)),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.inventory_2_rounded,
                        size: 14, color: p.inStock ? AppTheme.accent : AppTheme.danger),
                    const SizedBox(width: 6),
                    Text('${p.totalStock} in stock',
                        style: TextStyle(
                            color: p.inStock ? AppTheme.accent : AppTheme.danger,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                  ],
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

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r.customerName ?? 'Customer',
                        style: const TextStyle(
                            color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
                    Text('RES-${r.id.substring(0, 8).toUpperCase()} · $qty unit(s)',
                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(AppConstants.statusLabels[r.status] ?? r.status,
                    style: TextStyle(
                        color: statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 13, color: AppTheme.textMuted),
              const SizedBox(width: 6),
              Text('${_fmt.format(r.startDate)} → ${_fmt.format(r.endDate)}',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 12),
          if (canCheckOut)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _updateStatus(r, 'ACTIVE'),
                icon: const Icon(Icons.outbox_rounded, size: 16),
                label: const Text('Check Out to Customer'),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
              ),
            ),
          if (canCheckIn)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _updateStatus(r, 'RETURNED'),
                icon: const Icon(Icons.assignment_turned_in_outlined, size: 16),
                label: const Text('Check In Return'),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accent),
              ),
            ),
        ],
      ),
    );
  }
}
