// ============================================================
// main.js - boot
// ============================================================
'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  G.Engine.init(canvas);
  G.Engine.set('title');
});
