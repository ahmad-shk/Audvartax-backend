import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createOrderController,
  getBillingController,
  listBillingController,
  payController,
} from "./billing.controller.js";

export const billingRoutes = Router();
billingRoutes.use(requireAuth);
billingRoutes.get("/", listBillingController);
billingRoutes.get("/:applicationId", getBillingController);
billingRoutes.post("/:applicationId/order", createOrderController);
billingRoutes.post("/:applicationId/payment", payController);
