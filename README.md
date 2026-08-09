# AmmuNation Enterprise Equipment Rental ERP Platform

[![NestJS](https://img.shields.io/badge/Backend-NestJS-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Web-Next.js%2015-black.svg)](https://nextjs.org/)
[![Flutter](https://img.shields.io/badge/Mobile-Flutter%203.38-blue.svg)](https://flutter.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Queue-Redis%20%2B%20BullMQ-red.svg)](https://bullmq.io/)

> **Enterprise Software Development Assessment**  
> Complete full-stack equipment rental management system featuring NestJS REST API, Next.js 15 Web Application, Flutter Mobile Application (iOS & Android), PostgreSQL database with Prisma ORM, and BullMQ asynchronous notification workers.

---

## 📑 Table of Contents

1. [Architecture & System Overview](#-architecture--system-overview)
2. [Technology Stack](#-technology-stack)
3. [Key Features & Modules](#-key-features--modules)
4. [Deliverables Checklist](#-deliverables-checklist)
5. [Demo Credentials](#-demo-credentials)
6. [Quick Start & Setup Instructions](#-quick-start--setup-instructions)
7. [API Documentation](#-api-documentation)
8. [Database ER Diagram](#-database-er-diagram)

---

## 🏗️ Architecture & System Overview

The **AmmuNation ERP** system is built following Clean Architecture, SOLID design principles, and modern enterprise micro-layered structure:

```
project AmmuNation/
├── backend/                  ← NestJS 11 REST API Server (Port 3000)
│   ├── prisma/               ← Schema, migrations, seed + idempotent catalog seed
│   ├── src/
│   │   ├── auth/             ← JWT + refresh rotation, RBAC guards, profile & password
│   │   ├── users/            ← Staff-facing account directory
│   │   ├── products/         ← Equipment CRUD, search/filter/sort/pagination
│   │   ├── categories/       ← Equipment taxonomy
│   │   ├── reservations/     ← Booking engine & status state machine
│   │   ├── uploads/          ← Documents behind a swappable StorageDriver
│   │   ├── inventory/        ← Stock movements & immutable audit logs
│   │   ├── payments/         ← Stripe-shaped PaymentGateway adapter + ledger
│   │   ├── dashboard/        ← Server-side KPI aggregation
│   │   ├── notifications/    ← BullMQ queue, worker, durable in-app feed
│   │   ├── activity/         ← Global audit trail (ActivityLog)
│   │   └── prisma/           ← Database service & ORM connection
│   └── postman_collection.json ← Master Postman Collection
│
├── frontend/                 ← ✅ ACTIVE WEB APP — Vite + React 19 (Port 5173)
│   ├── public/equipment/     ← Equipment images, named <sku-lowercase>.jpg
│   └── src/
│       ├── components/layout/  ← AppShell, role-based Sidebar, Header
│       ├── components/pages/   ← Equipment, Reservations, Inventory,
│       │                          Payments, Customers, Settings (+ sibling .css)
│       ├── components/dashboard/ ← KPI dashboard
│       ├── services/api.ts     ← Fetch client, token refresh, typed endpoints
│       └── index.css           ← Glass design system & dark theme
│
├── web/                      ← ⚠️ Legacy Next.js scaffold — NOT the submitted UI
│
├── mobile/                   ← Flutter Cross-Platform App (Android, iOS, Web)
│   ├── lib/
│   │   ├── core/             ← Dio Client, Secure Storage (Keychain/Keystore), Theme
│   │   ├── features/         ← Catalog, Reservations, QR Scanner, Push Notifications
│   │   └── shared/           ← Dart Data Models & Navigation Shells
│   └── build/outputs/        ← Compiled APK Deliverables
│
├── docker-compose.yml        ← PostgreSQL & Redis infrastructure
├── RUNBOOK.md                ← Startup guide + every environment pitfall & fix
└── PROJECT-STATE.md          ← Build status, decisions, known gaps
```

> **Which frontend?** The submitted web UI is **`frontend/`** (Vite + React 19).
> `web/` is an earlier Next.js scaffold retained in history and is not part of the deliverable.

---

## ⚡ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Backend API** | NestJS (Node.js + TypeScript) | Modular architecture, Swagger OpenAPI, Class Validator DTOs |
| **Database** | PostgreSQL 16 | Relational schema with Foreign Keys, Constraints, and Indexes via Prisma ORM |
| **Caching / Queue** | Redis 7 + BullMQ | Asynchronous background processing for emails & push notifications |
| **Web Frontend** | Next.js 15 (React 19 + TypeScript) | Premium Glassmorphic UI, responsive layouts, Server & Client Components |
| **Mobile App** | Flutter 3.38 (Dart) | Cross-platform app with Secure Token Storage, QR Scanner, Local Push Notifications |
| **Authentication** | JWT + Refresh Tokens | Role-Based Access Control (Admin, Staff, Customer, Warehouse Operator) |

---

## 🚀 Key Features & Modules

### 1. 🔐 Authentication & Security
- **JWT Access & Refresh Tokens**: Dual-token pattern with short-lived access tokens (15m) and long-lived refresh tokens (7d).
- **Role-Based Access Control (RBAC)**: Guards enforce permissions for `ADMIN`, `STAFF`, `CUSTOMER`, and `WAREHOUSE_OPERATOR`.
- **Forgot & Reset Password**: Generates secure 30-minute expiration password reset tokens.
- **Bcrypt Hashing**: Password security with salt rounds = 10.

### 2. 🎒 Equipment & Catalog Module
- Equipment listing with pagination, search, and category filtering.
- Daily rates, stock availability tracking, and technical specifications.
- **QR Code Generation**: Encodes unique product IDs for instant barcode scanning.

### 3. 📋 Reservation Booking Engine
- Date range selection with automatic duration and total cost computation.
- **State machine enforced server-side**, rejecting illegal transitions with `400`:
  `PENDING` → `APPROVED` / `REJECTED` / `CANCELLED`; `APPROVED` → `ACTIVE` / `CANCELLED`;
  `ACTIVE` → `RETURNED`. `RETURNED`, `REJECTED` and `CANCELLED` are terminal.
- Customers may cancel only their own `PENDING` booking; rejections carry a reason back to the customer.
- **Document uploads** (identity document, rental agreement) with staff verify/reject.

### 4. 📦 Inventory Audit & Warehouse Operations
- `RECEIVE`, `RELEASE`, `DAMAGE_RECORDED`, `MAINTENANCE` — stock and log written in a single
  Prisma `$transaction`, with a guard rejecting deductions that exceed available stock.
- Immutable audit trail with operator attribution.

### 5. 💳 Payment Workflow — Stripe-shaped adapter
- `PaymentGateway` abstraction modelled on Stripe's **PaymentIntent** lifecycle
  (`createPaymentIntent` → `confirmPaymentIntent` → `refund`), using Stripe's vocabulary:
  `pi_…` ids, client secrets, **minor-unit** amounts, `succeeded` / `requires_payment_method`.
- `MockStripeGateway` ships by default; swapping in a real Stripe driver is a one-line
  provider change in `payments.module.ts` — no service or HTTP contract changes.
- Declined attempts are persisted as `FAILED` before the error surfaces, so they appear in the ledger.
- Statuses: `PENDING`, `PAID`, `FAILED`, `REFUNDED`. Printable invoice per transaction.

### 6. 🔔 Notifications & Audit Trail
- Durable `Notification` feed (approved, rejected, upcoming return, expiry) with unread counts,
  written to PostgreSQL at enqueue time so the inbox does not depend on Redis; BullMQ handles
  outbound email/push delivery.
- `ActivityLog` records login, reservation created/updated, payment processed/refunded,
  inventory changes and document upload/review — with actor and IP. Readable by ADMIN via `/activity`.
- Both writers are **fail-soft**: a logging fault can never abort the business transaction.

### 7. 📱 Flutter Mobile Application
- **Secure Token Storage**: Android EncryptedSharedPreferences and iOS Keychain via `flutter_secure_storage`.
- **Live QR Code Scanner**: Built-in camera scanner with custom scan frame overlay to verify equipment IDs.
- **Push Notification Inbox**: Local notification banners and notification history inbox.

---

## 📦 Deliverables Checklist

- [x] **Source Code**: Backend (NestJS), Web (`frontend/`, Vite + React), Mobile (Flutter).
- [x] **README & Deployment Instructions**: this document, plus `RUNBOOK.md` for environment setup.
- [x] **ER Diagram**: `ER diagram.png` in the README, plus `erp_diagram.md` — Mermaid ERD + reservation state machine.
- [x] **API Documentation**: Swagger at `http://localhost:3000/api/docs`, plus the endpoint tables below.
- [x] **Database Script & Migrations**: `backend/prisma/migrations/` (3 migrations), applied with `npx prisma migrate deploy`.
- [x] **Sample Data**: `npm run seed` (full reset) and `prisma/seed-catalog.ts` (idempotent, 6 categories + 16 products).
- [x] **Postman Collection**: `backend/postman_collection.json`.
- [ ] **Mobile APK**: not built in this pass — run `cd mobile && flutter build apk --debug` to produce
      `mobile/build/app/outputs/flutter-apk/app-debug.apk`.

---

## 🔑 Demo Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| 👑 **Admin** | `admin@ammunation.com` | `Password123!` | Full Admin Dashboard, Approval Workflows, Inventory Logs, QR Scanner |
| 🛡️ **Staff** | `staff@ammunation.com` | `Password123!` | Reservation Approvals, Equipment CRUD, Inventory Logs |
| 📦 **Warehouse Operator** | `warehouse@ammunation.com` | `Password123!` | Receive/Release Equipment, Damages & Maintenance Logs |
| 👤 **Customer** | `customer@ammunation.com` | `Password123!` | Equipment Catalog, Booking Engine, My Reservations |

*Note: You can also create any new account on the Register screen on both Web & Mobile.*

---

## 🛠️ Quick Start & Setup Instructions

### Prerequisites
- Node.js v18+
- Docker / WSL Docker
- Flutter SDK (for mobile)

### Step 1: Start PostgreSQL & Redis
```bash
docker compose up -d
```

### Step 2: Start the NestJS API
```bash
cd backend
npm install
npx prisma migrate deploy     # or `migrate dev` in development
npx prisma generate
npm run seed                  # ⚠️ destructive: recreates users, products, reservations
npx ts-node prisma/seed-catalog.ts   # idempotent: enriches the catalog, preserves data
npm run start:dev
```
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`

### Step 3: Start the Web Application
```bash
cd frontend
npm install
npm run dev
```
- Web app: **`http://localhost:5173`**
- Override the API base with `VITE_API_URL` if the backend is not on `localhost:3000`.

### Step 4: Run the Flutter Mobile Application
```bash
cd mobile
flutter pub get
flutter run -d chrome  # For Web / Chrome
# OR
flutter run            # For Android / iOS Emulator
```

> **Running on Windows with Docker inside WSL (no Docker Desktop)?**
> The WSL VM shuts down when no process is running in it, taking the containers with it —
> start Docker and the backend in the *same* WSL invocation, and run Prisma commands from
> the Windows side (the CLI stalls over the `/mnt/` mount). Full details, plus ten other
> environment pitfalls and their fixes, are in **`RUNBOOK.md`**.

---

## 📖 API Documentation

Interactive Swagger API documentation is available out of the box:
👉 **`http://localhost:3000/api/docs`**

All routes are versioned under **`/api/v1`**. List endpoints return an envelope
(`{ count, total, page, limit, totalPages, … }`), not a bare array.

### Authentication
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Self-registration (always CUSTOMER) |
| POST | `/auth/login` | Public | Issue access (15 min) + refresh (7 d) tokens |
| POST | `/auth/refresh` | Public | Rotate the token pair |
| POST | `/auth/forgot-password` | Public | Issue a 30-minute reset token |
| GET | `/auth/me` | Any | Current profile (read fresh from DB) |
| PATCH | `/auth/me` | Any | Update own name / email / phone |
| POST | `/auth/change-password` | Any | Rotate own password |
| POST | `/auth/users` | ADMIN | Create an account with an explicit role |

### Equipment & Categories
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/products` | Any | Search, category/price filter, sort, paginate |
| GET | `/products/:id` | Any | Item detail with category |
| POST | `/products` | ADMIN, STAFF | Create equipment |
| PATCH | `/products/:id` | ADMIN, STAFF | Update equipment |
| DELETE | `/products/:id` | ADMIN | Delete equipment |
| GET | `/categories` · `/categories/:id` | Any | Taxonomy with product counts |

### Reservations & Documents
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/reservations` | Any (customers scoped to own) | Status filter, search, paginate, per-status counts |
| GET | `/reservations/:id` | Owner / staff | Detail |
| POST | `/reservations` | Any | Create booking (validates stock + dates) |
| PATCH | `/reservations/:id/status` | Staff; customer may cancel own PENDING | State-machine transition |
| POST | `/reservations/cron/process-notifications` | Staff | Trigger upcoming-return / expiry sweep |
| POST | `/uploads` | Any | Upload ID document / agreement (multipart, 8 MB, MIME allow-list) |
| GET | `/uploads` · `/uploads/:id/file` | Owner / staff | List and download |
| PATCH | `/uploads/:id/review` | ADMIN, STAFF | Verify or reject a document |

### Inventory, Payments & Analytics
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/inventory/logs` · `/inventory/logs/product/:id` | Warehouse, Staff, Admin | Audit trail |
| POST | `/inventory/logs` | Warehouse, Staff, Admin | RECEIVE / RELEASE / DAMAGE_RECORDED / MAINTENANCE |
| GET | `/payments` | Any (customers scoped) | Ledger with totals and status counts |
| POST | `/payments/process` | Any | Settle via the Stripe-shaped gateway |
| POST | `/payments/refund` | ADMIN, STAFF | Refund a PAID transaction |
| GET | `/payments/reservation/:id` | Owner / staff | Payments for one reservation |
| GET | `/dashboard/stats` | ADMIN, STAFF | Revenue, utilisation, most-rented, 14-day trends |
| GET | `/dashboard/my-summary` | Any | Own rental summary |

### Users, Notifications & Audit
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/users` · `/users/:id` · `/users/summary/roles` | ADMIN, STAFF | Directory with activity aggregates (never returns password hashes) |
| GET | `/notifications` | Any | Own feed with unread count |
| PATCH | `/notifications/:id/read` · `/notifications/read-all` | Any | Mark read |
| GET | `/activity` | ADMIN | System-wide audit trail |

---

## 📊 Database ER Diagram

![AmmuNation database ER diagram](ER%20diagram.png)

The schema comprises **10 entity models** with foreign keys, cascade rules and indexes.
Roles are modelled as a PostgreSQL **enum** on `User.role` (`ADMIN`, `STAFF`, `CUSTOMER`,
`WAREHOUSE_OPERATOR`) rather than a join table, since a user holds exactly one role.

```
[ Category ] 1 ───< [ Product ] >─── * [ ReservationItem ] * ───< [ Reservation ]
                         │                                              │
                         └──< [ InventoryLog ]                          ├──< [ Payment ]
                                                                        ├──< [ Upload ]
[ User ] ──< Reservation, InventoryLog, Upload, Notification, ActivityLog
```

| Model | Purpose | Key relations & constraints |
|---|---|---|
| `User` | Accounts and role assignment | unique `email`; indexed `role` |
| `Category` | Equipment taxonomy | unique `name` + `slug` |
| `Product` | Equipment catalog | `categoryId` FK **ON DELETE SET NULL**; indexed `categoryId`, `name`; unique `sku` |
| `Reservation` | Booking + status state machine | `userId` FK; indexed `userId`, `status`, `endDate` |
| `ReservationItem` | Line items | FKs to `Reservation` and `Product`; stores `unitPrice` at booking time |
| `Payment` | Transactions incl. gateway refs | `reservationId` FK; indexed `reservationId`, `status` |
| `InventoryLog` | Immutable stock audit | FKs to `Product` and operator `User`; indexed `productId`, `timestamp` |
| `Upload` | Identity docs, agreements, images | FKs to owner/reviewer `User` and `Reservation` (**CASCADE**); indexed `ownerId`, `reservationId`, `status` |
| `Notification` | Durable in-app feed | `userId` FK **CASCADE**; composite index `(userId, readAt)` |
| `ActivityLog` | Audit trail | `userId` FK **ON DELETE SET NULL** so history survives account deletion; indexed `userId`, `action`, `createdAt` |

Enums: `Role`, `ReservationStatus`, `PaymentStatus`, `InventoryAction`, `UploadType`,
`UploadStatus`, `NotificationType`, `ActivityAction`.

Source of truth: `backend/prisma/schema.prisma`. Migrations live in `backend/prisma/migrations/`.
