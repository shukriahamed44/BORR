/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit tests for API response deserialization (`models_test.dart`).
 * Asserts the Dart models parse the exact JSON shapes the NestJS backend returns,
 * including Prisma `Decimal` fields arriving as strings and nested relations.
 *
 * IN SIMPLE WORDS:
 * Proves the app reads backend data correctly — the field-name and price-parsing
 * mistakes these tests cover are the ones that silently show $0.00 everywhere.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:ammunation_mobile/core/constants/app_constants.dart';
import 'package:ammunation_mobile/shared/models/models.dart';

void main() {
  group('ProductModel', () {
    // Verbatim shape of GET /api/v1/products/:id
    final json = {
      'id': 'p1',
      'name': 'Bosch Rotary Hammer',
      'sku': 'TL-DRILL-001',
      'description': 'SDS-plus rotary hammer.',
      'pricePerDay': '45.5', // Prisma Decimal → JSON string
      'deposit': '150',
      'totalStock': 4,
      'imageUrl': '/equipment/tl-drill-001.jpg',
      'category': {'id': 'c1', 'name': 'Power Tools', 'slug': 'power-tools'},
      'specifications': {'Power': '710W', 'Weight': '2.1kg'},
    };

    test('parses Decimal strings into doubles', () {
      final p = ProductModel.fromJson(json);
      expect(p.pricePerDay, 45.5);
      expect(p.deposit, 150.0);
    });

    test('flattens the nested category relation to its name', () {
      expect(ProductModel.fromJson(json).categoryName, 'Power Tools');
    });

    test('reads specifications and stock', () {
      final p = ProductModel.fromJson(json);
      expect(p.specifications['Power'], '710W');
      expect(p.totalStock, 4);
      expect(p.inStock, isTrue);
    });

    test('survives missing optional fields', () {
      final p = ProductModel.fromJson({'id': 'p2', 'name': 'Bare', 'totalStock': 0});
      expect(p.pricePerDay, 0);
      expect(p.categoryName, isNull);
      expect(p.specifications, isEmpty);
      expect(p.inStock, isFalse);
    });
  });

  group('ReservationModel', () {
    // Verbatim shape of an element of GET /api/v1/reservations
    final json = {
      'id': 'a1b2c3d4-0000-0000-0000-000000000000',
      'userId': 'u1',
      'status': 'APPROVED',
      'startDate': '2026-08-10T09:00:00.000Z',
      'endDate': '2026-08-15T18:00:00.000Z',
      'totalPrice': '227.50',
      'user': {'id': 'u1', 'name': 'Jane Doe'},
      'items': [
        {
          'productId': 'p1',
          'quantity': 2,
          'unitPrice': '45.5',
          'product': {'name': 'Bosch Rotary Hammer'},
        }
      ],
    };

    test('parses totals, owner and nested items', () {
      final r = ReservationModel.fromJson(json);
      expect(r.totalPrice, 227.50);
      expect(r.userId, 'u1');
      expect(r.customerName, 'Jane Doe');
      expect(r.items.single.productName, 'Bosch Rotary Hammer');
      expect(r.items.single.unitPrice, 45.5);
      expect(r.startDate.day, 10);
    });

    test('status is a backend enum value the UI knows how to label', () {
      final r = ReservationModel.fromJson(json);
      expect(AppConstants.statusLabels.containsKey(r.status), isTrue);
    });
  });

  group('Reservation state machine', () {
    test('mirrors the backend transitions', () {
      expect(AppConstants.nextStatuses('PENDING'),
          containsAll(['APPROVED', 'REJECTED', 'CANCELLED']));
      expect(AppConstants.nextStatuses('APPROVED'), containsAll(['ACTIVE', 'CANCELLED']));
      expect(AppConstants.nextStatuses('ACTIVE'), ['RETURNED']);
    });

    test('terminal states offer no further moves', () {
      for (final terminal in ['RETURNED', 'REJECTED', 'CANCELLED']) {
        expect(AppConstants.nextStatuses(terminal), isEmpty, reason: terminal);
      }
    });

    test('never offers a status the backend enum does not have', () {
      for (final entry in AppConstants.allowedTransitions.entries) {
        expect(AppConstants.reservationStatuses, contains(entry.key));
        for (final target in entry.value) {
          expect(AppConstants.reservationStatuses, contains(target));
        }
      }
    });
  });
}
