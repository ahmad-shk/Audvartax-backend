import { applicationStore } from "../applications/application.store.js";
import { isInternalStatusTransitionAllowed } from "../applications/application.internal-lifecycle.js";
import type { ApplicationStatus } from "../applications/application.types.js";

export class AdminApplicationLifecycleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdminApplicationLifecycleError";
  }
}

export async function updateApplicationStatusAsAdmin(
  applicationId: string,
  nextStatus: ApplicationStatus,
  expectedUpdatedAt: string,
) {
  const current = await applicationStore.findById(applicationId);
  if (!current) return null;

  if (current.updatedAt !== expectedUpdatedAt) {
    throw new AdminApplicationLifecycleError(
      "APPLICATION_CONFLICT",
      "This application was changed elsewhere. Refresh the application before updating its status.",
    );
  }

  if (current.status === nextStatus) {
    throw new AdminApplicationLifecycleError(
      "INVALID_APPLICATION_STATUS_TRANSITION",
      "The application is already in the requested status.",
    );
  }

  if (current.status === "ready_for_payment" && nextStatus === "paid") {
    throw new AdminApplicationLifecycleError(
      "BILLING_STATUS_TRANSITION_REQUIRED",
      "The paid status must be established by the billing payment flow.",
    );
  }

  if (!isInternalStatusTransitionAllowed(current.status, nextStatus)) {
    throw new AdminApplicationLifecycleError(
      "INVALID_APPLICATION_STATUS_TRANSITION",
      `Cannot transition application from ${current.status} to ${nextStatus}.`,
    );
  }

  return applicationStore.update(applicationId, { status: nextStatus });
}
