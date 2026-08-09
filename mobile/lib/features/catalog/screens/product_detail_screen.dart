/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Equipment Detail Screen (`product_detail_screen.dart`).
 * Fetches a single item from GET /api/v1/products/:id and presents it as an
 * iOS-style detail sheet — hero panel with floating glass controls, pricing and
 * deposit, specification rows, the item's QR tag, and a pinned booking bar.
 *
 * IN SIMPLE WORDS:
 * The page for one piece of equipment — photo area, price, specs, its QR code,
 * and the Reserve button fixed at the bottom.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/glass.dart';

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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await apiService.get('/products/${widget.productId}');
      setState(() {
        _product = ProductModel.fromJson(res.data as Map<String, dynamic>);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _error != null
              ? SafeArea(
                  child: Column(
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: GlassIconButton(
                            icon: Icons.arrow_back_ios_new_rounded,
                            onPressed: () => context.pop(),
                          ),
                        ),
                      ),
                      Expanded(
                        child: EmptyState(
                          icon: Icons.error_outline_rounded,
                          title: 'Could not load this item',
                          message: _error,
                          actionLabel: 'Retry',
                          onAction: _load,
                        ),
                      ),
                    ],
                  ),
                )
              : _buildContent(),
      bottomNavigationBar: _product == null ? null : _BookingBar(product: _product!),
    );
  }

  Widget _buildContent() {
    final p = _product!;
    return CustomScrollView(
      slivers: [
        // ─── Hero ──────────────────────────────────────────────────────────
        SliverAppBar(
          expandedHeight: 300,
          pinned: true,
          backgroundColor: AppTheme.bgDeep,
          surfaceTintColor: Colors.transparent,
          leadingWidth: 62,
          leading: Padding(
            padding: const EdgeInsets.only(left: 16, top: 6, bottom: 6),
            child: GlassIconButton(
              icon: Icons.arrow_back_ios_new_rounded,
              onPressed: () => context.pop(),
            ),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFEFF4FF), Color(0xFFE0E9F8)],
                ),
              ),
              child: Center(
                child: Icon(
                  Icons.handyman_rounded,
                  size: 108,
                  color: AppTheme.primary.withOpacity(0.5),
                ),
              ),
            ),
          ),
        ),

        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ─── Title block ──────────────────────────────────────────
                Row(
                  children: [
                    Expanded(
                      child: Text(p.name,
                          style: Theme.of(context).textTheme.displayMedium),
                    ),
                    StatusPill(
                      label: p.inStock ? '${p.totalStock} available' : 'Out of stock',
                      color: p.inStock ? AppTheme.accent : AppTheme.danger,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    if (p.categoryName != null) ...[
                      Text(p.categoryName!,
                          style: Theme.of(context).textTheme.bodyMedium),
                      const _Dot(),
                    ],
                    Text('SKU ${p.sku.isEmpty ? '—' : p.sku}',
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),

                const SizedBox(height: 20),

                // ─── Price + deposit ──────────────────────────────────────
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                  child: Row(
                    children: [
                      _PriceBlock(
                        label: 'Rental rate',
                        value: '\$${p.pricePerDay.toStringAsFixed(2)}',
                        suffix: '/day',
                        emphasise: true,
                      ),
                      Container(
                        width: 1,
                        height: 34,
                        color: AppTheme.borderSubtle,
                        margin: const EdgeInsets.symmetric(horizontal: 18),
                      ),
                      _PriceBlock(
                        label: 'Refundable deposit',
                        value: '\$${p.deposit.toStringAsFixed(2)}',
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.1, end: 0),

                if (p.description.isNotEmpty) ...[
                  const SizedBox(height: 26),
                  Text('About this equipment',
                      style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 8),
                  Text(p.description, style: Theme.of(context).textTheme.bodyLarge),
                ],

                // ─── Specifications ───────────────────────────────────────
                if (p.specifications.isNotEmpty) ...[
                  const SizedBox(height: 26),
                  Text('Specifications',
                      style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 10),
                  AppCard(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: [
                        for (var i = 0; i < p.specifications.length; i++) ...[
                          if (i > 0) const Divider(height: 1),
                          _SpecRow(
                            label: p.specifications.keys.elementAt(i),
                            value: p.specifications.values.elementAt(i),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],

                // ─── QR tag ───────────────────────────────────────────────
                const SizedBox(height: 26),
                Text('Equipment tag', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 10),
                AppCard(
                  child: Row(
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
                          size: 82,
                          backgroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Scan to verify',
                                style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 4),
                            Text(
                              'Staff scan this tag at pickup and return to move the booking along.',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ).animate(delay: 200.ms).fadeIn(),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

class _BookingBar extends StatelessWidget {
  final ProductModel product;
  const _BookingBar({required this.product});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppTheme.borderSubtle)),
      ),
      child: SafeArea(
        top: false,
        child: product.inStock
            ? PrimaryButton(
                label: 'Reserve this equipment',
                icon: Icons.event_available_rounded,
                onPressed: () =>
                    context.push('/reservations/create?productId=${product.id}'),
              )
            : const PrimaryButton(label: 'Currently unavailable'),
      ),
    );
  }
}

class _PriceBlock extends StatelessWidget {
  final String label;
  final String value;
  final String? suffix;
  final bool emphasise;

  const _PriceBlock({
    required this.label,
    required this.value,
    this.suffix,
    this.emphasise = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 4),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: emphasise ? 22 : 18,
                fontWeight: FontWeight.w700,
                color: emphasise ? AppTheme.primary : AppTheme.textPrimary,
                letterSpacing: -0.4,
              ),
            ),
            if (suffix != null) ...[
              const SizedBox(width: 2),
              Text(suffix!, style: Theme.of(context).textTheme.bodySmall),
            ],
          ],
        ),
      ],
    );
  }
}

class _SpecRow extends StatelessWidget {
  final String label;
  final String value;
  const _SpecRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 13),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot();

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 7),
        child: Text('·', style: TextStyle(color: AppTheme.textMuted)),
      );
}
