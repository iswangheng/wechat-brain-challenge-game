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
    useCanvas: false,
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
     * Try open data context first, fallback to mock data
     */
    _loadData() {
      const progress = storage.getProgress();
      const myScore = Array.isArray(progress.completedLevels)
        ? progress.completedLevels.length
        : 0;

      this._fallbackMock(myScore);
    },

    /**
     * Fallback to mock data when open data context is unavailable
     */
    _fallbackMock(myScore) {
      const friends = [
        { nickname: "脑洞大王", avatar: "", score: 68 },
        { nickname: "智慧之光", avatar: "", score: 52 },
        { nickname: "挑战达人", avatar: "", score: 45 },
        { nickname: "我", avatar: "", score: myScore, isMe: true },
        { nickname: "思考者", avatar: "", score: 30 },
        { nickname: "新手玩家", avatar: "", score: 12 },
      ];

      friends.sort((a, b) => b.score - a.score);

      this.setData({
        friends,
        myScore,
        useCanvas: false,
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
