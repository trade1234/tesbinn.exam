import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { ActivityLog } from "../models/ActivityLog.js";
import { auditStaffActions, logActivity } from "../utils/logger.js";

function fakeRequest(role, method = "POST", extra = {}) {
  return {
    user: { _id: "507f1f77bcf86cd799439011", role },
    method,
    baseUrl: "/api/exams",
    route: { path: "/" },
    path: "/",
    params: {},
    body: { title: "Coffee Final", password: "secret1" },
    headers: { "user-agent": "test-agent" },
    ip: "127.0.0.1",
    ...extra
  };
}

async function captureLogs(run) {
  const created = [];
  const original = ActivityLog.create;
  ActivityLog.create = async (doc) => { created.push(doc); return doc; };
  try {
    await run();
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    ActivityLog.create = original;
  }
  return created;
}

function finish(res, statusCode) {
  res.statusCode = statusCode;
  res.emit("finish");
}

test("customer service changes are logged automatically with role and summary", async () => {
  const logs = await captureLogs(() => {
    const res = new EventEmitter();
    auditStaffActions(fakeRequest("CUSTOMER_SERVICE"), res);
    finish(res, 201);
  });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].action, "CREATE_EXAM");
  assert.equal(logs[0].role, "CUSTOMER_SERVICE");
  assert.match(logs[0].details, /Exam: Coffee Final/);
  assert.doesNotMatch(logs[0].details, /secret1/);
});

test("failed requests, reads and student requests are not audited", async () => {
  const logs = await captureLogs(() => {
    const failed = new EventEmitter();
    auditStaffActions(fakeRequest("ADMIN"), failed);
    finish(failed, 400);

    const read = new EventEmitter();
    auditStaffActions(fakeRequest("ADMIN", "GET"), read);
    finish(read, 200);

    const student = new EventEmitter();
    auditStaffActions(fakeRequest("STUDENT"), student);
    finish(student, 200);
  });
  assert.equal(logs.length, 0);
});

test("requests a controller already logged are not logged twice", async () => {
  const logs = await captureLogs(async () => {
    const req = fakeRequest("ADMIN");
    const res = new EventEmitter();
    auditStaffActions(req, res);
    await logActivity(req, "GRANT_RETAKE", "Granted retake");
    finish(res, 200);
  });
  assert.deepEqual(logs.map((log) => log.action), ["GRANT_RETAKE"]);
});
