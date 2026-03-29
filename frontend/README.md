# SmartFleet AI — frontend

Dashboard for the Node/Firestore API: fleet stats, vehicles, open alerts, and deliveries.

## Run

1. Start the backend (`backend/`: `npm run dev`, default `http://localhost:8080`).
2. Optional: copy `.env.example` to `.env` and set `VITE_API_URL` if the API is not on localhost:8080.
3. `npm install` then `npm run dev` (Vite, usually `http://localhost:5173`).

## Tenant

The UI sends `x-company-id` on every data request. Default tenant is `cmp_1` (matches `npm run seed` in `backend/`). Change it in the header and click **Apply**; it is stored in `localStorage`.

## Health

The pill in the header calls `GET /health` (no tenant required).
