# MASTER BOOTUP GUIDE

Written 2026-08-11 after the equipment-images session. Read this first on a fresh boot.
It covers: how to start the stack, what runs where, what broke and why, and what not to repeat.

---

## 1. Clean boot sequence

After a Windows restart, three terminals in `E:\Apps\Assessment\project AmmuNation`:

```powershell
.\scripts\dev.ps1 data       # 1. boots WSL; Postgres + Redis auto-start there
.\scripts\dev.ps1 backend    # 2. NestJS on :3000, watch mode
.\scripts\dev.ps1 web        # 3. Vite on :5173
```

Check anything, anytime:

```powershell
.\scripts\dev.ps1 status
```

Mobile:

```powershell
cd mobile
flutter run                                                              # Android emulator (uses 10.0.2.2)
flutter run --dart-define=API_BASE_URL=http://<LAN-IP>:3000/api/v1       # real phone
```

`<LAN-IP>` was `192.168.30.5` on the Ethernet 2 adapter. Confirm with `ipconfig` — it can change.

If the loopback relay is healthy after the reboot (it usually is on a fresh boot), the plain
commands work too and you can ignore `dev.ps1` entirely:

```powershell
cd backend;  npm run start:dev
cd frontend; npm run dev
```

`dev.ps1 backend` exists only to survive the broken-relay case described in §4.3. Nothing else
depends on it.

---

## 2. What runs where

| Piece | Host | Port | Started by | Auto-starts? |
|---|---|---|---|---|
| Postgres 16 (`ammunation_postgres`) | Docker **inside WSL** | 5432 | `docker`, `restart: always` | yes, once WSL boots |
| Redis 7 (`ammunation_redis`) | Docker **inside WSL** | 6379 | `docker`, `restart: always` | yes, once WSL boots |
| NestJS API | **Windows** | 3000 | `npm run start:dev` | no |
| Vite web app | **Windows** | 5173 | `npm run dev` | no |
| Flutter app | emulator / device | — | `flutter run` | no |

WSL runs systemd (`/etc/wsl.conf` has `systemd=true`) and the docker unit is `enabled`, so simply
touching WSL (`wsl -e true`, or `dev.ps1 data`) brings the database and cache back with no sudo.

**Rule: run the backend on Windows only.** See §4.1.

---

## 3. Verify it actually works

```powershell
curl.exe -s -o NUL -w "api %{http_code}`n"  http://127.0.0.1:3000/api/v1/products
curl.exe -s -o NUL -w "img %{http_code}`n"  http://127.0.0.1:3000/equipment/tl-drill-001.jpg
curl.exe -s -o NUL -w "web %{http_code}`n"  http://localhost:5173/equipment/tl-drill-001.jpg
```

Expect `200 / 200 / 200`. The second one is the equipment photo served straight off disk; the third
is the same file reaching the web app through the Vite proxy.

A `200` with `content-type: text/html` on the image URL means Vite answered instead of proxying —
the dev server was started before `vite.config.ts` had the proxy, restart it.

---

## 4. Findings from this session

### 4.1 There were two backends on port 3000 (root cause of a whole evening)

One `nest start --watch` on **Windows** bound to `0.0.0.0:3000`, and a *second* one running
**inside WSL** from the same folder (`/mnt/e/Apps/Assessment/project AmmuNation/backend`), exposed
to Windows through `wslrelay.exe` on `127.0.0.1:3000`.

Both can bind :3000 — different network stacks. But **Windows loopback prefers the WSL relay**, so
every `127.0.0.1:3000` request (curl, the web app, the Android emulator via `10.0.2.2`) hit the WSL
copy. And the WSL copy never rebuilt, because file-watching across `/mnt/e` gets no inotify events
from Windows-side edits. Net effect: you edit code, the server "restarts", nothing changes, and the
change looks broken when it is fine.

Both were killed. Do not start the backend inside WSL again.

Symptom to recognise next time: your change has no effect, but hitting the **LAN IP**
(`http://192.168.30.5:3000/...`) instead of `127.0.0.1` shows the new behaviour.

### 4.2 Equipment images: what was actually wired

`Product.imageUrl` has always been `/equipment/<sku-lowercase>.jpg`. Nothing served that path, so
web showed a placeholder and mobile a gradient glyph. Now:

- 16 photos live in **`backend/public/equipment/`** (one copy for every client).
- `backend/src/main.ts` serves `./public` statically at the server root — **outside** the `/api/v1`
  prefix, so the URL is exactly `/equipment/<sku>.jpg`.
- `backend/Dockerfile` copies `public/` into the runtime stage.
- Web dev: `frontend/vite.config.ts` proxies `/equipment` to `localhost:3000`.
- Web prod: `infra/ansible/files/nginx.conf` proxies `^/(api|equipment)/` to the backend container.
- Mobile: `AppConstants.assetUrl()` resolves the relative path against the API origin;
  the shared `ProductImage` widget (in `shared/widgets/glass.dart`) renders it with the old
  gradient + glyph as the loading/missing fallback.

Adding a new item needs **no code change** — drop `<sku-lowercase>.jpg` into
`backend/public/equipment/`. Full SKU table: `RUNBOOK.md` §7.

### 4.3 WSL localhost forwarding broke mid-session

After `wsl --shutdown`, Windows could no longer reach the WSL containers:

- `127.0.0.1:5432` — accepted for ~10 seconds after a container restart, then refused.
- `172.20.64.167:5432` (the WSL VM directly) — also refused.
- ICMP ping to the WSL IP — fine. So routing was up; TCP was being reset.
- Inside WSL, Postgres was perfectly healthy (`pg_isready` ok, listening `0.0.0.0:5432`).

That is a host/WSL networking fault, not a project fault. It is what makes the backend die with
Prisma `P1001: Can't reach database server at 127.0.0.1:5432`.

**A Windows reboot is the fix to try first** — it rebuilds the `vEthernet (WSL)` adapter and the
port relays.

### 4.4 Mirrored networking is not available on this machine (yet)

The permanent fix for §4.1 and §4.3 is `C:\Users\User\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Windows rejected it: *"Mirrored networking mode is not supported: Windows version 22621.2283 does
not have the required features. Falling back to NAT networking."* The file was **removed** again,
because leaving it prints that warning on every single `wsl` call.

Run Windows Update (mirrored needs a later 22H2 build), then re-add those three lines and
`wsl --shutdown`. After that, `localhost` genuinely means the same thing on both sides, there is no
relay to break, and `dev.ps1`'s IP dance becomes unnecessary.

### 4.5 Other things cleaned up

- A junk `node -e "...listen(3001...)"` "ok" server from an older session was killed.
- `.claude/worktrees/` (9 live git worktrees) was **not** committed — it is in `.gitignore` now.
  Committing them would nest checkouts inside the repo.
- `backend/.env.example` added, `.env` ignored.
- Docs that still claimed images live in `frontend/public/equipment` were corrected
  (`README.md`, `RUNBOOK.md` §7, `PROJECT-STATE.md`, the seed comment).

---

## 5. Lessons — do not repeat

1. **One backend, on Windows.** A second copy in WSL steals loopback and serves stale code.
2. **`127.0.0.1:3000` is not proof.** When behaviour looks stale, test the LAN IP too; if they
   disagree, something else owns loopback.
3. **`Test-NetConnection` lies here.** It reported the DB port open while a real TCP connect was
   refused a second later. Verify with an actual client (`npx prisma migrate status`).
4. **Windows PowerShell 5.1 reads `.ps1` as ANSI.** One em dash in a script = a wall of parse
   errors. `scripts/dev.ps1` is deliberately ASCII-only.
5. **`wsl.exe -e sh -c '...'` eats quotes.** A `|` inside a `--format` string becomes a real pipe,
   and paths with spaces get split. For anything non-trivial, write a `.sh` to a space-free path
   and run `wsl -e sh /mnt/c/.../script.sh`.
6. **The catalog seed is the contract.** `imageUrl` is derived from the SKU; match filenames to it
   rather than editing rows.

---

## 6. Troubleshooting quick table

| Symptom | Cause | Fix |
|---|---|---|
| Backend exits, `P1001` | Windows cannot reach WSL Postgres | reboot Windows; then `dev.ps1 data` before `dev.ps1 backend` |
| Code change has no effect | a second backend owns loopback | `.\scripts\dev.ps1 status`; kill the extra; never run it in WSL |
| Images 404 on web | Vite started before the proxy existed, or backend down | restart `dev.ps1 web`; check `curl 127.0.0.1:3000/equipment/tl-drill-001.jpg` |
| Images blank in mobile | wrong API host | pass `--dart-define=API_BASE_URL=http://<LAN-IP>:3000/api/v1` |
| `EADDRINUSE :3000` | old node still alive | `.\scripts\dev.ps1 status`, stop that pid |
| Every `wsl` call warns about mirrored networking | a `.wslconfig` your Windows build cannot honour | delete `C:\Users\User\.wslconfig` |

---

## 7. Repo state at the time of writing

Branch `main`, pushed to `origin` (`shukriahamed44/BORR`).

- `b6d1f16` — backend serves `backend/public/equipment/`, 16 photos, mobile `ProductImage`
- `ba3f184` — Vite + nginx proxy for `/equipment`, `.env.example`, doc corrections, worktree ignore

Checks that passed: `flutter analyze` clean, `flutter test` green (2 new asserts on
`AppConstants.assetUrl`), all 16 images returned `200 image/jpeg`, the Vite proxy returned
`200 image/jpeg` end to end against a live backend.

Known pre-existing failure, untouched and unrelated:
`backend/src/reservations/reservations.service.spec.ts:134` — TS2554, expected 3 arguments but got 4.

---

## 8. First thing to do after the reboot

```powershell
cd "E:\Apps\Assessment\project AmmuNation"
.\scripts\dev.ps1 status
```

If `postgres ... : True` and the two containers are listed, run `dev.ps1 backend` and `dev.ps1 web`
and you are working. If the DB line still says `False`, WSL networking is still wedged — go to §4.4
(Windows Update, then mirrored mode) before burning time on anything else.
