export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "ready_for_payment",
  "paid",
  "processing",
  "completed",
  "cancelled",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type Application = {
  id: string;
  userId: string;
  serviceSlug: string;
  status: ApplicationStatus;
  data: Record<string, unknown>;
  documents: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
