import assert from "node:assert/strict";
import test from "node:test";
import { googleSchema, loginSchema, registerSchema } from "./auth.schemas.js";

test("register accepts a valid 12-character password", () => {
  const result = registerSchema.safeParse({
    email: " user@example.com ",
    password: "correct horse1",
    firstName: "Jane",
    lastName: "Doe",
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.email, "user@example.com");
});

test("register rejects passwords shorter than 12 characters", () => {
  const result = registerSchema.safeParse({
    email: "user@example.com",
    password: "shortpass",
    firstName: "Jane",
    lastName: "Doe",
  });

  assert.equal(result.success, false);
});

test("google credential input is bounded", () => {
  const result = googleSchema.safeParse({ credential: "x".repeat(9000) });
  assert.equal(result.success, false);
});

test("login still permits existing short passwords to be verified", () => {
  const result = loginSchema.safeParse({
    email: "user@example.com",
    password: "shortpass",
  });

  assert.equal(result.success, true);
});
