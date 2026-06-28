import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePicks, decodePicks, PICK_COUNT } from "../src/encode.js";

function randomPicks(seed) {
  // deterministic pseudo-random 0/1 from an index, no Math.random
  return Array.from({ length: PICK_COUNT }, (_, i) => ((i * 2654435761 + seed) >>> ((i % 5) + 1)) & 1);
}

test("round-trips picks and name", () => {
  const picks = randomPicks(7);
  const enc = encodePicks(picks, "Sam O'Neil");
  const dec = decodePicks("#" + enc);
  assert.deepEqual(dec.picks, picks);
  assert.equal(dec.name, "Sam O'Neil");
});

test("empty/missing hash -> all zeros, empty name", () => {
  const dec = decodePicks("");
  assert.equal(dec.picks.length, PICK_COUNT);
  assert.ok(dec.picks.every((x) => x === 0));
  assert.equal(dec.name, "");
});

test("malformed p param -> all zeros, name preserved", () => {
  const dec = decodePicks("#p=@@@notbase64@@@&n=Kim");
  assert.ok(dec.picks.every((x) => x === 0));
  assert.equal(dec.name, "Kim");
});

test("all-ones round-trips", () => {
  const picks = new Array(PICK_COUNT).fill(1);
  assert.deepEqual(decodePicks(encodePicks(picks)).picks, picks);
});
