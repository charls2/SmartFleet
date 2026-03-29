import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      companyId?: string;
      firebaseUid?: string;
    }
  }
}

/**
 * Tenant resolution: Bearer Firebase ID token (companyId / tenant_id claim), or `x-company-id` header.
 */
export async function requireCompanyContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;

  if (bearer) {
    try {
      const decoded = await getAuth().verifyIdToken(bearer);
      req.firebaseUid = decoded.uid;
      const companyId =
        (decoded as { companyId?: string }).companyId ??
        (decoded as { tenant_id?: string }).tenant_id;
      if (companyId) {
        req.companyId = companyId;
        return next();
      }
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  const headerCompany = req.headers["x-company-id"];
  if (typeof headerCompany === "string" && headerCompany.length > 0) {
    req.companyId = headerCompany;
    return next();
  }

  return res.status(400).json({
    error:
      "Missing tenant: send x-company-id header or Bearer Firebase ID token with companyId claim",
  });
}
