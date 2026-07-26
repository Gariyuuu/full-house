"""In-memory representation of the current hand's visible table state."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class TableState:
    hero_cards: list[str] = field(default_factory=list)    # e.g. ["Ah", "Kd"]
    board: list[str] = field(default_factory=list)          # 0-5 cards
    hero_stack: float = 0.0
    pot: float = 0.0
    bet_to_call: float = 0.0
    opponent_stacks: dict[str, float] = field(default_factory=dict)

    @property
    def street(self) -> str:
        return {0: "preflop", 3: "flop", 4: "turn", 5: "river"}.get(len(self.board), "unknown")

    @property
    def num_opponents(self) -> int:
        return max(1, len(self.opponent_stacks))

    def is_complete_for_decision(self) -> bool:
        return len(self.hero_cards) == 2
