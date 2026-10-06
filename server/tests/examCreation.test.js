import test from "node:test";
import assert from "node:assert/strict";
import { examSchema, createExam } from "../controllers/exam.controller.js";
import { Exam } from "../models/Exam.js";
import { Course } from "../models/Course.js";
import { validate } from "../middlewares/validate.js";

const body = { courseId: "507f1f77bcf86cd799439011", title: " Service exam ", durationMinutes: 30, extraTimeMinutes: 5, totalMarks: 10, passPercentage: 50, startDate: "2026-10-06T10:00:00+03:00" };

test("exam creation preserves the supplied timezone and calculates its end", () => {
  const parsed = examSchema.parse({ body }).body;
  assert.equal(parsed.title, "Service exam");
  assert.equal(parsed.startDate.toISOString(), "2026-10-06T07:00:00.000Z");
  assert.equal(parsed.endDate.toISOString(), "2026-10-06T07:35:00.000Z");
  for (const invalid of [{ title: "  " }, { courseId: "invalid" }, { durationMinutes: 0 }, { extraTimeMinutes: -1 }, { totalMarks: 0 }, { passPercentage: 101 }, { startDate: "invalid" }]) {
    assert.equal(examSchema.safeParse({ body: { ...body, ...invalid } }).success, false);
  }
});

test("validation returns actionable field errors", () => {
  const res = { status(code) { this.code = code; return this; }, json(data) { this.body = data; } };
  validate(examSchema)({ body: { ...body, title: " " } }, res, () => assert.fail("Invalid input was accepted"));
  assert.equal(res.code, 400);
  assert.ok(res.body.issues.some((issue) => issue.path === "body.title"));
});

test("customer service creation records ownership and rejects missing courses", async () => {
  const originalExists = Course.exists;
  const originalCreate = Exam.create;
  const res = { status(code) { this.code = code; return this; }, json(data) { this.body = data; } };
  let created;
  try {
    Course.exists = async () => true;
    Exam.create = async (data) => { created = data; return data; };
    const req = { body: examSchema.parse({ body }).body, user: { _id: "support-user", role: "CUSTOMER_SERVICE" } };
    await createExam(req, res, (error) => { throw error; });
    assert.equal(res.code, 201);
    assert.equal(created.createdBy, "support-user");
    Course.exists = async () => null;
    created = null;
    await createExam(req, res, (error) => { throw error; });
    assert.equal(res.code, 400);
    assert.equal(created, null);
  } finally {
    Course.exists = originalExists;
    Exam.create = originalCreate;
  }
});
