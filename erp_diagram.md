# ERP Database Entity Relationship Diagram (ERD)

![ERP Database ERD Diagram](file:///C:/Users/User/.gemini/antigravity-ide/brain/4e205062-9c02-477c-93a0-860229c71095/erp_database_erd_1785728468093.png)

## Interactive Mermaid Diagram

```mermaid
erDiagram
    USER {
        String id PK
        String email UK
        String name
        Role role "ADMIN | STAFF | CUSTOMER | WAREHOUSE_OPERATOR"
        DateTime createdAt
    }

    PRODUCT {
        String id PK
        String name
        String sku UK
        Decimal pricePerDay
        Int totalStock
        DateTime createdAt
    }

    RESERVATION {
        String id PK
        String userId FK "Customer"
        ReservationStatus status "PENDING | APPROVED | REJECTED | ACTIVE | RETURNED | CANCELLED"
        DateTime startDate
        DateTime endDate
        Decimal totalPrice
        DateTime createdAt
    }

    RESERVATION_ITEM {
        String id PK
        String reservationId FK
        String productId FK
        Int quantity
        Decimal unitPrice
    }

    PAYMENT {
        String id PK
        String reservationId FK
        Decimal amount
        PaymentStatus status "PENDING | PAID | FAILED | REFUNDED"
        String transactionId
        DateTime createdAt
    }

    INVENTORY_LOG {
        String id PK
        String productId FK
        String operatorId FK "Warehouse Operator"
        InventoryAction action "RECEIVE | RELEASE | DAMAGE_RECORDED | MAINTENANCE"
        Int quantity
        String notes
        DateTime timestamp
    }

    USER ||--o{ RESERVATION : "places"
    USER ||--o{ INVENTORY_LOG : "performs"
    RESERVATION ||--o{ RESERVATION_ITEM : "contains"
    PRODUCT ||--o{ RESERVATION_ITEM : "reserved in"
    RESERVATION ||--o{ PAYMENT : "has"
    PRODUCT ||--o{ INVENTORY_LOG : "has history"
```

## Entities & Enums Summary

| Enum Name | Options | Main Entity Bound |
| :--- | :--- | :--- |
| `Role` | `ADMIN`, `STAFF`, `CUSTOMER`, `WAREHOUSE_OPERATOR` | `User.role` |
| `ReservationStatus` | `PENDING`, `APPROVED`, `REJECTED`, `ACTIVE`, `RETURNED`, `CANCELLED` | `Reservation.status` |
| `PaymentStatus` | `PENDING`, `PAID`, `FAILED`, `REFUNDED` | `Payment.status` |
| `InventoryAction` | `RECEIVE`, `RELEASE`, `DAMAGE_RECORDED`, `MAINTENANCE` | `InventoryLog.action` |
