import { predictedWinners } from "./bracket.js";
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
  els.score.textContent = String(total);
  const decided = Object.values(perRound).reduce((n, r) => n + r.of, 0);
  els.score.title = decided
    ? Object.entries(perRound)
        .filter(([, r]) => r.of)
        .map(([round, r]) => `${round} ${r.got}/${r.of}`)
        .join(" · ")
    : "No results in yet";
  renderBracket(els.bracket, {
    seed: app.seed, picks: app.picks,
    actualWinners: app.actualWinners, perPick,
  });
}

function onPick(slot, side) {
  app.picks[slot] = side;
  // Downstream picks are re-derived on render; just resync + recompute.
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
    // Only adopt the API seed if it looks populated (>= first match present).
    if (seed[0]) app.seed = seed.map((t, i) => t || FALLBACK_SEED[i]);
    app.actualWinners = actualWinners;
    localStorage.setItem("wc2026:seed", JSON.stringify(app.seed));
    localStorage.setItem("wc2026:actual", JSON.stringify(actualWinners));
    setStatus(`Results updated. ${events.length} knockout matches known.`);
  } catch {
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
