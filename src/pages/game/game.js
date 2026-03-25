const levelManager = require("../../utils/level-manager");
const adManager = require("../../utils/ad-manager");
const shareManager = require("../../utils/share-manager");
const sensorManager = require("../../utils/sensor-manager");
const audioManager = require("../../utils/audio-manager");
const storage = require("../../utils/storage");

Page({
  data: {
    level: null,
    levelId: 1,
    showHint: false,
    answered: false,
    isCorrect: false,
    showShareCard: false,
    funnyComment: "",
    explanation: "",
    progress: { current: 0, total: 80, percentage: 0 },
    // For interactive: color_wait
    colorBtnColor: "#FF4757",
    colorInterval: null,
    // For interactive: lights_puzzle
    lights: [],
    // For interactive: sequence_tap
    sequenceStep: 0,
    sequenceItems: [],
    // Mode
    mode: "play",
  },

  onLoad(options) {
    levelManager.loadLevels();
    adManager.init();

    if (options.mode === "select") {
      this.setData({ mode: "select" });
      return;
    }

    const levelId = parseInt(options.level, 10) || 1;
    this._loadLevel(levelId);
  },

  onUnload() {
    sensorManager.stopAll();
    this._clearColorInterval();
  },

  onShareAppMessage() {
    const level = this.data.level;
    const type = this.data.isCorrect ? "levelComplete" : "wrongAnswer";
    return shareManager.getShareConfig(type, level);
  },

  /**
   * Load a specific level
   */
  _loadLevel(id) {
    const level = levelManager.getLevel(id);
    if (!level) {
      wx.showToast({ title: "恭喜通关！", icon: "success" });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      level,
      levelId: id,
      answered: false,
      isCorrect: false,
      showHint: false,
      showShareCard: false,
      funnyComment: "",
      explanation: "",
      progress: levelManager.getProgress(),
      sequenceStep: 0,
    });

    wx.setNavigationBarTitle({ title: `第 ${id} 关` });

    // Setup interactive level
    if (level.type === "interactive") {
      this._setupInteractive(level);
    }
  },

  /**
   * Setup interactive level mechanics
   */
  _setupInteractive(level) {
    const method = level.interaction.method;

    if (method === "shake") {
      sensorManager.detectShake(() => {
        if (!this.data.answered) this._onCorrect();
      });
    }

    if (method === "tilt") {
      sensorManager.detectTilt(
        () => {
          if (!this.data.answered) this._onCorrect();
        },
        level.interaction.threshold ? "x" : "x",
        30,
      );
    }

    if (method === "flip") {
      sensorManager.detectFlip(() => {
        if (!this.data.answered) this._onCorrect();
      });
    }

    if (method === "color_wait") {
      this._startColorCycle();
    }

    if (method === "lights_puzzle") {
      const size = level.interaction.gridSize || 3;
      const lights = Array(size * size).fill(true);
      this.setData({ lights });
    }

    if (method === "sequence_tap") {
      this.setData({
        sequenceItems: level.interaction.steps || ["开门", "放入", "关门"],
        sequenceStep: 0,
      });
    }

    if (method === "trick_choice") {
      // Handled by option-button component
    }
  },

  /**
   * Handle option answer (riddle, trivia, trick_choice)
   */
  onAnswer(e) {
    if (this.data.answered) return;
    const { correct } = e.detail;

    if (correct) {
      this._onCorrect();
    } else {
      this._onWrong();
    }
  },

  /**
   * Handle character tap (text_trap)
   */
  onCharTap(e) {
    if (this.data.answered) return;
    const { index } = e.detail;
    const level = this.data.level;

    if (index === level.interaction.correctIndex) {
      this._onCorrect();
    } else {
      this._onWrong();
    }
  },

  /**
   * Handle interactive completion
   */
  onInteractComplete() {
    if (this.data.answered) return;
    this._onCorrect();
  },

  /**
   * Handle text tap for interactive
   */
  onTextTap(e) {
    if (this.data.answered) return;
    const level = this.data.level;
    if (e.detail.target === level.interaction.targetText) {
      this._onCorrect();
    }
  },

  /**
   * Handle touch action for interactive
   */
  onTouchAction(e) {
    const level = this.data.level;
    if (!level || !level.interaction) return;

    // Multi-touch detection
    if (level.interaction.method === "multi_touch" && e.detail.touches >= 2) {
      if (!this.data.answered) this._onCorrect();
    }
  },

  /**
   * Color button tap (color_wait interactive)
   */
  onColorBtnTap() {
    if (this.data.answered) return;
    if (this.data.colorBtnColor === "#4A90D9") {
      this._onCorrect();
    } else {
      this._onWrong();
    }
  },

  /**
   * Toggle light in lights puzzle
   */
  onLightTap(e) {
    if (this.data.answered) return;
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const lights = [...this.data.lights];
    const size = this.data.level.interaction.gridSize || 3;

    // Toggle self and adjacent
    const toggleIndices = [index];
    if (index % size > 0) toggleIndices.push(index - 1);
    if (index % size < size - 1) toggleIndices.push(index + 1);
    if (index >= size) toggleIndices.push(index - size);
    if (index < lights.length - size) toggleIndices.push(index + size);

    toggleIndices.forEach((i) => {
      lights[i] = !lights[i];
    });

    this.setData({ lights });

    // Check if all lights off
    if (lights.every((l) => !l)) {
      this._onCorrect();
    }
  },

  /**
   * Handle sequence tap (e.g., put elephant in fridge)
   */
  onSequenceTap(e) {
    if (this.data.answered) return;
    const step = parseInt(e.currentTarget.dataset.step, 10);

    if (step === this.data.sequenceStep) {
      const nextStep = this.data.sequenceStep + 1;
      this.setData({ sequenceStep: nextStep });

      if (nextStep >= this.data.sequenceItems.length) {
        this._onCorrect();
      }
    } else {
      this._onWrong();
    }
  },

  /**
   * Handle correct answer
   */
  _onCorrect() {
    sensorManager.stopAll();
    this._clearColorInterval();
    audioManager.playCorrect();

    const level = this.data.level;
    levelManager.completeLevel(level.id);

    this.setData({
      answered: true,
      isCorrect: true,
      funnyComment: level.funnyComment || "厉害了！答对了！",
      explanation: level.explanation || "",
      showShareCard: true,
    });

    // Check milestone
    const completed = levelManager.getCompletedCount();
    if (completed % 10 === 0) {
      storage.updateStats({ totalShareCount: 0 });
    }

    // Show interstitial ad at intervals
    if (adManager.shouldShowInterstitial(level.id)) {
      setTimeout(() => {
        adManager.showInterstitial();
      }, 1000);
    }
  },

  /**
   * Handle wrong answer
   */
  _onWrong() {
    audioManager.playWrong();
    levelManager.recordWrongAnswer();

    const level = this.data.level;
    this.setData({
      answered: true,
      isCorrect: false,
      funnyComment: level.funnyComment || "哈哈答错了！",
      explanation: level.explanation || "",
      showShareCard: true,
    });
  },

  /**
   * Use hint (watch rewarded video)
   */
  onUseHint() {
    if (this.data.showHint) return;

    adManager.showRewardedVideo((rewarded) => {
      if (rewarded) {
        storage.saveHintUsed(this.data.levelId);
        storage.updateStats({ totalAdWatched: 1 });
        this.setData({ showHint: true });
      }
    });
  },

  /**
   * Close share card and proceed
   */
  onCloseShareCard() {
    this.setData({ showShareCard: false });

    if (this.data.isCorrect) {
      // Auto advance to next level
      this._loadLevel(this.data.levelId + 1);
    } else {
      // Reset for retry
      this.setData({
        answered: false,
        isCorrect: false,
      });
      // Re-setup interactive if needed
      if (this.data.level.type === "interactive") {
        this._setupInteractive(this.data.level);
      }
    }
  },

  /**
   * Handle input answer (input_answer interactive)
   */
  onInputAnswer(e) {
    this._inputValue = e.detail.value;
  },

  /**
   * Confirm input answer
   */
  onConfirmAnswer() {
    if (this.data.answered) return;
    const level = this.data.level;
    const correct =
      this._inputValue &&
      this._inputValue.trim() === level.interaction.correctAnswer;
    if (correct) {
      this._onCorrect();
    } else {
      this._onWrong();
    }
  },

  /**
   * Share from share card
   */
  onShareFromCard() {
    storage.updateStats({ totalShareCount: 1 });
  },

  /**
   * Color cycle for color_wait interactive
   */
  _startColorCycle() {
    const colors = ["#FF4757", "#2ED573", "#FFD700", "#4A90D9", "#FF6B81"];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % colors.length;
      this.setData({ colorBtnColor: colors[index] });
    }, 800);
    this.setData({ colorInterval: interval });
  },

  _clearColorInterval() {
    if (this.data.colorInterval) {
      clearInterval(this.data.colorInterval);
      this.setData({ colorInterval: null });
    }
  },
});
