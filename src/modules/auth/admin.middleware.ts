import type { NextFunction, Request, Response } from "express";

export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (res.locals.user?.role !== "admin") {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Administrator access is required." },
    });
    return;
  }

  next();
}
