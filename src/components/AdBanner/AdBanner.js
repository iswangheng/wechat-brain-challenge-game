Component({
  properties: {
    adUnitId: {
      type: String,
      value: "adunit-placeholder-banner",
    },
    show: {
      type: Boolean,
      value: true,
    },
  },

  data: {
    adLoaded: false,
    adError: false,
    hidden: false,
  },

  observers: {
    show() {
      // Reset hidden state when parent changes show prop
      this.setData({ hidden: false });
    },
  },

  methods: {
    /**
     * Handle ad load success
     */
    onAdLoad() {
      this.setData({ adLoaded: true });
    },

    /**
     * Handle ad load error
     */
    onAdError(err) {
      console.error("Banner ad error:", err.detail);
      this.setData({ adError: true });
    },

    /**
     * Handle ad close
     */
    onAdClose() {
      this.setData({ hidden: true });
    },
  },
});
