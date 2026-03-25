Component({
  properties: {
    type: {
      type: String,
      value: "complete",
    },
    level: {
      type: Number,
      value: 1,
    },
    funnyComment: {
      type: String,
      value: "",
    },
    visible: {
      type: Boolean,
      value: false,
    },
    isCorrect: {
      type: Boolean,
      value: true,
    },
  },

  data: {
    emoji: "",
    actionText: "",
  },

  observers: {
    "visible, isCorrect"(visible) {
      if (!visible) return;
      const isCorrect = this.properties.isCorrect;
      this.setData({
        emoji: isCorrect ? "🎉" : "😂",
        actionText: isCorrect ? "继续挑战" : "再试一次",
      });
    },
  },

  methods: {
    /**
     * Trigger share to friends
     */
    onShare() {
      this.triggerEvent("share", {
        type: this.properties.type,
        level: this.properties.level,
      });
    },

    /**
     * Close the share card
     */
    onClose() {
      this.triggerEvent("close");
    },

    /**
     * Prevent overlay tap from closing
     */
    onOverlayTap() {
      this.triggerEvent("close");
    },

    /**
     * Stop event propagation
     */
    onCardTap() {
      // Prevent closing when tapping card body
    },
  },
});
