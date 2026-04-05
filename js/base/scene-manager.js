/**
 * Scene manager: handles scene switching, rendering, and touch routing
 */

class SceneManager {
  constructor(ctx, canvas, width, height) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this._scenes = {};
    this._current = null;
    this._currentName = "";
  }

  /**
   * Register a scene factory
   * @param {string} name
   * @param {Function} factory - returns a Scene class
   */
  register(name, factory) {
    this._scenes[name] = factory;
  }

  /**
   * Switch to a scene
   * @param {string} name
   * @param {Object} [params] - data passed to scene.onEnter()
   */
  switchTo(name, params = {}) {
    if (this._current && this._current.onLeave) {
      this._current.onLeave();
    }

    const factory = this._scenes[name];
    if (!factory) {
      console.error(`Scene "${name}" not registered`);
      return;
    }

    const SceneClass = factory();
    this._current = new SceneClass(this.ctx, this.canvas, this.width, this.height, this);
    this._currentName = name;

    if (this._current.onEnter) {
      this._current.onEnter(params);
    }
  }

  /**
   * Render current scene
   */
  render() {
    if (this._current && this._current.render) {
      this._current.render();
    }
  }

  onTouchStart(x, y, e) {
    if (this._current && this._current.onTouchStart) {
      this._current.onTouchStart(x, y, e);
    }
  }

  onTouchMove(x, y, e) {
    if (this._current && this._current.onTouchMove) {
      this._current.onTouchMove(x, y, e);
    }
  }

  onTouchEnd(x, y, e) {
    if (this._current && this._current.onTouchEnd) {
      this._current.onTouchEnd(x, y, e);
    }
  }
}

module.exports = SceneManager;
