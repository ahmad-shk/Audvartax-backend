import type { ApplicationStatus } from "./application.types.js";

export function isInternalStatusTransitionAllowed(
  currentStatus: ApplicationStatus,
  nextStatus: ApplicationStatus,
) {
  const allowed = {
    draft: new Set<ApplicationStatus>(["submitted"]),
    submitted: new Set<ApplicationStatus>([
      "ready_for_payment",
      "processing",
      "completed",
      "cancelled",
    ]),
    ready_for_payment: new Set<ApplicationStatus>(["submitted", "cancelled"]),
    paid: new Set<ApplicationStatus>(["processing", "completed", "cancelled"]),
    processing: new Set<ApplicationStatus>(["completed", "cancelled"]),
    completed: new Set<ApplicationStatus>(),
    cancelled: new Set<ApplicationStatus>(),
  } satisfies Record<ApplicationStatus, ReadonlySet<ApplicationStatus>>;

  return allowed[currentStatus].has(nextStatus);
}
