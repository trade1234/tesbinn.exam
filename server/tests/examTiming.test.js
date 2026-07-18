import test from "node:test";
import assert from "node:assert/strict";
import { scheduledExamEnd, scheduledRemainingSeconds } from "../utils/examTiming.js";

test("approved retake receives only the shared scheduled remaining time", () => {
  const now = new Date("2026-07-18T08:30:00.000Z");
  const exam = { startDate: "2026-07-18T08:00:00.000Z", endDate: "2026-07-18T09:00:00.000Z" };
  const approvedRetake = { status: "RETAKE_GRANTED", retakeExpiresAt: "2026-07-18T10:30:00.000Z" };

  assert.equal(approvedRetake.status, "RETAKE_GRANTED");
  assert.equal(scheduledExamEnd(exam).toISOString(), exam.endDate);
  assert.equal(scheduledRemainingSeconds(exam, now), 30 * 60);
});

test("late or retake user receives zero time after the shared end", () => {
  const exam = { startDate: "2026-07-18T08:00:00.000Z", endDate: "2026-07-18T09:00:00.000Z" };
  assert.equal(scheduledRemainingSeconds(exam, new Date("2026-07-18T09:00:01.000Z")), 0);
});
