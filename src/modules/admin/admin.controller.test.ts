import assert from "node:assert/strict";
import test from "node:test";
import { updateAdminApplicationStatusController } from "./admin.controller.js";

function response() {
  let statusCode = 200;
  let payload: unknown;
  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      payload = value;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
  } as never;
}

function request(id: string | undefined, body: { status?: string; expectedUpdatedAt?: string }) {
  return {
    params: { id },
    body,
  } as never;
}

test("admin controller rejects a missing application id", async () => {
  const res = response();

  await updateAdminApplicationStatusController(request(undefined, {}), res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    success: false,
    error: { code: "INVALID_APPLICATION_ID", message: "Application ID is required." },
  });
});

test("admin controller rejects an invalid status", async () => {
  const res = response();

  await updateAdminApplicationStatusController(
    request("application-1", { status: "in_review", expectedUpdatedAt: "version" }),
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    success: false,
    error: { code: "INVALID_STATUS", message: "A valid application status is required." },
  });
});

test("admin controller requires the application version", async () => {
  const res = response();

  await updateAdminApplicationStatusController(
    request("application-1", { status: "completed" }),
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    success: false,
    error: {
      code: "MISSING_APPLICATION_VERSION",
      message: "expectedUpdatedAt is required when updating an application status.",
    },
  });
});

test("admin controller rejects an empty application version", async () => {
  const res = response();

  await updateAdminApplicationStatusController(
    request("application-1", { status: "completed", expectedUpdatedAt: "" }),
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    success: false,
    error: {
      code: "MISSING_APPLICATION_VERSION",
      message: "expectedUpdatedAt is required when updating an application status.",
    },
  });
});
