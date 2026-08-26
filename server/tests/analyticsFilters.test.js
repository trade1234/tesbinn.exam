import assert from "node:assert/strict";
import test from "node:test";
import { analyticsPeriod } from "../controllers/result.controller.js";

const now = new Date("2026-08-26T12:00:00.000Z");

test("all-time analytics has no date restriction", () => {
  assert.deepEqual(analyticsPeriod("all", now), { period: "all", label: "All time", query: {} });
});

test("daily analytics starts at midnight East Africa Time", () => {
  const result = analyticsPeriod("daily", now);
  assert.equal(result.query.$gte.toISOString(), "2026-08-25T21:00:00.000Z");
  assert.equal(result.query.$lt.toISOString(), "2026-08-26T21:00:00.000Z");
});

test("weekly analytics starts on Monday in East Africa Time", () => {
  const result = analyticsPeriod("weekly", now);
  assert.equal(result.query.$gte.toISOString(), "2026-08-23T21:00:00.000Z");
});

test("monthly analytics starts on the first day of the current month", () => {
  const result = analyticsPeriod("monthly", now);
  assert.equal(result.label, "August 2026");
  assert.equal(result.query.$gte.toISOString(), "2026-07-31T21:00:00.000Z");
});

test("yearly analytics starts on January 1 in East Africa Time", () => {
  const result = analyticsPeriod("yearly", now);
  assert.equal(result.label, "2026");
  assert.equal(result.query.$gte.toISOString(), "2025-12-31T21:00:00.000Z");
});

test("unknown analytics periods safely use all time", () => {
  assert.equal(analyticsPeriod("invalid", now).period, "all");
});

test("analytics filters can select a historical day, month, and year", () => {
  assert.equal(analyticsPeriod("daily", now, "2025-06-15").query.$gte.toISOString(), "2025-06-14T21:00:00.000Z");
  assert.equal(analyticsPeriod("monthly", now, "2025-06-01").label, "June 2025");
  assert.equal(analyticsPeriod("monthly", now, "2025-06-01").query.$lt.toISOString(), "2025-06-30T21:00:00.000Z");
  assert.equal(analyticsPeriod("yearly", now, "2024-01-01").label, "2024");
});
