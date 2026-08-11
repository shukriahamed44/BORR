# AmmuNation Enterprise Equipment Rental ERP Platform

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Web-React%2019%20%2B%20Vite-blue.svg)](https://react.dev/)
[![Flutter](https://img.shields.io/badge/Mobile-Flutter%203.38-blue.svg)](https://flutter.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Queue-Redis%20%2B%20BullMQ-red.svg)](https://bullmq.io/)

> **Enterprise Software Development Assessment**
> A complete full-stack equipment rental management system comprising a NestJS REST API, a
> React 19 web application, a Flutter mobile application for iOS and Android, a PostgreSQL
> database accessed through Prisma ORM, and BullMQ asynchronous notification workers.

---

## Table of Contents

1. [Architecture and System Overview](#architecture-and-system-overview)
2. [Technology Stack](#technology-stack)
3. [Key Features and Modules](#key-features-and-modules)
4. [Deliverables Checklist](#deliverables-checklist)
5. [Demo Credentials](#demo-credentials)
6. [Quick Start and Setup Instructions](#quick-start-and-setup-instructions)
7. [API Documentation](#api-documentation)
8. [Database ER Diagram](#database-er-diagram)

---

## Architecture and System Overview

The AmmuNation ERP system follows Clean Architecture principles, SOLID design, and a modular
layered structure:

```
project AmmuNation/
├── backend/                  NestJS 11 REST API server (port 3000)
│   ├── prisma/               Schema, migrations, seed and idempotent catalog seed
│   ├── src/
│   │   ├── auth/             JWT with refresh rotation, RBAC guards, profile and password
│   │   ├── users/            Staff-facing account directory
│   │   ├── products/         Equipment CRUD, search, filter, sort, pagination
│   │   ├── categories/       Equipment taxonomy
│   │   ├── reservations/     Booking engine and status state machine
│   │   ├── uploads/          Documents behind a swappable StorageDriver
│   │   ├── inventory/        Stock movements and immutable audit logs
│   │   ├── payments/         Stripe-shaped PaymentGateway adapter and ledger
│   │   ├── dashboard/        Server-side KPI aggregation
│   │   ├── notifications/    BullMQ queue, worker, durable in-app feed
│   │   ├── activity/         Global audit trail (ActivityLog)
│   │   └── prisma/           Database service and ORM connection
│   ├── public/equipment/     Equipment images, named <sku-lowercase>.jpg
│   └── postman_collection.json
│
├── frontend/                 Active web application: Vite + React 19 (port 5173)
│   └── src/
│       ├── components/layout/     AppShell, role-based sidebar, header
│       ├── components/pages/      Equipment, Reservations, Inventory,
│       │                          Payments, Customers, Settings (with sibling .css)
│       ├── components/dashboard/  KPI dashboard
│       ├── services/api.ts        Fetch client, token refresh, typed endpoints
│       └── index.css              Glass design system and dark theme
│
├── mobile/                   Flutter cross-platform application (Android, iOS, web)
│   ├── lib/
│   │   ├── core/             Dio client, secure storage (Keychain/Keystore), theme
│   │   ├── features/         Catalog, reservations, QR scanner, push notifications
│   │   └── shared/           Dart data models and navigation shells
│   └── build/outputs/        Compiled APK deliverables
│
├── scripts/dev.ps1           Local dev launcher: data, backend, web, status
├── scripts/devstack.ps1      Portable PostgreSQL and Redis for Windows
├── docker-compose.yml        PostgreSQL and Redis infrastructure (deployment)
├── MASTER BOOTUP GUIDE.md    Startup order, host layout, environment findings
├── RUNBOOK.md                Startup guide with environment pitfalls and fixes
└── PROJECT-STATE.md          Build status, decisions, known gaps
```

> **Which frontend?** The submitted web UI is `frontend/` (Vite + React 19). An earlier Next.js
> scaffold, `web/`, was deleted and survives in git history only.

---

## Technology Stack

| Layer | Technology | Description |
|---|---|---|
| Backend API | NestJS 11 (Node.js, TypeScript) | Modular architecture, Swagger OpenAPI, class-validator DTOs |
| Database | PostgreSQL 16 | Relational schema with foreign keys, constraints and indexes via Prisma ORM |
| Cache and queue | Redis with BullMQ | Asynchronous background processing for email and push notifications |
| Web frontend | Vite + React 19 (TypeScript) | Glassmorphic UI, responsive layouts, typed API client |
| Mobile application | Flutter 3.38 (Dart) | Cross-platform app with secure token storage, QR scanner, local push notifications |
| Authentication | JWT with refresh tokens | Role-based access control (Admin, Staff, Customer, Warehouse Operator) |

---

## Key Features and Modules

### 1. Authentication and Security
- **JWT access and refresh tokens**: dual-token pattern with short-lived access tokens (15 minutes)
  and long-lived refresh tokens (7 days).
- **Role-based access control**: guards enforce permissions for `ADMIN`, `STAFF`, `CUSTOMER` and
  `WAREHOUSE_OPERATOR`.
- **Forgot and reset password**: issues secure reset tokens with a 30-minute expiry.
- **Bcrypt hashing**: password storage with a salt round count of 10.

### 2. Equipment and Catalog
- Equipment listing with offset pagination, full-text search across name, SKU and description,
  category filtering by id or slug, price-range narrowing, in-stock filtering and four sort orders.
- Daily rate, refundable deposit, stock availability and key/value technical specifications per item.
- Images are served by the backend from `backend/public/equipment/<sku>.jpg` at `/equipment/<sku>.jpg`
  — one copy shared by web and mobile — with a labelled placeholder when a file is absent.
- QR generation and barcode scanning are implemented in the Flutter application (`qr_flutter`,
  `mobile_scanner`); they are not part of the backend or the web catalog.

### 3. Reservation Booking Engine
- Date range selection with automatic duration and total cost computation.
- A state machine enforced server-side, rejecting illegal transitions with `400`:
  `PENDING` to `APPROVED`, `REJECTED` or `CANCELLED`; `APPROVED` to `ACTIVE` or `CANCELLED`;
  `ACTIVE` to `RETURNED`. `RETURNED`, `REJECTED` and `CANCELLED` are terminal.
- Customers may cancel only their own `PENDING` booking; rejections carry a reason back to the customer.
- Document uploads (identity document, rental agreement) with staff verification and rejection.

### 4. Inventory Audit and Warehouse Operations
- `RECEIVE`, `RELEASE`, `DAMAGE_RECORDED` and `MAINTENANCE` movements, with stock and log written in
  a single Prisma `$transaction` and a guard rejecting deductions that exceed available stock.
- Immutable audit trail with operator attribution.

### 5. Payment Workflow (Stripe-shaped adapter)
- A `PaymentGateway` abstraction modelled on Stripe's PaymentIntent lifecycle
  (`createPaymentIntent`, `confirmPaymentIntent`, `refund`), using Stripe's vocabulary: `pi_…`
  identifiers, client secrets, minor-unit amounts, `succeeded` and `requires_payment_method`.
- `MockStripeGateway` ships by default; substituting a real Stripe driver is a one-line provider
  change in `payments.module.ts`, with no service or HTTP contract changes.
- Declined attempts are persisted as `FAILED` before the error surfaces, so they appear in the ledger.
- Statuses: `PENDING`, `PAID`, `FAILED`, `REFUNDED`, with a printable invoice per transaction.

### 6. Notifications and Audit Trail
- A durable `Notification` feed (approved, rejected, upcoming return, expiry) with unread counts,
  written to PostgreSQL at enqueue time so the inbox does not depend on Redis; BullMQ handles
  outbound email and push delivery.
- `ActivityLog` records login, reservation created and updated, payment processed and refunded,
  inventory changes, and document upload and review, with actor and IP address. Readable by `ADMIN`
  through `/activity`.
- Both writers are fail-soft: a logging fault can never abort the business transaction.

### 7. Flutter Mobile Application
- **Secure token storage**: Android EncryptedSharedPreferences and iOS Keychain via
  `flutter_secure_storage`.
- **Live QR code scanner**: built-in camera scanner with a custom scan-frame overlay for verifying
  equipment identifiers.
- **Push notification inbox**: local notification banners and a notification history inbox.

---

## Deliverables Checklist

- [x] **Source code**: backend (NestJS), web (`frontend/`, Vite + React), mobile (Flutter).
- [x] **README and deployment instructions**: this document, plus `MASTER BOOTUP GUIDE.md` and
      `RUNBOOK.md` for environment setup.
- [x] **ER diagram**: `ER diagram.png` in this README, plus `erp_diagram.md` containing a Mermaid ERD
      and the reservation state machine.
- [x] **API documentation**: committed OpenAPI 3.0 specification (`backend/docs/openapi.json`), an
      offline HTML reference (`backend/docs/api-reference.html`), live Swagger UI, and the endpoint
      tables below.
- [x] **Database script and migrations**: `backend/prisma/migrations/` (3 migrations), applied with
      `npx prisma migrate deploy`.
- [x] **Sample data**: `npm run seed` (full reset) and `prisma/seed-catalog.ts` (idempotent,
      6 categories and 16 products).
- [x] **Postman collection**: `backend/postman_collection.json`.
- [ ] **Mobile APK**: not built in this pass. Run `cd mobile && flutter build apk --debug` to produce
      `mobile/build/app/outputs/flutter-apk/app-debug.apk`.

---

## Demo Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| Admin | `admin@ammunation.com` | `Password123!` | Full access: dashboard KPIs, equipment CRUD including delete, approvals, inventory, customer directory, refunds, audit log |
| Staff | `staff@ammunation.com` | `Password123!` | Approvals, equipment create and edit (no delete), inventory, customer directory and document verification, refunds |
| Warehouse Operator | `warehouse@ammunation.com` | `Password123!` | Receive, release, damage and maintenance stock movements. Cannot create catalog entries or approve reservations |
| Customer | `customer@ammunation.com` | `Password123!` | Browse and book equipment, cancel own pending booking, upload documents, pay and view own receipts |

> Roles are enforced by API guards rather than merely hidden in the UI: a customer calling `/users`
> or `/activity` receives `403`. QR scanning is a Flutter-only feature.

New accounts can also be created from the Register screen on both web and mobile.

---

## Quick Start and Setup Instructions

### Prerequisites
- Node.js v18 or later
- PostgreSQL 16 and Redis, either from `docker-compose.yml` or as local services
- Flutter SDK (for the mobile application)

### Step 1: Start PostgreSQL and Redis

With Docker:

```bash
docker compose up -d
```

On the Windows development machine, Docker is not used. `scripts/devstack.ps1` provisions portable
PostgreSQL 16 and Redis 8 binaries under `E:\Apps\devstack` — no installation, no Windows service and
no administrator rights — and `dev.ps1 data` starts them:

```powershell
.\scripts\dev.ps1 data
```

The rationale and the full host layout are documented in `MASTER BOOTUP GUIDE.md`.

### Step 2: Start the NestJS API

```bash
cd backend
npm install
npx prisma migrate deploy            # or `migrate dev` during development
npx prisma generate
npm run seed                         # destructive: recreates users, products, reservations
npx ts-node prisma/seed-catalog.ts   # idempotent: enriches the catalog, preserves data
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api/docs`

### Step 3: Start the Web Application

```bash
cd frontend
npm install
npm run dev
```

- Web application: `http://localhost:5173`
- Override the API base URL with `VITE_API_URL` if the backend is not on `localhost:3000`.

### Step 4: Run the Flutter Mobile Application

```bash
cd mobile
flutter pub get
flutter run -d chrome   # web / Chrome
# or
flutter run             # Android or iOS emulator
```

### Environment Variables

`backend/.env` (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection used by BullMQ (`REDIS_URL` is not read by the queue) |
| `PORT` | API port, default 3000 |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets |

---

## API Documentation

The API is documented in three interchangeable forms, all generated from the same NestJS decorators,
so none of them can drift from the implementation:

| Form | Location | Requires a running server |
|---|---|---|
| OpenAPI 3.0 specification | `backend/docs/openapi.json` | No — commit-tracked; suitable for client generation, mocks and contract tests |
| Static reference | `backend/docs/api-reference.html` | No — opens in any browser (Redoc) |
| Interactive Swagger UI | `http://localhost:3000/api/docs` | Yes — supports "Try it out" against a live server |

The specification is rewritten on every boot outside production (36 paths, 43 operations,
18 schemas), so it always matches the running code.

All routes are versioned under `/api/v1`. List endpoints return an envelope
(`{ count, total, page, limit, totalPages, … }`) rather than a bare array.

### Authentication
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Self-registration, always as CUSTOMER |
| POST | `/auth/login` | Public | Issue access (15 minutes) and refresh (7 days) tokens |
| POST | `/auth/refresh` | Public | Rotate the token pair |
| POST | `/auth/forgot-password` | Public | Issue a 30-minute reset token |
| GET | `/auth/me` | Any | Current profile, read fresh from the database |
| PATCH | `/auth/me` | Any | Update own name, email or phone |
| POST | `/auth/change-password` | Any | Rotate own password |
| POST | `/auth/users` | ADMIN | Create an account with an explicit role |

### Equipment and Categories
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/products` | Any | Search, category and price filter, sort, paginate |
| GET | `/products/:id` | Any | Item detail with category |
| POST | `/products` | ADMIN, STAFF | Create equipment |
| PATCH | `/products/:id` | ADMIN, STAFF | Update equipment |
| DELETE | `/products/:id` | ADMIN | Delete equipment |
| GET | `/categories`, `/categories/:id` | Any | Taxonomy with product counts |

### Reservations and Documents
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/reservations` | Any (customers scoped to own) | Status filter, search, paginate, per-status counts |
| GET | `/reservations/:id` | Owner or staff | Detail |
| POST | `/reservations` | Any | Create booking, validating stock and dates |
| PATCH | `/reservations/:id/status` | Staff; customers may cancel own PENDING | State-machine transition |
| POST | `/reservations/cron/process-notifications` | Staff | Trigger upcoming-return and expiry sweep |
| POST | `/uploads` | Any | Upload identity document or agreement (multipart, 8 MB, MIME allow-list) |
| GET | `/uploads`, `/uploads/:id/file` | Owner or staff | List and download |
| PATCH | `/uploads/:id/review` | ADMIN, STAFF | Verify or reject a document |

### Inventory, Payments and Analytics
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/inventory/logs`, `/inventory/logs/product/:id` | Warehouse, Staff, Admin | Audit trail |
| POST | `/inventory/logs` | Warehouse, Staff, Admin | RECEIVE, RELEASE, DAMAGE_RECORDED, MAINTENANCE |
| GET | `/payments` | Any (customers scoped) | Ledger with totals and status counts |
| POST | `/payments/process` | Any | Settle through the Stripe-shaped gateway |
| POST | `/payments/refund` | ADMIN, STAFF | Refund a PAID transaction |
| GET | `/payments/reservation/:id` | Owner or staff | Payments for one reservation |
| GET | `/dashboard/stats` | ADMIN, STAFF | Revenue, utilisation, most-rented items, 14-day trends |
| GET | `/dashboard/my-summary` | Any | Own rental summary |

### Users, Notifications and Audit
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/users`, `/users/:id`, `/users/summary/roles` | ADMIN, STAFF | Directory with activity aggregates; never returns password hashes |
| GET | `/notifications` | Any | Own feed with unread count |
| PATCH | `/notifications/:id/read`, `/notifications/read-all` | Any | Mark as read |
| GET | `/activity` | ADMIN | System-wide audit trail |

---

## Database ER Diagram

![AmmuNation database ER diagram](ER%20diagram.png)

The schema comprises 10 entity models with foreign keys, cascade rules and indexes. Roles are
modelled as a PostgreSQL enum on `User.role` (`ADMIN`, `STAFF`, `CUSTOMER`, `WAREHOUSE_OPERATOR`)
rather than a join table, since a user holds exactly one role.

```
[ Category ] 1 ───< [ Product ] >─── * [ ReservationItem ] * ───< [ Reservation ]
                         │                                              │
                         └──< [ InventoryLog ]                          ├──< [ Payment ]
                                                                        ├──< [ Upload ]
[ User ] ──< Reservation, InventoryLog, Upload, Notification, ActivityLog
```

| Model | Purpose | Key relations and constraints |
|---|---|---|
| `User` | Accounts and role assignment | Unique `email`; indexed `role` |
| `Category` | Equipment taxonomy | Unique `name` and `slug` |
| `Product` | Equipment catalog | `categoryId` FK ON DELETE SET NULL; indexed `categoryId` and `name`; unique `sku` |
| `Reservation` | Booking and status state machine | `userId` FK; indexed `userId`, `status`, `endDate` |
| `ReservationItem` | Line items | FKs to `Reservation` and `Product`; stores `unitPrice` at booking time |
| `Payment` | Transactions including gateway references | `reservationId` FK; indexed `reservationId` and `status` |
| `InventoryLog` | Immutable stock audit | FKs to `Product` and operator `User`; indexed `productId` and `timestamp` |
| `Upload` | Identity documents, agreements, images | FKs to owner and reviewer `User` and to `Reservation` (CASCADE); indexed `ownerId`, `reservationId`, `status` |
| `Notification` | Durable in-app feed | `userId` FK CASCADE; composite index on `(userId, readAt)` |
| `ActivityLog` | Audit trail | `userId` FK ON DELETE SET NULL so history survives account deletion; indexed `userId`, `action`, `createdAt` |

Enums: `Role`, `ReservationStatus`, `PaymentStatus`, `InventoryAction`, `UploadType`, `UploadStatus`,
`NotificationType`, `ActivityAction`.

The source of truth is `backend/prisma/schema.prisma`. Migrations live in
`backend/prisma/migrations/`.
