export const CONFIG = {
  idlePollIntervalMs: 300,
  activePollIntervalMs: 150,

  // Trial count tuned via engine.bench.mjs — JS hand evaluation is slower than the
  // desktop version's eval7 C extension, and Tesseract.js OCR is the bigger latency
  // risk here, so this defaults lower than the Python version's 20,000.
  monteCarloTrials: 3000,

  // Mean squared pixel error threshold for card template matching (lower = stricter).
  // Tune empirically against your table's actual card graphics.
  cardMatchMaxError: 1500,
  canonicalCardSize: { width: 32, height: 44 },

  tesseractCharWhitelist: "0123456789.,$KM",

  overlay: { width: 260, height: 150 },
};
