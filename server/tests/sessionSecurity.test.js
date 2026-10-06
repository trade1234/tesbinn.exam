import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { protect } from "../middlewares/auth.js";
import { User } from "../models/User.js";
import { LoginSession } from "../models/LoginSession.js";
import { logout, revokeSession } from "../controllers/session.controller.js";
import { forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import authRoutes from "../routes/auth.routes.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { authCookieName } from "../utils/authCookies.js";

function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; }, clearCookie() {}, on() {} }; }
function request(sessionId = "valid-session") {
  return { headers: { cookie: `${authCookieName}=${jwt.sign({ id: "user", sessionId }, env.jwtSecret, { expiresIn: "1h" })}` }, method: "GET" };
}

test("protected access requires a live server session for every role", async () => {
  const originalUser = User.findById;
  const originalSession = LoginSession.findOne;
  const session = { _id: "session", createdAt: new Date(), lastActive: new Date() };
  try {
    for (const role of ["ADMIN", "CUSTOMER_SERVICE", "STUDENT"]) {
      User.findById = () => ({ select: async () => ({ _id: "user", role, isActive: true, currentSessionId: "valid-session", lastActive: new Date() }) });
      LoginSession.findOne = async (query) => {
        assert.equal(query.revokedAt, null);
        assert.ok(query.expiresAt.$gt instanceof Date);
        assert.equal(query.userId, "user");
        return session;
      };
      let passed = false;
      await protect(request(), response(), () => { passed = true; });
      assert.equal(passed, true, role);
      LoginSession.findOne = async () => null;
      const denied = response();
      await protect(request(), denied, () => assert.fail("Revoked session was accepted"));
      assert.equal(denied.code, 401);
    }
    const legacy = response();
    await protect(request(""), legacy, () => assert.fail("Legacy token accepted"));
    assert.equal(legacy.code, 401);
  } finally { User.findById = originalUser; LoginSession.findOne = originalSession; }
});

test("password changes and inactive accounts invalidate session access", async () => {
  const originalUser = User.findById;
  const originalSession = LoginSession.findOne;
  try {
    LoginSession.findOne = async () => ({ createdAt: new Date("2026-01-01"), lastActive: new Date() });
    for (const user of [{ isActive: false }, { isActive: true, passwordChangedAt: new Date("2026-01-02") }]) {
      User.findById = () => ({ select: async () => ({ _id: "user", role: "ADMIN", ...user }) });
      const res = response();
      await protect(request(), res, () => assert.fail("Access should be denied"));
      assert.equal(res.code, 401);
    }
  } finally { User.findById = originalUser; LoginSession.findOne = originalSession; }
});

test("only admins can inspect and revoke other device sessions", () => {
  for (const path of ["/sessions", "/sessions/:id"]) {
    const route = authRoutes.stack.find((layer) => layer.route?.path === path).route;
    for (const role of ["ADMIN", "CUSTOMER_SERVICE", "STUDENT"]) {
      let passed = false;
      const res = response();
      route.stack[1].handle({ user: { role } }, res, () => { passed = true; });
      assert.equal(passed, role === "ADMIN");
    }
  }
});

test("logout revokes the current session on the server", async () => {
  const originalUpdate = LoginSession.updateOne;
  const originalLog = ActivityLog.create;
  try {
    let updated;
    LoginSession.updateOne = async (filter, values) => { updated = { filter, values }; };
    ActivityLog.create = async () => {};
    await logout({ loginSession: { _id: "current" }, user: { _id: "user" }, headers: {} }, response(), (err) => { throw err; });
    assert.equal(updated.filter._id, "current");
    assert.ok(updated.values.revokedAt instanceof Date);
  } finally { LoginSession.updateOne = originalUpdate; ActivityLog.create = originalLog; }
});

test("password recovery never returns public reset credentials", async () => {
  for (const controller of [forgotPassword, resetPassword]) {
    const res = response();
    await controller({ body: { email: "admin@example.com" } }, res);
    assert.equal(res.code, 503);
    assert.equal(res.body.resetToken, undefined);
  }
});

test("admin remote sign-out revokes the selected session and logs the action", async () => {
  const originalUpdate = LoginSession.findOneAndUpdate;
  const originalLog = ActivityLog.create;
  try {
    let update;
    let log;
    LoginSession.findOneAndUpdate = (filter, values) => {
      update = { filter, values };
      return { populate: async () => ({ _id: "target-session", userId: { name: "Student", email: "student@example.com" } }) };
    };
    ActivityLog.create = async (entry) => { log = entry; };
    const res = response();
    await revokeSession({ params: { id: "target-session" }, loginSession: { _id: "admin-session" }, user: { _id: "admin", role: "ADMIN" }, headers: {} }, res, (error) => { throw error; });
    assert.equal(update.filter._id, "target-session");
    assert.equal(update.filter.revokedAt, null);
    assert.ok(update.values.revokedAt instanceof Date);
    assert.equal(log.action, "REVOKE_SESSION");
    assert.equal(res.body.isCurrent, false);
  } finally { LoginSession.findOneAndUpdate = originalUpdate; ActivityLog.create = originalLog; }
});
