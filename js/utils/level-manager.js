/**
 * Level loading, progress tracking, and unlock logic
 */
const storage = require("./storage");
const levelsData = require("../../data/levels");

let levels = [];

const loadLevels = () => {
  levels = levelsData.levels || [];
  return levels;
};

const getLevel = (id) => {
  if (!levels.length) loadLevels();
  return levels.find((l) => l.id === id) || null;
};

const getCurrentLevel = () => {
  const progress = storage.getProgress();
  return getLevel(progress.currentLevel);
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
  getLevelCount, getCompletedCount, isLevelUnlocked, getProgress, isAllCompleted, getLevelSections,
};
