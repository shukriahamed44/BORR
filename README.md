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
├── backend/                  ← NestJS 10 REST API Server (Port 3000)
│   ├── prisma/               ← Prisma Schema & Migrations
│   ├── src/
│   │   ├── auth/             ← JWT Auth, Refresh Token, RBAC Guard, Password Reset
│   │   ├── products/         ← Equipment CRUD & Stock Management
│   │   ├── reservations/     ← Booking Engine & Status State Machine
│   │   ├── inventory/        ← Inventory Audit Logs & Maintenance
│   │   ├── payments/         ← Payment Processing & Refund Workflow
│   │   ├── notifications/    ← BullMQ Queue & Worker Processor
│   │   └── prisma/           ← Database Service & ORM Connection
│   └── postman_collection.json ← Master Postman Collection
│
├── web/                      ← Next.js 15 Web Application (Port 3001)
│   ├── src/
│   │   ├── app/              ← App Router Pages (Catalog, Reservations, Inventory, Admin)
│   │   ├── components/       ← Glassmorphic UI Components & Navigation
│   │   ├── context/          ← React AuthContext & State Management
│   │   └── lib/              ← Axios/Fetch Client & API Interceptors
│   └── next.config.js        ← API Proxy Rewrites (Port 3001 → 3000)
│
├── mobile/                   ← Flutter Cross-Platform App (Android, iOS, Web)
│   ├── lib/
│   │   ├── core/             ← Dio Client, Secure Storage (Keychain/Keystore), Theme
│   │   ├── features/         ← Catalog, Reservations, QR Scanner, Push Notifications
│   │   └── shared/           ← Dart Data Models & Navigation Shells
│   └── build/outputs/        ← Compiled APK Deliverables
│
└── docker-compose.yml        ← PostgreSQL & Redis Infrastructure
```

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
- Status State Machine: `PENDING` → `CONFIRMED` / `REJECTED` → `ACTIVE` → `COMPLETED` / `CANCELLED`.

### 4. 📦 Inventory Audit & Warehouse Operations
- Stock tracking, maintenance logging, damage recording, and receipt/release receipts.
- Immutably logged activity events for full traceability.

### 5. 💳 Payment Mock Workflow
- Payment processing, refund initiation, and status tracking (`PENDING`, `PAID`, `FAILED`, `REFUNDED`).

### 6. 📱 Flutter Mobile Application
- **Secure Token Storage**: Android EncryptedSharedPreferences and iOS Keychain via `flutter_secure_storage`.
- **Live QR Code Scanner**: Built-in camera scanner with custom scan frame overlay to verify equipment IDs.
- **Push Notification Inbox**: Local notification banners and notification history inbox.

---

## 📦 Deliverables Checklist

- [x] **Source Code**: Full source code for Backend, Web, and Mobile apps.
- [x] **Postman Collection**: `backend/postman_collection.json` with pre-configured requests & environment variables.
- [x] **Swagger API Docs**: Interactive Swagger interface at `http://localhost:3000/api/docs`.
- [x] **ER Diagram**: High-resolution ERD (`erp_database_erd_1785728468093.png` & `erp_diagram.md`).
- [x] **Database Migrations**: Automatic schema sync via `npx prisma migrate dev`.
- [x] **Mobile APK**: Compiled Android Debug APK located in `mobile/build/app/outputs/flutter-apk/app-debug.apk`.

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
docker-compose up -d
```

### Step 2: Start NestJS Backend API
```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```
- API Endpoint: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api/docs`

### Step 3: Start Next.js Web Application
```bash
cd web
npm install
npm run dev
```
- Web Application: `http://localhost:3001`

### Step 4: Run Flutter Mobile Application
```bash
cd mobile
flutter pub get
flutter run -d chrome  # For Web / Chrome
# OR
flutter run            # For Android / iOS Emulator
```

---

## 📖 API Documentation

Interactive Swagger API documentation is available out of the box:
👉 **`http://localhost:3000/api/docs`**

Sample Endpoint Summary:
- `POST /api/v1/auth/register` — Register User
- `POST /api/v1/auth/login` — Authenticate & receive JWT tokens
- `POST /api/v1/auth/forgot-password` — Generate password reset token
- `GET  /api/v1/products` — List equipment (supports `?search=`)
- `POST /api/v1/reservations` — Create reservation
- `PATCH /api/v1/reservations/:id/status` — Staff status update / approval
- `POST /api/v1/payments/process` — Process payment transaction

---

## 📊 Database ER Diagram

The database schema includes 9 interconnected entity models with strict foreign keys, indexes, and cascades:

```
[ User ] 1 ─── < UserRole > ─── * [ Role ]
   │
   ├── 1 ─── * [ Reservation ] 1 ─── * [ ReservationItem ] ─── * [ Product ] ─── 1 [ Category ]
   │                 │
   ├── 1 ─── * [ Payment ]
   │
   ├── 1 ─── * [ ActivityLog ]
   │
   └── 1 ─── * [ InventoryLog ]
```
