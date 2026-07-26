"""Populate templates/ with a labeled crop for each of the 52 cards.

Run after calibrate.py. Repeatedly captures whatever is currently showing in the
hero_card_1 region — show/deal yourself each requested card in turn (a practice table
works well), or answer 's' to skip and fill in the rest in a later session. Safe to
re-run: already-captured templates are skipped automatically.
"""
from __future__ import annotations

import cv2

import capture
import config
from recognize_cards import CANONICAL_SIZE, RANKS, SUITS


def main():
    layout = capture.load_layout()
    cap = capture.TableCapture(layout)
    config.TEMPLATES_DIR.mkdir(exist_ok=True)

    deck = [f"{r}{s}" for r in RANKS for s in SUITS]
    remaining = [c for c in deck if not (config.TEMPLATES_DIR / f"{c}.png").exists()]

    print(f"{len(remaining)} of {len(deck)} card templates still needed.\n")
    print("Show each requested card face-up in the HERO CARD 1 region, then press Enter.")
    print("Type 's' + Enter to skip a card you can't show right now.\n")

    for code in remaining:
        answer = input(f"Show {code} now, then press Enter (or 's' to skip): ").strip().lower()
        if answer == "s":
            continue
        crop = cap.grab("hero_card_1")
        resized = cv2.resize(crop, CANONICAL_SIZE)
        bgr = cv2.cvtColor(resized, cv2.COLOR_RGB2BGR)  # match cv2.imread's default channel order
        cv2.imwrite(str(config.TEMPLATES_DIR / f"{code}.png"), bgr)
        print(f"  saved {code}.png")

    cap.close()
    have = len(deck) - len([c for c in deck if not (config.TEMPLATES_DIR / f"{c}.png").exists()])
    print(f"\n{have}/{len(deck)} templates captured.")


if __name__ == "__main__":
    main()
