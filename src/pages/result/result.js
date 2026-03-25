const levelManager = require("../../utils/level-manager");
const shareManager = require("../../utils/share-manager");
const shareImage = require("../../utils/share-image");
const audioManager = require("../../utils/audio-manager");

Page({
  data: {
    completed: 0,
    total: 80,
    percentage: 0,
    isAllDone: false,
    comment: "",
  },

  onLoad() {
    const progress = levelManager.getProgress();
    const isAllDone = levelManager.isAllCompleted();

    let comment = "";
    if (isAllDone) {
      comment = "全部通关！你就是最强大脑！🧠👑";
    } else if (progress.percentage >= 80) {
      comment = "太厉害了！离通关只差一点点！💪";
    } else if (progress.percentage >= 50) {
      comment = "过半了！继续加油！🔥";
    } else if (progress.percentage >= 20) {
      comment = "不错的开始，后面更精彩！😎";
    } else {
      comment = "刚刚热身，好戏还在后头！🎮";
    }

    this.setData({
      completed: progress.current,
      total: progress.total,
      percentage: progress.percentage,
      isAllDone,
      comment,
    });

    shareManager.enableShareMenu();

    this._generateShareImage(progress.current, progress.percentage);
  },

  /**
   * Continue playing
   */
  onContinue() {
    audioManager.playClick();
    wx.navigateBack();
  },

  /**
   * Go back to home
   */
  onGoHome() {
    audioManager.playClick();
    wx.reLaunch({ url: "/pages/index/index" });
  },

  onShareAppMessage() {
    const config = shareManager.getShareConfig("milestone", {
      id: this.data.completed,
    });
    if (this._shareImagePath) {
      config.imageUrl = this._shareImagePath;
    }
    return config;
  },

  /**
   * Generate dynamic share image via Canvas
   */
  _generateShareImage(completed, percentage) {
    shareImage
      .getCanvas(this)
      .then((canvas) =>
        shareImage.generate(canvas, {
          bigText: `${completed}`,
          bigLabel: "关已通过",
          bottomText: `超过${percentage}%的玩家!`,
          themeIndex: completed >= 80 ? 2 : 0,
        }),
      )
      .then((path) => {
        this._shareImagePath = path;
      })
      .catch((err) => {
        console.error("Generate share image failed:", err);
      });
  },
});
