// Tiny chiptune bleeps. Starts after a click. Mute is remembered.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('north-desk-mute') === '1'; } catch (e) { muted = false; }

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type) {
    if (muted) return;
    try {
      const a = ac();
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.04, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.connect(g);
      g.connect(a.destination);
      o.start();
      o.stop(a.currentTime + dur);
    } catch (e) { /* audio is optional */ }
  }

  G.Audio = {
    muted: function () { return muted; },
    toggle: function () {
      muted = !muted;
      try { localStorage.setItem('north-desk-mute', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      return muted;
    },
    blip: function () { beep(520, 0.06, 'square'); },
    talk: function () { beep(340, 0.05, 'square'); },
    hit: function () { beep(180, 0.08, 'square'); },
    win: function () { beep(660, 0.1, 'square'); setTimeout(function () { beep(880, 0.12, 'square'); }, 90); },
    hurt: function () { beep(120, 0.1, 'sawtooth'); },
  };
})();
