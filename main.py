"""Polls the calibrated table regions and updates the overlay with a decision whenever
it's hero's turn. Run calibrate.py and build_templates.py first.
"""
from __future__ import annotations

import time

import numpy as np

import capture
import config
import recognize_cards
import recognize_text
from engine import decide
from overlay import Overlay
from state import TableState

BOARD_KEYS = ("board_card_1", "board_card_2", "board_card_3", "board_card_4", "board_card_5")


def _is_hero_turn(cap: capture.TableCapture) -> bool:
    """Heuristic: the action_trigger region is 'active' if it isn't near-blank.
    If this misfires on your table's theme, swap it for a template match against
    the actual button graphics instead of a brightness/variance check.
    """
    crop = cap.grab("action_trigger")
    return float(np.std(crop)) > 15.0


def _read_state(cap: capture.TableCapture) -> TableState:
    state = TableState()

    hc1 = recognize_cards.recognize_card(cap.grab("hero_card_1"))
    hc2 = recognize_cards.recognize_card(cap.grab("hero_card_2"))
    state.hero_cards = [c for c in (hc1, hc2) if c]

    for key in BOARD_KEYS:
        card = recognize_cards.recognize_card(cap.grab(key))
        if card:
            state.board.append(card)

    state.hero_stack = recognize_text.read_number(cap.grab("hero_stack")) or 0.0
    state.pot = recognize_text.read_number(cap.grab("pot")) or 0.0
    state.bet_to_call = recognize_text.read_number(cap.grab("bet_to_call")) or 0.0

    for key in cap.layout:
        if key.startswith("opponent_stack_"):
            value = recognize_text.read_number(cap.grab(key))
            if value is not None:
                state.opponent_stacks[key] = value

    return state


def tick(cap: capture.TableCapture, overlay: Overlay):
    t0 = time.perf_counter()

    if not _is_hero_turn(cap):
        overlay.show_idle()
        overlay.after(int(config.IDLE_POLL_INTERVAL_S * 1000), lambda: tick(cap, overlay))
        return

    state = _read_state(cap)
    if not state.is_complete_for_decision():
        overlay.show_idle("your turn, but couldn't read hole cards")
        overlay.after(int(config.ACTIVE_POLL_INTERVAL_S * 1000), lambda: tick(cap, overlay))
        return

    decision = decide(
        hero_cards=state.hero_cards,
        board=state.board,
        pot=state.pot,
        bet_to_call=state.bet_to_call,
        num_opponents=state.num_opponents,
        hero_stack=state.hero_stack,
    )
    overlay.show(decision)

    elapsed_ms = (time.perf_counter() - t0) * 1000
    print(
        f"[tick] {elapsed_ms:.0f}ms  {state.street}  "
        f"{state.hero_cards}+{state.board}  -> {decision.action}"
    )

    overlay.after(int(config.ACTIVE_POLL_INTERVAL_S * 1000), lambda: tick(cap, overlay))


def main():
    layout = capture.load_layout()
    cap = capture.TableCapture(layout)
    overlay = Overlay()

    overlay.after(100, lambda: tick(cap, overlay))
    try:
        overlay.run()
    finally:
        cap.close()


if __name__ == "__main__":
    main()
