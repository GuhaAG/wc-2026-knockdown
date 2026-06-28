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
