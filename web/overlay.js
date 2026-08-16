/**
 * Recommendation display. Uses the Document Picture-in-Picture API for a real
 * always-on-top floating window when available (Chrome/Edge); falls back to an
 * in-page panel everywhere else (Safari/Firefox, or if the user denies PiP).
 */
import { CONFIG } from "./config.js";

const COLORS = { FOLD: "#e05555", CHECK: "#cccccc", CALL: "#55aaff", RAISE: "#55e055" };

export class Overlay {
  constructor() {
    this.pipWindow = null;
    this.usingPip = false;
    this.actionEl = null;
    this.detailEl = null;
    this.reasonEl = null;
  }

  /** `inPagePanelEl` is the fallback mount point used when PiP isn't available. */
  async start(inPagePanelEl) {
    if ("documentPictureInPicture" in window) {
      try {
        this.pipWindow = await documentPictureInPicture.requestWindow({
          width: CONFIG.overlay.width,
          height: CONFIG.overlay.height,
        });
        this._buildPanel(this.pipWindow.document, this.pipWindow.document.body);
        this.usingPip = true;
        this.pipWindow.addEventListener("pagehide", () => {
          this.pipWindow = null;
          this.usingPip = false;
        });
        return;
      } catch (err) {
        console.warn("Document Picture-in-Picture unavailable, falling back to in-page panel.", err);
      }
    }
    this._buildPanel(document, inPagePanelEl);
    this.usingPip = false;
  }

  _buildPanel(doc, mountEl) {
    const style = doc.createElement("style");
    // Duplicated deliberately: Document Picture-in-Picture renders in a
    // completely separate document, so the main page's style.css never
    // reaches it -- every rule this panel needs must be injected here too,
    // kept in sync by hand with the equivalent block in style.css.
    style.textContent = `
      .fh-panel { background: #1e1e1e; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  padding: 12px 0; border-radius: 8px; }
      .fh-action { font-size: 26px; font-weight: bold; text-align: center; }
      .fh-detail { font-size: 14px; text-align: center; color: #a0a0a0; margin-top: 4px; }
      .fh-reason { font-size: 11px; text-align: center; color: #707070; margin-top: 6px; padding: 0 10px; }

      /* Fast settle-in pop on a fresh decision -- the real action text is
         already correct at frame 0, this is a purely visual entrance so a
         new hand's verdict registers as "just landed," not a digit reveal. */
      @keyframes fh-action-pop {
        0% { transform: scale(0.88); opacity: 0.45; }
        100% { transform: scale(1); opacity: 1; }
      }
      .fh-action-pop { animation: fh-action-pop 140ms cubic-bezier(0.2, 0.8, 0.2, 1); }

      @keyframes fh-detail-flash {
        0% { background: rgba(37, 99, 235, 0.28); }
        100% { background: transparent; }
      }
      .fh-detail-flash { animation: fh-detail-flash 380ms ease-out; border-radius: 4px; }

      @media (prefers-reduced-motion: reduce) {
        .fh-action-pop, .fh-detail-flash { animation-duration: .01ms !important; }
      }
    `;
    doc.head.appendChild(style);

    const panel = doc.createElement("div");
    panel.className = "fh-panel";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");

    this.actionEl = doc.createElement("div");
    this.actionEl.className = "fh-action";
    this.actionEl.textContent = "—";

    this.detailEl = doc.createElement("div");
    this.detailEl.className = "fh-detail";
    this.detailEl.textContent = "waiting for hand...";

    this.reasonEl = doc.createElement("div");
    this.reasonEl.className = "fh-reason";

    panel.append(this.actionEl, this.detailEl, this.reasonEl);
    mountEl.innerHTML = "";
    mountEl.appendChild(panel);
  }

  show(decision) {
    if (!this.actionEl) return;
    this.actionEl.textContent = decision.action;
    this.actionEl.style.color = COLORS[decision.action] || "#fff";
    this.detailEl.textContent = decision.raiseTo
      ? `raise to ${decision.raiseTo}`
      : `equity ${(decision.equity * 100).toFixed(0)}%`;
    this.reasonEl.textContent = decision.reason;
    // Text is already correct above; these classes are a purely visual
    // "this just landed" cue, retriggered via reflow since vanilla JS has
    // no key-based remount to lean on.
    this._retrigger(this.actionEl, "fh-action-pop");
    this._retrigger(this.detailEl, "fh-detail-flash");
  }

  _retrigger(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  showIdle(text = "waiting for hand...") {
    if (!this.actionEl) return;
    this.actionEl.textContent = "—";
    this.actionEl.style.color = "#fff";
    this.detailEl.textContent = text;
    this.reasonEl.textContent = "";
  }
}
