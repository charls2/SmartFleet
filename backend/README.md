# SmartFleet backend (Node.js + Firestore)

REST API for SmartFleet AI using **Express**, **TypeScript**, and **Firebase Admin SDK** (Firestore).

## Prerequisites

- Node.js 20+
- A Firebase / GCP project with Firestore enabled
- Service account JSON with Firestore access, or Application Default Credentials

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `8080`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON (local dev; relative paths are from the directory where you run `npm`) |
| `GCLOUD_PROJECT` | Optional if the JSON above contains `project_id` — that value is used automatically |
| `FIRESTORE_EMULATOR_HOST` | Optional: `127.0.0.1:8080` for emulator |

## Auth / multi-tenant

Send **`x-company-id`** with every request (after `/health`), or a **Firebase ID token** (`Authorization: Bearer …`) with a `companyId` (or `tenant_id`) custom claim.

## Scripts

```bash
npm install
npm run dev      # tsx watch
npm run build
npm start        # node dist/src/index.js
npm test
npm run seed   # demo documents (companies, vehicles + telemetry, drivers, deliveries, alerts, fleetStats)
```

**First-time Firestore:** In [Firebase Console](https://console.firebase.google.com/) → your project → **Build → Firestore Database** → create the database (production or test mode). Then run `npm run seed` from `backend/` with valid credentials in `.env`.

**API calls after seeding:** use header `x-company-id: cmp_1` (demo tenant written by the seed script).

## Firestore indexes

Deploy composite indexes from `firestore/indexes.json`:

```bash
firebase deploy --only firestore:indexes
```

## Docker

```bash
docker build -f docker/Dockerfile -t smartfleet-backend .
docker run -p 8080:8080 -e GOOGLE_APPLICATION_CREDENTIALS=... smartfleet-backend
```

## Legacy Java backend

The previous Spring Boot app was moved to **`backend-legacy/`** at the repository root.
