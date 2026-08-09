/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Customer Equipment Catalog Screen (`catalog_screen.dart`).
 * Fetches paginated equipment from GET /api/v1/products with server-side search
 * and category filtering, and renders it as a two-column card grid with skeleton
 * loading, infinite scroll and pull-to-refresh.
 *
 * IN SIMPLE WORDS:
 * The equipment browsing page — search, filter by category, scroll for more,
 * tap anything to see details and book it.
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
import '../../../shared/widgets/glass.dart';

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
    final name = context.select<AuthProvider, String?>((a) => a.user?.name);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _Greeting(name: name),
            const SizedBox(height: 14),
            _SearchField(controller: _searchCtrl),
            if (_categories.isNotEmpty) ...[
              const SizedBox(height: 12),
              _CategoryStrip(
                categories: _categories,
                selectedSlug: _categorySlug,
                onSelect: _selectCategory,
              ),
            ],
            const SizedBox(height: 4),
            Expanded(
              child: _loading
                  ? const _CatalogSkeleton()
                  : _error != null
                      ? EmptyState(
                          icon: Icons.wifi_off_rounded,
                          title: 'Could not load equipment',
                          message: _error,
                          actionLabel: 'Retry',
                          onAction: () => _loadProducts(),
                        )
                      : RefreshIndicator(
                          onRefresh: () => _loadProducts(),
                          color: AppTheme.primary,
                          child: _products.isEmpty
                              ? ListView(
                                  children: const [
                                    SizedBox(height: 80),
                                    EmptyState(
                                      icon: Icons.search_off_rounded,
                                      title: 'Nothing matches',
                                      message: 'Try another search or category.',
                                    ),
                                  ],
                                )
                              : GridView.builder(
                                  controller: _scrollCtrl,
                                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
                                  gridDelegate:
                                      const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 2,
                                    mainAxisSpacing: 14,
                                    crossAxisSpacing: 14,
                                    childAspectRatio: 0.70,
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
      ),
    );
  }
}

// ─── Header ───────────────────────────────────────────────────────────────────

class _Greeting extends StatelessWidget {
  final String? name;
  const _Greeting({this.name});

  @override
  Widget build(BuildContext context) {
    final first = (name ?? 'there').split(' ').first;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Hi, $first', style: Theme.of(context).textTheme.displayMedium),
                const SizedBox(height: 2),
                Text(
                  'What are you renting today?',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, size: 20),
            color: AppTheme.textMuted,
            tooltip: 'Sign out',
            onPressed: () => context.read<AuthProvider>().logout(),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  const _SearchField({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          boxShadow: AppTheme.shadowSoft,
        ),
        child: TextField(
          controller: controller,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: 'Search equipment…',
            filled: true,
            fillColor: Colors.white,
            prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textMuted, size: 21),
            suffixIcon: ValueListenableBuilder<TextEditingValue>(
              valueListenable: controller,
              builder: (_, value, __) => value.text.isEmpty
                  ? const SizedBox.shrink()
                  : IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: AppTheme.textMuted, size: 18),
                      onPressed: controller.clear,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CategoryStrip extends StatelessWidget {
  final List<CategoryModel> categories;
  final String? selectedSlug;
  final ValueChanged<String?> onSelect;

  const _CategoryStrip({
    required this.categories,
    required this.selectedSlug,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final slug = i == 0 ? null : categories[i - 1].slug;
          final label = i == 0 ? 'All' : categories[i - 1].name;
          final selected = selectedSlug == slug;
          return ChoiceChip(
            label: Text(label),
            selected: selected,
            onSelected: (_) => onSelect(slug),
          );
        },
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
    return AppCard(
      padding: EdgeInsets.zero,
      onTap: () => context.push('/catalog/${product.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ponytail: backend imageUrl is a relative path with no host serving it,
          // so equipment renders as a tinted glyph until real image hosting exists.
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFFEFF4FF), Color(0xFFE3ECFB)],
                ),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Icon(Icons.handyman_rounded,
                        size: 44, color: AppTheme.primary.withOpacity(0.55)),
                  ),
                  Positioned(
                    top: 10,
                    left: 10,
                    child: StatusPill(
                      label: product.inStock ? 'Available' : 'Out of stock',
                      color: product.inStock ? AppTheme.accent : AppTheme.danger,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 11, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 2),
                Text(
                  product.categoryName ?? 'Equipment',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '\$${product.pricePerDay.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(width: 3),
                    Text('/day', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    )
        .animate(delay: Duration(milliseconds: (index % 8) * 60))
        .fadeIn(duration: 350.ms)
        .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

class _CatalogSkeleton extends StatelessWidget {
  const _CatalogSkeleton();

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: const Color(0xFFE9EEF5),
      highlightColor: const Color(0xFFF7FAFF),
      child: GridView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 14,
          crossAxisSpacing: 14,
          childAspectRatio: 0.70,
        ),
        itemCount: 6,
        itemBuilder: (_, __) => Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
        ),
      ),
    );
  }
}
