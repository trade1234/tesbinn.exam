import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { cookieToken, setAuthCookie, authCookieName, requireBrowserRequest } from "../utils/authCookies.js";
import { sharedRateLimit, RateBucket } from "../middlewares/sharedRateLimit.js";
import { User } from "../models/User.js";
import { LoginSession } from "../models/LoginSession.js";
import { protect } from "../middlewares/auth.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { login } from "../controllers/auth.controller.js";

function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; }, set(name, value) { this[name] = value; }, on() {} }; }

test("authentication uses HttpOnly cookies and ignores bearer credentials", () => {
  let cookie;
  const expires = new Date(Date.now() + 60000);
  setAuthCookie({ cookie(name, value, options) { cookie = { name, value, options }; } }, "credential", expires);
  assert.equal(cookie.name, authCookieName);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.path, "/");
  assert.equal(cookie.options.expires, expires);
  assert.equal(cookieToken({ headers: { cookie: `${authCookieName}=credential` } }), "credential");
  assert.equal(cookieToken({ headers: { authorization: "Bearer credential" } }), null);
});

test("cookie mutations require the custom CSRF request header", () => {
  let passed = false;
  const denied = response();
  requireBrowserRequest({ method: "POST", headers: {} }, denied, () => { passed = true; });
  assert.equal(denied.code, 403);
  assert.equal(passed, false);
  requireBrowserRequest({ method: "POST", headers: { "x-exam-request": "1" } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test("independent limiter instances share atomic database counters and fail closed", async () => {
  const original = RateBucket.findOneAndUpdate;
  const counts = new Map();
  try {
    RateBucket.findOneAndUpdate = async (filter, update, options) => {
      assert.equal(update.$inc.count, 1);
      assert.equal(options.new, true);
      counts.set(filter._id, (counts.get(filter._id) || 0) + 1);
      return { count: counts.get(filter._id) };
    };
    const first = sharedRateLimit("test", 2), second = sharedRateLimit("test", 2);
    let passed = 0;
    await first({ ip: "192.0.2.1" }, response(), () => { passed++; });
    await second({ ip: "192.0.2.1" }, response(), () => { passed++; });
    const denied = response();
    await first({ ip: "192.0.2.1" }, denied, () => assert.fail("Limit bypassed"));
    assert.equal(passed, 2);
    assert.equal(denied.code, 429);
    assert.ok(Number(denied["Retry-After"]) > 0);
    assert.equal(counts.size, 1);
    RateBucket.findOneAndUpdate = async () => { throw new Error("Database unavailable"); };
    const unavailable = response();
    await second({ ip: "192.0.2.1" }, unavailable, () => assert.fail("Protection failed open"));
    assert.equal(unavailable.code, 503);
  } finally { RateBucket.findOneAndUpdate = original; }
});

test("password-only login for a previously enrolled account issues only an HttpOnly cookie and sanitized user", async () => {
  const originals = [User.findOne, User.findOneAndUpdate, LoginSession.create, ActivityLog.create];
  const secret = Buffer.from("12345678901234567890");
  const user = { _id: "user", role: "ADMIN", isActive: true, mfaEnabled: true, mfaSecret: "legacy-encrypted-secret", password: "private", async comparePassword() { return true; }, async save() {}, toObject() { return { ...this, mfaRecoveryHashes: ["private-hash"] }; } };
  try {
    User.findOne = () => ({ select: async () => user });
    User.findOneAndUpdate = async () => user;
    let session;
    LoginSession.create = async (entry) => { session = entry; };
    ActivityLog.create = async () => {};
    const res = response();
    res.cookie = (name, token, options) => { res.authCookie = { name, token, options }; };
    await login({ body: { identifier: "admin@example.com", password: "password" }, headers: {}, ip: "192.0.2.1" }, res, (err) => { throw err; });
    assert.equal(res.code, 200);
    assert.equal(res.body.token, undefined);
    assert.equal(res.body.user.password, undefined);
    assert.equal(res.body.user.mfaSecret, undefined);
    assert.equal(res.body.user.mfaRecoveryHashes, undefined);
    assert.equal(res.authCookie.options.httpOnly, true);
    assert.equal(session.mfaVerified, undefined);
  } finally { [User.findOne, User.findOneAndUpdate, LoginSession.create, ActivityLog.create] = originals; }
});

