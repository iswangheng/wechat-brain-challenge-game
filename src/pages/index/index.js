const levelManager = require("../../utils/level-manager");
const shareManager = require("../../utils/share-manager");
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
    return shareManager.getShareConfig("milestone", {
      id: this.data.progress.current,
    });
  },
});
