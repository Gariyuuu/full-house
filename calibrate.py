"""Interactive calibration: click-drag to mark each table region once.

Run this whenever the browser window size, zoom level, or table theme changes —
screen-scraping is inherently tied to fixed pixel regions. Screenshot-based, so it
works for any virtual table site (PokerNow.club, etc.) without needing site API access.
"""
from __future__ import annotations

import json

import mss
import tkinter as tk
from PIL import Image, ImageTk

import config

FIXED_REGIONS = [
    ("hero_card_1", "Hero's LEFT hole card"),
    ("hero_card_2", "Hero's RIGHT hole card"),
    ("board_card_1", "Board card 1 (leftmost flop card)"),
    ("board_card_2", "Board card 2"),
    ("board_card_3", "Board card 3"),
    ("board_card_4", "Turn card"),
    ("board_card_5", "River card"),
    ("hero_stack", "Hero's stack size number"),
    ("pot", "Pot size number"),
    ("bet_to_call", "Current bet-to-call number (mark the amount area even if it's 0 right now)"),
    ("action_trigger", "A region that ONLY shows up when it's your turn (e.g. the action buttons row)"),
]


class RegionPicker:
    def __init__(self, screenshot: Image.Image):
        self.root = tk.Tk()
        self.root.title("Full House calibration")
        self.root.attributes("-fullscreen", True)
        self.root.attributes("-topmost", True)

        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        img_w, img_h = screenshot.size
        self.scale = min(screen_w / img_w, screen_h / img_h, 1.0)
        disp_w, disp_h = int(img_w * self.scale), int(img_h * self.scale)
        self.tk_img = ImageTk.PhotoImage(screenshot.resize((disp_w, disp_h)))

        self.canvas = tk.Canvas(self.root, width=disp_w, height=disp_h, cursor="cross")
        self.canvas.pack()
        self.canvas.create_image(0, 0, anchor="nw", image=self.tk_img)

        self.label = tk.Label(self.root, text="", font=("Helvetica", 16), bg="yellow")
        self.canvas.create_window(10, 10, anchor="nw", window=self.label)

        self.start_x = self.start_y = None
        self.rect_id = None
        self._last_region = None

        self.canvas.bind("<ButtonPress-1>", self._on_press)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self.canvas.bind("<ButtonRelease-1>", self._on_release)
        self.root.bind("<Escape>", self._on_escape)

    def _on_press(self, event):
        self.start_x, self.start_y = event.x, event.y
        if self.rect_id:
            self.canvas.delete(self.rect_id)
        self.rect_id = self.canvas.create_rectangle(
            self.start_x, self.start_y, self.start_x, self.start_y, outline="red", width=2
        )

    def _on_drag(self, event):
        self.canvas.coords(self.rect_id, self.start_x, self.start_y, event.x, event.y)

    def _on_release(self, event):
        x0, y0 = min(self.start_x, event.x), min(self.start_y, event.y)
        x1, y1 = max(self.start_x, event.x), max(self.start_y, event.y)
        self._last_region = {
            "left": int(x0 / self.scale),
            "top": int(y0 / self.scale),
            "width": max(1, int((x1 - x0) / self.scale)),
            "height": max(1, int((y1 - y0) / self.scale)),
        }
        self.root.quit()

    def _on_escape(self, _event):
        self._last_region = None
        self.root.quit()

    def pick(self, prompt: str) -> dict | None:
        self.label.config(text=f"{prompt}   (drag a box; Escape to stop adding opponents)")
        self._last_region = None
        self.root.mainloop()
        return self._last_region

    def close(self):
        self.root.destroy()


def capture_full_screenshot() -> Image.Image:
    with mss.mss() as sct:
        monitor = sct.monitors[1]  # primary monitor
        raw = sct.grab(monitor)
        return Image.frombytes("RGB", raw.size, raw.rgb)


def run_calibration():
    print("Bring your poker table window to the front, then press Enter to screenshot it...")
    input()
    screenshot = capture_full_screenshot()
    picker = RegionPicker(screenshot)

    regions = {}
    for key, prompt in FIXED_REGIONS:
        region = picker.pick(prompt)
        if region is None:
            print(f"Skipped {key} — you can re-run calibration later to fill it in.")
            continue
        regions[key] = region
        print(f"  {key}: {region}")

    idx = 1
    while True:
        region = picker.pick(f"Opponent seat {idx} stack size (Escape when no more opponents)")
        if region is None:
            break
        regions[f"opponent_stack_{idx}"] = region
        idx += 1

    picker.close()

    config.LAYOUT_PATH.write_text(json.dumps(regions, indent=2))
    print(f"\nSaved layout to {config.LAYOUT_PATH}")
    print("Next: run build_templates.py to capture the 52-card template set.")


if __name__ == "__main__":
    run_calibration()
