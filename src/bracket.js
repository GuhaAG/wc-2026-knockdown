export const ROUND_STARTS = [0, 16, 24, 28, 30];
export const ROUND_SIZES = [16, 8, 4, 2, 1];
export const ROUND_NAMES = ["R32", "R16", "QF", "SF", "Final"];
export const FINAL_SLOT = 30;
export const THIRD_PLACE_SLOT = 31;
export const SLOT_COUNT = 32;
export const UNPICKED = -1;

export function emptyPicks() {
  return new Array(SLOT_COUNT).fill(UNPICKED);
}

function roundIndexOfSlot(slot) {
  for (let r = ROUND_STARTS.length - 1; r >= 0; r--) {
    if (slot >= ROUND_STARTS[r]) return r;
  }
  return 0;
}

export function roundOfSlot(slot) {
  if (slot === THIRD_PLACE_SLOT) return "3P";
  return ROUND_NAMES[roundIndexOfSlot(slot)];
}

export function feederSlots(slot) {
  const r = roundIndexOfSlot(slot);
  if (r === 0) return null;
  const local = slot - ROUND_STARTS[r];
  const prevStart = ROUND_STARTS[r - 1];
  return { a: prevStart + local * 2, b: prevStart + local * 2 + 1 };
}

function sides(slot, seed, picks) {
  const f = feederSlots(slot);
  if (f === null) return [seed[slot * 2], seed[slot * 2 + 1]];
  return [winnerOf(f.a, seed, picks), winnerOf(f.b, seed, picks)];
}

// Returns the chosen winner, or null when this match is unpicked (or its
// teams aren't known yet because a feeding match is unpicked).
export function winnerOf(slot, seed, picks) {
  const [a, b] = sides(slot, seed, picks);
  if (picks[slot] === 0) return a;
  if (picks[slot] === 1) return b;
  return null;
}

export function loserOf(slot, seed, picks) {
  const [a, b] = sides(slot, seed, picks);
  if (picks[slot] === 0) return b;
  if (picks[slot] === 1) return a;
  return null;
}

export function predictedWinners(seed, picks) {
  const out = new Array(SLOT_COUNT);
  for (let s = 0; s <= FINAL_SLOT; s++) out[s] = winnerOf(s, seed, picks);
  const l1 = loserOf(28, seed, picks);
  const l2 = loserOf(29, seed, picks);
  if (picks[THIRD_PLACE_SLOT] === 0) out[THIRD_PLACE_SLOT] = l1;
  else if (picks[THIRD_PLACE_SLOT] === 1) out[THIRD_PLACE_SLOT] = l2;
  else out[THIRD_PLACE_SLOT] = null;
  return out;
}
