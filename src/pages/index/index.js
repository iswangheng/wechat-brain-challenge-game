const levelManager = require("../../utils/level-manager");
const shareManager = require("../../utils/share-manager");
const shareImage = require("../../utils/share-image");
const storage = require("../../utils/storage");
const audioManager = require("../../utils/audio-manager");

Page({
  data: {
    progress: { current: 0, total: 80, percentage: 0 },
    hasProgress: false,
    showLeaderboard: false,
    soundEnabled: true,
  },

  onLoad() {
    levelManager.loadLevels();
    shareManager.enableShareMenu();
  },

  onShow() {
    const progress = levelManager.getProgress();
    const settings = storage.getSettings();
    this.setData({
      progress,
      hasProgress: progress.current > 0,
      soundEnabled: settings.soundEnabled,
    });

    this._generateShareImage(progress.current);
  },

  /**
   * Start game from level 1
   */
  onStartGame() {
    audioManager.playClick();
    wx.navigateTo({ url: "/pages/game/game?level=1" });
  },

  /**
   * Continue from last level
   */
  onContinueGame() {
    audioManager.playClick();
    const progress = storage.getProgress();
    wx.navigateTo({ url: `/pages/game/game?level=${progress.currentLevel}` });
  },

  /**
   * Open level select (navigate to game with select mode)
   */
  onLevelSelect() {
    audioManager.playClick();
    wx.navigateTo({ url: "/pages/game/game?mode=select" });
  },

  /**
   * Toggle leaderboard
   */
  onShowLeaderboard() {
    audioManager.playClick();
    this.setData({ showLeaderboard: true });
  },

  onCloseLeaderboard() {
    this.setData({ showLeaderboard: false });
  },

  /**
   * Toggle sound
   */
  onToggleSound() {
    const enabled = !this.data.soundEnabled;
    this.setData({ soundEnabled: enabled });
    storage.saveSettings({ soundEnabled: enabled });
    audioManager.setEnabled(enabled);
    if (enabled) audioManager.playClick();
  },

  onShareAppMessage() {
    const config = shareManager.getShareConfig("milestone", {
      id: this.data.progress.current,
    });
    if (this._shareImagePath) {
      config.imageUrl = this._shareImagePath;
    }
    return config;
  },

  /**
   * Generate dynamic share image via Canvas
   */
  _generateShareImage(completed) {
    shareImage
      .getCanvas(this)
      .then((canvas) =>
        shareImage.generate(canvas, {
          bigText: `${completed}`,
          bigLabel: "关已通过",
          bottomText: "快来看看你能过几关!",
          themeIndex: 2,
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
