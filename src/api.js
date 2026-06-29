import { ROUND_STARTS, ROUND_SIZES, feederSlots, THIRD_PLACE_SLOT } from "./bracket.js";

export const LEAGUE_ID = "4429";
export const SEASON = "2026";
const KEYS = ["3", "123"];
const base = (key) => `https://www.thesportsdb.com/api/v1/json/${key}`;

// TheSportsDB knockout round codes (verified against the completed 2022 WC):
// R32=32, R16=16, QF=125, SF=150, Final=200, 3rd-place=160.
// Group matchdays use 1/2/3, so they never collide with these.
const MAIN_ROUND_CODES = ["32", "16", "125", "150", "200"]; // slot-round order
const SF_CODE = MAIN_ROUND_CODES[3]; // "150"
export const THIRD_PLACE_ROUND_CODES = ["160"];

// Official 2026 FIFA knockout bracket: the 16 Round-of-32 matchups in the order
// they fill bracket slots 0..15, so that feederSlots() reproduces the real
// Round-of-16/QF/SF tree (source: en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage).
// e.g. slots 2 & 3 both feed R16 slot 17, so the South Africa/Canada winner meets
// the Netherlands/Morocco winner — as in the real draw.
const BRACKET_ORDER = [
  ["Germany", "Paraguay"],          // 0 ┐ R16 16 (M89)
  ["France", "Sweden"],             // 1 ┘
  ["South Africa", "Canada"],       // 2 ┐ R16 17 (M90)
  ["Netherlands", "Morocco"],       // 3 ┘
  ["Portugal", "Croatia"],          // 4 ┐ R16 18 (M93)
  ["Spain", "Austria"],             // 5 ┘
  ["USA", "Bosnia-Herzegovina"],    // 6 ┐ R16 19 (M94)
  ["Belgium", "Senegal"],           // 7 ┘
  ["Brazil", "Japan"],              // 8 ┐ R16 20 (M91)
  ["Ivory Coast", "Norway"],        // 9 ┘
  ["Mexico", "Ecuador"],            // 10 ┐ R16 21 (M92)
  ["England", "DR Congo"],          // 11 ┘
  ["Argentina", "Cape Verde"],      // 12 ┐ R16 22 (M95)
  ["Australia", "Egypt"],           // 13 ┘
  ["Switzerland", "Algeria"],       // 14 ┐ R16 23 (M96)
  ["Colombia", "Ghana"],            // 15 ┘
];

function norm(s) { return (s || "").toLowerCase().replace(/[^a-z]/g, ""); }
function pairKey(a, b) { return [norm(a), norm(b)].sort().join("|"); }

function num(v) {
  return v === null || v === undefined || v === "" ? null : Number(v);
}

export function normalizeEvent(e) {
  const hs = num(e.intHomeScore);
  const as = num(e.intAwayScore);
  const decided = hs != null && as != null && hs !== as;
  let winner = null;
  if (decided) winner = hs > as ? e.strHomeTeam : e.strAwayTeam;
  return {
    id: String(e.idEvent),
    round: e.intRound,
    home: e.strHomeTeam,
    away: e.strAwayTeam,
    homeScore: hs,
    awayScore: as,
    date: e.dateEvent,
    timestamp: e.strTimestamp,
    decided,
    winner,
  };
}

function teamSet(e) {
  return new Set([e.home, e.away]);
}

function loserOfEvent(e) {
  if (!e.decided) return null;
  return e.winner === e.home ? e.away : e.home;
}

export function resolveBracket(events) {
  const seed = new Array(32).fill(null);
  const actual = new Array(32).fill(null);

  const r32 = events.filter((e) => e.round === "32");

  // Place each fixture into its official bracket slot by matching the team pair.
  const byPair = new Map();
  for (const e of r32) byPair.set(pairKey(e.home, e.away), e);
  const used = new Set();
  BRACKET_ORDER.forEach((pair, slot) => {
    const e = byPair.get(pairKey(pair[0], pair[1]));
    if (e) {
      seed[2 * slot] = e.home;
      seed[2 * slot + 1] = e.away;
      actual[slot] = e.winner; // may be null (pending/draw-by-score)
      used.add(e.id);
    }
  });

  // Graceful fallback for any fixture not in the official list (e.g. a different
  // dataset): fill the remaining empty slots in chronological order.
  const leftovers = r32
    .filter((e) => !used.has(e.id))
    .sort((a, b) =>
      (a.timestamp || a.date || "").localeCompare(b.timestamp || b.date || "") ||
      a.id.localeCompare(b.id));
  let li = 0;
  for (let slot = 0; slot < 16 && li < leftovers.length; slot++) {
    if (seed[2 * slot] != null) continue;
    const e = leftovers[li++];
    seed[2 * slot] = e.home;
    seed[2 * slot + 1] = e.away;
    actual[slot] = e.winner;
  }

  // higher main-tree rounds: R16..Final
  for (let ri = 1; ri < MAIN_ROUND_CODES.length; ri++) {
    const code = MAIN_ROUND_CODES[ri];
    const slotStart = ROUND_STARTS[ri];
    const evs = events.filter((e) => e.round === code);
    for (let local = 0; local < ROUND_SIZES[ri]; local++) {
      const slot = slotStart + local;
      const f = feederSlots(slot);
      const fa = actual[f.a];
      const fb = actual[f.b];
      if (fa == null || fb == null) continue; // feeders unknown -> pending
      const match = evs.find((e) => { const s = teamSet(e); return s.has(fa) && s.has(fb); });
      if (match && match.decided) actual[slot] = match.winner;
    }
  }

  // 3rd place: the two SF losers (slots 28,29), matched to a non-main-tree event
  const sf1 = events.find((e) => e.round === SF_CODE && actual[28] != null && teamSet(e).has(actual[28]));
  const sf2 = events.find((e) => e.round === SF_CODE && actual[29] != null && teamSet(e).has(actual[29]));
  const l1 = sf1 ? loserOfEvent(sf1) : null;
  const l2 = sf2 ? loserOfEvent(sf2) : null;
  if (l1 != null && l2 != null) {
    const tpEvent = events.find(
      (e) => !MAIN_ROUND_CODES.includes(e.round) && teamSet(e).has(l1) && teamSet(e).has(l2)
    );
    if (tpEvent && tpEvent.decided) actual[THIRD_PLACE_SLOT] = tpEvent.winner;
  }

  return { seed, actualWinners: actual };
}

export async function fetchKnockoutEvents(fetchImpl = fetch) {
  // The free `eventsseason` endpoint returns only a partial set, and key "3"
  // returns fewer rows than "123". So we query each knockout round explicitly
  // via `eventsround` and merge the UNION across all keys (no early break) so
  // we always get the full 16 R32 fixtures once they exist.
  const roundCodes = [...MAIN_ROUND_CODES, ...THIRD_PLACE_ROUND_CODES];
  const urls = [];
  for (const key of KEYS) {
    for (const r of roundCodes) {
      urls.push(`${base(key)}/eventsround.php?id=${LEAGUE_ID}&r=${r}&s=${SEASON}`);
    }
  }
  const byId = new Map();
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetchImpl(url);
        const data = await res.json();
        for (const e of data.events || []) {
          if (e.idLeague !== LEAGUE_ID && e.strLeague !== "FIFA World Cup") continue;
          byId.set(String(e.idEvent), e); // later (key "123") rows overwrite/dedupe by id
        }
      } catch {
        /* skip this endpoint */
      }
    })
  );
  const all = [...byId.values()].map(normalizeEvent);
  const known = new Set(roundCodes);
  return all.filter((e) => known.has(e.round));
}
