/**
 * Home/start screen scene
 * Renders the main menu with title, progress, best record, rank badge,
 * daily challenge, achievement count, and action buttons on Canvas 2D.
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
const rankManager = require("../utils/rank-manager");
const achievementManager = require("../utils/achievement-manager");

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
    this.bestRecord = null;
    this.rankInfo = null;
    this.dailyData = null;
    this.achievementCount = null;

    // Buttons (created in onEnter when layout info is available)
    this.buttons = [];
    this.continueBtn = null;
    this.startBtn = null;
    this.soundBtn = null;
    this.dailyBtn = null;
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

    // Best record
    this.bestRecord = storage.getBestRecord();

    // Rank info: current rank + progress to next
    this.rankInfo = rankManager.getCurrentRank();
    this.rankProgress = rankManager.getProgressToNext();

    // Daily challenge
    this.dailyData = storage.getDailyData();

    // Achievement count
    this.achievementCount = {
      unlocked: achievementManager.getUnlockedCount(),
      total: achievementManager.ACHIEVEMENTS.length,
    };

    this._buildButtons();
    this.render();
  }

  /**
   * Build all interactive buttons based on current state.
   */
  _buildButtons() {
    this.buttons = [];
    const cx = this.width / 2;
    let btnY = this.height * 0.48;
    const btnW = this.width * 0.65;
    const btnH = 56;
    const gap = 20;

    if (this.hasProgress && !this.allDone) {
      // "Continue" button - primary, large
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
          wx.vibrateShort({ type: "light" });
          audioManager.playClick();
          this.sceneManager.switchTo("game", { position: this.currentLevel });
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
        text: "全部通关！再来一遍？",
        bg: COLORS.green,
        color: COLORS.white,
        fontSize: 18,
        onTap: () => {
          wx.vibrateShort({ type: "light" });
          audioManager.playClick();
          levelManager.resetAndShuffle();
          this.sceneManager.switchTo("game", { position: 1 });
        },
      });
      this.buttons.push(this.continueBtn);
      btnY += btnH + gap;
    }

    // "Start from beginning" / "Start challenge" button
    const isSecondary = this.hasProgress;
    this.startBtn = new Button({
      x: cx,
      y: btnY,
      width: btnW,
      height: btnH - (isSecondary ? 6 : 0),
      text: isSecondary ? "重新挑战" : "开始挑战",
      bg: isSecondary ? "rgba(255,255,255,0.25)" : COLORS.primary,
      color: isSecondary ? COLORS.white : COLORS.text,
      fontSize: isSecondary ? 16 : 20,
      onTap: () => {
        wx.vibrateShort({ type: "light" });
        audioManager.playClick();
        levelManager.resetAndShuffle();
        this.sceneManager.switchTo("game", { position: 1 });
      },
    });
    this.buttons.push(this.startBtn);
    btnY += btnH + gap;

    // Daily challenge button
    const dailyCompleted = this.dailyData && this.dailyData.completed;
    this.dailyBtn = new Button({
      x: cx,
      y: btnY,
      width: btnW,
      height: btnH - 6,
      text: dailyCompleted ? "📅 今日已完成 ✓" : "📅 每日挑战",
      bg: dailyCompleted ? "rgba(255,255,255,0.15)" : "#E6A817",
      color: dailyCompleted ? "rgba(255,255,255,0.5)" : COLORS.text,
      fontSize: 16,
      disabled: !!dailyCompleted,
      onTap: () => {
        if (dailyCompleted) return;
        wx.vibrateShort({ type: "light" });
        audioManager.playClick();
        this.sceneManager.switchTo("game", { position: 1, mode: "daily" });
      },
    });
    this.buttons.push(this.dailyBtn);
    btnY += btnH + gap;

    // Bottom row: sound toggle (left) and achievements (right)
    const bottomY = this.height - 80;
    const bottomBtnW = 120;
    const bottomBtnH = 40;
    const bottomGap = 20;

    // Sound toggle button (left of center)
    this.soundBtn = new Button({
      x: cx - bottomBtnW / 2 - bottomGap / 2,
      y: bottomY,
      width: bottomBtnW,
      height: bottomBtnH,
      text: this.soundOn ? "🔊 音效" : "🔇 静音",
      bg: this.soundOn ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
      color: COLORS.white,
      fontSize: 14,
      radius: 20,
      onTap: () => {
        this.soundOn = !this.soundOn;
        audioManager.setEnabled(this.soundOn);
        storage.saveSettings({ soundEnabled: this.soundOn });
        this.soundBtn.text = this.soundOn ? "🔊 音效" : "🔇 静音";
        this.soundBtn.bg = this.soundOn
          ? "rgba(255,255,255,0.25)"
          : "rgba(255,255,255,0.1)";
        if (this.soundOn) {
          audioManager.playClick();
        }
        this.render();
      },
    });
    this.buttons.push(this.soundBtn);

    // Achievement count button (right of center)
    const achText = this.achievementCount
      ? `🏅 ${this.achievementCount.unlocked}/${this.achievementCount.total}`
      : "🏅 0/12";
    this.achBtn = new Button({
      x: cx + bottomBtnW / 2 + bottomGap / 2,
      y: bottomY,
      width: bottomBtnW,
      height: bottomBtnH,
      text: achText,
      bg: "rgba(255,255,255,0.25)",
      color: COLORS.white,
      fontSize: 14,
      radius: 20,
      onTap: () => {
        audioManager.playClick();
        // Could navigate to achievements scene in the future
      },
    });
    this.buttons.push(this.achBtn);
  }

  /**
   * Render the entire scene on canvas.
   */
  render() {
    const { ctx, width, height } = this;

    // Clear screen
    ctx.clearRect(0, 0, width, height);

    // Deep blue-purple gradient background
    const bg = ctx.createLinearGradient(0, 0, width * 0.3, height);
    bg.addColorStop(0, "#667eea");
    bg.addColorStop(0.5, "#5c6bc0");
    bg.addColorStop(1, "#764ba2");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // --- Title area (12% height) ---
    const titleY = height * 0.12;

    // Brain emoji
    drawText(ctx, "🧠", width / 2, titleY - 20, {
      fontSize: 48,
      align: "center",
    });

    // Main title
    drawText(ctx, "你能过几关", width / 2, titleY + 30, {
      fontSize: 32,
      bold: true,
      color: "#FFFFFF",
      align: "center",
    });

    // Subtitle
    drawText(ctx, "脑洞大挑战", width / 2, titleY + 62, {
      fontSize: 16,
      color: "rgba(255,255,255,0.7)",
      align: "center",
    });

    // --- Best record (28% height) ---
    const recordY = height * 0.28;
    if (this.bestRecord && this.bestRecord.level > 0) {
      drawText(
        ctx,
        `🏆 历史最佳：第 ${this.bestRecord.level} 关`,
        width / 2,
        recordY,
        {
          fontSize: 22,
          bold: true,
          color: "#FFFFFF",
          align: "center",
        }
      );
    } else {
      drawText(ctx, "开始你的第一次挑战！", width / 2, recordY, {
        fontSize: 18,
        color: "rgba(255,255,255,0.8)",
        align: "center",
      });
    }

    // --- Rank info (35% height) ---
    const rankY = height * 0.35;
    if (this.rankInfo) {
      // Rank icon + name + XP
      const rankLabel = `${this.rankInfo.icon} ${this.rankInfo.name} · ${this.rankInfo.xp} XP`;
      drawText(ctx, rankLabel, width / 2, rankY, {
        fontSize: 16,
        bold: true,
        color: "#FFFFFF",
        align: "center",
      });

      // Rank progress bar to next rank
      const barWidth = width * 0.5;
      const barHeight = 8;
      const barX = (width - barWidth) / 2;
      const barY = rankY + 18;
      const rp = this.rankProgress;

      // Background track
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      this._roundRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.fill();

      // Fill
      if (rp && rp.percent > 0) {
        const fillW = Math.max(8, barWidth * (rp.percent / 100));
        ctx.fillStyle = COLORS.primary;
        this._roundRect(ctx, barX, barY, fillW, barHeight, 4);
        ctx.fill();
      }

      // Next rank label
      if (rp && rp.remaining > 0) {
        drawText(
          ctx,
          `距下一段位还需 ${rp.remaining} XP`,
          width / 2,
          barY + barHeight + 14,
          {
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            align: "center",
          }
        );
      } else {
        drawText(ctx, "已达最高段位", width / 2, barY + barHeight + 14, {
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
          align: "center",
        });
      }
    }

    // --- Progress section (between rank and buttons, only if has progress) ---
    if (this.hasProgress && this.progress) {
      const progressY = height * 0.43;
      const barWidth = width * 0.5;
      const barHeight = 8;
      const barX = (width - barWidth) / 2;

      drawProgressBar(ctx, barX, progressY, barWidth, barHeight, this.progress.percentage, {
        fillColor: this.allDone ? COLORS.green : COLORS.primary,
        bgColor: "rgba(255,255,255,0.2)",
      });

      drawText(
        ctx,
        `已过 ${this.progress.current} / ${this.progress.total} 关`,
        width / 2,
        progressY + barHeight + 16,
        {
          fontSize: 13,
          color: "rgba(255,255,255,0.6)",
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
   * Helper: draw a rounded rect path and leave it ready for fill/stroke.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} r
   */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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
    this.dailyBtn = null;
    this.achBtn = null;
  }
}

module.exports = HomeScene;
