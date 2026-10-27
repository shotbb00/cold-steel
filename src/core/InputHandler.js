// Keyboard / mouse state plus pointer lock. Continuous state is polled (isDown, mouse),
// discrete presses are broadcast on the event bus ('key', 'mousedown', 'mouseup').

const BLOCKED_KEYS = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class InputHandler {
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.bus = bus;
    this.keys = new Set();
    this.locked = false;
    this.mouse = {
      x: innerWidth / 2,
      y: innerHeight / 2,
      dx: 0,
      dy: 0,
      wheel: 0,
      buttons: new Set(),
      inside: false, // becomes true on first mousemove; gates edge scrolling
    };

    window.addEventListener('keydown', (e) => {
      if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      bus.emit('key', { code: e.code, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.buttons.clear();
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();   // the middle button turns the command camera, not autoscroll
      this.mouse.buttons.add(e.button);
      bus.emit('mousedown', this.eventInfo(e));
    });
    window.addEventListener('mouseup', (e) => {
      this.mouse.buttons.delete(e.button);
      bus.emit('mouseup', this.eventInfo(e));
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.inside = true;
      if (this.locked) {
        // Browsers can report a bogus huge delta right after the pointer is captured, and
        // occasionally mid-lock; drop those so the view never snaps.
        if (this.skipMoves > 0) this.skipMoves--;
        else if (Math.abs(e.movementX) < 250 && Math.abs(e.movementY) < 250) {
          this.mouse.dx += e.movementX;
          this.mouse.dy += e.movementY;
        }
      } else if (this.mouse.buttons.has(1)) {
        // middle-button drag (command camera orbit / tilt)
        this.mouse.dx += e.movementX;
        this.mouse.dy += e.movementY;
      }
    });
    document.documentElement.addEventListener('mouseleave', () => (this.mouse.inside = false));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.mouse.wheel += e.deltaY;
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.skipMoves = this.locked ? 2 : 0;
      this.mouse.dx = this.mouse.dy = 0;
      bus.emit('pointerlock', this.locked);
    });
  }

  eventInfo(e) {
    return { button: e.button, x: e.clientX, y: e.clientY, shift: e.shiftKey, ctrl: e.ctrlKey || e.altKey || e.metaKey };
  }

  isDown(code) {
    return this.keys.has(code);
  }

  isMouseDown(button = 0) {
    return this.mouse.buttons.has(button);
  }

  /** -1 / 0 / +1 from two lists of key codes. */
  axis(negative, positive) {
    const n = negative.some((k) => this.keys.has(k)) ? 1 : 0;
    const p = positive.some((k) => this.keys.has(k)) ? 1 : 0;
    return p - n;
  }

  consumeMouseDelta() {
    const d = { x: this.mouse.dx, y: this.mouse.dy };
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return d;
  }

  consumeWheel() {
    const w = this.mouse.wheel;
    this.mouse.wheel = 0;
    return w;
  }

  requestLock() {
    if (this.locked) return;
    const p = this.canvas.requestPointerLock?.();
    if (p && p.catch) p.catch(() => {}); // browsers refuse re-lock right after Esc; the click hint covers it
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
