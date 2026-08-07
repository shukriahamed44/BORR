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

import 'dart:async';

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
  final List<ProductModel> _products = [];
  List<CategoryModel> _categories = [];
  String? _categorySlug;

  bool _loading = true;
  bool _loadingMore = false;
  String? _error;

  int _page = 1;
  int _totalPages = 1;

  final _searchCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _loadProducts();
    _searchCtrl.addListener(_onSearchChanged);
    _scrollCtrl.addListener(_onScroll);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final res = await apiService.get('/categories');
      final list = ((res.data['categories'] ?? []) as List)
          .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
          .toList();
      if (mounted) setState(() => _categories = list);
    } catch (_) {
      // Filter chips are optional chrome — a failure here must not break the catalog.
    }
  }

  /// Loads page 1 fresh, or appends the next page when [append] is true.
  Future<void> _loadProducts({bool append = false}) async {
    setState(() {
      if (append) {
        _loadingMore = true;
      } else {
        _loading = true;
        _error = null;
        _page = 1;
      }
    });

    try {
      final res = await apiService.get('/products', params: {
        'page': _page,
        'limit': 12,
        if (_searchCtrl.text.trim().isNotEmpty) 'search': _searchCtrl.text.trim(),
        if (_categorySlug != null) 'categorySlug': _categorySlug,
      });

      // Backend wraps the collection: { products: [...], total, page, totalPages }
      final list = ((res.data['products'] ?? []) as List)
          .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
          .toList();

      setState(() {
        if (!append) _products.clear();
        _products.addAll(list);
        _totalPages = res.data['totalPages'] ?? 1;
        _loading = false;
        _loadingMore = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
        _loadingMore = false;
      });
    }
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () => _loadProducts());
  }

  void _onScroll() {
    if (_loadingMore || _loading || _page >= _totalPages) return;
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 300) {
      _page++;
      _loadProducts(append: true);
    }
  }

  void _selectCategory(String? slug) {
    setState(() => _categorySlug = slug);
    _loadProducts();
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

          // ─── Category Filter Chips ─────────────────────────────────────
          if (_categories.isNotEmpty)
            SizedBox(
              height: 44,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length + 1,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final slug = i == 0 ? null : _categories[i - 1].slug;
                  final label = i == 0 ? 'All' : _categories[i - 1].name;
                  final selected = _categorySlug == slug;
                  return ChoiceChip(
                    label: Text(label),
                    selected: selected,
                    onSelected: (_) => _selectCategory(slug),
                    selectedColor: AppTheme.primary.withOpacity(0.2),
                    labelStyle: TextStyle(
                      color: selected ? AppTheme.primary : AppTheme.textMuted,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    ),
                  );
                },
              ),
            ),

          // ─── Product Grid ──────────────────────────────────────────────
          Expanded(
            child: _loading
                ? _buildShimmer()
                : _error != null
                    ? _buildError()
                    : RefreshIndicator(
                        onRefresh: () => _loadProducts(),
                        color: AppTheme.primary,
                        child: _products.isEmpty
                            ? const Center(
                                child: Text('No equipment found.',
                                    style: TextStyle(color: AppTheme.textMuted)))
                            : GridView.builder(
                                controller: _scrollCtrl,
                                padding: const EdgeInsets.all(16),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  mainAxisSpacing: 12,
                                  crossAxisSpacing: 12,
                                  childAspectRatio: 0.72,
                                ),
                                // One extra slot holds the "loading next page" spinner.
                                itemCount: _products.length + (_loadingMore ? 1 : 0),
                                itemBuilder: (_, i) => i >= _products.length
                                    ? const Center(
                                        child: CircularProgressIndicator(
                                            color: AppTheme.primary, strokeWidth: 2))
                                    : _ProductCard(product: _products[i], index: i),
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
          ElevatedButton(onPressed: () => _loadProducts(), child: const Text('Retry')),
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
                    '\$${product.pricePerDay.toStringAsFixed(2)}/day',
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
