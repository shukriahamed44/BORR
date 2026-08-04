/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Create Reservation Screen (`create_reservation_screen.dart`).
 * Allows customers to select a date range and quantity, then submits
 * POST /api/v1/reservations to the NestJS backend.
 * Accepts an optional productId from route query params for pre-selected equipment.
 *
 * IN SIMPLE WORDS:
 * The "Make Reservation" form — pick dates, choose equipment and quantity,
 * then submit to book it.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';

class CreateReservationScreen extends StatefulWidget {
  final String? productId;
  const CreateReservationScreen({super.key, this.productId});

  @override
  State<CreateReservationScreen> createState() => _CreateReservationScreenState();
}

class _CreateReservationScreenState extends State<CreateReservationScreen> {
  DateTime? _startDate;
  DateTime? _endDate;
  int _quantity = 1;
  ProductModel? _product;
  bool _loadingProduct = false;
  bool _submitting = false;
  String? _error;
  String? _success;
  final _fmt = DateFormat('dd MMM yyyy');

  @override
  void initState() {
    super.initState();
    if (widget.productId != null) _loadProduct();
  }

  Future<void> _loadProduct() async {
    setState(() => _loadingProduct = true);
    try {
      final res = await apiService.get('/products/${widget.productId}');
      setState(() {
        _product = ProductModel.fromJson(res.data as Map<String, dynamic>);
        _loadingProduct = false;
      });
    } catch (_) {
      setState(() => _loadingProduct = false);
    }
  }

  Future<void> _pickDate(bool isStart) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? now : (_startDate ?? now).add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppTheme.primary,
            surface: AppTheme.bgSurface,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate != null && _endDate!.isBefore(picked)) _endDate = null;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (_product == null || _startDate == null || _endDate == null) return;
    setState(() { _submitting = true; _error = null; _success = null; });

    try {
      await apiService.post('/reservations', data: {
        'startDate': _startDate!.toIso8601String(),
        'endDate': _endDate!.toIso8601String(),
        'items': [
          {'productId': _product!.id, 'quantity': _quantity},
        ],
      });

      setState(() {
        _success = 'Reservation created successfully!';
        _submitting = false;
      });

      await Future.delayed(const Duration(seconds: 2));
      if (mounted) context.go('/reservations');
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _submitting = false;
      });
    }
  }

  int get _days {
    if (_startDate == null || _endDate == null) return 0;
    return _endDate!.difference(_startDate!).inDays;
  }

  double get _total => _product != null ? _days * _product!.dailyRate * _quantity : 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(
        title: const Text('Make Reservation'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Product Info ─────────────────────────────────────────
            if (_loadingProduct)
              const Center(child: CircularProgressIndicator(color: AppTheme.primary))
            else if (_product != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.bgSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.construction_rounded, color: AppTheme.primary),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_product!.name,
                              style: const TextStyle(
                                  color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
                          Text('\$${_product!.dailyRate.toStringAsFixed(2)}/day',
                              style: const TextStyle(color: AppTheme.primary, fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(),

            const SizedBox(height: 24),
            Text('Rental Dates', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),

            // ─── Date Pickers ─────────────────────────────────────────
            Row(
              children: [
                Expanded(child: _DateTile(
                  label: 'Start Date',
                  value: _startDate != null ? _fmt.format(_startDate!) : 'Select',
                  onTap: () => _pickDate(true),
                )),
                const SizedBox(width: 12),
                Expanded(child: _DateTile(
                  label: 'End Date',
                  value: _endDate != null ? _fmt.format(_endDate!) : 'Select',
                  onTap: () => _pickDate(false),
                )),
              ],
            ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.1, end: 0),

            const SizedBox(height: 24),
            Text('Quantity', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),

            // ─── Quantity Selector ────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.bgSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.borderSubtle),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, color: AppTheme.primary),
                    onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                  ),
                  Text('$_quantity',
                      style: const TextStyle(
                          color: AppTheme.textPrimary, fontSize: 20, fontWeight: FontWeight.w700)),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, color: AppTheme.primary),
                    onPressed: () => setState(() => _quantity++),
                  ),
                ],
              ),
            ).animate(delay: 200.ms).fadeIn(),

            const SizedBox(height: 24),

            // ─── Cost Summary ─────────────────────────────────────────
            if (_days > 0 && _product != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    _SummaryRow('Duration', '$_days days'),
                    _SummaryRow('Unit Rate', '\$${_product!.dailyRate}/day × $_quantity units'),
                    const Divider(color: AppTheme.borderMedium, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Estimate',
                            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
                        Text('\$${_total.toStringAsFixed(2)}',
                            style: const TextStyle(
                                color: AppTheme.primary, fontWeight: FontWeight.w800, fontSize: 20)),
                      ],
                    ),
                  ],
                ),
              ).animate(delay: 300.ms).fadeIn(),

            const SizedBox(height: 24),

            // ─── Feedback ─────────────────────────────────────────────
            if (_error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.danger.withOpacity(0.3)),
                ),
                child: Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 13)),
              ).animate().fadeIn(),

            if (_success != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.accent.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, color: AppTheme.accent),
                    const SizedBox(width: 10),
                    Text(_success!, style: const TextStyle(color: AppTheme.accent, fontSize: 13)),
                  ],
                ),
              ).animate().fadeIn(),

            // ─── Submit ───────────────────────────────────────────────
            ElevatedButton(
              onPressed: (_product != null && _startDate != null && _endDate != null && !_submitting)
                  ? _submit
                  : null,
              child: _submitting
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Confirm Reservation'),
            ).animate(delay: 400.ms).fadeIn().slideY(begin: 0.2, end: 0),
          ],
        ),
      ),
    );
  }
}

class _DateTile extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _DateTile({required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.bgSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderSubtle),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.calendar_today_rounded, color: AppTheme.primary, size: 14),
                const SizedBox(width: 6),
                Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  const _SummaryRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
          Text(value, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
        ],
      ),
    );
  }
}
