/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Product Detail Screen with QR Code & Reservation CTA (`product_detail_screen.dart`).
 * Fetches product by ID from GET /api/v1/products/:id, displays full product details,
 * renders a scannable QR code (product ID encoded), and provides a "Make Reservation" button.
 *
 * IN SIMPLE WORDS:
 * The full product page — shows equipment details, a QR code for staff scanning,
 * and a big "Reserve" button for customers.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;
  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  ProductModel? _product;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await apiService.get('/products/${widget.productId}');
      setState(() {
        _product = ProductModel.fromJson(res.data as Map<String, dynamic>);
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(
        title: Text(_product?.name ?? 'Equipment Detail'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.danger)))
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final p = _product!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── Hero Image ───────────────────────────────────────────────
          Container(
            width: double.infinity,
            height: 200,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primary.withOpacity(0.25), AppTheme.primaryLight.withOpacity(0.1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.borderSubtle),
            ),
            child: const Center(
              child: Icon(Icons.construction_rounded, color: AppTheme.primary, size: 72),
            ),
          ).animate().fadeIn().scale(begin: const Offset(0.95, 0.95)),

          const SizedBox(height: 24),

          // ─── Name & Category ─────────────────────────────────────────
          Text(p.name, style: Theme.of(context).textTheme.headlineSmall)
              .animate(delay: 100.ms).fadeIn().slideX(begin: -0.05, end: 0),
          if (p.categoryName != null) ...[
            const SizedBox(height: 6),
            Chip(
              label: Text(p.categoryName!),
              backgroundColor: AppTheme.primary.withOpacity(0.15),
              labelStyle: const TextStyle(color: AppTheme.primaryLight, fontSize: 12),
            ),
          ],

          const SizedBox(height: 16),

          // ─── Stats Row ───────────────────────────────────────────────
          Row(
            children: [
              _StatCard(
                icon: Icons.attach_money_rounded,
                label: 'Daily Rate',
                value: '\$${p.pricePerDay.toStringAsFixed(2)}',
                color: AppTheme.accent,
              ),
              const SizedBox(width: 12),
              _StatCard(
                icon: Icons.inventory_2_rounded,
                label: 'Available',
                value: '${p.totalStock} units',
                color: p.inStock ? AppTheme.accent : AppTheme.danger,
              ),
            ],
          ).animate(delay: 200.ms).fadeIn().slideY(begin: 0.1, end: 0),

          const SizedBox(height: 12),

          Row(
            children: [
              _StatCard(
                icon: Icons.account_balance_wallet_rounded,
                label: 'Refundable Deposit',
                value: '\$${p.deposit.toStringAsFixed(2)}',
                color: AppTheme.warning,
              ),
              const SizedBox(width: 12),
              _StatCard(
                icon: Icons.qr_code_2_rounded,
                label: 'SKU',
                value: p.sku.isEmpty ? '—' : p.sku,
                color: AppTheme.textSecondary,
              ),
            ],
          ).animate(delay: 250.ms).fadeIn().slideY(begin: 0.1, end: 0),

          const SizedBox(height: 20),

          // ─── Description ─────────────────────────────────────────────
          Text('Description', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(p.description, style: Theme.of(context).textTheme.bodyMedium)
              .animate(delay: 300.ms).fadeIn(),

          // ─── Specifications ──────────────────────────────────────────
          if (p.specifications.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text('Specifications', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.bgSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.borderSubtle),
              ),
              child: Column(
                children: p.specifications.entries
                    .map((e) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(e.key,
                                  style: const TextStyle(
                                      color: AppTheme.textMuted, fontSize: 13)),
                              Text(e.value,
                                  style: const TextStyle(
                                      color: AppTheme.textPrimary,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ))
                    .toList(),
              ),
            ).animate(delay: 350.ms).fadeIn(),
          ],

          const SizedBox(height: 24),

          // ─── QR Code ─────────────────────────────────────────────────
          Text('Equipment QR Code', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          Center(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: QrImageView(
                data: 'ammunation:product:${p.id}',
                version: QrVersions.auto,
                size: 160,
                backgroundColor: Colors.white,
              ),
            ),
          ).animate(delay: 400.ms).fadeIn().scale(begin: const Offset(0.8, 0.8)),
          const SizedBox(height: 6),
          Center(
            child: Text(
              'Scan to verify equipment',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),

          const SizedBox(height: 32),

          // ─── Reserve CTA ─────────────────────────────────────────────
          if (p.inStock)
            ElevatedButton.icon(
              onPressed: () => context.push('/reservations/create?productId=${p.id}'),
              icon: const Icon(Icons.add_shopping_cart_rounded),
              label: const Text('Make Reservation'),
            ).animate(delay: 500.ms).fadeIn().slideY(begin: 0.2, end: 0)
          else
            OutlinedButton.icon(
              onPressed: null,
              icon: const Icon(Icons.block_rounded),
              label: const Text('Out of Stock'),
            ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 16)),
          ],
        ),
      ),
    );
  }
}
