// ============================================================
// Bridger vs. Malcolm: Realtor Rivals
// utils.js - global namespace, math helpers, palette
// ============================================================
'use strict';

window.G = window.G || {};

// --- SNES-style 16 color palette (Sweetie-16) ---
G.C = {
  ink:    '#1a1c2c',
  purple: '#5d275d',
  red:    '#b13e53',
  orange: '#ef7d57',
  yellow: '#ffcd75',
  lime:   '#a7f070',
  green:  '#38b764',
  teal:   '#257179',
  navy:   '#29366f',
  blue:   '#3b5dc9',
  sky:    '#41a6f6',
  cyan:   '#73eff7',
  white:  '#f4f4f4',
  gray:   '#94b0c2',
  slate:  '#566c86',
  dusk:   '#333c57',
};

G.W = 480;
G.H = 270;

G.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
G.lerp = (a, b, t) => a + (b - a) * t;
G.rand = (lo, hi) => lo + Math.random() * (hi - lo);
G.randInt = (lo, hi) => Math.floor(G.rand(lo, hi + 1));
G.chance = (p) => Math.random() < p;
G.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
G.shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
G.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

// Weighted choice: items = [{weight, ...}]
G.weightedChoice = (items) => {
  const total = items.reduce((s, it) => s + (it.weight || 1), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= (it.weight || 1);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
};

// Money formatting: $1.2M / $850K / $6,750
G.money = (n) => {
  n = Math.round(n);
  if (Math.abs(n) >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 10000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + n.toLocaleString('en-US');
};

G.pct = (n) => Math.round(n * 100) + '%';

// Simple timer/tween bookkeeping helper
G.Timer = class {
  constructor(duration) { this.t = 0; this.d = duration; this.done = false; }
  update(dt) {
    if (this.done) return true;
    this.t += dt;
    if (this.t >= this.d) { this.done = true; }
    return this.done;
  }
  get progress() { return G.clamp(this.t / this.d, 0, 1); }
  reset(d) { this.t = 0; this.done = false; if (d !== undefined) this.d = d; }
};

// Tiny particle system (confetti, cash, snow, sparkles)
G.Particles = class {
  constructor() { this.list = []; }
  spawn(x, y, opts = {}) {
    const n = opts.count || 8;
    for (let i = 0; i < n; i++) {
      this.list.push({
        x, y,
        vx: G.rand(opts.vxMin ?? -40, opts.vxMax ?? 40),
        vy: G.rand(opts.vyMin ?? -70, opts.vyMax ?? -20),
        g: opts.gravity ?? 120,
        life: G.rand(0.4, opts.life ?? 1.0),
        color: opts.colors ? G.choice(opts.colors) : G.C.yellow,
        size: opts.size ?? 2,
      });
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  render(ctx) {
    for (const p of this.list) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }
};
