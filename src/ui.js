import { feederSlots, winnerOf, loserOf, FINAL_SLOT } from "./bracket.js";
import { flagUrl, initials } from "./flags.js";

const ROUND_LABELS = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  Final: "Final",
};

function slotTeams(slot, seed, picks) {
  const f = feederSlots(slot);
  if (f === null) return [seed[slot * 2], seed[slot * 2 + 1]];
  return [winnerOf(f.a, seed, picks), winnerOf(f.b, seed, picks)];
}

function flagEl(team) {
  const wrap = document.createElement("span");
  wrap.className = "flag";
  const url = flagUrl(team);
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.loading = "lazy";
    wrap.appendChild(img);
  } else {
    wrap.classList.add("badge");
    wrap.textContent = initials(team);
  }
  return wrap;
}

function teamButton(slot, side, team, picks, perPick, decided) {
  const btn = document.createElement("button");
  btn.className = "team";
  btn.dataset.slot = String(slot);
  btn.dataset.side = String(side);
  btn.type = "button";

  const isPicked = picks[slot] === side;
  if (isPicked) btn.classList.add("picked");
  const pp = perPick && perPick[slot];
  if (pp && pp.correct !== null && isPicked) {
    btn.classList.add(pp.correct ? "correct" : "wrong");
  }
  // dim the side a finished match eliminated, even if it wasn't the pick
  if (decided && pp && pp.correct === false && !isPicked) btn.classList.add("advanced");

  btn.appendChild(flagEl(team));
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = team || "TBD";
  btn.appendChild(name);
  return btn;
}

function matchEl(slot, state, opts = {}) {
  const { seed, picks, perPick } = state;
  const wrap = document.createElement("div");
  wrap.className = "match";
  if (opts.className) wrap.className += " " + opts.className;
  wrap.dataset.slot = String(slot);

  const teams = opts.thirdPlace
    ? [loserOf(28, seed, picks), loserOf(29, seed, picks)]
    : slotTeams(slot, seed, picks);

  const pp = perPick && perPick[slot];
  const decided = !!(pp && pp.correct !== null);
  teams.forEach((team, side) => {
    wrap.appendChild(teamButton(slot, side, team, picks, perPick, decided));
  });
  return wrap;
}

function championCard(state) {
  const { seed, picks, perPick } = state;
  const champ = winnerOf(FINAL_SLOT, seed, picks);
  const card = document.createElement("div");
  card.className = "champion";
  const fp = perPick && perPick[FINAL_SLOT];
  if (fp && fp.correct === true) card.classList.add("confirmed");

  const eyebrow = document.createElement("span");
  eyebrow.className = "champion-eyebrow";
  eyebrow.textContent = fp && fp.correct === true ? "Champions" : "Your champion";
  card.appendChild(eyebrow);

  card.appendChild(flagEl(champ));

  const name = document.createElement("span");
  name.className = "champion-name";
  name.textContent = champ || "—";
  card.appendChild(name);
  return card;
}

// Two-sided wallchart split. Left half = everything feeding SF slot 28;
// right half = everything feeding SF slot 29 (built outer->inner so it mirrors).
const LEFT_HALF = [
  ["R32", [0, 1, 2, 3, 4, 5, 6, 7]],
  ["R16", [16, 17, 18, 19]],
  ["QF", [24, 25]],
  ["SF", [28]],
];
const RIGHT_HALF = [
  ["SF", [29]],
  ["QF", [26, 27]],
  ["R16", [20, 21, 22, 23]],
  ["R32", [8, 9, 10, 11, 12, 13, 14, 15]],
];

function roundColumn(roundKey, slots, state, sideClass) {
  const col = document.createElement("section");
  col.className = `round ${sideClass}`;
  col.dataset.r = roundKey;
  const h = document.createElement("h2");
  h.textContent = ROUND_LABELS[roundKey];
  col.appendChild(h);
  const matches = document.createElement("div");
  matches.className = "matches";
  for (const slot of slots) matches.appendChild(matchEl(slot, state));
  col.appendChild(matches);
  return col;
}

// state: { seed, picks, actualWinners, perPick }
export function renderBracket(container, state) {
  container.innerHTML = "";
  const rounds = document.createElement("div");
  rounds.className = "rounds";

  for (const [key, slots] of LEFT_HALF) {
    rounds.appendChild(roundColumn(key, slots, state, "lft"));
  }

  // center column: Final + champion + 3rd place
  const center = document.createElement("section");
  center.className = "round center";
  const fh = document.createElement("h2");
  fh.textContent = "Final";
  center.appendChild(fh);
  const fm = document.createElement("div");
  fm.className = "matches";
  fm.appendChild(matchEl(FINAL_SLOT, state, { className: "final-match" }));
  center.appendChild(fm);
  center.appendChild(championCard(state));
  const th = document.createElement("h2");
  th.className = "third-head";
  th.textContent = "Third place";
  center.appendChild(th);
  const tm = document.createElement("div");
  tm.className = "matches";
  tm.appendChild(matchEl(31, state, { thirdPlace: true, className: "third-match" }));
  center.appendChild(tm);
  rounds.appendChild(center);

  for (const [key, slots] of RIGHT_HALF) {
    rounds.appendChild(roundColumn(key, slots, state, "rgt"));
  }

  container.appendChild(rounds);
}
