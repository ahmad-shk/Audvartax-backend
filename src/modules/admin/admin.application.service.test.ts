import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminApplicationLifecycleError,
  updateApplicationStatusAsAdmin,
} from "./admin.application.service.js";

const applicationStore = await import("../applications/application.store.js");

const originalFindById = applicationStore.applicationStore.findById;
const originalUpdate = applicationStore.applicationStore.update;

test.afterEach(() => {
  applicationStore.applicationStore.findById = originalFindById;
  applicationStore.applicationStore.update = originalUpdate;
});

function application(status: "draft" | "ready_for_payment" | "submitted" | "paid") {
  return {
    id: "application-1",
    userId: "customer-1",
    serviceSlug: "uk-corporate-tax",
    status,
    updatedAt: "2026-09-17T00:00:00.000Z",
  } as never;
}

test("admin status service returns null for an unknown application", async () => {
  applicationStore.applicationStore.findById = async () => null;
  const result = await updateApplicationStatusAsAdmin(
    "missing",
    "completed",
    "2026-09-17T00:00:00.000Z",
  );
  assert.equal(result, null);
});

test("admin status service rejects stale application versions", async () => {
  applicationStore.applicationStore.findById = async () => application("submitted");

  await assert.rejects(
    updateApplicationStatusAsAdmin("application-1", "completed", "stale-version"),
    (error: unknown) =>
      error instanceof AdminApplicationLifecycleError && error.code === "APPLICATION_CONFLICT",
  );
});

test("admin status service permits submitted to completed", async () => {
  applicationStore.applicationStore.findById = async () => application("submitted");
  applicationStore.applicationStore.update = async (_id, changes) =>
    ({
      ...application("submitted"),
      ...changes,
      updatedAt: "2026-09-17T00:01:00.000Z",
    }) as never;

  const result = await updateApplicationStatusAsAdmin(
    "application-1",
    "completed",
    "2026-09-17T00:00:00.000Z",
  );
  assert.equal(result?.status, "completed");
});

test("admin status service permits paid to completed", async () => {
  applicationStore.applicationStore.findById = async () => application("paid");
  applicationStore.applicationStore.update = async (_id, changes) =>
    ({
      ...application("paid"),
      ...changes,
    }) as never;

  const result = await updateApplicationStatusAsAdmin(
    "application-1",
    "completed",
    "2026-09-17T00:00:00.000Z",
  );
  assert.equal(result?.status, "completed");
});

test("admin status service keeps paid transition owned by billing", async () => {
  applicationStore.applicationStore.findById = async () => application("ready_for_payment");

  await assert.rejects(
    updateApplicationStatusAsAdmin("application-1", "paid", "2026-09-17T00:00:00.000Z"),
    (error: unknown) =>
      error instanceof AdminApplicationLifecycleError &&
      error.code === "BILLING_STATUS_TRANSITION_REQUIRED",
  );
});

test("admin status service rejects customer-only transitions", async () => {
  applicationStore.applicationStore.findById = async () => application("submitted");

  await assert.rejects(
    updateApplicationStatusAsAdmin(
      "application-1",
      "changes_requested",
      "2026-09-17T00:00:00.000Z",
    ),
    (error: unknown) =>
      error instanceof AdminApplicationLifecycleError &&
      error.code === "INVALID_APPLICATION_STATUS_TRANSITION",
  );
});
