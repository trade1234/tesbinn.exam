import test from "node:test";
import assert from "node:assert/strict";
import { createAccountSchema } from "../controllers/account.controller.js";
import { registerSchema } from "../controllers/auth.controller.js";
import { User } from "../models/User.js";

const account = { name: "Support Agent", email: "agent@example.com", password: "abc123" };

test("user model accepts the customer service role", () => {
  assert.ok(User.schema.path("role").enumValues.includes("CUSTOMER_SERVICE"));
});

test("account management can create admin and customer service accounts only", () => {
  assert.equal(createAccountSchema.safeParse({ body: { ...account, role: "ADMIN" } }).success, true);
  assert.equal(createAccountSchema.safeParse({ body: { ...account, role: "CUSTOMER_SERVICE" } }).success, true);
  assert.equal(createAccountSchema.safeParse({ body: { ...account, role: "STUDENT" } }).success, false);
});

test("staff passwords need letters and numbers", () => {
  assert.equal(createAccountSchema.safeParse({ body: { ...account, password: "abcdef", role: "ADMIN" } }).success, false);
});

test("public registration cannot request a staff role", () => {
  const parsed = registerSchema.safeParse({ body: { name: "Mallory", email: "m@example.com", password: "abc12", role: "ADMIN" } });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.body.role, undefined);
});
