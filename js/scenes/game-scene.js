/**
 * Core game scene: renders all 80 levels of the brain teaser quiz game.
 * Handles riddle, trivia, text_trap, and interactive level types on Canvas 2D.
 */

const {
  COLORS,
  Button,
  drawText,
  drawProgressBar,
  drawBackground,
  drawCard,
  roundRect,
} = require("../ui/components");
const levelManager = require("../utils/level-manager");
const storage = require("../utils/storage");
const adManager = require("../utils/ad-manager");
const audioManager = require("../utils/audio-manager");
const sensorManager = require("../utils/sensor-manager");

// Label prefixes for option buttons
const OPTION_LABELS = ["A", "B", "C", "D"];

// Color cycle for color_wait interactive
const COLOR_WAIT_COLORS = ["#FF4757", "#2ED573", "#FFD700", "#4A90D9", "#FF6B81"];
const COLOR_WAIT_TARGET = "#4A90D9"; // blue
const COLOR_WAIT_INTERVAL = 800;

class GameScene {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLCanvasElement} canvas
   * @param {number} width - Logical screen width
   * @param {number} height - Logical screen height
   * @param {{ switchTo: (name: string, params?: object) => void }} sceneManager
   */
  constructor(ctx, canvas, width, height, sceneManager) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.sceneManager = sceneManager;

    // Current level data
    this.level = null;
    this.levelId = 1;

    // Answer state
    this._answerLocked = false;
    this._answered = false;
    this._isCorrect = false;
    this._selectedOption = -1;

    // Buttons
    this.optionButtons = [];
    this.hintBtn = null;
    this.resultBtn = null;
    this.backBtn = null;
    this.buttons = [];

    // Hint state
    this._hintVisible = false;
    this._hintText = "";

    // Result overlay state
    this._showResult = false;
    this._resultEmoji = "";
    this._resultComment = "";
    this._resultExplanation = "";

    // Interactive state
    this._interactiveState = {};
    this._colorWaitTimer = null;

    // Touch tracking for drag/swipe/pinch/scratch
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;
    this._dragOffsetX = 0;
    this._dragOffsetY = 0;
    this._isDragging = false;

    // Scratch state
    this._scratchGrid = null;
    this._scratchPercent = 0;

    // Pinch state
    this._pinchStartDist = 0;
    this._pinchScale = 1;

    // Char grid for text_trap
    this._charCells = [];

    // Lights puzzle state
    this._lightsGrid = [];

    // Sequence tap state
    this._sequenceIndex = 0;
    this._sequenceButtons = [];

    // Color wait state
    this._colorIndex = 0;
    this._colorBtn = null;

    // Layout constants
    this._padding = 20;
    this._topBarHeight = 48;
    this._progressBarY = 0;
    this._questionCardY = 0;
    this._interactionY = 0;

    // Option border accent colors: A=blue, B=green, C=orange, D=purple
    this._optionAccentColors = ["#4A90D9", "#2ED573", "#FF9F43", "#A55EEA"];

    // --- Engagement mechanics ---

    // 1. Countdown timer (10s per question)
    this._timerMax = 10;
    this._timer = 10;
    this._timerStartTime = null; // null = timer not running

    // 2. Combo system
    this._combo = 0;
    this._comboShowTime = 0;

    // 3. Star rating
    this._stars = 0;

    // 4. Particle effects
    this._particles = [];

    // 5. Screen shake
    this._shakeTime = 0;

    // 6. Milestone celebration
    this._milestone = false;
    this._milestoneTime = 0;
    this._milestoneParticlesSpawned = false;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Enter the scene with given params
   * @param {{ level: number }} params
   */
  onEnter(params = {}) {
    this.levelId = params.level || 1;
    this._loadLevel(this.levelId);
  }

  /**
   * Cleanup on leaving: stop sensors, clear timers
   */
  onLeave() {
    sensorManager.stopAll();
    this._clearColorWaitTimer();
    this.buttons = [];
    this.optionButtons = [];
    this._sequenceButtons = [];
    this._charCells = [];
    this._lightsGrid = [];
    this._scratchGrid = null;
  }

  // ---------------------------------------------------------------------------
  // Level loading
  // ---------------------------------------------------------------------------

  /**
   * Load a level by id and reset all state
   * @param {number} id
   */
  _loadLevel(id) {
    sensorManager.stopAll();
    this._clearColorWaitTimer();

    this.levelId = id;
    this.level = levelManager.getLevel(id);

    if (!this.level) {
      // No more levels, go to result
      this.sceneManager.switchTo("result");
      return;
    }

    // Reset answer state
    this._answerLocked = false;
    this._answered = false;
    this._isCorrect = false;
    this._selectedOption = -1;
    this._showResult = false;
    this._hintVisible = false;
    this._hintText = "";

    // Reset interactive state
    this._interactiveState = {};
    this._dragOffsetX = 0;
    this._dragOffsetY = 0;
    this._isDragging = false;
    this._scratchGrid = null;
    this._scratchPercent = 0;
    this._pinchStartDist = 0;
    this._pinchScale = 1;
    this._sequenceIndex = 0;
    this._colorIndex = 0;

    // Reset engagement state (combo persists across levels)
    this._stars = 0;
    this._milestone = false;
    this._milestoneTime = 0;
    this._milestoneParticlesSpawned = false;
    // Don't reset this._combo here — it persists

    // Start countdown timer only for timed level types
    const timedTypes = ["riddle", "trivia", "text_trap"];
    const method = this.level.interaction && this.level.interaction.method;
    const isTrickChoice = this.level.type === "interactive" && method === "trick_choice";
    if (timedTypes.includes(this.level.type) || isTrickChoice) {
      this._timer = this._timerMax;
      this._timerStartTime = Date.now();
    } else {
      this._timer = this._timerMax;
      this._timerStartTime = null; // no timer for interactive levels
    }

    // Compute layout
    this._computeLayout();

    // Build UI elements for this level type
    this._buildUI();

    // Setup interactive sensors if needed
    this._setupInteractive();

    this.render();
  }

  /**
   * Compute vertical layout positions
   */
  _computeLayout() {
    this._questionCardY = Math.floor(this.height * 0.12);
    // Will be recalculated dynamically in _renderQuestionCard based on actual card height
    this._interactionY = Math.floor(this.height * 0.28);
  }

  // ---------------------------------------------------------------------------
  // UI building
  // ---------------------------------------------------------------------------

  /**
   * Build buttons and interactive elements for current level
   */
  _buildUI() {
    this.buttons = [];
    this.optionButtons = [];
    this._sequenceButtons = [];
    this._charCells = [];
    this._lightsGrid = [];
    this._colorBtn = null;

    const cx = this.width / 2;
    const level = this.level;

    // Back button (top-left, white on dark bg)
    this.backBtn = new Button({
      x: 30,
      y: this._topBarHeight / 2 + 4,
      width: 40,
      height: 32,
      text: "←",
      bg: "transparent",
      color: "#FFFFFF",
      fontSize: 22,
      radius: 8,
      onTap: () => {
        audioManager.playClick();
        this.sceneManager.switchTo("home");
      },
    });
    this.buttons.push(this.backBtn);

    // Hint button (top-right, semi-transparent white pill)
    if (level.hint) {
      this.hintBtn = new Button({
        x: this.width - 42,
        y: this._topBarHeight / 2 + 4,
        width: 58,
        height: 28,
        text: "💡提示",
        bg: "rgba(255,255,255,0.2)",
        color: "#FFFFFF",
        fontSize: 13,
        radius: 14,
        onTap: () => this._onHintTap(),
      });
      this.buttons.push(this.hintBtn);
    } else {
      this.hintBtn = null;
    }

    // Build type-specific UI
    const type = level.type;
    const method = level.interaction && level.interaction.method;

    if (type === "riddle" || type === "trivia") {
      this._buildOptionButtons(level.options, level.answer);
    } else if (type === "text_trap") {
      this._buildCharGrid(level.displayText, level.interaction.correctIndex);
    } else if (type === "interactive") {
      this._buildInteractiveUI(method);
    }
  }

  /**
   * Build A/B/C/D option buttons
   * @param {string[]} options
   * @param {number} correctIndex
   */
  _buildOptionButtons(options, correctIndex) {
    if (!options) return;
    const cx = this.width / 2;
    const btnW = this.width - this._padding * 3;
    const btnH = 56;
    const gap = 12;
    let startY = this._interactionY + 16;

    this.optionButtons = options.map((text, i) => {
      const btn = new Button({
        x: cx,
        y: startY + i * (btnH + gap),
        width: btnW,
        height: btnH,
        text: `${OPTION_LABELS[i]}. ${text}`,
        bg: COLORS.white,
        color: COLORS.text,
        fontSize: 19,
        radius: 14,
        onTap: () => this._onOptionTap(i, correctIndex),
      });
      // Store accent color index for custom rendering
      btn._accentIndex = i;
      this.buttons.push(btn);
      return btn;
    });
  }

  /**
   * Build character grid for text_trap levels
   * @param {string} displayText
   * @param {number} correctIndex
   */
  _buildCharGrid(displayText, correctIndex) {
    if (!displayText) return;
    const chars = displayText.split("");
    const cols = Math.min(chars.length, 10);
    const cellSize = Math.min((this.width - this._padding * 4) / cols, 48);
    const gridW = cols * cellSize;
    const startX = (this.width - gridW) / 2;
    let startY = this._interactionY + 20;

    this._charCells = chars.map((ch, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      return {
        char: ch,
        index: i,
        x: startX + col * cellSize,
        y: startY + row * cellSize,
        size: cellSize,
        isCorrect: i === correctIndex,
        tapped: false,
      };
    });
  }

  /**
   * Build UI elements for interactive levels based on method
   * @param {string} method
   */
  _buildInteractiveUI(method) {
    const cx = this.width / 2;
    const level = this.level;
    const interaction = level.interaction || {};

    switch (method) {
      case "sequence_tap":
        this._buildSequenceButtons(interaction.steps || []);
        break;

      case "trick_choice":
        this._buildOptionButtons(
          interaction.options || level.options || [],
          typeof interaction.answer === "number" ? interaction.answer : 0
        );
        break;

      case "lights_puzzle":
        this._buildLightsGrid(interaction.gridSize || 3);
        break;

      case "color_wait":
        this._buildColorWaitButton();
        break;

      case "input_answer":
        this._buildInputAnswerButton();
        break;

      // sensor-based and touch-based methods need no extra buttons
      // shake, tilt, flip, scratch, drag_text, drag_element, swipe,
      // tap_text, pinch_zoom, multi_touch are handled via rendering + touch events
      default:
        break;
    }
  }

  /**
   * Build sequence tap buttons (e.g., ["open door", "put in", "close door"])
   * @param {string[]} steps
   */
  _buildSequenceButtons(steps) {
    this._sequenceIndex = 0;
    const cx = this.width / 2;
    const btnW = this.width * 0.5;
    const btnH = 44;
    const gap = 14;
    // Shuffle display order so it's a challenge
    const shuffled = steps
      .map((text, origIndex) => ({ text, origIndex }))
      .sort(() => Math.random() - 0.5);

    const startY = this._interactionY + 30;

    this._sequenceButtons = shuffled.map((item, i) => {
      const btn = new Button({
        x: cx,
        y: startY + i * (btnH + gap),
        width: btnW,
        height: btnH,
        text: item.text,
        bg: COLORS.white,
        color: COLORS.text,
        fontSize: 16,
        radius: 12,
        onTap: () => this._onSequenceTap(item.origIndex, btn),
      });
      this.buttons.push(btn);
      return btn;
    });
  }

  /**
   * Build lights puzzle grid
   * @param {number} gridSize
   */
  _buildLightsGrid(gridSize) {
    this._lightsGrid = [];
    const cellSize = Math.min((this.width - this._padding * 6) / gridSize, 60);
    const gridW = gridSize * cellSize;
    const startX = (this.width - gridW) / 2;
    const startY = this._interactionY + 30;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        this._lightsGrid.push({
          row: r,
          col: c,
          x: startX + c * cellSize,
          y: startY + r * cellSize,
          size: cellSize,
          on: true, // all lights start ON
        });
      }
    }
    this._interactiveState.gridSize = gridSize;
  }

  /**
   * Build the color-cycling button for color_wait
   */
  _buildColorWaitButton() {
    this._colorIndex = 0;
    const cx = this.width / 2;
    const btnY = this._interactionY + 80;
    const radius = 50;

    this._colorBtn = {
      x: cx,
      y: btnY,
      radius,
      color: COLOR_WAIT_COLORS[0],
    };

    // Start color cycling
    this._colorWaitTimer = setInterval(() => {
      this._colorIndex = (this._colorIndex + 1) % COLOR_WAIT_COLORS.length;
      this._colorBtn.color = COLOR_WAIT_COLORS[this._colorIndex];
      this.render();
    }, COLOR_WAIT_INTERVAL);
  }

  /**
   * Build "input answer" button that triggers wx.showModal
   */
  _buildInputAnswerButton() {
    const cx = this.width / 2;
    const btnY = this._interactionY + 80;

    const btn = new Button({
      x: cx,
      y: btnY,
      width: 180,
      height: 50,
      text: "输入答案",
      bg: COLORS.primary,
      color: COLORS.text,
      fontSize: 18,
      radius: 12,
      onTap: () => this._onInputAnswer(),
    });
    this.buttons.push(btn);
  }

  // ---------------------------------------------------------------------------
  // Interactive setup (sensors)
  // ---------------------------------------------------------------------------

  /**
   * Setup sensor listeners for interactive levels
   */
  _setupInteractive() {
    const level = this.level;
    if (!level || level.type !== "interactive") return;
    const method = level.interaction && level.interaction.method;
    if (!method) return;

    switch (method) {
      case "shake":
        sensorManager.detectShake(
          () => this._handleCorrect(),
          level.interaction.threshold || 15
        );
        break;

      case "tilt":
        sensorManager.detectTilt(
          () => this._handleCorrect(),
          level.interaction.axis || "x",
          level.interaction.threshold || 30
        );
        break;

      case "flip":
        sensorManager.detectFlip(() => this._handleCorrect());
        break;

      case "scratch":
        this._initScratchOverlay();
        break;

      // touch-based methods don't need sensor setup
      default:
        break;
    }
  }

  /**
   * Initialize scratch overlay grid
   */
  _initScratchOverlay() {
    const cols = 10;
    const rows = 8;
    this._scratchGrid = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this._scratchGrid.push({ row: r, col: c, scratched: false });
      }
    }
    this._scratchPercent = 0;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /**
   * Main render loop - draws the entire scene
   */
  render() {
    const { ctx, width, height, level } = this;
    if (!level) return;

    // Update countdown timer
    if (this._timerStartTime !== null) {
      this._timer = Math.max(0, this._timerMax - (Date.now() - this._timerStartTime) / 1000);
      // Auto-fail when time runs out
      if (this._timer <= 0 && !this._answered && !this._showResult) {
        this._timerStartTime = null;
        this._handleWrong();
        return; // _handleWrong will call render via _showResultOverlay
      }
    }

    // Screen shake effect (applied via save/restore)
    let shakeActive = false;
    if (this._shakeTime > 0) {
      const elapsed = Date.now() - this._shakeTime;
      if (elapsed < 300) {
        shakeActive = true;
        const decay = 1 - elapsed / 300;
        const shakeX = (Math.random() - 0.5) * 6 * decay;
        const shakeY = (Math.random() - 0.5) * 6 * decay;
        ctx.save();
        ctx.translate(shakeX, shakeY);
      } else {
        this._shakeTime = 0;
      }
    }

    ctx.clearRect(0, 0, width, height);
    this._renderBackground();
    this._renderTopBar();
    this._renderQuestionCard();
    this._renderInteractionArea();

    // Combo display (before overlays)
    if (this._combo >= 2) {
      this._renderCombo();
    }

    if (this._hintVisible) {
      this._renderHintOverlay();
    }
    if (this._showResult) {
      this._renderResultOverlay();
    }

    // Milestone celebration overlay
    if (this._milestone) {
      this._renderMilestone();
    }

    // Restore shake transform
    if (shakeActive) {
      ctx.restore();
    }

    // Particles render on top of everything (after restore so they don't shake)
    this._updateAndRenderParticles();
  }

  /**
   * Rich gradient background with floating decorative shapes
   */
  _renderBackground() {
    const { ctx, width, height } = this;

    // Deep blue-purple gradient
    const bg = ctx.createLinearGradient(0, 0, width * 0.3, height);
    bg.addColorStop(0, "#667eea");
    bg.addColorStop(0.5, "#5c6bc0");
    bg.addColorStop(1, "#764ba2");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Floating decorative blobs
    ctx.save();
    const blobs = [
      { x: width * 0.15, y: height * 0.08, r: 60, c: "rgba(255,255,255,0.06)" },
      { x: width * 0.88, y: height * 0.15, r: 40, c: "rgba(255,255,255,0.05)" },
      { x: width * 0.75, y: height * 0.85, r: 70, c: "rgba(255,255,255,0.04)" },
      { x: width * 0.1, y: height * 0.65, r: 50, c: "rgba(255,255,255,0.05)" },
      { x: width * 0.5, y: height * 0.92, r: 35, c: "rgba(255,215,0,0.08)" },
    ];
    for (const b of blobs) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.c;
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Top bar: back button, level badge, progress, hint
   */
  _renderTopBar() {
    const { ctx, width } = this;
    const cy = this._topBarHeight / 2 + 4;
    const progress = levelManager.getProgress();

    // Back button
    this.backBtn.render(ctx);

    // Level badge - white rounded pill
    const badgeText = `第 ${this.levelId} 关`;
    ctx.save();
    ctx.font = "bold 14px sans-serif";
    const badgeW = ctx.measureText(badgeText).width + 24;
    const badgeH = 26;
    const badgeX = width / 2 - badgeW / 2;
    const badgeY = cy - badgeH / 2;

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, width / 2, cy);
    ctx.restore();

    // Countdown timer ring around badge
    if (this._timerStartTime !== null) {
      const ringCx = width / 2;
      const ringCy = cy;
      const ringR = badgeH / 2 + 6;
      const fraction = this._timer / this._timerMax;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * fraction;

      // Color: green > 5s, yellow 3-5s, red < 3s
      let ringColor = "#2ED573";
      if (this._timer <= 3) ringColor = "#FF4757";
      else if (this._timer <= 5) ringColor = "#FFD700";

      ctx.save();
      ctx.beginPath();
      ctx.arc(ringCx, ringCy, ringR, startAngle, endAngle);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();

      // Timer seconds text (right of badge)
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = ringColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.ceil(this._timer) + "", width / 2 + badgeW / 2 + 10, cy);
      ctx.restore();
    }

    // Progress
    const progText = `${progress.current}/${progress.total}`;
    const progX = this.hintBtn ? width - 90 : width - 24;
    drawText(ctx, progText, progX, cy, {
      fontSize: 12,
      color: "rgba(255,255,255,0.6)",
      align: "right",
    });

    if (this.hintBtn) this.hintBtn.render(ctx);
  }

  /**
   * Question card: frosted glass style with big text
   */
  _renderQuestionCard() {
    const { ctx, width, level } = this;
    const cardX = this._padding + 4;
    const cardY = this._questionCardY;
    const cardW = width - (this._padding + 4) * 2;
    const questionText = level.question || "";

    // Measure text for auto-height
    ctx.save();
    ctx.font = "bold 20px sans-serif";
    const textMaxW = cardW - 40;
    const textW = ctx.measureText(questionText).width;
    const lineCount = Math.max(1, Math.ceil(textW / textMaxW));
    ctx.restore();
    const cardH = Math.max(80, lineCount * 30 + 50);

    // Frosted glass card
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.restore();

    // Question text
    drawText(ctx, questionText, width / 2, cardY + cardH / 2, {
      fontSize: 20,
      bold: true,
      color: "#2D3436",
      align: "center",
      maxWidth: textMaxW,
      lineHeight: 1.5,
    });

    // Dynamically set interaction area right below the question card
    this._interactionY = cardY + cardH + 10;
  }

  /**
   * Render the interaction area below the question card
   */
  _renderInteractionArea() {
    const { ctx, level } = this;
    if (!level) return;

    const type = level.type;
    const method = level.interaction && level.interaction.method;

    if (type === "riddle" || type === "trivia") {
      this._renderOptionButtons();
    } else if (type === "text_trap") {
      this._renderCharGrid();
    } else if (type === "interactive") {
      this._renderInteractiveMethod(method);
    }
  }

  /**
   * Render option buttons with colored label circles (no left border)
   */
  _renderOptionButtons() {
    const { ctx } = this;
    const correctIdx = this.level.answer;
    const labelColors = this._optionAccentColors;

    for (let i = 0; i < this.optionButtons.length; i++) {
      const btn = this.optionButtons[i];
      const labelColor = labelColors[i] || "#4A90D9";

      // Set colors based on answer state
      if (this._answered) {
        if (i === correctIdx) {
          btn.bg = "#2ED573";
          btn.color = "#FFFFFF";
        } else if (i === this._selectedOption && !this._isCorrect) {
          btn.bg = "#FF4757";
          btn.color = "#FFFFFF";
        } else {
          btn.bg = "rgba(255,255,255,0.3)";
          btn.color = "rgba(255,255,255,0.5)";
        }
      } else {
        btn.bg = "rgba(255,255,255,0.88)";
        btn.color = "#2D3436";
      }

      btn.render(ctx);

      // Draw colored label circle (A/B/C/D) on the left side of button
      if (!this._answered || i === correctIdx || i === this._selectedOption) {
        ctx.save();
        const circleR = 14;
        const circleX = btn.left + 24;
        const circleY = btn.y;

        const cColor = this._answered && i === correctIdx ? "#FFFFFF"
          : this._answered && i === this._selectedOption ? "#FFFFFF"
          : labelColor;

        ctx.beginPath();
        ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
        ctx.fillStyle = this._answered ? "rgba(255,255,255,0.3)" : cColor;
        ctx.fill();

        ctx.fillStyle = this._answered ? "#FFFFFF" : "#FFFFFF";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(OPTION_LABELS[i], circleX, circleY);
        ctx.restore();
      }
    }
  }

  /**
   * Render text_trap character grid
   */
  _renderCharGrid() {
    const { ctx } = this;

    for (const cell of this._charCells) {
      // Background
      ctx.save();
      const isHighlighted =
        this._answered && cell.isCorrect;
      const isWrongTap =
        this._answered && cell.tapped && !cell.isCorrect;

      ctx.fillStyle = isHighlighted
        ? COLORS.green
        : isWrongTap
          ? COLORS.red
          : COLORS.white;

      roundRect(ctx, cell.x + 2, cell.y + 2, cell.size - 4, cell.size - 4, 8);
      ctx.fill();

      // Border
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      roundRect(ctx, cell.x + 2, cell.y + 2, cell.size - 4, cell.size - 4, 8);
      ctx.stroke();

      // Character
      ctx.fillStyle =
        isHighlighted || isWrongTap ? COLORS.white : COLORS.text;
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cell.char, cell.x + cell.size / 2, cell.y + cell.size / 2);
      ctx.restore();
    }
  }

  /**
   * Render interactive method-specific content
   * @param {string} method
   */
  _renderInteractiveMethod(method) {
    switch (method) {
      case "shake":
      case "tilt":
      case "flip":
        this._renderSensorInstruction();
        break;
      case "color_wait":
        this._renderColorWait();
        break;
      case "lights_puzzle":
        this._renderLightsGrid();
        break;
      case "sequence_tap":
        this._renderSequenceButtons();
        break;
      case "trick_choice":
        this._renderOptionButtons();
        break;
      case "scratch":
        this._renderScratchOverlay();
        break;
      case "drag_text":
      case "drag_element":
        this._renderDraggable();
        break;
      case "swipe":
        this._renderSwipeInstruction();
        break;
      case "tap_text":
        this._renderTapText();
        break;
      case "input_answer":
        this._renderInputAnswer();
        break;
      case "pinch_zoom":
        this._renderPinchZoom();
        break;
      case "multi_touch":
        this._renderMultiTouchInstruction();
        break;
      default:
        break;
    }
  }

  /**
   * Render instruction text for sensor-based interactions
   */
  _renderSensorInstruction() {
    const { ctx, width, level } = this;
    const method = level.interaction.method;
    const y = this._interactionY + 60;

    const icons = { shake: "📱", tilt: "📐", flip: "🔄" };
    const texts = {
      shake: "摇晃手机",
      tilt: "倾斜手机",
      flip: "翻转手机",
    };

    drawText(ctx, icons[method] || "📱", width / 2, y, {
      fontSize: 48,
      align: "center",
    });

    drawText(ctx, texts[method] || level.hint || "操作你的手机", width / 2, y + 50, {
      fontSize: 16,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });
  }

  /**
   * Render the color wait button
   */
  _renderColorWait() {
    const { ctx, width } = this;
    const btn = this._colorBtn;
    if (!btn) return;

    drawText(ctx, "颜色变蓝时点击", width / 2, this._interactionY + 20, {
      fontSize: 15,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });

    // Draw circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
    ctx.fillStyle = btn.color;
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fill();
    ctx.restore();

    // Render all standard buttons (like input_answer button)
    for (const b of this.buttons) {
      if (b !== this.backBtn && b !== this.hintBtn) {
        b.render(ctx);
      }
    }
  }

  /**
   * Render lights puzzle grid
   */
  _renderLightsGrid() {
    const { ctx } = this;

    drawText(ctx, "点击灯泡，关掉所有灯", this.width / 2, this._interactionY + 10, {
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });

    for (const light of this._lightsGrid) {
      ctx.save();
      const x = light.x + 2;
      const y = light.y + 2;
      const s = light.size - 4;

      roundRect(ctx, x, y, s, s, 8);
      ctx.fillStyle = light.on ? "#FFD700" : "#555555";
      ctx.fill();

      ctx.strokeStyle = light.on ? "#B8960F" : "#333333";
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, s, s, 8);
      ctx.stroke();

      // Bulb emoji
      ctx.font = `${Math.floor(s * 0.5)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(light.on ? "💡" : "🌑", light.x + light.size / 2, light.y + light.size / 2);
      ctx.restore();
    }
  }

  /**
   * Render sequence tap buttons
   */
  _renderSequenceButtons() {
    const { ctx } = this;

    drawText(ctx, `按正确顺序点击 (${this._sequenceIndex}/${(this.level.interaction.steps || []).length})`, this.width / 2, this._interactionY + 10, {
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });

    for (const btn of this._sequenceButtons) {
      btn.render(ctx);
    }
  }

  /**
   * Render scratch overlay
   */
  _renderScratchOverlay() {
    const { ctx, width } = this;
    if (!this._scratchGrid) return;

    const areaX = this._padding * 2;
    const areaY = this._interactionY + 20;
    const areaW = width - this._padding * 4;
    const areaH = 180;
    const cols = 10;
    const rows = 8;
    const cellW = areaW / cols;
    const cellH = areaH / rows;

    // Draw background (hidden content)
    drawCard(ctx, areaX, areaY, areaW, areaH);
    drawText(ctx, "✨ 刮开看答案 ✨", width / 2, areaY + areaH / 2, {
      fontSize: 16,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });

    // Draw overlay cells (un-scratched parts)
    for (const cell of this._scratchGrid) {
      if (!cell.scratched) {
        ctx.save();
        ctx.fillStyle = "#CCCCCC";
        ctx.fillRect(
          areaX + cell.col * cellW,
          areaY + cell.row * cellH,
          cellW,
          cellH
        );
        ctx.restore();
      }
    }

    // Progress text
    drawText(ctx, `已刮 ${Math.floor(this._scratchPercent)}%`, width / 2, areaY + areaH + 20, {
      fontSize: 13,
      color: COLORS.textMuted,
      align: "center",
    });
  }

  /**
   * Render draggable element for drag_text / drag_element
   */
  _renderDraggable() {
    const { ctx, width, level } = this;
    const dragText = level.interaction.dragText || level.question || "拖动我";
    const baseX = width / 2;
    const baseY = this._interactionY + 80;
    const drawX = baseX + this._dragOffsetX;
    const drawY = baseY + this._dragOffsetY;

    drawText(ctx, "👆 拖动下方元素", width / 2, this._interactionY + 20, {
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });

    // Draggable card
    const cardW = 160;
    const cardH = 50;
    drawCard(ctx, drawX - cardW / 2, drawY - cardH / 2, cardW, cardH, {
      bg: COLORS.primary,
    });
    drawText(ctx, dragText, drawX, drawY, {
      fontSize: 16,
      bold: true,
      color: COLORS.text,
      align: "center",
    });

    // Store for hit testing
    this._interactiveState.dragArea = {
      x: drawX - cardW / 2,
      y: drawY - cardH / 2,
      w: cardW,
      h: cardH,
    };
  }

  /**
   * Render swipe instruction
   */
  _renderSwipeInstruction() {
    const { ctx, width, level } = this;
    const direction = level.interaction.direction || "up";
    const arrows = { up: "⬆️", down: "⬇️", left: "⬅️", right: "➡️" };

    drawText(ctx, arrows[direction] || "👆", width / 2, this._interactionY + 60, {
      fontSize: 48,
      align: "center",
    });

    drawText(ctx, `向${this._directionLabel(direction)}滑动`, width / 2, this._interactionY + 110, {
      fontSize: 16,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });
  }

  /**
   * Render tap_text targets
   */
  _renderTapText() {
    const { ctx, width, level } = this;
    const targets = level.interaction.targets || [level.interaction.targetText];
    const targetText = level.interaction.targetText;
    const cx = width / 2;
    const btnW = this.width * 0.5;
    const btnH = 44;
    const gap = 14;
    const startY = this._interactionY + 30;

    // Build tap text buttons if not already done
    if (!this._interactiveState.tapTextBuilt) {
      this._interactiveState.tapTextBuilt = true;
      const items = targets && targets.length > 1 ? targets : [targetText, "其他选项"];
      items.forEach((text, i) => {
        if (!text) return;
        const btn = new Button({
          x: cx,
          y: startY + i * (btnH + gap),
          width: btnW,
          height: btnH,
          text: text,
          bg: COLORS.white,
          color: COLORS.text,
          fontSize: 16,
          radius: 12,
          onTap: () => {
            if (this._answerLocked) return;
            if (text === targetText) {
              this._handleCorrect();
            } else {
              this._handleWrong();
            }
          },
        });
        this.buttons.push(btn);
      });
    }

    for (const btn of this.buttons) {
      if (btn !== this.backBtn && btn !== this.hintBtn) {
        btn.render(ctx);
      }
    }
  }

  /**
   * Render input answer section
   */
  _renderInputAnswer() {
    for (const btn of this.buttons) {
      if (btn !== this.backBtn && btn !== this.hintBtn) {
        btn.render(this.ctx);
      }
    }
  }

  /**
   * Render pinch zoom instruction
   */
  _renderPinchZoom() {
    const { ctx, width } = this;
    const size = 60 * this._pinchScale;

    drawText(ctx, "🔍", width / 2, this._interactionY + 60, {
      fontSize: Math.min(size, 120),
      align: "center",
    });

    drawText(ctx, "双指放大", width / 2, this._interactionY + 120, {
      fontSize: 16,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });
  }

  /**
   * Render multi-touch instruction
   */
  _renderMultiTouchInstruction() {
    const { ctx, width } = this;

    drawText(ctx, "✌️", width / 2, this._interactionY + 60, {
      fontSize: 48,
      align: "center",
    });

    drawText(ctx, "用两根手指同时触摸屏幕", width / 2, this._interactionY + 110, {
      fontSize: 16,
      color: "rgba(255,255,255,0.9)",
      align: "center",
    });
  }

  /**
   * Render hint overlay
   */
  _renderHintOverlay() {
    const { ctx, width, height } = this;

    // Dimmed background
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, width, height);

    // Card
    const cardW = width * 0.75;
    const cardH = 140;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.35;

    drawCard(ctx, cardX, cardY, cardW, cardH);

    drawText(ctx, "💡 提示", width / 2, cardY + 30, {
      fontSize: 18,
      bold: true,
      color: COLORS.text,
      align: "center",
    });

    drawText(ctx, this._hintText, width / 2, cardY + 70, {
      fontSize: 15,
      color: "rgba(255,255,255,0.9)",
      align: "center",
      maxWidth: cardW - 30,
      lineHeight: 1.4,
    });

    // Close button
    drawText(ctx, "点击任意处关闭", width / 2, cardY + cardH + 20, {
      fontSize: 12,
      color: COLORS.textMuted,
      align: "center",
    });
  }

  /**
   * Render result overlay (correct/wrong)
   */
  _renderResultOverlay() {
    const { ctx, width, height } = this;

    // Dimmed background
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, width, height);

    // Card
    const cardW = width * 0.85;
    const cardH = 320;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    drawCard(ctx, cardX, cardY, cardW, cardH);

    // Star rating (above emoji)
    if (this._isCorrect && this._stars > 0) {
      const starStr = "\u2B50".repeat(this._stars) + "\u2606".repeat(3 - this._stars);
      drawText(ctx, starStr, width / 2, cardY + 22, {
        fontSize: 22,
        align: "center",
      });
    }

    // Emoji
    drawText(ctx, this._resultEmoji, width / 2, cardY + 56, {
      fontSize: 52,
      align: "center",
    });

    // Funny comment
    drawText(ctx, this._resultComment, width / 2, cardY + 115, {
      fontSize: 22,
      bold: true,
      color: COLORS.text,
      align: "center",
      maxWidth: cardW - 40,
      lineHeight: 1.5,
    });

    // Explanation
    drawText(ctx, this._resultExplanation, width / 2, cardY + 180, {
      fontSize: 17,
      color: "rgba(255,255,255,0.9)",
      align: "center",
      maxWidth: cardW - 40,
      lineHeight: 1.5,
    });

    // Result action button
    if (this.resultBtn) {
      this.resultBtn.render(ctx);
    }
  }

  // ---------------------------------------------------------------------------
  // Touch handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle touch start
   * @param {number} x
   * @param {number} y
   * @param {TouchEvent} e
   */
  onTouchStart(x, y, e) {
    this._touchStartX = x;
    this._touchStartY = y;
    this._touchStartTime = Date.now();

    // If hint overlay is shown, dismiss it
    if (this._hintVisible) {
      this._hintVisible = false;
      this.render();
      return;
    }

    // If result overlay is shown, only handle result button
    if (this._showResult) {
      if (this.resultBtn && this.resultBtn.hitTest(x, y)) {
        this.resultBtn._pressed = true;
        this.render();
      }
      return;
    }

    // Multi-touch detection
    if (e && e.touches && e.touches.length >= 2) {
      this._handleMultiTouch(e);
      return;
    }

    // Pinch start
    if (e && e.touches && e.touches.length === 2) {
      this._handlePinchStart(e);
      return;
    }

    // Mark button press states
    for (const btn of this.buttons) {
      if (btn.hitTest(x, y)) {
        btn._pressed = true;
      }
    }

    // Drag start detection for drag_text / drag_element
    const method = this.level && this.level.interaction && this.level.interaction.method;
    if (method === "drag_text" || method === "drag_element") {
      const area = this._interactiveState.dragArea;
      if (area && x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h) {
        this._isDragging = true;
      }
    }

    this.render();
  }

  /**
   * Handle touch move
   * @param {number} x
   * @param {number} y
   * @param {TouchEvent} e
   */
  onTouchMove(x, y, e) {
    if (this._answerLocked || this._showResult) return;

    const method = this.level && this.level.interaction && this.level.interaction.method;

    // Drag handling
    if (this._isDragging && (method === "drag_text" || method === "drag_element")) {
      this._dragOffsetX = x - this._touchStartX;
      this._dragOffsetY = y - this._touchStartY;
      this.render();
      return;
    }

    // Scratch handling
    if (method === "scratch" && this._scratchGrid) {
      this._handleScratchMove(x, y);
      return;
    }

    // Pinch handling
    if (method === "pinch_zoom" && e && e.touches && e.touches.length === 2) {
      this._handlePinchMove(e);
      return;
    }
  }

  /**
   * Handle touch end
   * @param {number} x
   * @param {number} y
   * @param {TouchEvent} e
   */
  onTouchEnd(x, y, e) {
    // Result overlay button
    if (this._showResult) {
      if (this.resultBtn && this.resultBtn._pressed && this.resultBtn.hitTest(x, y) && this.resultBtn.onTap) {
        this.resultBtn.onTap();
      }
      if (this.resultBtn) this.resultBtn._pressed = false;
      this.render();
      return;
    }

    // Button taps
    for (const btn of this.buttons) {
      if (btn._pressed && btn.hitTest(x, y) && btn.onTap) {
        btn.onTap();
      }
      btn._pressed = false;
    }

    const method = this.level && this.level.interaction && this.level.interaction.method;

    // Char grid taps (text_trap)
    if (this.level && this.level.type === "text_trap" && !this._answerLocked) {
      this._handleCharTap(x, y);
    }

    // Color wait tap
    if (method === "color_wait" && !this._answerLocked) {
      this._handleColorWaitTap(x, y);
    }

    // Lights puzzle tap
    if (method === "lights_puzzle" && !this._answerLocked) {
      this._handleLightsTap(x, y);
    }

    // Drag end
    if (this._isDragging && (method === "drag_text" || method === "drag_element")) {
      this._isDragging = false;
      const dist = Math.sqrt(this._dragOffsetX ** 2 + this._dragOffsetY ** 2);
      if (dist > 100) {
        this._handleCorrect();
      } else {
        // Snap back
        this._dragOffsetX = 0;
        this._dragOffsetY = 0;
      }
    }

    // Swipe detection
    if (method === "swipe" && !this._answerLocked) {
      this._handleSwipeEnd(x, y);
    }

    this.render();
  }

  // ---------------------------------------------------------------------------
  // Touch-specific handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle character tap for text_trap levels
   * @param {number} x
   * @param {number} y
   */
  _handleCharTap(x, y) {
    for (const cell of this._charCells) {
      if (
        x >= cell.x &&
        x <= cell.x + cell.size &&
        y >= cell.y &&
        y <= cell.y + cell.size
      ) {
        cell.tapped = true;
        if (cell.isCorrect) {
          this._handleCorrect();
        } else {
          this._handleWrong();
        }
        break;
      }
    }
  }

  /**
   * Handle color_wait circle tap
   * @param {number} x
   * @param {number} y
   */
  _handleColorWaitTap(x, y) {
    const btn = this._colorBtn;
    if (!btn) return;

    const dist = Math.sqrt((x - btn.x) ** 2 + (y - btn.y) ** 2);
    if (dist <= btn.radius) {
      if (btn.color === COLOR_WAIT_TARGET) {
        this._handleCorrect();
      } else {
        this._handleWrong();
      }
    }
  }

  /**
   * Handle lights grid tap - toggle tapped light and neighbors
   * @param {number} x
   * @param {number} y
   */
  _handleLightsTap(x, y) {
    const gridSize = this._interactiveState.gridSize || 3;

    for (const light of this._lightsGrid) {
      if (
        x >= light.x &&
        x <= light.x + light.size &&
        y >= light.y &&
        y <= light.y + light.size
      ) {
        audioManager.playClick();
        // Toggle this light and its neighbors
        this._toggleLight(light.row, light.col, gridSize);
        // Check if all lights are off
        const allOff = this._lightsGrid.every((l) => !l.on);
        if (allOff) {
          this._handleCorrect();
        } else {
          this.render();
        }
        break;
      }
    }
  }

  /**
   * Toggle a light and its orthogonal neighbors
   * @param {number} row
   * @param {number} col
   * @param {number} gridSize
   */
  _toggleLight(row, col, gridSize) {
    const targets = [
      [row, col],
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];

    for (const [r, c] of targets) {
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        const light = this._lightsGrid.find((l) => l.row === r && l.col === c);
        if (light) light.on = !light.on;
      }
    }
  }

  /**
   * Handle scratch move - mark cells as scratched
   * @param {number} x
   * @param {number} y
   */
  _handleScratchMove(x, y) {
    if (!this._scratchGrid || this._answerLocked) return;

    const areaX = this._padding * 2;
    const areaY = this._interactionY + 20;
    const areaW = this.width - this._padding * 4;
    const areaH = 180;
    const cols = 10;
    const rows = 8;
    const cellW = areaW / cols;
    const cellH = areaH / rows;

    for (const cell of this._scratchGrid) {
      if (cell.scratched) continue;
      const cx = areaX + cell.col * cellW;
      const cy = areaY + cell.row * cellH;
      if (x >= cx && x <= cx + cellW && y >= cy && y <= cy + cellH) {
        cell.scratched = true;
      }
    }

    const total = this._scratchGrid.length;
    const scratched = this._scratchGrid.filter((c) => c.scratched).length;
    this._scratchPercent = (scratched / total) * 100;

    const threshold = (this.level.interaction && this.level.interaction.threshold) || 60;
    if (this._scratchPercent >= threshold) {
      this._handleCorrect();
    } else {
      this.render();
    }
  }

  /**
   * Handle swipe end - check direction and distance
   * @param {number} x
   * @param {number} y
   */
  _handleSwipeEnd(x, y) {
    const dx = x - this._touchStartX;
    const dy = y - this._touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const threshold = 80;
    const targetDir = this.level.interaction.direction;

    let swipeDir = null;
    if (absDx > absDy && absDx > threshold) {
      swipeDir = dx > 0 ? "right" : "left";
    } else if (absDy > absDx && absDy > threshold) {
      swipeDir = dy > 0 ? "down" : "up";
    }

    if (swipeDir === targetDir) {
      this._handleCorrect();
    } else if (swipeDir) {
      this._handleWrong();
    }
  }

  /**
   * Handle multi-touch (2+ fingers)
   * @param {TouchEvent} e
   */
  _handleMultiTouch(e) {
    if (this._answerLocked) return;
    const method = this.level && this.level.interaction && this.level.interaction.method;

    if (method === "multi_touch" && e.touches.length >= 2) {
      this._handleCorrect();
      return;
    }

    // Start pinch detection for pinch_zoom
    if (method === "pinch_zoom" && e.touches.length === 2) {
      this._handlePinchStart(e);
    }
  }

  /**
   * Record pinch start distance
   * @param {TouchEvent} e
   */
  _handlePinchStart(e) {
    if (e.touches.length < 2) return;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    this._pinchStartDist = Math.sqrt(
      (t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2
    );
  }

  /**
   * Track pinch move and check zoom ratio
   * @param {TouchEvent} e
   */
  _handlePinchMove(e) {
    if (this._answerLocked || e.touches.length < 2 || this._pinchStartDist === 0) return;

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.sqrt(
      (t1.clientX - t2.clientX) ** 2 + (t1.clientY - t2.clientY) ** 2
    );

    this._pinchScale = dist / this._pinchStartDist;

    if (this._pinchScale > 1.8) {
      this._handleCorrect();
    } else {
      this.render();
    }
  }

  // ---------------------------------------------------------------------------
  // Game flow actions
  // ---------------------------------------------------------------------------

  /**
   * Handle option button tap
   * @param {number} index - selected option index
   * @param {number} correctIndex - correct answer index
   */
  _onOptionTap(index, correctIndex) {
    if (this._answerLocked) return;
    this._answerLocked = true;
    this._answered = true;
    this._selectedOption = index;

    if (index === correctIndex) {
      this._isCorrect = true;
      this._handleCorrect();
    } else {
      this._isCorrect = false;
      this._handleWrong();
    }
  }

  /**
   * Handle sequence tap
   * @param {number} origIndex - original step index
   * @param {Button} btn - the tapped button
   */
  _onSequenceTap(origIndex, btn) {
    if (this._answerLocked) return;

    if (origIndex === this._sequenceIndex) {
      // Correct step
      audioManager.playClick();
      btn.bg = COLORS.green;
      btn.color = COLORS.white;
      btn.disabled = true;
      this._sequenceIndex++;

      const totalSteps = (this.level.interaction.steps || []).length;
      if (this._sequenceIndex >= totalSteps) {
        this._handleCorrect();
      } else {
        this.render();
      }
    } else {
      this._handleWrong();
    }
  }

  /**
   * Handle hint button tap - show rewarded video, then reveal hint
   */
  _onHintTap() {
    if (this._answerLocked) return;
    audioManager.playClick();

    adManager.showRewardedVideo((rewarded) => {
      if (rewarded) {
        storage.saveHintUsed(this.levelId);
        storage.updateStats({ totalAdWatched: 1 });
        this._hintText = this.level.hint || "没有提示";
        this._hintVisible = true;
        this.render();
      }
    });
  }

  /**
   * Handle input_answer via wx.showModal
   */
  _onInputAnswer() {
    if (this._answerLocked) return;
    audioManager.playClick();

    const correctAnswer = (this.level.interaction && this.level.interaction.correctAnswer) || "";

    wx.showModal({
      title: "输入答案",
      editable: true,
      placeholderText: "请输入你的答案",
      success: (res) => {
        if (res.confirm && res.content) {
          const input = res.content.trim();
          if (input === correctAnswer.trim()) {
            this._handleCorrect();
          } else {
            this._handleWrong();
          }
        }
      },
    });
  }

  /**
   * Handle correct answer
   */
  _handleCorrect() {
    if (this._answerLocked && this.level.type !== "riddle" && this.level.type !== "trivia") {
      // For interactive levels, lock now
      if (this._showResult) return;
    }
    this._answerLocked = true;
    this._answered = true;
    this._isCorrect = true;

    // Stop countdown timer
    const elapsedSec = this._timerStartTime !== null
      ? (Date.now() - this._timerStartTime) / 1000
      : 999;
    this._timerStartTime = null;

    audioManager.playCorrect();
    levelManager.completeLevel(this.levelId);

    // Stop sensors and timers
    sensorManager.stopAll();
    this._clearColorWaitTimer();

    // Combo system
    this._combo++;
    this._comboShowTime = Date.now();

    // Star rating
    const progress = storage.getProgress ? storage.getProgress() : null;
    const hintUsed = progress && progress.hintUsed ? progress.hintUsed.includes(this.levelId) : false;
    if (this._timerStartTime === null && elapsedSec >= 999) {
      // Interactive level (no timer): stars based on hint
      this._stars = hintUsed ? 2 : 3;
    } else {
      if (elapsedSec <= 4 && !hintUsed) {
        this._stars = 3;
      } else if (elapsedSec <= 7 || hintUsed) {
        this._stars = 2;
      } else {
        this._stars = 1;
      }
    }

    // Particle effects — burst from center
    this._spawnParticles(this.width / 2, this.height / 2, 25, ["#FFD700", "#FF9F43", "#FFEB3B"]);

    // Milestone celebration every 10 levels
    if (this.levelId % 10 === 0) {
      this._milestone = true;
      this._milestoneTime = Date.now();
      this._milestoneParticlesSpawned = false;
    }

    // Show interstitial ad if due
    if (adManager.shouldShowInterstitial(this.levelId)) {
      adManager.showInterstitial();
    }

    this._showResultOverlay(true);
  }

  /**
   * Handle wrong answer
   */
  _handleWrong() {
    if (this._showResult) return;
    this._answerLocked = true;
    this._answered = true;
    this._isCorrect = false;

    // Stop countdown timer
    this._timerStartTime = null;

    // Reset combo
    this._combo = 0;

    // Screen shake
    this._shakeTime = Date.now();

    audioManager.playWrong();
    levelManager.recordWrongAnswer();

    this._showResultOverlay(false);
  }

  /**
   * Show the result overlay card
   * @param {boolean} isCorrect
   */
  _showResultOverlay(isCorrect) {
    this._showResult = true;

    const correctPraises = [
      "厉害了！答对了！👏",
      "没错！你真聪明！🧠",
      "完全正确！太强了！💪",
      "恭喜你，答对了！✨",
      "秒答！大佬！🎯",
    ];

    if (isCorrect) {
      this._resultEmoji = "🎉";
      this._resultComment = correctPraises[Math.floor(Math.random() * correctPraises.length)];
    } else {
      this._resultEmoji = "😅";
      this._resultComment = this.level.funnyComment || "答错了！再想想？";
    }
    this._resultExplanation = this.level.explanation || "";

    const cx = this.width / 2;
    const cardY = (this.height - 320) / 2;
    const btnY = cardY + 270;

    if (isCorrect) {
      // Check if there's a next level
      const nextId = this.levelId + 1;
      const totalLevels = levelManager.getLevelCount();
      const hasNext = nextId <= totalLevels;

      this.resultBtn = new Button({
        x: cx,
        y: btnY,
        width: 180,
        height: 48,
        text: hasNext ? "继续" : "查看成绩",
        bg: COLORS.green,
        color: COLORS.white,
        fontSize: 18,
        radius: 24,
        onTap: () => {
          if (hasNext) {
            this._loadLevel(nextId);
          } else {
            this.sceneManager.switchTo("result");
          }
        },
      });
    } else {
      this.resultBtn = new Button({
        x: cx,
        y: btnY,
        width: 180,
        height: 48,
        text: "再试一次",
        bg: COLORS.primary,
        color: COLORS.text,
        fontSize: 18,
        radius: 24,
        onTap: () => {
          this._loadLevel(this.levelId);
        },
      });
    }

    this.render();
  }

  // ---------------------------------------------------------------------------
  // Engagement mechanics rendering
  // ---------------------------------------------------------------------------

  /**
   * Render combo counter near top of screen
   */
  _renderCombo() {
    const { ctx, width } = this;
    const elapsed = Date.now() - this._comboShowTime;
    // Animated scale: pops up to 1.3 then back to 1.0 over 500ms
    let scale = 1.0;
    if (elapsed < 250) {
      scale = 1.0 + 0.3 * (elapsed / 250);
    } else if (elapsed < 500) {
      scale = 1.3 - 0.3 * ((elapsed - 250) / 250);
    }

    const text = "\uD83D\uDD25 " + this._combo + "\u8FDE\u51FB!";
    const cx = width / 2;
    const cy = this._topBarHeight + 30;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 4;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  /**
   * Spawn particles at a position
   * @param {number} x - center x
   * @param {number} y - center y
   * @param {number} count - number of particles
   * @param {string[]} colors - array of color strings
   */
  _spawnParticles(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this._particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        alpha: 1.0,
      });
    }
  }

  /**
   * Update particle physics and render them
   */
  _updateAndRenderParticles() {
    const { ctx } = this;
    const remaining = [];

    for (const p of this._particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= 0.02;
      p.alpha = Math.max(0, p.life);

      if (p.life > 0) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
        remaining.push(p);
      }
    }

    this._particles = remaining;
  }

  /**
   * Render milestone celebration overlay
   */
  _renderMilestone() {
    const { ctx, width, height } = this;
    const elapsed = Date.now() - this._milestoneTime;

    if (elapsed > 2000) {
      this._milestone = false;
      return;
    }

    // Spawn extra particles once
    if (!this._milestoneParticlesSpawned) {
      this._milestoneParticlesSpawned = true;
      const multiColors = ["#FFD700", "#FF4757", "#2ED573", "#4A90D9", "#FF6B81", "#A55EEA"];
      this._spawnParticles(width / 2, height / 2, 50, multiColors);
    }

    // Animated scale
    let scale = 1.0;
    if (elapsed < 400) {
      scale = 0.5 + 0.7 * (elapsed / 400);
    } else if (elapsed < 600) {
      scale = 1.2 - 0.2 * ((elapsed - 400) / 200);
    }

    const text = "\uD83C\uDF8A \u606D\u559C\u901A\u8FC7 " + this.levelId + " \u5173\uFF01\uD83C\uDF8A";
    const cx = width / 2;
    const cy = height * 0.25;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Clear color_wait interval timer
   */
  _clearColorWaitTimer() {
    if (this._colorWaitTimer) {
      clearInterval(this._colorWaitTimer);
      this._colorWaitTimer = null;
    }
  }

  /**
   * Get Chinese label for a swipe direction
   * @param {string} dir
   * @returns {string}
   */
  _directionLabel(dir) {
    const map = { up: "上", down: "下", left: "左", right: "右" };
    return map[dir] || dir;
  }
}

module.exports = GameScene;
