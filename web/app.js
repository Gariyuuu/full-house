import { TableCapture } from "./capture.js";
import { loadLayout, saveLayout, runCalibrationUI } from "./calibrate.js";
import { loadTemplates, saveTemplate, missingTemplates } from "./templates.js";
import { recognizeCard, loadTemplateImageData } from "./recognizeCards.js";
import { readNumber, warmUpOCR } from "./recognizeText.js";
import { decide } from "./engine.js";
import { Overlay } from "./overlay.js";
import { CONFIG } from "./config.js";

const capture = new TableCapture();
const overlay = new Overlay();

const els = {
  log: document.getElementById("log"),
  shareBtn: document.getElementById("shareBtn"),
  calibrateBtn: document.getElementById("calibrateBtn"),
  opponentCount: document.getElementById("opponentCount"),
  calibArea: document.getElementById("calibArea"),
  templatesBtn: document.getElementById("templatesBtn"),
  templateArea: document.getElementById("templateArea"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  panel: document.getElementById("panel"),
};

function log(msg) {
  const line = document.createElement("div");
  line.textContent = `${new Date().toLocaleTimeString()}  ${msg}`;
  els.log.prepend(line);
}

els.shareBtn.addEventListener("click", async () => {
  try {
    await capture.start();
    log(`Sharing started (${capture.frameSize.width}x${capture.frameSize.height}). You can calibrate now.`);
    els.calibrateBtn.disabled = false;
  } catch (err) {
    log("Screen share failed or was cancelled: " + err.message);
  }
});

els.calibrateBtn.addEventListener("click", async () => {
  if (!capture.isActive()) return log("Start sharing your screen first.");
  capture.captureFrame();
  const opponentCount = parseInt(els.opponentCount.value, 10) || 0;
  log("Calibration started — drag a box for each requested region.");
  const layout = await runCalibrationUI(capture.canvas, els.calibArea, opponentCount);
  saveLayout(layout);
  log(`Calibration saved (${Object.keys(layout).length} regions).`);
  els.templatesBtn.disabled = false;
});

els.templatesBtn.addEventListener("click", () => {
  if (!capture.isActive()) return log("Start sharing your screen first.");
  const layout = loadLayout();
  if (!layout || !layout.hero_card_1) return log("Calibrate hero_card_1 first.");

  els.templateArea.innerHTML = "";
  const missing = missingTemplates();
  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = `${missing.length} of 52 templates still needed. Show each card in the HERO CARD 1 region.`;
  els.templateArea.appendChild(status);

  const preview = document.createElement("canvas");
  preview.width = 96;
  preview.height = 132;
  preview.className = "template-preview";
  preview.setAttribute("aria-hidden", "true");
  els.templateArea.appendChild(preview);
  els.templateArea.appendChild(document.createElement("br"));

  const select = document.createElement("select");
  select.setAttribute("aria-label", "Card to capture next");
  for (const code of missing) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    select.appendChild(opt);
  }
  els.templateArea.appendChild(select);

  const captureBtn = document.createElement("button");
  captureBtn.textContent = "Capture this card";
  els.templateArea.appendChild(captureBtn);

  function refreshPreview() {
    if (!capture.isActive()) return;
    capture.captureFrame();
    const crop = capture.grabRegion(layout.hero_card_1);
    preview.getContext("2d").drawImage(crop, 0, 0, preview.width, preview.height);
  }
  const previewInterval = setInterval(refreshPreview, 200);

  captureBtn.addEventListener("click", () => {
    capture.captureFrame();
    const crop = capture.grabRegion(layout.hero_card_1);
    const dataUrl = crop.toDataURL("image/png");
    saveTemplate(select.value, dataUrl);
    log(`Saved template for ${select.value}.`);
    select.remove(select.selectedIndex);
    if (select.options.length === 0) {
      clearInterval(previewInterval);
      status.textContent = "All 52 templates captured!";
      captureBtn.disabled = true;
    } else {
      status.textContent = `${select.options.length} of 52 templates still needed.`;
    }
  });
});

const BOARD_KEYS = ["board_card_1", "board_card_2", "board_card_3", "board_card_4", "board_card_5"];

function isHeroTurn(layout) {
  const crop = capture.grabRegion(layout.action_trigger);
  const { data } = crop.getContext("2d").getImageData(0, 0, crop.width, crop.height);
  let sum = 0;
  let sumSq = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return Math.sqrt(Math.max(variance, 0)) > 15;
}

async function readState(layout, templates) {
  const hc1 = recognizeCard(capture.grabRegion(layout.hero_card_1), templates);
  const hc2 = recognizeCard(capture.grabRegion(layout.hero_card_2), templates);
  const heroCards = [hc1, hc2].filter(Boolean);

  const board = [];
  for (const key of BOARD_KEYS) {
    if (!layout[key]) continue;
    const card = recognizeCard(capture.grabRegion(layout[key]), templates);
    if (card) board.push(card);
  }

  const heroStack = (await readNumber(capture.grabRegion(layout.hero_stack))) || 0;
  const pot = (await readNumber(capture.grabRegion(layout.pot))) || 0;
  const betToCall = (await readNumber(capture.grabRegion(layout.bet_to_call))) || 0;

  let numOpponents = 0;
  for (const key of Object.keys(layout)) {
    if (key.startsWith("opponent_stack_")) {
      const val = await readNumber(capture.grabRegion(layout[key]));
      if (val !== null) numOpponents++;
    }
  }

  return { heroCards, board, heroStack, pot, betToCall, numOpponents: Math.max(1, numOpponents) };
}

let running = false;

async function tick(layout, templates) {
  if (!running) return;
  const t0 = performance.now();

  if (!capture.isActive()) {
    log("Screen sharing stopped — bot paused.");
    running = false;
    return;
  }

  capture.captureFrame();

  if (!isHeroTurn(layout)) {
    overlay.showIdle();
    setTimeout(() => tick(layout, templates), CONFIG.idlePollIntervalMs);
    return;
  }

  const state = await readState(layout, templates);
  if (state.heroCards.length !== 2) {
    overlay.showIdle("your turn, but couldn't read hole cards");
    setTimeout(() => tick(layout, templates), CONFIG.activePollIntervalMs);
    return;
  }

  const decision = decide({
    heroCards: state.heroCards,
    board: state.board,
    pot: state.pot,
    betToCall: state.betToCall,
    numOpponents: state.numOpponents,
    heroStack: state.heroStack,
  });
  overlay.show(decision);

  const ms = performance.now() - t0;
  log(`[tick] ${ms.toFixed(0)}ms  ${state.heroCards.join(",")}+${state.board.join(",")} -> ${decision.action}`);

  setTimeout(() => tick(layout, templates), CONFIG.activePollIntervalMs);
}

els.startBtn.addEventListener("click", async () => {
  const layout = loadLayout();
  if (!layout) return log("Calibrate first.");
  if (Object.keys(loadTemplates()).length === 0) return log("Build card templates first.");

  const templates = await loadTemplateImageData();
  log("Warming up OCR engine (first load can take a few seconds)...");
  await warmUpOCR();

  await overlay.start(els.panel);
  log(`Overlay started (${overlay.usingPip ? "floating Picture-in-Picture window" : "in-page panel — your browser doesn't support floating mode"}).`);

  running = true;
  els.startBtn.disabled = true;
  els.stopBtn.disabled = false;
  tick(layout, templates);
});

els.stopBtn.addEventListener("click", () => {
  running = false;
  overlay.showIdle("stopped");
  log("Bot stopped.");
  els.startBtn.disabled = false;
  els.stopBtn.disabled = true;
});
