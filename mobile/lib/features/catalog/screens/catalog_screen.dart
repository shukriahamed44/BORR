/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Customer Equipment Catalog Screen (`catalog_screen.dart`).
 * Fetches all products from GET /api/v1/products, renders a premium searchable
 * grid of equipment cards with stock badges, price, and a "Reserve" action button.
 *
 * IN SIMPLE WORDS:
 * The equipment catalog page customers see — a beautiful searchable grid of
 * all available equipment with stock status and daily rate.
 */

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../shared/models/models.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  List<ProductModel> _products = [];
  List<ProductModel> _filtered = [];
  bool _loading = true;
  String? _error;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadProducts();
    _searchCtrl.addListener(_onSearch);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await apiService.get('/products');
      final list = (res.data as List).map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
      setState(() { _products = list; _filtered = list; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  void _onSearch() {
    final q = _searchCtrl.text.toLowerCase();
    setState(() {
      _filtered = _products
          .where((p) => p.name.toLowerCase().contains(q) || p.description.toLowerCase().contains(q))
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Equipment Catalog'),
            Text(
              'Welcome, ${user?.name ?? "Customer"}',
              style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.w400),
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
      backgroundColor: AppTheme.bgDeep,
      body: Column(
        children: [
          // ─── Search Bar ────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(color: AppTheme.textPrimary),
              decoration: const InputDecoration(
                hintText: 'Search equipment...',
                prefixIcon: Icon(Icons.search, color: AppTheme.textMuted),
              ),
            ),
          ),

          // ─── Product Grid ──────────────────────────────────────────────
          Expanded(
            child: _loading
                ? _buildShimmer()
                : _error != null
                    ? _buildError()
                    : RefreshIndicator(
                        onRefresh: _loadProducts,
                        color: AppTheme.primary,
                        child: _filtered.isEmpty
                            ? const Center(
                                child: Text('No equipment found.',
                                    style: TextStyle(color: AppTheme.textMuted)))
                            : GridView.builder(
                                padding: const EdgeInsets.all(16),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  mainAxisSpacing: 12,
                                  crossAxisSpacing: 12,
                                  childAspectRatio: 0.72,
                                ),
                                itemCount: _filtered.length,
                                itemBuilder: (_, i) => _ProductCard(
                                  product: _filtered[i],
                                  index: i,
                                ),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppTheme.bgSurface,
      highlightColor: AppTheme.bgElevated,
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72,
        ),
        itemCount: 6,
        itemBuilder: (_, __) => Container(
          decoration: BoxDecoration(
            color: AppTheme.bgSurface,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.wifi_off_rounded, color: AppTheme.textMuted, size: 48),
          const SizedBox(height: 16),
          Text(_error!, style: const TextStyle(color: AppTheme.textMuted)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadProducts, child: const Text('Retry')),
        ],
      ),
    );
  }
}

// ─── Product Card ─────────────────────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  final ProductModel product;
  final int index;
  const _ProductCard({required this.product, required this.index});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/catalog/${product.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.bgSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.borderSubtle),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Image Placeholder ─────────────────────────────────────
            Container(
              height: 110,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primary.withOpacity(0.2),
                    AppTheme.primaryLight.withOpacity(0.1),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Center(
                child: Icon(
                  Icons.construction_rounded,
                  color: AppTheme.primary.withOpacity(0.6),
                  size: 42,
                ),
              ),
            ),
            // ─── Details ────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: product.inStock
                              ? AppTheme.accent.withOpacity(0.15)
                              : AppTheme.danger.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          product.inStock ? 'In Stock' : 'Out of Stock',
                          style: TextStyle(
                            color: product.inStock ? AppTheme.accent : AppTheme.danger,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '\$${product.dailyRate.toStringAsFixed(2)}/day',
                    style: const TextStyle(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ).animate(delay: Duration(milliseconds: index * 80)).fadeIn().slideY(begin: 0.1, end: 0),
    );
  }
}
