import test from "node:test";
import assert from "node:assert/strict";
import { canManageExam } from "../utils/examOwnership.js";
import { Exam } from "../models/Exam.js";

const admin = { _id: "a1", role: "ADMIN" };
const agent = { _id: "c1", role: "CUSTOMER_SERVICE" };
const otherAgent = { _id: "c2", role: "CUSTOMER_SERVICE" };

test("exam model records its creator", () => {
  assert.ok(Exam.schema.path("createdBy"));
});

test("admin can manage any exam", () => {
  assert.equal(canManageExam(admin, { createdBy: "c1" }), true);
  assert.equal(canManageExam(admin, {}), true);
});

test("customer service can manage only exams they created", () => {
  assert.equal(canManageExam(agent, { createdBy: "c1" }), true);
  assert.equal(canManageExam(agent, { createdBy: { _id: "c1" } }), true);
  assert.equal(canManageExam(otherAgent, { createdBy: "c1" }), false);
  assert.equal(canManageExam(agent, { createdBy: "a1" }), false);
  assert.equal(canManageExam(agent, {}), false);
});

test("students cannot manage exams", () => {
  assert.equal(canManageExam({ _id: "c1", role: "STUDENT" }, { createdBy: "c1" }), false);
});
