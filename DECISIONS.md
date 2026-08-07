# DECISIONS.md

Architectural decisions recoverable from the repo itself. Each is labeled
**Verified** (the repo/code/comments state the reasoning directly) or
**Inferred** (reasoning is a reasonable deduction from the code's structure and
constraints, not stated outright).

## Screen-scraping instead of an API integration

- **Decision:** Read the table state by capturing and recognizing screen regions
  (`mss` + `cv2.matchTemplate` + `pytesseract`), rather than integrating with any
  site's API.
- **Label: Inferred.** No API integration is attempted or mentioned anywhere in
  the repo. `calibrate.py`'s docstring says it's "Screenshot-based, so it works
  for any virtual table site (PokerNow.club, etc.) without needing site API
  access" — which states the *benefit* (site-agnostic, no API needed) but not
  explicitly that "no legitimate API exists." The most likely reason, given the
  target (informal virtual poker sites like PokerNow.club, which are not
  designed as programmatic platforms and don't publish a state API), is that no
  such API exists to integrate with — but this repo does not say so in those
  words, so it is recorded here as inferred, not verified.
- **Consequence documented in-repo:** Screen-scraping is inherently fragile — the
  README states plainly that resizing the window, changing zoom, or switching
  table themes requires recalibration (see ARCHITECTURE.md's "Major
  architectural risks").

## Template matching instead of OCR/ML for card recognition

- **Decision:** Recognize cards via `cv2.matchTemplate` against a pre-captured
  52-image template set, rather than OCR or a trained classifier.
- **Label: Verified.** `recognize_cards.py`'s module docstring states the
  reasoning directly: "PokerNow-style card graphics are static vector art, so a
  resized-crop-vs-template comparison is fast (<5ms) and reliable."

## Fixed pot-odds + Monte Carlo heuristic instead of a GTO solver

- **Decision:** `engine.py` computes Monte Carlo equity (`eval7`) and compares it
  to pot odds with a fixed threshold and a fixed sizing table, rather than
  computing a game-theoretically optimal strategy.
- **Label: Verified.** `engine.py`'s module docstring states this directly: "This
  is NOT a GTO solver. It's a fast pot-odds + equity heuristic tuned to run well
  under the ~1s latency budget... Treat it as a solid TAG-strategy aid, not a
  source of truth." The README repeats this framing under "What it actually is."

## ~1 second latency budget as a design constraint

- **Decision:** Tune `MONTE_CARLO_TRIALS` (20,000 default), polling intervals,
  and region sizes to keep the full read-and-decide cycle under roughly 1 second.
- **Label: Verified.** `config.py`'s comment above `MONTE_CARLO_TRIALS` cites
  specific benchmarked numbers (~35ms/4k trials, ~160ms/20k trials for a
  specific worst-case scenario) explicitly measured against a "1s budget once
  capture+OCR are added." The README's "Tuning latency" section repeats and
  explains this same target for users retuning on slower hardware.

## Tkinter for the overlay instead of a cross-platform GUI framework

- **Decision:** Use Python's bundled `tkinter` for the always-on-top overlay
  window, rather than a heavier GUI toolkit (Qt, wxWidgets, etc.) or a
  web-view-based overlay.
- **Label: Inferred.** No comment in the repo states this reasoning directly.
  The most likely reasons, given the rest of the codebase's minimalism (no other
  GUI dependency in `requirements.txt`, small/single-purpose modules
  throughout): `tkinter` requires no additional install (it ships with Python),
  keeping the dependency list minimal, and it directly supports the
  `-topmost`/`overrideredirect` window attributes the overlay needs.

## Idle/active dual polling interval instead of a single fixed interval

- **Decision:** Poll slowly (`IDLE_POLL_INTERVAL_S = 0.3s`) when it's not hero's
  turn, and faster (`ACTIVE_POLL_INTERVAL_S = 0.15s`) once it looks like it is.
- **Label: Verified.** `main.py`'s module docstring states the purpose directly:
  "only runs recognition + the decision when the calibrated 'your turn' region
  looks active, to avoid burning CPU between hands."

## Soft-failure (`None`) instead of exceptions for "nothing recognized"

- **Decision:** `recognize_cards.recognize_card` and `recognize_text.read_number`
  return `None` rather than raising when nothing is confidently recognized, while
  `capture.load_layout` and `recognize_cards.get_templates` raise `RuntimeError`
  for missing setup (no layout file / no templates).
- **Label: Inferred.** Not stated explicitly as a unified design principle
  anywhere, but the pattern is consistent and clearly deliberate across both
  recognition modules: a card region can legitimately be empty (opponent's
  face-down card, an undealt board card) and an amount region can legitimately
  show nothing parseable (0 bet-to-call) — these are expected, not exceptional,
  outcomes, so they're modeled as `None` rather than errors. The two
  `RuntimeError`s are reserved for genuinely exceptional, one-time-setup-missing
  conditions instead.

## No test suite

- **Decision:** Ship without an automated test suite (no `tests/` directory, no
  `pytest`/`unittest` files, no CI test step).
- **Label: Inferred.** Not stated as a deliberate choice anywhere in the repo.
  Given the codebase's nature — the correctness-critical parts (card recognition,
  OCR accuracy) fundamentally depend on live screen content and a real table
  theme, which is hard to unit-test meaningfully without a captured
  fixture/golden-image test harness that doesn't exist here — it's plausible this
  was deprioritized in favor of `calibrate.py` serving as an interactive,
  manual verification tool instead. This is inferred from the shape of the
  codebase, not a stated decision.

## `web/` as a parallel implementation, not a shared-code port

- **Decision:** Build the browser version (`web/`) as an independent JavaScript
  implementation rather than compiling/transpiling the Python code or sharing
  logic directly.
- **Label: Verified.** The README states this directly: "None of the desktop
  Python stack (`mss`, OpenCV, `eval7`, the Tesseract binary, Tkinter) runs in a
  browser, so this is a parallel implementation, not a port of the same code —
  though `engine.js`'s equity math and decision thresholds are a direct port of
  `engine.py`'s so both versions make the same call given the same inputs."
