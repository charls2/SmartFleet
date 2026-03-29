# SmartFleet AI

SmartFleet AI is a full-stack fleet tracking dashboard backed by **Firestore**.

## Tech stack

- **Backend**: Node.js + TypeScript + Express + Firebase Admin SDK (Firestore)
- **Frontend**: React + Vite
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

5. Initialize schema + demo data (optional but recommended):

```bash
npm run firestore:init   # creates the collections + telemetry subcollection (bootstrap docs)
npm run seed             # adds demo tenant data (companyId = cmp_1)
```

6. Run the API:

```bash
npm run dev
```

API runs on `http://localhost:8080`.

### Tenant header (important)

All API routes (except `GET /health`) require a tenant:

- Send header `x-company-id: <companyId>`
- Demo data uses `x-company-id: cmp_1`

## Frontend setup (`frontend/`)

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Optional: set API URL (defaults to `http://localhost:8080`):

```bash
copy .env.example .env
```

3. Run the UI:

```bash
npm run dev
```

Vite prints the local URL (usually `http://localhost:5173`).

In the UI header, set **Tenant** to `cmp_1` (or your own company id) and click **Apply**.

## Useful endpoints (backend)

- `GET /health`
- `GET /fleetStats/:companyId`
- `GET /vehicles` and `POST /vehicles/:vehicleId/location` (telemetry ingest)
- `GET /alerts?resolved=false`
- `GET /deliveries`

## Security notes

- Never commit your service account JSON or `.env` files.
- Secrets are ignored via root `.gitignore` and `backend/.gitignore`, but if a key was ever committed, rotate it in Google Cloud.
