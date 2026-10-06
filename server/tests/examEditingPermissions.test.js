import test from "node:test";
import assert from "node:assert/strict";
import { Exam } from "../models/Exam.js";
import { updateExam, scheduleExam, scheduleExamSchema } from "../controllers/exam.controller.js";
import { Question } from "../models/Question.js";
import { updateQuestion } from "../controllers/question.controller.js";

function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } }; }

test("exam editing enforces ownership and scheduling preserves exam content", async () => {
  const original = Exam.findById;
  let saved = false;
  const exam = { createdBy: "owner", title: "Original", durationMinutes: 60, extraTimeMinutes: 0, set(values) { Object.assign(this, values); }, async save() { saved = true; } };
  Exam.findById = async () => exam;
  try {
    const req = { user: { _id: "other", role: "CUSTOMER_SERVICE" }, params: { id: "exam" }, body: { title: "Changed" } };
    let res = response();
    await updateExam(req, res, (err) => { throw err; });
    assert.equal(res.code, 403);
    assert.equal(saved, false);
    assert.equal(exam.title, "Original");
    req.user._id = "owner";
    await updateExam(req, response(), (err) => { throw err; });
    assert.equal(exam.title, "Changed");
    req.user._id = "other";
    req.body = { startDate: new Date("2026-10-06T08:00:00Z"), extraTimeMinutes: 15 };
    await scheduleExam(req, response(), (err) => { throw err; });
    assert.equal(exam.title, "Changed");
    assert.equal(exam.durationMinutes, 60);
    assert.equal(exam.endDate.toISOString(), "2026-10-06T09:15:00.000Z");
    assert.equal(scheduleExamSchema.safeParse({ body: { ...req.body, title: "Attack" } }).success, false);
    assert.equal(scheduleExamSchema.safeParse({ body: { ...req.body, extraTimeMinutes: -1 } }).success, false);
  } finally { Exam.findById = original; }
});

test("question editing checks both current and destination exam ownership", async () => {
  const originalQuestion = Question.findById;
  const originalExams = Exam.find;
  let saved = false;
  Question.findById = async () => ({ examId: "own", set() {}, async save() { saved = true; } });
  Exam.find = (query) => ({ select: async () => query._id.$in.map((id) => ({ createdBy: id === "own" ? "owner" : "other" })) });
  try {
    const req = { user: { _id: "owner", role: "CUSTOMER_SERVICE" }, params: { id: "question" }, body: { examId: "other" } };
    const res = response();
    await updateQuestion(req, res, (err) => { throw err; });
    assert.equal(res.code, 403);
    assert.equal(saved, false);
    req.body.examId = "own";
    await updateQuestion(req, response(), (err) => { throw err; });
    assert.equal(saved, true);
  } finally { Question.findById = originalQuestion; Exam.find = originalExams; }
});
