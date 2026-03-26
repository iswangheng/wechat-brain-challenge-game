const storage = require("../../utils/storage");

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    friends: [],
    myScore: 0,
  },

  observers: {
    visible(val) {
      if (val) {
        this._loadData();
      }
    },
  },

  methods: {
    /**
     * Load leaderboard data
     * Note: real implementation needs open-data-context
     * Using mock data for development
     */
    _loadData() {
      const progress = storage.getProgress();
      const myScore = Array.isArray(progress.completedLevels)
        ? progress.completedLevels.length
        : 0;

      // Mock friend data for development
      const friends = [
        { nickname: "脑洞大王", avatar: "", score: 68 },
        { nickname: "智慧之光", avatar: "", score: 52 },
        { nickname: "挑战达人", avatar: "", score: 45 },
        { nickname: "我", avatar: "", score: myScore, isMe: true },
        { nickname: "思考者", avatar: "", score: 30 },
        { nickname: "新手玩家", avatar: "", score: 12 },
      ];

      // Sort by score descending
      friends.sort((a, b) => b.score - a.score);

      this.setData({
        friends,
        myScore,
      });
    },

    /**
     * Close leaderboard
     */
    onClose() {
      this.triggerEvent("close");
    },

    /**
     * Prevent overlay tap propagation
     */
    onOverlayTap() {
      this.triggerEvent("close");
    },

    onCardTap() {
      // Prevent closing
    },
  },
});
