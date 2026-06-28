import { test } from "node:test";
import assert from "node:assert/strict";
import { flagCode, flagUrl, initials } from "../src/flags.js";

test("maps known nations to ISO codes", () => {
  assert.equal(flagCode("Brazil"), "br");
  assert.equal(flagCode("USA"), "us");
  assert.equal(flagCode("England"), "gb-eng");
  assert.equal(flagCode("Bosnia-Herzegovina"), "ba");
});

test("flagUrl builds a flagcdn URL, or null when unknown", () => {
  assert.equal(flagUrl("France"), "https://flagcdn.com/h60/fr.png");
  assert.equal(flagUrl("Team 5"), null);
  assert.equal(flagUrl(""), null);
});

test("initials fallback for placeholder/unknown teams", () => {
  assert.equal(initials("Team 12"), "TEA");
  assert.equal(initials("Ivory Coast"), "IC");
  assert.equal(initials(""), "—");
});