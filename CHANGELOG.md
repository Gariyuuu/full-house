# CHANGELOG.md

Entries below the "Documentation audit" line are derived directly from `git log`
on `main` — no dates or details were invented. Commit hashes are included for
traceability. Entries above that line record this documentation session.

## Unreleased — Documentation audit (this session)

- Added the full 17-file handoff documentation system (`CLAUDE.md`,
  `PROJECT_STATE.md`, `ARCHITECTURE.md`, `FILE_MAP.md`, `FEATURES.md`,
  `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, `DATABASE.md`, `API_REFERENCE.md`,
  `UI_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`,
  `CHANGELOG.md` (this file), `SESSION_LOG.md`, `HANDOFF.md`) — the repo
  previously had zero documentation beyond `README.md`. No application code was
  changed. Findings from this audit: all 10 root `.py` files are syntactically
  valid and all dependencies import cleanly; no TODO/FIXME/HACK/placeholder
  markers exist in the codebase; `config.OPPONENT_RANGE` is defined but never
  actually read by `engine.py` (documented-but-unimplemented); `requirements.txt`
  pins `eval7>=0.1.11` but the installed `.venv` has `0.1.10`. See
  `PROJECT_STATE.md` and `TASKS.md` for full detail.

## Prior history (from `git log`, `main` branch)

- **`7c78408`** — Add favicon matching the spade-suit branding. (`web/`, +1 line)
- **`1901c95`** — Add `.gitignore` for `web/`.
- **`b3202ed`** — Add GitHub Pages deploy workflow for `web/`
  (`.github/workflows/deploy-web.yml`).
- **`76dabf2`** — Temporarily exclude workflow file pending workflow scope
  (reverted the deploy workflow added just before it, presumably pending a
  GitHub Actions permissions/scope fix — the very next commit re-adds it).
- **`7d552ae`** — Initial commit: Full House poker assistant (desktop + browser
  versions). This single commit introduced the entire codebase as it exists
  today at the root level: all 10 Python modules, `README.md`,
  `requirements.txt`, `run.sh`, `.gitignore`, and the full `web/` browser
  implementation (11 files) plus its (initially-included, then
  reverted-then-restored) deploy workflow.

No application-code (root `.py` file) commits exist after the initial commit —
every commit since `7d552ae` has touched only `web/` and its deploy workflow.
