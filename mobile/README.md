# AmmuNation Mobile (Flutter)

Customer + Staff mobile client for the AmmuNation Equipment Rental Platform.
Talks to the NestJS backend over REST (`/api/v1`) with JWT bearer auth.

## Features

**Customer**
- Login with JWT, session restored on relaunch, silent token refresh on expiry
- Browse equipment — server-side search, category filter, infinite-scroll pagination
- Equipment detail: price, refundable deposit, live stock, specifications, QR code
- Make a reservation — pick dates, quantity, live cost estimate
- View reservation history with status badges
- Cancel a reservation (while `PENDING` or `APPROVED`)
- Receive notifications: approved, rejected, expired, upcoming return

**Staff / Admin / Warehouse**
- Review every reservation, filter by status
- Approve / Reject pending requests
- Check equipment out (`ACTIVE`) and back in (`RETURNED`)
- Scan equipment QR codes with the device camera

## Architecture

```
lib/
  core/          constants, theme, GoRouter (role-aware guards), Dio client, secure storage
  features/      auth, catalog, reservations, staff, notifications, qr_scanner
  shared/        models, shells (bottom-nav scaffolds), splash
```

- **State:** `provider` (`AuthProvider`, `NotificationProvider`)
- **Routing:** `go_router` — a redirect guard sends `CUSTOMER` to the customer shell and
  `STAFF` / `ADMIN` / `WAREHOUSE_OPERATOR` to the staff shell
- **Storage:** `flutter_secure_storage` (Keychain / Keystore) for tokens
- **Networking:** one `Dio` instance; interceptors attach the bearer token, and on a
  `401` exchange the refresh token and replay the request once

### Notifications

The backend queues notification jobs but exposes no notification feed, so the app
derives its own: it polls `GET /reservations` every 60s, diffs each reservation's status
against the last status seen on this device (persisted in `SharedPreferences`), and
raises a local notification whenever the backend moved one — plus a one-shot reminder
when an `ACTIVE` rental is due back within 24 hours. No Firebase, no backend changes.

## Configuration

The API base URL lives in `lib/core/constants/app_constants.dart`:

| Target | URL |
| --- | --- |
| Android emulator | `http://10.0.2.2:3000/api/v1` |
| Web / Chrome | `http://localhost:3000/api/v1` |
| Physical device | replace with your machine's LAN IP, e.g. `http://192.168.1.5:3000/api/v1` |

## Running

```bash
# backend must be up first (see repo root README / RUNBOOK)
flutter pub get
flutter run                      # attached device or emulator
flutter run -d chrome            # web
```

### Seeded logins

All seeded accounts use the password `Password123!`:

| Role | Email |
| --- | --- |
| Admin | `admin@ammunation.com` |
| Staff | `staff@ammunation.com` |
| Warehouse | `warehouse@ammunation.com` |
| Customer | `customer@ammunation.com` |

## Tests

```bash
flutter test
```

`test/models_test.dart` pins the app to the backend contract: Prisma `Decimal` fields
arrive as JSON strings, reservation statuses must be real enum values, and the client
state machine must never offer a transition the API would reject.

## Build

```bash
flutter build apk --release      # build/app/outputs/flutter-apk/app-release.apk
```
