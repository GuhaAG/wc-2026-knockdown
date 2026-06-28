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
