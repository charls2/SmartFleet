import type { NextFunction, Request, Response } from "express";

/**
 * Blocks mutating methods for users with role `viewer` (Bearer + Firestore user only).
 * Header-tenant dev mode has no firebaseUid → writes allowed.
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  if (!req.firebaseUid) {
    return next();
  }
  if (req.userRole === "viewer") {
    return res.status(403).json({ error: "Read-only access (viewer role)" });
  }
  return next();
}
