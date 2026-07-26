/**
 * From-scratch 7-card hand evaluator + Monte Carlo equity + heuristic decision.
 * Ported from ../engine.py so both versions make the same call given the same inputs.
 * Not a GTO solver — see README for what this heuristic does and doesn't account for.
 */
import { CONFIG } from "./config.js";

export const RANKS = "23456789TJQKA";
export const SUITS = "shdc";

export const DECK = [];
for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);

function rankValue(ch) {
  return RANKS.indexOf(ch) + 2;
}

export function parseCard(code) {
  return { rank: rankValue(code[0]), suit: code[1] };
}

// All C(7,5) = 21 index combinations, precomputed once.
const COMBOS_7_5 = (() => {
  const combos = [];
  const chosen = [];
  (function choose(start) {
    if (chosen.length === 5) {
      combos.push([...chosen]);
      return;
    }
    for (let i = start; i < 7; i++) {
      chosen.push(i);
      choose(i + 1);
      chosen.pop();
    }
  })(0);
  return combos;
})();

/** Score a single 5-card hand. Higher is better. Category dominates tiebreakers
 * (each hand is encoded as category then up to 5 base-15 tiebreaker digits, so a
 * higher category always outscores every possible tiebreaker combination below it). */
function evaluate5(cards) {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const uniqueRanks = [...new Set(ranks)];
  let isStraight = false;
  let straightHigh = 0;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    } else if (uniqueRanks.join(",") === "14,5,4,3,2") {
      isStraight = true; // wheel: A-2-3-4-5, plays as a 5-high straight
      straightHigh = 5;
    }
  }

  const counts = new Map();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
  const groups = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  let category;
  let tiebreak;
  if (isStraight && isFlush) {
    category = 8;
    tiebreak = [straightHigh];
  } else if (groups[0].count === 4) {
    category = 7;
    tiebreak = [groups[0].rank, groups[1].rank];
  } else if (groups[0].count === 3 && groups[1].count === 2) {
    category = 6;
    tiebreak = [groups[0].rank, groups[1].rank];
  } else if (isFlush) {
    category = 5;
    tiebreak = ranks;
  } else if (isStraight) {
    category = 4;
    tiebreak = [straightHigh];
  } else if (groups[0].count === 3) {
    const kickers = ranks.filter((r) => r !== groups[0].rank).slice(0, 2);
    category = 3;
    tiebreak = [groups[0].rank, ...kickers];
  } else if (groups[0].count === 2 && groups[1].count === 2) {
    const [hi, lo] = [groups[0].rank, groups[1].rank].sort((a, b) => b - a);
    category = 2;
    tiebreak = [hi, lo, groups[2].rank];
  } else if (groups[0].count === 2) {
    const kickers = ranks.filter((r) => r !== groups[0].rank).slice(0, 3);
    category = 1;
    tiebreak = [groups[0].rank, ...kickers];
  } else {
    category = 0;
    tiebreak = ranks;
  }

  const padded = tiebreak.concat(Array(5 - tiebreak.length).fill(0));
  let score = category;
  for (const t of padded) score = score * 15 + t;
  return score;
}

export function evaluate7(cards7) {
  let best = -1;
  for (const combo of COMBOS_7_5) {
    const score = evaluate5(combo.map((i) => cards7[i]));
    if (score > best) best = score;
  }
  return best;
}

function partialShuffle(arr, n) {
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function calcEquity(heroCards, board, numOpponents, trials = CONFIG.monteCarloTrials) {
  const known = new Set([...heroCards, ...board]);
  const deck = DECK.filter((c) => !known.has(c));

  const hero = heroCards.map(parseCard);
  const knownBoard = board.map(parseCard);
  const cardsNeeded = 2 * numOpponents + (5 - board.length);

  let wins = 0;
  for (let t = 0; t < trials; t++) {
    partialShuffle(deck, cardsNeeded);
    const draw = deck.slice(0, cardsNeeded).map(parseCard);
    const oppHands = [];
    for (let i = 0; i < numOpponents; i++) oppHands.push(draw.slice(i * 2, i * 2 + 2));
    const runout = knownBoard.concat(draw.slice(2 * numOpponents));

    const heroScore = evaluate7(hero.concat(runout));
    const oppScores = oppHands.map((h) => evaluate7(h.concat(runout)));
    const bestOpp = Math.max(...oppScores);

    if (heroScore > bestOpp) {
      wins += 1;
    } else if (heroScore === bestOpp) {
      const tied = oppScores.filter((s) => s === bestOpp).length;
      wins += 1 / (1 + tied);
    }
  }
  return wins / trials;
}

function roundNice(amount) {
  if (amount < 20) return Math.round(amount);
  if (amount < 200) return Math.round(amount / 5) * 5;
  return Math.round(amount / 10) * 10;
}

export function decide({ heroCards, board, pot, betToCall, numOpponents, heroStack, trials }) {
  const equity = calcEquity(heroCards, board, numOpponents, trials);
  const potOdds = betToCall > 0 ? betToCall / (pot + betToCall) : 0;
  const pct = (x) => `${(x * 100).toFixed(0)}%`;

  if (betToCall <= 0) {
    if (equity >= 0.6) {
      const raiseTo = pot > 0
        ? roundNice(Math.min(heroStack, pot * 0.66))
        : roundNice(heroStack * 0.1);
      return { action: "RAISE", raiseTo, equity, potOdds, reason: `${pct(equity)} equity, betting for value` };
    }
    return { action: "CHECK", raiseTo: null, equity, potOdds, reason: `${pct(equity)} equity, not strong enough to bet` };
  }

  if (equity >= potOdds + 0.15) {
    const potSizedRaise = betToCall + 0.75 * (pot + 2 * betToCall);
    const raiseTo = roundNice(Math.min(heroStack, potSizedRaise));
    return {
      action: "RAISE", raiseTo, equity, potOdds,
      reason: `${pct(equity)} equity vs ${pct(potOdds)} pot odds, raising for value`,
    };
  }
  if (equity >= potOdds) {
    return {
      action: "CALL", raiseTo: null, equity, potOdds,
      reason: `${pct(equity)} equity vs ${pct(potOdds)} pot odds, profitable call`,
    };
  }
  return {
    action: "FOLD", raiseTo: null, equity, potOdds,
    reason: `${pct(equity)} equity vs ${pct(potOdds)} pot odds, not enough`,
  };
}
