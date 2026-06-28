import { roundOfSlot, SLOT_COUNT } from "./bracket.js";

export const ROUND_WEIGHTS = { R32: 1, R16: 2, QF: 4, SF: 8, Final: 16, "3P": 2 };

export function scoreBracket(predicted, actual) {
  const perPick = [];
  const perRound = {};
  let total = 0;
  for (let s = 0; s < SLOT_COUNT; s++) {
    const round = roundOfSlot(s);
    if (!perRound[round]) perRound[round] = { got: 0, of: 0 };
    let correct = null;
    const act = actual[s];
    if (act != null) {
      correct = predicted[s] === act;
      perRound[round].of += 1;
      if (correct) {
        total += ROUND_WEIGHTS[round];
        perRound[round].got += 1;
      }
    }
    perPick.push({ slot: s, round, correct });
  }
  return { total, perPick, perRound };
}
