# WC 2026 Knockout Predictor — Design

**Date:** 2026-06-29
**Status:** Approved design, pending spec review

## Context

The 2026 FIFA World Cup is live (knockouts about to begin). The user wants a way for a
group of friends to each fill in their own knockout bracket prediction (from the Round of 32
onward), save it, and share it with each other — with **no login, no accounts, no backend**.
A prediction must be shareable as a plain URL. Additionally, once real matches are played,
the app should **score** each prediction against actual results so friends can see who called
it best.

The whole thing must be free to host and easy to deploy. Because there is no backend, all
state lives client-side: the prediction is encoded into the URL, and real results come from a
free, keyless public API.

## Goals

- Build a full knockout bracket: **Round of 32 → R16 → QF → SF → Final**, plus 3rd-place playoff.
- Save a prediction entirely in the URL and share it (no login/users).
- Score predictions against live real-world results, round-weighted.
- Free static hosting (GitHub Pages), zero build step.

## Non-Goals

- No accounts, auth, or server-side storage.
- No central leaderboard service (comparison happens by opening friends' URLs).
- No exact-score prediction — picks are "which team advances" only.

## Architecture

A **single static page** (`index.html` + a little CSS + vanilla JS modules, no build step),
served from **GitHub Pages**. Two external touchpoints only:

1. **TheSportsDB** (keyless, CORS-enabled) — fetched at load for the Round-of-32 seed
   (who plays who) and for actual results used in scoring.
2. **The URL hash** — a friend's entire prediction is encoded in `location.hash`. Opening
   the link renders that bracket. The hash never reaches a server, so it works perfectly on
   static hosting.

### Modules (each independently testable)

- `api.js` — wraps TheSportsDB. Functions: `fetchKnockoutEvents()` → normalized list of
  `{round, homeTeam, awayTeam, homeScore, awayScore, status, date}`. Knows the round-code
  mapping (`intRound`: `32`→R32, `16`→R16, `8`→QF, `4`→SF, `2`/named→Final; see Round Mapping)
  and league/season constants. Pure data out; no DOM.
- `bracket.js` — the bracket model. A binary tree of 32 seeded teams. Given the 32 R32 teams
  and a pick array, derives the team at every node. Pure functions, no DOM, no network.
- `encode.js` — `encodePicks(picks, name)` ⇄ `decodePicks(hash)`. Picks are bits; serialized
  compactly into the hash. No DOM.
- `score.js` — given a prediction (derived bracket) + actual results, returns per-pick
  ✓/✗/pending and a round-weighted total. Pure.
- `ui.js` / `main.js` — render the bracket, wire clicks, read/write the hash, copy-share,
  refresh results. The only module touching the DOM/network-trigger.

## Bracket Model

WC 2026 knockouts form a binary tree of 32 teams (16 R32 matches) collapsing to a champion,
plus a separate 3rd-place playoff between the two SF losers.

- A complete prediction = **31 winner-picks** (one per match in the main tree) **+ 1**
  3rd-place pick = **32 picks**.
- Each pick is a single bit: which of the two sides at that node advances.
- Team at any node is **derived** by walking the tree from the R32 seed + the picks below it.
  This is why the URL only needs the bits, not team names.

## URL Sharing (state encoding)

The URL encodes **only the picks**, never team names. The 32 R32 teams come from the shared
seed fetched from the API, so every viewer interprets the same bracket identically.

- 32 one-bit picks → 4 bytes → ~6 chars of URL-safe base64.
- Format: `https://<site>/#p=<base64bits>&n=<name>`
  - `p` = packed pick bits.
  - `n` = optional URL-encoded display name ("whose bracket is this").
- Stored in `location.hash` (after `#`) so it never hits the server.
- Editing the bracket updates the hash live; a **Copy share link** button copies the current URL.
- Decoding is defensive: malformed/old hashes fall back to an empty bracket rather than erroring.

### Seed stability

R32 matchups are fetched from TheSportsDB and ordered deterministically (by date, then event
id) so a given pick-string maps to the same bracket for everyone. The resolved seed (32 team
names in canonical order) is also cached in `localStorage` so a returning user/link still
renders if the API is briefly down.

## Scoring

Round-weighted points for each **correct advancing pick**:

| Round   | Points |
|---------|--------|
| R32     | 1      |
| R16     | 2      |
| QF      | 4      |
| SF      | 8      |
| Final   | 16     |
| 3rd-place | 2    |

- Each pick shows ✓ (correct), ✗ (wrong), or **pending** (match not yet decided).
- A running **total** plus a **per-round breakdown** (e.g. "R32: 12/16") are shown.
- A pick only scores once its underlying real match has a final result; otherwise pending.
  Picks whose path was already busted still display, scored against reality where known.

## Data Freshness & Fallback

- Results refresh on page load and via a manual **Refresh** button.
- The **bracket builder always works offline**; only live scoring needs the network.
- If the API is unreachable or stale, affected picks stay **pending** (never falsely "wrong").

### Risk: free-tier data completeness (discovered during exploration)

Probing TheSportsDB (league 4429, season 2026) on 2026-06-29 confirmed WC2026 data exists and
knockout fixtures are appearing (e.g. an upcoming R32 fixture *South Africa vs Canada*,
`intRound` `"32"`), but the **free key returns sparse/lagged results** — the full-season
endpoint returned only a handful of events. Mitigation (recommended, user may veto in review):

- A tiny **manual results override**: an optional committed `results.json` (or a hidden
  admin-only hash param) the owner can edit to correct/supplement any match the API misses or
  reports late. Kept minimal — the API remains the primary source; this is only a safety valve
  so scoring is never blocked by free-tier gaps.

## Round Mapping (to verify at implementation time)

Observed: `intRound` `"32"` = Round of 32. Expected by symmetry: `16`=R16, `8`=QF, `4`=SF,
`2` or a "Final"/named round = Final, and a distinct round for the 3rd-place playoff. The exact
codes for QF/SF/Final/3rd-place must be confirmed against live data as those fixtures populate;
`api.js` will centralize this mapping so it's a one-line fix if codes differ.

## Hosting & Deployment

- **GitHub Pages** (pure static; no serverless functions needed).
- Repo root serves `index.html`; deploy via Pages from `main` (or `/docs`).
- No secrets, no env vars (keyless API).

## Testing / Verification

- **Unit (pure modules):** `bracket.js` tree derivation, `encode.js` round-trip
  (`decode(encode(x)) === x`, including malformed-hash fallback), `score.js` totals for
  hand-built fixtures.
- **API contract:** a recorded TheSportsDB sample → `api.js` normalization produces expected
  shape and round mapping.
- **End-to-end manual:** fill a bracket → copy link → open in a fresh tab/incognito →
  identical bracket renders; simulate results → scores match expectation; verify on the live
  GitHub Pages URL.

## Open Decision for User

- Keep the **manual results override** safety valve (recommended given the free-tier risk), or
  drop it for a pure-API build as originally chosen?
