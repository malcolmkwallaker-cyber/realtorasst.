// ============================================================
// engine.js - game loop, scene manager, transitions
// ============================================================
'use strict';

G.Engine = {
  scenes: {},
  current: null,
  currentName: '',
  fade: 0,          // 1 = black
  fadeDir: 0,       // -1 fading in, +1 fading out
  pendingScene: null,
  shake: 0,
  time: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    G.Input.init(canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());

    let last = performance.now();
    const frame = (now) => {
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.05);
      this.time += dt;
      // A thrown error must never kill the animation loop (that = permanent freeze).
      try {
        this.update(dt);
      } catch (e) {
        this.reportError('update', e);
      }
      try {
        this.render();
      } catch (e) {
        this.reportError('render', e);
      }
      try { G.Input.endFrame(); } catch (e) {}
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  reportError(where, e) {
    // Log once per unique message, and surface it on-screen instead of freezing.
    this._errs = this._errs || {};
    const msg = (e && e.message) || String(e);
    if (!this._errs[msg]) {
      this._errs[msg] = true;
      console.error('[' + where + '] ' + msg, e && e.stack);
    }
    this.lastError = msg;
  },

  resize() {
    const scale = Math.max(1, Math.floor(Math.min(
      window.innerWidth / G.W, window.innerHeight / G.H
    )));
    this.canvas.style.width = (G.W * scale) + 'px';
    this.canvas.style.height = (G.H * scale) + 'px';
  },

  register(name, scene) { this.scenes[name] = scene; },

  // Fade out, switch, fade in
  goto(name, params) {
    if (this.pendingScene) return;
    this.pendingScene = { name, params };
    this.fadeDir = 1;
  },

  // Instant switch (used at boot)
  set(name, params) {
    if (this.current && this.current.exit) this.current.exit();
    this.current = this.scenes[name];
    this.currentName = name;
    if (this.current.enter) this.current.enter(params);
    this.fade = 1;
    this.fadeDir = -1;
  },

  update(dt) {
    // global keys
    if (G.Input.p('m')) {
      const muted = G.Audio.toggleMute();
      if (muted) G.Audio.stopMusic(); else G.Audio.startMusic();
    }

    // fade transitions
    if (this.fadeDir !== 0) {
      this.fade = G.clamp(this.fade + this.fadeDir * dt * 4, 0, 1);
      if (this.fade >= 1 && this.pendingScene) {
        const p = this.pendingScene;
        this.pendingScene = null;
        this.set(p.name, p.params);
      } else if (this.fade <= 0) {
        this.fadeDir = 0;
      }
    }

    this.shake = Math.max(0, this.shake - dt * 30);
    G.Toast.update(dt);

    // popups eat input
    if (G.Popup.update(dt)) return;

    if (this.current && this.current.update && this.fadeDir === 0) {
      this.current.update(dt);
    }
  },

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate(G.randInt(-2, 2), G.randInt(-2, 2));
    }
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(-4, -4, G.W + 8, G.H + 8);

    if (this.current && this.current.render) this.current.render(ctx);

    ctx.restore();

    G.Popup.render(ctx);
    G.Toast.render(ctx);

    // mute indicator
    if (G.Audio.muted) {
      G.UI.text(ctx, 'MUTED [M]', G.W - 4, G.H - 10, { align: 'right', size: 7, color: G.C.slate });
    }

    if (this.fade > 0) {
      ctx.fillStyle = 'rgba(26,28,44,' + this.fade + ')';
      ctx.fillRect(0, 0, G.W, G.H);
    }
  },
};
