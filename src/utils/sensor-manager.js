/**
 * Unified sensor management for interactive puzzles
 * Handles accelerometer, gyroscope, and touch-based interactions
 */

let accelerometerCallback = null;
let gyroscopeCallback = null;
let shakeCallback = null;
let lastShakeTime = 0;
let shakeThreshold = 15;

/**
 * Start accelerometer listener
 * @param {Function} callback - receives { x, y, z }
 */
const startAccelerometer = (callback) => {
  accelerometerCallback = callback;
  wx.startAccelerometer({
    interval: "game",
    success: () => {
      wx.onAccelerometerChange((res) => {
        if (accelerometerCallback) {
          accelerometerCallback(res);
        }
        _checkShake(res);
      });
    },
    fail: (err) => {
      console.error("Accelerometer start failed:", err);
    },
  });
};

/**
 * Stop accelerometer listener
 */
const stopAccelerometer = () => {
  accelerometerCallback = null;
  wx.stopAccelerometer({
    fail: () => {},
  });
};

/**
 * Start gyroscope listener
 * @param {Function} callback - receives { x, y, z }
 */
const startGyroscope = (callback) => {
  gyroscopeCallback = callback;
  wx.startGyroscope({
    interval: "game",
    success: () => {
      wx.onGyroscopeChange((res) => {
        if (gyroscopeCallback) {
          gyroscopeCallback(res);
        }
      });
    },
    fail: (err) => {
      console.error("Gyroscope start failed:", err);
    },
  });
};

/**
 * Stop gyroscope listener
 */
const stopGyroscope = () => {
  gyroscopeCallback = null;
  wx.stopGyroscope({
    fail: () => {},
  });
};

/**
 * Check for shake motion
 * @param {{ x: number, y: number, z: number }} data
 */
const _checkShake = (data) => {
  if (!shakeCallback) return;
  const now = Date.now();
  if (now - lastShakeTime < 500) return;

  const acceleration = Math.sqrt(
    data.x * data.x + data.y * data.y + data.z * data.z,
  );

  if (acceleration > shakeThreshold) {
    lastShakeTime = now;
    shakeCallback();
  }
};

/**
 * Detect shake motion
 * @param {Function} callback - called when shake detected
 * @param {number} [threshold=15] - shake sensitivity
 */
const detectShake = (callback, threshold = 15) => {
  shakeCallback = callback;
  shakeThreshold = threshold;
  if (!accelerometerCallback) {
    startAccelerometer(() => {});
  }
};

/**
 * Detect phone tilt
 * @param {Function} callback - called with tilt info { axis, value, direction }
 * @param {'x'|'y'} [axis='x'] - which axis to monitor
 * @param {number} [threshold=30] - tilt angle threshold
 */
const detectTilt = (callback, axis = "x", threshold = 30) => {
  startAccelerometer((data) => {
    const value = Math.abs(data[axis] * 90);
    if (value > threshold) {
      const direction = data[axis] > 0 ? "positive" : "negative";
      callback({ axis, value, direction });
    }
  });
};

/**
 * Detect phone flip (screen facing down)
 * @param {Function} callback - called when flip detected
 */
const detectFlip = (callback) => {
  startGyroscope((data) => {
    // z-axis rotation indicates flip
    if (Math.abs(data.z) > 1.5) {
      callback();
    }
  });
};

/**
 * Stop all sensor listeners
 */
const stopAll = () => {
  stopAccelerometer();
  stopGyroscope();
  shakeCallback = null;
};

module.exports = {
  startAccelerometer,
  stopAccelerometer,
  startGyroscope,
  stopGyroscope,
  detectShake,
  detectTilt,
  detectFlip,
  stopAll,
};
