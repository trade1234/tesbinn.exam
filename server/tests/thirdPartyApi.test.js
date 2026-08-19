import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../config/env.js";

// Test authentication logic mock
function validateThirdPartyAccess({ apiKeyHeader, apiKeyQuery, bearerToken, expectedApiKey }) {
  if (apiKeyHeader === expectedApiKey || apiKeyQuery === expectedApiKey || bearerToken === expectedApiKey) {
    return { authorized: true, authMethod: "API_KEY" };
  }
  return { authorized: false, authMethod: null };
}

// Test period grouping logic helper
function categorizeByPeriod(dates, now = new Date("2026-08-19T10:00:00.000Z")) {
  const weeklyThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthlyThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearlyThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const result = { weekly: 0, monthly: 0, yearly: 0, allTime: dates.length };

  dates.forEach((d) => {
    const dt = new Date(d);
    if (dt >= weeklyThreshold) result.weekly += 1;
    if (dt >= monthlyThreshold) result.monthly += 1;
    if (dt >= yearlyThreshold) result.yearly += 1;
  });

  return result;
}

test("Third Party API key authentication passes with valid key", () => {
  const expectedApiKey = env.thirdPartyApiKey;

  // Header test
  const resHeader = validateThirdPartyAccess({ apiKeyHeader: expectedApiKey, expectedApiKey });
  assert.equal(resHeader.authorized, true);
  assert.equal(resHeader.authMethod, "API_KEY");

  // Query param test
  const resQuery = validateThirdPartyAccess({ apiKeyQuery: expectedApiKey, expectedApiKey });
  assert.equal(resQuery.authorized, true);

  // Bearer token test
  const resBearer = validateThirdPartyAccess({ bearerToken: expectedApiKey, expectedApiKey });
  assert.equal(resBearer.authorized, true);

  // Invalid key test
  const resInvalid = validateThirdPartyAccess({ apiKeyHeader: "wrong-key", expectedApiKey });
  assert.equal(resInvalid.authorized, false);
});

test("Period categorizer correctly computes weekly, monthly, and yearly counts", () => {
  const mockNow = new Date("2026-08-19T10:00:00.000Z");
  const testDates = [
    "2026-08-18T12:00:00.000Z", // 1 day ago (Weekly, Monthly, Yearly)
    "2026-08-14T10:00:00.000Z", // 5 days ago (Weekly, Monthly, Yearly)
    "2026-08-01T10:00:00.000Z", // 18 days ago (Monthly, Yearly)
    "2026-03-01T10:00:00.000Z", // ~5.5 months ago (Yearly)
    "2024-01-01T10:00:00.000Z"  // 2.5 years ago (AllTime only)
  ];

  const breakdown = categorizeByPeriod(testDates, mockNow);

  assert.equal(breakdown.weekly, 2);
  assert.equal(breakdown.monthly, 3);
  assert.equal(breakdown.yearly, 4);
  assert.equal(breakdown.allTime, 5);
});
