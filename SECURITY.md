# SECURITY.md

## Intended-use constraint (not advisory — this defines correct behavior)

**Full House was built and is documented exclusively for chip-only, friendly home
games with no money on the line.** The README states this directly: "This was
built for chip-only friendly games with no money on the line. Even without money
at stake, it's still an analytical edge — consider telling your group you're
running it." This is restated here as a security/usage-policy constraint, not
just project framing:

- This tool must **never** be positioned, marketed, extended, or used against a
  real-money poker platform or online cardroom.
- Most online real-money poker platforms explicitly prohibit screen-scraping
  assistance tools of exactly this kind in their terms of service; using this
  tool against such a platform would likely violate those terms, independent of
  anything this codebase itself does or doesn't do.
- Any future development request that would make this tool more viable against a
  real-money platform specifically — anti-detection techniques, obfuscating its
  presence, faster/covert capture designed to evade a platform's own detection,
  or removing the friendly-game framing — is against this project's stated
  purpose and should be refused or escalated to the user rather than implemented
  silently. See CLAUDE.md's AI working instructions, item 13.
- Even in its intended no-money context, the tool gives the user "an analytical
  edge" per the README's own words — the README's suggestion to tell your group
  you're running it is a fairness/transparency norm worth preserving in any
  future documentation or onboarding flow, not just a one-time disclosure.

## What data is captured, and where it goes

- **Screen content:** `capture.py` reads only the small, calibrated pixel regions
  defined in `table_layout.json` (hole cards, board, stack/pot/bet-to-call
  numbers, an action-trigger region, opponent stacks) — not the full screen.
  Nothing is captured outside these regions.
- **No network transmission of any kind.** The Python codebase makes zero network
  calls (verified via import inspection — no `requests`/`httpx`/`socket`/etc.
  anywhere in `requirements.txt` or any `.py` file). Everything captured stays
  on the local machine, in local process memory, for the lifetime of that one
  polling tick.
- **No persistent hand history.** `TableState` (the per-tick snapshot of
  recognized cards/stacks/pot) is rebuilt from scratch every tick and never
  written to disk (see DATABASE.md) — no hand-by-hand log of what was seen or
  decided exists anywhere in this codebase.
- **What is written to disk, and why it's not sensitive:** `table_layout.json`
  (pixel coordinates only — no card/hand data) and `templates/*.png` (52 generic
  card-face crops, captured once during setup — not tied to any specific hand or
  session, just what the numbers/suits look like on a given table theme).
  Neither contains opponent identities, real-money amounts, or any
  personally-identifying information.
- **Terminal output:** `main.py` prints a per-tick line
  (`[tick] Nms  street  cards -> action`) to the local terminal only — this is
  local process stdout, not transmitted anywhere, but it does mean hand contents
  are visible in scrollback/terminal history for the duration of the terminal
  session. No file redirection or logging-to-disk of this output exists in the
  codebase itself (a user could redirect it themselves via shell piping, which
  is outside this codebase's control).

## No network exposure

The application never opens a listening socket, never runs a server, and never
makes an outbound HTTP/socket call. It cannot be reached over a network and
cannot leak data over a network, because no network code path exists in it at
all. (This is a statement about the Python codebase specifically; the `web/`
browser version is a different architecture — see below.)

## Secrets and credentials

**No secrets, API keys, tokens, or passwords exist anywhere in this codebase**,
verified by:
- Repo-wide grep for `api[_-]?key|secret|password|token` across all `.py` files
  and `web/*.js`/`web/*.html` — zero matches.
- Manual review of `config.py` (every value is a path, a numeric tuning constant,
  or a UI dimension — see CLAUDE.md's Environment setup table).
- `table_layout.json` and `templates/*.png` (the only locally-generated files)
  contain pixel coordinates and card-face images respectively — no credentials.

`web/.env.local` and `web/.vercel/` exist on disk in this checkout, are
gitignored, are untracked, and were **deliberately not opened or inspected** by
this audit — do not read or transcribe their contents into any documentation,
commit, or output. If a future task genuinely requires touching Vercel
deployment config for `web/`, treat those files as sensitive by default until
proven otherwise.

## Dependency concerns

- **`eval7` version mismatch:** `requirements.txt` pins `eval7>=0.1.11`; the
  actual installed version in this repo's `.venv` is `0.1.10`. Not a known
  security issue specifically, but an unresolved discrepancy worth checking
  before trusting a fresh `pip install -r requirements.txt` to behave
  identically to what's currently installed — see TASKS.md TASK-002.
- **Tesseract is a separate system binary** (installed via Homebrew, not pip) —
  it is outside this repo's dependency-pinning entirely; whatever version is on
  a given machine (this machine: `tesseract 5.5.3`) is what runs, with no
  version check or pin anywhere in the codebase.
- No dependency-vulnerability scanning (e.g. `pip-audit`, Dependabot) is
  configured in this repo — the only GitHub Actions workflow present
  (`.github/workflows/deploy-web.yml`) deploys `web/` to GitHub Pages and does
  not scan or test anything.

## Screen-scraping-specific risk notes

- Because capture regions are fixed pixel coordinates, `_is_hero_turn`
  (`main.py`) and card/number recognition can, in principle, mis-trigger or
  misread if the calibrated regions happen to overlap something other than the
  intended table element after a layout change — this is a correctness risk, not
  a data-exfiltration risk, since (again) nothing captured ever leaves the local
  machine.
- The overlay window (`overlay.py`) is visible on-screen to anyone who can see
  the user's screen (e.g. during screen-sharing for an unrelated purpose,
  streaming, or a shoulder-surfer) — since it's borderless and always-on-top, a
  user screen-sharing for another reason while this tool is running would expose
  both the recommendation and (via the terminal window, if visible) the recent
  tick log. This is a real-world exposure risk worth being aware of, though not
  a codebase defect.
