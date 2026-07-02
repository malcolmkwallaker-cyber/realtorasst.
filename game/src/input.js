// ============================================================
// input.js - keyboard + mouse (scaled to internal resolution)
// ============================================================
'use strict';

G.Input = {
  keys: {},        // currently held
  pressed: {},     // pressed this frame
  mouse: { x: -1, y: -1, down: false, clicked: false },
  anyKeyPressed: false,

  init(canvas) {
    this.canvas = canvas;

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

    canvas.addEventListener('mousemove', (e) => {
      const p = toGame(e);
      this.mouse.x = p.x; this.mouse.y = p.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      const p = toGame(e);
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.down = true;
      this.mouse.clicked = true;
      G.Audio.ensure();
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });

    // Touch support (mobile web)
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const p = toGame(t);
      this.mouse.x = p.x; this.mouse.y = p.y;
      this.mouse.down = true;
      this.mouse.clicked = true;
      G.Audio.ensure();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const p = toGame(t);
      this.mouse.x = p.x; this.mouse.y = p.y;
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.mouse.down = false;
    }, { passive: false });
  },

  norm(key) {
    if (key.length === 1) return key.toLowerCase();
    return key;
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

  inRect(x, y, w, h) {
    return this.mouse.x >= x && this.mouse.x <= x + w &&
           this.mouse.y >= y && this.mouse.y <= y + h;
  },
  clickedRect(x, y, w, h) {
    return this.mouse.clicked && this.inRect(x, y, w, h);
  },

  endFrame() {
    this.pressed = {};
    this.mouse.clicked = false;
    this.anyKeyPressed = false;
  },
};
