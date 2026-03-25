Component({
  properties: {
    options: {
      type: Array,
      value: [],
    },
    correctIndex: {
      type: Number,
      value: -1,
    },
    disabled: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    selectedIndex: -1,
    showResult: false,
    letters: ["A", "B", "C", "D", "E", "F"],
  },

  methods: {
    /**
     * Handle option tap
     */
    onOptionTap(e) {
      if (this.data.disabled || this.data.showResult) return;

      const index = parseInt(e.currentTarget.dataset.index, 10);
      const correct = index === this.properties.correctIndex;

      this.setData({
        selectedIndex: index,
        showResult: true,
      });

      this.triggerEvent("answer", { index, correct });
    },

    /**
     * Reset selection state
     */
    reset() {
      this.setData({
        selectedIndex: -1,
        showResult: false,
      });
    },
  },
});
