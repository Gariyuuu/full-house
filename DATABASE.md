# DATABASE.md

## There is no database.

This project (both the desktop Python assistant and the browser version) has
**no database of any kind** — no SQL, no NoSQL, no ORM, no schema migrations, and
no persistent per-hand or per-session history. This was verified by inspecting
every `.py` file's imports and every module's I/O — none open a database
connection, and no database driver appears in `requirements.txt`.

## Local state that does exist

Two kinds of local, file-based state are written and read, both by the one-time
setup scripts, and both **gitignored** (not committed, not shared, not synced):

1. **`table_layout.json`** — written by `calibrate.py`, read by
   `capture.load_layout()`. A flat JSON object mapping region names (e.g.
   `"hero_card_1"`, `"pot"`, `"opponent_stack_1"`) to pixel rectangles
   (`{"left", "top", "width", "height"}`). This is per-user, per-table-theme
   calibration data — not present in this checkout (never run here), and would
   be meaningless on a different machine/screen/theme even if copied.
2. **`templates/*.png`** — written by `build_templates.py`, read by
   `recognize_cards.get_templates()`. Up to 52 small PNG images, one per card
   (e.g. `Ah.png`, `Ts.png`), captured from the user's own table theme. The
   `templates/` directory exists in this checkout but is **empty** (0 files) —
   card templates are also per-user, per-theme, gitignored data.

Both are read once at startup (or once per `build_templates.py` invocation) and
held in memory (`capture.py`'s `layout` dict, `recognize_cards.py`'s module-level
`_TEMPLATES` cache) — neither is a database in the sense of supporting queries,
transactions, or concurrent access; they are simple config/asset files.

## No per-hand history is stored anywhere

`state.TableState` is rebuilt from scratch every polling tick (see
ARCHITECTURE.md's Data flow section) and is never written to disk or otherwise
persisted. No hand history, decision log, or equity-calculation log is saved
between ticks or between sessions — the only output is the live overlay display
and a `print()`'d latency line to the terminal, neither of which is captured to a
file by the application itself.

## Browser version (`web/`) local storage

Per README.md, the browser version stores its equivalent of the two files above
in the browser's `localStorage` (layout + the 52-card template set as PNG data
URLs) instead of local JSON/PNG files — same purpose (per-browser-profile
calibration state), different storage mechanism, not inspected further here as
`web/` is out of primary scope for this documentation pass.
