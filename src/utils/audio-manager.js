/**
 * Sound effects management
 */

let correctAudio = null;
let wrongAudio = null;
let clickAudio = null;
let enabled = true;

/**
 * Create an audio context with the given source
 * @param {string} src
 * @returns {InnerAudioContext}
 */
const _createAudio = (src) => {
  const audio = wx.createInnerAudioContext();
  audio.src = src;
  audio.obeyMuteSwitch = true;
  return audio;
};

/**
 * Initialize audio instances
 */
const init = () => {
  correctAudio = _createAudio("/audio/correct.mp3");
  wrongAudio = _createAudio("/audio/wrong.mp3");
  clickAudio = _createAudio("/audio/click.mp3");
};

/**
 * Play correct answer sound
 */
const playCorrect = () => {
  if (!enabled || !correctAudio) return;
  correctAudio.stop();
  correctAudio.play();
};

/**
 * Play wrong answer sound
 */
const playWrong = () => {
  if (!enabled || !wrongAudio) return;
  wrongAudio.stop();
  wrongAudio.play();
};

/**
 * Play button click sound
 */
const playClick = () => {
  if (!enabled || !clickAudio) return;
  clickAudio.stop();
  clickAudio.play();
};

/**
 * Set sound enabled state
 * @param {boolean} value
 */
const setEnabled = (value) => {
  enabled = value;
};

/**
 * Check if sound is enabled
 * @returns {boolean}
 */
const isEnabled = () => enabled;

/**
 * Destroy all audio instances
 */
const destroy = () => {
  if (correctAudio) correctAudio.destroy();
  if (wrongAudio) wrongAudio.destroy();
  if (clickAudio) clickAudio.destroy();
  correctAudio = null;
  wrongAudio = null;
  clickAudio = null;
};

module.exports = {
  init,
  playCorrect,
  playWrong,
  playClick,
  setEnabled,
  isEnabled,
  destroy,
};
