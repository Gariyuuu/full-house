/**
 * Interactive drag-to-select calibration UI, and layout persistence via localStorage.
 * Same region set as ../calibrate.py's FIXED_REGIONS, so the two versions stay in sync.
 */
const LAYOUT_KEY = "fullhouse_layout";

export const FIXED_REGIONS = [
  ["hero_card_1", "Hero's LEFT hole card"],
  ["hero_card_2", "Hero's RIGHT hole card"],
  ["board_card_1", "Board card 1 (leftmost flop card)"],
  ["board_card_2", "Board card 2"],
  ["board_card_3", "Board card 3"],
  ["board_card_4", "Turn card"],
  ["board_card_5", "River card"],
  ["hero_stack", "Hero's stack size number"],
  ["pot", "Pot size number"],
  ["bet_to_call", "Current bet-to-call number (mark the area even if it reads 0 right now)"],
  ["action_trigger", "A region that ONLY appears when it's your turn (e.g. the action buttons row)"],
];

export function loadLayout() {
  const raw = localStorage.getItem(LAYOUT_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveLayout(layout) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

export function clearLayout() {
  localStorage.removeItem(LAYOUT_KEY);
}

/**
 * Runs the drag-to-select flow over a still frame. `frameCanvas` is the source frame
 * (call capture.captureFrame() first, then pass capture.canvas). Mounts UI into
 * `containerEl`. Resolves with the completed layout object, keyed the same way as
 * table_layout.json in the Python version.
 */
export function runCalibrationUI(frameCanvas, containerEl, opponentCount) {
  return new Promise((resolve) => {
    containerEl.innerHTML = "";

    const prompt = document.createElement("div");
    prompt.className = "calib-prompt";
    containerEl.appendChild(prompt);

    const displayCanvas = document.createElement("canvas");
    const scale = Math.min(900 / frameCanvas.width, 600 / frameCanvas.height, 1);
    displayCanvas.width = Math.round(frameCanvas.width * scale);
    displayCanvas.height = Math.round(frameCanvas.height * scale);
    displayCanvas.className = "calib-canvas";
    containerEl.appendChild(displayCanvas);

    const dctx = displayCanvas.getContext("2d");
    const redraw = () => dctx.drawImage(frameCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
    redraw();

    const layout = {};
    const queue = [...FIXED_REGIONS];
    for (let i = 0; i < opponentCount; i++) {
      queue.push([`opponent_stack_${i + 1}`, `Opponent seat ${i + 1} stack size`]);
    }

    let qi = 0;
    let startX = 0, startY = 0, dragging = false;

    function nextPrompt() {
      if (qi >= queue.length) {
        containerEl.innerHTML = "";
        resolve(layout);
        return;
      }
      prompt.textContent = `${queue[qi][1]}  (drag a box on the image below)`;
    }

    displayCanvas.addEventListener("mousedown", (e) => {
      const rect = displayCanvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      dragging = true;
    });
    displayCanvas.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const rect = displayCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      redraw();
      dctx.strokeStyle = "#ff4444";
      dctx.lineWidth = 2;
      dctx.strokeRect(Math.min(startX, x), Math.min(startY, y), Math.abs(x - startX), Math.abs(y - startY));
    });
    displayCanvas.addEventListener("mouseup", (e) => {
      if (!dragging) return;
      dragging = false;
      const rect = displayCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const region = {
        left: Math.round(Math.min(startX, x) / scale),
        top: Math.round(Math.min(startY, y) / scale),
        width: Math.max(1, Math.round(Math.abs(x - startX) / scale)),
        height: Math.max(1, Math.round(Math.abs(y - startY) / scale)),
      };
      layout[queue[qi][0]] = region;
      qi++;
      nextPrompt();
    });

    nextPrompt();
  });
}
