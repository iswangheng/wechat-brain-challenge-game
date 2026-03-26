Component({
  properties: {
    level: {
      type: Object,
      value: null,
    },
    showHint: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    scratchPercent: 0,
    dragX: 0,
    dragY: 0,
    isDragging: false,
    chars: [],
    zoomScale: 1,
  },

  observers: {
    level(val) {
      // Reset state when level changes
      this.setData({
        scratchPercent: 0,
        dragX: 0,
        dragY: 0,
        isDragging: false,
        zoomScale: 1,
        chars: [],
      });
      // Reset completion flags
      this._interactCompleted = false;
      if (val && val.type === "text_trap" && val.displayText) {
        this.setData({
          chars: val.displayText.split(""),
        });
      }
    },
  },

  methods: {
    /**
     * Handle character tap for text_trap type
     */
    onCharTap(e) {
      const { index } = e.currentTarget.dataset;
      this.triggerEvent("chartap", { index: parseInt(index, 10) });
    },

    /**
     * Handle touch start for scratch/drag interactions
     */
    onTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      this._lastX = touch.clientX;
      this._lastY = touch.clientY;
      this.setData({ isDragging: true });
      this.triggerEvent("touchaction", {
        type: "start",
        x: touch.clientX,
        y: touch.clientY,
      });
    },

    /**
     * Handle touch move for scratch/drag interactions
     */
    onTouchMove(e) {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      if (this._lastX === undefined) return;
      const level = this.properties.level;
      if (!level || !level.interaction) return;

      if (level.interaction.method === "scratch") {
        const percent = this.data.scratchPercent + 0.5;
        this.setData({ scratchPercent: Math.min(percent, 100) });
        if (percent >= 60 && !this._interactCompleted) {
          this._interactCompleted = true;
          this.triggerEvent("interactcomplete", { method: "scratch" });
        }
      }

      if (
        level.interaction.method === "drag_text" ||
        level.interaction.method === "drag_element"
      ) {
        const dx = touch.clientX - this._lastX;
        const dy = touch.clientY - this._lastY;
        this.setData({
          dragX: this.data.dragX + dx,
          dragY: this.data.dragY + dy,
        });
        this._lastX = touch.clientX;
        this._lastY = touch.clientY;

        const dist = Math.sqrt(
          this.data.dragX * this.data.dragX + this.data.dragY * this.data.dragY,
        );
        if (dist > 100 && !this._interactCompleted) {
          this._interactCompleted = true;
          this.triggerEvent("interactcomplete", {
            method: level.interaction.method,
          });
        }
      }

      if (level.interaction.method === "swipe" && !this._interactCompleted) {
        const direction =
          (level.interaction && level.interaction.direction) || "up";
        const dx = touch.clientX - this._lastX;
        const dy = this._lastY - touch.clientY;
        let triggered = false;
        if (direction === "up" && dy > 80) triggered = true;
        if (direction === "down" && dy < -80) triggered = true;
        if (direction === "left" && dx < -80) triggered = true;
        if (direction === "right" && dx > 80) triggered = true;
        if (triggered) {
          this._interactCompleted = true;
          this.triggerEvent("interactcomplete", {
            method: "swipe",
            direction,
          });
        }
      }

      this.triggerEvent("touchaction", {
        type: "move",
        x: touch.clientX,
        y: touch.clientY,
        touches: e.touches.length,
      });
    },

    /**
     * Handle touch end
     */
    onTouchEnd() {
      this.setData({ isDragging: false });
      this.triggerEvent("touchaction", { type: "end" });
    },

    /**
     * Handle pinch zoom start
     */
    onPinchStart(e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this._initialPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    },

    /**
     * Handle pinch zoom move
     */
    onPinchMove(e) {
      if (e.touches.length < 2 || !this._initialPinchDist) return;

      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = Math.max(1, Math.min(3, dist / this._initialPinchDist));

      this.setData({ zoomScale: scale });

      if (scale > 1.8 && !this._interactCompleted) {
        this._interactCompleted = true;
        this.triggerEvent("interactcomplete", { method: "pinch_zoom" });
      }
    },

    /**
     * Handle pinch zoom end
     */
    onPinchEnd() {
      this._initialPinchDist = null;
    },

    /**
     * Handle tap on specific text target
     */
    onTextTap(e) {
      const { target } = e.currentTarget.dataset;
      this.triggerEvent("texttap", { target });
    },

    /**
     * Handle multi-touch detection
     */
    onMultiTouch(e) {
      if (e.touches.length >= 2 && !this._interactCompleted) {
        this._interactCompleted = true;
        this.triggerEvent("interactcomplete", {
          method: "multi_touch",
          touches: e.touches.length,
        });
      }
    },
  },
});
