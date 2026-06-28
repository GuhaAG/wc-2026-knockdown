import {
  ROUND_STARTS, ROUND_SIZES, ROUND_NAMES, feederSlots, winnerOf, loserOf,
} from "./bracket.js";

// Build the two team labels for a slot from current seed+picks.
function slotTeams(slot, seed, picks) {
  const f = feederSlots(slot);
  if (f === null) return [seed[slot * 2], seed[slot * 2 + 1]];
  return [winnerOf(f.a, seed, picks), winnerOf(f.b, seed, picks)];
}

// state: { seed, picks, actualWinners, perPick }
export function renderBracket(container, state) {
  const { seed, picks, perPick } = state;
  container.innerHTML = "";

  function matchEl(slot, isThird = false) {
    const wrap = document.createElement("div");
    wrap.className = "match";
    const teams = isThird
      ? [loserOf(28, seed, picks), loserOf(29, seed, picks)]
      : slotTeams(slot, seed, picks);
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

  for (let r = 0; r < ROUND_NAMES.length; r++) {
    const col = document.createElement("section");
    col.className = "round";
    const h = document.createElement("h2");
    h.textContent = ROUND_NAMES[r];
    col.appendChild(h);
    for (let local = 0; local < ROUND_SIZES[r]; local++) {
      const slot = ROUND_STARTS[r] + local;
      col.appendChild(matchEl(slot));
    }
    container.appendChild(col);
  }

  // 3rd-place block (contestants are the SF losers under current picks)
  const tp = document.createElement("section");
  tp.className = "round third";
  const th = document.createElement("h2");
  th.textContent = "3rd place";
  tp.appendChild(th);
  tp.appendChild(matchEl(31, true));
  container.appendChild(tp);
}
