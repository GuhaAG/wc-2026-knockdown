import { SLOT_COUNT, UNPICKED, emptyPicks } from "./bracket.js";

export const PICK_COUNT = SLOT_COUNT; // 32
const NUM_BYTES = Math.ceil((PICK_COUNT * 2) / 8); // 2 bits/pick -> 8 bytes

// Pick value <-> 2-bit code. 0b00 = unpicked, 0b01 = side A, 0b10 = side B.
function toCode(v) { return v === 0 ? 1 : v === 1 ? 2 : 0; }
function fromCode(c) { return c === 1 ? 0 : c === 2 ? 1 : UNPICKED; }

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
    const bit = i * 2;
    bytes[bit >> 3] |= (toCode(picks[i]) & 0b11) << (bit & 7);
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
  const picks = emptyPicks();
  const p = params.get("p");
  if (p) {
    try {
      const bytes = fromBase64Url(p);
      for (let i = 0; i < PICK_COUNT; i++) {
        const bit = i * 2;
        picks[i] = fromCode((bytes[bit >> 3] >> (bit & 7)) & 0b11);
      }
    } catch {
      // leave picks all-unpicked on malformed input
    }
  }
  return { picks, name };
}
