/**
 * Unified sensor management for interactive puzzles
 * Handles accelerometer, gyroscope, and touch-based interactions
 */

let accelerometerCallback = null;
let gyroscopeCallback = null;
let shakeCallback = null;
let lastShakeTime = 0;
let shakeThreshold = 15;
let accelHandler = null;
let gyroHandler = null;

/**
 * Start accelerometer listener
 * @param {Function} callback - receives { x, y, z }
 */
const startAccelerometer = (callback) => {
  stopAccelerometer();
  accelerometerCallback = callback;
  accelHandler = (res) => {
    if (accelerometerCallback) {
      accelerometerCallback(res);
    }
    _checkShake(res);
  };
  wx.startAccelerometer({
    interval: "game",
    success: () => {
      wx.onAccelerometerChange(accelHandler);
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
  if (accelHandler) {
    wx.offAccelerometerChange(accelHandler);
    accelHandler = null;
  }
  accelerometerCallback = null;
  wx.stopAccelerometer({ fail: () => {} });
};

/**
 * Start gyroscope listener
 * @param {Function} callback - receives { x, y, z }
 */
const startGyroscope = (callback) => {
  stopGyroscope();
  gyroscopeCallback = callback;
  gyroHandler = (res) => {
    if (gyroscopeCallback) {
      gyroscopeCallback(res);
    }
  };
  wx.startGyroscope({
    interval: "game",
    success: () => {
      wx.onGyroscopeChange(gyroHandler);
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
  if (gyroHandler) {
    wx.offGyroscopeChange(gyroHandler);
    gyroHandler = null;
  }
  gyroscopeCallback = null;
  wx.stopGyroscope({ fail: () => {} });
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
  if (!accelHandler) {
    startAccelerometer(() => {});
  }
};

/**
 * Detect phone tilt
 * @param {Function} callback - called when tilt exceeds threshold
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
 * Detect phone flip (screen facing down) using accelerometer z-axis
 * @param {Function} callback - called when flip detected
 */
const detectFlip = (callback) => {
  let flipTriggered = false;
  startAccelerometer((data) => {
    // z < -0.8 means screen is facing down
    if (data.z < -0.8 && !flipTriggered) {
      flipTriggered = true;
      callback();
    }
    // Reset when phone is upright again
    if (data.z > 0) {
      flipTriggered = false;
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
  shakeThreshold = 15;
  lastShakeTime = 0;
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
