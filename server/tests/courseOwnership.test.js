import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canManageCourse } from "../utils/examOwnership.js";
import { Course } from "../models/Course.js";

const admin = { _id: "a1", role: "ADMIN" };
const agent = { _id: "c1", role: "CUSTOMER_SERVICE" };
const otherAgent = { _id: "c2", role: "CUSTOMER_SERVICE" };

test("course model records its creator", () => {
  assert.ok(Course.schema.path("createdBy"));
});

test("admin can edit any course, including ones created before ownership existed", () => {
  assert.equal(canManageCourse(admin, { createdBy: "c1" }), true);
  assert.equal(canManageCourse(admin, {}), true);
});

test("customer service can edit only courses they created", () => {
  assert.equal(canManageCourse(agent, { createdBy: "c1" }), true);
  assert.equal(canManageCourse(agent, { createdBy: { _id: "c1" } }), true);
  assert.equal(canManageCourse(otherAgent, { createdBy: "c1" }), false);
  assert.equal(canManageCourse(agent, { createdBy: "a1" }), false);
  assert.equal(canManageCourse(agent, {}), false);
});

test("customer service may create and edit courses but not delete them", () => {
  const routes = readFileSync(new URL("../routes/course.routes.js", import.meta.url), "utf8");
  assert.match(routes, /router\.post\("\/", protect, authorize\("ADMIN", "CUSTOMER_SERVICE"\)/);
  assert.match(routes, /router\.put\("\/:id", protect, authorize\("ADMIN", "CUSTOMER_SERVICE"\)/);
  assert.match(routes, /router\.delete\("\/:id", protect, authorize\("ADMIN"\), deleteCourse\)/);
});
