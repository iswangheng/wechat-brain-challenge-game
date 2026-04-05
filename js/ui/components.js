/**
 * Canvas UI components: Button, Text, ProgressBar
 * All coordinates in logical pixels (pre-DPR)
 */

const COLORS = {
  primary: "#FFD700",
  primaryDark: "#B8960F",
  green: "#2ED573",
  red: "#FF4757",
  white: "#FFFFFF",
  bg: "#F5F5F5",
  text: "#333333",
  textLight: "#666666",
  textMuted: "#999999",
  border: "#E8E8E8",
  overlay: "rgba(0,0,0,0.5)",
};

/**
 * Draw a rounded rectangle path
 */
const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/**
 * Button: rounded rect with centered text, supports hit testing
 */
class Button {
  /**
   * @param {Object} opts
   * @param {number} opts.x - center x
   * @param {number} opts.y - center y
   * @param {number} opts.width
   * @param {number} opts.height
   * @param {string} opts.text
   * @param {string} [opts.bg] - background color
   * @param {string} [opts.color] - text color
   * @param {number} [opts.fontSize]
   * @param {number} [opts.radius]
   * @param {Function} [opts.onTap]
   * @param {boolean} [opts.visible]
   * @param {boolean} [opts.disabled]
   * @param {string} [opts.subText] - smaller text below main text
   */
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.width = opts.width || 200;
    this.height = opts.height || 50;
    this.text = opts.text || "";
    this.bg = opts.bg || COLORS.primary;
    this.color = opts.color || COLORS.white;
    this.fontSize = opts.fontSize || 18;
    this.radius = opts.radius || 12;
    this.onTap = opts.onTap || null;
    this.visible = opts.visible !== false;
    this.disabled = opts.disabled || false;
    this.subText = opts.subText || "";
    this._pressed = false;
  }

  get left() { return this.x - this.width / 2; }
  get top() { return this.y - this.height / 2; }

  hitTest(px, py) {
    if (!this.visible || this.disabled) return false;
    return (
      px >= this.left &&
      px <= this.left + this.width &&
      py >= this.top &&
      py <= this.top + this.height
    );
  }

  render(ctx) {
    if (!this.visible) return;
    const x = this.left;
    const y = this.top;
    const alpha = this.disabled ? 0.5 : this._pressed ? 0.85 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Background
    ctx.fillStyle = this.bg;
    roundRect(ctx, x, y, this.width, this.height, this.radius);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Main text
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textY = this.subText ? this.y - 8 : this.y;
    ctx.fillText(this.text, this.x, textY);

    // Sub text
    if (this.subText) {
      ctx.font = `${this.fontSize - 5}px sans-serif`;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillText(this.subText, this.x, this.y + 12);
    }

    ctx.restore();
  }
}

/**
 * Draw multi-line text utility
 */
const drawText = (ctx, text, x, y, opts = {}) => {
  const {
    fontSize = 16,
    color = COLORS.text,
    align = "center",
    bold = false,
    maxWidth = 0,
    lineHeight = 1.5,
  } = opts;

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${bold ? "bold " : ""}${fontSize}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  if (maxWidth > 0 && ctx.measureText(text).width > maxWidth) {
    // Word wrap
    const chars = text.split("");
    let line = "";
    let lineY = y;
    for (const ch of chars) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > maxWidth) {
        ctx.fillText(line, x, lineY);
        line = ch;
        lineY += fontSize * lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, x, lineY);
  } else {
    ctx.fillText(text, x, y);
  }

  ctx.restore();
};

/**
 * Draw a progress bar
 */
const drawProgressBar = (ctx, x, y, width, height, percent, opts = {}) => {
  const {
    bgColor = COLORS.border,
    fillColor = COLORS.primary,
    radius = 4,
  } = opts;

  // Background
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();

  // Fill
  if (percent > 0) {
    const fillW = Math.max(radius * 2, width * Math.min(percent / 100, 1));
    ctx.fillStyle = fillColor;
    roundRect(ctx, x, y, fillW, height, radius);
    ctx.fill();
  }
};

/**
 * Draw a card (white rounded rect with shadow)
 */
const drawCard = (ctx, x, y, width, height, opts = {}) => {
  const { radius = 16, bg = COLORS.white } = opts;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.restore();
};

/**
 * Fill full screen background with gradient
 */
const drawBackground = (ctx, width, height, color1, color2) => {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, color1 || COLORS.bg);
  grad.addColorStop(1, color2 || "#EAEAEA");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
};

module.exports = {
  COLORS,
  roundRect,
  Button,
  drawText,
  drawProgressBar,
  drawCard,
  drawBackground,
};
