/**
 * Local storage wrapper for wx storage APIs
 */

const KEYS = {
  PROGRESS: "game_progress",
  SETTINGS: "game_settings",
  STATS: "game_stats",
};

const DEFAULT_PROGRESS = {
  currentLevel: 1,
  maxLevel: 1,
  completedLevels: [],
  hintUsed: [],
};

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  vibrationEnabled: true,
};

const DEFAULT_STATS = {
  totalAttempts: 0,
  totalCorrect: 0,
  totalWrong: 0,
  totalShareCount: 0,
  totalAdWatched: 0,
};

/**
 * Get value from storage
 * @param {string} key
 * @returns {*}
 */
const get = (key) => {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    console.error("Storage get error:", e);
    return null;
  }
};

/**
 * Set value to storage
 * @param {string} key
 * @param {*} value
 */
const set = (key, value) => {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.error("Storage set error:", e);
  }
};

/**
 * Remove value from storage
 * @param {string} key
 */
const remove = (key) => {
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    console.error("Storage remove error:", e);
  }
};

/**
 * Get game progress
 * @returns {{ currentLevel: number, maxLevel: number, completedLevels: number[], hintUsed: number[] }}
 */
const getProgress = () => {
  const progress = get(KEYS.PROGRESS);
  const merged = { ...DEFAULT_PROGRESS, ...(progress || {}) };
  // Ensure array fields are valid
  if (!Array.isArray(merged.completedLevels)) merged.completedLevels = [];
  if (!Array.isArray(merged.hintUsed)) merged.hintUsed = [];
  return merged;
};

/**
 * Save level completion
 * @param {number} levelId
 */
const saveProgress = (levelId, totalLevels = 80) => {
  const progress = getProgress();
  if (!progress.completedLevels.includes(levelId)) {
    progress.completedLevels.push(levelId);
  }
  const nextLevel = Math.min(levelId + 1, totalLevels);
  if (levelId >= progress.maxLevel) {
    progress.maxLevel = nextLevel;
  }
  progress.currentLevel = nextLevel;
  set(KEYS.PROGRESS, progress);
};

/**
 * Record hint usage
 * @param {number} levelId
 */
const saveHintUsed = (levelId) => {
  const progress = getProgress();
  if (!progress.hintUsed.includes(levelId)) {
    progress.hintUsed.push(levelId);
    set(KEYS.PROGRESS, progress);
  }
};

/**
 * Get settings
 * @returns {{ soundEnabled: boolean, vibrationEnabled: boolean }}
 */
const getSettings = () => {
  const settings = get(KEYS.SETTINGS);
  return settings || { ...DEFAULT_SETTINGS };
};

/**
 * Save settings
 * @param {Object} settings
 */
const saveSettings = (settings) => {
  const current = getSettings();
  set(KEYS.SETTINGS, { ...current, ...settings });
};

/**
 * Get game stats
 * @returns {Object}
 */
const getStats = () => {
  const stats = get(KEYS.STATS);
  return stats || { ...DEFAULT_STATS };
};

/**
 * Update game stats
 * @param {Object} updates
 */
const updateStats = (updates) => {
  const stats = getStats();
  Object.keys(updates).forEach((key) => {
    if (typeof stats[key] === "number") {
      stats[key] += updates[key];
    }
  });
  set(KEYS.STATS, stats);
};

module.exports = {
  get,
  set,
  remove,
  getProgress,
  saveProgress,
  saveHintUsed,
  getSettings,
  saveSettings,
  getStats,
  updateStats,
};
