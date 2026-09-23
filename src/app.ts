import express from "express";
import cors from "cors";
import * as helmetModule from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { billingRoutes } from "./modules/billing/billing.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { supabase } from "./config/supabase.js";

const helmet = (
  helmetModule as unknown as {
    default: (options?: Record<string, unknown>) => ReturnType<typeof express.json>;
  }
).default;

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/v1/auth", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api/v1/applications", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api/v1/billing", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api/v1/admin", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/", (_req, res) => {
  res.json({ success: true, data: { name: "Foremint API", status: "running" } });
});

app.get("/api/v1/health", async (_req, res) => {
  const { error } = await supabase.from("users").select("id").limit(1);

  if (error) {
    res.status(503).json({
      success: false,
      data: { status: "degraded", storage: "supabase", database: "unavailable" },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: { status: "ok", storage: "supabase", database: "connected" },
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/applications", applicationsRouter);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((_req, res) => {
  res
    .status(404)
    .json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.use(errorHandler);

export default app;
