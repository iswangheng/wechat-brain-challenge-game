/**
 * Level loading, progress tracking, and unlock logic
 */
const storage = require("./storage");
const levelsData = require("../data/levels.json");

let levels = [];

/**
 * Load all levels from data
 */
const loadLevels = () => {
  levels = levelsData.levels || [];
  return levels;
};

/**
 * Get specific level by ID
 * @param {number} id
 * @returns {Object|null}
 */
const getLevel = (id) => {
  if (!levels.length) loadLevels();
  return levels.find((l) => l.id === id) || null;
};

/**
 * Get current level based on saved progress
 * @returns {Object|null}
 */
const getCurrentLevel = () => {
  const progress = storage.getProgress();
  return getLevel(progress.currentLevel);
};

/**
 * Mark level as completed and save progress
 * @param {number} id
 */
const completeLevel = (id) => {
  storage.saveProgress(id);
  storage.updateStats({ totalCorrect: 1, totalAttempts: 1 });
};

/**
 * Record a wrong answer attempt
 */
const recordWrongAnswer = () => {
  storage.updateStats({ totalWrong: 1, totalAttempts: 1 });
};

/**
 * Get total level count
 * @returns {number}
 */
const getLevelCount = () => {
  if (!levels.length) loadLevels();
  return levels.length;
};

/**
 * Get completed level count
 * @returns {number}
 */
const getCompletedCount = () => {
  const progress = storage.getProgress();
  return progress.completedLevels.length;
};

/**
 * Check if a level is unlocked
 * @param {number} id
 * @returns {boolean}
 */
const isLevelUnlocked = (id) => {
  const progress = storage.getProgress();
  return id <= progress.maxLevel;
};

/**
 * Get overall progress info
 * @returns {{ current: number, total: number, percentage: number }}
 */
const getProgress = () => {
  const total = getLevelCount();
  const completed = getCompletedCount();
  return {
    current: completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

/**
 * Check if all levels are completed
 * @returns {boolean}
 */
const isAllCompleted = () => {
  return getCompletedCount() >= getLevelCount();
};

/**
 * Get levels grouped by difficulty section
 * @returns {Object}
 */
const getLevelSections = () => {
  if (!levels.length) loadLevels();
  const progress = storage.getProgress();
  return {
    beginner: levels.filter((l) => l.id <= 10),
    intermediate: levels.filter((l) => l.id > 10 && l.id <= 30),
    advanced: levels.filter((l) => l.id > 30 && l.id <= 50),
    expert: levels.filter((l) => l.id > 50 && l.id <= 70),
    hell: levels.filter((l) => l.id > 70),
    completedLevels: progress.completedLevels,
    maxLevel: progress.maxLevel,
  };
};

module.exports = {
  loadLevels,
  getLevel,
  getCurrentLevel,
  completeLevel,
  recordWrongAnswer,
  getLevelCount,
  getCompletedCount,
  isLevelUnlocked,
  getProgress,
  isAllCompleted,
  getLevelSections,
};
