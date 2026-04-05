/**
 * Mini game entry point
 * Sets up canvas, initializes systems, and starts the game loop
 */

const SceneManager = require("./js/base/scene-manager");
const { createCanvas } = require("./js/base/canvas-adapter");
const audioManager = require("./js/utils/audio-manager");
const storage = require("./js/utils/storage");

// Create and configure the main canvas
const { canvas, ctx, width, height, dpr } = createCanvas();

// Initialize audio
const settings = storage.getSettings();
audioManager.init();
audioManager.setEnabled(settings.soundEnabled);

// Initialize scene manager
const sceneManager = new SceneManager(ctx, canvas, width, height);

// Register scenes (lazy-loaded)
sceneManager.register("home", () => require("./js/scenes/home-scene"));
sceneManager.register("game", () => require("./js/scenes/game-scene"));
sceneManager.register("result", () => require("./js/scenes/result-scene"));

// Start with home scene
sceneManager.switchTo("home");

// Touch event routing
wx.onTouchStart((e) => {
  const touch = e.touches[0];
  if (touch) sceneManager.onTouchStart(touch.clientX, touch.clientY, e);
});

wx.onTouchMove((e) => {
  const touch = e.touches[0];
  if (touch) sceneManager.onTouchMove(touch.clientX, touch.clientY, e);
});

wx.onTouchEnd((e) => {
  const touch = e.changedTouches[0];
  if (touch) sceneManager.onTouchEnd(touch.clientX, touch.clientY, e);
});

// Game loop
const loop = () => {
  sceneManager.render();
  requestAnimationFrame(loop);
};
loop();

// Share support
wx.showShareMenu({ withShareTicket: true });
wx.onShareAppMessage(() => {
  return {
    title: "你能过几关？来挑战你的脑洞！",
    imageUrl: "",
  };
});
