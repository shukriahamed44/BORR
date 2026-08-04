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
      id: json['id'] ?? '',
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
  final String description;
  final double dailyRate;
  final int stockQuantity;
  final String? imageUrl;
  final String? category;

  const ProductModel({
    required this.id,
    required this.name,
    required this.description,
    required this.dailyRate,
    required this.stockQuantity,
    this.imageUrl,
    this.category,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      dailyRate: (json['dailyRate'] ?? 0).toDouble(),
      stockQuantity: json['stockQuantity'] ?? 0,
      imageUrl: json['imageUrl'],
      category: json['category'],
    );
  }

  bool get inStock => stockQuantity > 0;
}

// ─────────────────────────────────────────────────────────────────────────────

class ReservationItemModel {
  final String productId;
  final String productName;
  final int quantity;
  final double dailyRate;

  const ReservationItemModel({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.dailyRate,
  });

  factory ReservationItemModel.fromJson(Map<String, dynamic> json) {
    return ReservationItemModel(
      productId: json['productId'] ?? '',
      productName: json['product']?['name'] ?? 'Unknown',
      quantity: json['quantity'] ?? 1,
      dailyRate: (json['dailyRate'] ?? 0).toDouble(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class ReservationModel {
  final String id;
  final String status;
  final DateTime startDate;
  final DateTime endDate;
  final double totalAmount;
  final String customerId;
  final String? customerName;
  final List<ReservationItemModel> items;

  const ReservationModel({
    required this.id,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.totalAmount,
    required this.customerId,
    this.customerName,
    required this.items,
  });

  factory ReservationModel.fromJson(Map<String, dynamic> json) {
    return ReservationModel(
      id: json['id'] ?? '',
      status: json['status'] ?? 'PENDING',
      startDate: DateTime.tryParse(json['startDate'] ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(json['endDate'] ?? '') ?? DateTime.now(),
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      customerId: json['customerId'] ?? '',
      customerName: json['customer']?['name'],
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

  const NotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.receivedAt,
    this.isRead = false,
  });
}
