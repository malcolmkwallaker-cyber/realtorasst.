// ============================================================
// ui.js - text, panels, menus, popups
// ============================================================
'use strict';

G.UI = {
  // Crisp-ish retro text
  text(ctx, str, x, y, opts = {}) {
    const size = opts.size || 8;
    ctx.font = (opts.bold === false ? '' : 'bold ') + size + 'px monospace';
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'top';
    if (opts.shadow) {
      ctx.fillStyle = opts.shadow === true ? G.C.ink : opts.shadow;
      ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
    }
    ctx.fillStyle = opts.color || G.C.white;
    ctx.fillText(str, Math.round(x), Math.round(y));
  },

  measure(ctx, str, size = 8, bold = true) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px monospace';
    return ctx.measureText(str).width;
  },

  // Word-wrap text into lines that fit maxWidth
  wrap(ctx, str, maxWidth, size = 8) {
    ctx.font = 'bold ' + size + 'px monospace';
    const words = String(str).split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  },

  panel(ctx, x, y, w, h, opts = {}) {
    ctx.fillStyle = opts.bg || G.C.navy;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = opts.border || G.C.white;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (opts.title) {
      ctx.fillStyle = opts.titleBg || G.C.blue;
      ctx.fillRect(x + 1, y + 1, w - 2, 11);
      this.text(ctx, opts.title, x + w / 2, y + 3, { align: 'center', color: opts.titleColor || G.C.white });
    }
  },

  // Progress/stat bar
  bar(ctx, x, y, w, h, pct, color, bg) {
    ctx.fillStyle = bg || G.C.dusk;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color || G.C.green;
    ctx.fillRect(x, y, Math.round(w * G.clamp(pct, 0, 1)), h);
    ctx.strokeStyle = G.C.ink;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  },

  button(ctx, label, x, y, w, h, opts = {}) {
    const hover = G.Input.inRect(x, y, w, h);
    const active = opts.selected || hover;
    ctx.fillStyle = opts.disabled ? G.C.dusk : (active ? (opts.hoverBg || G.C.blue) : (opts.bg || G.C.navy));
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = active && !opts.disabled ? G.C.yellow : G.C.slate;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    this.text(ctx, label, x + w / 2, y + (h - (opts.size || 8)) / 2, {
      align: 'center',
      size: opts.size || 8,
      color: opts.disabled ? G.C.slate : (active ? G.C.white : (opts.color || G.C.gray)),
    });
    return !opts.disabled && G.Input.clickedRect(x, y, w, h);
  },
};

// ------------------------------------------------------------
// Keyboard/mouse menu
// items: [{label, disabled, note, data}]
// ------------------------------------------------------------
G.Menu = class {
  constructor(items, opts = {}) {
    this.items = items;
    this.index = 0;
    this.x = opts.x || 0; this.y = opts.y || 0;
    this.w = opts.w || 140; this.rowH = opts.rowH || 13;
    this.onSelect = opts.onSelect || (() => {});
    this.skipDisabled(1);
  }

  skipDisabled(dir) {
    let guard = 0;
    while (this.items[this.index] && this.items[this.index].disabled && guard++ < this.items.length) {
      this.index = (this.index + dir + this.items.length) % this.items.length;
    }
  }

  update() {
    const I = G.Input;
    if (I.up())   { this.index = (this.index - 1 + this.items.length) % this.items.length; this.skipDisabled(-1); G.Audio.move(); }
    if (I.down()) { this.index = (this.index + 1) % this.items.length; this.skipDisabled(1); G.Audio.move(); }
    if (I.confirm()) {
      const it = this.items[this.index];
      if (it && !it.disabled) { G.Audio.select(); this.onSelect(it, this.index); }
      else G.Audio.bad();
    }
    // mouse
    for (let i = 0; i < this.items.length; i++) {
      const ry = this.y + i * this.rowH;
      if (I.inRect(this.x, ry, this.w, this.rowH - 1)) {
        if (I.mouse.x !== this._lastMx || I.mouse.y !== this._lastMy) this.index = i;
        if (I.mouse.clicked) {
          const it = this.items[i];
          if (it && !it.disabled) { this.index = i; G.Audio.select(); this.onSelect(it, i); }
          else G.Audio.bad();
        }
      }
    }
    this._lastMx = I.mouse.x; this._lastMy = I.mouse.y;
  }

  render(ctx) {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const ry = this.y + i * this.rowH;
      const sel = i === this.index;
      if (sel && !it.disabled) {
        ctx.fillStyle = G.C.blue;
        ctx.fillRect(this.x, ry, this.w, this.rowH - 1);
      }
      G.UI.text(ctx, (sel ? '>' : ' ') + it.label, this.x + 3, ry + 2, {
        color: it.disabled ? G.C.slate : (sel ? G.C.white : G.C.gray),
      });
      if (it.note) {
        G.UI.text(ctx, it.note, this.x + this.w - 3, ry + 2, {
          align: 'right', size: 7,
          color: it.disabled ? G.C.slate : G.C.yellow,
        });
      }
    }
  }
};

// ------------------------------------------------------------
// Modal popup with wrapped lines; closes on confirm/click.
// Use: G.Popup.show({title, lines, color, onClose})
// ------------------------------------------------------------
G.Popup = {
  active: null,
  queue: [],

  show(opts) {
    if (this.active) { this.queue.push(opts); return; }
    this.active = opts;
    this.t = 0;
  },

  update(dt) {
    if (!this.active) return false;
    this.t = (this.t || 0) + dt;
    if (this.t > 0.25 && (G.Input.confirm() || G.Input.cancel() || G.Input.mouse.clicked)) {
      const closed = this.active;
      this.active = null;
      G.Audio.select();
      if (closed.onClose) closed.onClose();
      if (this.queue.length) this.show(this.queue.shift());
    }
    return true; // popup consumed input this frame
  },

  render(ctx) {
    if (!this.active) return;
    const o = this.active;
    ctx.fillStyle = 'rgba(26,28,44,0.75)';
    ctx.fillRect(0, 0, G.W, G.H);

    const w = o.w || 320;
    // pre-wrap lines
    const wrapped = [];
    for (const line of (o.lines || [])) {
      for (const l of G.UI.wrap(ctx, line, w - 24)) wrapped.push(l);
    }
    const h = 40 + wrapped.length * 10 + (o.sprite ? 40 : 0);
    const x = (G.W - w) / 2;
    const y = G.clamp((G.H - h) / 2, 8, G.H);

    G.UI.panel(ctx, x, y, w, h, {
      title: o.title || 'NOTICE',
      titleBg: o.color || G.C.blue,
      bg: G.C.ink,
    });

    let ty = y + 18;
    if (o.sprite && G.Sprites[o.sprite]) {
      G.drawSprite(ctx, G.Sprites[o.sprite], x + w / 2 - 16, ty, 2);
      ty += 38;
    }
    for (const l of wrapped) {
      G.UI.text(ctx, l, x + 12, ty, { color: o.textColor || G.C.white });
      ty += 10;
    }
    if ((this.t || 0) > 0.25 && Math.floor(this.t * 2) % 2 === 0) {
      G.UI.text(ctx, '- PRESS ENTER -', x + w / 2, y + h - 12, { align: 'center', size: 7, color: G.C.yellow });
    }
  },
};
