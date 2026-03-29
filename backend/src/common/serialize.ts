import { Timestamp } from "firebase-admin/firestore";
import type { FirestoreTimestamp } from "./types.js";

export function serializeTimestamp(t: FirestoreTimestamp | undefined | null): string | null {
  if (t == null) return null;
  if (t instanceof Timestamp) return t.toDate().toISOString();
  if (typeof (t as Timestamp).toDate === "function") {
    return (t as Timestamp).toDate().toISOString();
  }
  return null;
}

export function toPlain<T extends Record<string, unknown>>(doc: T): Record<string, unknown> {
  const out: Record<string, unknown> = { ...doc };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v instanceof Timestamp) {
      out[k] = v.toDate().toISOString();
    } else if (v && typeof v === "object" && !Array.isArray(v) && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
      out[k] = (v as { toDate: () => Date }).toDate().toISOString();
    }
  }
  return out;
}
