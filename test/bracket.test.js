import { test } from "node:test";
import assert from "node:assert/strict";
import {
  roundOfSlot, feederSlots, winnerOf, loserOf, predictedWinners,
  emptyPicks, ROUND_STARTS, SLOT_COUNT, THIRD_PLACE_SLOT,
} from "../src/bracket.js";

// 32 distinct team names "T0".."T31"
const seed = Array.from({ length: 32 }, (_, i) => `T${i}`);
const allZero = new Array(32).fill(0); // side A always advances

test("round boundaries", () => {
  assert.equal(roundOfSlot(0), "R32");
  assert.equal(roundOfSlot(15), "R32");
  assert.equal(roundOfSlot(16), "R16");
  assert.equal(roundOfSlot(24), "QF");
  assert.equal(roundOfSlot(28), "SF");
  assert.equal(roundOfSlot(30), "Final");
  assert.equal(roundOfSlot(31), "3P");
});

test("feeders", () => {
  assert.equal(feederSlots(0), null);
  assert.deepEqual(feederSlots(16), { a: 0, b: 1 });
  assert.deepEqual(feederSlots(30), { a: 28, b: 29 });
});

test("all-zero picks: side A wins everything", () => {
  // R32 slot 5 pairs seed[10],seed[11]; pick 0 -> seed[10]
  assert.equal(winnerOf(5, seed, allZero), "T10");
  // champion is seed[0]
  assert.equal(winnerOf(30, seed, allZero), "T0");
});

test("a pick of 1 advances side B", () => {
  const picks = allZero.slice();
  picks[0] = 1; // R32 match 0 -> seed[1] advances
  assert.equal(winnerOf(0, seed, picks), "T1");
});

test("loserOf returns the other side", () => {
  assert.equal(loserOf(0, seed, allZero), "T1");
});

test("unpicked: no winners derived anywhere", () => {
  const e = emptyPicks();
  assert.equal(e.length, SLOT_COUNT);
  assert.equal(winnerOf(0, seed, e), null);  // R32 match unpicked
  assert.equal(winnerOf(16, seed, e), null); // R16 depends on unpicked feeders
  assert.equal(winnerOf(30, seed, e), null); // final
  const pw = predictedWinners(seed, e);
  assert.ok(pw.every((x) => x === null));
});

test("picking an R32 match feeds its team into R16's options", () => {
  const picks = emptyPicks();
  picks[0] = 0; // R32 match 0: seed[0] (T0) advances to R16 slot 16 side A
  // R16 slot 16 still unpicked -> no winner, but its side-A team is now T0
  assert.equal(winnerOf(16, seed, picks), null);
  assert.equal(feederSlots(16).a, 0);
});

test("predictedWinners has 32 entries incl. 3rd place", () => {
  const pw = predictedWinners(seed, allZero);
  assert.equal(pw.length, SLOT_COUNT);
  assert.equal(pw[30], "T0"); // champion
  // SF slots 28,29 winners are T0 and T16; their losers (3rd place
  // contestants) are T8 and T24; pick 0 -> T8.
  assert.equal(pw[THIRD_PLACE_SLOT], "T8");
});
