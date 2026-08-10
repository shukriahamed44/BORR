# AmmuNation — Project State & Handoff

**Purpose:** everything a fresh session needs to continue this build — what the project is, what
has been done, what was decided and why, what is broken, and exactly what to do next.

**Last updated:** 2026-08-09

> Companion docs: **`RUNBOOK.md`** = how to start/run everything + every environment trap.
> **`README.md`** = the assessment submission doc (⚠️ its schema section is currently inaccurate — see Known Gaps).

---

## 1. What this is

A **Full Stack Engineering Assessment** submission: an equipment rental management ERP
("AmmuNation" backend, "BORR" brand in the UI). Graded out of 100:

| Area | Marks |
|---|---|
| Architecture | 15 |
| Database Design | 10 |
| Backend APIs | 20 |
| Frontend | 15 |
| Flutter App | 15 |
| Authentication & Security | 10 |
| Code Quality | 10 |
| Documentation | 5 |

Roles: **ADMIN, STAFF, WAREHOUSE_OPERATOR, CUSTOMER**.

---

## 2. Critical orientation facts

1. **The only frontend is `frontend/` (Vite + React 19).** The BORR landing page, the glass design
   system (`src/index.css`) and the `AppShell` all live there. The legacy `web/` Next.js scaffold
   was deleted on 2026-08-11; it exists in git history only.
2. **Backend and frontend both run on Windows. Only Docker (Postgres + Redis) runs in WSL.**
   Running the backend inside WSL as well cost an evening: two servers bound :3000, the WSL one
   owned Windows loopback, and it never rebuilt because file watching does not work over `/mnt/e`.
   Start everything with `.\scripts\dev.ps1` and read `MASTER BOOTUP GUIDE.md` before debugging any
   "my change did nothing" symptom. Environment traps are in `RUNBOOK.md`.
3. **Prisma CLI hangs when run from WSL over `/mnt/e`.** Run migrations from the **Windows** side.
4. Every API route is under the **`/api/v1`** prefix.
5. List endpoints return an **envelope**, not a bare array: `{ count, total, page, limit, totalPages, products }` etc.

---

## 3. Decisions already made (do not re-litigate)

| Decision | Choice | Rationale |
|---|---|---|
| Backend gaps | **Build backend as each page needs it** | Assessment grades Backend APIs (20) + DB Design (10); frontend-only would leave those unmet |
| File storage | **Local disk behind a swappable `StorageDriver`** | No cloud credentials needed; S3/R2 becomes a one-line provider swap in `uploads.module.ts` |
| Payments | **Stripe-*shaped* adapter, mocked** | Mirrors Stripe's PaymentIntent API so a real Stripe driver drops in behind the same interface. Not the real Stripe API. |
| Schema changes | **Batched into few migrations** | Prisma migrations are slow/fragile in this environment |
| Reply style | Caveman/minimal prose, ponytail (laziest working solution) | User preference, set in global `~/.claude/CLAUDE.md` |

---

## 4. Build checklist — where we stand

| # | Phase | Status |
|---|---|---|
| 0 | Session restore on refresh | ✅ done |
| 1 | Batched migration (Upload, Notification, ActivityLog) | ✅ done |
| 2a | Reservations backend (state machine + uploads) | ✅ done |
| 2b | Reservations page UI | ✅ done |
| 3 | Inventory & warehouse page | ✅ done |
| 4a | Payments backend w/ Stripe-style adapter | ✅ done |
| 4b | Payments & checkout page UI | ✅ done |
| 5 | Customers directory & document verification | ✅ done |
| 6 | Settings & profile page | ✅ done |
| 7 | Cross-cutting close-out (audit log, notifications, docs) | ✅ done |

**All 10 phases complete.** All 8 UI pages exist and are wired to the API; the schema matches
the assessment spec; audit logging, the notification feed and the documentation are done.

Plus, completed before the checklist existed: **App Shell**, **Dashboard**, **Equipment Catalog**.

---

## 5. What has been built

### App Shell & auth
- Login/register wired to the real API. Previously the form just called `setIsAuthenticated(true)`
  with **no API call**, and two nav buttons logged you in as ADMIN with no credentials — all removed.
- Session user comes from the JWT (previously `AppShell` **fabricated** name/email from the role string).
- The fake "simulate role" switcher was removed; role comes from the token and the backend enforces it.
- **Session survives refresh** via `GET /auth/me`, with **refresh-token rotation**: 15-minute access
  tokens, single-flight refresh (concurrent 401s don't race and spend the rotating token twice),
  retry-once on 401. Credential endpoints are excluded so a genuine bad password still surfaces.
- Profile menu: identity, role badge, **dark mode** (persisted, `data-theme` on `<html>`), sign out.
- Notification bell derives alerts from live reservation data, polling every 60s.

### Dashboard — `backend/src/dashboard/`
- `GET /dashboard/stats` (ADMIN/STAFF) — server-side aggregation via Prisma `groupBy`/`aggregate`.
- `GET /dashboard/my-summary` — scoped to `req.user.id`; a customer can never read another's data.
- UI shows Total Customers, Active Reservations, Revenue, **Utilisation**, Catalog, Pending Approvals,
  plus **Most Rented** ranking and a **14-day trend** chart.
- The revenue trend is computed (last 30d vs prior 30d) and returns `null` when there is no prior
  period — the UI then renders **nothing** rather than inventing a figure. (It previously showed a
  hardcoded `+14.2%`.)

### Equipment catalog — `backend/src/categories/`, `products/`
- New `Category` model (6 categories) + `deposit`, `imageUrl`, `specifications` on `Product`.
- `GET /products` supports search, category (id **or** slug), price range, in-stock-only, 4 sort
  orders and **offset pagination**.
- 16 products seeded via **`prisma/seed-catalog.ts`** — idempotent (upserts by SKU), preserves stock
  levels and never touches reservations. Prefer it over `npm run seed`, which is destructive.
- UI: filter rail with counts, debounced search, sort, paginated grid, detail modal (specs/deposit/
  availability), booking modal with live cost maths, role-correct actions.

### Reservations — `backend/src/reservations/`, `uploads/`
- State machine was already solid (terminal states, customer-cancel-own-pending); verified, not rewritten.
- Added pagination, status filter, per-status counts (`groupBy`), staff search.
- `rejectionReason` now persisted and shown to the customer; cleared on non-reject transitions.
- **`uploads` module**: `StorageDriver` abstraction + `LocalDiskStorageDriver`. MIME allowlist
  (JPEG/PNG/WebP/PDF), 8 MB cap, randomised UUID filenames, path-traversal guard,
  `Content-Disposition: attachment`, ownership checks, STAFF/ADMIN-only review.
- UI: status tabs with counts, detail drawer, staff actions matching the state machine,
  reject-with-reason modal, customer cancel, document upload + staff verify/reject.

---

## 6. Bugs found and fixed (context worth keeping)

| Bug | Impact |
|---|---|
| `api.ts` called `localhost:3000/...` without `/api/v1` | **Every API call 404'd** — all pages were dead |
| List endpoints return `{count, products}`, code expected arrays | Pages would break even after the URL fix |
| Login was fake + two credential-free ADMIN backdoors | Auth bypass |
| `AppShell` fabricated the user's name/email | UI showed invented identity |
| Hardcoded `+14.2%` revenue trend | Fabricated metric |
| Hardcoded sidebar badges (`12`, `3 Alert`) | Fabricated counts; now live |
| `rejectionReason` missing from DTO | Would 400 under `forbidNonWhitelisted` as soon as a reason was typed |
| `stream.pipe(res)` on download | 408-byte file returned **11 MB** and never closed (27,032 repeats). Now buffered `res.send()` |
| `request()` forced JSON `Content-Type` | Would break **every multipart upload** (destroys boundary) |
| `<a href>` to JWT-protected download | Always 401 — browsers don't attach `Authorization` to navigations. Now blob-based |
| `.detail-modal` tied on CSS specificity with `.liquid-glass-modal` | Modal squashed to 380px; fixed with a compound selector |

---

## 7. Known gaps / not done yet

- **Mobile APK not built.** Run `cd mobile && flutter build apk --debug`.
- **Password change does not revoke existing refresh tokens.** Other devices stay signed in until
  their 7-day token expires. Needs a token store or a `passwordChangedAt` check in the refresh flow.
- **Payment is not gated before pickup.** Staff can approve and hand over an unpaid reservation;
  nothing enforces settlement first. Not required by the assessment.
- **Flutter app and `web/` (Next.js) were not touched** in this build.
- **No new automated tests** were written (pre-existing `.spec.ts` files remain).
- A stray test account, `probe.*@test.com`, may exist in the directory from API probing.

Resolved in Phase 7: `ActivityLog` is now written on every significant action, the notification
bell reads the real `Notification` table, and `README.md` / `erp_diagram.md` / the Postman
collection have been corrected to match the implementation.
- Equipment images: **supplied and wired.** All 16 files sit in `backend/public/equipment/`,
  served statically at `/equipment/<sku-lowercase>.jpg` (matching `Product.imageUrl`) and reached
  by web via proxy and by mobile via the API origin. Full SKU→filename table is in `RUNBOOK.md` §7.
- Flutter app (`mobile/`) and `web/` (Next.js) have not been touched this session.
- No unit/integration tests written this session (`.spec.ts` files exist from before).

---

## 8. How to proceed — next step

**Phase 3: Inventory & warehouse page.** The backend is already complete, so this is pure UI —
the fastest remaining win.

Build in `frontend/src/components/pages/InventoryPage.tsx` (+ a sibling `.css`, see conventions):
- Stock table across all equipment with low-stock highlighting.
- Action modals for the four `InventoryAction` values: `RECEIVE`, `RELEASE`, `DAMAGE_RECORDED`,
  `MAINTENANCE` → `POST /inventory/logs`.
- Audit-log timeline from `GET /inventory/logs` (supports `?productId=`).
- Verify a `RECEIVE` actually increments `Product.totalStock` (it runs inside a Prisma
  `$transaction`) and that over-deduction is rejected by the existing guard.

Roles: `@Roles(WAREHOUSE_OPERATOR, STAFF, ADMIN)` on the inventory controller. Warehouse operators
**can** restock existing equipment but **cannot** create new catalog entries (that is ADMIN/STAFF).

Then continue down the checklist in §4.

---

## 9. Conventions to follow

- **Component CSS lives in a sibling file** (`EquipmentPage.css`, `ReservationsPage.css`) imported
  from the TSX — do not keep growing `index.css`. Appending large CSS via bash heredoc breaks; use
  the Write tool.
- **Body font is Creato Display**, weights **400 / 500 / 700 only**. Never use 600 — the browser
  synthesises a fake bold.
- **Dark mode**: any new component with hardcoded light colours needs a matching
  `[data-theme="dark"]` override, or it will be unreadable.
- **Glass surfaces**: one inset top highlight + one outer shadow. The heavy double-inset emboss was
  deliberately removed for a flatter Apple look.
- Backend files carry a two-part JSDoc header ("FORMAL ARCHITECTURAL DESCRIPTION" / "IN SIMPLE
  WORDS") — match it.
- Every new list endpoint should return the `{ count, total, page, limit, totalPages, … }` envelope.
- Verify claims against the running app (curl for API, browser for UI). Do not report something as
  working without checking it.

---

## 10. Demo credentials

All use password `Password123!`:
`admin@ammunation.com` · `staff@ammunation.com` · `warehouse@ammunation.com` · `customer@ammunation.com`

(The originally documented `admin.alex@…` / `customer@example.com` do **not** exist.)
