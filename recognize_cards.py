"""Card recognition via template matching against a pre-built 52-card template set.

Uses cv2.matchTemplate rather than an OCR/ML model: PokerNow-style card graphics are
static vector art, so a resized-crop-vs-template comparison is fast (<5ms) and reliable.
Run build_templates.py once to populate templates/ before this will find any matches.
"""
from __future__ import annotations

import cv2
import numpy as np

import config

CANONICAL_SIZE = (64, 89)  # (width, height) — crops and templates are compared at this size

RANKS = "23456789TJQKA"
SUITS = "shdc"

_TEMPLATES: dict[str, np.ndarray] | None = None


def _load_templates() -> dict[str, np.ndarray]:
    templates = {}
    for rank in RANKS:
        for suit in SUITS:
            code = f"{rank}{suit}"
            path = config.TEMPLATES_DIR / f"{code}.png"
            if path.exists():
                img = cv2.imread(str(path))
                if img is not None:
                    templates[code] = cv2.resize(img, CANONICAL_SIZE)
    return templates


def get_templates() -> dict[str, np.ndarray]:
    global _TEMPLATES
    if _TEMPLATES is None:
        _TEMPLATES = _load_templates()
    return _TEMPLATES


def recognize_card(crop: np.ndarray) -> str | None:
    """Match a region crop (RGB numpy array) against known card templates.

    Returns a card code like "Ah", or None if no template clears the confidence
    threshold (empty seat, face-down card, or an as-yet-uncaptured template).
    """
    templates = get_templates()
    if not templates:
        raise RuntimeError("No card templates found in templates/. Run build_templates.py first.")

    resized = cv2.resize(crop, CANONICAL_SIZE)
    # convert to BGR to match how templates were saved (cv2.imread default)
    resized_bgr = cv2.cvtColor(resized, cv2.COLOR_RGB2BGR)

    best_code, best_score = None, -1.0
    for code, template in templates.items():
        result = cv2.matchTemplate(resized_bgr, template, cv2.TM_CCOEFF_NORMED)
        score = float(result.max())
        if score > best_score:
            best_code, best_score = code, score

    if best_score < config.CARD_MATCH_THRESHOLD:
        return None
    return best_code
