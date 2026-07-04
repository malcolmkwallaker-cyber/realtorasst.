// ============================================================
// input.js - keyboard + unified pointer input (mouse/touch/pen),
// scaled to the internal 480x270 resolution. Adds touch helpers:
// tap detection, drag tracking, virtual key injection, vibration.
// ============================================================
'use strict';

G.Input = {
  keys: {},        // currently held (physical + virtual holds)
  pressed: {},     // pressed this frame (physical + virtual)
  mouse: {
    x: -1, y: -1,
    down: false,
    clicked: false,   // pointer went down this frame
    released: false,  // pointer came up this frame
    tapped: false,    // released this frame without dragging (touch-safe click)
  },
  touch: false,      // true once a touch pointer is seen (or coarse pointer device)
  drag: { active: false, startX: 0, startY: 0, moved: 0, frameDY: 0, frameDX: 0 },
  anyKeyPressed: false,

  init(canvas) {
    this.canvas = canvas;
    // coarse-pointer devices (phones/tablets) get touch UI immediately
    try { this.touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches; } catch (e) {}

    window.addEventListener('keydown', (e) => {
      // avoid page scroll on game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) {
        e.preventDefault();
      }
      const k = this.norm(e.key);
      if (!this.keys[k]) this.pressed[k] = true;
      this.keys[k] = true;
      this.anyKeyPressed = true;
      G.Audio.ensure(); // unlock audio on first gesture
    });

    window.addEventListener('keyup', (e) => {
      this.keys[this.norm(e.key)] = false;
    });

    const toGame = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / r.width * G.W,
        y: (e.clientY - r.top) / r.height * G.H,
      };
    };

    // --- Pointer Events: one path for mouse, touch and pen ---
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.pointerType === 'touch') this.touch = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      const p = toGame(e);
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.drag.active = true;
      this.drag.startX = p.x; this.drag.startY = p.y;
      this.drag.moved = 0;
      G.Audio.ensure();
    }, { passive: false });

    canvas.addEventListener('pointermove', (e) => {
      const p = toGame(e);
      if (this.drag.active) {
        this.drag.frameDX += p.x - this.mouse.x;
        this.drag.frameDY += p.y - this.mouse.y;
        this.drag.moved += Math.abs(p.x - this.mouse.x) + Math.abs(p.y - this.mouse.y);
      }
      this.mouse.x = p.x; this.mouse.y = p.y;
    });

    const up = (e) => {
      if (e && e.clientX !== undefined) {
        const p = toGame(e);
        this.mouse.x = p.x; this.mouse.y = p.y;
      }
      if (this.mouse.down) {
        this.mouse.released = true;
        if (this.drag.moved < 10) this.mouse.tapped = true;
      }
      this.mouse.down = false;
      this.drag.active = false;
    };
    canvas.addEventListener('pointerup', (e) => { e.preventDefault(); up(e); }, { passive: false });
    canvas.addEventListener('pointercancel', () => up(null));
    window.addEventListener('pointerup', () => { this.mouse.down = false; this.drag.active = false; });
  },

  norm(key) {
    if (key.length === 1) return key.toLowerCase();
    return key;
  },

  // --- virtual controls (on-screen buttons inject key presses) ---
  pressVirtual(k) {
    this.pressed[k] = true;
    this._virtualHeld = this._virtualHeld || {};
  },
  holdVirtual(k, on) {
    this.keys[k] = !!on;
  },

  // short haptic feedback where supported (no-op elsewhere)
  vibrate(ms) {
    try { if (this.touch && navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  },

  // convenience checks
  p(k) { return !!this.pressed[k]; },                       // pressed this frame
  held(k) { return !!this.keys[k]; },
  up()    { return this.p('ArrowUp') || this.p('w'); },
  down()  { return this.p('ArrowDown') || this.p('s'); },
  left()  { return this.p('ArrowLeft') || this.p('a'); },
  right() { return this.p('ArrowRight') || this.p('d'); },
  confirm() { return this.p('Enter') || this.p(' '); },
  cancel()  { return this.p('Escape') || this.p('Backspace'); },

  // pad: grow the hitbox (invisible) for finger-friendly targets
  inRect(x, y, w, h, pad = 0) {
    return this.mouse.x >= x - pad && this.mouse.x <= x + w + pad &&
           this.mouse.y >= y - pad && this.mouse.y <= y + h + pad;
  },
  clickedRect(x, y, w, h, pad = 0) {
    return this.mouse.clicked && this.inRect(x, y, w, h, pad);
  },
  // tap = release without drag; safer for scrollable lists on touch
  tappedRect(x, y, w, h, pad = 0) {
    return this.mouse.tapped && this.inRect(x, y, w, h, pad);
  },

  endFrame() {
    this.pressed = {};
    this.mouse.clicked = false;
    this.mouse.released = false;
    this.mouse.tapped = false;
    this.drag.frameDX = 0;
    this.drag.frameDY = 0;
    this.anyKeyPressed = false;
  },
};
