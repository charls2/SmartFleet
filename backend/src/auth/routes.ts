import { randomBytes } from "node:crypto";
import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";
import type { UserRole } from "./middleware.js";

export const authRouter = Router();

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

/** Join an existing company using invite code (Firebase user must not already be registered). */
authRouter.post("/join", async (req, res) => {
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
      throw new HttpError(409, "User already belongs to a company");
    }

    const { companyId, inviteCode } = req.body as { companyId?: string; inviteCode?: string };
    if (!companyId || typeof companyId !== "string" || !inviteCode || typeof inviteCode !== "string") {
      throw new HttpError(400, "companyId and inviteCode are required");
    }

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

    const role = (req.body as { role?: UserRole }).role;
    const assignedRole: UserRole =
      role === "viewer" || role === "dispatcher" ? role : "dispatcher";

    await userRef.set({
      companyId,
      email,
      role: assignedRole,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      companyId,
      role: assignedRole,
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
