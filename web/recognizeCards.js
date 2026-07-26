/**
 * Card recognition via mean-squared pixel error against the stored template set.
 * No OpenCV.js (large WASM download) — a direct canvas pixel comparison is enough
 * since region size/lighting is fixed by calibration, same idea as ../recognize_cards.py's
 * cv2.matchTemplate but implemented by hand.
 */
import { CONFIG } from "./config.js";
import { loadTemplates } from "./templates.js";

function canonicalize(sourceCanvas) {
  const { width, height } = CONFIG.canonicalCardSize;
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function dataUrlToImageData(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = CONFIG.canonicalCardSize;
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Loads all stored templates as canonical-size ImageData, ready for matching.
 * Call once at bot start (and again if templates change) and pass the result to recognizeCard(). */
export async function loadTemplateImageData() {
  const raw = loadTemplates();
  const entries = await Promise.all(
    Object.entries(raw).map(async ([code, dataUrl]) => [code, await dataUrlToImageData(dataUrl)])
  );
  return Object.fromEntries(entries);
}

function meanSquaredError(a, b) {
  let sum = 0;
  const n = a.data.length;
  for (let i = 0; i < n; i += 4) {
    const dr = a.data[i] - b.data[i];
    const dg = a.data[i + 1] - b.data[i + 1];
    const db = a.data[i + 2] - b.data[i + 2];
    sum += dr * dr + dg * dg + db * db;
  }
  return sum / (n / 4);
}

/** Match a cropped region canvas against known templates (output of loadTemplateImageData()).
 * Returns a card code like "Ah", or null if nothing clears the error threshold
 * (empty seat, face-down card, or a template that hasn't been captured yet). */
export function recognizeCard(cropCanvas, templates) {
  const candidate = canonicalize(cropCanvas);
  let bestCode = null;
  let bestError = Infinity;
  for (const [code, templateData] of Object.entries(templates)) {
    const err = meanSquaredError(candidate, templateData);
    if (err < bestError) {
      bestError = err;
      bestCode = code;
    }
  }
  if (bestError > CONFIG.cardMatchMaxError) return null;
  return bestCode;
}
