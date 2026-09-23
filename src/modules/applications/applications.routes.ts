import { Router, type Request } from "express";
import multer from "multer";
import crypto from "node:crypto";
import { getUserFromSession, SESSION_COOKIE } from "../auth/auth.service.js";
import { applicationStore } from "./application.store.js";
import { isInternalStatusTransitionAllowed } from "./application.internal-lifecycle.js";
import type { Application, ApplicationStatus } from "./application.types.js";
import type { ErrorRequestHandler } from "express";
import { supabase } from "../../config/supabase.js";
import { getApplicationMode } from "../commercial/application-mode.js";
import { createBillingOrder, reconcilePaidApplicationStatus } from "../billing/billing.service.js";
import { AppError } from "../../core/errors.js";

const BUCKET = "application-documents";
type USALLCMember = {
  name: string;
  percentage: string;
  dob: string;
};

function normalizeUSALLCMembers(value: unknown): USALLCMember[] {
  if (!Array.isArray(value)) return [];
  return value.map((member, index) => {
    if (!member || typeof member !== "object" || Array.isArray(member)) {
      throw new AppError(
        `Member ${index + 1} must be an object containing name, percentage, and dob.`,
        400,
        "INVALID_MEMBER_DATA",
      );
    }
    const record = member as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const dob = typeof record.dob === "string" ? record.dob.trim() : "";
    const percentage = String(record.percentage ?? "").trim();

    if (!name || !dob || !percentage || !Number.isFinite(Number(percentage))) {
      throw new AppError(
        `Member ${index + 1} must have a name, date of birth, and ownership percentage.`,
        400,
        "INVALID_MEMBER_DATA",
      );
    }

    return { name, percentage, dob };
  });
}

const UK_LTD_VIRTUAL_BANK_PROVIDERS = new Set([
  "Wise",
  "TIDE",
  "TAPTAP",
  "PAYONEER",
  "SUNRATE",
  "PAYPAL",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 50 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only PDF, JPEG, and PNG documents are allowed"));
  },
});

const uploadErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      success: false,
      error: {
        code: error.code === "LIMIT_FILE_SIZE" ? "FILE_TOO_LARGE" : "UPLOAD_ERROR",
        message:
          error.code === "LIMIT_FILE_SIZE" ? "Documents must be 10 MB or smaller." : error.message,
      },
    });
    return;
  }

  if (error instanceof Error) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_DOCUMENT_TYPE", message: error.message },
    });
    return;
  }

  next(error);
};

function parseJsonField(value: unknown, fieldName: string) {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Invalid JSON in " + fieldName);
  }
}

function applicationResponse(application: Application) {
  return {
    id: application.id,
    userId: application.userId,
    user_id: application.userId,
    serviceSlug: application.serviceSlug,
    service: application.serviceSlug,
    status: application.status,
    data: application.data,
    documents: application.documents,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    ...(typeof application.data.packageSlug === "string"
      ? { packageSlug: application.data.packageSlug }
      : {}),
    ...(typeof application.data.formationState === "string"
      ? { formationState: application.data.formationState }
      : {}),
    ...(typeof application.data.currentStep === "number"
      ? { currentStep: application.data.currentStep }
      : {}),
    ...(application.data.answers && typeof application.data.answers === "object"
      ? { answers: application.data.answers }
      : {}),
  };
}

async function currentUser(req: Request) {
  const sessionId = req.cookies[SESSION_COOKIE];
  return sessionId ? getUserFromSession(sessionId) : null;
}

export const applicationsRouter = Router();

applicationsRouter.get("/", async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "You are not signed in." },
      });
      return;
    }

    const applications = await applicationStore.listByUser(user.id);
    await Promise.all(
      applications.map((application) => reconcilePaidApplicationStatus(user.id, application.id)),
    );
    const refreshedApplications = await applicationStore.listByUser(user.id);
    res.json({
      success: true,
      data: { applications: refreshedApplications.map(applicationResponse) },
    });
  } catch (error) {
    next(error);
  }
});

applicationsRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "You are not signed in." },
      });
      return;
    }

    const application = await applicationStore.findById(req.params.id);
    if (!application || application.userId !== user.id) {
      res.status(404).json({
        success: false,
        error: { code: "APPLICATION_NOT_FOUND", message: "Application not found." },
      });
      return;
    }

    res.json({ success: true, data: { application: applicationResponse(application) } });
  } catch (error) {
    next(error);
  }
});

applicationsRouter.post(
  "/",
  (req, res, next) => {
    if (!req.is("multipart/form-data")) {
      next();
      return;
    }

    upload.any()(req, res, (error) => {
      if (error) {
        uploadErrorHandler(error, req, res, next);
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const user = await currentUser(req);
      if (!user) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHENTICATED", message: "You are not signed in." },
        });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const payload = req.is("multipart/form-data")
        ? (parseJsonField(body.application, "application") as Record<string, unknown>)
        : body;

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_PAYLOAD", message: "Application payload must be an object." },
        });
        return;
      }

      const serviceSlug =
        typeof payload.serviceSlug === "string"
          ? payload.serviceSlug
          : typeof payload.service === "string"
            ? payload.service
            : "";

      const data =
        payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
          ? { ...(payload.data as Record<string, unknown>) }
          : {
              packageSlug: payload.packageSlug,
              formationState: payload.formationState,
              currentStep: payload.currentStep,
              answers: payload.answers,
            };

      const parsedDocuments = parseJsonField(payload.documents, "documents");
      const documents =
        parsedDocuments && typeof parsedDocuments === "object" && !Array.isArray(parsedDocuments)
          ? structuredClone(parsedDocuments as Record<string, unknown>)
          : {};

      const applicationMode = getApplicationMode(serviceSlug);

      if (serviceSlug === "usa-llc") {
        const companyType = typeof data.company_type === "string" ? data.company_type : "";
        const ownerPercentage = Number(data.owner_ownership_percentage);
        const members = normalizeUSALLCMembers(data.members);
        if (companyType === "single_member_llc") {
          data.members = [];
          data.owner_ownership_percentage = "100";
        } else if (companyType === "multi_member_llc") {
          if (!members.length) {
            throw new AppError(
              "A multi-member LLC must include at least one additional member.",
              400,
              "MEMBERS_REQUIRED",
            );
          }
          data.members = members;
          const total =
            ownerPercentage + members.reduce((sum, member) => sum + Number(member.percentage), 0);
          if (total !== 100) {
            throw new AppError(
              `Ownership percentages must total 100%. Current total: ${total}%.`,
              400,
              "INVALID_OWNERSHIP_TOTAL",
            );
          }
        } else {
          data.members = [];
        }

        const optionalServices =
          data.optional_services && typeof data.optional_services === "object"
            ? (data.optional_services as Record<string, unknown>)
            : {};
        const wise =
          optionalServices.wise_account_setup === true ||
          (Array.isArray(data.addOnSlugs) && data.addOnSlugs.includes("wise-account-setup"));
        data.optional_services = { ...optionalServices, wise_account_setup: wise };
        data.addOnSlugs = wise ? ["wise-account-setup"] : [];
      }

      if (serviceSlug === "uk-ltd") {
        const packageSlug =
          typeof data.packageSlug === "string"
            ? data.packageSlug
            : typeof data.package === "string"
              ? data.package
              : "";
        data.packageSlug = packageSlug;
        delete data.package;
        if (packageSlug === "premium") {
          const provider = data.virtual_bank_provider;
          if (typeof provider !== "string" || !UK_LTD_VIRTUAL_BANK_PROVIDERS.has(provider)) {
            throw new AppError(
              "Choose a virtual bank provider before submitting the UK LTD Premium application.",
              400,
              "VIRTUAL_BANK_REQUIRED",
            );
          }
        }
      }

      if (!applicationMode || !data || typeof data !== "object" || Array.isArray(data)) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PAYLOAD",
            message: "Application payload must contain a valid service and data.",
          },
        });
        return;
      }

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const applicationId = "app_" + crypto.randomUUID();
      const uploadedPaths: string[] = [];

      const findDocumentId = (value: unknown, key: string): string => {
        if (!value || typeof value !== "object") return "";
        if (Array.isArray(value)) {
          for (const item of value) {
            const id = findDocumentId(item, key);
            if (id) return id;
          }
          return "";
        }
        const record = value as Record<string, unknown>;
        const candidate = record[key];
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
          const id = (candidate as Record<string, unknown>).id;
          if (typeof id === "string") return id;
        }
        for (const child of Object.values(record)) {
          const id = findDocumentId(child, key);
          if (id) return id;
        }
        return "";
      };

      const attachMetadata = (
        value: unknown,
        documentId: string,
        metadata: Record<string, unknown>,
      ): boolean => {
        if (!value || typeof value !== "object") return false;
        if (Array.isArray(value)) {
          for (const item of value) if (attachMetadata(item, documentId, metadata)) return true;
          return false;
        }
        const record = value as Record<string, unknown>;
        if (record.id === documentId) {
          Object.assign(record, metadata);
          return true;
        }
        for (const child of Object.values(record)) {
          if (attachMetadata(child, documentId, metadata)) return true;
        }
        return false;
      };

      try {
        for (const file of files) {
          const memberMatch = file.fieldname.match(/^member_(\d+)_(identity|address)_document$/);
          const memberDocumentKey = memberMatch
            ? memberMatch[2] === "identity"
              ? "identity_document"
              : "address_document"
            : "";

          let documentId = "";
          if (memberMatch) {
            const memberIndex = Number(memberMatch[1]);
            const membersDocuments = Array.isArray(documents.members) ? documents.members : [];
            const memberDocuments = membersDocuments[memberIndex];
            if (memberDocuments && typeof memberDocuments === "object") {
              const candidate = (memberDocuments as Record<string, unknown>)[memberDocumentKey];
              if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
                const candidateId = (candidate as Record<string, unknown>).id;
                if (typeof candidateId === "string") documentId = candidateId;
              }
            }
          } else if (file.fieldname.startsWith("application_")) {
            documentId = findDocumentId(
              documents,
              file.fieldname === "application_passport"
                ? "identity_document"
                : file.fieldname === "application_bank_statement"
                  ? "address_document"
                  : file.fieldname.slice("application_".length),
            );
          } else if (
            file.fieldname === "owner_identity_document" ||
            file.fieldname === "owner_address_document" ||
            file.fieldname === "director_identity_document" ||
            file.fieldname === "director_address_document"
          ) {
            documentId = findDocumentId(
              documents,
              file.fieldname.includes("identity") ? "identity_document" : "address_document",
            );
          }

          const id = documentId || "doc_" + crypto.randomUUID();
          const extension = file.originalname.includes(".")
            ? "." + file.originalname.split(".").pop()!.toLowerCase()
            : "";
          const storagePath = applicationId + "/" + id + extension;

          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, file.buffer, {
              contentType: file.mimetype,
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          uploadedPaths.push(storagePath);
          attachMetadata(documents, id, {
            id,
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            path: storagePath,
          });
        }

        const application = await applicationStore.create({
          userId: user.id,
          serviceSlug,
          status: applicationMode === "paid" ? "ready_for_payment" : "submitted",
          data,
          documents,
        });

        let billing = null;
        if (applicationMode === "paid") {
          billing = await createBillingOrder(user.id, application.id);
          if (!billing) {
            await applicationStore.delete(application.id);
            throw new AppError(
              "The application was valid, but its billing order could not be created. No payment was taken. Please try submitting again.",
              422,
              "BILLING_ORDER_CREATION_FAILED",
            );
          }
        }

        res.status(201).json({
          success: true,
          data: {
            application: applicationResponse(application),
            applicationId: application.id,
            documents: application.documents,
            billing,
            applicationMode,
            message:
              applicationMode === "paid"
                ? "Application submitted and ready for payment."
                : "Application submitted successfully",
          },
        });
      } catch (error) {
        if (uploadedPaths.length) {
          await supabase.storage.from(BUCKET).remove(uploadedPaths);
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  },
);

applicationsRouter.patch("/:id", async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "You are not signed in." },
      });
      return;
    }

    const current = await applicationStore.findById(req.params.id);
    if (!current || current.userId !== user.id) {
      res.status(404).json({
        success: false,
        error: { code: "APPLICATION_NOT_FOUND", message: "Application not found." },
      });
      return;
    }

    if (
      ["submitted", "ready_for_payment", "paid", "processing", "completed", "cancelled"].includes(
        current.status,
      )
    ) {
      res.status(409).json({
        success: false,
        error: { code: "APPLICATION_LOCKED", message: "This application can no longer be edited." },
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const nextStatus =
      typeof body.status === "string" ? (body.status as ApplicationStatus) : current.status;

    if (
      nextStatus !== current.status &&
      !isInternalStatusTransitionAllowed(current.status, nextStatus)
    ) {
      res.status(409).json({
        success: false,
        error: {
          code: "INVALID_APPLICATION_STATUS_TRANSITION",
          message: "The requested application status transition is not allowed.",
        },
      });
      return;
    }

    if (nextStatus === "paid") {
      res.status(409).json({
        success: false,
        error: {
          code: "BILLING_STATUS_TRANSITION_REQUIRED",
          message: "Payment must establish the paid state.",
        },
      });
      return;
    }

    const nextData =
      body.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : {
            ...current.data,
            ...(typeof body.packageSlug === "string" ? { packageSlug: body.packageSlug } : {}),
            ...(typeof body.formationState === "string"
              ? { formationState: body.formationState }
              : {}),
            ...(typeof body.currentStep === "number" ? { currentStep: body.currentStep } : {}),
            ...(body.answers && typeof body.answers === "object" ? { answers: body.answers } : {}),
          };

    const updated = await applicationStore.update(current.id, {
      data: nextData,
      status: nextStatus,
    });

    res.json({ success: true, data: { application: applicationResponse(updated!) } });
  } catch (error) {
    next(error);
  }
});

applicationsRouter.delete("/:id", async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "You are not signed in." },
      });
      return;
    }

    const application = await applicationStore.findById(req.params.id);
    if (!application || application.userId !== user.id) {
      res.status(404).json({
        success: false,
        error: { code: "APPLICATION_NOT_FOUND", message: "Application not found." },
      });
      return;
    }

    if (["paid", "processing", "completed", "cancelled"].includes(application.status)) {
      res.status(409).json({
        success: false,
        error: { code: "APPLICATION_LOCKED", message: "This application cannot be deleted." },
      });
      return;
    }

    const paths = new Set<string>();
    const collectPaths = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(collectPaths);
        return;
      }
      const record = value as Record<string, unknown>;
      if (typeof record.path === "string") paths.add(record.path);
      Object.values(record).forEach(collectPaths);
    };
    collectPaths(application.documents);
    if (paths.size) await supabase.storage.from(BUCKET).remove([...paths]);
    await applicationStore.delete(application.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
