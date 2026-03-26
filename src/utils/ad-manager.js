/**
 * Ad management: rewarded video, interstitial, and banner ads
 */

const AD_UNITS = {
  REWARDED_VIDEO: "adunit-placeholder-reward",
  INTERSTITIAL: "adunit-placeholder-interstitial",
  BANNER: "adunit-placeholder-banner",
};

// No ads in first 5 levels, show interstitial every 5 levels
const INTERSTITIAL_START_LEVEL = 6;
const INTERSTITIAL_INTERVAL = 5;

let rewardedVideoAd = null;
let interstitialAd = null;
let rewardedCallback = null;

/**
 * Initialize ad instances
 */
const init = () => {
  _createRewardedVideo();
  _createInterstitial();
};

/**
 * Create rewarded video ad instance
 */
const _createRewardedVideo = () => {
  if (!wx.createRewardedVideoAd) return;
  rewardedVideoAd = wx.createRewardedVideoAd({
    adUnitId: AD_UNITS.REWARDED_VIDEO,
  });
  rewardedVideoAd.onClose((res) => {
    if (res && res.isEnded) {
      if (rewardedCallback) rewardedCallback(true);
    } else {
      if (rewardedCallback) rewardedCallback(false);
    }
    rewardedCallback = null;
  });
  rewardedVideoAd.onError((err) => {
    console.error("Rewarded video ad error:", err);
    if (rewardedCallback) rewardedCallback(false);
    rewardedCallback = null;
  });
};

/**
 * Create interstitial ad instance
 */
const _createInterstitial = () => {
  if (!wx.createInterstitialAd) return;
  interstitialAd = wx.createInterstitialAd({
    adUnitId: AD_UNITS.INTERSTITIAL,
  });
  interstitialAd.onError((err) => {
    console.error("Interstitial ad error:", err);
  });
};

/**
 * Show rewarded video ad
 * @param {Function} callback - called with true if reward earned, false otherwise
 */
const showRewardedVideo = (callback) => {
  if (rewardedCallback) {
    // A rewarded video is already in progress, reject this call
    callback(false);
    return;
  }
  rewardedCallback = callback;
  if (!rewardedVideoAd) {
    rewardedCallback = null;
    callback(false);
    return;
  }
  rewardedVideoAd.show().catch(() => {
    rewardedVideoAd
      .load()
      .then(() => rewardedVideoAd.show())
      .catch(() => {
        if (rewardedCallback) rewardedCallback(false);
        rewardedCallback = null;
      });
  });
};

/**
 * Show interstitial ad
 */
const showInterstitial = () => {
  if (!interstitialAd) return;
  interstitialAd.show().catch(() => {
    // Ad not ready, silently fail
  });
};

/**
 * Check if interstitial should be shown at this level
 * @param {number} level
 * @returns {boolean}
 */
const shouldShowInterstitial = (level) => {
  if (level < INTERSTITIAL_START_LEVEL) return false;
  return level % INTERSTITIAL_INTERVAL === 0;
};

/**
 * Destroy all ad instances
 */
const destroy = () => {
  if (rewardedVideoAd) {
    rewardedVideoAd.destroy && rewardedVideoAd.destroy();
    rewardedVideoAd = null;
  }
  if (interstitialAd) {
    interstitialAd.destroy && interstitialAd.destroy();
    interstitialAd = null;
  }
};

module.exports = {
  AD_UNITS,
  init,
  showRewardedVideo,
  showInterstitial,
  shouldShowInterstitial,
  destroy,
};
