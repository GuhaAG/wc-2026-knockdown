# WC 2026 Knockout Predictor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static, login-free web app where friends fill in a WC 2026 knockout bracket (Round of 32 → Final + 3rd place), share it via a URL, and see it scored against live results.

**Architecture:** Single static page on GitHub Pages, no build step. Pure ES modules: `bracket.js` (tree model), `encode.js` (URL state), `score.js` (scoring), `api.js` (TheSportsDB fetch + slot resolver) — all DOM-free and unit-tested with Node's built-in test runner. `main.js`/`ui.js` wire them to the DOM. The full prediction is encoded in `location.hash`; live results come from TheSportsDB (keyless).

**Tech Stack:** Vanilla JS (ES modules), HTML, CSS. Node's built-in test runner (`node --test`) — zero dependencies. TheSportsDB free API. GitHub Pages hosting.

## Global Constraints

- **No build step.** Source runs in the browser as-is via `<script type="module">`. No bundler, no transpiler.
- **No runtime dependencies.** Browser code uses only standard web APIs. Tests use only `node:test` + `node:assert` (Node ≥ 18; dev confirmed on v20).
- **`"type": "module"`** in `package.json`; all `.js` files are ES modules.
- **No backend, no secrets.** API is keyless. No environment variables.
- **API constants:** league id `"4429"`, season `"2026"`, base `https://www.thesportsdb.com/api/v1/json/<key>`, free keys to try in order: `"3"`, `"123"`.
- **Round codes (`intRound`):** `"32"`→R32, `"16"`→R16, `"8"`→QF, `"4"`→SF, `"2"`→Final. 3rd-place code unconfirmed — resolve by team membership with a code allowlist that's a one-line change in `api.js`.
- **Slot layout (32 slots):** R32 = slots 0–15, R16 = 16–23, QF = 24–27, SF = 28–29, Final = 30, 3rd-place = 31.
- **Pick convention:** each pick is `0` (side A / "home"/upper advances) or `1` (side B / "away"/lower advances).
- **Commit after every task.** Use the commit messages given.

---

## File Structure

- `index.html` — page shell, loads `main.js` as a module.
- `styles.css` — bracket layout + pending/correct/wrong styling.
- `src/bracket.js` — slot layout constants + tree derivation (pure).
- `src/encode.js` — encode/decode picks+name to/from URL hash (pure).
- `src/score.js` — round-weighted scoring (pure).
- `src/api.js` — TheSportsDB fetch, normalize, and resolve seed + actual winners per slot.
- `src/ui.js` — pure-ish render helpers (build DOM nodes from state).
- `src/main.js` — app glue: load hash, fetch results, render, handle clicks, copy link, refresh.
- `test/bracket.test.js`, `test/encode.test.js`, `test/score.test.js`, `test/api.test.js` — unit tests.
- `test/fixtures/sample-events.json` — recorded TheSportsDB sample for `api.test.js`.
- `package.json` — `"type":"module"`, `"scripts": { "test": "node --test" }`.
- `.nojekyll` — let GitHub Pages serve all files verbatim.
- `README.md` — what it is + deploy steps.

---

### Task 1: Project scaffold + test runner

**Files:**
- Create: `package.json`, `index.html`, `styles.css`, `.nojekyll`, `src/version.js`, `test/smoke.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` works; `getVersion()` from `src/version.js` returns `"0.1.0"`.

- [ ] **Step 1: Write the failing test**

Create `test/smoke.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { getVersion } from "../src/version.js";

test("version is exposed", () => {
  assert.equal(getVersion(), "0.1.0");
});
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "wc-2026-knockout-predictor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../src/version.js`.

- [ ] **Step 4: Create `src/version.js`**

```js
export function getVersion() {
  return "0.1.0";
}
```

- [ ] **Step 5: Create the page shell**

`index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WC 2026 Knockout Predictor</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1>WC 2026 Knockout Predictor</h1>
    <div class="controls">
      <input id="name" type="text" placeholder="Your name" maxlength="24" />
      <button id="copy">Copy share link</button>
      <button id="refresh">Refresh results</button>
      <span id="score" class="score"></span>
    </div>
    <p id="status" class="status"></p>
  </header>
  <main id="bracket"></main>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

`styles.css` (starter — refined in Task 6):
```css
:root { font-family: system-ui, sans-serif; }
body { margin: 0; padding: 1rem; background: #0b1020; color: #e8ecf5; }
.controls { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
.score { font-weight: 700; }
.status { color: #9aa6c4; min-height: 1.2em; }
.match { border: 1px solid #2a335a; border-radius: 6px; padding: .25rem; margin: .25rem 0; }
.team { display: block; padding: .25rem .5rem; cursor: pointer; border-radius: 4px; }
.team.picked { background: #27407a; }
.team.correct { outline: 2px solid #36d399; }
.team.wrong { outline: 2px solid #f87272; opacity: .7; }
```

Create empty `.nojekyll` (no content needed).

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add package.json index.html styles.css .nojekyll src/version.js test/smoke.test.js
git commit -m "chore: scaffold static app + node test runner"
```

---

### Task 2: Bracket tree model

**Files:**
- Create: `src/bracket.js`, `test/bracket.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (exact exports used by `score.js`, `api.js`, `ui.js`):
  - Constants: `ROUND_STARTS = [0,16,24,28,30]`, `ROUND_SIZES = [16,8,4,2,1]`, `ROUND_NAMES = ["R32","R16","QF","SF","Final"]`, `FINAL_SLOT = 30`, `THIRD_PLACE_SLOT = 31`, `SLOT_COUNT = 32`.
  - `roundOfSlot(slot) -> "R32"|"R16"|"QF"|"SF"|"Final"|"3P"`
  - `feederSlots(slot) -> {a, b} | null` (null for R32 slots 0–15)
  - `winnerOf(slot, seed, picks) -> team` (slot 0–30)
  - `loserOf(slot, seed, picks) -> team` (slot 0–30)
  - `predictedWinners(seed, picks) -> array length 32` (index 31 = predicted 3rd-place winner)

`seed` is an array of 32 team names (strings). `picks` is an array of 32 values in `{0,1}`.

- [ ] **Step 1: Write the failing test**

Create `test/bracket.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  roundOfSlot, feederSlots, winnerOf, loserOf, predictedWinners,
  ROUND_STARTS, SLOT_COUNT, THIRD_PLACE_SLOT,
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

test("predictedWinners has 32 entries incl. 3rd place", () => {
  const pw = predictedWinners(seed, allZero);
  assert.equal(pw.length, SLOT_COUNT);
  assert.equal(pw[30], "T0"); // champion
  // SF slots 28,29 feed final; with all-zero, SF winners are T0 and T16,
  // their losers (3rd place contestants) are T8 and T24; pick 0 -> T8.
  assert.equal(pw[THIRD_PLACE_SLOT], "T8");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/bracket.test.js`
Expected: FAIL — cannot find module `../src/bracket.js`.

- [ ] **Step 3: Implement `src/bracket.js`**

```js
export const ROUND_STARTS = [0, 16, 24, 28, 30];
export const ROUND_SIZES = [16, 8, 4, 2, 1];
export const ROUND_NAMES = ["R32", "R16", "QF", "SF", "Final"];
export const FINAL_SLOT = 30;
export const THIRD_PLACE_SLOT = 31;
export const SLOT_COUNT = 32;

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

export function winnerOf(slot, seed, picks) {
  const [a, b] = sides(slot, seed, picks);
  return picks[slot] === 1 ? b : a;
}

export function loserOf(slot, seed, picks) {
  const [a, b] = sides(slot, seed, picks);
  return picks[slot] === 1 ? a : b;
}

export function predictedWinners(seed, picks) {
  const out = new Array(SLOT_COUNT);
  for (let s = 0; s <= FINAL_SLOT; s++) out[s] = winnerOf(s, seed, picks);
  const l1 = loserOf(28, seed, picks);
  const l2 = loserOf(29, seed, picks);
  out[THIRD_PLACE_SLOT] = picks[THIRD_PLACE_SLOT] === 1 ? l2 : l1;
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/bracket.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/bracket.js test/bracket.test.js
git commit -m "feat: bracket tree model with winner/loser derivation"
```

---

### Task 3: URL state encoding

**Files:**
- Create: `src/encode.js`, `test/encode.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `encodePicks(picks, name="") -> string` (a query string like `p=AB-c&n=Sam`, no leading `#`)
  - `decodePicks(hash) -> { picks: number[32], name: string }` (accepts a string with or without leading `#`; malformed input → 32 zeros + best-effort name)
  - `PICK_COUNT = 32`

- [ ] **Step 1: Write the failing test**

Create `test/encode.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/encode.test.js`
Expected: FAIL — cannot find module `../src/encode.js`.

- [ ] **Step 3: Implement `src/encode.js`**

```js
export const PICK_COUNT = 32;
const NUM_BYTES = PICK_COUNT / 8; // 4

function toBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64); // throws on invalid input
  const bytes = new Uint8Array(NUM_BYTES);
  for (let i = 0; i < NUM_BYTES && i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodePicks(picks, name = "") {
  const bytes = new Uint8Array(NUM_BYTES);
  for (let i = 0; i < PICK_COUNT; i++) {
    if (picks[i]) bytes[i >> 3] |= 1 << (i & 7);
  }
  const params = new URLSearchParams();
  params.set("p", toBase64Url(bytes));
  if (name) params.set("n", name);
  return params.toString();
}

export function decodePicks(hash) {
  const h = (hash || "").replace(/^#/, "");
  const params = new URLSearchParams(h);
  const name = params.get("n") || "";
  const picks = new Array(PICK_COUNT).fill(0);
  const p = params.get("p");
  if (p) {
    try {
      const bytes = fromBase64Url(p);
      for (let i = 0; i < PICK_COUNT; i++) {
        picks[i] = (bytes[i >> 3] >> (i & 7)) & 1;
      }
    } catch {
      // leave picks all-zero on malformed input
    }
  }
  return { picks, name };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/encode.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/encode.js test/encode.test.js
git commit -m "feat: compact URL-hash encoding of picks + name"
```

---

### Task 4: Scoring

**Files:**
- Create: `src/score.js`, `test/score.test.js`

**Interfaces:**
- Consumes: `roundOfSlot`, `SLOT_COUNT` from `bracket.js`.
- Produces:
  - `ROUND_WEIGHTS = { R32:1, R16:2, QF:4, SF:8, Final:16, "3P":2 }`
  - `scoreBracket(predicted, actual) -> { total, perPick, perRound }`
    - `predicted`: array length 32 of predicted winner names.
    - `actual`: array length 32 of actual winner names, or `null` where the match is not yet decided/known.
    - `perPick`: array of `{ slot, round, correct }` where `correct` is `true | false | null` (null = pending).
    - `perRound`: `{ R32:{got,of}, ... }` where `of` counts decided matches and `got` counts correct ones.

- [ ] **Step 1: Write the failing test**

Create `test/score.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/score.test.js`
Expected: FAIL — cannot find module `../src/score.js`.

- [ ] **Step 3: Implement `src/score.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/score.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/score.js test/score.test.js
git commit -m "feat: round-weighted bracket scoring"
```

---

### Task 5: TheSportsDB API + bracket resolver

**Files:**
- Create: `src/api.js`, `test/api.test.js`, `test/fixtures/sample-events.json`

**Interfaces:**
- Consumes: `ROUND_STARTS`, `ROUND_SIZES`, `feederSlots`, `THIRD_PLACE_SLOT` from `bracket.js`.
- Produces:
  - `normalizeEvent(rawEvent) -> { id, round, home, away, homeScore, awayScore, date, timestamp, decided, winner }` (`winner` is a team name, or `null` if not decided or a draw-by-score).
  - `resolveBracket(events) -> { seed: string[32], actualWinners: (string|null)[32] }`
  - `fetchKnockoutEvents(fetchImpl = fetch) -> Promise<normalizedEvent[]>` (merges endpoints/keys, filters to knockout rounds, dedupes by id).
  - `LEAGUE_ID`, `SEASON`, `THIRD_PLACE_ROUND_CODES` exported for tuning.

**Resolver rules (must match the test):**
- R32 events (`round === "32"`), sorted by `(date, id)`, define the seed: match *i* → `seed[2i]=home`, `seed[2i+1]=away`; `actualWinners[i] = winner`.
- For each higher slot, look up the real event whose two teams equal the actual winners of its two feeder slots (membership match, order-independent). If found and decided, fill `actualWinners[slot]`; else leave `null` (pending).
- 3rd-place (slot 31): contestants are the two SF *losers* (the non-winner team of each decided SF event whose participants match feeders); find a non-main-tree event between those two teams.

- [ ] **Step 1: Create the fixture**

Create `test/fixtures/sample-events.json` — a minimal but complete knockout tree for **4 teams** scaled into the 32-slot layout would be large, so use a compact 4-team-style fixture that exercises R32→Final by only filling the first sub-bracket. Use exactly this content:
```json
{
  "events": [
    { "idEvent": "1", "idLeague": "4429", "strLeague": "FIFA World Cup", "intRound": "32", "strHomeTeam": "Brazil",     "strAwayTeam": "Ghana",   "intHomeScore": "2", "intAwayScore": "0", "dateEvent": "2026-06-28", "strTimestamp": "2026-06-28T19:00:00" },
    { "idEvent": "2", "idLeague": "4429", "strLeague": "FIFA World Cup", "intRound": "32", "strHomeTeam": "France",     "strAwayTeam": "Japan",   "intHomeScore": "1", "intAwayScore": "1", "dateEvent": "2026-06-28", "strTimestamp": "2026-06-28T22:00:00" },
    { "idEvent": "3", "idLeague": "4429", "strLeague": "FIFA World Cup", "intRound": "16", "strHomeTeam": "Brazil",     "strAwayTeam": "France",  "intHomeScore": "0", "intAwayScore": "3", "dateEvent": "2026-07-02", "strTimestamp": "2026-07-02T19:00:00" }
  ]
}
```
Notes this exercises: a decided R32 (Brazil), a drawn-by-score R32 (France vs Japan → `winner: null`), and an R16 whose membership only partially matches (feeder slot 1 is pending, so slot 16 must stay pending **even though** an event exists). The R16 event's teams are Brazil+France, but slot-1 winner is unknown → membership match must fail → slot 16 `null`.

- [ ] **Step 2: Write the failing test**

Create `test/api.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeEvent, resolveBracket, fetchKnockoutEvents } from "../src/api.js";

const sample = JSON.parse(
  await readFile(new URL("./fixtures/sample-events.json", import.meta.url))
);

test("normalizeEvent: decided game has a winner", () => {
  const n = normalizeEvent(sample.events[0]);
  assert.equal(n.decided, true);
  assert.equal(n.winner, "Brazil");
});

test("normalizeEvent: equal score -> not decided, winner null", () => {
  const n = normalizeEvent(sample.events[1]);
  assert.equal(n.decided, false);
  assert.equal(n.winner, null);
});

test("resolveBracket: seed + R32 winners; pending higher slots", () => {
  const events = sample.events.map(normalizeEvent);
  const { seed, actualWinners } = resolveBracket(events);
  assert.equal(seed[0], "Brazil");
  assert.equal(seed[1], "Ghana");
  assert.equal(seed[2], "France");
  assert.equal(seed[3], "Japan");
  assert.equal(actualWinners[0], "Brazil"); // R32 slot 0 decided
  assert.equal(actualWinners[1], null);     // France/Japan draw -> pending
  assert.equal(actualWinners[16], null);    // R16 slot pending (feeder 1 unknown)
});

test("fetchKnockoutEvents merges + filters via injected fetch", async () => {
  const fakeFetch = async () => ({ json: async () => sample });
  const evs = await fetchKnockoutEvents(fakeFetch);
  // only knockout rounds kept; all 3 are knockout
  assert.equal(evs.length, 3);
  assert.ok(evs.every((e) => typeof e.id === "string"));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/api.test.js`
Expected: FAIL — cannot find module `../src/api.js`.

- [ ] **Step 4: Implement `src/api.js`**

```js
import { ROUND_STARTS, ROUND_SIZES, feederSlots, THIRD_PLACE_SLOT } from "./bracket.js";

export const LEAGUE_ID = "4429";
export const SEASON = "2026";
const KEYS = ["3", "123"];
const base = (key) => `https://www.thesportsdb.com/api/v1/json/${key}`;

// main-tree round codes in slot-round order: R32,R16,QF,SF,Final
const MAIN_ROUND_CODES = ["32", "16", "8", "4", "2"];
// 3rd-place code is unconfirmed on the free tier; allowlist is a one-line tweak.
export const THIRD_PLACE_ROUND_CODES = ["150", "3", "third"];

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
    .sort((a, b) => (a.timestamp || a.date || "").localeCompare(b.timestamp || b.date || "") || a.id.localeCompare(b.id))
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
  const sf1 = events.find((e) => e.round === "4" && actual[28] != null && teamSet(e).has(actual[28]));
  const sf2 = events.find((e) => e.round === "4" && actual[29] != null && teamSet(e).has(actual[29]));
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
  const urls = (key) => [
    `${base(key)}/eventsseason.php?id=${LEAGUE_ID}&s=${SEASON}`,
    `${base(key)}/eventspastleague.php?id=${LEAGUE_ID}`,
    `${base(key)}/eventsnextleague.php?id=${LEAGUE_ID}`,
  ];
  const byId = new Map();
  for (const key of KEYS) {
    for (const url of urls(key)) {
      try {
        const res = await fetchImpl(url);
        const data = await res.json();
        for (const e of data.events || []) {
          if (e.idLeague !== LEAGUE_ID && e.strLeague !== "FIFA World Cup") continue;
          byId.set(String(e.idEvent), e);
        }
      } catch {
        /* skip this endpoint */
      }
    }
    if (byId.size) break; // first key that returns anything wins
  }
  const all = [...byId.values()].map(normalizeEvent);
  const known = new Set([...MAIN_ROUND_CODES, ...THIRD_PLACE_ROUND_CODES]);
  return all.filter((e) => known.has(e.round));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/api.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS (all tests across all files).

- [ ] **Step 7: Commit**

```bash
git add src/api.js test/api.test.js test/fixtures/sample-events.json
git commit -m "feat: TheSportsDB fetch, normalize, and bracket resolver"
```

---

### Task 6: UI render + app glue

**Files:**
- Create: `src/ui.js`, `src/main.js`
- Modify: `styles.css` (refine bracket columns)

**Interfaces:**
- Consumes: everything from `bracket.js`, `encode.js`, `score.js`, `api.js`.
- Produces: a working page. `src/ui.js` exports `renderBracket(container, state)` where `state = { seed, picks, predicted, actualWinners, perPick }`; `src/main.js` is the entry module referenced by `index.html`.

This is the integration layer (verified manually in Task 7), so it is one task. Steps build it incrementally; there is no unit test (DOM/network), but each step is runnable in the browser.

- [ ] **Step 1: Implement `src/ui.js`**

```js
import {
  ROUND_STARTS, ROUND_SIZES, ROUND_NAMES, feederSlots, winnerOf,
} from "./bracket.js";

// Build the two team labels for a slot from current seed+picks.
function slotTeams(slot, seed, picks) {
  const f = feederSlots(slot);
  if (f === null) return [seed[slot * 2], seed[slot * 2 + 1]];
  return [winnerOf(f.a, seed, picks), winnerOf(f.b, seed, picks)];
}

// state: { seed, picks, actualWinners, perPick }
export function renderBracket(container, state) {
  const { seed, picks, actualWinners, perPick } = state;
  container.innerHTML = "";
  for (let r = 0; r < ROUND_NAMES.length; r++) {
    const col = document.createElement("section");
    col.className = "round";
    const h = document.createElement("h2");
    h.textContent = ROUND_NAMES[r];
    col.appendChild(h);
    for (let local = 0; local < ROUND_SIZES[r]; local++) {
      const slot = ROUND_STARTS[r] + local;
      col.appendChild(matchEl(slot, state));
    }
    container.appendChild(col);
  }
  // 3rd-place block appended to the Final column visually
  const tp = document.createElement("section");
  tp.className = "round third";
  const th = document.createElement("h2");
  th.textContent = "3rd place";
  tp.appendChild(th);
  tp.appendChild(matchEl(31, state, true));
  container.appendChild(tp);

  function matchEl(slot, st, isThird = false) {
    const wrap = document.createElement("div");
    wrap.className = "match";
    let teams;
    if (isThird) {
      // 3rd place contestants: SF losers under current picks
      const { loserOf } = window.__bracket; // injected in main.js, see Step 2
      teams = [loserOf(28, seed, picks), loserOf(29, seed, picks)];
    } else {
      teams = slotTeams(slot, seed, picks);
    }
    teams.forEach((team, side) => {
      const btn = document.createElement("button");
      btn.className = "team";
      btn.textContent = team || "—";
      btn.dataset.slot = String(slot);
      btn.dataset.side = String(side);
      if (picks[slot] === side) btn.classList.add("picked");
      const pp = perPick && perPick[slot];
      if (pp && pp.correct !== null && picks[slot] === side) {
        btn.classList.add(pp.correct ? "correct" : "wrong");
      }
      wrap.appendChild(btn);
    });
    return wrap;
  }
}
```

> Note: to avoid a circular import for the 3rd-place block, `main.js` attaches `loserOf` to `window.__bracket` (Step 2). Alternative if you prefer no globals: import `loserOf` directly at the top of `ui.js` from `./bracket.js` and delete the `window.__bracket` line — both work; the direct import is cleaner, use it.

Replace the `window.__bracket` access with a direct import:
```js
import { /* ...existing..., */ loserOf } from "./bracket.js";
// then in matchEl: teams = [loserOf(28, seed, picks), loserOf(29, seed, picks)];
```

- [ ] **Step 2: Implement `src/main.js`**

```js
import { predictedWinners, loserOf } from "./bracket.js";
import { encodePicks, decodePicks } from "./encode.js";
import { scoreBracket } from "./score.js";
import { fetchKnockoutEvents, resolveBracket } from "./api.js";
import { renderBracket } from "./ui.js";

const els = {
  bracket: document.getElementById("bracket"),
  name: document.getElementById("name"),
  copy: document.getElementById("copy"),
  refresh: document.getElementById("refresh"),
  score: document.getElementById("score"),
  status: document.getElementById("status"),
};

const FALLBACK_SEED = Array.from({ length: 32 }, (_, i) => `Team ${i + 1}`);

const app = {
  seed: FALLBACK_SEED.slice(),
  picks: new Array(32).fill(0),
  name: "",
  actualWinners: new Array(32).fill(null),
};

function setStatus(msg) { els.status.textContent = msg; }

function syncHashFromState() {
  const q = encodePicks(app.picks, app.name);
  history.replaceState(null, "", "#" + q);
}

function recompute() {
  const predicted = predictedWinners(app.seed, app.picks);
  const { total, perPick, perRound } = scoreBracket(predicted, app.actualWinners);
  els.score.textContent = `Score: ${total}`;
  renderBracket(els.bracket, {
    seed: app.seed, picks: app.picks,
    actualWinners: app.actualWinners, perPick,
  });
}

function onPick(slot, side) {
  app.picks[slot] = side;
  // Downstream picks may now reference teams that changed; leave them as-is
  // (they are re-derived on render). Just resync + recompute.
  syncHashFromState();
  recompute();
}

els.bracket.addEventListener("click", (e) => {
  const btn = e.target.closest(".team");
  if (!btn) return;
  onPick(Number(btn.dataset.slot), Number(btn.dataset.side));
});

els.name.addEventListener("input", () => {
  app.name = els.name.value.trim();
  syncHashFromState();
});

els.copy.addEventListener("click", async () => {
  syncHashFromState();
  try {
    await navigator.clipboard.writeText(location.href);
    setStatus("Share link copied to clipboard.");
  } catch {
    setStatus("Copy failed — select the URL bar and copy manually.");
  }
});

els.refresh.addEventListener("click", loadResults);

async function loadResults() {
  setStatus("Fetching results…");
  try {
    const events = await fetchKnockoutEvents();
    const { seed, actualWinners } = resolveBracket(events);
    // Only adopt the API seed if it looks populated (≥ first match present).
    if (seed[0]) app.seed = seed.map((t, i) => t || FALLBACK_SEED[i]);
    app.actualWinners = actualWinners;
    localStorage.setItem("wc2026:seed", JSON.stringify(app.seed));
    localStorage.setItem("wc2026:actual", JSON.stringify(actualWinners));
    setStatus(`Results updated. ${events.length} knockout matches known.`);
  } catch (err) {
    setStatus("Could not fetch results — bracket still works; scores pending.");
  }
  recompute();
}

function boot() {
  const { picks, name } = decodePicks(location.hash);
  app.picks = picks;
  app.name = name;
  els.name.value = name;
  // Warm-start from cached seed/results so the page renders instantly offline.
  try {
    const cs = JSON.parse(localStorage.getItem("wc2026:seed") || "null");
    const ca = JSON.parse(localStorage.getItem("wc2026:actual") || "null");
    if (Array.isArray(cs) && cs.length === 32) app.seed = cs;
    if (Array.isArray(ca) && ca.length === 32) app.actualWinners = ca;
  } catch { /* ignore cache errors */ }
  recompute();
  loadResults(); // refresh in background
}

boot();
```

- [ ] **Step 3: Refine `styles.css` for columns**

Append:
```css
main#bracket { display: flex; gap: 1rem; overflow-x: auto; align-items: flex-start; padding-top: 1rem; }
.round { min-width: 160px; }
.round h2 { font-size: .9rem; color: #9aa6c4; margin: 0 0 .5rem; }
.round.third { border-left: 2px dashed #2a335a; padding-left: 1rem; }
```

- [ ] **Step 4: Manual smoke check in a browser**

Run a static server from the repo root:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000/`. Expected:
- A horizontally-scrolling bracket renders (R32 → Final + 3rd place), using cached or fallback team names, then real team names once the fetch resolves.
- Clicking a team highlights it (`.picked`) and the downstream rounds update.
- The URL hash changes as you pick.
- The status line reports how many knockout matches are known.

- [ ] **Step 5: Commit**

```bash
git add src/ui.js src/main.js styles.css
git commit -m "feat: bracket UI, hash sync, scoring display, results fetch"
```

---

### Task 7: Deploy to GitHub Pages + README + end-to-end verification

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: the whole app.
- Produces: a live public URL.

- [ ] **Step 1: Write `README.md`**

```markdown
# WC 2026 Knockout Predictor

Fill in your FIFA World Cup 2026 knockout bracket (Round of 32 → Final, plus the
3rd-place playoff), then share it with friends via a single URL — no login, no
accounts. Predictions are scored against live results from TheSportsDB.

## How it works
- Your whole prediction is encoded in the URL after `#`. Share the link; whoever
  opens it sees your bracket. Nothing is stored on a server.
- Real results are fetched from TheSportsDB (free, keyless). Matches not yet
  decided show as pending; correct/incorrect picks are marked once known.

## Scoring
Round-weighted per correct advancing pick: R32=1, R16=2, QF=4, SF=8, Final=16,
3rd-place=2.

## Develop
- `npm test` runs the unit tests (Node ≥ 18, no dependencies).
- Serve locally: `python3 -m http.server 8000` then open http://localhost:8000/

## Deploy
Hosted on GitHub Pages from the `main` branch root. See repository Settings → Pages.
```

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: add README"
# create the GitHub repo if it doesn't exist yet:
gh repo create wc-2026-knockout-predictor --public --source=. --remote=origin --push
```

- [ ] **Step 3: Enable GitHub Pages**

Either via CLI:
```bash
gh api -X POST repos/:owner/wc-2026-knockout-predictor/pages \
  -f "source[branch]=main" -f "source[path]=/" || \
  echo "If this errors, enable Pages in Settings → Pages → Deploy from branch → main → / (root)."
```
Or in the browser: repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.

- [ ] **Step 4: End-to-end verification on the live URL**

After Pages publishes (URL shown in Settings → Pages, typically `https://<user>.github.io/wc-2026-knockout-predictor/`):
1. Open the live URL. Confirm the bracket renders and the status line reports knockout matches known (or a graceful "scores pending" if the API is empty).
2. Make several picks across rounds. Set a name. Click **Copy share link**.
3. Open the copied link in a fresh incognito window. Confirm the **identical** bracket and name render.
4. If any knockout match has finished, confirm that pick shows ✓/✗ and the score total reflects the round weights; undecided matches stay unmarked.
5. Click **Refresh results** and confirm the status line updates without errors.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "fix: post-deploy verification adjustments" || echo "nothing to fix"
git push
```

---

## Self-Review Notes

- **Spec coverage:** static GitHub Pages (Tasks 1,7) ✓; bracket R32→Final+3rd place (Task 2) ✓; URL-hash sharing, picks-only, name field (Tasks 3,6) ✓; round-weighted scoring + per-round breakdown + pending (Task 4) ✓; TheSportsDB keyless, multi-endpoint merge, round mapping, slot resolver (Task 5) ✓; offline-tolerant builder + localStorage cache + graceful degradation (Task 6) ✓.
- **Known limitation (from spec, accepted):** knockout matches decided on penalties may have an equal 90/120-min score in TheSportsDB; `normalizeEvent` treats equal scores as undecided (pending) rather than guessing a winner. If penalty data proves available in a usable field during Task 6 testing, extend `normalizeEvent` — otherwise leave pending. Documented, not a blocker.
- **Type consistency:** `predictedWinners`/`actualWinners` are both length-32 name arrays aligned to the same slot indices consumed by `scoreBracket`; `feederSlots`/`ROUND_STARTS`/`ROUND_SIZES` are shared by `bracket.js`, `api.js`, `ui.js` with identical signatures.
- **3rd-place round code** is the one runtime unknown; `THIRD_PLACE_ROUND_CODES` allowlist + membership fallback isolates the fix to one line in `api.js`.
