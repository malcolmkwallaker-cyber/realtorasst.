#!/usr/bin/env node
// Head-to-head: Malcolm (Office Leader) vs Bridger (Price Is Right).
'use strict';

const { boot, playOne } = require('./playtest.js');

function summarize(rows) {
  const n = rows.length || 1;
  const wins = rows.filter(r => r.won).length;
  const ties = rows.filter(r => r.tie).length;
  const avg = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0) / n;
  return {
    n: rows.length,
    winRate: wins / n,
    tieRate: ties / n,
    homes: avg('homes'),
    rival: avg('rival'),
    errors: rows.reduce((s, r) => s + r.errors.length, 0),
  };
}

function run(n, skill) {
  const G = boot();
  G.Audio.muted = true;
  const spec = (charId) => ({
    charId,
    difficulty: 'standard',
    policy: 'pipeline',
    skill,
    useAbility: true,
    shop: true,
    doubleEnd: false,
  });
  const malcolm = [];
  const bridger = [];
  for (let i = 0; i < n; i++) {
    malcolm.push(playOne(G, spec('malcolm')));
    bridger.push(playOne(G, spec('bridger')));
  }
  return {
    skill,
    malcolmVsBridger: summarize(malcolm),
    bridgerVsMalcolm: summarize(bridger),
  };
}

const n = Number(process.argv[2] || 40);
const skill = Number(process.argv[3] || 0.72);
const out = run(n, skill);
console.log(JSON.stringify(out, null, 2));
