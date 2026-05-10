import Phaser from '../../lib/phaser.js';
import { InputComponent } from './input-component.js';

export class SwipeInputComponent extends InputComponent {
  /** @type {Phaser.Scene} */
  #scene;
  /** @type {Phaser.Geom.Point} */
  #pointerDownPos;
  /** @type {boolean} */
  #isPointerDown;
  /** @type {number} */
  #threshold;      // minimum drag distance (px) to count as direction
  /** @type {number} */
  #shootTapTime;   // max time (ms) for a tap to count as shoot

  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options]
   * @param {number} [options.threshold=10] 
   * @param {number} [options.shootTapTime=200] 
   */
  constructor(scene, options = {}) {
    super();
    this.#scene = scene;
    this.#pointerDownPos = new Phaser.Geom.Point();
    this.#isPointerDown = false;
    this.#threshold = options.threshold ?? 10;
    this.#shootTapTime = options.shootTapTime ?? 200;

    // Register global pointer events from the scene
    scene.input.on('pointerdown', this.#onPointerDown, this);
    scene.input.on('pointermove', this.#onPointerMove, this);
    scene.input.on('pointerup',   this.#onPointerUp,   this);
  }

  /** @param {Phaser.Input.Pointer} pointer */
  #onPointerDown(pointer) {
    // Only track the first finger (ignore multi-touch)
    if (this.#isPointerDown) return;
    this.#isPointerDown = true;
    this.#pointerDownPos.setTo(pointer.x, pointer.y);
  }

  /** @param {Phaser.Input.Pointer} pointer */
  #onPointerMove(pointer) {
    if (!this.#isPointerDown) return;
    const dx = pointer.x - this.#pointerDownPos.x;
    const dy = pointer.y - this.#pointerDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If the finger hasn't moved enough, no direction yet.
    if (dist < this.#threshold) {
      this.reset();
      return;
    }

    // Use the angle to decide dominant direction
    const angle = Math.atan2(dy, dx); // range -PI to PI
    const PI_4 = Math.PI / 4;

    // Reset all first
    this.reset();

    if (angle > -PI_4 && angle <= PI_4) {
      this._right = true;
    } else if (angle > PI_4 && angle <= 3 * PI_4) {
      this._down = true;
    } else if (angle > -3 * PI_4 && angle <= -PI_4) {
      this._up = true;
    } else {
      this._left = true;
    }
  }

  /** @param {Phaser.Input.Pointer} pointer */
  #onPointerUp(pointer) {
    if (!this.#isPointerDown) return;
    this.#isPointerDown = false;

    // Check for a quick tap → shoot
    const duration = pointer.getDuration();
    const dist = Phaser.Math.Distance.Between(
      pointer.x, pointer.y,
      this.#pointerDownPos.x, this.#pointerDownPos.y
    );
    if (duration < this.#shootTapTime && dist < this.#threshold) {
      this._shoot = true; // fire once
      // Optionally reset shoot next frame if needed.
    }
    this.reset(); // clear movement flags on release
  }

  /**
   * Call this every frame to refresh the component state.
   * (In this design, the state is updated immediately by events,
   * so update() does nothing, but we keep it for consistency.)
   */
  update() {
    // If shoot was set by the tap, it should be consumed in the game logic
    // and then cleared. You might want to do that in the game, or add a consumeShoot() method.
    // For now, shoot stays true until pointer down again or reset.
    // This is a simple approach; it's often better to handle shoot as an event.
  }

  /**
   * Clears the shoot flag manually after it's been processed.
   */
  consumeShoot() {
    this._shoot = false;
  }

  /**
   * Remove listeners when component is destroyed.
   */
  destroy() {
    this.#scene.input.off('pointerdown', this.#onPointerDown, this);
    this.#scene.input.off('pointermove', this.#onPointerMove, this);
    this.#scene.input.off('pointerup', this.#onPointerUp, this);
  }
}