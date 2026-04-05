/**
 * Home/start screen scene
 * Renders the main menu with title, progress, and action buttons on Canvas 2D.
 */

const {
  COLORS,
  Button,
  drawText,
  drawProgressBar,
  drawBackground,
  drawCard,
} = require("../ui/components");
const levelManager = require("../utils/level-manager");
const storage = require("../utils/storage");
const audioManager = require("../utils/audio-manager");

class HomeScene {
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
    this.hasProgress = false;
    this.allDone = false;
    this.currentLevel = 1;
    this.soundOn = true;

    // Buttons (created in onEnter when layout info is available)
    this.buttons = [];
    this.continueBtn = null;
    this.startBtn = null;
    this.soundBtn = null;
  }

  /**
   * Called when the scene is entered. Loads levels and reads progress/settings.
   */
  onEnter() {
    levelManager.loadLevels();

    this.progress = levelManager.getProgress();
    this.hasProgress = this.progress.current > 0;
    this.allDone = levelManager.isAllCompleted();

    const rawProgress = storage.getProgress();
    this.currentLevel = rawProgress.currentLevel || 1;

    const settings = storage.getSettings();
    this.soundOn = settings.soundEnabled !== false;

    this._buildButtons();
    this.render();
  }

  /**
   * Build all interactive buttons based on current state.
   */
  _buildButtons() {
    this.buttons = [];
    const cx = this.width / 2;
    let btnY = this.hasProgress ? this.height * 0.52 : this.height * 0.48;
    const btnW = this.width * 0.65;
    const btnH = 56;
    const gap = 20;

    if (this.hasProgress && !this.allDone) {
      // "继续挑战" button - primary, large
      this.continueBtn = new Button({
        x: cx,
        y: btnY,
        width: btnW,
        height: btnH,
        text: "继续挑战",
        subText: `第 ${this.currentLevel} 关`,
        bg: COLORS.primary,
        color: COLORS.text,
        fontSize: 20,
        onTap: () => {
          audioManager.playClick();
          this.sceneManager.switchTo("game", { level: this.currentLevel });
        },
      });
      this.buttons.push(this.continueBtn);
      btnY += btnH + gap;
    }

    if (this.allDone) {
      // All completed button
      this.continueBtn = new Button({
        x: cx,
        y: btnY,
        width: btnW,
        height: btnH,
        text: "已全部通关 再来一遍？",
        bg: COLORS.green,
        color: COLORS.white,
        fontSize: 18,
        onTap: () => {
          audioManager.playClick();
          this.sceneManager.switchTo("game", { level: 1 });
        },
      });
      this.buttons.push(this.continueBtn);
      btnY += btnH + gap;
    }

    // "从头开始" button
    const isSecondary = this.hasProgress;
    this.startBtn = new Button({
      x: cx,
      y: btnY,
      width: btnW,
      height: btnH - (isSecondary ? 6 : 0),
      text: "从头开始",
      bg: isSecondary ? COLORS.white : COLORS.primary,
      color: isSecondary ? COLORS.text : COLORS.text,
      fontSize: isSecondary ? 16 : 20,
      onTap: () => {
        audioManager.playClick();
        this.sceneManager.switchTo("game", { level: 1 });
      },
    });
    this.buttons.push(this.startBtn);
    btnY += btnH + gap;

    // Sound toggle button at bottom
    this.soundBtn = new Button({
      x: cx,
      y: this.height - 80,
      width: 120,
      height: 40,
      text: this.soundOn ? "🔊 音效" : "🔇 静音",
      bg: this.soundOn ? COLORS.white : COLORS.border,
      color: COLORS.textLight,
      fontSize: 14,
      radius: 20,
      onTap: () => {
        this.soundOn = !this.soundOn;
        audioManager.setEnabled(this.soundOn);
        storage.saveSettings({ soundEnabled: this.soundOn });
        // Update button appearance
        this.soundBtn.text = this.soundOn ? "🔊 音效" : "🔇 静音";
        this.soundBtn.bg = this.soundOn ? COLORS.white : COLORS.border;
        if (this.soundOn) {
          audioManager.playClick();
        }
        this.render();
      },
    });
    this.buttons.push(this.soundBtn);
  }

  /**
   * Render the entire scene on canvas.
   */
  render() {
    const { ctx, width, height } = this;

    // Clear screen
    ctx.clearRect(0, 0, width, height);

    // Background gradient: #FFF8DC -> #F5F5F5
    drawBackground(ctx, width, height, "#FFF8DC", "#F5F5F5");

    // Title area
    const titleY = height * 0.15;

    // Brain emoji
    drawText(ctx, "🧠", width / 2, titleY - 30, {
      fontSize: 48,
      align: "center",
    });

    // Main title
    drawText(ctx, "你能过几关", width / 2, titleY + 30, {
      fontSize: 32,
      bold: true,
      color: COLORS.text,
      align: "center",
    });

    // Subtitle
    drawText(ctx, "脑洞大挑战", width / 2, titleY + 68, {
      fontSize: 16,
      color: COLORS.textMuted,
      align: "center",
    });

    // Progress section (only if has progress)
    if (this.hasProgress && this.progress) {
      const progressY = height * 0.35;
      const barWidth = width * 0.6;
      const barHeight = 10;
      const barX = (width - barWidth) / 2;

      // Progress bar
      drawProgressBar(
        ctx,
        barX,
        progressY,
        barWidth,
        barHeight,
        this.progress.percentage,
        {
          fillColor: this.allDone ? COLORS.green : COLORS.primary,
        }
      );

      // Progress text
      drawText(
        ctx,
        `已过 ${this.progress.current} / ${this.progress.total} 关`,
        width / 2,
        progressY + barHeight + 20,
        {
          fontSize: 14,
          color: COLORS.textLight,
          align: "center",
        }
      );
    }

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
   * @param {TouchEvent} e
   */
  onTouchEnd(x, y, e) {
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
    this.startBtn = null;
    this.soundBtn = null;
  }
}

module.exports = HomeScene;
