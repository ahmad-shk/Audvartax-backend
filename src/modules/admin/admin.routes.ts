import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireAdmin } from "../auth/admin.middleware.js";
import {
  listAdminApplicationsController,
  getAdminApplicationController,
  updateAdminApplicationStatusController,
} from "./admin.controller.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin);
adminRoutes.get("/applications", listAdminApplicationsController);
adminRoutes.get("/applications/:id", getAdminApplicationController);
adminRoutes.patch("/applications/:id/status", updateAdminApplicationStatusController);
