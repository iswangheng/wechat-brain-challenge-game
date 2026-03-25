const levelManager = require("../../utils/level-manager");
const shareManager = require("../../utils/share-manager");
const audioManager = require("../../utils/audio-manager");

Page({
  data: {
    level: null,
    levelId: 1,
    shareType: "wrongAnswer",
    challengeText: "",
  },

  onLoad(options) {
    levelManager.loadLevels();
    shareManager.enableShareMenu();

    const levelId = parseInt(options.level, 10) || 1;
    const shareType = options.type || "wrongAnswer";
    const level = levelManager.getLevel(levelId);

    let challengeText = "";
    if (shareType === "wrongAnswer") {
      challengeText = `第${levelId}关难倒了你的好友，你能过吗？`;
    } else if (shareType === "levelComplete") {
      challengeText = `你的好友过了第${levelId}关，你也来试试！`;
    } else {
      challengeText = `来挑战「你能过几关」吧！`;
    }

    this.setData({
      level,
      levelId,
      shareType,
      challengeText,
    });
  },

  /**
   * Start challenge from this level
   */
  onStartChallenge() {
    audioManager.playClick();
    wx.reLaunch({
      url: `/pages/game/game?level=${this.data.levelId}`,
    });
  },

  /**
   * Go to home page
   */
  onGoHome() {
    audioManager.playClick();
    wx.reLaunch({ url: "/pages/index/index" });
  },

  onShareAppMessage() {
    return shareManager.getShareConfig(this.data.shareType, this.data.level);
  },
});
