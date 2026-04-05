/**
 * Result/completion screen scene
 * Shows challenge results with progress stats, XP/rank info, comment, and navigation buttons on Canvas 2D.
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
const { getCurrentRank } = require("../utils/rank-manager");
const { getUnlockedCount, ACHIEVEMENTS } = require("../utils/achievement-manager");

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
    this.xpEarned = 0;
    this.rankResult = null;
    this.newRecord = false;
    this.totalStars = 0;

    // Buttons
    this.buttons = [];
    this.shareBtn = null;
    this.continueBtn = null;
    this.homeBtn = null;

    // Animation state for rank-up effect
    this._rankUpAnim = 0;
    this._animTimer = null;
  }

  /**
   * Called when the scene is entered. Loads progress data and builds UI.
   */
  onEnter(params = {}) {
    this.progress = getProgress();
    this.allDone = isAllCompleted();
    this.failedAt = params.failedAt || 0;
    this.xpEarned = params.xpEarned || 0;
    this.rankResult = params.rankResult || null;
    this.newRecord = params.newRecord || false;
    this.totalStars = params.totalStars || 0;
    this.comment = this.failedAt
      ? this._getFailComment(this.failedAt)
      : this._getComment(this.progress.percentage);

    this._rankUpAnim = 0;
    this._stopAnim();

    // Start rank-up animation if applicable
    if (this.rankResult && this.rankResult.rankUp) {
      this._startRankUpAnim();
    }

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

  _getFailComment(level) {
    if (level >= 60) return "太强了！差一点就通关了！💪";
    if (level >= 40) return "很不错！已经超过大多数人了！🔥";
    if (level >= 20) return "不赖！再接再厉！😎";
    if (level >= 10) return "热身完毕，下次冲更远！🎮";
    return "这才刚开始，再来一次！💥";
  }

  /**
   * Start a simple oscillation animation for rank-up text.
   */
  _startRankUpAnim() {
    this._rankUpAnim = 0;
    this._animTimer = setInterval(() => {
      this._rankUpAnim = (this._rankUpAnim + 1) % 60;
      this.render();
    }, 50);

    // Stop after 3 seconds
    setTimeout(() => this._stopAnim(), 3000);
  }

  _stopAnim() {
    if (this._animTimer) {
      clearInterval(this._animTimer);
      this._animTimer = null;
    }
  }

  /**
   * Build interactive buttons based on current state.
   */
  _buildButtons() {
    this.buttons = [];
    const cx = this.width / 2;
    const btnW = this.width * 0.65;
    const btnH = 50;
    const gap = 16;

    // Calculate button area starting position (below the card)
    let btnY = this.height * 0.76;

    // Share button
    this.shareBtn = new Button({
      x: cx,
      y: btnY,
      width: btnW,
      height: btnH,
      text: "📤 分享挑战好友",
      bg: "rgba(255,255,255,0.15)",
      color: "#FFFFFF",
      fontSize: 16,
      onTap: () => {
        playClick();
        const best = this.failedAt || this.progress.current;
        wx.shareAppMessage({
          title: `我在「你能过几关」闯到了第${best}关，你能超过我吗？`,
          imageUrl: "",
        });
      },
    });
    this.buttons.push(this.shareBtn);
    btnY += btnH + gap;

    // Main action button
    const levelManager = require("../utils/level-manager");
    this.continueBtn = new Button({
      x: cx,
      y: btnY,
      width: btnW,
      height: btnH + 6,
      text: this.failedAt ? "再来一次" : (this.allDone ? "再来一遍" : "继续挑战"),
      bg: COLORS.primary,
      color: COLORS.text,
      fontSize: 20,
      onTap: () => {
        playClick();
        if (this.failedAt || this.allDone) {
          levelManager.resetAndShuffle();
          this.sceneManager.switchTo("game", { position: 1 });
        } else {
          const rawProgress = storage.getProgress();
          this.sceneManager.switchTo("game", { position: rawProgress.currentLevel || 1 });
        }
      },
    });
    this.buttons.push(this.continueBtn);
    btnY += (btnH + 6) + gap;

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

    // Card dimensions - taller to fit XP/rank info
    const cardW = width * 0.82;
    const cardH = height * 0.58;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.06;
    const cardCx = width / 2;

    // Draw the card
    drawCard(ctx, cardX, cardY, cardW, cardH);

    let curY = cardY + 40;

    // Emoji
    const emoji = this.failedAt ? "💀" : "🏆";
    drawText(ctx, emoji, cardCx, curY, {
      fontSize: 44,
      align: "center",
    });
    curY += 50;

    // Title
    const title = this.failedAt ? "挑战结束" : "挑战结果";
    drawText(ctx, title, cardCx, curY, {
      fontSize: 22,
      bold: true,
      color: COLORS.text,
      align: "center",
    });
    curY += 30;

    // New record badge (above big number)
    if (this.newRecord) {
      drawText(ctx, "🏆 新纪录！", cardCx, curY, {
        fontSize: 15,
        bold: true,
        color: "#FF6B6B",
        align: "center",
      });
      curY += 22;
    }

    // Big number: show failed-at position or completed count
    const bigNumber = this.failedAt || progress.current;
    drawText(ctx, `${bigNumber}`, cardCx, curY + 10, {
      fontSize: 58,
      bold: true,
      color: COLORS.primary,
      align: "center",
    });
    curY += 55;

    // Label
    const label = this.failedAt ? "关 · 挑战失败" : "关已通过";
    drawText(ctx, label, cardCx, curY, {
      fontSize: 15,
      color: COLORS.textLight,
      align: "center",
    });
    curY += 28;

    // Progress bar
    const barW = cardW * 0.7;
    const barH = 8;
    const barX = (width - barW) / 2;

    drawProgressBar(ctx, barX, curY, barW, barH, progress.percentage, {
      fillColor: this.allDone ? COLORS.green : COLORS.primary,
    });

    // Progress percentage text
    drawText(
      ctx,
      `${progress.current} / ${progress.total}  (${progress.percentage}%)`,
      cardCx,
      curY + barH + 18,
      {
        fontSize: 12,
        color: COLORS.textMuted,
        align: "center",
      }
    );
    curY += barH + 38;

    // Comment text
    drawText(ctx, this.comment, cardCx, curY, {
      fontSize: 15,
      bold: true,
      color: COLORS.text,
      align: "center",
      maxWidth: cardW * 0.85,
      lineHeight: 1.4,
    });
    curY += 32;

    // --- XP earned ---
    if (this.xpEarned > 0) {
      drawText(ctx, `+${this.xpEarned} XP`, cardCx, curY, {
        fontSize: 20,
        bold: true,
        color: "#FFD700",
        align: "center",
      });
      curY += 28;
    }

    // --- Rank info ---
    const rankInfo = this.rankResult || getCurrentRank();
    const rankIcon = rankInfo.icon || (this.rankResult ? (this.rankResult.newRank ? this.rankResult.newRank.icon : "") : "");
    const rankName = rankInfo.name || (this.rankResult ? (this.rankResult.newRank ? this.rankResult.newRank.name : "") : "");
    const rankProgress = rankInfo.progress != null ? rankInfo.progress : 0;

    // Rank display: icon + name
    if (rankName) {
      // Determine rank color based on name
      const rankColor = this._getRankColor(rankName);

      drawText(ctx, `${rankIcon} ${rankName}`, cardCx, curY, {
        fontSize: 16,
        bold: true,
        color: rankColor,
        align: "center",
      });
      curY += 22;

      // Rank progress bar to next rank
      const rankBarW = cardW * 0.5;
      const rankBarH = 6;
      const rankBarX = (width - rankBarW) / 2;

      drawProgressBar(ctx, rankBarX, curY, rankBarW, rankBarH, rankProgress, {
        fillColor: rankColor,
        bgColor: "#E8E8E8",
      });
      curY += rankBarH + 8;

      // Next rank label
      const nextRankName = rankInfo.nextRank
        ? rankInfo.nextRank.name
        : (rankInfo.nextRankXP != null ? "" : "");
      const totalXP = rankInfo.totalXP || rankInfo.xp || 0;
      const nextXP = rankInfo.nextRankXP || (rankInfo.nextRank ? rankInfo.nextRank.minXP : null);

      if (nextXP != null) {
        drawText(ctx, `${totalXP} / ${nextXP} XP`, cardCx, curY + 2, {
          fontSize: 11,
          color: COLORS.textMuted,
          align: "center",
        });
        curY += 16;
      }
    }

    // --- Rank up animation ---
    if (this.rankResult && this.rankResult.rankUp) {
      const scale = 1 + Math.sin(this._rankUpAnim * 0.2) * 0.08;
      ctx.save();
      ctx.translate(cardCx, curY + 4);
      ctx.scale(scale, scale);
      drawText(ctx, "🎊 段位提升！", 0, 0, {
        fontSize: 18,
        bold: true,
        color: "#FF6B6B",
        align: "center",
      });
      ctx.restore();
      curY += 26;
    }

    // Render all buttons
    for (const btn of this.buttons) {
      btn.render(ctx);
    }

    // --- Achievement summary (below buttons) ---
    const unlockedCount = getUnlockedCount();
    const totalAch = ACHIEVEMENTS.length;
    const lastBtn = this.buttons[this.buttons.length - 1];
    const achY = lastBtn ? (lastBtn.y + lastBtn.height / 2 + 28) : (height * 0.95);

    drawText(ctx, `🏅 成就 ${unlockedCount}/${totalAch}`, cardCx, achY, {
      fontSize: 13,
      color: "rgba(255,255,255,0.7)",
      align: "center",
    });
  }

  /**
   * Get display color for rank name.
   * @param {string} rankName
   * @returns {string}
   */
  _getRankColor(rankName) {
    const colorMap = {
      "青铜": "#CD7F32",
      "白银": "#C0C0C0",
      "黄金": "#FFD700",
      "铂金": "#4FC3F7",
      "钻石": "#B388FF",
      "大师": "#FF8A65",
      "传奇": "#FFD740",
    };
    return colorMap[rankName] || COLORS.primary;
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
    this._stopAnim();
    this.buttons = [];
    this.shareBtn = null;
    this.continueBtn = null;
    this.homeBtn = null;
  }
}

module.exports = ResultScene;
