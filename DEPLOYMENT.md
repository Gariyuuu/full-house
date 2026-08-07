# DEPLOYMENT.md

## This is a local desktop tool — there is no deployment for the Python version.

The desktop assistant (root-level `.py` files) is not deployed anywhere, has no
hosting target, no build/release pipeline, and no packaging (no `setup.py`, no
`pyproject.toml`, no PyPI package, no PyInstaller/py2app bundling config found
anywhere in the repo). It runs directly from source, locally, per-user. This
section documents the actual local setup/run process instead, verified against
`README.md`, `run.sh`, and `requirements.txt`.

## Local setup process (verified)

```bash
# 1. System dependency (Homebrew, macOS — README's documented path)
brew install tesseract

# 2. Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. One-time calibration (per table window size / zoom / theme)
python calibrate.py

# 4. One-time card template capture (reusable until the theme changes)
python build_templates.py

# 5. Run
./run.sh
```

`run.sh` itself automates steps 2 and 5 (venv creation if missing, dependency
install, then `python main.py`) but does **not** automate steps 1, 3, or 4 —
those remain manual, interactive, one-time prerequisites documented in
README.md.

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
python main.py
```

## Platform assumptions

- README's setup instructions assume **macOS with Homebrew** (`brew install
  tesseract`) — no equivalent Linux/Windows install instructions are documented
  in this repo. `mss`, `opencv-python`, `tkinter`, and `eval7` are all
  cross-platform in principle, but the Tesseract-install step and the
  `calibrate.py`/screen-capture flow have only been documented for macOS here.
- This audit ran on macOS (`Darwin 24.1.0`) with Python 3.9.6 and confirmed the
  documented setup steps' dependencies are all actually satisfiable on this
  machine (Tesseract 5.5.3 present, all pip deps import successfully in the
  repo's `.venv`) — but did not test the setup flow on a clean machine from
  scratch (the existing `.venv` was reused, not recreated).

## No packaging / distribution

No `setup.py`, `pyproject.toml`, `MANIFEST.in`, or build backend config exists.
There is no `pip install full-house` path and no standalone executable/app
bundle produced anywhere in the repo. Running the tool always means cloning the
repo and running `./run.sh` (or the manual equivalent) from source.

## Browser version (`web/`) deployment — real, but secondary scope

Unlike the Python version, `web/` **does** have an actual deployment pipeline:
`.github/workflows/deploy-web.yml` deploys the contents of `web/` to GitHub
Pages on every push to `main` that touches `web/**` or the workflow file itself
(and supports manual `workflow_dispatch` triggering). It uses the standard
`actions/configure-pages` → `actions/upload-pages-artifact` → `actions/deploy-pages`
flow, requesting `contents: read`, `pages: write`, `id-token: write` permissions,
with a `concurrency` group (`pages`, `cancel-in-progress: true`) to prevent
overlapping deploys. This workflow briefly existed, was reverted
("Temporarily exclude workflow file pending workflow scope," commit `76dabf2`),
then was re-added (`b3202ed`) — see CHANGELOG.md for the full commit-derived
history. A `web/.vercel/` directory also exists on disk (gitignored, untracked,
not inspected by this audit) suggesting a Vercel deployment may also have been
configured for `web/` at some point, in addition to or instead of GitHub Pages —
this was not confirmed and is noted here only as an observed artifact, not a
verified fact. `web/` deployment specifics are otherwise out of primary scope
for this documentation pass.
