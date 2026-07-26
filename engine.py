"""Equity calculation (Monte Carlo via eval7) and a heuristic fold/call/raise decision.

This is NOT a GTO solver. It's a fast pot-odds + equity heuristic tuned to run well
under the ~1s latency budget: equity vs an assumed opponent range (default: any two
random cards) compared to pot odds, plus a fixed sizing table for raises. Treat it as
a solid TAG-strategy aid, not a source of truth — vision can't see betting history or
opponents' real ranges, so treat "num_opponents" and range assumptions as approximations.
"""
from __future__ import annotations

import random
from dataclasses import dataclass

import eval7

import config


@dataclass
class Decision:
    action: str              # "FOLD" | "CHECK" | "CALL" | "RAISE"
    raise_to: float | None
    equity: float
    pot_odds: float
    reason: str


def _to_eval7(cards: list[str]) -> list[eval7.Card]:
    return [eval7.Card(c) for c in cards]


def calc_equity(
    hero_cards: list[str],
    board: list[str],
    num_opponents: int,
    trials: int = config.MONTE_CARLO_TRIALS,
) -> float:
    """Monte Carlo equity of hero's hand vs `num_opponents` random hands, given the board so far."""
    known_codes = set(hero_cards) | set(board)
    deck = eval7.Deck()
    deck.cards = [c for c in deck.cards if str(c) not in known_codes]

    hero = _to_eval7(hero_cards)
    known_board = _to_eval7(board)
    cards_needed = 2 * num_opponents + (5 - len(board))

    wins = 0.0
    for _ in range(trials):
        random.shuffle(deck.cards)
        draw = deck.cards[:cards_needed]
        opp_hands = [draw[i * 2 : i * 2 + 2] for i in range(num_opponents)]
        runout = known_board + draw[2 * num_opponents :]

        hero_score = eval7.evaluate(hero + runout)
        opp_scores = [eval7.evaluate(h + runout) for h in opp_hands]
        best_opp = max(opp_scores)

        if hero_score > best_opp:
            wins += 1.0
        elif hero_score == best_opp:
            wins += 1.0 / (1 + sum(1 for s in opp_scores if s == best_opp))

    return wins / trials


def _round_nice(amount: float) -> float:
    if amount < 20:
        return round(amount)
    if amount < 200:
        return round(amount / 5) * 5
    return round(amount / 10) * 10


def decide(
    hero_cards: list[str],
    board: list[str],
    pot: float,
    bet_to_call: float,
    num_opponents: int,
    hero_stack: float,
) -> Decision:
    equity = calc_equity(hero_cards, board, num_opponents)
    pot_odds = bet_to_call / (pot + bet_to_call) if bet_to_call > 0 else 0.0

    if bet_to_call <= 0:
        if equity >= 0.60:
            raise_to = _round_nice(min(hero_stack, pot * 0.66)) if pot > 0 else _round_nice(hero_stack * 0.1)
            return Decision("RAISE", raise_to, equity, pot_odds, f"{equity:.0%} equity, betting for value")
        return Decision("CHECK", None, equity, pot_odds, f"{equity:.0%} equity, not strong enough to bet")

    if equity >= pot_odds + 0.15:
        pot_sized_raise = bet_to_call + 0.75 * (pot + 2 * bet_to_call)
        raise_to = _round_nice(min(hero_stack, pot_sized_raise))
        return Decision("RAISE", raise_to, equity, pot_odds,
                         f"{equity:.0%} equity vs {pot_odds:.0%} pot odds, raising for value")
    if equity >= pot_odds:
        return Decision("CALL", None, equity, pot_odds,
                         f"{equity:.0%} equity vs {pot_odds:.0%} pot odds, profitable call")
    return Decision("FOLD", None, equity, pot_odds,
                     f"{equity:.0%} equity vs {pot_odds:.0%} pot odds, not enough")
