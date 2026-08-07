# API_REFERENCE.md

## There are no HTTP APIs.

This project makes **no network calls of any kind** in the Python codebase — no
HTTP server, no HTTP client, no REST/GraphQL/WebSocket endpoints, inbound or
outbound. This was verified by inspecting every `.py` file's imports (no
`requests`, `httpx`, `flask`, `fastapi`, `socket`, `urllib`, or similar appear
anywhere in `requirements.txt` or any `import` statement in the codebase). The
tool is entirely local: it reads the screen and writes to a local Tkinter window.

What follows instead is a reference for the **internal module interfaces** —
the function/class signatures other code (or a future contributor) would call
into, since that's the closest useful equivalent of an "API reference" for this
codebase.

## `capture.py`

```python
def load_layout() -> dict
# Reads config.LAYOUT_PATH (table_layout.json). Raises RuntimeError if missing.

class TableCapture:
    def __init__(self, layout: dict)
    def grab(self, region_key: str) -> np.ndarray   # RGB, shape (h, w, 3)
    def grab_all(self) -> dict                        # {region_key: RGB array}
    def close(self) -> None
```

## `recognize_cards.py`

```python
def get_templates() -> dict[str, np.ndarray]
# Lazily loads and caches (module-level) all templates found in templates/.

def recognize_card(crop: np.ndarray) -> str | None
# crop: RGB numpy array. Returns a card code like "Ah", or None below
# config.CARD_MATCH_THRESHOLD. Raises RuntimeError if templates/ is empty.
```

## `recognize_text.py`

```python
def read_number(crop: np.ndarray) -> float | None
# crop: RGB numpy array. OCRs a single amount ("1,250", "$1,250", "1.2K", "1.2M").
# Returns None if nothing numeric is found.
```

## `state.py`

```python
@dataclass
class TableState:
    hero_cards: list[str]              # e.g. ["Ah", "Kd"]
    board: list[str]                    # 0-5 cards
    hero_stack: float
    pot: float
    bet_to_call: float
    opponent_stacks: dict[str, float]   # {"opponent_stack_1": 340.0, ...}

    @property
    def street(self) -> str             # "preflop" | "flop" | "turn" | "river" | "unknown"
    @property
    def num_opponents(self) -> int      # max(1, len(opponent_stacks))
    def is_complete_for_decision(self) -> bool   # both hero cards recognized
```

## `engine.py`

```python
@dataclass
class Decision:
    action: str              # "FOLD" | "CHECK" | "CALL" | "RAISE"
    raise_to: float | None
    equity: float
    pot_odds: float
    reason: str

def calc_equity(
    hero_cards: list[str],
    board: list[str],
    num_opponents: int,
    trials: int = config.MONTE_CARLO_TRIALS,
) -> float
# Monte Carlo equity of hero's hand vs num_opponents random hands.

def decide(
    hero_cards: list[str],
    board: list[str],
    pot: float,
    bet_to_call: float,
    num_opponents: int,
    hero_stack: float,
) -> Decision
# The main entry point for a recommendation.
```

## `overlay.py`

```python
class Overlay:
    def __init__(self)
    def show(self, decision: engine.Decision) -> None
    def show_idle(self, text: str = "waiting for hand...") -> None
    def after(self, ms: int, callback) -> None   # thin wrapper over Tkinter's root.after
    def run(self) -> None                          # thin wrapper over root.mainloop
```

## `config.py`

Not a callable interface — a flat module of constants consumed by every other
module (paths, poll intervals, `MONTE_CARLO_TRIALS`, `OPPONENT_RANGE`,
`TESSERACT_CONFIG`, `CARD_MATCH_THRESHOLD`, overlay geometry). See CLAUDE.md's
Environment setup table for the full list and SECURITY.md for confirmation none
of these values are secrets.

## `main.py`

Not a reusable interface — the entry point. Its internal functions
(`_is_hero_turn`, `_read_state`, `tick`, `main`) are private (leading underscore
on the first two) and not intended to be imported/called from elsewhere.

## Browser version (`web/`)

Not covered here — out of primary scope for this documentation pass. See
README.md's "Browser version" section for its module list
(`app.js`/`capture.js`/`calibrate.js`/`engine.js`/etc.), which mirrors this same
module breakdown for the client-side implementation.
