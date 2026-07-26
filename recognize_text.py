"""Restricted-vocabulary OCR for numeric table fields (stacks, pot, bet-to-call)."""
from __future__ import annotations

import re

import cv2
import numpy as np
import pytesseract

import config

_NUMBER_RE = re.compile(r"[\d.]+")


def _preprocess(crop: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    # upscale small text crops for more reliable OCR
    gray = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh


def read_number(crop: np.ndarray) -> float | None:
    """OCR a region crop (RGB numpy array) expected to contain a single dollar/chip amount.

    Handles "1,250", "$1,250", "1.2K" style displays. Returns None if nothing numeric found.
    """
    processed = _preprocess(crop)
    raw = pytesseract.image_to_string(processed, config=config.TESSERACT_CONFIG)
    raw = raw.strip().upper().replace(",", "").replace("$", "")

    multiplier = 1.0
    if raw.endswith("K"):
        multiplier, raw = 1_000.0, raw[:-1]
    elif raw.endswith("M"):
        multiplier, raw = 1_000_000.0, raw[:-1]

    match = _NUMBER_RE.search(raw)
    if not match:
        return None
    try:
        return float(match.group()) * multiplier
    except ValueError:
        return None
