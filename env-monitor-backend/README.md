# Environmental Monitoring Backend

This backend collects sensor readings (humidity and temperature), stores them in Firebase Realtime Database, and provides authentication and alerting services for mobile/web clients.

**Quick Start**
- Install dependencies: `npm install`
- Create a `.env` file (see **Environment** below)
- Run locally: `npm start` (defaults to `http://localhost:4000` unless `PORT` is changed)

**Tests**
- Run unit tests: `npm test`

**Environment**
Provide these minimum variables in `.env`:
- `FIREBASE_PROJECT_ID` — Firebase project id
- `FIREBASE_DATABASE_URL` — Realtime Database URL
- `FIREBASE_API_KEY` — Firebase Web API key (used for token exchange)
- `DEVICE_ID` — prototype device id (e.g. `esp32-01`)
- `DEVICE_SECRET` — device secret header value used by prototype devices
- `USE_PRISMA` / `DATABASE_URL` — optional if using Prisma DB

**Important endpoints**
- `POST /api/auth/signup` — create user (body: `email`, `password`, `firstName`, `lastName`)
- `POST /api/auth/signin` — login (body: `email`/`username`, `password`). Response may include a `firebaseToken` (custom token) — client should exchange it using Firebase client SDK via `signInWithCustomToken` to obtain an ID token.
- `GET /api/users/me` — protected; returns the signed-in user's profile (requires `Authorization: Bearer <ID_TOKEN>` header)
- `POST /api/readings/:deviceId` — device ingestion. For prototype devices send header `x-device-secret: <DEVICE_SECRET>` and JSON body `{ ts: <ms>, temperature, humidity, meta }`.

**Device ingestion notes**
- `ts` must be a numeric timestamp (milliseconds since epoch). The server also accepts batch posts with `readings: [ ... ]`.
- Device ingestion uses `x-device-secret` (prototype). Later you may switch to per-device secrets or Firebase-based device auth.

**How to test auth and profile fetch (example using HTTPie)**
1. Signup (server creates Firebase account and profile):
```powershell
http POST http://localhost:4000/api/auth/signup email=user@example.com password=Pass123 firstName=Jane lastName=Doe
```
2. Exchange credentials for an ID token using Firebase REST API (replace `YOUR_WEB_API_KEY`):
```powershell
http POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_WEB_API_KEY" \
  email=user@example.com password=Pass123 returnSecureToken:=true
```
3. Use the returned `idToken` to call profile endpoint:
```powershell
http GET http://localhost:4000/api/users/me Authorization:"Bearer <ID_TOKEN>"
```

**How to test device ingest (HTTPie)**
```powershell
http --json POST http://localhost:4000/api/readings/esp32-01 \
  x-device-secret:dev-device-secret-please-change ts:=1670000000000 temperature:=24 humidity:=47 meta:='{"battery":95}'
```

**Security & rules**
- RTDB security rules should enforce `auth != null && auth.uid === $uid` if clients will read `users/{uid}` directly. The backend uses the Admin SDK and bypasses RTDB rules for server-side writes.

If you want a frontend example for displaying `firstName` in a welcome widget or to add a POST fallback for `/api/users/me`, tell me and I will add it.

---
Contributions welcome — open an issue or PR.

MIT License