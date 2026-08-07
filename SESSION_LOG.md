# SESSION_LOG.md

Append-only log of work sessions in this repo. Newest entry at the bottom.

---

## Session 1 — 2026-08-06

**Agent:** Claude Code (documentation-build session).

**Objective:** This repo had zero handoff-documentation files (no `CLAUDE.md`,
nothing beyond `README.md`). Build the full 17-file documentation system from
scratch, to the same structural standard as sibling projects `chamber-seven` and
`buildstrike-arena` (used only as a structural/format reference — every fact
written here was independently derived from inspecting this repo).

**What was done:**
1. Full repository audit: read all 10 root `.py` files, `README.md`,
   `requirements.txt`, `run.sh`, `.gitignore`, `.github/workflows/deploy-web.yml`,
   git log/branch/status, and the `.venv` config (noted, not deeply inspected).
2. Traced the actual pipeline (capture → recognize_cards/recognize_text →
   state → engine → overlay → main) by reading source directly — confirmed every
   stage is genuinely wired (no stubs) at the source level.
3. Ran non-destructive verification: `python3 -m py_compile` against all 10
   `.py` files (all passed), confirmed all declared dependencies import inside
   the repo's own `.venv` (`cv2`, `eval7`, `mss`, `pytesseract`, `numpy`, `PIL`),
   confirmed the Tesseract system binary is present (`5.5.3`, Homebrew).
4. Searched for TODO/FIXME/HACK/WIP/placeholder/dummy/hardcoded/bare-except
   markers across all `.py` files — none found. Searched for secrets
   (api key/secret/password/token patterns) — none found.
5. Found one real "documented but not implemented" gap:
   `config.OPPONENT_RANGE` ("random"/"loose"/"tight") is defined and commented
   as affecting `engine.py`, but `engine.py` never reads it — opponent range is
   always "any two random cards" regardless of this setting.
6. Found one dependency-version discrepancy: `requirements.txt` pins
   `eval7>=0.1.11`; the installed `.venv` has `0.1.10`.
7. Created all 17 documentation files at repo root: `CLAUDE.md`,
   `PROJECT_STATE.md`, `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`,
   `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`,
   `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`,
   `CHANGELOG.md`, `SESSION_LOG.md` (this file), `HANDOFF.md`. Stated the
   no-money/friendly-games-only intended use explicitly and prominently in
   `CLAUDE.md` and `SECURITY.md`, per explicit task requirement.
8. Did **not** launch the live screen-capture/overlay tool (`main.py`) —
   requires a live poker table on screen, explicitly out of scope/unsafe for
   this environment. Documented this limitation in `TESTING.md`.
9. Did **not** commit, push, deploy, reset, or discard anything. Working tree
   was clean before this session's file creation; the 17 new files are
   untracked (not staged, not committed) as of the end of this session.

**Verification performed on the new docs themselves:** re-read all 17 files for
internal consistency (current task described the same way across `CLAUDE.md`,
`PROJECT_STATE.md`, `TASKS.md`, `HANDOFF.md`); grepped the new docs for
anything resembling a real secret/key/token/password — none found; confirmed
`git status` still shows only untracked new `.md` files, no modifications to
existing tracked files.

**Handoff state at end of session:** Documentation build is complete. Next
recommended actions are listed in `PROJECT_STATE.md` and `TASKS.md` ("Next up"):
resolve the `eval7` version mismatch, perform a live-table verification pass,
and decide on the `OPPONENT_RANGE` dead-config item.

**Post-session note:** the 17 new files described above as "untracked... as of
the end of this session" were committed later the same day as `0ea7bab` ("docs:
add full handoff documentation system", 2026-08-06 20:20:07 -0700). See
Session 2 below.

---

## Session 2 — 2026-08-07

**Agent:** Claude Code (final transfer checkpoint pass).

**Objective:** Re-verify the 17-file doc system against the real current repo
before another account picks this up cold; fix any staleness; re-confirm the
no-money-only scoping; check for secrets and cross-file contradictions; refresh
`HANDOFF.md`'s "Prompt for the next Claude Code account" section.

**What was done:**
1. Confirmed git state fresh: `git status` clean, `git fetch origin` +
   `git rev-list --left-right --count origin/main...HEAD` show 0 ahead / 0
   behind. Latest commit is actually `0ea7bab` ("docs: add full handoff
   documentation system", 2026-08-06 20:20:07 -0700) — **not** `7c78408` as
   `PROJECT_STATE.md` and `CHANGELOG.md` still said (that commit added the docs
   themselves, after the Session 1 snapshot was written but before it was
   committed). Fixed in both files.
2. Re-ran `python3 -m py_compile` on all 10 root `.py` files (all pass),
   re-checked `eval7` version in `.venv` (still `0.1.10` vs. the
   `requirements.txt` pin of `>=0.1.11` — unchanged, still accurate),
   re-checked `.venv/pyvenv.cfg`'s `home` path oddity (unchanged, still
   accurate), confirmed `templates/` is still empty and `table_layout.json`
   still absent (both expected/by-design).
3. Read `engine.py` directly and confirmed `config.OPPONENT_RANGE` is still
   genuinely unread by it (grep + direct read) — `FEATURES.md`/`TASKS.md`/
   `CLAUDE.md`'s claim still holds.
4. Re-ran the secrets grep (`api[_-]?key|secret|password|token` plus common key
   prefixes) across all tracked files — zero real matches (only doc-text
   discussing the absence of secrets, and an unrelated GitHub Actions
   `id-token: write` permission line). Confirmed `web/.env.local` and
   `web/.vercel/` are still gitignored and untracked (not opened, per standing
   instruction).
5. Confirmed the no-money/friendly-games-only scoping is still accurate and
   prominent in `README.md`, `CLAUDE.md`, `SECURITY.md`, and `ROADMAP.md`'s
   "Out of scope" section — no drift toward real-money framing found anywhere.
6. Fixed the stale commit reference in `PROJECT_STATE.md` (Git state section)
   and `CHANGELOG.md` (added the missing `0ea7bab` entry, corrected the
   file's own intro line which referenced a "Documentation audit" heading that
   no longer existed after the fix).
7. Refreshed `HANDOFF.md`'s "Prompt for the next Claude Code account" section.
8. Committed this pass as one scoped commit. Did not push.

**Handoff state at end of session:** All 17 docs re-verified against live repo
state; only staleness found was the commit-hash lag described above (now
fixed). No-money-only scoping confirmed intact. No secrets found. Next
recommended actions unchanged from Session 1: resolve the `eval7` version
mismatch, perform a live-table verification pass, decide on the
`OPPONENT_RANGE` dead-config item.
