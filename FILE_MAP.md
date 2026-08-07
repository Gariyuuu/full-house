# FILE_MAP.md

Every `.py` file in the repo root, what it does, what calls it, what it calls, when
to edit it, and the risk of editing it. The `web/` directory (parallel browser
implementation) is out of primary scope for this pass — see README.md for its own
file-by-file breakdown; it is not repeated here.

## `main.py`

- **Purpose:** Orchestrator / entry point. Loads the calibrated layout, constructs
  `TableCapture` and `Overlay`, and drives the `tick()` poll loop.
- **Called by:** Nothing in-repo — this is the entry point, invoked via
  `python main.py` (directly, or via `run.sh`).
- **Calls:** `capture.load_layout`, `capture.TableCapture`, `overlay.Overlay`,
  `recognize_cards.recognize_card`, `recognize_text.read_number`,
  `state.TableState`, `engine.decide`, `config` (for poll intervals).
- **When to edit:** Changing polling cadence logic, the hero-turn detection
  heuristic (`_is_hero_turn`), what state gets read each tick (`_read_state`), or
  the terminal latency-logging format.
- **Edit risk:** Medium-high. This is the integration point for the whole
  pipeline — a mistake here breaks the entire run loop, not just one stage.
  `_is_hero_turn`'s threshold (`15.0`) is empirically tuned; changing it changes
  when the tool decides to "wake up," which affects both correctness (missed
  turns) and CPU usage (false-positive wakeups).

## `capture.py`

- **Purpose:** Fast, region-only screen capture via `mss`; loads
  `table_layout.json`.
- **Called by:** `main.py`, `build_templates.py`.
- **Calls:** `mss`, `numpy`, `config` (for `LAYOUT_PATH`).
- **When to edit:** Changing how regions are captured (e.g. multi-monitor support,
  a different capture backend), or the layout file format/location.
- **Edit risk:** Medium. `TableCapture.grab`'s BGRA→RGB channel reorder
  (`arr[:, :, [2, 1, 0]]`) is relied on by both `recognize_cards.py` (which
  converts back to BGR to match `cv2.imread`'s default) and `recognize_text.py`
  (which converts RGB→GRAY). Changing the channel order here without updating both
  downstream consumers will silently break recognition (colors will be wrong but
  no exception will be raised).

## `calibrate.py`

- **Purpose:** One-time interactive tool — screenshots the primary monitor, lets
  the user click-drag to mark each named region, writes `table_layout.json`.
- **Called by:** Nobody in-repo — run directly by the user (`python calibrate.py`).
- **Calls:** `mss`, `tkinter`, `PIL.Image`/`ImageTk`, `config` (for `LAYOUT_PATH`).
- **When to edit:** Adding/removing a region the pipeline needs (e.g. a new field
  to track), changing the picker UI/UX, or supporting a non-primary monitor
  (currently hardcoded to `sct.monitors[1]`).
- **Edit risk:** Medium. `FIXED_REGIONS` (the ordered list of required region
  keys/prompts) must stay in sync with every consumer that expects a specific key
  to exist in `table_layout.json` (`main.py`'s `BOARD_KEYS` and hardcoded
  `"hero_card_1"`/`"hero_stack"`/`"pot"`/`"bet_to_call"`/`"action_trigger"`
  lookups, `build_templates.py`'s `"hero_card_1"` lookup). Adding a key here
  without a corresponding consumer is harmless; renaming or removing a key that a
  consumer expects will raise a `KeyError` at runtime, not calibration time.

## `build_templates.py`

- **Purpose:** One-time interactive tool — captures a labeled PNG crop of the
  `hero_card_1` region for each of the 52 cards, saving to `templates/`. Idempotent
  (skips already-captured cards).
- **Called by:** Nobody in-repo — run directly by the user (`python
  build_templates.py`), after `calibrate.py`.
- **Calls:** `capture.load_layout`, `capture.TableCapture`, `cv2` (resize +
  color-convert + imwrite), `config` (for `TEMPLATES_DIR`), `recognize_cards`
  (imports `CANONICAL_SIZE`, `RANKS`, `SUITS` — must stay in sync with how
  `recognize_cards.py` loads and resizes templates).
- **When to edit:** Changing how templates are captured (e.g. capturing from a
  different region, batch-capturing multiple cards at once) or the save format.
- **Edit risk:** Medium. It shares `CANONICAL_SIZE` and the BGR color-convert step
  with `recognize_cards.py` — if these two files' resize/color-space handling
  drifts out of sync, every subsequent match will silently degrade (lower
  confidence scores) rather than error.

## `recognize_cards.py`

- **Purpose:** Card recognition via `cv2.matchTemplate` against the 52-card
  template set built by `build_templates.py`.
- **Called by:** `main.py` (`_read_state`, for hero + board cards).
- **Calls:** `cv2`, `numpy`, `config` (for `TEMPLATES_DIR`, `CARD_MATCH_THRESHOLD`).
- **When to edit:** Changing the recognition algorithm (e.g. swapping template
  matching for an ML classifier — a significant architectural change, see
  DECISIONS.md before doing this), tuning `CANONICAL_SIZE`, or fixing a
  card-misidentification bug.
- **Edit risk:** High. `get_templates()` caches the loaded template dict in a
  module-level global (`_TEMPLATES`) that is populated once and never invalidated
  — if templates are added/changed on disk mid-run, they won't be picked up
  without a process restart. `CANONICAL_SIZE` must match what `build_templates.py`
  saved templates at, or every match degrades. `CARD_MATCH_THRESHOLD` (in
  `config.py`) directly trades off false-negatives (empty results) vs.
  false-positives (wrong card recognized) — this affects live poker decisions.

## `recognize_text.py`

- **Purpose:** Restricted-vocabulary OCR (Tesseract, digit/currency whitelist) for
  stack/pot/bet-to-call numbers, with `1,250` / `$1,250` / `1.2K` / `1.2M` parsing.
- **Called by:** `main.py` (`_read_state`, for `hero_stack`, `pot`, `bet_to_call`,
  and each `opponent_stack_*`).
- **Calls:** `cv2` (grayscale + upscale + Otsu threshold), `pytesseract`, `re`,
  `config` (for `TESSERACT_CONFIG`).
- **When to edit:** Fixing OCR misreads on a specific table theme (usually via
  `_preprocess`'s threshold/upscale parameters or `config.TESSERACT_CONFIG`'s
  whitelist), or supporting a new number format (e.g. a currency symbol not yet
  handled).
- **Edit risk:** Medium. Requires the Tesseract system binary to be installed
  separately (`brew install tesseract`) — `pytesseract` only wraps it, it doesn't
  bundle it. A misconfigured `TESSERACT_CONFIG` whitelist will make legitimate
  numbers unreadable (returns `None`) rather than erroring loudly.

## `state.py`

- **Purpose:** `TableState` dataclass — the in-memory snapshot of one hand's
  visible table state (hero cards, board, stacks, pot, bet-to-call, opponent
  stacks), plus two derived properties (`street`, `num_opponents`) and a
  completeness check (`is_complete_for_decision`).
- **Called by:** `main.py` (`_read_state` constructs and populates it; `tick`
  reads `state.street`, `state.hero_cards`, `state.board` for the log line and
  `is_complete_for_decision()` to gate the decision call).
- **Calls:** Nothing beyond stdlib `dataclasses`.
- **When to edit:** Adding a new tracked field (e.g. betting history, position),
  changing the `street`/`num_opponents` derivation logic.
- **Edit risk:** Low-medium in isolation (it's a small, dependency-free dataclass),
  but medium in practice because `num_opponents`'s `max(1, len(opponent_stacks))`
  heuristic feeds directly into `engine.py`'s Monte Carlo simulation size —
  changing it changes the equity math for every decision.

## `engine.py`

- **Purpose:** Monte Carlo equity calculation (`eval7`) + pot-odds comparison +
  fixed bet/raise sizing table → a `Decision` dataclass.
- **Called by:** `main.py` (`tick`, via `decide(...)`).
- **Calls:** `eval7` (`Card`, `Deck`, `evaluate`), `random.shuffle`, `config` (for
  `MONTE_CARLO_TRIALS`).
- **When to edit:** Tuning the decision thresholds (equity vs. pot-odds margins),
  the sizing table (`_round_nice`, the `0.66`/`0.75` pot-fraction constants), or
  the opponent-range assumption (`config.OPPONENT_RANGE` is defined but — see
  Known issues — `calc_equity` does not actually branch on it; it always assumes
  "any two random cards" regardless of the config value).
- **Edit risk:** High. This is the file that actually produces the poker advice
  shown to the user. Any threshold change is a behavior change with real
  consequences for a live hand, and (per CLAUDE.md's DO NOT CHANGE section)
  `web/engine.js` is a manually cross-checked, independently-maintained port of
  this logic — changing thresholds here without updating there breaks the two
  versions' documented parity.

## `overlay.py`

- **Purpose:** Always-on-top, borderless Tkinter panel that renders the current
  `Decision` (or an idle state) in the bottom-right corner of the screen.
- **Called by:** `main.py` (constructed once, then `.show()`/`.show_idle()` called
  every tick; `.after()`/`.run()` drive the event loop itself).
- **Calls:** `tkinter`, `config` (for geometry constants), `engine.Decision` (type
  reference only).
- **When to edit:** Changing the overlay's visual design, position, or fields
  shown — see UI_SYSTEM.md for the full rendering detail.
- **Edit risk:** Low-medium. Self-contained UI code; the main risk is that
  `main.py`'s `tick()` loop is literally implemented via `overlay.after(...)`
  (Tkinter's own scheduler) rather than a separate timer — so a change here that
  breaks `Overlay.after` or `Overlay.run` breaks the entire polling loop, not just
  the display.

## `config.py`

- **Purpose:** Single source of truth for paths, polling cadence, equity trial
  budget, OCR whitelist, card-match threshold, and overlay geometry.
- **Called by:** Every other module in the pipeline (`capture`, `recognize_cards`,
  `recognize_text`, `engine`, `overlay`, `main`, `calibrate`, `build_templates`).
- **Calls:** `pathlib.Path` only.
- **When to edit:** Tuning any of the values documented in CLAUDE.md's
  Environment setup table. This is the primary, and often only, file that needs
  editing to retune the tool for a slower/faster machine or a different table
  theme's latency profile.
- **Edit risk:** Medium — it's a single flat file with no validation, so a typo'd
  path or an out-of-range threshold fails at the first call site that uses it, not
  at import time.

## `run.sh`

- **Purpose:** Bootstraps `.venv` if missing, installs `requirements.txt`, runs
  `python main.py`.
- **Called by:** The user, directly (`./run.sh`).
- **Calls:** `python3 -m venv`, `pip install`, `python main.py`.
- **When to edit:** Changing the bootstrap process (e.g. pinning a Python version,
  adding a pre-flight check for the Tesseract binary — currently absent, so a
  missing `tesseract` install fails at OCR-call time, not at `run.sh` time).
- **Edit risk:** Low. Small, `set -euo pipefail` shell script; the main
  risk is that it does not check for the Tesseract *system* binary, only the pip
  dependencies — an easy gap to introduce again if this script is refactored.

## Where to make common changes

| Task | File(s) to edit |
|---|---|
| Recalibrate capture regions (new table theme, window size, zoom) | Run `calibrate.py` interactively — no code edit needed, it overwrites `table_layout.json`. |
| Add/rebuild card-recognition templates | Run `build_templates.py` interactively — no code edit needed, it fills gaps in `templates/`. |
| Change what regions are calibrated (add a new tracked field) | `calibrate.py` (`FIXED_REGIONS`) **and** `main.py` (`_read_state`, `BOARD_KEYS`) **and** `state.py` (`TableState` fields) — all three must stay in sync. |
| Change engine/decision logic | `engine.py` (`decide`, `calc_equity`, `_round_nice`) — and consider `web/engine.js` for parity. |
| Change overlay UI (colors, layout, fields shown) | `overlay.py`, possibly `config.py` for geometry constants. See UI_SYSTEM.md. |
| Retune latency/accuracy tradeoff | `config.py` (`MONTE_CARLO_TRIALS`, poll intervals, `CARD_MATCH_THRESHOLD`). |
| Fix OCR misreads on a specific theme | `recognize_text.py` (`_preprocess`) or `config.py` (`TESSERACT_CONFIG`). |
| Fix card misidentification | `recognize_cards.py` (`CARD_MATCH_THRESHOLD` in `config.py`, or rebuild `templates/` via `build_templates.py`). |
