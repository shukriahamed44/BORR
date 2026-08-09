/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Create Reservation Screen (`create_reservation_screen.dart`).
 * Collects the rental period and quantity for a chosen equipment item, prices the
 * booking live, and submits it to POST /api/v1/reservations. The confirm action is
 * pinned to the bottom bar and disabled until the selection is valid.
 *
 * IN SIMPLE WORDS:
 * The booking form — pick pickup and return dates, choose how many units, see the
 * running total, and confirm.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/glass.dart';

class CreateReservationScreen extends StatefulWidget {
  final String? productId;
  const CreateReservationScreen({super.key, this.productId});

  @override
  State<CreateReservationScreen> createState() => _CreateReservationScreenState();
}

class _CreateReservationScreenState extends State<CreateReservationScreen> {
  ProductModel? _product;
  bool _loadingProduct = false;
  bool _submitting = false;
  String? _error;
  String? _success;

  DateTime? _startDate;
  DateTime? _endDate;
  int _quantity = 1;

  final _fmt = DateFormat('EEE, dd MMM yyyy');

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
      firstDate: isStart ? now : (_startDate ?? now),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate != null && !_endDate!.isAfter(picked)) _endDate = null;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (_product == null || _startDate == null || _endDate == null) return;
    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });

    try {
      await apiService.post('/reservations', data: {
        'startDate': _startDate!.toIso8601String(),
        'endDate': _endDate!.toIso8601String(),
        'items': [
          {'productId': _product!.id, 'quantity': _quantity},
        ],
      });

      setState(() {
        _success = 'Booking confirmed — pending staff approval.';
        _submitting = false;
      });

      await Future.delayed(const Duration(milliseconds: 1400));
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

  double get _rental => _product != null ? _days * _product!.pricePerDay * _quantity : 0;
  double get _deposit => _product != null ? _product!.deposit * _quantity : 0;
  double get _total => _rental + _deposit;

  bool get _canSubmit =>
      _product != null && _days > 0 && !_submitting && _success == null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Rental Period'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loadingProduct
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              children: [
                if (_product != null) _ItemStrip(product: _product!),
                const SizedBox(height: 24),

                Text('Rental period',
                    style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 10),
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      _DateRow(
                        icon: Icons.event_available_rounded,
                        label: 'Pickup',
                        value: _startDate == null ? 'Select date' : _fmt.format(_startDate!),
                        placeholder: _startDate == null,
                        onTap: () => _pickDate(true),
                      ),
                      const Divider(height: 1),
                      _DateRow(
                        icon: Icons.event_repeat_rounded,
                        label: 'Return',
                        value: _endDate == null ? 'Select date' : _fmt.format(_endDate!),
                        placeholder: _endDate == null,
                        onTap: _startDate == null ? null : () => _pickDate(false),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.06, end: 0),

                const SizedBox(height: 24),
                Text('Quantity', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 10),
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _StepperButton(
                        icon: Icons.remove_rounded,
                        onPressed:
                            _quantity > 1 ? () => setState(() => _quantity--) : null,
                      ),
                      Column(
                        children: [
                          Text('$_quantity',
                              style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textPrimary)),
                          Text('unit${_quantity > 1 ? 's' : ''}',
                              style: Theme.of(context).textTheme.labelSmall),
                        ],
                      ),
                      _StepperButton(
                        icon: Icons.add_rounded,
                        // Never let the form request more than the shelf holds.
                        onPressed: (_product != null && _quantity >= _product!.totalStock)
                            ? null
                            : () => setState(() => _quantity++),
                      ),
                    ],
                  ),
                ),
                if (_product != null && _quantity >= _product!.totalStock) ...[
                  const SizedBox(height: 8),
                  Text('Only ${_product!.totalStock} unit(s) in stock.',
                      style: Theme.of(context).textTheme.labelSmall),
                ],

                if (_days > 0 && _product != null) ...[
                  const SizedBox(height: 24),
                  _CostSummary(
                    days: _days,
                    quantity: _quantity,
                    rate: _product!.pricePerDay,
                    rental: _rental,
                    deposit: _deposit,
                    total: _total,
                  ),
                ],

                if (_error != null) ...[
                  const SizedBox(height: 20),
                  _Banner(
                    icon: Icons.error_outline_rounded,
                    color: AppTheme.danger,
                    message: _error!,
                  ),
                ],
                if (_success != null) ...[
                  const SizedBox(height: 20),
                  _Banner(
                    icon: Icons.check_circle_outline_rounded,
                    color: AppTheme.accent,
                    message: _success!,
                  ),
                ],
              ],
            ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppTheme.borderSubtle)),
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              if (_days > 0) ...[
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Total', style: Theme.of(context).textTheme.labelSmall),
                    Text('\$${_total.toStringAsFixed(2)}',
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                            letterSpacing: -0.4)),
                  ],
                ),
                const SizedBox(width: 18),
              ],
              Expanded(
                child: PrimaryButton(
                  label: _days > 0 ? 'Confirm Booking' : 'Select dates',
                  loading: _submitting,
                  onPressed: _canSubmit ? _submit : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

class _ItemStrip extends StatelessWidget {
  final ProductModel product;
  const _ItemStrip({required this.product});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppTheme.bgElevated,
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
            ),
            child: const Icon(Icons.handyman_rounded, color: AppTheme.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 2),
                Text('\$${product.pricePerDay.toStringAsFixed(2)} / day',
                    style: const TextStyle(
                        color: AppTheme.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DateRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool placeholder;
  final VoidCallback? onTap;

  const _DateRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.placeholder,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 15),
        child: Row(
          children: [
            Icon(icon, size: 19, color: AppTheme.textMuted),
            const SizedBox(width: 12),
            Text(label, style: Theme.of(context).textTheme.bodyMedium),
            const Spacer(),
            Text(
              value,
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w600,
                color: placeholder ? AppTheme.textMuted : AppTheme.textPrimary,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right_rounded, size: 20, color: AppTheme.textMuted),
          ],
        ),
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  const _StepperButton({required this.icon, this.onPressed});

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    return Material(
      color: enabled ? AppTheme.bgInput : AppTheme.bgElevated,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onPressed,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(icon,
              size: 20, color: enabled ? AppTheme.primary : AppTheme.textMuted),
        ),
      ),
    );
  }
}

class _CostSummary extends StatelessWidget {
  final int days;
  final int quantity;
  final double rate;
  final double rental;
  final double deposit;
  final double total;

  const _CostSummary({
    required this.days,
    required this.quantity,
    required this.rate,
    required this.rental,
    required this.deposit,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        children: [
          _row(context, 'Duration', '$days day${days > 1 ? 's' : ''}'),
          _row(context, 'Rate',
              '\$${rate.toStringAsFixed(2)} × $quantity unit${quantity > 1 ? 's' : ''}'),
          _row(context, 'Rental subtotal', '\$${rental.toStringAsFixed(2)}'),
          if (deposit > 0)
            _row(context, 'Refundable deposit', '\$${deposit.toStringAsFixed(2)}'),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Divider(height: 1),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Total due', style: Theme.of(context).textTheme.titleLarge),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.primary,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ],
      ),
    ).animate(delay: 100.ms).fadeIn(duration: 300.ms);
  }

  Widget _row(BuildContext context, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodyMedium),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      );
}

class _Banner extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String message;
  const _Banner({required this.icon, required this.color, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 19),
          const SizedBox(width: 10),
          Expanded(
            child: Text(message,
                style: TextStyle(color: color, fontSize: 13.5, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: -0.1, end: 0);
  }
}
