const storage = require("./storage");

const ACHIEVEMENTS = [
  { id: "first_win", name: "初露锋芒", desc: "答对第一题", icon: "🌟" },
  { id: "streak_5", name: "五连杀", desc: "连续答对5题", icon: "🔥" },
  { id: "streak_10", name: "十连胜", desc: "连续答对10题", icon: "💥" },
  { id: "streak_20", name: "无人能挡", desc: "连续答对20题", icon: "⚡" },
  { id: "level_10", name: "小试牛刀", desc: "闯过第10关", icon: "🎯" },
  { id: "level_30", name: "渐入佳境", desc: "闯过第30关", icon: "🏅" },
  { id: "level_50", name: "实力非凡", desc: "闯过第50关", icon: "🏆" },
  { id: "level_80", name: "最强大脑", desc: "通关全部80关", icon: "👑" },
  { id: "speed_3s", name: "闪电反应", desc: "3秒内答对一题", icon: "⚡" },
  { id: "all_3star", name: "完美主义", desc: "连续10关全部3星", icon: "✨" },
  { id: "no_hint", name: "独立思考", desc: "不用提示闯过20关", icon: "🧠" },
  { id: "daily_7", name: "持之以恒", desc: "连续7天完成每日挑战", icon: "📅" },
];

// Queue of newly unlocked achievements to display
let _pendingNotifications = [];

const checkAndUnlock = (id) => {
  const newly = storage.unlockAchievement(id);
  if (newly) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) _pendingNotifications.push(ach);
  }
  return newly;
};

// Call this after correct answer with context
const onCorrectAnswer = (context) => {
  const { position, combo, answerTime, totalNoHint } = context;

  if (position === 1) checkAndUnlock("first_win");
  if (combo >= 5) checkAndUnlock("streak_5");
  if (combo >= 10) checkAndUnlock("streak_10");
  if (combo >= 20) checkAndUnlock("streak_20");
  if (position >= 10) checkAndUnlock("level_10");
  if (position >= 30) checkAndUnlock("level_30");
  if (position >= 50) checkAndUnlock("level_50");
  if (position >= 80) checkAndUnlock("level_80");
  if (answerTime <= 3) checkAndUnlock("speed_3s");
  if (totalNoHint >= 20) checkAndUnlock("no_hint");
};

const getAll = () => {
  const unlocked = storage.getAchievements();
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: !!unlocked[a.id],
    date: unlocked[a.id] ? unlocked[a.id].date : null,
  }));
};

const getUnlockedCount = () => {
  const unlocked = storage.getAchievements();
  return Object.keys(unlocked).length;
};

const popNotification = () => {
  return _pendingNotifications.shift() || null;
};

module.exports = { ACHIEVEMENTS, checkAndUnlock, onCorrectAnswer, getAll, getUnlockedCount, popNotification };
