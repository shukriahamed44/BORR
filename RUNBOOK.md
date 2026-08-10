# AmmuNation — Developer Runbook

Operational notes for running this project on **Windows + WSL2 (Docker Engine inside WSL, no Docker Desktop)**.
Written after repeatedly hitting the same environment traps — read the "Gotchas" section before debugging anything.

---

## 1. Architecture: what runs where

| Layer | Tech | Port | **Runs on** | Started with |
|---|---|---|---|---|
| PostgreSQL 16 | Docker container `ammunation_postgres` | 5432 | **WSL** | `docker compose up -d` |
| Redis 7 | Docker container `ammunation_redis` | 6379 | **WSL** | `docker compose up -d` |
| Backend API | NestJS 11 + Prisma | 3000 | **WSL** | `npm run start:dev` |
| Frontend (active UI) | Vite 8 + React 19 | 5173 | **Windows** | `npm run dev` |
| Web (legacy/alt) | Next.js 15 | 3001 | Windows | `npm run dev` |
| Mobile | Flutter | — | Windows | `flutter run -d chrome` |

**API base URL:** `http://localhost:3000/api/v1` — every route is behind the `/api/v1` global prefix (set in `backend/src/main.ts`).
**Swagger:** `http://localhost:3000/api/docs`

> ⚠️ The **active frontend is `frontend/`** (Vite), not `web/` (Next.js). The BORR landing page,
> the glass design system (`src/index.css`), and the `AppShell` all live in `frontend/`.

### Backend module map (`backend/src/`)

```
auth/         JWT login/register/refresh, RBAC guards + @Roles decorator
products/     Equipment CRUD, search/filter/sort/pagination
categories/   Equipment category taxonomy (added for catalog filtering)
reservations/ Booking engine + status state machine
inventory/    Warehouse RECEIVE/RELEASE/DAMAGE/MAINTENANCE logs (mutates Product.totalStock)
payments/     Mock payment processing + refunds
notifications/ BullMQ queue + worker
dashboard/    Aggregated KPI analytics (added for the dashboard page)
prisma/       PrismaService (DB connection)
```

---

## 2. Startup — the reliable sequence

**The single most important rule: something must hold the WSL VM alive, or Docker dies with it.**

```bash
# Terminal 1 — WSL: brings up DB+Redis AND holds the VM open via the backend process
wsl -e bash -lc "cd '/mnt/e/Apps/Assessment/project AmmuNation' && docker compose up -d && cd backend && npm run start:dev"

# Terminal 2 — Windows: frontend
cd "E:\Apps\Assessment\project AmmuNation\frontend"
npm run dev
```

Verify the stack:

```bash
wsl -e bash -lc "docker exec ammunation_postgres pg_isready -U postgres -d ammunation_db"   # accepting connections
wsl -e bash -lc "docker exec ammunation_redis redis-cli ping"                                # PONG
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/docs                      # 200
```

### Demo credentials (all password `Password123!`)

| Role | Email |
|---|---|
| ADMIN | `admin@ammunation.com` |
| STAFF | `staff@ammunation.com` |
| WAREHOUSE_OPERATOR | `warehouse@ammunation.com` |
| CUSTOMER | `customer@ammunation.com` |

> The original README listed `admin.alex@ammunation.com` / `customer@example.com` — **those do not exist** and return 401.

---

## 3. Gotchas — every trap hit so far, and the fix

### 3.1 WSL VM shuts down and takes Docker with it ⭐ most common
**Symptom:** Containers show `Up 7 seconds` every time you check. `P1001: Can't reach database server`.
Postgres logs show repeated `received fast shutdown request` every 1–3 minutes.

**Cause:** With Docker Engine *inside* a WSL distro (no Docker Desktop), the WSL VM terminates once no
process is running in it. Each `wsl -e ...` one-shot command exits → VM shuts down → containers stop.

**Fix:** Keep one long-lived process in WSL (the backend). Start Docker **in the same** WSL invocation
that starts the backend, as in §2. Never rely on `docker compose up -d` alone from a one-shot command.

---

### 3.2 Windows cannot reach `localhost:5432`
**Symptom:** `ECONNREFUSED 127.0.0.1:5432` from Windows Node, while `Test-NetConnection` may even say True.

**Cause:** Same as 3.1 — the WSL VM (and its port forwarding) was gone.

**Fix:** Start the WSL-side stack first (§2), *then* run Windows-side commands. Once the backend is
running in WSL, Windows reaches `127.0.0.1:5432` fine.

Quick probe:
```bash
node -e "const n=require('net');const s=n.createConnection({host:'127.0.0.1',port:5432},()=>{console.log('OK');process.exit(0)});s.on('error',e=>{console.log('FAIL',e.code);process.exit(0)});"
```

---

### 3.3 Prisma CLI hangs forever when run from WSL on `/mnt/e` ⭐
**Symptom:** `npx prisma migrate dev|deploy` spins at ~170% CPU for 15–30 minutes, produces no
migration folder, never exits.

**Cause:** The Prisma engine performs pathologically badly over the `drvfs` mount (`/mnt/e`).

**Fix: run Prisma from the Windows side instead** — it is native there and completes in seconds:
```bash
cd "E:\Apps\Assessment\project AmmuNation\backend"
npx prisma migrate dev --name your_migration_name
```
(The WSL backend must be running first so the DB is reachable — see 3.2.)

---

### 3.4 `prisma generate` fails with `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`
**Cause:** A **running Node process has the engine DLL loaded** — usually an orphaned backend from a
previous `npm run start:dev` on the Windows side (nest watch respawns `node dist/src/main`).

**Fix:** find and kill only the offending process, then regenerate:
```powershell
Get-Process node | Where-Object { $_.Modules.FileName -like "*query_engine-windows*" } | Select-Object Id,StartTime
Get-CimInstance Win32_Process -Filter "ProcessId = <PID>" | Select-Object -Expand CommandLine   # confirm it is ours
Stop-Process -Id <PID> -Force
```
```bash
rm -f node_modules/.prisma/client/*.tmp*
npx prisma generate
```
Do **not** blanket-kill every `node` process — some may belong to other work.

---

> **Two variants of this lock, depending on which engine is held:**
> - `query_engine-windows.dll.node` → a **Windows** node process holds it (orphaned `npm run start:dev` on Windows).
> - `libquery_engine-debian-openssl-3.0.x.so.node` → the **WSL** backend holds it. Stop the WSL backend
>   (`wsl -e bash -lc "pkill -9 -f 'nest start'"`), run `npx prisma generate`, then restart it.
>
> Because `migrate dev` runs `generate` automatically at the end, the migration itself usually
> succeeds and only the generate step fails — check the DB before assuming the migration was lost.

### 3.5 Nest `--watch` does not pick up new files
**Symptom:** You add a new module/controller; routes never appear in the log; endpoint 404s.

**Cause:** inotify events do not fire on `/mnt/*` drvfs mounts, so the TypeScript watcher never sees new files.

**Fix:** restart the backend after adding **new files** (edits to existing files usually still recompile):
```bash
wsl -e bash -lc "pkill -9 -f 'nest start'"
# then start again per §2
```
Confirm the routes registered:
```bash
grep -oE "Mapped \{/api/v1/[^}]*\}" <backend log>
```

---

### 3.6 Frontend calls 404 — missing `/api/v1` prefix
**Symptom:** Every request 404s; pages render empty with no obvious error.

**Cause:** `frontend/src/services/api.ts` had `API_BASE_URL = 'http://localhost:3000'` while the backend
mounts everything under `/api/v1`.

**Fix (already applied):** base URL is `http://localhost:3000/api/v1`. Override with `VITE_API_URL` if needed.

---

### 3.7 List endpoints return an envelope, not an array
**Symptom:** `products.map is not a function`, or pages show nothing.

**Cause:** List endpoints return `{ count, products }`, `{ count, reservations }`, `{ count, logs }`,
not bare arrays. `GET /products` additionally returns `{ total, page, limit, totalPages }`.

**Fix:** unwrap in `services/api.ts` (already done). Keep new list endpoints consistent with this shape.

---

### 3.8 Bash heredocs break when appending CSS
**Symptom:** `unexpected EOF while looking for matching quote`; the file is silently not written.

**Fix:** don't append large CSS via shell heredoc. Write a dedicated `.css` file next to the component
and `import './Component.css'` from the TSX — Vite bundles it. (This is why `EquipmentPage.css` exists.)

---

### 3.9 File downloads: never `stream.pipe(res)` here
**Symptom:** a 408-byte file downloads as 11 MB and the connection never closes; the Nest log
shows a single request returning `200` in 3 ms.

**Cause:** with `@Res()` the handler returns immediately while the piped stream keeps emitting —
the file was re-sent ~27,000 times.

**Fix:** uploads are capped at 8 MB, so read the object into a Buffer and `res.send(buffer)` with an
explicit `Content-Length`. See `UploadsController.download`. Only reintroduce streaming if that cap
rises substantially.

### 3.10 Multipart uploads and JWT-protected file links (frontend)
- The shared `request()` helper must **not** force `Content-Type: application/json` when the body is
  `FormData` — doing so strips the multipart boundary and the server cannot parse the upload.
- A plain `<a href>` to a JWT-protected download **401s**, because browsers do not attach the
  `Authorization` header to ordinary navigations. Fetch the bytes with auth, wrap in a
  `Blob`, and open an object URL instead (`uploadsApi.open`).

### 3.11 Browser form fields retain old values during automation
**Symptom:** Typed text appends to existing content → `admin@x.comadmin@x.com` → validation error.

**Fix:** `triple_click` the field then `ctrl+a` before typing.

---

## 4. Database

### Migrations
```bash
# From WINDOWS (see 3.3), with the WSL backend already running
cd "E:\Apps\Assessment\project AmmuNation\backend"
npx prisma migrate dev --name description_of_change
npx prisma generate
```

### Seeding
```bash
npm run seed                              # full reset seed — DESTRUCTIVE, recreates users/products/reservations
npx ts-node prisma/seed-catalog.ts        # idempotent catalog seed — safe to re-run, preserves stock & bookings
```

`seed-catalog.ts` upserts by `sku`, so it never duplicates rows and never disturbs reservations.
Prefer it for catalog changes.

### Inspecting the DB
```bash
wsl -e bash -lc "docker exec ammunation_postgres psql -U postgres -d ammunation_db -c '\dt'"
wsl -e bash -lc "docker exec ammunation_postgres psql -U postgres -d ammunation_db -c 'select email, role from \"User\";'"
```

### Schema status
Present: `User`, `Category`, `Product`, `Reservation`, `ReservationItem`, `Payment`, `InventoryLog`.

**Still missing vs the assessment spec:** `Upload` (identity docs / rental agreements),
`Notification` (persisted feed), `ActivityLog` (login / reservation / payment / inventory audit trail).
The notification bell currently *derives* alerts from reservation data because no feed table exists.

---

## 5. Verifying the API by hand

```bash
wsl -e bash -lc '
T=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@ammunation.com\",\"password\":\"Password123!\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[\"accessToken\"])")
curl -s "http://localhost:3000/api/v1/products?limit=3" -H "Authorization: Bearer $T" | python3 -m json.tool | head -30
'
```

Check RBAC is really enforced (should print `403`):
```bash
# customer token against an admin-only endpoint
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/dashboard/stats -H "Authorization: Bearer $CUSTOMER_TOKEN"
```

---

## 6. Role permission matrix (verified against the running API)

| Action | ADMIN | STAFF | WAREHOUSE | CUSTOMER |
|---|:--:|:--:|:--:|:--:|
| Create / edit equipment | ✅ | ✅ | ❌ 403 | ❌ |
| Delete equipment | ✅ | ❌ | ❌ 403 | ❌ |
| Browse catalog / categories | ✅ | ✅ | ✅ | ✅ |
| Inventory logs (RECEIVE/RELEASE/DAMAGE/MAINTENANCE) | ✅ | ✅ | ✅ | ❌ |
| Approve / reject reservations | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/stats` | ✅ | ✅ | ❌ 403 | ❌ 403 |
| `/dashboard/my-summary` | ✅ | ✅ | ✅ | ✅ (own data only) |

Warehouse operators **restock existing** equipment (RECEIVE increments `Product.totalStock` inside a
`$transaction`) but **cannot create new catalog entries** — that is ADMIN/STAFF only.

---

## 7. Equipment images

Files live in `backend/public/equipment/` and are served statically by the API at
**`/equipment/<sku-lowercase>.jpg`** — the server root, outside the `/api/v1` prefix — which is
exactly what `Product.imageUrl` holds. One copy feeds every client:

- **Web (dev)**: Vite proxies `/equipment` to the backend (`frontend/vite.config.ts`).
- **Web (prod)**: nginx proxies `^/(api|equipment)/` to the backend container.
- **Mobile**: `AppConstants.assetUrl()` resolves the path against the API origin.

Drop a correctly-named file in and it renders with zero code changes; when one is missing the web
card shows a labelled placeholder and the app shows its gradient glyph (no broken-image icon).

All 16 are present. Filenames:

| SKU | File | Equipment |
|---|---|---|
| TL-DRILL-001 | `tl-drill-001.jpg` | DeWalt DWD520 Hammer Drill |
| TL-SAW-002 | `tl-saw-002.jpg` | Husqvarna K770 Cut-Off Saw |
| PO-GEN-003 | `po-gen-003.jpg` | Honda EU2200i Generator |
| HE-LIFT-004 | `he-lift-004.jpg` | Genie GS-1930 Scissor Lift |
| AV-CAM-005 | `av-cam-005.jpg` | Sony FX6 Cinema Camera |
| TL-HAMMER-006 | `tl-hammer-006.jpg` | Bosch Bulldog Rotary Hammer |
| HE-CAT-007 | `he-cat-007.jpg` | CAT 259D3 Track Loader |
| TL-GRIND-008 | `tl-grind-008.jpg` | Makita GA9020 Angle Grinder |
| TL-IMPACT-009 | `tl-impact-009.jpg` | Milwaukee M18 Impact Wrench |
| AV-GIMB-010 | `av-gimb-010.jpg` | DJI Ronin 4D Gimbal |
| AV-LIGHT-011 | `av-light-011.jpg` | Aputure LS 600d LED Kit |
| HE-BOOM-012 | `he-boom-012.jpg` | JLG 450AJ Boom Lift |
| HE-HOIST-013 | `he-hoist-013.jpg` | Genie GL-8 Material Lift |
| PO-DIESEL-014 | `po-diesel-014.jpg` | CAT XQ125 Diesel Generator |
| CM-COMPACT-015 | `cm-compact-015.jpg` | Wacker Neuson WP1550 Compactor |
| HE-EXCAV-016 | `he-excav-016.jpg` | Kubota KX040-4 Excavator |

Using a different extension (`.png`, `.webp`)? Update `imageUrl` in `prisma/seed-catalog.ts` and re-run
the catalog seed, or edit the item in the UI (ADMIN/STAFF → Equipment → Edit → Image path).

---

## 8. Frontend conventions

- **Design tokens** live at the top of `frontend/src/index.css` (`--font-body`, `--borr-blue`, `--ease-out-expo`).
- **Body font is Creato Display** — only weights **400 / 500 / 700** are loaded. Do not use 600; the
  browser will synthesise a fake bold.
- **Dark mode** is `data-theme="dark"` on `<html>`, persisted in `localStorage` under `ammunation_theme`.
  When adding a component with hardcoded light colours, add a matching `[data-theme="dark"]` override
  or it will be unreadable in dark mode.
- **Glass surfaces** use one inset top highlight plus one outer shadow. Avoid the double-inset
  (light top + dark bottom) emboss — it was deliberately removed for a flatter Apple-style look.
- **Auth token** is stored in `localStorage` as `ammunation_token` and injected as a Bearer header by
  `services/api.ts`.
