/**
 * Sound effects management for mini game
 */

let correctAudio = null;
let wrongAudio = null;
let clickAudio = null;
let enabled = true;

const _createAudio = (src) => {
  const audio = wx.createInnerAudioContext();
  audio.src = src;
  return audio;
};

const init = () => {
  destroy();
  correctAudio = _createAudio("audio/correct.mp3");
  wrongAudio = _createAudio("audio/wrong.mp3");
  clickAudio = _createAudio("audio/click.mp3");
};

const playCorrect = () => {
  if (!enabled || !correctAudio) return;
  correctAudio.stop();
  correctAudio.play();
};

const playWrong = () => {
  if (!enabled || !wrongAudio) return;
  wrongAudio.stop();
  wrongAudio.play();
};

const playClick = () => {
  if (!enabled || !clickAudio) return;
  clickAudio.stop();
  clickAudio.play();
};

const setEnabled = (value) => { enabled = value; };
const isEnabled = () => enabled;

const destroy = () => {
  if (correctAudio) correctAudio.destroy();
  if (wrongAudio) wrongAudio.destroy();
  if (clickAudio) clickAudio.destroy();
  correctAudio = null;
  wrongAudio = null;
  clickAudio = null;
};

module.exports = { init, playCorrect, playWrong, playClick, setEnabled, isEnabled, destroy };
