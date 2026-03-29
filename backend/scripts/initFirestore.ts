/**
 * Creates all SmartFleet collection paths (and vehicles/.../telemetry) in Firestore.
 * Run from backend/: npm run firestore:init
 *
 * You do not need to create collections manually in the Firebase console.
 */
import { db } from "../config/firestore.js";
import { ensureBootstrapCollections } from "./lib/bootstrapCollections.js";

async function main() {
  const project =
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    "(from service account)";
  console.log(`Initializing Firestore schema (project: ${project})…`);

  await ensureBootstrapCollections(db);

  console.log(`
Done. Created/merged bootstrap docs for:
  • companies
  • vehicles  (+ subcollection telemetry)
  • drivers
  • deliveries
  • alerts
  • fleetStats

Bootstrap doc id: _smartfleet_bootstrap (hidden from tenant-scoped queries)

Next: npm run seed   — optional demo data for tenant cmp_1
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
