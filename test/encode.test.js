import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePicks, decodePicks, PICK_COUNT } from "../src/encode.js";
import { UNPICKED } from "../src/bracket.js";

function triStatePicks(seed) {
  // deterministic pseudo-random value in {-1, 0, 1}, no Math.random
  return Array.from({ length: PICK_COUNT }, (_, i) => (((i * 2654435761 + seed) >>> 3) % 3) - 1);
}

test("round-trips tri-state picks and name", () => {
  const picks = triStatePicks(7);
  assert.ok(picks.some((x) => x === UNPICKED)); // exercises the unpicked code
  const enc = encodePicks(picks, "Sam O'Neil");
  const dec = decodePicks("#" + enc);
  assert.deepEqual(dec.picks, picks);
  assert.equal(dec.name, "Sam O'Neil");
});

test("empty/missing hash -> all unpicked, empty name", () => {
  const dec = decodePicks("");
  assert.equal(dec.picks.length, PICK_COUNT);
  assert.ok(dec.picks.every((x) => x === UNPICKED));
  assert.equal(dec.name, "");
});

test("malformed p param -> all unpicked, name preserved", () => {
  const dec = decodePicks("#p=@@@notbase64@@@&n=Kim");
  assert.ok(dec.picks.every((x) => x === UNPICKED));
  assert.equal(dec.name, "Kim");
});

test("all-side-B round-trips", () => {
  const picks = new Array(PICK_COUNT).fill(1);
  assert.deepEqual(decodePicks(encodePicks(picks)).picks, picks);
});
