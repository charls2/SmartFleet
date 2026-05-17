import { randomBytes } from "node:crypto";
import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";
import type { Request } from "express";
import type { UserRole } from "./middleware.js";

export const authRouter = Router();

async function requireUnregisteredUser(req: Request) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  if (!bearer) {
    throw new HttpError(401, "Authorization Bearer token required");
  }
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(bearer);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  const uid = decoded.uid;
  const email = typeof decoded.email === "string" ? decoded.email : "";
  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();
  if (existing.exists) {
    throw new HttpError(409, "User already belongs to a company");
  }
  return { uid, email, userRef };
}

async function assertValidInvite(companyId: string, inviteCode: string) {
  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpError(404, "Company not found");
  }
  const co = companySnap.data()!;
  const expected = co.inviteCode as string | undefined;
  if (!expected || expected !== inviteCode.trim()) {
    throw new HttpError(403, "Invalid invite code");
  }
  return { companyRef, co };
}

async function claimedDriverIds(companyId: string): Promise<Set<string>> {
  const usersSnap = await db.collection("users").where("companyId", "==", companyId).get();
  const claimed = new Set<string>();
  for (const doc of usersSnap.docs) {
    const driverId = doc.data().driverId;
    if (typeof driverId === "string" && driverId.length > 0) {
      claimed.add(driverId);
    }
  }
  return claimed;
}

authRouter.post("/register", async (req, res) => {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    if (!bearer) {
      throw new HttpError(401, "Authorization Bearer token required");
    }

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(bearer);
    } catch {
      throw new HttpError(401, "Invalid or expired token");
    }

    const uid = decoded.uid;
    const email = typeof decoded.email === "string" ? decoded.email : "";

    const userRef = db.collection("users").doc(uid);
    const existing = await userRef.get();
    if (existing.exists) {
      throw new HttpError(409, "User already registered");
    }

    const { companyName } = req.body as { companyName?: string };
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      throw new HttpError(400, "companyName is required");
    }

    const companyRef = db.collection("companies").doc();
    const companyId = companyRef.id;
    const inviteCode = randomBytes(8).toString("hex");

    const batch = db.batch();
    batch.set(companyRef, {
      name: companyName.trim(),
      plan: "FREE",
      vehicleCount: 0,
      inviteCode,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(userRef, {
      companyId,
      email,
      role: "owner" as UserRole,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    const companySnap = await companyRef.get();
    const data = companySnap.data()!;
    return res.status(201).json({
      companyId,
      inviteCode,
      company: {
        id: companyId,
        name: data.name,
        plan: data.plan,
        vehicleCount: data.vehicleCount,
        createdAt: serializeTimestamp(data.createdAt),
      },
    });
  } catch (e) {
    return sendError(res, e);
  }
});

/**
 * List driver profiles available to link when joining (invite must be valid).
 * Excludes drivers already linked to another Firebase user in this company.
 */
authRouter.get("/join-drivers", async (req, res) => {
  try {
    await requireUnregisteredUser(req);
    const companyId = req.query.companyId;
    const inviteCode = req.query.inviteCode;
    if (typeof companyId !== "string" || typeof inviteCode !== "string") {
      throw new HttpError(400, "companyId and inviteCode query params are required");
    }
    const { co } = await assertValidInvite(companyId, inviteCode);
    const claimed = await claimedDriverIds(companyId);
    const driversSnap = await db.collection("drivers").where("companyId", "==", companyId).get();
    const drivers = driversSnap.docs
      .filter((d) => !claimed.has(d.id))
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name as string,
          phone: data.phone as string,
          status: data.status as string,
          assignedVehicleId: (data.assignedVehicleId as string | null) ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return res.json({
      companyId,
      companyName: String(co.name ?? ""),
      drivers,
    });
  } catch (e) {
    return sendError(res, e);
  }
});

/** Join an existing company using invite code (Firebase user must not already be registered). */
authRouter.post("/join", async (req, res) => {
  try {
    const { email, userRef } = await requireUnregisteredUser(req);

    const { companyId, inviteCode } = req.body as { companyId?: string; inviteCode?: string };
    if (!companyId || typeof companyId !== "string" || !inviteCode || typeof inviteCode !== "string") {
      throw new HttpError(400, "companyId and inviteCode are required");
    }

    const { co } = await assertValidInvite(companyId, inviteCode);

    const body = req.body as { role?: UserRole; driverId?: string };
    const role = body.role;
    let assignedRole: UserRole =
      role === "viewer" || role === "dispatcher" ? role : "dispatcher";
    let linkedDriverId: string | undefined;

    if (role === "driver") {
      assignedRole = "driver";
      const driverId = body.driverId;
      if (!driverId || typeof driverId !== "string") {
        throw new HttpError(400, "driverId is required when joining as driver");
      }
      const driverSnap = await db.collection("drivers").doc(driverId).get();
      if (!driverSnap.exists || driverSnap.data()!.companyId !== companyId) {
        throw new HttpError(404, "Driver profile not found in this company");
      }
      const claimed = await claimedDriverIds(companyId);
      if (claimed.has(driverId)) {
        throw new HttpError(409, "This driver profile is already linked to another account");
      }
      linkedDriverId = driverId;
    }

    await userRef.set({
      companyId,
      email,
      role: assignedRole,
      ...(linkedDriverId ? { driverId: linkedDriverId } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      companyId,
      role: assignedRole,
      driverId: linkedDriverId ?? null,
      company: {
        id: companyId,
        name: co.name,
        plan: co.plan,
        vehicleCount: co.vehicleCount,
        createdAt: serializeTimestamp(co.createdAt),
      },
    });
  } catch (e) {
    return sendError(res, e);
  }
});

authRouter.get("/me", async (req, res) => {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    if (!bearer) {
      throw new HttpError(401, "Authorization Bearer token required");
    }

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(bearer);
    } catch {
      throw new HttpError(401, "Invalid or expired token");
    }

    const uid = decoded.uid;
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpError(404, "User not registered");
    }

    const userData = userSnap.data()!;
    const companyId = userData.companyId as string;
    const companySnap = await db.collection("companies").doc(companyId).get();
    if (!companySnap.exists) {
      throw new HttpError(404, "Company not found");
    }

    const co = companySnap.data()!;
    const role = ((userData.role as UserRole) ?? "owner") as UserRole;
    return res.json({
      uid,
      email: (userData.email as string) ?? decoded.email ?? null,
      companyId,
      role,
      driverId: (userData.driverId as string) ?? null,
      inviteCode: (co.inviteCode as string) ?? null,
      company: {
        id: companyId,
        name: co.name,
        plan: co.plan,
        vehicleCount: co.vehicleCount,
        createdAt: serializeTimestamp(co.createdAt),
      },
    });
  } catch (e) {
    return sendError(res, e);
  }
});
