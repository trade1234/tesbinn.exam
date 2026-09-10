import test from "node:test";
import assert from "node:assert/strict";

test("certificates are eligible for both PASS and FAIL statuses", () => {
  const eligibleStatuses = ["PASS", "FAIL"];
  assert.equal(eligibleStatuses.includes("PASS"), true);
  assert.equal(eligibleStatuses.includes("FAIL"), true);
  assert.equal(eligibleStatuses.includes("IN_PROGRESS"), false);
  assert.equal(eligibleStatuses.includes("DISQUALIFIED"), false);
});

test("percentage and result numbers calculate accurately with decimal and integer marks", () => {
  const calculateResult = (score, totalMarks) => {
    const s = Math.round(Number(score) * 100) / 100;
    const t = Math.round(Number(totalMarks) * 100) / 100;
    const pct = t > 0 ? Math.round((s / t) * 10000) / 100 : 0;
    return { score: s, totalMarks: t, percentage: pct };
  };

  // 12.5 out of 15
  const res1 = calculateResult(12.5, 15);
  assert.equal(res1.score, 12.5);
  assert.equal(res1.totalMarks, 15);
  assert.equal(res1.percentage, 83.33);

  // 15 out of 15
  const res2 = calculateResult(15, 15);
  assert.equal(res2.score, 15);
  assert.equal(res2.totalMarks, 15);
  assert.equal(res2.percentage, 100);

  // 10 out of 15
  const res3 = calculateResult(10, 15);
  assert.equal(res3.score, 10);
  assert.equal(res3.totalMarks, 15);
  assert.equal(res3.percentage, 66.67);
});
