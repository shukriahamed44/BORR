# Mobile App — Troubleshooting Log

Session: 2026-08-10
Reported symptom: **"I can't login. It doesn't say an error — it just won't go in."**

---

## Summary

Two independent faults produced the same symptom, one hiding the other:

1. **Network** — Android clients could not reach the WSL-hosted backend at all.
2. **App** — a race in the secure-storage writes logged the user straight back
   out the instant login succeeded. This one hit **every platform**, including web.

Verified end-to-end in Chrome after the fix: login lands on `/catalog`, and the
session survives a reload.

| Fix | Commit |
|---|---|
| `backend/src/main.ts`, `mobile/lib/core/constants/app_constants.dart` | `68fa1df` → merged `aded35d` |
| `mobile/lib/core/services/secure_storage_service.dart` | `7202520` → merged `13aa2ba` |

---

## Issue 1 — Backend unreachable from every Android client (root cause)

**Symptom:** Tap *Sign In* → spinner → nothing. No error banner, no navigation.

**Cause:** The dev backend runs inside WSL2 (`nest start --watch`), bound to the
dual-stack wildcard `*:3000`. WSL relays a dual-stack listener to Windows on the
**IPv6 loopback only**:

```
> Get-NetTCPConnection -LocalPort 3000 -State Listen
LocalAddress LocalPort
[::1]        3000          <- IPv6 only
```

Every Android client dials the host over **IPv4**:

- Emulator: `10.0.2.2` → host `127.0.0.1`
- Physical device via `adb reverse` → host `127.0.0.1`

Nothing listens there, so the POST hung until Dio's 15s `connectTimeout`. Fifteen
seconds of spinner reads as "nothing happened" — the error banner *does* render,
it just arrives long after the user gives up.

**Evidence:**

```
curl http://127.0.0.1:3000/api/v1/products   -> 000 (fail)
curl http://[::1]:3000/api/v1/products       -> 200
curl http://10.117.180.147:3000/...          -> 000 (fail, LAN)
```

Test server inside WSL bound to `0.0.0.0` instead → Windows immediately relayed it
on `127.0.0.1`, and the same curl returned 200. That isolated the mechanism.

**Fix** — `backend/src/main.ts`:

```ts
await app.listen(port, '0.0.0.0');   // was: app.listen(port)
```

Binding IPv4 explicitly makes WSL relay `127.0.0.1`, which the emulator and
`adb reverse` can both reach. Verified after the fix:

```
LocalAddress LocalPort
127.0.0.1    3000
POST /api/v1/auth/login -> 200 with accessToken + refreshToken
```

---

## Issue 1b — Parallel token writes raced the vault key (the real login bug)

**Symptom:** identical to Issue 1, but on **every** platform including Chrome:
login succeeds, then the app sits on the login screen. No error, no console
exception, nothing in the server log.

**Cause:** `saveTokens` and `saveUserMeta` wrote each value through
`Future.wait`. On web the vault derives its AES key on first write, so the
concurrent writes each generated a key and the last one won — anything written
under the earlier key could no longer be decrypted.

The cascade from there:

```
write access + refresh tokens (two AES keys created, one survives)
read access token  -> throws
  _read catch      -> clearAll() wipes the whole vault
  returns null     -> request goes out with no Authorization header
GET /notifications -> 401
  refresh          -> no refresh token left -> fails
  onSessionExpired -> logout() -> unauthenticated -> router bounces to /login
```

Every step swallows its own error, which is why the failure is completely silent.

**Evidence** (instrumented `localStorage` and `XMLHttpRequest` in the page):

```
set FlutterSecureStorage                       <- AES key
set FlutterSecureStorage                       <- AES key AGAIN, clobbers the first
set ...access_token / refresh_token / user_*
remove <all of the above>                      <- the wipe
GET /api/v1/notifications  ->  401,  Authorization header: (none)
```

**Fix** — `mobile/lib/core/services/secure_storage_service.dart`: write
sequentially, never `Future.wait`, so one key covers every value.

**Verified after the fix:** `localStorage` holds exactly one
`FlutterSecureStorage` key plus all five values; login lands on `#/catalog`;
reload restores the session via `GET /auth/me` → 200.

---

## Issue 2 — Emulator-only base URL handed to web, desktop and iOS

**Cause:** `AppConstants.apiBaseUrl` fell back to `10.0.2.2` for everything that
wasn't web. `10.0.2.2` is the Android **emulator's** alias for the host loopback.
It means nothing on a physical phone, a Windows desktop build, or the iOS
simulator — those all want plain loopback.

**Fix** — `mobile/lib/core/constants/app_constants.dart`: pick the alias only when
actually running on Android; everything else gets `127.0.0.1`.

`127.0.0.1` rather than `localhost` is deliberate: under WSL the API is relayed to
the IPv4 loopback only, and `localhost` resolves to `[::1]` first.

A real device still needs the override:

```
flutter run --dart-define=API_BASE_URL=http://<host-ip>:3000/api/v1
```

---

## Issue 3 — Physical device has no LAN route to the backend

The phone **can** reach the Windows host (verified: a test server on
`0.0.0.0:3001` answered a request made from the device, so the firewall is open).
But the backend lives inside WSL2 behind NAT, so the host's LAN IP never exposes
it — only the loopback relay does.

**Workaround** (no admin, no config):

```
adb reverse tcp:3000 tcp:3000
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

⚠️ Partially verified. The tunnel registers (`adb reverse --list` shows it), but a
raw `nc` probe from the device returned empty, so the hop was not confirmed
end-to-end. If it misbehaves, the fallbacks are WSL mirrored networking
(`networkingMode=mirrored` in `%USERPROFILE%\.wslconfig`) or a `netsh portproxy`.

---

## Issue 4 — Misleading "CORS" error in Chrome

**Symptom:** `DioException [connection error] ... may have blocked it because the
request is not a CORS "simple request" ...`

**Cause:** The backend was simply **not running**. Nothing was listening on 3000
in either address family.

That message is Dio's generic web text. The browser cannot distinguish "server
refused the connection" from "server refused the preflight", so Dio prints the
CORS explanation for every `XMLHttpRequest` failure. Backend CORS is `origin: '*'`
and was never the problem.

**Rule of thumb:** on Flutter web, check that the API is listening *before*
believing a CORS message.

---

## Issue 5 — Web dev server ports

- `--web-port=5000` failed with `errno = 10048`: already taken on this machine.
- `--web-port=5060` loads, but Chrome refuses to open it — `ERR_UNSAFE_PORT`,
  5060 is the SIP port on Chrome's blocked list.
- **5057** works.

Also: `flutter run -d chrome` hands the app to the Chrome window it launches
itself; a second browser pointed at the same port may never get Flutter mounted.
Use `-d web-server` when you want to drive the app from your own browser.

---

## Environment note — slow backend boot

Not a bug, but it costs a minute per restart. Source and `node_modules` sit on the
Windows `E:` drive; Linux node reads them through the `/mnt/e` drvfs bridge, and
`nest start` type-checks the whole project on every boot. Options, cheapest first:

1. `nest build --builder swc` — SWC instead of `tsc`, typically 5-10x faster.
2. Move the repo to WSL's native filesystem (`~/borr`) — removes the drvfs tax.
3. Run the backend natively on Windows — needs a Windows `npm install` plus
   `prisma generate` (the installed engine is `debian-openssl-3.0.x`), and Postgres
   would have to move too: it runs in WSL and is **not** relayed to Windows.

---

## Checked and found healthy

Ruled out before reaching the network layer. Note `SecureStorageService` was
*wrongly* cleared on the first pass — its corrupt-vault recovery looked correct
in isolation, but it was the thing amplifying a failed read into a full logout
(see Issue 1b). Reading code was not enough here; the bug only showed itself
under instrumentation.

| Area | Verdict |
|---|---|
| `login_screen.dart` → `AuthProvider.login()` wiring | Correct; `PrimaryButton` enables/disables properly |
| Login response shape | Backend returns flat `accessToken` / `refreshToken` / `user` — matches the parser |
| `UserModel.fromJson` | Fully null-defensive |
| GoRouter redirect + role routing | Correct; router built once, never rebuilt under the user |
| Error rendering on the login form | Works — the error simply took 15s to arrive |
| Android cleartext HTTP | Already allowed in the debug manifest (`usesCleartextTraffic`) |
| `INTERNET` permission | Present |

---

## Open, not fixed — uncommitted build break in the working copy

At the time of writing, `mobile/lib/features/catalog/screens/product_detail_screen.dart`
in the working checkout has an **uncommitted** edit that does not compile:

```
_buildContent() { final p = _product!; ...
  background: ProductImage(imageUrl: product.imageUrl, glyphSize: 108),
                                     ^^^^^^^ undefined - should be `p`
```

The committed version on `main` is fine. Left alone as someone's in-progress
work; `flutter run` from the checkout fails until it is corrected or reverted.

---

## Quick start (verified working)

```bash
# 1. backend, inside WSL
wsl -e bash -lc "cd '/mnt/e/Apps/Assessment/project AmmuNation/backend' && npm run start:dev"

# 2. confirm it answers on IPv4 — this is the check that matters
curl http://127.0.0.1:3000/api/v1/products        # expect 200

# 3. app in Chrome
cd mobile && flutter run -d chrome --web-port=5050
# or, to drive it from a browser you control:
cd mobile && flutter run -d web-server --web-port=5057   # then open 127.0.0.1:5057
```

Demo login: `customer@ammunation.com` / `Password123!`
