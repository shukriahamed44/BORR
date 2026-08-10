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

  group('NotificationModel', () {
    // Verbatim row from GET /api/v1/notifications (NotificationsService.findForUser).
    Map<String, dynamic> row({dynamic readAt}) => {
          'id': '25994b56-9263-4a6d-9c87-1ff4d825ab3d',
          'userId': '4a6674b6-b999-45d2-8d44-18c0b23ba441',
          'type': 'RESERVATION_APPROVED',
          'title': 'Reservation approved',
          'body': 'Your reservation #E61D7B3B was approved. Pickup Tue Sep 01 2026.',
          'entityType': 'Reservation',
          'entityId': 'e61d7b3b-6852-406c-b614-cbb221918342',
          'readAt': readAt,
          'createdAt': '2026-08-10T09:30:00.000Z',
        };

    test('parses a feed row', () {
      final n = NotificationModel.fromJson(row());
      expect(n.id, '25994b56-9263-4a6d-9c87-1ff4d825ab3d');
      expect(n.type, 'RESERVATION_APPROVED');
      expect(n.title, 'Reservation approved');
      expect(n.entityId, 'e61d7b3b-6852-406c-b614-cbb221918342');
      expect(n.receivedAt.isUtc, isFalse,
          reason: 'server sends UTC; the inbox shows local time');
    });

    test('readAt is what makes a row read', () {
      expect(NotificationModel.fromJson(row()).isRead, isFalse);
      expect(
        NotificationModel.fromJson(row(readAt: '2026-08-10T10:00:00.000Z')).isRead,
        isTrue,
      );
    });

    test('a malformed row degrades instead of throwing', () {
      final n = NotificationModel.fromJson({'id': 'x'});
      expect(n.id, 'x');
      expect(n.title, isEmpty);
      expect(n.isRead, isFalse);
      expect(n.type, isEmpty);
    });
  });

  group('Asset URLs', () {
    test('a relative backend path becomes an absolute URL off the API origin', () {
      final origin = Uri.parse(AppConstants.apiBaseUrl).origin;
      expect(AppConstants.assetUrl('/equipment/tl-drill-001.jpg'),
          '$origin/equipment/tl-drill-001.jpg');
      // No /api/v1 — static files sit at the server root.
      expect(AppConstants.assetUrl('/equipment/x.jpg'), isNot(contains('/api/v1')));
    });

    test('absent and already-absolute paths pass through', () {
      expect(AppConstants.assetUrl(null), isNull);
      expect(AppConstants.assetUrl(''), isNull);
      expect(AppConstants.assetUrl('https://cdn.test/a.jpg'), 'https://cdn.test/a.jpg');
    });
  });
}
