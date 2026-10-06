import test from "node:test";
import assert from "node:assert/strict";
import users from "../routes/user.routes.js";
import exams from "../routes/exam.routes.js";
import questions from "../routes/question.routes.js";
import results from "../routes/result.routes.js";

function allowed(router, method, path, role) {
  const route = router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route;
  let passed = false;
  let status;
  route.stack[1].handle({ user: { role } }, { status(code) { status = code; return this; }, json() {} }, () => { passed = true; });
  assert.ok(passed || status === 403);
  return passed;
}

test("customer service can create, list and edit students", () => {
  assert.equal(allowed(users, "post", "/students", "CUSTOMER_SERVICE"), true);
  assert.equal(allowed(users, "post", "/students", "ADMIN"), true);
  assert.equal(allowed(users, "post", "/students", "STUDENT"), false);
  assert.equal(allowed(users, "get", "/students", "CUSTOMER_SERVICE"), true);
  assert.equal(allowed(users, "put", "/students/:id", "CUSTOMER_SERVICE"), true);
  for (const [method, path] of [["delete", "/students/:id"], ["patch", "/students/:id/active"], ["get", "/students/export/pdf"], ["get", "/students/export/excel"], ["get", "/accounts"], ["get", "/online"]]) {
    assert.equal(allowed(users, method, path, "CUSTOMER_SERVICE"), false, path);
    assert.equal(allowed(users, method, path, "ADMIN"), true, path);
  }
});

test("customer service cannot delete exams or questions, approve retakes or monitor", () => {
  for (const [router, method, path] of [[exams, "delete", "/:id"], [exams, "post", "/attempts/:attemptId/retake"], [questions, "delete", "/:id"], [results, "get", "/live"], [results, "get", "/disqualified"]]) {
    assert.equal(allowed(router, method, path, "CUSTOMER_SERVICE"), false, path);
    assert.equal(allowed(router, method, path, "ADMIN"), true, path);
  }
  assert.equal(allowed(users, "put", "/students/:id", "STUDENT"), false);
});

test("customer service can create and edit exams and schedule all exams", () => {
  for (const [router, method, path] of [[exams, "get", "/"], [exams, "post", "/"], [exams, "put", "/:id"], [exams, "patch", "/:id/schedule"], [questions, "get", "/"], [questions, "post", "/"], [questions, "post", "/bulk"], [questions, "put", "/:id"]]) {
    assert.equal(allowed(router, method, path, "CUSTOMER_SERVICE"), true, path);
  }
  assert.equal(allowed(exams, "patch", "/:id/schedule", "STUDENT"), false);
});
