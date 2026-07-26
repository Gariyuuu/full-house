"""Fast partial-screen capture of calibrated table regions using mss."""
from __future__ import annotations

import json

import mss
import numpy as np

import config


def load_layout() -> dict:
    if not config.LAYOUT_PATH.exists():
        raise RuntimeError("No table_layout.json found — run calibrate.py first.")
    return json.loads(config.LAYOUT_PATH.read_text())


class TableCapture:
    def __init__(self, layout: dict):
        self.layout = layout
        self._sct = mss.mss()

    def grab(self, region_key: str) -> np.ndarray:
        region = self.layout[region_key]
        raw = self._sct.grab(region)
        arr = np.array(raw)  # BGRA
        return np.ascontiguousarray(arr[:, :, [2, 1, 0]])  # -> RGB

    def grab_all(self) -> dict:
        return {key: self.grab(key) for key in self.layout}

    def close(self):
        self._sct.close()
