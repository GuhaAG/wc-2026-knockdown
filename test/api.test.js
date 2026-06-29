import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeEvent, resolveBracket, fetchKnockoutEvents } from "../src/api.js";
import { feederSlots } from "../src/bracket.js";

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

test("seeds R32 into official bracket slots, not date order", () => {
  const mk = (id, h, a, date) => normalizeEvent({
    idEvent: id, idLeague: "4429", intRound: "32",
    strHomeTeam: h, strAwayTeam: a, intHomeScore: "", intAwayScore: "",
    dateEvent: date, strTimestamp: date + "T19:00:00",
  });
  // Intentionally out of bracket order; South Africa/Canada is earliest by date.
  const events = [
    mk("1", "South Africa", "Canada", "2026-06-28"),
    mk("2", "Brazil", "Japan", "2026-06-29"),
    mk("3", "Germany", "Paraguay", "2026-06-29"),
    mk("4", "Netherlands", "Morocco", "2026-06-30"),
  ];
  const { seed } = resolveBracket(events);
  // South Africa/Canada belongs in slot 2, Netherlands/Morocco in slot 3 —
  // and feederSlots(17) = {a:2,b:3}, so they meet in the same Round-of-16 match.
  assert.deepEqual([seed[4], seed[5]], ["South Africa", "Canada"]);
  assert.deepEqual([seed[6], seed[7]], ["Netherlands", "Morocco"]);
  assert.deepEqual(feederSlots(17), { a: 2, b: 3 });
  // Brazil/Japan is NOT adjacent to South Africa/Canada (the old bug).
  assert.deepEqual([seed[16], seed[17]], ["Brazil", "Japan"]); // slot 8
});

test("fetchKnockoutEvents merges + filters via injected fetch", async () => {
  const fakeFetch = async () => ({ json: async () => sample });
  const evs = await fetchKnockoutEvents(fakeFetch);
  // only knockout rounds kept; all 3 are knockout
  assert.equal(evs.length, 3);
  assert.ok(evs.every((e) => typeof e.id === "string"));
});
