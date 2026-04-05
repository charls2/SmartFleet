# SmartFleet AI

SmartFleet AI is a full-stack fleet tracking dashboard backed by **Firestore**.

## Tech stack

- **Backend**: Node.js + TypeScript + Express + Firebase Admin SDK (Firestore)
- **Frontend**: React + Vite, Firebase client Auth, Leaflet map (OpenStreetMap tiles)
- **Database**: Google Firestore (Native mode)
- **Legacy (archived)**: Java Spring Boot backend moved to `backend-legacy/`

## Repo structure

- `backend/` — Node/TS REST API (talks to Firestore)
- `frontend/` — React dashboard UI (calls the backend API)
- `backend-legacy/` — previous Spring Boot code (not used by the current app)

## Prerequisites

- **Node.js 20+**
- A **Firebase / Google Cloud** project with **Firestore enabled**
- A **service account JSON** (for the backend only)

## Backend setup (`backend/`)

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create `backend/.env` from the example:

```bash
copy .env.example .env
```

3. Configure credentials (choose one):

- **Option A (recommended local dev)**: set `GOOGLE_APPLICATION_CREDENTIALS` in `backend/.env` to your downloaded Firebase service-account JSON path.
- **Option B**: set `GCLOUD_PROJECT` (project id) and use Application Default Credentials.

4. One-time: create the Firestore database in Firebase console:

- Firebase Console → your project → **Build → Firestore Database** → create database (Native mode)

5. **Firebase Authentication (for sign-in / registration)**:

- Firebase Console → **Build → Authentication** → enable **Email/Password** (and optionally other providers later).

6. Initialize schema + demo data (optional but recommended for header-based local dev):

```bash
npm run firestore:init   # creates the collections + telemetry subcollection (bootstrap docs)
npm run seed             # adds demo tenant data (companyId = cmp_1)
```

7. Run the API:

```bash
npm run dev
```

API runs on `http://localhost:8080`.

### Tenant and auth

- **Production-style use**: the UI sends a Firebase **ID token** (`Authorization: Bearer …`). The backend resolves the user’s **company** from Firestore `users/{uid}` after sign-up via `POST /auth/register`.
- **Local dev without Firebase client**: the API accepts **`x-company-id`** (for example `cmp_1` after `npm run seed`) unless **`ALLOW_HEADER_TENANT=false`** in `backend/.env`. Omitting the variable enables header mode (same as the frontend). Set **`false`** in production so tenants cannot be spoofed with a header alone.

## Frontend setup (`frontend/`)

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Create `frontend/.env` from the example:

```bash
copy .env.example .env
```

3. Configure `frontend/.env`:

- **`VITE_API_URL`**: optional; defaults to `http://localhost:8080`.
- **`VITE_ALLOW_HEADER_TENANT`**: match the backend (`ALLOW_HEADER_TENANT`). Omit or any value except `false` enables tenant header mode **only when you have not added Firebase web config**. If you add the `VITE_FIREBASE_*` values below, the app uses **sign-in first** and ignores header mode for navigation.
- **`VITE_FIREBASE_*` (for email/password sign-in)**: these are **not secret**—they are the public Web SDK config (same as Firebase’s snippet for web apps). You still need them for the browser to talk to Firebase Auth.

**Step-by-step: get the `VITE_` Firebase values**

1. Open [Firebase Console](https://console.firebase.google.com/) and select your project (same one as Firestore and the backend service account).
2. Click the **gear** → **Project settings**.
3. Under **Your apps**, click **Add app** → **Web** (`</>`) if you do not already have a web app. Give it a nickname and register (App Check optional; you can skip for dev).
4. Firebase shows a **Firebase configuration** object with `apiKey`, `authDomain`, `projectId`, etc.
5. Copy each value into `frontend/.env` using these names:

| Firebase config field | Variable in `.env` |
|----------------------|-------------------|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

Example (use your own values, not these placeholders):

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
```

6. In Firebase Console → **Build** → **Authentication** → **Sign-in method**, enable **Email/Password**.
7. Restart the Vite dev server after changing `.env` (`Ctrl+C`, then `npm run dev`).

4. Run the UI:

```bash
npm run dev
```

Vite prints the local URL (usually `http://localhost:5173`).

### Using the app

- **With `VITE_FIREBASE_*` set**: you’ll see **Sign in** / **Create account** first. After your first sign-up, enter your **company name** to finish registration. Use **Log out** in the header to return to the login screen.
- **Without Firebase web config** (no `VITE_FIREBASE_API_KEY`): the UI uses **tenant header** mode when allowed—set **Tenant** to `cmp_1` (after `npm run seed` in `backend/`) and click **Apply**. This path is for local dev without browser sign-in.

## Useful endpoints (backend)

- `GET /health`
- `POST /auth/register` — body `{ "companyName": "…" }`, header `Authorization: Bearer <Firebase ID token>` (after Firebase sign-up)
- `GET /auth/me` — same Bearer; returns user profile and company
- `GET /fleetStats/:companyId`
- `GET|POST|PATCH|DELETE /vehicles` (tenant-scoped)
- `POST /vehicles/:vehicleId/location` (telemetry ingest)
- `GET /alerts?resolved=false`
- `GET /deliveries`

## Security notes

- Never commit your service account JSON or `.env` files.
- Secrets are ignored via root `.gitignore` and `backend/.gitignore`, but if a key was ever committed, rotate it in Google Cloud.
- Use **`ALLOW_HEADER_TENANT=false`** in production and rely on Firebase ID tokens plus Firestore `users/{uid}` for tenant resolution.
