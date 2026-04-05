const levelManager = require("../../utils/level-manager");
const adManager = require("../../utils/ad-manager");
const shareManager = require("../../utils/share-manager");
const shareImage = require("../../utils/share-image");
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
    // For interactive: lights_puzzle
    lights: [],
    // For interactive: sequence_tap
    sequenceStep: 0,
    sequenceItems: [],
    // Mode
    mode: "play",
    // Level select
    sectionList: [],
  },

  onLoad(options) {
    levelManager.loadLevels();
    adManager.init();

    if (options.mode === "select") {
      const sections = levelManager.getLevelSections();
      const completedSet = new Set(sections.completedLevels || []);
      const maxLevel = sections.maxLevel || 1;

      const sectionMap = [
        { key: "beginner", title: "入门 (1-10)" },
        { key: "intermediate", title: "进阶 (11-30)" },
        { key: "advanced", title: "高手 (31-50)" },
        { key: "expert", title: "专家 (51-70)" },
        { key: "hell", title: "地狱 (71-80)" },
      ];

      const sectionList = sectionMap.map((s) => ({
        title: s.title,
        levels: sections[s.key].map((l) => ({
          id: l.id,
          unlocked: l.id <= maxLevel,
          completed: completedSet.has(l.id),
        })),
      }));

      this.setData({ mode: "select", sectionList });
      wx.setNavigationBarTitle({ title: "选择关卡" });
      return;
    }

    const levelId = parseInt(options.level, 10) || 1;
    this._loadLevel(levelId);
  },

  onHide() {
    sensorManager.stopAll();
    this._clearColorInterval();
  },

  onShow() {
    // Re-setup interactive sensors only when returning from hide (not first load)
    if (!this._hasShown) {
      this._hasShown = true;
      return;
    }
    const level = this.data.level;
    if (level && level.type === "interactive" && !this.data.answered) {
      this._setupInteractive(level);
    }
  },

  onUnload() {
    sensorManager.stopAll();
    this._clearColorInterval();
  },

  /**
   * Select a level from the grid
   */
  onSelectLevel(e) {
    const id = parseInt(e.currentTarget.dataset.id, 10);
    if (!id) return;
    if (!levelManager.isLevelUnlocked(id)) {
      wx.showToast({ title: "通过前面的关卡才能解锁", icon: "none" });
      return;
    }
    audioManager.playClick();
    wx.redirectTo({ url: `/pages/game/game?level=${id}` });
  },

  /**
   * Go back from level select
   */
  onBack() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    const level = this.data.level;
    const type = this.data.isCorrect ? "levelComplete" : "wrongAnswer";
    const config = shareManager.getShareConfig(type, level);
    if (this._shareImagePath) {
      config.imageUrl = this._shareImagePath;
    }
    return config;
  },

  /**
   * Load a specific level
   */
  _loadLevel(id) {
    // Clean up previous level's sensors and timers
    sensorManager.stopAll();
    this._clearColorInterval();

    const level = levelManager.getLevel(id);
    if (!level) {
      wx.redirectTo({ url: "/pages/result/result" });
      return;
    }

    // Reset sync locks and input value
    this._inputValue = "";
    this._answerLocked = false;

    this.setData({
      level,
      levelId: id,
      inputValue: "",
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
    if (!level || !level.interaction) return;
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
        level.interaction.axis || "x",
        level.interaction.threshold || 30,
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
      this.setData({ lights, lightsGridSize: size });
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
    if (!level || !level.interaction) return;

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
    if (!level || !level.interaction || !e.detail) return;
    if (e.detail.target === level.interaction.targetText) {
      this._onCorrect();
    }
  },

  /**
   * Handle touch action for interactive
   */
  onTouchAction() {
    // Touch events from QuestionCard (used for tracking, not for answer logic)
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
    if (isNaN(index) || index < 0) return;
    if (!this.data.level || !this.data.level.interaction) return;
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
    if (isNaN(step)) return;

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
    if (this._answerLocked) return;
    this._answerLocked = true;
    sensorManager.stopAll();
    this._clearColorInterval();
    audioManager.playCorrect();

    const level = this.data.level;
    if (!level) return;
    levelManager.completeLevel(level.id);

    // Upload score to cloud storage for leaderboard
    try {
      const completedCount = levelManager.getCompletedCount();
      wx.setUserCloudStorage({
        KVDataList: [{ key: "score", value: String(completedCount) }],
      });
    } catch (_e) {
      // Silently skip if appid is empty or API unavailable
    }

    this.setData({
      answered: true,
      isCorrect: true,
      funnyComment: level.funnyComment || "厉害了！答对了！",
      explanation: level.explanation || "",
      showShareCard: true,
    });

    this._generateShareImage(level.id, "你敢来挑战吗?", 0);

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
    if (this._answerLocked) return;
    this._answerLocked = true;
    audioManager.playWrong();
    levelManager.recordWrongAnswer();

    const level = this.data.level;
    if (!level) return;
    this.setData({
      answered: true,
      isCorrect: false,
      funnyComment: level.funnyComment || "哈哈答错了！",
      explanation: level.explanation || "",
      showShareCard: true,
    });

    this._generateShareImage(level.id, "这题你能过吗?", 1);
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
    if (!this.data.showShareCard) return;
    this.setData({ showShareCard: false });

    if (this.data.isCorrect) {
      // Auto advance to next level
      this._loadLevel(this.data.levelId + 1);
    } else {
      // Clean up before retry
      sensorManager.stopAll();
      this._clearColorInterval();
      // Reset for retry
      this._answerLocked = false;
      this.setData({
        answered: false,
        isCorrect: false,
      });
      // Re-setup interactive if needed
      if (this.data.level && this.data.level.type === "interactive") {
        this._setupInteractive(this.data.level);
      }
    }
  },

  /**
   * Handle input answer (input_answer interactive)
   */
  onInputAnswer(e) {
    this._inputValue = e.detail.value;
    this.setData({ inputValue: e.detail.value });
  },

  /**
   * Confirm input answer
   */
  onConfirmAnswer() {
    if (this.data.answered) return;
    const level = this.data.level;
    if (!level || !level.interaction) return;
    const correct =
      this._inputValue &&
      this._inputValue.trim() === String(level.interaction.correctAnswer);
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
    this._clearColorInterval();
    const colors = ["#FF4757", "#2ED573", "#FFD700", "#4A90D9", "#FF6B81"];
    let index = 0;
    this._colorTimer = setInterval(() => {
      index = (index + 1) % colors.length;
      this.setData({ colorBtnColor: colors[index] });
    }, 800);
  },

  _clearColorInterval() {
    if (this._colorTimer) {
      clearInterval(this._colorTimer);
      this._colorTimer = null;
    }
  },

  /**
   * Generate dynamic share image via Canvas
   */
  _generateShareImage(levelId, bottomText, themeIndex) {
    shareImage
      .getCanvas(this)
      .then((canvas) =>
        shareImage.generate(canvas, {
          bigText: `${levelId}`,
          bigLabel: "关",
          bottomText,
          themeIndex,
        }),
      )
      .then((path) => {
        this._shareImagePath = path;
      })
      .catch((err) => {
        console.error("Generate share image failed:", err);
      });
  },
});
