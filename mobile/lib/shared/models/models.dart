/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Dart Data Models for API Response Mapping (`models.dart`).
 * Defines immutable data classes for User, Product, Reservation, and ReservationItem
 * that map directly to the NestJS Prisma schema — used throughout the app.
 *
 * IN SIMPLE WORDS:
 * The blueprint classes that represent backend data (users, products, reservations)
 * so Flutter knows what shape of data to expect from API responses.
 */

/// Prisma `Decimal` columns are serialized as JSON **strings** ("249.5"), not numbers.
/// Every money/price field must go through this or `.toDouble()` throws at runtime.
double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;

  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['sub'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'CUSTOMER',
    );
  }

  bool get isCustomer => role == 'CUSTOMER';
  bool get isStaff => role == 'STAFF';
  bool get isAdmin => role == 'ADMIN';
  bool get isWarehouseOperator => role == 'WAREHOUSE_OPERATOR';
}

// ─────────────────────────────────────────────────────────────────────────────

class ProductModel {
  final String id;
  final String name;
  final String sku;
  final String description;
  final double pricePerDay;
  final double deposit;
  final int totalStock;
  final String? imageUrl;
  final String? categoryName;
  final Map<String, String> specifications;

  const ProductModel({
    required this.id,
    required this.name,
    required this.sku,
    required this.description,
    required this.pricePerDay,
    required this.deposit,
    required this.totalStock,
    this.imageUrl,
    this.categoryName,
    this.specifications = const {},
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final specs = json['specifications'];
    return ProductModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      sku: json['sku'] ?? '',
      description: json['description'] ?? '',
      pricePerDay: _toDouble(json['pricePerDay']),
      deposit: _toDouble(json['deposit']),
      totalStock: json['totalStock'] ?? 0,
      imageUrl: json['imageUrl'],
      // Backend includes the full category relation, not a plain string.
      categoryName: json['category'] is Map ? json['category']['name'] : json['category'],
      specifications: specs is Map
          ? specs.map((k, v) => MapEntry(k.toString(), v.toString()))
          : const {},
    );
  }

  bool get inStock => totalStock > 0;
}

// ─────────────────────────────────────────────────────────────────────────────

class CategoryModel {
  final String id;
  final String name;
  final String slug;

  const CategoryModel({required this.id, required this.name, required this.slug});

  factory CategoryModel.fromJson(Map<String, dynamic> json) => CategoryModel(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        slug: json['slug'] ?? '',
      );
}

// ─────────────────────────────────────────────────────────────────────────────

class ReservationItemModel {
  final String productId;
  final String productName;
  final int quantity;
  final double unitPrice;

  const ReservationItemModel({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
  });

  factory ReservationItemModel.fromJson(Map<String, dynamic> json) {
    return ReservationItemModel(
      productId: json['productId'] ?? '',
      productName: json['product']?['name'] ?? 'Unknown',
      quantity: json['quantity'] ?? 1,
      unitPrice: _toDouble(json['unitPrice']),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class ReservationModel {
  final String id;
  final String status;
  final DateTime startDate;
  final DateTime endDate;
  final double totalPrice;
  final String userId;
  final String? customerName;
  final List<ReservationItemModel> items;

  const ReservationModel({
    required this.id,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.totalPrice,
    required this.userId,
    this.customerName,
    required this.items,
  });

  factory ReservationModel.fromJson(Map<String, dynamic> json) {
    return ReservationModel(
      id: json['id'] ?? '',
      status: json['status'] ?? 'PENDING',
      startDate: DateTime.tryParse(json['startDate'] ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(json['endDate'] ?? '') ?? DateTime.now(),
      totalPrice: _toDouble(json['totalPrice']),
      userId: json['userId'] ?? '',
      customerName: json['user']?['name'],
      items: (json['items'] as List<dynamic>? ?? [])
          .map((i) => ReservationItemModel.fromJson(i as Map<String, dynamic>))
          .toList(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class NotificationModel {
  final String id;
  final String title;
  final String body;
  final DateTime receivedAt;
  final bool isRead;

  /// Backend `NotificationType` enum value (RESERVATION_APPROVED, UPCOMING_RETURN,
  /// …). Empty for locally-raised alerts that never came from the feed.
  final String type;

  /// The record the alert is about — a reservation id, used to deep-link.
  final String? entityId;

  const NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.receivedAt,
    this.isRead = false,
    this.type = '',
    this.entityId,
  });

  /// Mirrors a row from `GET /notifications`. `readAt` is null while unread.
  factory NotificationModel.fromJson(Map<String, dynamic> json) => NotificationModel(
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        body: json['body']?.toString() ?? '',
        receivedAt:
            DateTime.tryParse(json['createdAt']?.toString() ?? '')?.toLocal() ??
                DateTime.now(),
        isRead: json['readAt'] != null,
        type: json['type']?.toString() ?? '',
        entityId: json['entityId']?.toString(),
      );
}
