# AmmuNation ERP — Database Entity Relationship Diagram

Generated from `backend/prisma/schema.prisma`, which remains the source of truth.
Rendered natively by GitHub, VS Code (Mermaid preview) and mermaid.live — no external
image asset is required.

**10 models · 8 enums.** Roles are an enum on `User.role`, not a join table, because a user
holds exactly one role.

---

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Reservation      : "places"
    User ||--o{ InventoryLog     : "operates"
    User ||--o{ Upload           : "owns"
    User ||--o{ Upload           : "reviews"
    User ||--o{ Notification     : "receives"
    User ||--o{ ActivityLog      : "generates"

    Category ||--o{ Product      : "classifies"
    Product  ||--o{ ReservationItem : "booked as"
    Product  ||--o{ InventoryLog  : "tracked by"

    Reservation ||--o{ ReservationItem : "contains"
    Reservation ||--o{ Payment         : "settled by"
    Reservation ||--o{ Upload          : "documented by"

    User {
        string   id PK
        string   email UK
        string   passwordHash
        string   name
        string   phone "nullable"
        Role     role "enum, indexed"
        datetime createdAt
        datetime updatedAt
    }

    Category {
        string   id PK
        string   name UK
        string   slug UK
        string   description "nullable"
        string   iconKey "nullable"
    }

    Product {
        string   id PK
        string   sku UK
        string   name "indexed"
        string   description "nullable"
        decimal  pricePerDay
        decimal  deposit "default 0"
        int      totalStock
        string   imageUrl "nullable"
        json     specifications "nullable"
        string   categoryId FK "nullable, SET NULL"
    }

    Reservation {
        string            id PK
        string            userId FK "indexed"
        ReservationStatus status "enum, indexed"
        datetime          startDate
        datetime          endDate "indexed"
        decimal           totalPrice
        string            rejectionReason "nullable"
    }

    ReservationItem {
        string  id PK
        string  reservationId FK
        string  productId FK
        int     quantity
        decimal unitPrice "price captured at booking"
    }

    Payment {
        string        id PK
        string        reservationId FK "indexed"
        decimal       amount
        PaymentStatus status "enum, indexed"
        string        transactionId "gateway PaymentIntent id"
        string        provider "default mock_stripe"
        string        failureReason "nullable"
        datetime      refundedAt "nullable"
    }

    InventoryLog {
        string          id PK
        string          productId FK "indexed"
        string          operatorId FK
        InventoryAction action "enum"
        int             quantity
        string          notes "nullable"
        datetime        timestamp "indexed"
    }

    Upload {
        string       id PK
        UploadType   type "enum"
        UploadStatus status "enum, indexed"
        string       originalName
        string       storageKey "driver-relative"
        string       mimeType
        int          sizeBytes
        string       ownerId FK "indexed, CASCADE"
        string       reservationId FK "nullable, CASCADE"
        string       reviewedById FK "nullable, SET NULL"
        datetime     reviewedAt "nullable"
        string       rejectionNote "nullable"
    }

    Notification {
        string           id PK
        string           userId FK "CASCADE"
        NotificationType type "enum"
        string           title
        string           body
        string           entityType "nullable"
        string           entityId "nullable, loose ref"
        datetime         readAt "nullable, indexed with userId"
    }

    ActivityLog {
        string         id PK
        string         userId FK "nullable, SET NULL, indexed"
        ActivityAction action "enum, indexed"
        string         entityType "nullable"
        string         entityId "nullable"
        json           metadata "nullable"
        string         ipAddress "nullable"
        datetime       createdAt "indexed"
    }
```

---

## Enumerations

| Enum | Values |
|---|---|
| `Role` | `ADMIN`, `STAFF`, `CUSTOMER`, `WAREHOUSE_OPERATOR` |
| `ReservationStatus` | `PENDING`, `APPROVED`, `REJECTED`, `ACTIVE`, `RETURNED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| `InventoryAction` | `RECEIVE`, `RELEASE`, `DAMAGE_RECORDED`, `MAINTENANCE` |
| `UploadType` | `IDENTITY_DOCUMENT`, `RENTAL_AGREEMENT`, `EQUIPMENT_IMAGE` |
| `UploadStatus` | `PENDING_REVIEW`, `VERIFIED`, `REJECTED` |
| `NotificationType` | `RESERVATION_APPROVED`, `RESERVATION_REJECTED`, `UPCOMING_RETURN`, `RESERVATION_EXPIRED`, `PAYMENT_RECEIVED`, `DOCUMENT_VERIFIED` |
| `ActivityAction` | `LOGIN`, `RESERVATION_CREATED`, `RESERVATION_UPDATED`, `PAYMENT_PROCESSED`, `PAYMENT_REFUNDED`, `INVENTORY_CHANGED`, `DOCUMENT_UPLOADED`, `DOCUMENT_REVIEWED` |

---

## Reservation state machine

Enforced server-side in `ReservationsService.validateStatusTransition`; illegal transitions
return `400`.

```mermaid
stateDiagram-v2
    [*] --> PENDING : customer books
    PENDING --> APPROVED  : staff approves
    PENDING --> REJECTED  : staff rejects (reason recorded)
    PENDING --> CANCELLED : customer cancels / expiry sweep
    APPROVED --> ACTIVE    : equipment handed over
    APPROVED --> CANCELLED : cancelled before pickup
    ACTIVE --> RETURNED    : equipment checked in
    REJECTED  --> [*]
    CANCELLED --> [*]
    RETURNED  --> [*]
```

---

## Referential integrity notes

- **`Product.categoryId` → `SET NULL`.** Deleting a category leaves its equipment intact and
  uncategorised rather than cascading the products away.
- **`Upload.ownerId` / `Upload.reservationId` → `CASCADE`.** Documents are meaningless once
  their owner or reservation is gone.
- **`ActivityLog.userId` → `SET NULL`.** The audit trail deliberately survives account
  deletion; entries are retained with a null actor.
- **`Notification.userId` → `CASCADE`.** A deleted account's feed is removed with it.
- **`ReservationItem.unitPrice`** stores the price at the moment of booking, so later catalog
  price changes never rewrite historical order totals.
