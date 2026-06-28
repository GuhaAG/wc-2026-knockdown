import {
  ROUND_STARTS, ROUND_SIZES, ROUND_NAMES, feederSlots, winnerOf, loserOf, FINAL_SLOT,
} from "./bracket.js";
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

// state: { seed, picks, actualWinners, perPick }
export function renderBracket(container, state) {
  container.innerHTML = "";
  const rounds = document.createElement("div");
  rounds.className = "rounds";

  // main rounds R32..SF (Final handled in the finale column)
  for (let r = 0; r < ROUND_NAMES.length - 1; r++) {
    const col = document.createElement("section");
    col.className = "round";
    col.dataset.r = ROUND_NAMES[r];
    const h = document.createElement("h2");
    h.textContent = ROUND_LABELS[ROUND_NAMES[r]];
    col.appendChild(h);
    const matches = document.createElement("div");
    matches.className = "matches";
    for (let local = 0; local < ROUND_SIZES[r]; local++) {
      matches.appendChild(matchEl(ROUND_STARTS[r] + local, state));
    }
    col.appendChild(matches);
    rounds.appendChild(col);
  }

  // finale column: Final + champion + 3rd place
  const finale = document.createElement("section");
  finale.className = "round finale";

  const fh = document.createElement("h2");
  fh.textContent = "Final";
  finale.appendChild(fh);
  const fm = document.createElement("div");
  fm.className = "matches";
  fm.appendChild(matchEl(FINAL_SLOT, state, { className: "final-match" }));
  finale.appendChild(fm);

  finale.appendChild(championCard(state));

  const th = document.createElement("h2");
  th.className = "third-head";
  th.textContent = "Third place";
  finale.appendChild(th);
  const tm = document.createElement("div");
  tm.className = "matches";
  tm.appendChild(matchEl(31, state, { thirdPlace: true, className: "third-match" }));
  finale.appendChild(tm);

  rounds.appendChild(finale);
  container.appendChild(rounds);
}
