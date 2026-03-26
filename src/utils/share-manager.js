/**
 * Share card generation and share callback handling
 */
const shareTexts = require("../data/share-texts.json");

/**
 * Get random item from array
 * @param {Array} arr
 * @returns {*}
 */
const _randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Replace {level} placeholder in text
 * @param {string} text
 * @param {number} level
 * @returns {string}
 */
const _fillTemplate = (text, level) => text.replace(/{level}/g, level);

/**
 * Get share configuration for wx.shareAppMessage
 * @param {'wrongAnswer'|'levelComplete'|'milestone'|'creative'|'revive'} type
 * @param {Object} levelData
 * @returns {{ title: string, path: string, imageUrl: string }}
 */
const getShareConfig = (type, levelData) => {
  const levelId = levelData ? levelData.id : 1;
  const texts = shareTexts[type] || shareTexts.levelComplete;
  const title = _fillTemplate(_randomItem(texts), levelId);

  return {
    title,
    path: `/pages/share/share?level=${levelId}&type=${type}`,
  };
};

/**
 * Get share text for a specific scenario
 * @param {'wrongAnswer'|'levelComplete'|'milestone'|'creative'|'revive'} type
 * @param {number} level
 * @returns {string}
 */
const getShareText = (type, level) => {
  const texts = shareTexts[type] || shareTexts.levelComplete;
  return _fillTemplate(_randomItem(texts), level);
};

/**
 * Get level-specific share text from level data
 * @param {Object} levelData
 * @returns {string}
 */
const getLevelShareText = (levelData) => {
  if (levelData && levelData.shareText) {
    return levelData.shareText;
  }
  return getShareText("levelComplete", levelData ? levelData.id : 1);
};

/**
 * Configure page share menu
 */
const enableShareMenu = () => {
  wx.showShareMenu({
    withShareTicket: true,
    menus: ["shareAppMessage", "shareTimeline"],
  });
};

module.exports = {
  getShareConfig,
  getShareText,
  getLevelShareText,
  enableShareMenu,
};
