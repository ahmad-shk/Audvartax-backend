import type { Request, Response } from "express";
import { APPLICATION_STATUSES, type ApplicationStatus } from "../applications/application.types.js";
import {
  AdminApplicationLifecycleError,
  updateApplicationStatusAsAdmin,
} from "./admin.application.service.js";
import { applicationStore } from "../applications/application.store.js";
import { userStore } from "../auth/auth.store.js";
import { findOrder } from "../billing/billing.store.js";
import { supabase } from "../../config/supabase.js";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function listAdminApplicationsController(_req: Request, res: Response) {
  const applications = await applicationStore.listAll();
  const users = await Promise.all(
    applications.map((application) => userStore.findById(application.userId)),
  );

  const data = applications.map((application, index) => {
    const user = users[index];
    return {
      ...application,
      customer: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : null,
    };
  });

  res.json({ success: true, data: { applications: data } });
}

export async function updateAdminApplicationStatusController(req: Request, res: Response) {
  const applicationId = getParam(req.params.id);
  const body = req.body as {
    status?: ApplicationStatus;
    expectedUpdatedAt?: string;
  };

  if (!applicationId) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_APPLICATION_ID", message: "Application ID is required." },
    });
    return;
  }

  const adminStatuses: ApplicationStatus[] = ["processing", "completed", "cancelled"];

  if (!adminStatuses.includes(body.status as ApplicationStatus)) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_STATUS", message: "A valid application status is required." },
    });
    return;
  }

  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) {
    res.status(400).json({
      success: false,
      error: {
        code: "MISSING_APPLICATION_VERSION",
        message: "expectedUpdatedAt is required when updating an application status.",
      },
    });
    return;
  }

  try {
    const application = await updateApplicationStatusAsAdmin(
      applicationId,
      body.status as ApplicationStatus,
      body.expectedUpdatedAt,
    );

    if (!application) {
      res.status(404).json({
        success: false,
        error: { code: "APPLICATION_NOT_FOUND", message: "Application not found." },
      });
      return;
    }

    res.json({ success: true, data: { application } });
  } catch (error) {
    if (error instanceof AdminApplicationLifecycleError) {
      res.status(error.code === "APPLICATION_CONFLICT" ? 409 : 409).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
      return;
    }
    throw error;
  }
}

export async function getAdminApplicationController(req: Request, res: Response) {
  const applicationId = getParam(req.params.id);
  if (!applicationId)
    return res
      .status(400)
      .json({
        success: false,
        error: { code: "INVALID_APPLICATION_ID", message: "Application ID is required." },
      });
  const application = await applicationStore.findById(applicationId);
  if (!application)
    return res
      .status(404)
      .json({
        success: false,
        error: { code: "APPLICATION_NOT_FOUND", message: "Application not found." },
      });
  const user = await userStore.findById(application.userId);
  const billing = await findOrder(application.id, application.userId);
  const documentPaths: string[] = [];
  const collect = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.path === "string") documentPaths.push(record.path);
    Object.values(record).forEach(collect);
  };
  collect(application.documents);
  const signedDocuments = await Promise.all(
    documentPaths.map(async (path) => {
      const { data } = await supabase.storage
        .from("application-documents")
        .createSignedUrl(path, 60 * 10);
      return { path, url: data?.signedUrl ?? null };
    }),
  );
  res.json({
    success: true,
    data: {
      application,
      customer: user
        ? { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
        : null,
      billing,
      signedDocuments,
    },
  });
}
