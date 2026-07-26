/** Card template storage in localStorage: 52 small PNG data URLs, one per card code. */
const TEMPLATES_KEY = "fullhouse_templates";

export const RANKS = "23456789TJQKA";
export const SUITS = "shdc";
export const DECK = [];
for (const r of RANKS) for (const s of SUITS) DECK.push(r + s);

export function loadTemplates() {
  const raw = localStorage.getItem(TEMPLATES_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveTemplate(code, dataUrl) {
  const templates = loadTemplates();
  templates[code] = dataUrl;
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function clearTemplates() {
  localStorage.removeItem(TEMPLATES_KEY);
}

export function missingTemplates() {
  const have = loadTemplates();
  return DECK.filter((c) => !have[c]);
}
