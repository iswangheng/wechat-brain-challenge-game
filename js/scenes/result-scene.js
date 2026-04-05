/**
 * Result/completion screen scene
 * Shows challenge results with progress stats, comment, and navigation buttons on Canvas 2D.
 */

const {
  COLORS,
  Button,
  drawText,
  drawProgressBar,
  drawBackground,
  drawCard,
} = require("../ui/components");
const { getProgress, isAllCompleted, getLevelCount } = require("../utils/level-manager");
const storage = require("../utils/storage");
const { playClick } = require("../utils/audio-manager");

class ResultScene {
  /**
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
   * @param {HTMLCanvasElement} canvas - Canvas node
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

    // State
    this.progress = null;
    this.allDone = false;
    this.comment = "";

    // Buttons
    this.buttons = [];
    this.continueBtn = null;
    this.homeBtn = null;
  }

  /**
   * Called when the scene is entered. Loads progress data and builds UI.
   */
  onEnter() {
    this.progress = getProgress();
    this.allDone = isAllCompleted();
    this.comment = this._getComment(this.progress.percentage);

    this._buildButtons();
    this.render();
  }

  /**
   * Get comment text based on completion percentage.
   * @param {number} pct - Completion percentage (0-100)
   * @returns {string}
   */
  _getComment(pct) {
    if (pct >= 100) return "全部通关！你就是最强大脑！🧠👑";
    if (pct >= 80) return "太厉害了！离通关只差一点点！💪";
    if (pct >= 50) return "过半了！继续加油！🔥";
    if (pct >= 20) return "不错的开始，后面更精彩！😎";
    return "刚刚热身，好戏还在后头！🎮";
  }

  /**
   * Build interactive buttons based on current state.
   */
  _buildButtons() {
    this.buttons = [];
    const cx = this.width / 2;
    const btnW = this.width * 0.65;
    const btnH = 56;
    const gap = 20;

    // Calculate button area starting position (below the card)
    let btnY = this.height * 0.78;

    // "继续挑战" button - only if not all completed
    if (!this.allDone) {
      const rawProgress = storage.getProgress();
      const nextLevel = rawProgress.currentLevel || 1;
      this.continueBtn = new Button({
        x: cx,
        y: btnY,
        width: btnW,
        height: btnH,
        text: "继续挑战",
        bg: COLORS.primary,
        color: COLORS.text,
        fontSize: 20,
        onTap: () => {
          playClick();
          this.sceneManager.switchTo("game", { level: nextLevel });
        },
      });
      this.buttons.push(this.continueBtn);
      btnY += btnH + gap;
    }

    // "回到首页" button - secondary style
    this.homeBtn = new Button({
      x: cx,
      y: btnY,
      width: btnW,
      height: btnH - 6,
      text: "回到首页",
      bg: COLORS.white,
      color: COLORS.text,
      fontSize: 16,
      onTap: () => {
        playClick();
        this.sceneManager.switchTo("home");
      },
    });
    this.buttons.push(this.homeBtn);
  }

  /**
   * Render the entire scene on canvas.
   */
  render() {
    const { ctx, width, height, progress } = this;
    if (!progress) return;

    // Clear screen
    ctx.clearRect(0, 0, width, height);

    // Deep blue-purple gradient
    const bg = ctx.createLinearGradient(0, 0, width * 0.3, height);
    bg.addColorStop(0, "#667eea");
    bg.addColorStop(0.5, "#5c6bc0");
    bg.addColorStop(1, "#764ba2");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Card dimensions
    const cardW = width * 0.82;
    const cardH = height * 0.48;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.12;
    const cardCx = width / 2;

    // Draw the card
    drawCard(ctx, cardX, cardY, cardW, cardH);

    // Trophy emoji
    drawText(ctx, "🏆", cardCx, cardY + 50, {
      fontSize: 52,
      align: "center",
    });

    // Title: "挑战结果"
    drawText(ctx, "挑战结果", cardCx, cardY + 110, {
      fontSize: 24,
      bold: true,
      color: COLORS.text,
      align: "center",
    });

    // Big completed count number
    drawText(ctx, `${progress.current}`, cardCx, cardY + 175, {
      fontSize: 64,
      bold: true,
      color: COLORS.primary,
      align: "center",
    });

    // Label: "关已通过"
    drawText(ctx, "关已通过", cardCx, cardY + 220, {
      fontSize: 16,
      color: COLORS.textLight,
      align: "center",
    });

    // Progress bar
    const barW = cardW * 0.7;
    const barH = 10;
    const barX = (width - barW) / 2;
    const barY = cardY + 255;

    drawProgressBar(ctx, barX, barY, barW, barH, progress.percentage, {
      fillColor: this.allDone ? COLORS.green : COLORS.primary,
    });

    // Progress percentage text
    drawText(
      ctx,
      `${progress.current} / ${progress.total}  (${progress.percentage}%)`,
      cardCx,
      barY + barH + 22,
      {
        fontSize: 13,
        color: COLORS.textMuted,
        align: "center",
      }
    );

    // Comment text
    drawText(ctx, this.comment, cardCx, barY + barH + 60, {
      fontSize: 16,
      bold: true,
      color: COLORS.text,
      align: "center",
      maxWidth: cardW * 0.85,
      lineHeight: 1.5,
    });

    // Render all buttons
    for (const btn of this.buttons) {
      btn.render(ctx);
    }
  }

  /**
   * Handle touch start - mark pressed state on buttons.
   * @param {number} x
   * @param {number} y
   */
  onTouchStart(x, y) {
    for (const btn of this.buttons) {
      if (btn.hitTest(x, y)) {
        btn._pressed = true;
      }
    }
    this.render();
  }

  /**
   * Handle touch end - check button hits and trigger actions.
   * @param {number} x
   * @param {number} y
   */
  onTouchEnd(x, y) {
    for (const btn of this.buttons) {
      if (btn._pressed && btn.hitTest(x, y) && btn.onTap) {
        btn.onTap();
      }
      btn._pressed = false;
    }
    this.render();
  }

  /**
   * Cleanup when leaving the scene.
   */
  onLeave() {
    this.buttons = [];
    this.continueBtn = null;
    this.homeBtn = null;
  }
}

module.exports = ResultScene;
