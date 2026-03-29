import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { serializeTimestamp } from "../../src/common/serialize.js";

describe("serializeTimestamp", () => {
  it("serializes Firestore Timestamp to ISO string", () => {
    const t = Timestamp.fromDate(new Date("2025-01-15T12:00:00.000Z"));
    expect(serializeTimestamp(t)).toBe("2025-01-15T12:00:00.000Z");
  });

  it("returns null for undefined", () => {
    expect(serializeTimestamp(undefined)).toBeNull();
  });
});
