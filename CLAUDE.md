# CLAUDE.md — Operating Manual for Full House

## Project identity

Full House is a **screen-scraping poker assistant** for **friendly, no-money home
games** on virtual table sites (the README names PokerNow.club as the reference
target). It watches calibrated regions of the screen, recognizes hole cards / board
cards / stack sizes / pot / bet-to-call, runs a Monte Carlo equity calculation, and
shows a fold/call/raise recommendation in an always-on-top overlay.

**Explicit scope constraint — this is not a suggestion, it defines correct behavior
for this tool:** Full House was built and is documented for **chip-only, friendly
games with no money on the line.** It must never be positioned, marketed, or extended
as a tool for real-money poker platforms or online cardrooms. Real-money use is
out of scope by design (see ROADMAP.md "Out of scope" and SECURITY.md). Most online
poker sites' terms of service prohibit screen-scraping assistance tools; treating this
as a friendly-game analytical aid (and telling your group you're running it, per the
README) is the intended and only supported use case. Any future task that would make
this tool viable against a real-money platform (anti-detection, obfuscation, faster
covert capture, etc.) is against the spirit of this project and should be refused or
raised with the user rather than implemented silently.

There are **two parallel implementations** in this repo:
- **Desktop (Python)** — the primary implementation, root-level files
  (`capture.py`, `recognize_cards.py`, `recognize_text.py`, `state.py`, `engine.py`,
  `overlay.py`, `main.py`, plus the one-time setup scripts `calibrate.py` and
  `build_templates.py`). This is the documentation system's primary subject.
  Silent background capture via `mss`, always-on-top Tkinter overlay, `eval7`-powered
  equity via Monte Carlo simulation.
- **Browser (`web/`)** — a from-scratch client-side reimplementation (vanilla JS,
  no build step), not a port of the Python code. It exists in the same repo and
  deploys to GitHub Pages via `.github/workflows/deploy-web.yml`, but it is **out of
  primary scope** for this documentation pass — see README.md's "Browser version"
  section for its own details. `web/engine.js` is a cross-checked equity/decision
  port of `engine.py`'s logic; the rest is an independent implementation.

## Current status

As of the audit on 2026-08-06 (see PROJECT_STATE.md for the full snapshot):
- The Python desktop pipeline (capture → recognize → engine → overlay → main) is
  **fully wired end-to-end in source** — every stage calls into the next with no
  stub functions, no `NotImplementedError`, no TODO/FIXME/HACK/placeholder markers
  found anywhere in the `.py` files (verified by repo-wide grep).
  All 10 root `.py` files pass `python3 -m py_compile` (syntax-valid) and all
  declared dependencies (`mss`, `opencv-python`, `numpy`, `pytesseract`, `eval7`,
  `Pillow`) import successfully in the repo's `.venv`.
- **Live, on-a-real-table verification has never been performed in this
  environment** and could not be performed as part of this documentation audit —
  see "Known issues" and TESTING.md. The pipeline's correctness against an actual
  PokerNow-style table (region calibration accuracy, card template matching,
  OCR accuracy on a live theme) is **unverified**, not because it looks broken but
  because doing so requires a live poker table on screen, which this environment
  does not have and this task explicitly said not to attempt.
- No calibration file (`table_layout.json`) and no card templates
  (`templates/*.png`) exist in this checkout — both are gitignored and are meant to
  be generated locally per-user by running `calibrate.py` then `build_templates.py`.
  This is expected, not a bug: the repo ships with an empty `templates/` directory.
- Working tree is clean, on `main`, up to date with `origin/main` — see
  PROJECT_STATE.md for the exact snapshot.

## Technology stack

- **Language:** Python (the `.venv` in this repo reports Python 3.9.6; no
  `pyproject.toml`, `setup.py`, or explicit minimum-version pin exists anywhere in
  the repo, so 3.9 is the only version actually verified against this codebase).
- **Screen capture:** `mss` (fast, cross-platform, region-only screenshots).
- **Image processing / template matching:** `opencv-python` (`cv2.matchTemplate`).
- **OCR:** `pytesseract` (Python wrapper) + the Tesseract binary itself, which is a
  **system dependency installed separately via Homebrew** (`brew install
  tesseract`), not a pip package — `pytesseract` will fail at runtime without it.
- **Poker hand evaluation / equity:** `eval7` (Monte Carlo simulation, C-extension
  backed for speed).
- **GUI overlay:** `tkinter` (Python's bundled GUI toolkit — no separate install).
- **Image handling for calibration:** `Pillow`.
- **Browser version (`web/`, secondary):** vanilla JavaScript, `Tesseract.js`
  (loaded from a CDN `<script>` tag, not bundled), Document Picture-in-Picture API.

## Essential commands

All commands below are verified against `run.sh`, `requirements.txt`, and
`README.md` — no command in this section was invented.

```bash
# One-time system dependency (README step 1)
brew install tesseract

# One-time Python environment setup (README step 2)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# One-time per browser-window-size/zoom/theme: calibrate table regions
python calibrate.py

# One-time (reusable until the table theme changes): build the 52-card template set
python build_templates.py

# Run the assistant (also creates .venv and installs deps if missing)
./run.sh
# equivalent to: python main.py (after venv activation + deps installed)
```

There is **no test command** — no test files or test framework exist in this repo
(see TESTING.md). The closest thing to an automated check is a Python syntax
compile (`python3 -m py_compile <file>.py`), which this audit ran against all 10
root `.py` files with a clean result.

The browser version (`web/`) has its own local-serving instructions in README.md
(`python3 -m http.server` from inside `web/`) — not covered further here since it's
out of primary scope for this documentation pass.

## Repository structure

```
full-house/
├── main.py                 # Polling loop: capture -> recognize -> decide -> overlay
├── capture.py               # mss-based region capture (TableCapture, load_layout)
├── calibrate.py              # One-time interactive region calibration (click-drag)
├── build_templates.py        # One-time interactive 52-card template capture
├── recognize_cards.py        # cv2.matchTemplate card recognition against templates/
├── recognize_text.py         # Tesseract OCR for stack/pot/bet-to-call numbers
├── engine.py                 # Monte Carlo equity (eval7) + pot-odds decision heuristic
├── state.py                  # TableState dataclass (hero cards, board, stacks, pot)
├── overlay.py                 # Always-on-top Tkinter recommendation panel
├── config.py                  # Central config: paths, polling rate, trial budget, OCR
├── run.sh                     # venv bootstrap + dependency install + python main.py
├── requirements.txt            # mss, opencv-python, numpy, pytesseract, eval7, Pillow
├── README.md                  # Original project README (both versions)
├── templates/                  # 52-card PNG templates (gitignored, empty in this checkout)
├── table_layout.json           # Calibration output (gitignored; not present here)
├── .github/workflows/
│   └── deploy-web.yml          # GitHub Pages deploy for web/ only
├── web/                        # Parallel browser (JS) implementation — secondary scope
│   ├── app.js, capture.js, calibrate.js, config.js, engine.js,
│   │   overlay.js, recognizeCards.js, recognizeText.js, templates.js,
│   │   index.html, style.css
│   ├── .env.local, .vercel/    # gitignored, untracked, NOT inspected by this audit
│   └── .gitignore
└── .venv/                       # Local virtualenv (gitignored)
```

## Architecture summary

Pipeline (see ARCHITECTURE.md for the full diagram and per-stage detail):

```
capture.py (mss region grabs)
   -> recognize_cards.py (hero/board cards via template match)
   -> recognize_text.py (stack/pot/bet-to-call via OCR)
   -> state.py (TableState assembled from the above)
   -> engine.py (Monte Carlo equity + pot-odds heuristic -> Decision)
   -> overlay.py (always-on-top Tkinter panel renders the Decision)
```

`main.py` is the orchestrator: it polls `action_trigger` on a slow interval when
idle (`IDLE_POLL_INTERVAL_S`) and only runs full recognition + decision once it
looks like hero's turn, then polls faster (`ACTIVE_POLL_INTERVAL_S`) while active,
to keep CPU usage down between hands.

## Coding conventions

Observed directly from the source (not assumed):
- Every module has a module-level docstring explaining its purpose and any
  non-obvious design rationale (e.g. why template matching instead of OCR/ML for
  cards, why a fixed sizing table instead of a solver).
- `from __future__ import annotations` at the top of every module, with PEP 604
  (`str | None`) union syntax used throughout — this only works at runtime because
  of that future import, given the repo's Python 3.9 environment (native `X | Y`
  syntax without the future import requires 3.10+).
  **Do not remove `from __future__ import annotations` from any file** without
  confirming the target Python version supports bare union syntax.
  If you refer to Python's 2026 release cadence, note this repo's actual verified
  environment is 3.9.6 (see "Technology stack" above) — treat this as the working
  baseline unless you personally verify a newer interpreter is in use.
- `@dataclass` used for plain state/data containers (`TableState` in `state.py`,
  `Decision` in `engine.py`).
- Small, single-responsibility modules — one pipeline stage per file, no god
  objects.
- Type hints on all function signatures.
- No logging framework — `main.py` uses a single `print()` per tick for latency
  visibility (`[tick] Nms ...`), intentionally, per its own docstring.
- No custom exception classes — `RuntimeError` is used directly for the two
  "you forgot a setup step" cases (`capture.py`'s missing layout file,
  `recognize_cards.py`'s missing templates).

## Environment setup

`config.py` is the single source of runtime configuration. It contains **no
secrets** — every value is a path, a numeric tuning constant, or a UI dimension:

| Value | Purpose | Secret? |
|---|---|---|
| `PROJECT_ROOT`, `TEMPLATES_DIR`, `LAYOUT_PATH` | Local filesystem paths | No |
| `IDLE_POLL_INTERVAL_S`, `ACTIVE_POLL_INTERVAL_S` | Polling cadence | No |
| `MONTE_CARLO_TRIALS`, `OPPONENT_RANGE` | Equity engine tuning | No |
| `TESSERACT_CONFIG` | Tesseract CLI flags | No |
| `CARD_MATCH_THRESHOLD` | Template-match confidence cutoff | No |
| `OVERLAY_WIDTH/HEIGHT/MARGIN` | Overlay window geometry | No |

There is **no `.env` file, no API key, no credential, and no network call anywhere
in the Python codebase** — this tool is entirely local and offline (see
SECURITY.md). `table_layout.json` (calibration output) is local, per-user,
per-table-theme data — it is gitignored and must never be committed, not because
it's secret but because it's machine/session-specific and would be meaningless (or
actively wrong) on anyone else's screen.

The `web/` subtree does have a gitignored `web/.env.local` and `.vercel/` directory
present on disk in this checkout. **This audit did not open or inspect their
contents** — they are untracked, gitignored, and out of scope; do not read or copy
their contents into any documentation or commit.

## Testing/verification summary

See TESTING.md for full detail. Summary:
- No automated test suite exists (no `tests/` directory, no `pytest`/`unittest`
  files, no CI test step — the only GitHub Actions workflow deploys `web/` to
  Pages, it does not test anything).
- This audit verified: all 10 root `.py` files are syntactically valid
  (`python3 -m py_compile`), and all declared dependencies import successfully in
  the repo's `.venv`.
- This audit did **not** and **could not** verify: live screen capture against a
  real poker table, card-template-matching accuracy, OCR accuracy on a live table
  theme, or the overlay actually appearing correctly on screen — all of these
  require a live table on screen and were explicitly out of scope for this pass.
- `calibrate.py` is effectively the project's built-in manual verification tool —
  running it and visually confirming each dragged region lands on the right part
  of the table is the closest thing to an integration test this project has.

## DO NOT CHANGE WITHOUT REVIEW

- **The no-money/friendly-games-only scope statement** (README.md, this file,
  SECURITY.md, ROADMAP.md) — do not soften, remove, or reframe this as merely
  advisory. It is a hard usage constraint for the project's purpose.
- **`config.py`'s tuned constants** (`MONTE_CARLO_TRIALS`, `CARD_MATCH_THRESHOLD`,
  `TESSERACT_CONFIG`, the poll intervals) — these were deliberately benchmarked
  (see the comment above `MONTE_CARLO_TRIALS` in `config.py` citing measured
  ms-per-trial figures). Changing them trades off latency vs. accuracy; do not
  change without re-benchmarking and noting the new numbers in a comment.
- **Any locally-generated `table_layout.json` or `templates/*.png`** a user has
  built for their own setup — these are gitignored, user-specific, and taking time
  to rebuild; never delete or regenerate them without being asked.
- **`engine.py`'s decision heuristic** (the equity/pot-odds thresholds, the sizing
  table in `_round_nice`) — changing these changes actual poker advice given to a
  user in a live hand; treat as behavior-critical, not cosmetic.
- **`web/engine.js`'s parity with `engine.py`** — the README states these were
  cross-checked to produce matching decisions given the same inputs. If you change
  `engine.py`'s thresholds, `web/engine.js` will silently drift out of parity
  unless updated in lockstep.

## Known issues

- **`requirements.txt` pins `eval7>=0.1.11`, but the actual installed package in
  this repo's `.venv` is `eval7==0.1.10`** (verified via `pip show eval7` inside
  `.venv`). This is either a stale pin, a version that doesn't yet exist on PyPI
  for this platform, or the `.venv` predates a `pip install -r requirements.txt`
  run. Not confirmed which — flag before relying on it silently resolving on a
  fresh install elsewhere.
- **This repo's `.venv/pyvenv.cfg` has `home = /Users/gariyuu/Projects/hyperliquid-bot/.venv/bin`** —
  i.e. this virtualenv's recorded "home" interpreter path points at a *different*
  sibling project's venv, not a system Python. It still works (all deps import
  successfully), but this is an unusual/fragile provenance for the venv and
  suggests it may have been created by copying rather than a fresh
  `python3 -m venv .venv` run. `run.sh` will recreate `.venv` cleanly if it's ever
  deleted, since it checks `if [ ! -d .venv ]`.
- **No live-table verification exists for this codebase**, in this audit or (as
  far as the repo's git history and lack of test/CI infra shows) possibly ever.
  The README's own "known limitations" section for the browser version says as
  much explicitly for that half of the project; the desktop version's README
  makes no equivalent claim of having been live-tested either, and no artifact in
  the repo (screenshot, log, test file) documents a real run.
- **Empty `except`/bare `except:` blocks:** none found (verified via grep across
  all `.py` files).
- **TODO/FIXME/HACK/WIP/placeholder/dummy/"not implemented" markers:** none found
  (verified via grep across all `.py` files) — the codebase is small and appears
  to be a complete first pass, not a work-in-progress snapshot.
- **`_is_hero_turn` in `main.py` is an explicitly-flagged heuristic**, not a solid
  detection: it checks whether the `action_trigger` region's pixel standard
  deviation exceeds a flat threshold (15.0), and its own docstring says to swap it
  for a template match "if this misfires on your table's theme." This is
  documented fragility, not a bug, but it is the single most likely thing to need
  per-theme tuning.
- **`num_opponents` inference is explicitly flagged as noisy** in both the README
  and `state.py` (`max(1, len(opponent_stacks))` — it counts how many
  opponent-stack regions currently OCR a value, which is theme- and
  layout-dependent).
- **`config.OPPONENT_RANGE` is a dead/unimplemented config value.** `config.py`
  defines `OPPONENT_RANGE = "random"` with a comment listing `"random" | "loose" |
  "tight"` as valid values and pointing to `engine.py` for the implementation —
  but `engine.py` never imports or reads `config.OPPONENT_RANGE` anywhere
  (verified by grep: the only occurrence of `OPPONENT_RANGE` in the entire
  codebase is its own definition in `config.py`). `calc_equity` unconditionally
  simulates opponents as "any two random cards" regardless of this setting. This
  is a documented-but-not-implemented feature, not a bug in the strict sense (it
  doesn't crash or misbehave), but changing `OPPONENT_RANGE` in `config.py`
  currently has **zero effect** — flagged here so nobody spends time debugging why
  it "isn't working."

## AI working instructions

Future Claude Code sessions (or any AI agent) working in this repo must:

1. Read `CLAUDE.md` (this file) first.
2. Read `PROJECT_STATE.md` for the current exact repo state.
3. Read `TASKS.md` for what's actually in flight.
4. Read whichever of `ARCHITECTURE.md` / `FEATURES.md` / `API_REFERENCE.md` /
   `SECURITY.md` / `TESTING.md` is relevant to the task at hand.
5. Inspect the affected `.py` file directly before changing it — do not trust a
   memory file's description of a function's exact behavior over reading the
   function itself; memory files can go stale.
6. Check `git status` before modifying files, to catch any uncommitted work in
   progress (as of this audit the tree was clean — verify freshly, don't assume).
7. Avoid overwriting unrelated work.
8. Make small, reviewable changes.
9. Run `python3 -m py_compile <file>.py` on every `.py` file you touch, at
   minimum, before considering a change done — there is no richer automated check
   in this repo (see TESTING.md).
10. Update documentation after meaningful changes (see the permanent rules below).
11. Never claim something works without verification — "it compiles" is not the
    same claim as "it correctly reads a live poker table." Say which one you mean.
12. Never expose secrets in output, commits, or documentation. This repo has none
    checked in today (verified by this audit) — keep it that way. Do not read or
    transcribe the contents of gitignored `web/.env.local` or `web/.vercel/` into
    any file, commit, or chat output.
13. Never soften, remove, or reframe the no-money/friendly-games-only scope
    statement as merely advisory — it is load-bearing for what "correct behavior"
    means for this tool. Never add or suggest features aimed at making this tool
    viable against real-money or online platforms.
14. Never delete or regenerate a user's local `table_layout.json` or
    `templates/*.png` without being asked — they represent real calibration work.
15. Never change `engine.py`'s decision thresholds/sizing table without treating
    it as behavior-critical (it changes live poker advice) and flagging the
    change explicitly, including its effect on `web/engine.js` parity.
16. Never silently replace an existing architectural pattern (e.g. swapping
    template matching for an ML card classifier, adding a network call, replacing
    Tkinter) with a new one unless that is the explicit point of the task.
17. Never claim live-table accuracy has been verified — it has not been, in this
    audit or in any artifact found in the repo. State this limitation plainly if
    asked about correctness.
18. Record unresolved uncertainty (e.g. the `eval7` version mismatch, the `.venv`
    provenance oddity) in the relevant memory file rather than guessing and
    presenting a guess as fact.

### Permanent rules: before every task
- Read `PROJECT_STATE.md` and `TASKS.md` before starting.
- Run `git status` and note any pre-existing uncommitted changes before touching
  anything.

### Permanent rules: after every meaningful task
- Update `PROJECT_STATE.md` (status, blockers, next actions).
- Update `TASKS.md` (move items between current/next/completed as accurate).
- Append an entry to `SESSION_LOG.md`.
- Append an entry to `CHANGELOG.md` if the change is user-facing or behavior-affecting.
- Re-verify the "DO NOT CHANGE WITHOUT REVIEW" section still matches reality.
