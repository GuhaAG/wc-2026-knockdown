import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreBracket, ROUND_WEIGHTS } from "../src/score.js";

const N = 32;
function blank() { return new Array(N).fill(null); }

test("no results -> zero total, all pending", () => {
  const predicted = Array.from({ length: N }, (_, i) => `P${i}`);
  const { total, perPick } = scoreBracket(predicted, blank());
  assert.equal(total, 0);
  assert.ok(perPick.every((p) => p.correct === null));
});

test("correct R32 pick scores 1; wrong scores 0", () => {
  const predicted = blank().map((_, i) => `P${i}`);
  const actual = blank();
  actual[0] = "P0";   // slot 0 correct (R32 weight 1)
  actual[1] = "X";    // slot 1 wrong
  const { total, perRound } = scoreBracket(predicted, actual);
  assert.equal(total, 1);
  assert.deepEqual(perRound.R32, { got: 1, of: 2 });
});

test("round weights apply (Final correct = 16)", () => {
  const predicted = blank().map((_, i) => `P${i}`);
  const actual = blank();
  actual[30] = "P30"; // Final slot, weight 16
  actual[31] = "P31"; // 3rd place, weight 2
  const { total } = scoreBracket(predicted, actual);
  assert.equal(total, 18);
});

test("weights table", () => {
  assert.equal(ROUND_WEIGHTS.QF, 4);
  assert.equal(ROUND_WEIGHTS["3P"], 2);
});
