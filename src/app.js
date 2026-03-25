const audioManager = require("./utils/audio-manager");
const storage = require("./utils/storage");

App({
  globalData: {
    userInfo: null,
    systemInfo: null,
    soundEnabled: true,
  },

  onLaunch() {
    const systemInfo = wx.getWindowInfo();
    this.globalData.systemInfo = systemInfo;

    const settings = storage.getSettings();
    this.globalData.soundEnabled = settings.soundEnabled;

    audioManager.init();
    audioManager.setEnabled(settings.soundEnabled);

    this._checkUpdate();
  },

  onShow(options) {
    // Handle scene values (e.g. entering from share)
    if (options.scene === 1007 || options.scene === 1008) {
      // From share card in single/group chat
      const query = options.query || {};
      if (query.level) {
        this.globalData.shareLevel = parseInt(query.level, 10);
      }
    }
  },

  onShareAppMessage() {
    return {
      title: "你能过几关？来挑战你的脑洞！",
      path: "/pages/index/index",
      imageUrl: "/images/share/card-bg-1.png",
    };
  },

  /**
   * Check for mini program updates
   */
  _checkUpdate() {
    if (!wx.canIUse("getUpdateManager")) return;
    const updateManager = wx.getUpdateManager();
    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: "更新提示",
        content: "新版本已经准备好，是否重启应用？",
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        },
      });
    });
  },
});
