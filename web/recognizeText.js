/**
 * Restricted-vocabulary OCR via Tesseract.js (loaded from a CDN <script> tag in index.html).
 * A single worker is created once and reused — re-initializing per call is the main risk
 * to the latency budget in the browser. Parsing mirrors ../recognize_text.py.
 */
import { CONFIG } from "./config.js";

let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: CONFIG.tesseractCharWhitelist,
        tessedit_pageseg_mode: "7", // treat the crop as a single line of text
      });
      return worker;
    })();
  }
  return workerPromise;
}

/** Call once before starting the main loop to pay Tesseract.js's WASM/model load cost upfront. */
export async function warmUpOCR() {
  await getWorker();
}

function preprocess(cropCanvas) {
  const out = document.createElement("canvas");
  out.width = cropCanvas.width * 2;
  out.height = cropCanvas.height * 2;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(cropCanvas, 0, 0, out.width, out.height);

  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = gray > 140 ? 255 : 0; // fixed threshold — good enough for high-contrast UI text
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);
  return out;
}

/** OCR a region crop expected to contain a single dollar/chip amount, e.g. "$1,250" or "1.2K". */
export async function readNumber(cropCanvas) {
  const worker = await getWorker();
  const processed = preprocess(cropCanvas);
  const { data } = await worker.recognize(processed);
  let raw = data.text.trim().toUpperCase().replace(/,/g, "").replace(/\$/g, "");

  let multiplier = 1;
  if (raw.endsWith("K")) {
    multiplier = 1000;
    raw = raw.slice(0, -1);
  } else if (raw.endsWith("M")) {
    multiplier = 1_000_000;
    raw = raw.slice(0, -1);
  }

  const match = raw.match(/[\d.]+/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return Number.isNaN(value) ? null : value * multiplier;
}
