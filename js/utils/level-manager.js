/**
 * Level loading, progress tracking, unlock logic, and play order management
 */
const storage = require("./storage");
const levelsData = require("../../data/levels");

let levels = [];

const PLAY_ORDER_KEY = "game_play_order";

/**
 * Fisher-Yates shuffle (in-place)
 */
const _shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const loadLevels = () => {
  levels = levelsData.levels || [];
  return levels;
};

/**
 * Generate a new randomized play order, shuffled within difficulty tiers
 * so difficulty still progresses easy → hard, but questions within each tier are random.
 * @returns {number[]} array of level IDs in play order
 */
const generatePlayOrder = () => {
  if (!levels.length) loadLevels();

  const tiers = [
    levels.filter((l) => l.id <= 10),
    levels.filter((l) => l.id > 10 && l.id <= 30),
    levels.filter((l) => l.id > 30 && l.id <= 50),
    levels.filter((l) => l.id > 50 && l.id <= 70),
    levels.filter((l) => l.id > 70),
  ];

  const order = [];
  for (const tier of tiers) {
    const ids = tier.map((l) => l.id);
    _shuffle(ids);
    order.push(...ids);
  }

  storage.set(PLAY_ORDER_KEY, order);
  return order;
};

/**
 * Get current play order, or generate one if none exists
 * @returns {number[]}
 */
const getPlayOrder = () => {
  const saved = storage.get(PLAY_ORDER_KEY);
  if (Array.isArray(saved) && saved.length > 0) return saved;
  return generatePlayOrder();
};

/**
 * Get the level ID at a given position (1-based) in the play order
 * @param {number} position - 1-based position
 * @returns {number} level ID
 */
const getLevelIdAtPosition = (position) => {
  const order = getPlayOrder();
  if (position < 1 || position > order.length) return null;
  return order[position - 1];
};

const getLevel = (id) => {
  if (!levels.length) loadLevels();
  return levels.find((l) => l.id === id) || null;
};

/**
 * Get level by play position (1-based)
 */
const getLevelAtPosition = (position) => {
  const id = getLevelIdAtPosition(position);
  return id ? getLevel(id) : null;
};

const getCurrentLevel = () => {
  const progress = storage.getProgress();
  return getLevelAtPosition(progress.currentLevel);
};

const completeLevel = (id) => {
  storage.saveProgress(id, getLevelCount());
  storage.updateStats({ totalCorrect: 1, totalAttempts: 1 });
};

const recordWrongAnswer = () => {
  storage.updateStats({ totalWrong: 1, totalAttempts: 1 });
};

const getLevelCount = () => {
  if (!levels.length) loadLevels();
  return levels.length;
};

const getCompletedCount = () => {
  const progress = storage.getProgress();
  return Array.isArray(progress.completedLevels) ? progress.completedLevels.length : 0;
};

const isLevelUnlocked = (id) => {
  const progress = storage.getProgress();
  return id <= progress.maxLevel;
};

const getProgress = () => {
  const total = getLevelCount();
  const completed = getCompletedCount();
  return {
    current: completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

const isAllCompleted = () => getCompletedCount() >= getLevelCount();

/**
 * Reset all progress and generate a fresh shuffled play order
 */
const resetAndShuffle = () => {
  storage.set("game_progress", {
    currentLevel: 1,
    maxLevel: 1,
    completedLevels: [],
    hintUsed: [],
  });
  return generatePlayOrder();
};

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
  loadLevels, getLevel, getCurrentLevel, completeLevel, recordWrongAnswer,
  getLevelCount, getCompletedCount, isLevelUnlocked, getProgress, isAllCompleted,
  getLevelSections, generatePlayOrder, getPlayOrder, getLevelIdAtPosition,
  getLevelAtPosition, resetAndShuffle,
};
