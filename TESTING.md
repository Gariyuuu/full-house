# TESTING.md

## Current test strategy: none (no automated test suite exists)

Verified by inspection: there is no `tests/` directory, no file matching
`test_*.py`/`*_test.py`, no `pytest`/`unittest`/`nose` import anywhere in the
repo, and no test step in the only GitHub Actions workflow present
(`.github/workflows/deploy-web.yml`, which deploys `web/` to GitHub Pages and
performs no testing). `requirements.txt` does not list a test framework.

This is a real gap, not a misunderstanding — see TASKS.md's "Testing needed"
section and DECISIONS.md's note on why this is likely the case (recognition
accuracy is fundamentally tied to live screen content and a real table theme,
which resists conventional unit testing without a fixture/golden-image harness
that doesn't exist here).

## What this audit verified (2026-08-06)

Since no test suite exists, this documentation audit ran the closest available
non-destructive, non-live checks:

1. **Syntax validation:** `python3 -m py_compile` against all 10 root `.py`
   files (`build_templates.py`, `calibrate.py`, `capture.py`, `config.py`,
   `engine.py`, `main.py`, `overlay.py`, `recognize_cards.py`,
   `recognize_text.py`, `state.py`) — **all 10 passed cleanly.**
2. **Dependency import check:** inside the repo's own `.venv`, confirmed
   `cv2`, `eval7`, `mss`, `pytesseract`, `numpy`, and `PIL` all import
   successfully with no errors.
3. **System dependency check:** confirmed the Tesseract binary is present on
   this machine (`tesseract 5.5.3`, Homebrew, `/opt/homebrew/bin/tesseract`).
4. **Static risk-marker search:** repo-wide grep for
   `TODO|FIXME|HACK|XXX|WIP|placeholder|not implemented|dummy|hardcoded` across
   all `.py` files — **zero matches.** Also checked for bare `except:` and
   empty `except`/`pass` blocks — **zero matches.**
5. **Secrets scan:** repo-wide grep for
   `api[_-]?key|secret|password|token` across all `.py`, `.js`, and `.html`
   files — **zero matches.**

## What this audit explicitly could NOT verify

Per the task's own instruction, the live screen-capture/overlay tool was **not
launched** — it requires a real poker table visible on screen to be meaningful,
and this environment has neither a display with a live table nor a safe way to
simulate one. Specifically unverified:

- Whether `calibrate.py`'s click-drag region picker actually produces usable
  regions against a real browser window.
- Whether `recognize_cards.py`'s template matching actually identifies cards
  correctly against a real table's card graphics (no templates exist in this
  checkout to even attempt this against).
- Whether `recognize_text.py`'s OCR actually reads stack/pot/bet-to-call numbers
  correctly against a real table's font/theme.
- Whether `main.py`'s `_is_hero_turn` heuristic (pixel-stddev threshold on the
  `action_trigger` region) correctly detects turn transitions on a real table,
  without false positives/negatives.
- Whether `engine.py`'s Monte Carlo equity output is numerically correct against
  known reference values (e.g. AA vs. random heads-up ≈ 85% equity) — the README
  claims this was cross-checked for the browser port (`web/engine.js`) against
  `engine.py`, but that cross-check is not reproduced or independently
  re-verified by this audit.
- Whether `overlay.py`'s Tkinter window actually renders, positions, and updates
  correctly on a live display.
- End-to-end per-tick latency against the ~1s budget described in
  `config.py`/README — the benchmarked numbers cited in `config.py`'s comments
  were not re-measured in this environment.

## Manual smoke-test checklist (for verifying a session before relying on it)

Recommended pre-session checklist, derived from the actual setup flow described
in README.md and the pipeline traced in ARCHITECTURE.md — run this after any
recalibration or table-theme change, before trusting the tool in a real hand:

1. **Environment sanity**
   - [ ] `tesseract --version` succeeds (system binary installed).
   - [ ] `source .venv/bin/activate && python -c "import cv2, eval7, mss, pytesseract"` succeeds with no import errors.
2. **Calibration**
   - [ ] Run `python calibrate.py` with the target table window frontmost.
   - [ ] Confirm every printed region (`{key}: {left, top, width, height}`)
     visually corresponds to the right part of the table (spot-check by
     comparing the printed coordinates against the table window's known
     position/size, or by re-running and watching the drag boxes land
     correctly).
   - [ ] Confirm `table_layout.json` was written (`ls table_layout.json`).
3. **Card templates**
   - [ ] Run `python build_templates.py` and work through as many of the 52
     cards as practical (a practice/empty table works, per the README).
   - [ ] Confirm the final "N/52 templates captured" count matches expectation;
     re-run later to fill gaps (it's idempotent/incremental).
4. **Dry run**
   - [ ] Run `./run.sh` (or `python main.py` with `.venv` activated) with the
     table visible and NOT your turn — confirm the overlay shows the idle state
     ("waiting for hand...") and the terminal is quiet (no `[tick]` spam,
     since idle ticks don't print).
   - [ ] Bring your turn around — confirm the overlay updates to a
     FOLD/CHECK/CALL/RAISE recommendation and a `[tick] Nms ...` line prints to
     the terminal.
   - [ ] Check the printed tick latency stays reasonably under ~1s; if not, see
     README's "Tuning latency" section (lower `MONTE_CARLO_TRIALS`, shrink
     regions).
   - [ ] Spot-check the recommendation against your own read of the hand for at
     least a few hands before trusting it unattended — remember this is a
     heuristic aid (see README's "What it actually is"), not a source of truth.
5. **Regression trigger:** any time the table window is resized, the browser
   zoom level changes, or the table site changes its visual theme, redo steps
   2-4 — none of the calibration/template state carries over across such a
   change.

This checklist has **not been executed** as part of this documentation audit
(no live table available) — it is provided as the recommended process for
whoever next has access to a live table, per TASKS.md TASK-003.
