# HANDOFF.md

## What is this project

Full House is a **screen-scraping poker assistant** (desktop Python + a parallel
browser JS version) that watches calibrated screen regions of a virtual poker
table, recognizes hole cards / board / stack sizes / pot, and shows a
fold/call/raise recommendation in an always-on-top overlay.

**This tool was built specifically for chip-only, friendly home games with no
money on the line — never for real-money or online-cardroom platforms.** This is
a hard usage constraint, not a suggestion (see CLAUDE.md and SECURITY.md for the
full statement and rationale). Any work that would make this tool more viable
against a real-money platform is out of scope and should be refused or escalated.

## What to read first

1. This file (`HANDOFF.md`).
2. `CLAUDE.md` — full operating manual: identity, stack, commands, structure,
   architecture summary, conventions, DO NOT CHANGE list, known issues, AI
   working instructions.
3. `PROJECT_STATE.md` — exact git/tree state as of the last audit.
4. `TASKS.md` — current/next/blocked work, itemized.
5. Whichever of `ARCHITECTURE.md` / `FEATURES.md` / `API_REFERENCE.md` /
   `SECURITY.md` / `TESTING.md` is relevant to what you're about to do.

## Current task (as of this handoff)

The documentation-build task (DOC-001 in `TASKS.md`) is **complete**: this repo
went from zero documentation to the full 17-file system in this session. There is
no in-progress application-code task right now — the resume point is picking one
of the "Next up" items below, or whatever the user asks for next.

## What works (verified this session)

- All 10 root `.py` files (`main.py`, `capture.py`, `calibrate.py`,
  `build_templates.py`, `recognize_cards.py`, `recognize_text.py`, `state.py`,
  `engine.py`, `overlay.py`, `config.py`) are syntactically valid and the whole
  pipeline is genuinely wired end-to-end at the source level (no stubs, no
  TODO/FIXME/placeholder markers found anywhere).
- All declared dependencies import successfully in the repo's `.venv`; the
  Tesseract system binary is installed on this machine.
- No secrets exist anywhere in the tracked codebase (verified by grep).

## What's broken / unverified

- **Live-table accuracy is completely unverified** — capture, card recognition,
  OCR, and the overlay have never been run against a real table in this
  environment (and, as far as any artifact in the repo shows, possibly never at
  all). This is the single biggest open item — see `TESTING.md`'s manual smoke
  checklist for how to do this when a live table is available.
- **`config.OPPONENT_RANGE`** ("random"/"loose"/"tight") is defined and
  commented as affecting `engine.py`, but `engine.py` never actually reads it —
  changing it currently has zero effect. Documented-but-not-implemented, not a
  crash bug.
- **`requirements.txt` pins `eval7>=0.1.11`**, but the installed `.venv` has
  `eval7==0.1.10` — unresolved discrepancy, not yet root-caused.

## Next action

Per `PROJECT_STATE.md`'s "Next three recommended actions": (1) resolve the
`eval7` version mismatch, (2) perform a real live-table verification pass and
record results in `TESTING.md`, (3) decide on a formal minimum-Python-version
pin. None of these have been started.

## Important files

- `main.py` — orchestrator/entry point (start here to understand the runtime
  flow).
- `engine.py` — the actual decision logic (equity + pot odds + sizing).
- `config.py` — every tunable constant, all in one place.
- `README.md` — original user-facing setup/usage doc; still accurate, folded
  into the new docs but not replaced.

## Dangerous-to-modify areas

See CLAUDE.md's "DO NOT CHANGE WITHOUT REVIEW" section in full. Highlights:
- The no-money/friendly-games-only scope statement — do not soften or remove it.
- `config.py`'s benchmarked tuning constants (`MONTE_CARLO_TRIALS`,
  `CARD_MATCH_THRESHOLD`, poll intervals) — changing them trades off
  latency vs. accuracy; re-benchmark and document if changed.
- `engine.py`'s decision thresholds and sizing table — this is live poker advice,
  treat as behavior-critical; keep `web/engine.js` in parity if changed.
- Any user's locally-generated `table_layout.json` or `templates/*.png` — never
  delete/regenerate without being asked; they represent real manual setup work.

## First commands to run (to get oriented / verify environment)

```bash
cd /Users/gariyuu/Projects/full-house
git status                                   # confirm clean tree, current branch
git log --oneline -5                          # recent history
source .venv/bin/activate
python3 -c "import cv2, eval7, mss, pytesseract, numpy, PIL; print('deps OK')"
tesseract --version                            # confirm system OCR dependency
for f in *.py; do python3 -m py_compile "$f"; done && echo "all .py files valid"
```

## How to verify it still works (without a live table)

Since there's no live-table access in most environments, "still works" for this
repo means: the above commands succeed (syntax valid, deps importable, Tesseract
present), and `git status`/`git log` match what `PROJECT_STATE.md` says. Actually
running `./run.sh` requires a live poker table on screen and calibration files
that don't exist in a fresh checkout — do not attempt this in a sandboxed/headless
environment; it needs a real display and a real (or practice) table.

---

## Prompt for the next Claude Code account

```
This repo (~/Projects/full-house) is a screen-scraping poker assistant built
ONLY for chip-only, friendly, no-money home games — never real-money platforms.
That constraint is explicit in CLAUDE.md and SECURITY.md; do not soften it, and
refuse/escalate any request that would make this tool viable against a
real-money platform.

Read CLAUDE.md, then PROJECT_STATE.md, then TASKS.md before doing anything else.
The 17-file documentation system is built AND committed (latest commit as of
2026-08-07 is 0ea7bab, "docs: add full handoff documentation system"; a
follow-up checkpoint/verification pass landed in a second commit the same day —
check `git log --oneline -5` fresh, don't trust this prompt's hashes blindly).
No application code has been changed by any documentation session so far. The
pipeline (capture -> recognize_cards / recognize_text -> state -> engine ->
overlay -> main) is fully wired at the source level and passes syntax checks +
dependency imports, but has NEVER been verified against a live poker table in
any environment either documentation pass could find evidence of — that's the
biggest open item (see TESTING.md's manual smoke checklist for how to do it
when you have a live table).

Two known discrepancies, re-confirmed as of the 2026-08-07 checkpoint pass and
still unresolved: (1) config.OPPONENT_RANGE is defined but never actually read
by engine.py — it's a no-op despite its comment; (2) requirements.txt pins
eval7>=0.1.11 but the installed .venv has 0.1.10.

Before changing anything: run `git status` and `git log --oneline -5` fresh —
don't trust PROJECT_STATE.md's recorded commit hash blindly, it has gone stale
before (see CHANGELOG.md's 2026-08-07 entry for exactly how). Re-verify the
no-money-only scoping is still intact in README.md/CLAUDE.md/SECURITY.md/
ROADMAP.md before doing anything else if this repo's purpose ever seems to have
drifted.
```
