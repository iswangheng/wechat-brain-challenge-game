/**
 * Ad management for mini game: rewarded video, interstitial, banner
 */

const AD_UNITS = {
  REWARDED_VIDEO: "adunit-placeholder-reward",
  INTERSTITIAL: "adunit-placeholder-interstitial",
  BANNER: "adunit-placeholder-banner",
};

const INTERSTITIAL_START_LEVEL = 6;
const INTERSTITIAL_INTERVAL = 5;

let rewardedVideoAd = null;
let interstitialAd = null;
let rewardedCallback = null;

const init = () => {
  if (rewardedVideoAd || interstitialAd) return;
  _createRewardedVideo();
  _createInterstitial();
};

const _createRewardedVideo = () => {
  if (!wx.createRewardedVideoAd) return;
  rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: AD_UNITS.REWARDED_VIDEO });
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

const _createInterstitial = () => {
  if (!wx.createInterstitialAd) return;
  interstitialAd = wx.createInterstitialAd({ adUnitId: AD_UNITS.INTERSTITIAL });
  interstitialAd.onError((err) => {
    console.error("Interstitial ad error:", err);
  });
};

const showRewardedVideo = (callback) => {
  if (rewardedCallback) { callback(false); return; }
  rewardedCallback = callback;
  if (!rewardedVideoAd) { rewardedCallback = null; callback(false); return; }
  rewardedVideoAd.show().catch(() => {
    rewardedVideoAd.load()
      .then(() => rewardedVideoAd.show())
      .catch(() => { if (rewardedCallback) rewardedCallback(false); rewardedCallback = null; });
  });
};

const showInterstitial = () => {
  if (!interstitialAd) return;
  interstitialAd.show().catch(() => {});
};

const shouldShowInterstitial = (level) => {
  if (level < INTERSTITIAL_START_LEVEL) return false;
  return (level - INTERSTITIAL_START_LEVEL) % INTERSTITIAL_INTERVAL === 0;
};

const destroy = () => {
  if (rewardedVideoAd) { rewardedVideoAd.destroy && rewardedVideoAd.destroy(); rewardedVideoAd = null; }
  if (interstitialAd) { interstitialAd.destroy && interstitialAd.destroy(); interstitialAd = null; }
};

module.exports = { AD_UNITS, init, showRewardedVideo, showInterstitial, shouldShowInterstitial, destroy };
