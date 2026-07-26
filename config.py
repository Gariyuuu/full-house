"""Central config: paths, polling rate, equity trial budget, OCR settings."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
TEMPLATES_DIR = PROJECT_ROOT / "templates"
LAYOUT_PATH = PROJECT_ROOT / "table_layout.json"

# Polling loop
IDLE_POLL_INTERVAL_S = 0.3   # how often to check whether it's hero's turn
ACTIVE_POLL_INTERVAL_S = 0.15  # how often to re-check state once it's hero's turn

# Equity engine
# Benchmarked at ~35ms/4k trials, ~160ms/20k trials (KK on K72 vs 3 opponents, worst case
# tried) — 20k trials leaves plenty of headroom under the 1s budget once capture+OCR are
# added, for a noticeably tighter equity estimate than 4k. Lower this if your machine is
# slower and main.py's printed tick times start creeping past ~1s.
MONTE_CARLO_TRIALS = 20000
OPPONENT_RANGE = "random"        # "random" | "loose" | "tight" — see engine.py

# OCR (numbers only — stacks, pot, bet-to-call)
TESSERACT_CONFIG = "--psm 7 -c tessedit_char_whitelist=0123456789.,$KM"

# Card template matching
CARD_MATCH_THRESHOLD = 0.75  # min cv2.matchTemplate confidence to accept a card

# Overlay
OVERLAY_WIDTH = 260
OVERLAY_HEIGHT = 140
OVERLAY_MARGIN = 20  # px from screen edge
