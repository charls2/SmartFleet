import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function resolveProjectId(): string | undefined {
  const fromEnv =
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT_ID;
  if (fromEnv) return fromEnv;

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) return undefined;

  const full = resolve(process.cwd(), keyPath);
  if (!existsSync(full)) return undefined;

  try {
    const json = JSON.parse(readFileSync(full, "utf8")) as { project_id?: string };
    return json.project_id;
  } catch {
    return undefined;
  }
}

const projectId = resolveProjectId();

if (getApps().length === 0) {
  if (!projectId) {
    throw new Error(
      "Firestore project id missing: set GCLOUD_PROJECT (or GOOGLE_CLOUD_PROJECT), or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON that contains project_id"
    );
  }
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

export const db = getFirestore();
