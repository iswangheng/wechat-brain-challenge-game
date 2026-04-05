const storage = require("./storage");

const RANKS = [
  { name: "青铜", icon: "🥉", minXP: 0, color: "#CD7F32" },
  { name: "白银", icon: "🥈", minXP: 100, color: "#C0C0C0" },
  { name: "黄金", icon: "🥇", minXP: 300, color: "#FFD700" },
  { name: "铂金", icon: "💎", minXP: 600, color: "#E5E4E2" },
  { name: "钻石", icon: "💠", minXP: 1000, color: "#B9F2FF" },
  { name: "大师", icon: "🏅", minXP: 1500, color: "#FF6B6B" },
  { name: "王者", icon: "👑", minXP: 2500, color: "#FFD700" },
];

const getCurrentRank = () => {
  const data = storage.getRankData();
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (data.xp >= r.minXP) rank = r;
  }
  return { ...rank, xp: data.xp };
};

// Calculate XP from a game session
// stars: total stars earned, position: how far they got, combo: max combo
const calculateXP = (position, totalStars, maxCombo) => {
  let xp = 0;
  xp += position * 5;          // 5 XP per level cleared
  xp += totalStars * 3;        // 3 XP per star
  xp += maxCombo * 2;          // 2 XP per combo
  return xp;
};

const addSessionXP = (position, totalStars, maxCombo) => {
  const xp = calculateXP(position, totalStars, maxCombo);
  const oldRank = getCurrentRank();
  storage.addXP(xp);
  const newRank = getCurrentRank();
  return {
    xpEarned: xp,
    totalXP: newRank.xp,
    rankUp: newRank.name !== oldRank.name,
    oldRank: oldRank,
    newRank: newRank,
    nextRank: RANKS.find(r => r.minXP > newRank.xp) || null,
  };
};

const getProgressToNext = () => {
  const data = storage.getRankData();
  const current = getCurrentRank();
  const next = RANKS.find(r => r.minXP > data.xp);
  if (!next) return { percent: 100, remaining: 0 };
  const range = next.minXP - current.minXP;
  const progress = data.xp - current.minXP;
  return {
    percent: Math.round((progress / range) * 100),
    remaining: next.minXP - data.xp,
  };
};

module.exports = { RANKS, getCurrentRank, calculateXP, addSessionXP, getProgressToNext };
