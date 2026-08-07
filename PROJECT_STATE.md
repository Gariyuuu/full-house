# PROJECT_STATE.md

**Audit timestamp:** 2026-08-06 05:52 MST (this documentation-build session)

## Git state

- **Current branch:** `main`
- **Tracking:** `origin/main`, up to date (no ahead/behind divergence)
- **Latest commit:** `7c78408452812c01ebe1af886f072628cd7adf89` —
  "Add favicon matching the spade-suit branding" (2026-08-06 03:43:22 -0700)
- **Working tree:** clean — `git status` reports "nothing to commit, working tree
  clean"
- **Untracked files:** none tracked-but-unignored are untracked. Two paths exist on
  disk but are gitignored and untracked by design: `web/.env.local` and
  `web/.vercel/` (their contents were not inspected by this audit — see
  CLAUDE.md's Environment setup section).
- **Uncommitted changes:** none.

### Recent commit history (full)
```
7c78408 Add favicon matching the spade-suit branding
1901c95 Add .gitignore for web/
b3202ed Add GitHub Pages deploy workflow for web/
76dabf2 Temporarily exclude workflow file pending workflow scope
7d552ae Initial commit: Full House poker assistant (desktop + browser versions)
```
The project was committed once as a complete initial drop (`7d552ae`), then had
three small follow-up commits, all scoped to `web/` and its GitHub Pages deploy
workflow. No commit has touched the root Python files since the initial commit.

## Active objective (this session)

Build a complete 17-file handoff documentation system for this repo (previously had
zero documentation files beyond `README.md`), to the same structural standard as
sibling projects `chamber-seven` and `buildstrike-arena`. No application code was
changed as part of this objective — this is a documentation-only pass.

## Last completed task

Full repository audit: read every `.py` file, `README.md`, `requirements.txt`,
`run.sh`, `.gitignore`, `.github/workflows/deploy-web.yml`, git history, and the
`.venv` config; verified all 10 root `.py` files are syntactically valid
(`python3 -m py_compile`) and all declared dependencies import successfully in the
project's own `.venv`; searched for TODO/FIXME/HACK/WIP/placeholder/dummy/bare
`except`/"not implemented" markers (none found). Result documented across the 17
new root-level `.md` files.

## Current task

Documentation build itself — creating the 17 files listed in CLAUDE.md's AI
working instructions (CLAUDE.md, PROJECT_STATE.md, ARCHITECTURE.md, FILE_MAP.md,
FEATURES.md, TASKS.md, ROADMAP.md, DECISIONS.md, DATABASE.md, API_REFERENCE.md,
UI_SYSTEM.md, SECURITY.md, TESTING.md, DEPLOYMENT.md, CHANGELOG.md, SESSION_LOG.md,
HANDOFF.md). This file is one of them. Status: **complete** as of this session —
see TASKS.md for the itemized breakdown and SESSION_LOG.md for the session entry.

## What works (verified in this session)

- All 10 root `.py` files parse cleanly (`python3 -m py_compile`).
- All declared runtime dependencies (`mss`, `opencv-python`, `numpy`,
  `pytesseract`, `eval7`, `Pillow`) import successfully inside the repo's `.venv`.
- The Tesseract system binary is present on this machine (`tesseract 5.5.3` via
  Homebrew, at `/opt/homebrew/bin/tesseract`).
- The pipeline is fully wired at the source level: `main.py` imports and calls
  every other module in the expected order (capture → recognize_cards /
  recognize_text → state → engine → overlay); no stage is a stub.
- No secrets, API keys, tokens, or passwords exist anywhere in the tracked
  Python codebase or in any of the newly-created documentation.

## What fails / could not be verified

- **Live screen capture against a real poker table** — not attempted, per explicit
  task instructions (no live table available in this environment, and running the
  overlay/capture tool isn't safe or meaningful here).
- **Card template matching accuracy** — untestable without a populated
  `templates/` directory (currently empty in this checkout) and a live table.
- **OCR accuracy on a live table theme** — untestable without a live table.
- **The overlay actually rendering correctly on screen** — not launched in this
  session (Tkinter GUI, requires a display and a live polling loop against real
  data to be meaningful).
- **eval7 version consistency** — `requirements.txt` declares `eval7>=0.1.11`, but
  the installed version in `.venv` is `0.1.10`. Not resolved; flagged in Known
  issues (CLAUDE.md) and TASKS.md.

## Blockers

None for the documentation objective (complete). For any future live-verification
task: requires a real virtual poker table (e.g. a PokerNow.club room) visible on
screen, plus willingness to run `calibrate.py` and `build_templates.py`
interactively — neither is available/appropriate in this environment.

## Assumptions made during this audit

- Assumed the `.venv` present in the repo reflects a real, working local setup
  (verified by direct import test) rather than trusting `requirements.txt` alone.
- Assumed `web/.env.local` and `web/.vercel/` are unrelated to the Python
  assistant's secret surface (Vercel-hosting config for the browser version) and
  did not open them, per the instruction to only "note" `.venv`/config without
  deep dependency inspection and to never transcribe untrusted/gitignored content.
- Assumed the Python version to document as "verified" is 3.9.6, since that is
  what this repo's own `.venv` reports, even though no `pyproject.toml` or version
  pin file mandates it.

## Next three recommended actions

1. Resolve the `eval7` version mismatch: confirm whether `0.1.11` exists on PyPI
   for this platform, and either update the installed `.venv` or correct
   `requirements.txt` to match what's actually installable.
2. Perform a real live-table verification pass (calibrate → build templates → run)
   against an actual friendly-game table, and record the result (accuracy, timing,
   any misfires in `_is_hero_turn`) as the project's first real integration-test
   evidence — see TESTING.md's manual smoke-test checklist.
3. Decide whether to formalize a minimum-Python-version pin (e.g.
   `pyproject.toml` or a `python_requires`) given the repo relies on
   `from __future__ import annotations` to support PEP 604 union syntax on
   pre-3.10 interpreters.
