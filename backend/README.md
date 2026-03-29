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
npm run firestore:init   # create all collection paths + telemetry subcollection (no demo tenant data)
npm run seed             # same as init, then demo data for cmp_1
```

**First-time Firestore:** In [Firebase Console](https://console.firebase.google.com/) → your project → **Build → Firestore Database** → create the **database** once (Native mode). You do **not** need to add collections by hand: run `npm run firestore:init` (or `npm run seed`) from `backend/` with valid credentials.

**Schema (auto-created on first write):**

| Root collection | Document id (bootstrap) | Notes |
|-----------------|-------------------------|--------|
| `companies` | `_smartfleet_bootstrap` | Real tenant docs use your `companyId` |
| `vehicles` | `_smartfleet_bootstrap` | Hot state per vehicle |
| `vehicles/{id}/telemetry` | `_smartfleet_bootstrap` | High-write history; auto IDs in production |
| `drivers` | `_smartfleet_bootstrap` | |
| `deliveries` | `_smartfleet_bootstrap` | |
| `alerts` | `_smartfleet_bootstrap` | |
| `fleetStats` | `_smartfleet_bootstrap` | Per-company stats use `companyId` as doc id |

Bootstrap docs have **no `companyId`**, so they do not appear in API queries filtered by `x-company-id`.

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
