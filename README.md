# Full House

A screen-scraping poker assistant for **friendly, no-money** home games on virtual
table sites (e.g. PokerNow.club). It watches calibrated regions of your screen,
recognizes your hole cards / the board / stack sizes / pot, and shows a fold/call/raise
recommendation with a suggested raise-to size in an always-on-top overlay — aimed at
finishing each read-and-decide cycle in well under a second.

Two versions live in this repo:
- **Desktop (Python)** — the files in this root folder. Silent background capture via
  `mss`, a true always-on-top Tkinter overlay, `eval7`-powered equity. Needs a local
  Python install.
- **Browser (`web/`)** — runs entirely client-side, no install beyond a modern browser.
  Trades some capability for convenience — see "Browser version" below for the
  platform constraints this comes with (screen-share permission prompts, no silent
  capture, floating overlay only in Chrome/Edge).

**This was built for chip-only friendly games with no money on the line.** Even without
money at stake, it's still an analytical edge — consider telling your group you're
running it.

## What it actually is (read before trusting it)

This is a **heuristic aid, not a GTO solver**: it runs a Monte Carlo equity calculation
(`eval7`) against an assumed opponent range (default: any two random cards) and compares
that to pot odds, then applies a fixed sizing table for bets/raises. It has no visibility
into betting history, positions, or real opponent ranges beyond what's on screen each
tick — treat its opponent-range assumption as a rough approximation, not ground truth.
Screen-scraping is also inherently fragile: if you resize the browser window, change
zoom level, or switch table themes, you'll need to recalibrate.

## Desktop version setup

1. Install the system OCR dependency:
   ```
   brew install tesseract
   ```
2. Install Python dependencies:
   ```
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Calibrate the table regions (one time per browser window size/zoom/theme):
   ```
   python calibrate.py
   ```
   Bring your table window to the front, press Enter, then drag a box around each
   requested region (hole cards, board cards, stack/pot/bet-to-call numbers, the
   action-buttons area, and each opponent's stack). Escape stops the opponent-stack loop.
4. Build the card template set (one time, reusable across sessions as long as the theme
   doesn't change):
   ```
   python build_templates.py
   ```
   It'll ask you to show each of the 52 cards in the hero-card-1 region. You can skip
   cards you can't show right now and re-run later — it only asks for what's missing.
5. Run it:
   ```
   ./run.sh
   ```

## How the desktop version works

- `capture.py` — `mss`-based grabs of only the calibrated regions, not the full screen.
- `recognize_cards.py` — template matching (`cv2.matchTemplate`) against the 52-card set.
- `recognize_text.py` — Tesseract OCR restricted to digits for stacks/pot/bet-to-call.
- `state.py` — the current hand's `TableState` (cards, board, stacks, pot, bet-to-call).
- `engine.py` — Monte Carlo equity + pot-odds + sizing heuristic → a `Decision`.
- `overlay.py` — the always-on-top Tkinter recommendation panel.
- `main.py` — polling loop: only runs recognition + the decision when the calibrated
  "your turn" region looks active, to avoid burning CPU between hands. Prints a per-tick
  latency line to the terminal so you can see where time is going.

## Tuning latency

`main.py` prints `[tick] Nms ...` for every decision. If you're creeping over ~1s:
- Lower `MONTE_CARLO_TRIALS` in `config.py` (equity accuracy vs. speed trade-off).
- Shrink the calibrated regions as tightly as possible around each card/number —
  smaller crops mean faster template matching and OCR.
- Make sure `action_trigger` is a small region, not a huge one — it's checked every
  idle tick.

## Known limitations

- No true action-history tracking — opponent range is a flat assumption, not learned
  from betting patterns.
- Card/number recognition depends on calibration staying valid; recalibrate after any
  layout change.
- Multi-way pots beyond a couple of opponents will lean on `num_opponents` inferred from
  how many opponent-stack regions currently OCR a value, which can be noisy.

## Browser version (`web/`)

A from-scratch client-side reimplementation — no Python, no install, works from a URL.
None of the desktop Python stack (`mss`, OpenCV, `eval7`, the Tesseract binary, Tkinter)
runs in a browser, so this is a parallel implementation, not a port of the same code —
though `engine.js`'s equity math and decision thresholds are a direct port of `engine.py`'s
so both versions make the same call given the same inputs (cross-checked: AA heads-up
≈85% equity, 72o ≈35% in both).

### Try it
Open `web/index.html` via a local static server (`python3 -m http.server` from inside
`web/`, then visit `http://localhost:8000`) or the hosted GitHub Pages URL, and follow
the 4 on-page steps: share screen → calibrate → build card templates → start.

### Platform constraints (inherent to browsers, not bugs)
- **No silent capture.** `getDisplayMedia` shows a native picker every session — you
  must explicitly choose a screen/window/tab each time you start it, and the browser
  shows a persistent "sharing" indicator the whole time. Unlike `mss`, this can't run
  invisibly in the background.
- **Floating overlay is Chrome/Edge only.** It uses the Document Picture-in-Picture API
  for a real always-on-top window. Safari and Firefox don't support it, so those
  browsers get an in-page panel instead (the app detects this automatically and tells
  you which mode it's in).
- **User-gesture required.** Both screen-share and the floating window can only be
  started by a real click — they can't auto-start on page load.

### How it works
- `capture.js` — `getDisplayMedia` into a hidden `<video>`, then per-tick region crops
  via canvas `drawImage`, mirroring `capture.py`'s region-grab design.
- `calibrate.js` — same drag-to-select flow as `calibrate.py`, persisted to
  `localStorage` instead of a JSON file.
- `templates.js` / `recognizeCards.js` — the 52-card template set is stored as small PNG
  data URLs in `localStorage`; matching is mean-squared pixel error between a
  canonical-resized crop and each template (no OpenCV.js — a large WASM download that
  wasn't worth it for a controlled, calibrated capture region).
- `recognizeText.js` — [Tesseract.js](https://github.com/naptha/tesseract.js) (loaded
  from a CDN `<script>` tag), one persistent worker reused across calls — re-creating it
  per call was the biggest latency risk found while building this.
- `engine.js` — a from-scratch 7-card hand evaluator (best of the 21 five-card
  combinations, a standard technique) plus the same Monte Carlo equity + pot-odds +
  sizing heuristic as `engine.py`. Default trial count is lower than the desktop version
  (JS hand evaluation is slower than `eval7`'s C extension, and OCR is the bigger latency
  risk here) — tune `monteCarloTrials` in `config.js` if needed.
- `overlay.js` — Document Picture-in-Picture window with an in-page fallback.
- `app.js` — wires it all together and drives the polling loop; the log panel prints a
  `[tick] Nms ...` line per decision just like the desktop version's terminal output.

### Known limitations (in addition to the desktop version's)
- Card/number recognition and equity math were verified with synthetic canvases and a
  headless-browser smoke test (OCR round-trip, card matching, hand-evaluator
  correctness, decision logic) — the actual `getDisplayMedia` capture and manual
  calibration-dragging flow against a real table needs to be tried live; those can't be
  exercised headlessly.
- `localStorage` (layout + templates) is per-browser-profile — switching browsers or
  using a private/incognito window means recalibrating and rebuilding templates.
- The pixel-diff card matcher is more sensitive to compression artifacts/scaling than
  the desktop version's `cv2.matchTemplate` — if matches feel unreliable, check
  `cardMatchMaxError` in `config.js`.
