# TASKS.md

## Current task

- **ID:** DOC-001
- **Description:** Build the complete 17-file handoff documentation system for
  this repo (previously zero documentation beyond `README.md`), matching the
  structural standard of sibling projects `chamber-seven` and `buildstrike-arena`.
- **Status:** Complete.
- **Priority:** High (explicit account-switch handoff requirement per user's
  standing preference — see MEMORY.md's "Handoff discipline" note).
- **Files:** All 17 new root-level `.md` files (`CLAUDE.md`, `PROJECT_STATE.md`,
  `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`, `TASKS.md` (this file),
  `ROADMAP.md`, `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`,
  `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `CHANGELOG.md`,
  `SESSION_LOG.md`, `HANDOFF.md`).
- **Acceptance criteria:** All 17 files exist at repo root; every fact in them is
  traceable to something actually found in this repo (no invented content);
  no-money/friendly-games-only scope is stated explicitly and prominently in
  `CLAUDE.md` and `SECURITY.md`; no secrets appear anywhere; the current task is
  described consistently across `CLAUDE.md`, `PROJECT_STATE.md`, `TASKS.md`, and
  `HANDOFF.md`.
- **Verification steps:** Re-read each file after writing for internal
  consistency; re-run `git status` to confirm nothing was committed; grep the new
  docs for anything resembling a key/token/password before finishing.

## Next up

- **ID:** TASK-002 — Resolve the `eval7` version mismatch (`requirements.txt`
  pins `>=0.1.11`, installed `.venv` has `0.1.10`). Priority: Medium. Files:
  `requirements.txt`, `.venv`. Acceptance criteria: either the pin is corrected to
  match what's actually installable, or the `.venv` is upgraded and re-verified
  importable. Not started.
- **ID:** TASK-003 — Perform a real live-table verification pass (calibrate →
  build templates → run against an actual friendly-game table) and record
  results. Priority: High (this is the single biggest unverified area of the
  whole project). Files: none code-side; produces a TESTING.md update. Not
  started; explicitly out of scope for the environment this audit ran in.
- **ID:** TASK-004 — Decide whether to implement `config.OPPONENT_RANGE`'s
  advertised "loose"/"tight" behavior in `engine.py`, or remove the unused config
  value and its misleading comment. Priority: Low-Medium. Files: `engine.py`,
  `config.py`. Not started.

## Blocked

- None currently blocking documentation work. TASK-003 (live verification) is
  environment-blocked (no live poker table available here), not blocked by
  anything in the repo itself.

## High priority

- TASK-003 (live-table verification) — the project's actual correctness in the
  field has never been demonstrated by any artifact found in this repo.

## Medium priority

- TASK-002 (eval7 version mismatch).

## Low priority

- TASK-004 (OPPONENT_RANGE dead-config cleanup or implementation).
- Deciding on a formal minimum Python version pin (`pyproject.toml` or similar) —
  currently only inferable from the `.venv`'s recorded 3.9.6.

## Bugs

- **BUG-001:** `config.OPPONENT_RANGE` is defined and documented (`"random" |
  "loose" | "tight" — see engine.py`) but never actually read by `engine.py` —
  changing it has zero effect. Not a crash-bug, but a real "documented behavior
  doesn't match actual behavior" defect. See CLAUDE.md Known issues, FEATURES.md
  section 4.

## Technical debt

- **DEBT-001:** No pre-flight check anywhere (`run.sh`, `main.py`) for the
  Tesseract system binary being installed — fails at first OCR call instead of at
  startup with a clear message.
- **DEBT-002:** No retry/error-recovery logic anywhere in the pipeline — any
  transient `mss`/`cv2`/`pytesseract` exception propagates uncaught and kills the
  whole `main.py` process mid-session.
- **DEBT-003:** `.venv/pyvenv.cfg`'s recorded `home` path points at a different
  sibling project's virtualenv (`/Users/gariyuu/Projects/hyperliquid-bot/.venv/bin`),
  suggesting this `.venv` may have unusual provenance (likely copied rather than
  freshly created). Currently harmless (all deps import correctly) but fragile —
  a clean `python3 -m venv .venv` (which `run.sh` will do automatically if
  `.venv/` is deleted) would remove the oddity.

## Testing needed

- Live-table smoke test per TESTING.md's manual checklist (capture accuracy, card
  recognition accuracy, OCR accuracy, `_is_hero_turn` reliability, end-to-end
  latency against the ~1s budget).
- Numerical spot-check of `engine.calc_equity` against known equity values (e.g.
  AA vs. random heads-up ≈ 85%) to confirm the Monte Carlo implementation is
  correct, not just "doesn't crash." (The README claims this was done for the
  browser port's cross-check; not independently reproduced for the Python
  version in this audit.)

## Documentation needed

- None outstanding after this session — this session's entire purpose was
  filling the documentation gap. Future documentation debt: if TASK-003 (live
  verification) is ever performed, its results should be folded back into
  `TESTING.md` and `PROJECT_STATE.md`.

## Recently completed

- **DOC-001** (this session) — full 17-file documentation system, see "Current
  task" above.

## Deferred

- Live-table verification (TASK-003) — deferred by explicit task instruction for
  this session, not abandoned.
- Investigating `web/.env.local` / `web/.vercel/` contents — deliberately not
  opened by this audit (gitignored, untracked, out of scope, and opening
  gitignored env files without a clear need risks transcribing something
  sensitive into a document).

## Rejected ideas

- None recorded — no prior task history exists in this repo to have rejected
  anything from (git history shows only feature-additive commits, no reverted
  branches or documented rejected approaches).
