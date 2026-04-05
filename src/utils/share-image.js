/**
 * Dynamic share image generator using Canvas 2D API
 * Generates visually appealing share cards without static image assets
 */

const THEMES = [
  { bg1: "#FFD700", bg2: "#FFF8DC", accent: "#FFE44D", dark: "#B8960F" },
  { bg1: "#4A90D9", bg2: "#E8F1FB", accent: "#7AB3E8", dark: "#2D6BA6" },
  { bg1: "#2ED573", bg2: "#E0F8EA", accent: "#6EEAA0", dark: "#1FA855" },
];

/**
 * Draw a rounded rectangle path
 */
const _roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/**
 * Get canvas node from page via SelectorQuery
 * @param {Object} pageInstance - the page or component instance (this)
 * @returns {Promise<Object>} canvas node
 */
const getCanvas = (pageInstance) => {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Canvas query timed out"));
      }
    }, 3000);

    try {
      const query = pageInstance.createSelectorQuery();
      query
        .select("#shareCanvas")
        .fields({ node: true, size: true })
        .exec((res) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (res && res[0] && res[0].node) {
            resolve(res[0].node);
          } else {
            reject(new Error("Canvas node not found"));
          }
        });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    }
  });
};

/**
 * Generate a share image on canvas and export to temp file
 * @param {Object} canvas - Canvas node
 * @param {Object} options
 * @param {string} [options.topText='你能过几关'] - Title text
 * @param {string} [options.bigText='1'] - Hero number/text
 * @param {string} [options.bigLabel='关'] - Label below big text
 * @param {string} [options.bottomText='来挑战你的脑洞!'] - Call to action
 * @param {number} [options.themeIndex=0] - Color theme 0-2
 * @returns {Promise<string>} temp file path
 */
const generate = (canvas, options = {}) => {
  const {
    topText = "你能过几关",
    bigText = "1",
    bigLabel = "关",
    bottomText = "来挑战你的脑洞!",
    themeIndex = 0,
  } = options;

  const width = 500;
  const height = 400;
  const dpr = 2;
  const theme = THEMES[themeIndex % THEMES.length];
  const ctx = canvas.getContext("2d");

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, theme.bg1);
  grad.addColorStop(1, theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(50, 55, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width - 40, height - 45, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(width / 2, height - 25, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // White card with shadow
  const pad = 35;
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(0,0,0,0.1)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  _roundRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 20);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const centerX = width / 2;

  // Title
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.dark;
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(topText, centerX, pad + 48);

  // Divider line
  ctx.strokeStyle = theme.bg1;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 50, pad + 75);
  ctx.lineTo(centerX + 50, pad + 75);
  ctx.stroke();

  // Big hero number
  ctx.fillStyle = theme.bg1;
  ctx.font = "bold 80px sans-serif";
  ctx.fillText(bigText, centerX, height / 2 + 5);

  // Label below number
  ctx.fillStyle = "#999";
  ctx.font = "22px sans-serif";
  ctx.fillText(bigLabel, centerX, height / 2 + 55);

  // Bottom CTA text
  ctx.fillStyle = "#666";
  ctx.font = "18px sans-serif";
  ctx.fillText(bottomText, centerX, height - pad - 35);

  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width: width * dpr,
      height: height * dpr,
      destWidth: width * dpr,
      destHeight: height * dpr,
      fileType: "png",
      success: (res) => resolve(res.tempFilePath),
      fail: (err) => {
        console.error("Share image export failed:", err);
        reject(err);
      },
    });
  });
};

module.exports = { generate, getCanvas, THEMES };
