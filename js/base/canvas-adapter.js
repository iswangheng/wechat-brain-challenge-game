/**
 * Canvas adapter for screen sizing, DPR, and coordinate mapping
 */

const createCanvas = () => {
  const canvas = wx.createCanvas();
  const info = wx.getWindowInfo();
  const width = info.windowWidth;
  const height = info.windowHeight;
  const dpr = info.pixelRatio || 2;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  return { canvas, ctx, width, height, dpr };
};

module.exports = { createCanvas };
