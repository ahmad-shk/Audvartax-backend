import assert from "node:assert/strict";
import test from "node:test";
import { requireAdmin } from "./admin.middleware.js";

function response() {
  let statusCode = 200;
  let payload: unknown;
  return {
    locals: { user: undefined as { role: "customer" | "admin" } | undefined },
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

test("requireAdmin rejects unauthenticated requests", () => {
  const res = response();
  let nextCalled = false;

  requireAdmin({} as never, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
  assert.deepEqual(res.payload, {
    success: false,
    error: { code: "FORBIDDEN", message: "Administrator access is required." },
  });
});

test("requireAdmin rejects customer sessions", () => {
  const res = response();
  res.locals.user = { role: "customer" };
  let nextCalled = false;

  requireAdmin({} as never, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("requireAdmin permits admin sessions", () => {
  const res = response();
  res.locals.user = { role: "admin" };
  let nextCalled = false;

  requireAdmin({} as never, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
});
