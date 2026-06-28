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

  const r32 = events
    .filter((e) => e.round === "32")
    .sort((a, b) =>
      (a.timestamp || a.date || "").localeCompare(b.timestamp || b.date || "") ||
      a.id.localeCompare(b.id))
    .slice(0, 16);

  r32.forEach((e, i) => {
    seed[2 * i] = e.home;
    seed[2 * i + 1] = e.away;
    actual[i] = e.winner; // may be null (pending/draw-by-score)
  });

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
