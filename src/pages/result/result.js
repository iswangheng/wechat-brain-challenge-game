const levelManager = require("../../utils/level-manager");
const shareManager = require("../../utils/share-manager");
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
    return shareManager.getShareConfig("milestone", {
      id: this.data.completed,
    });
  },
});
