/**
 * Splash scene: health game notice + branding, shown on first launch.
 * Auto-advances after 3 seconds or on tap (minimum 1.5s).
 */

class SplashScene {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLCanvasElement} canvas
   * @param {number} width - Logical screen width
   * @param {number} height - Logical screen height
   * @param {{ switchTo: (name: string, params?: object) => void }} sceneManager
   */
  constructor(ctx, canvas, width, height, sceneManager) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.sceneManager = sceneManager;

    this._startTime = 0;
    this._autoTimer = null;
  }

  onEnter() {
    this._startTime = Date.now();

    // Auto-advance after 3 seconds
    this._autoTimer = setTimeout(() => {
      this.sceneManager.switchTo("home");
    }, 3000);
  }

  render() {
    const { ctx, width, height } = this;
    const now = Date.now();

    // Background: deep blue-purple gradient
    const bg = ctx.createLinearGradient(0, 0, width * 0.3, height);
    bg.addColorStop(0, "#667eea");
    bg.addColorStop(1, "#764ba2");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Game title
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("你能过几关", width / 2, height * 0.3);

    // Subtitle
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "16px sans-serif";
    ctx.fillText("脑洞大挑战", width / 2, height * 0.3 + 45);

    // Brain emoji
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("\uD83E\uDDE0", width / 2, height * 0.3 + 85);

    // White card for health notice
    const cardW = width * 0.82;
    const cardH = 140;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.58;
    const cardR = 12;

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(cardX + cardR, cardY);
    ctx.lineTo(cardX + cardW - cardR, cardY);
    ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardR, cardR);
    ctx.lineTo(cardX + cardW, cardY + cardH - cardR);
    ctx.arcTo(cardX + cardW, cardY + cardH, cardX + cardW - cardR, cardY + cardH, cardR);
    ctx.lineTo(cardX + cardR, cardY + cardH);
    ctx.arcTo(cardX, cardY + cardH, cardX, cardY + cardH - cardR, cardR);
    ctx.lineTo(cardX, cardY + cardR);
    ctx.arcTo(cardX, cardY, cardX + cardR, cardY, cardR);
    ctx.closePath();
    ctx.fill();

    // Health game notice text
    const lines = [
      "抵制不良游戏，拒绝盗版游戏。",
      "注意自我保护，谨防受骗上当。",
      "适度游戏益脑，沉迷游戏伤身。",
      "合理安排时间，享受健康生活。",
    ];
    ctx.fillStyle = "#666666";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const lineH = 12 * 1.8;
    const textStartY = cardY + (cardH - lines.length * lineH) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], width / 2, textStartY + i * lineH);
    }

    // Age rating
    ctx.fillStyle = "#999999";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("适龄提示：全年龄", width / 2, cardY + cardH + 16);

    // Pulsing "tap to start" text
    // Cycle: 0→1→0 over 1.5s using sine wave
    const elapsed = (now - this._startTime) % 1500;
    const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((elapsed / 1500) * Math.PI * 2 - Math.PI / 2));
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("点击屏幕开始", width / 2, height - 40);
  }

  onTouchEnd() {
    const elapsed = Date.now() - this._startTime;
    if (elapsed >= 1500) {
      if (this._autoTimer) {
        clearTimeout(this._autoTimer);
        this._autoTimer = null;
      }
      this.sceneManager.switchTo("home");
    }
  }

  onLeave() {
    if (this._autoTimer) {
      clearTimeout(this._autoTimer);
      this._autoTimer = null;
    }
  }
}

module.exports = SplashScene;
