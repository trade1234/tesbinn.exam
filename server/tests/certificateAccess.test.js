import test from "node:test";
import assert from "node:assert/strict";
import { certificateAccess } from "../controllers/certificate.controller.js";

test("certificates default to visible and active", () => {
  const access = certificateAccess({}, {});
  assert.equal(access.visible, true);
  assert.equal(access.active, true);
});

test("a hidden or deactivated course overrides the certificate's own flags", () => {
  const access = certificateAccess(
    { isVisible: true, isActive: true },
    { certificatesVisible: false, certificatesActive: false, certificateDeactivationReason: "Course withdrawn" }
  );
  assert.equal(access.visible, false);
  assert.equal(access.active, false);
  assert.equal(access.reason, "Course withdrawn");
});

test("a deactivated certificate fails verification even when its course is active", () => {
  const access = certificateAccess({ isActive: false, deactivationReason: "Revoked" }, { certificatesActive: true });
  assert.equal(access.active, false);
  assert.equal(access.visible, true);
  assert.equal(access.reason, "Revoked");
});
