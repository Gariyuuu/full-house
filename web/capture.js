/**
 * Screen capture via the browser Screen Capture API. Unlike the desktop version's
 * mss (silent, region-only grabs), this requires an explicit user gesture each
 * session and always shows the browser's native sharing indicator — a browser
 * platform constraint, not a limitation of this code.
 */
export class TableCapture {
  constructor() {
    this.stream = null;
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  }

  async start() {
    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "never" },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    if (!this.video.videoWidth) {
      await new Promise((resolve) => {
        this.video.onloadedmetadata = resolve;
      });
    }
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    return this.stream;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  isActive() {
    return !!this.stream && this.stream.getVideoTracks().some((t) => t.readyState === "live");
  }

  get frameSize() {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  /** Draw the current video frame into the internal canvas. Call once per tick before grabRegion(). */
  captureFrame() {
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
  }

  /** Crop a calibrated region ({left, top, width, height}, in native frame pixels) out of
   * the last captured frame and return it as a small standalone canvas. */
  grabRegion(region) {
    const out = document.createElement("canvas");
    out.width = region.width;
    out.height = region.height;
    out.getContext("2d", { willReadFrequently: true }).drawImage(
      this.canvas,
      region.left, region.top, region.width, region.height,
      0, 0, region.width, region.height
    );
    return out;
  }
}
