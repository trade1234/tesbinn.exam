import test from "node:test";
import assert from "node:assert/strict";
import { activityAction, activityDetails } from "../../client/src/utils/activityLog.js";

test("historical schedule logs show readable actions and East Africa dates", () => {
  const row = { action: "STAFF_ACTION", details: "PATCH /api/exams/:id/schedule (id 6ac35b085f6729ee7a06825e, startDate: Tue Oct 06 2026 08:56:57 GMT+0000 (Coordinated Universal Time))" };
  assert.equal(activityAction(row), "SCHEDULE_EXAM");
  const details = activityDetails(row);
  assert.match(details, /Schedule exam/);
  assert.match(details, /EAT/);
  assert.doesNotMatch(details, /\/api\/|6ac35b|GMT|Coordinated/);
});

test("new schedule descriptions keep the exam title and format ISO dates", () => {
  const details = activityDetails({ details: 'Updated schedule for "Coffee Final". Starts: 2026-10-06T08:56:57.000Z' });
  assert.match(details, /Coffee Final/);
  assert.match(details, /EAT/);
  assert.doesNotMatch(details, /T08:56/);
});
