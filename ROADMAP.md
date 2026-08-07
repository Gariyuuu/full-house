# ROADMAP.md

This roadmap is derived from what the repo's README, code comments, and structure
actually indicate about direction — it is not a promise of future work, and no
dates are invented.

## Current milestone

- **Objective:** Have a working, calibratable desktop poker assistant for
  chip-only home games, with a documentation system sufficient for a clean
  account-switch handoff.
- **Priority:** High.
- **Status:** The application code (desktop pipeline) appears feature-complete at
  the source level as of the single initial commit (`7d552ae`) and has had no
  further application-code commits since. The documentation half of this
  milestone (this session) is now complete.
- **Difficulty:** N/A (retrospective — already built).
- **Risk:** Low for the documentation deliverable; unresolved for the
  application's real-world correctness, since live-table verification has never
  been performed (see TESTING.md, TASKS.md TASK-003).
- **Definition of done:** 17-file documentation system exists, accurately
  reflects the repo, and states the no-money/friendly-games-only scope
  explicitly. **Met** as of this session.

## Next milestone

- **Objective:** Live-verify the pipeline against a real friendly-game table
  (calibrate → build templates → run a session) and close the gap between
  "source-level complete" and "verified working."
- **Priority:** High.
- **Status:** Not started (see TASKS.md TASK-003).
- **Difficulty:** Low-medium — the tooling to do this already exists
  (`calibrate.py`, `build_templates.py`); it just requires a live table and a
  session actually running it.
- **Risk:** Low technical risk; the main risk is time cost (52-card template
  capture is manual and repetitive per the README).
- **Definition of done:** A documented smoke-test pass (see TESTING.md's manual
  checklist) with recorded results — recognition accuracy, OCR accuracy, and
  observed per-tick latency against the ~1s budget.

## Long-term ideas

Inferred from code comments and structure, not promised:

- Implementing `config.OPPONENT_RANGE`'s advertised "loose"/"tight" opponent-range
  behavior in `engine.py` (currently a documented no-op — see FEATURES.md
  section 4, BUG-001 in TASKS.md).
  - Priority: Low-Medium. Status: Not started. Difficulty: Medium (requires
    defining what a "loose"/"tight" range actually means in terms of a hand
    range to sample from, plus updating `calc_equity` to sample non-uniformly).
  - Risk: Changes decision output for existing users relying on default
    behavior; would need to default to today's "random" behavior to avoid a
    silent behavior change.
- Swapping the flat pixel-variance `_is_hero_turn` heuristic in `main.py` for a
  template match against the actual action-button graphics, as its own docstring
  suggests as the fix if it misfires on a given table theme.
  - Priority: Low (only needed if/when it's observed misfiring). Status: Not
    started. Difficulty: Low (same technique already used in
    `recognize_cards.py`).
- A pre-flight check for the Tesseract system binary at `run.sh` or `main.py`
  startup, to fail fast with a clear message instead of at first OCR call.
  - Priority: Low. Status: Not started. Difficulty: Low.

## Out of scope (by design)

- **Real-money or online-cardroom use.** This tool is built and documented
  exclusively for chip-only, friendly, no-money home games. Extending it toward
  detection-evasion, covert/anti-detection capture techniques, or any feature
  whose primary purpose is making it viable against a real-money platform is
  **explicitly out of scope** and should not be undertaken. This is a scope
  boundary, not a missing feature — see CLAUDE.md and SECURITY.md for the full
  rationale (screen-scraping assistance tools are typically prohibited by
  real-money platforms' terms of service, and this project was never positioned
  as a tool to evade that).
- **A GTO solver.** The README explicitly states this is "a heuristic aid, not a
  GTO solver" — it has no visibility into betting history, positions, or real
  opponent ranges. Turning it into a true solver (range-vs-range equilibrium
  computation) would be a different project, not an incremental feature.
- **A cloud/server component.** The architecture is deliberately entirely local
  and offline (see SECURITY.md, ARCHITECTURE.md) — no network calls exist in the
  Python codebase today, and adding one (e.g. a hosted equity-calculation
  backend) is not indicated anywhere in the repo as a direction.
