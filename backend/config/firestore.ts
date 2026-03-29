import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve as pathResolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = pathResolve(__dirname, "..");
const repoRoot = pathResolve(backendRoot, "..");

// Ensure .env is loaded even if this module is imported before src/index.ts runs dotenv
dotenv.config({ path: pathResolve(backendRoot, ".env") });
dotenv.config({ path: pathResolve(process.cwd(), ".env") });

function credentialJsonCandidates(keyPath: string): string[] {
  const paths: string[] = [];
  if (isAbsolute(keyPath)) {
    paths.push(keyPath);
    return paths;
  }
  paths.push(pathResolve(process.cwd(), keyPath));
  paths.push(pathResolve(backendRoot, keyPath));
  paths.push(pathResolve(repoRoot, keyPath));
  return [...new Set(paths)];
}

function readProjectIdFromServiceAccount(keyPath: string): string | undefined {
  for (const full of credentialJsonCandidates(keyPath)) {
    if (!existsSync(full)) continue;
    try {
      const json = JSON.parse(readFileSync(full, "utf8")) as { project_id?: string };
      if (json.project_id) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = full;
        return json.project_id;
      }
    } catch {
      /* try next */
    }
  }
  return undefined;
}

function tryAutoDiscoverServiceAccount(): string | undefined {
  for (const dir of [backendRoot, repoRoot]) {
    try {
      const names = readdirSync(dir);
      const match = names.find((n) => /-firebase-adminsdk-.*\.json$/i.test(n));
      if (match) {
        const full = pathResolve(dir, match);
        return readProjectIdFromServiceAccount(full);
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function resolveProjectId(): string | undefined {
  const fromEnv =
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (keyPath) {
    const id = readProjectIdFromServiceAccount(keyPath);
    if (id) return id;
  }

  return tryAutoDiscoverServiceAccount();
}

const projectId = resolveProjectId();

if (getApps().length === 0) {
  if (!projectId) {
    throw new Error(
      `Firestore project id missing. Either:
  • Add GCLOUD_PROJECT to backend/.env, or
  • Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path (relative paths are tried from cwd, backend/, and repo root), or
  • Place *-firebase-adminsdk-*.json in the SmartFleet repo root or backend/ folder`
    );
  }
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

export const db = getFirestore();
