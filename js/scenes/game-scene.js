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
    this._progressBarY = this._topBarHeight + 6;
    this._questionCardY = Math.floor(this.height * 0.10);
    // Interaction area starts in the middle-lower part of the screen (thumb-friendly)
    this._interactionY = Math.floor(this.height * 0.38);
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

    // Back button (top-left, smaller)
    this.backBtn = new Button({
      x: 30,
      y: this._topBarHeight / 2,
      width: 40,
      height: 32,
      text: "←",
      bg: "transparent",
      color: COLORS.text,
      fontSize: 20,
      radius: 8,
      onTap: () => {
        audioManager.playClick();
        this.sceneManager.switchTo("home");
      },
    });
    this.buttons.push(this.backBtn);

    // Hint button (top-right, pill style) only if level has hint
    if (level.hint) {
      this.hintBtn = new Button({
        x: this.width - 40,
        y: this._topBarHeight / 2,
        width: 54,
        height: 28,
        text: "提示",
        bg: COLORS.primary,
        color: COLORS.white,
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

    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height, "#FFF8E1", "#FFF3E0");

    // Decorative background circles for visual personality
    this._renderDecorations();

    this._renderTopBar();
    this._renderProgressBar();
    this._renderQuestionCard();
    this._renderInteractionArea();

    // Hint overlay
    if (this._hintVisible) {
      this._renderHintOverlay();
    }

    // Result overlay
    if (this._showResult) {
      this._renderResultOverlay();
    }
  }

  /**
   * Draw translucent decorative circles in the background for visual personality
   */
  _renderDecorations() {
    const { ctx, width, height } = this;
    ctx.save();

    // Semi-transparent decorative circles at fixed positions (seeded by levelId)
    const decorations = [
      { x: width * 0.1, y: height * 0.15, r: 35, color: "rgba(255, 215, 0, 0.08)" },
      { x: width * 0.85, y: height * 0.08, r: 25, color: "rgba(74, 144, 217, 0.06)" },
      { x: width * 0.92, y: height * 0.55, r: 45, color: "rgba(255, 159, 67, 0.07)" },
      { x: width * 0.08, y: height * 0.75, r: 30, color: "rgba(165, 94, 234, 0.06)" },
    ];

    for (const d of decorations) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render the top bar: level number, progress count, back button, hint button
   */
  _renderTopBar() {
    const { ctx, width, level } = this;
    const barH = this._topBarHeight;
    const progress = levelManager.getProgress();
    const cx = width / 2;
    const cy = barH / 2;

    // Level badge: gold pill with white text (centered)
    const badgeText = `第${this.levelId}关`;
    ctx.save();
    ctx.font = "bold 15px sans-serif";
    const badgeW = ctx.measureText(badgeText).width + 28;
    const badgeH = 28;
    const badgeX = cx - badgeW / 2;
    const badgeY = cy - badgeH / 2;

    // Pill background (gold gradient)
    const pillGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
    pillGrad.addColorStop(0, "#FFD700");
    pillGrad.addColorStop(1, "#FFA500");
    ctx.fillStyle = pillGrad;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();

    // Badge text
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, cx, cy);
    ctx.restore();

    // Progress count (right side, small)
    const countX = this.hintBtn ? width - 90 : width - 24;
    drawText(ctx, `${progress.current}/${progress.total}`, countX, cy, {
      fontSize: 12,
      color: COLORS.textMuted,
      align: "right",
    });

    // Render back button and hint button
    this.backBtn.render(ctx);
    if (this.hintBtn) {
      this.hintBtn.render(ctx);
    }
  }

  /**
   * Render the progress bar
   */
  _renderProgressBar() {
    const { ctx, width } = this;
    const progress = levelManager.getProgress();
    const barW = width - this._padding * 4;
    const barX = this._padding * 2;

    drawProgressBar(ctx, barX, this._progressBarY, barW, 4, progress.percentage, {
      bgColor: "rgba(0,0,0,0.06)",
      fillColor: COLORS.primary,
    });
  }

  /**
   * Render the question card with word-wrapped text
   */
  _renderQuestionCard() {
    const { ctx, width, level } = this;
    const cardX = this._padding;
    const cardY = this._questionCardY;
    const cardW = width - this._padding * 2;

    // Measure question text height to auto-size card
    ctx.save();
    ctx.font = "bold 22px sans-serif";
    const textMaxW = cardW - 40;
    const questionText = level.question || "";
    const textW = ctx.measureText(questionText).width;
    const lineCount = Math.max(1, Math.ceil(textW / textMaxW));
    ctx.restore();

    const cardH = Math.max(90, lineCount * 33 + 40);

    // Card with shadow
    drawCard(ctx, cardX, cardY, cardW, cardH, { radius: 16 });

    // Gold left accent strip (4px)
    ctx.save();
    const accentW = 4;
    const accentR = 16;
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(cardX + accentR, cardY);
    ctx.arcTo(cardX, cardY, cardX, cardY + cardH, accentR);
    ctx.arcTo(cardX, cardY + cardH, cardX + accentW + accentR, cardY + cardH, accentR);
    ctx.lineTo(cardX + accentW, cardY + cardH);
    ctx.lineTo(cardX + accentW, cardY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Question text (word-wrapped, bigger font)
    drawText(ctx, questionText, width / 2 + 2, cardY + cardH / 2, {
      fontSize: 22,
      bold: true,
      color: COLORS.text,
      align: "center",
      maxWidth: textMaxW,
      lineHeight: 1.5,
    });
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
   * Render option buttons (A/B/C/D)
   */
  _renderOptionButtons() {
    const { ctx } = this;
    const correctIdx = this.level.answer;

    for (let i = 0; i < this.optionButtons.length; i++) {
      const btn = this.optionButtons[i];
      const accentColor = this._optionAccentColors[i] || "#4A90D9";

      // Update colors based on answer state
      if (this._answered) {
        if (i === correctIdx) {
          btn.bg = COLORS.green;
          btn.color = COLORS.white;
        } else if (i === this._selectedOption && !this._isCorrect) {
          btn.bg = COLORS.red;
          btn.color = COLORS.white;
        } else {
          // Fade out non-selected, non-correct options
          btn.bg = COLORS.white;
          btn.color = COLORS.textMuted;
        }
      }

      // Render the base button
      btn.render(ctx);

      // Draw colored left accent strip (4px) on top of the button
      if (!this._answered || i === correctIdx || i === this._selectedOption) {
        ctx.save();
        const stripW = 4;
        const bx = btn.left;
        const by = btn.top;
        const bh = btn.height;
        const br = btn.radius;

        ctx.fillStyle = this._answered && i === correctIdx ? COLORS.green
          : this._answered && i === this._selectedOption ? COLORS.red
          : accentColor;

        ctx.beginPath();
        ctx.moveTo(bx + br, by);
        ctx.arcTo(bx, by, bx, by + bh, br);
        ctx.arcTo(bx, by + bh, bx + stripW + br, by + bh, br);
        ctx.lineTo(bx + stripW, by + bh);
        ctx.lineTo(bx + stripW, by);
        ctx.closePath();
        ctx.fill();
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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
      color: COLORS.textLight,
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

    // Emoji
    drawText(ctx, this._resultEmoji, width / 2, cardY + 50, {
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
      color: COLORS.textLight,
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

    audioManager.playCorrect();
    levelManager.completeLevel(this.levelId);

    // Stop sensors and timers
    sensorManager.stopAll();
    this._clearColorWaitTimer();

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
