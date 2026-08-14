/**
 * Parkour Race controls: hold and drag left/right to steer. Jump, vault,
 * slide and flip are automatic. Optional swipe-up / swipe-down still work
 * as manual overrides. Keyboard A/D (or arrows) for desktop.
 */

export interface InputFrame {
  steer: number;
  jump: boolean;
  slide: boolean;
  moveLeft: boolean;
  moveRight: boolean;
}

interface ActiveTouch {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startTime: number;
  swiped: boolean;
  steering: boolean;
}

export class InputManager {
  /** swipe/drag sensitivity multiplier (0.5..2). */
  sensitivity = 1.0;
  scheme: 'swipe' | 'buttons' = 'swipe';
  enabled = true;

  private queue: { jump: number; slide: number; left: number; right: number } = {
    jump: 0,
    slide: 0,
    left: 0,
    right: 0,
  };
  private steerFromDrag = 0;
  private keys = new Set<string>();
  private touches = new Map<number, ActiveTouch>();
  private el: HTMLElement | null = null;
  private buttonSteer = 0;
  private mouseDown = false;
  private mouseStartX = 0;

  private onTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
  private onTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
  private onTouchEnd = (e: TouchEvent) => this.handleTouchEnd(e);
  private onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private onKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
  private onMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
  private onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
  private onMouseUp = () => this.handleMouseUp();

  attach(el: HTMLElement): void {
    this.el = el;
    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    el.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    if (this.el) {
      this.el.removeEventListener('touchstart', this.onTouchStart);
      this.el.removeEventListener('touchmove', this.onTouchMove);
      this.el.removeEventListener('touchend', this.onTouchEnd);
      this.el.removeEventListener('touchcancel', this.onTouchEnd);
      this.el.removeEventListener('mousedown', this.onMouseDown);
    }
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  /** On-screen button hooks (alternative control scheme). */
  pressButton(action: 'left' | 'right' | 'jump' | 'slide', down: boolean): void {
    if (!this.enabled) return;
    if (action === 'left') this.buttonSteer = down ? -1 : this.buttonSteer < 0 ? 0 : this.buttonSteer;
    else if (action === 'right') this.buttonSteer = down ? 1 : this.buttonSteer > 0 ? 0 : this.buttonSteer;
    else if (down && action === 'jump') this.queue.jump++;
    else if (down && action === 'slide') this.queue.slide++;
  }

  /** Read and clear edge-triggered actions accumulated since the last frame. */
  poll(): InputFrame {
    const keySteer =
      (this.keys.has('ArrowLeft') || this.keys.has('KeyA') ? -1 : 0) +
      (this.keys.has('ArrowRight') || this.keys.has('KeyD') ? 1 : 0);
    const steer = Math.max(-1, Math.min(1, keySteer + this.steerFromDrag + this.buttonSteer));
    const frame: InputFrame = {
      steer,
      jump: this.queue.jump > 0,
      slide: this.queue.slide > 0,
      moveLeft: this.queue.left > 0,
      moveRight: this.queue.right > 0,
    };
    this.queue.jump = 0;
    this.queue.slide = 0;
    this.queue.left = 0;
    this.queue.right = 0;
    return frame;
  }

  private swipeThreshold(): number {
    const dpi = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;
    return (22 * dpi) / this.sensitivity;
  }

  private isUi(target: EventTarget | null): boolean {
    return !!(target as HTMLElement | null)?.closest?.('.ui-clickable');
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.enabled) return;
    if (this.isUi(e.target)) return;
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      this.touches.set(t.identifier, {
        id: t.identifier,
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastY: t.clientY,
        startTime: performance.now(),
        swiped: false,
        steering: true, // steer from the first pixel — Parkour Race one-thumb
      });
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.enabled) return;
    for (const t of Array.from(e.changedTouches)) {
      const a = this.touches.get(t.identifier);
      if (!a) continue;
      const dx = t.clientX - a.startX;
      const dy = t.clientY - a.startY;
      a.lastX = t.clientX;
      a.lastY = t.clientY;
      const th = this.swipeThreshold();

      // Vertical swipe is an optional manual jump/slide override.
      if (!a.swiped && Math.abs(dy) > th * 1.4 && Math.abs(dy) > Math.abs(dx) * 1.6) {
        if (dy < 0) this.queue.jump++;
        else this.queue.slide++;
        a.swiped = true;
      }

      if (a.steering) {
        const w = window.innerWidth || 800;
        this.steerFromDrag = Math.max(-1, Math.min(1, (dx / (w * 0.22)) * this.sensitivity));
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      const a = this.touches.get(t.identifier);
      if (a) {
        if (a.steering) this.steerFromDrag = 0;
        this.touches.delete(t.identifier);
      }
    }
    if (this.touches.size === 0) this.steerFromDrag = 0;
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.enabled || e.button !== 0) return;
    if (this.isUi(e.target)) return;
    this.mouseDown = true;
    this.mouseStartX = e.clientX;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.enabled || !this.mouseDown) return;
    const w = window.innerWidth || 800;
    const dx = e.clientX - this.mouseStartX;
    this.steerFromDrag = Math.max(-1, Math.min(1, (dx / (w * 0.22)) * this.sensitivity));
  }

  private handleMouseUp(): void {
    this.mouseDown = false;
    if (this.touches.size === 0) this.steerFromDrag = 0;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;
    if (e.repeat) {
      this.keys.add(e.code);
      return;
    }
    this.keys.add(e.code);
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.queue.jump++;
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
      case 'ShiftLeft':
        this.queue.slide++;
        e.preventDefault();
        break;
      case 'KeyQ':
        this.queue.left++;
        break;
      case 'KeyE':
        this.queue.right++;
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }
}

export const input = new InputManager();
