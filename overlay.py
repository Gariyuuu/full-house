"""Always-on-top overlay panel showing the current recommendation."""
from __future__ import annotations

import tkinter as tk

import config
from engine import Decision

_COLORS = {"FOLD": "#e05555", "CHECK": "#cccccc", "CALL": "#55aaff", "RAISE": "#55e055"}


class Overlay:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Full House")
        self.root.attributes("-topmost", True)
        self.root.overrideredirect(True)

        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        x = screen_w - config.OVERLAY_WIDTH - config.OVERLAY_MARGIN
        y = screen_h - config.OVERLAY_HEIGHT - config.OVERLAY_MARGIN
        self.root.geometry(f"{config.OVERLAY_WIDTH}x{config.OVERLAY_HEIGHT}+{x}+{y}")
        self.root.configure(bg="#1e1e1e")

        self.action_label = tk.Label(
            self.root, text="—", font=("Helvetica", 22, "bold"), fg="#ffffff", bg="#1e1e1e"
        )
        self.action_label.pack(pady=(12, 0))

        self.detail_label = tk.Label(
            self.root, text="waiting for hand...", font=("Helvetica", 12),
            fg="#a0a0a0", bg="#1e1e1e", wraplength=config.OVERLAY_WIDTH - 20, justify="center",
        )
        self.detail_label.pack(pady=(4, 0))

        self.reason_label = tk.Label(
            self.root, text="", font=("Helvetica", 10), fg="#707070", bg="#1e1e1e",
            wraplength=config.OVERLAY_WIDTH - 20, justify="center",
        )
        self.reason_label.pack(pady=(6, 0))

    def show(self, decision: Decision):
        self.action_label.config(text=decision.action, fg=_COLORS.get(decision.action, "#ffffff"))
        detail = f"raise to {decision.raise_to:.0f}" if decision.raise_to else f"equity {decision.equity:.0%}"
        self.detail_label.config(text=detail)
        self.reason_label.config(text=decision.reason)

    def show_idle(self, text: str = "waiting for hand..."):
        self.action_label.config(text="—", fg="#ffffff")
        self.detail_label.config(text=text)
        self.reason_label.config(text="")

    def after(self, ms: int, callback):
        self.root.after(ms, callback)

    def run(self):
        self.root.mainloop()
