// ============================================================
// audio.js - WebAudio chiptune sound effects + tiny music loop
// ============================================================
'use strict';

G.Audio = {
  ctx: null,
  muted: false,
  musicOn: true,
  _musicTimer: null,
  _musicStep: 0,

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  beep(freq, dur = 0.08, type = 'square', vol = 0.12, slide = 0) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  seq(notes, step = 0.09, type = 'square', vol = 0.1) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    notes.forEach((f, i) => {
      if (!f) return;
      setTimeout(() => this.beep(f, step * 0.9, type, vol), i * step * 1000);
    });
  },

  // ---- Named SFX ----
  move()    { this.beep(520, 0.04, 'square', 0.06); },
  select()  { this.seq([660, 880], 0.06); },
  back()    { this.seq([440, 330], 0.06); },
  good()    { this.seq([523, 659, 784], 0.07, 'square', 0.1); },
  great()   { this.seq([523, 659, 784, 1047], 0.07, 'square', 0.12); },
  bad()     { this.seq([330, 262, 196], 0.09, 'sawtooth', 0.08); },
  cash()    { this.seq([988, 1319, 988, 1568], 0.05, 'square', 0.12); },
  ring()    { this.seq([880, 0, 880, 0, 880], 0.07, 'triangle', 0.1); },
  tick()    { this.beep(1200, 0.03, 'square', 0.05); },
  thud()    { this.beep(120, 0.12, 'sawtooth', 0.14, -60); },
  swoosh()  { this.beep(300, 0.15, 'sawtooth', 0.06, 500); },
  fanfare() { this.seq([523, 523, 523, 659, 784, 0, 784, 1047], 0.11, 'square', 0.12); },
  sadTromb(){ this.seq([392, 370, 349, 330], 0.22, 'sawtooth', 0.09); },
  ability() { this.seq([392, 523, 659, 784, 1047, 1319], 0.05, 'triangle', 0.12); },
  snow()    { this.beep(2000, 0.3, 'triangle', 0.03, -1500); },

  // ---- Tiny background loop (title/map). Two-channel arp + bass. ----
  MELODY: [
    523, 0, 659, 0, 784, 659, 523, 0,
    587, 0, 698, 0, 880, 698, 587, 0,
    523, 0, 659, 0, 784, 659, 1047, 0,
    988, 784, 659, 0, 523, 0, 0, 0,
  ],
  BASS: [
    131, 0, 0, 131, 175, 0, 0, 175,
    147, 0, 0, 147, 196, 0, 0, 196,
    131, 0, 0, 131, 175, 0, 0, 175,
    165, 0, 165, 0, 131, 0, 131, 0,
  ],

  startMusic() {
    if (this._musicTimer || !this.musicOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this._musicStep = 0;
    this._musicTimer = setInterval(() => {
      if (this.muted || !this.musicOn) return;
      const i = this._musicStep % this.MELODY.length;
      const m = this.MELODY[i], b = this.BASS[i];
      if (m) this.beep(m, 0.1, 'square', 0.035);
      if (b) this.beep(b, 0.16, 'triangle', 0.06);
      this._musicStep++;
    }, 140);
  },

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (!this.muted) this.select();
    return this.muted;
  },
};
