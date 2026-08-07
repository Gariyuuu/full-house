# UI_SYSTEM.md

There is exactly one UI surface in the desktop Python assistant: the overlay
panel implemented in `overlay.py`. (The browser version, `web/`, has its own
separate UI — `web/index.html` + `web/style.css` + `web/overlay.js` — which is
out of primary scope for this pass; see README.md's "Browser version" section.)

## What it renders

A small, borderless, always-on-top window with three vertically-stacked labels:

1. **Action label** — the recommendation itself: `FOLD`, `CHECK`, `CALL`,
   `RAISE`, or `—` when idle. Large, bold (`Helvetica 22 bold`), white text,
   color-coded via its foreground color per action (see "Color coding" below).
2. **Detail label** — either `raise to {N}` (when `decision.raise_to` is set) or
   `equity {N%}` (otherwise), or the idle message when not hero's turn. Smaller
   (`Helvetica 12`), light gray (`#a0a0a0`), word-wrapped and centered.
3. **Reason label** — the human-readable justification string produced by
   `engine.decide` (e.g. `"62% equity vs 40% pot odds, raising for value"`).
   Smallest (`Helvetica 10`), dim gray (`#707070`), word-wrapped and centered.

Two states drive what's shown, both called from `main.py`'s `tick()`:

- `overlay.show(decision)` — populates all three labels from an `engine.Decision`.
- `overlay.show_idle(text="waiting for hand...")` — resets the action label to
  `—` (white), sets the detail label to the given idle text (default "waiting for
  hand...", or "your turn, but couldn't read hole cards" when hero's turn is
  detected but card recognition failed), and clears the reason label.

## How it's positioned

- **Always-on-top:** `self.root.attributes("-topmost", True)`.
- **Borderless:** `self.root.overrideredirect(True)` — no title bar, no window
  chrome, not draggable via a title bar, not closeable via a window-manager close
  button. (There is no in-app way to close it either — it exits when the
  underlying Python process is killed, e.g. Ctrl-C in the terminal running
  `main.py`/`run.sh`.)
- **Fixed screen position:** bottom-right corner, computed once at construction
  from `root.winfo_screenwidth()`/`winfo_screenheight()` minus
  `config.OVERLAY_WIDTH`/`OVERLAY_HEIGHT` and `config.OVERLAY_MARGIN`:
  ```python
  x = screen_w - config.OVERLAY_WIDTH - config.OVERLAY_MARGIN
  y = screen_h - config.OVERLAY_HEIGHT - config.OVERLAY_MARGIN
  ```
  It does not move, resize, or reposition itself after construction — no
  drag-to-move, no remembered position across runs, no multi-monitor-aware
  placement logic (it uses whichever screen Tkinter reports as "the" screen).

## Configuration (all in `config.py`)

| Constant | Default | Effect |
|---|---|---|
| `OVERLAY_WIDTH` | `260` (px) | Window width |
| `OVERLAY_HEIGHT` | `140` (px) | Window height |
| `OVERLAY_MARGIN` | `20` (px) | Distance from the bottom-right screen corner |

No other appearance settings are exposed via config — colors, fonts, and padding
are hardcoded directly in `overlay.py` (not read from `config.py`). To restyle
the panel, `overlay.py` itself must be edited.

## Color coding

Defined in `overlay.py`'s `_COLORS` dict, applied to the action label's
foreground color:

| Action | Color | Hex |
|---|---|---|
| `FOLD` | red | `#e05555` |
| `CHECK` | light gray | `#cccccc` |
| `CALL` | blue | `#55aaff` |
| `RAISE` | green | `#55e055` |
| (idle / unrecognized) | white | `#ffffff` |

Background is a fixed dark theme throughout — `#1e1e1e` for the window and every
label's background, regardless of action. There is no light-mode variant and no
theme configuration.

## Interaction model

There is no interactivity — the overlay is read-only/display-only. No buttons,
no click handlers, no keyboard shortcuts are bound to it. It exists purely to
display state pushed into it by `main.py`'s polling loop (`.show()`/`.show_idle()`);
it never reads input back or drives any logic itself, beyond `.after()`/`.run()`
being reused as the process's actual event-loop driver (see ARCHITECTURE.md).
