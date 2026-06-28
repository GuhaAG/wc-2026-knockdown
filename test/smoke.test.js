import { test } from "node:test";
import assert from "node:assert/strict";
import { getVersion } from "../src/version.js";

test("version is exposed", () => {
  assert.equal(getVersion(), "0.1.0");
});
