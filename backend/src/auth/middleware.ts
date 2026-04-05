import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { db } from "../../config/firestore.js";

export type UserRole = "owner" | "dispatcher" | "viewer";

declare global {
  namespace Express {
    interface Request {
      companyId?: string;
      firebaseUid?: string;
      /** Set when Bearer resolves to a Firestore user; `viewer` cannot mutate fleet data. */
      userRole?: UserRole;
    }
  }
}

/**
 * Tenant resolution: Bearer Firebase ID token + Firestore users/{uid}.companyId,
 * or legacy claims (companyId / tenant_id), or x-company-id unless ALLOW_HEADER_TENANT=false.
 */
export async function requireCompanyContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;

  /** Default on for local dev; set ALLOW_HEADER_TENANT=false in production. */
  const allowHeader = process.env.ALLOW_HEADER_TENANT !== "false";

  if (bearer) {
    try {
      const decoded = await getAuth().verifyIdToken(bearer);
      req.firebaseUid = decoded.uid;

      const userSnap = await db.collection("users").doc(decoded.uid).get();
      if (userSnap.exists) {
        const data = userSnap.data()!;
        req.companyId = data.companyId as string;
        req.userRole = (data.role as UserRole) ?? "owner";
        return next();
      }

      const claimCompany =
        (decoded as { companyId?: string }).companyId ??
        (decoded as { tenant_id?: string }).tenant_id;
      if (claimCompany) {
        req.companyId = claimCompany;
        req.userRole = "owner";
        return next();
      }

      return res.status(403).json({
        error:
          "Complete registration: POST /auth/register with your company name",
      });
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  if (allowHeader) {
    const headerCompany = req.headers["x-company-id"];
    if (typeof headerCompany === "string" && headerCompany.length > 0) {
      req.companyId = headerCompany;
      return next();
    }
  }

  return res.status(400).json({
    error:
      "Missing tenant: sign in and send Authorization Bearer, or set ALLOW_HEADER_TENANT=true and send x-company-id for local dev",
  });
}
