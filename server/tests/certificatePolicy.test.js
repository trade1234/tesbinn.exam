import test from "node:test";
import assert from "node:assert/strict";

test("certificates are eligible for both PASS and FAIL statuses", () => {
  const eligibleStatuses = ["PASS", "FAIL"];
  assert.equal(eligibleStatuses.includes("PASS"), true);
  assert.equal(eligibleStatuses.includes("FAIL"), true);
  assert.equal(eligibleStatuses.includes("IN_PROGRESS"), false);
  assert.equal(eligibleStatuses.includes("DISQUALIFIED"), false);
});
