# FEATURES.md

Status classifications used below: **Verified complete** (traced end-to-end in
source, syntax-valid, deps import — but not live-tested) / **Mostly complete** /
**Partially implemented** / **Mocked** / **Planned** / **Broken** / **Deprecated**
/ **Unable to verify** (requires live conditions this audit couldn't produce).

## 1. Screen capture

- **Purpose:** Grab only the calibrated table regions from the screen, fast enough
  to fit inside the overall ~1s decision budget, without a full-screen capture.
- **Flow:** `calibrate.py` (one-time) writes region coordinates to
  `table_layout.json` → `capture.py`'s `TableCapture.grab(region_key)` uses `mss`
  to grab just that region → converts BGRA to RGB numpy array.
- **Status: Verified complete (source-level); Unable to verify (live accuracy).**
  The code is fully wired, syntactically valid, and `mss` imports successfully.
  Whether capture actually produces usable crops against a real table requires a
  live table on screen, which this audit did not have.
- **Files:** `capture.py`, `calibrate.py`, `config.py` (`LAYOUT_PATH`).
- **Known issues:** Hardcoded to the primary monitor (`sct.monitors[1]` in
  `calibrate.py`) — no multi-monitor selection UI. No calibration file exists in
  this checkout (gitignored, user-generated).
- **Remaining work:** None identified as unfinished in source; live verification
  is the main outstanding item.

## 2. Card recognition

- **Purpose:** Identify hero's hole cards and the board cards from screen crops.
- **Flow:** `build_templates.py` (one-time) captures a labeled PNG per card into
  `templates/` → `recognize_cards.py` resizes a live crop to `CANONICAL_SIZE` and
  runs `cv2.matchTemplate` against all loaded templates, returning the
  highest-scoring code above `CARD_MATCH_THRESHOLD` (0.75) or `None`.
- **Status: Verified complete (source-level); Unable to verify (live accuracy).**
  Logic is fully wired and syntax-valid; `opencv-python` imports successfully.
  This checkout's `templates/` directory is empty (gitignored, user-generated) —
  recognition cannot run at all until a user runs `build_templates.py`
  themselves, which is expected/by-design, not a defect.
- **Files:** `recognize_cards.py`, `build_templates.py`, `config.py`
  (`TEMPLATES_DIR`, `CARD_MATCH_THRESHOLD`).
- **Known issues:** Template set is theme-specific — a site redesign invalidates
  all 52 templates (see ARCHITECTURE.md "Major architectural risks"). Module-level
  template cache (`_TEMPLATES`) is never invalidated at runtime.
- **Remaining work:** None identified as unfinished in source; live verification
  and template-set population are the outstanding items (both explicitly deferred
  to per-user setup by design).

## 3. Text/number recognition (OCR)

- **Purpose:** Read hero's stack, the pot, bet-to-call, and each opponent's stack
  as numbers from screen crops.
- **Flow:** `recognize_text.py` grayscales + 2x upscales + Otsu-thresholds a crop,
  runs `pytesseract.image_to_string` with a digit/currency-only whitelist
  (`config.TESSERACT_CONFIG`), strips formatting (`,`, `$`), and expands `K`/`M`
  suffixes into a `float`.
- **Status: Verified complete (source-level); Unable to verify (live accuracy).**
  Logic is fully wired and syntax-valid; `pytesseract` imports successfully and
  the Tesseract 5.5.3 system binary is present on this machine via Homebrew.
- **Files:** `recognize_text.py`, `config.py` (`TESSERACT_CONFIG`).
- **Known issues:** Requires the Tesseract binary as a separate system dependency
  (not a pip package) — no runtime check exists for its presence; a missing
  install fails at the first OCR call, not at startup.
- **Remaining work:** None identified as unfinished in source; live accuracy
  verification is the outstanding item.

## 4. Hand-strength / decision engine

- **Purpose:** Turn recognized cards + stack/pot numbers into a fold/call/raise
  recommendation with a suggested sizing.
- **Flow:** `engine.decide(...)` calls `calc_equity` (Monte Carlo simulation via
  `eval7`, default 20,000 trials, vs. `num_opponents` random hands) → computes pot
  odds from `bet_to_call`/`pot` → compares equity to pot odds with a fixed margin
  (`+0.15` for a value raise, `0` for a call) → sizes any raise via `_round_nice`
  (a "round to a clean number" heuristic, not a solver-derived size) → returns a
  `Decision`.
- **Status: Verified complete (source-level); Unable to verify (live accuracy /
  advice quality).** Fully wired, syntax-valid, `eval7` imports and is
  installed (though at a version below what `requirements.txt` pins — see Known
  issues below). The equity math itself is a standard Monte Carlo technique with
  no obvious implementation flaw found on inspection, but this audit did not run
  it against known hand/equity pairs to numerically confirm correctness (the
  README claims the browser port `web/engine.js` was cross-checked against
  `engine.py` for AA/72o heads-up equity, but that cross-check artifact is not
  reproduced or re-verified here).
- **Files:** `engine.py`, `config.py` (`MONTE_CARLO_TRIALS`, `OPPONENT_RANGE`).
- **Known issues:** `config.OPPONENT_RANGE` ("random"/"loose"/"tight") is defined
  but **never read by `engine.py`** — it is a documented-but-unimplemented knob;
  opponent range is always "any two random cards" regardless of this setting (see
  CLAUDE.md Known issues). `eval7` installed version (`0.1.10`) does not satisfy
  `requirements.txt`'s pin (`>=0.1.11`) in this repo's `.venv`.
- **Remaining work:** Implementing the `OPPONENT_RANGE` "loose"/"tight" behavior
  the config already advertises (currently a no-op), and resolving the `eval7`
  version discrepancy.

## 5. Overlay display

- **Purpose:** Show the current recommendation in an always-on-top,
  hard-to-miss-but-out-of-the-way panel while the user plays.
- **Flow:** `overlay.Overlay` builds a small (`260x140` default), borderless,
  bottom-right-pinned Tkinter window with three labels (action, detail, reason).
  `main.py` calls `.show(decision)` or `.show_idle(text)` every tick; `.after()`
  drives the entire polling loop (see ARCHITECTURE.md).
- **Status: Verified complete (source-level); Unable to verify (renders
  correctly on screen).** Fully wired and syntax-valid; `tkinter` is part of the
  Python standard library, no separate install/import risk. Not launched in this
  session (a GUI window with no meaningful live data would not have validated
  anything beyond "Tkinter is installed").
- **Files:** `overlay.py`, `config.py` (`OVERLAY_WIDTH/HEIGHT/MARGIN`).
- **Known issues:** None identified in source. See UI_SYSTEM.md for full detail.
- **Remaining work:** None identified as unfinished in source; live visual
  verification is the outstanding item.

## 6. Browser version (`web/`) — secondary, out of primary scope

Per the task defining this documentation pass, the desktop Python assistant is
the primary subject; `web/` is a parallel, independently-implemented client-side
version documented in its own right by README.md's "Browser version" section.
Not classified feature-by-feature here. Flagged for awareness only: it is a real,
substantial, separately-deployed codebase (GitHub Pages, via
`.github/workflows/deploy-web.yml`) sharing this repo, and its `engine.js` is
meant to stay in decision-parity with `engine.py` (see CLAUDE.md's DO NOT CHANGE
section).
