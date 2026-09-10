import test from "node:test";
import assert from "node:assert/strict";

test("server and api entry points import without syntax or module errors", async () => {
  const appModule = await import("../app.js");
  assert.ok(appModule.app, "app.js should export app");

  const apiModule = await import("../api/index.js");
  assert.ok(typeof apiModule.default === "function", "api/index.js should default export a handler");
});
