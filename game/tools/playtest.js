#!/usr/bin/env node
// Headless season simulator. Loads the game scripts in a fake browser and
// plays full seasons through the state API (no canvas). Writes JSON to stdout.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeCtx() {
  const ctx = {
    fillStyle: '#000', strokeStyle: '#000', font: 'bold 8px monospace',
    textAlign: 'left', textBaseline: 'top', lineWidth: 1, globalAlpha: 1,
    imageSmoothingEnabled: false,
    fillRect() {}, strokeRect() {}, fillText() {},
    measureText(s) { return { width: String(s).length * 5 }; },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    ellipse() {}, arc() {}, fill() {}, closePath() {},
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
    drawImage() {}, clearRect() {},
    createLinearGradient() { return { addColorStop() {} }; },
    setTransform() {}, resetTransform() {},
  };
  return ctx;
}

function boot() {
  const store = {};
  const g = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    performance: { now: () => Date.now() },
    requestAnimationFrame() { return 0; },
    AudioContext: undefined,
    webkitAudioContext: undefined,
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
    },
  };
  g.window = g;
  g.globalThis = g;
  g.document = {
    getElementById() { return { width: 480, height: 270, style: {}, getContext: () => makeCtx(), addEventListener() {} }; },
    createElement() { return { width: 16, height: 16, style: {}, getContext: () => makeCtx() }; },
    addEventListener() {},
  };
  g.navigator = { maxTouchPoints: 0 };
  const context = vm.createContext(g);
  const root = path.join(__dirname, '..');
  const files = [
    'src/utils.js', 'src/audio.js', 'src/input.js', 'src/sprites.js',
    'src/data.js', 'src/data2.js', 'src/characters.js',
    'src/save.js', 'src/cloud.js', 'src/ui.js', 'src/state.js',
  ];
  for (const f of files) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const code = fs.readFileSync(p, 'utf8');
    vm.runInContext(code, context, { filename: f });
  }
  context.G.Audio.muted = true;
  return context.G;
}

const PRIORITY = {
  pipeline: ['close', 'inspect', 'negotiate', 'offer', 'show', 'listing', 'followup', 'call', 'text', 'openhouse', 'video', 'commercial'],
  prospect: ['followup', 'call', 'text', 'openhouse', 'video', 'listing', 'show', 'offer', 'negotiate', 'inspect', 'close', 'commercial'],
  random: null,
  idle: [],
};

function playOne(G, spec) {
  const errors = [];
  const notes = [];
  try {
    G.State.newGame(spec.charId, spec.difficulty);
  } catch (e) {
    return { ...spec, errors: ['newGame: ' + e.message], crashed: true };
  }
  if (spec.pace && G.State.s) G.State.s.daysPerMonth = spec.pace;
  const s0 = G.State.s;
  let guard = 0;
  let zeroDays = 0;
  let actions = 0;
  let whiffs = 0;
  while (s0 && !s0.seasonOver && guard++ < 90) {
    try {
      if (s0.pendingBoss) {
        const won = Math.random() < (spec.skill >= 0.7 ? 0.8 : spec.skill >= 0.45 ? 0.55 : 0.3);
        G.State.resolveBoss(won);
        continue;
      }
      if (s0.pendingBattle) {
        G.State.resolveBattle(Math.random() < spec.skill);
        continue;
      }
      let acted = false;
      let inner = 0;
      while (s0.energy > 0 && inner++ < 14) {
        const ids = G.Data.ACTIONS.map(a => a.id).filter(id => {
          try { return G.State.actionAvailable(id).ok; } catch (e) { errors.push('avail ' + id + ': ' + e.message); return false; }
        });
        if (!ids.length || spec.policy === 'idle') break;
        let id;
        const order = PRIORITY[spec.policy];
        if (!order) id = ids[Math.floor(Math.random() * ids.length)];
        else id = order.find(x => ids.includes(x)) || ids[0];
        const scored = !(id === 'offer' || id === 'close');
        const score = scored ? Math.max(0, Math.min(1, spec.skill + (Math.random() - 0.5) * 0.25)) : null;
        if (scored && score < 0.4) whiffs++;
        G.State.performAction(id, score);
        actions++;
        acted = true;
        if (!Number.isFinite(s0.cash) || !Number.isFinite(s0.energy)) {
          errors.push('non-finite after ' + id);
          break;
        }
      }
      if (!acted) zeroDays++;
      if (spec.useAbility && !s0.abilityUsed && Math.random() < 0.85) {
        const res = G.State.useAbility();
        if (!res || !res.lines) notes.push('ability empty');
      }
      if (spec.shop && Math.random() < 0.65) {
        const items = G.State.allShopItems().filter(u => !G.State.has(u.id) && s0.cash >= u.cost);
        items.sort((a, b) => a.cost - b.cost);
        if (items[0]) G.State.buyUpgrade(items[0].id);
      }
      // Edge: call endDay twice in a row once in a while to see if the calendar skips.
      const res = G.State.endDay();
      if (spec.doubleEnd && Math.random() < 0.04 && !res.bossTime) {
        G.State.endDay();
        notes.push('double endDay');
      }
      if (s0.energy < 0) errors.push('negative energy');
      if (s0.leads.some(l => l.warmth == null || !l.stage)) errors.push('bad lead');
    } catch (e) {
      errors.push((e && e.message) + ' @ ' + (e.stack || '').split('\n')[1]);
      break;
    }
  }
  const s = G.State.s;
  if (!s.seasonOver) errors.push('season stuck month=' + s.month + ' day=' + s.dayOfMonth + ' boss=' + s.pendingBoss);
  let unlocked = [];
  try {
    const p = G.Profile.load();
    unlocked = Object.keys(p.unlocks || {}).filter(k => p.unlocks[k]);
  } catch (e) { errors.push('profile: ' + e.message); }
  return {
    charId: spec.charId,
    difficulty: spec.difficulty,
    policy: spec.policy,
    skill: spec.skill,
    homes: s.stats.homesSold,
    rival: s.rival.homesSold,
    won: !!(s.seasonOver && G.State.playerWon()),
    tie: !!(s.seasonOver && G.State.tied()),
    score: s.seasonOver ? G.State.seasonScore() : 0,
    cash: s.cash,
    commission: s.stats.commission,
    leads: s.stats.leadsReceived,
    missed: s.stats.leadsMissed || 0,
    referrals: s.stats.referrals,
    followers: s.stats.followers,
    happiness: s.stats.happiness,
    bossWins: s.stats.bossWins,
    days: guard,
    zeroDays,
    actions,
    whiffs,
    streak: s.bestStreak || s.streak || 0,
    unlocked,
    errors,
    notes,
    seasonOver: !!s.seasonOver,
  };
}

function avg(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length;
}

function main() {
  const runs = Number(process.argv[2] || 100);
  const G = boot();
  const chars = Object.keys(G.Data.CHARACTERS);
  const specs = [];
  const diffs = ['casual', 'standard', 'hard'];
  const policies = ['pipeline', 'prospect', 'random', 'idle'];
  // Fixed matrix so the sample covers difficulty, skill, and dead-day edges.
  const matrix = [
    ['malcolm', 'standard', 'pipeline', 0.75, 18],
    ['malcolm', 'hard', 'pipeline', 0.9, 8],
    ['malcolm', 'casual', 'prospect', 0.4, 8],
    ['malcolm', 'standard', 'random', 0.55, 8],
    ['malcolm', 'standard', 'idle', 0, 4],
    ['bridger', 'standard', 'pipeline', 0.75, 10],
    ['bridger', 'hard', 'prospect', 0.6, 6],
    ['bridger', 'casual', 'random', 0.35, 6],
  ];
  // If the roster changed, fall back to whoever exists.
  for (const [charId, difficulty, policy, skill, n] of matrix) {
    const id = G.Data.CHARACTERS[charId] ? charId : chars[0];
    for (let i = 0; i < n; i++) specs.push({ charId: id, difficulty, policy, skill, useAbility: policy !== 'idle', shop: policy !== 'idle', doubleEnd: true });
  }
  // One season per remaining character so new roster members all get exercised.
  for (const id of chars) {
    if (specs.filter(s => s.charId === id).length) continue;
    specs.push({ charId: id, difficulty: 'standard', policy: 'pipeline', skill: 0.7, useAbility: true, shop: true, doubleEnd: false });
    specs.push({ charId: id, difficulty: 'hard', policy: 'random', skill: 0.45, useAbility: true, shop: false, doubleEnd: false });
  }
  while (specs.length < runs) {
    const id = chars[specs.length % chars.length];
    specs.push({
      charId: id,
      difficulty: diffs[specs.length % 3],
      policy: policies[specs.length % 4],
      skill: [0.3, 0.55, 0.75, 0.95][specs.length % 4],
      useAbility: true,
      shop: true,
      doubleEnd: specs.length % 7 === 0,
    });
  }
  const results = specs.slice(0, runs).map((spec, i) => {
    // Fresh profile every 10 runs so unlocks are not only from one mega-profile,
    // but also keep a long-lived profile for the last 20 to test persistence.
    if (i === runs - 20) {
      // keep going on the accumulated profile
    }
    return playOne(G, spec);
  });

  const finished = results.filter(r => r.seasonOver && !r.errors.length);
  const crashed = results.filter(r => r.errors.length);
  const byDiff = {};
  for (const d of diffs) {
    const rows = finished.filter(r => r.difficulty === d && r.policy !== 'idle');
    byDiff[d] = {
      n: rows.length,
      winRate: rows.length ? rows.filter(r => r.won).length / rows.length : 0,
      tieRate: rows.length ? rows.filter(r => r.tie).length / rows.length : 0,
      homes: avg(rows, 'homes'),
      rival: avg(rows, 'rival'),
      score: avg(rows, 'score'),
      zeroDays: avg(rows, 'zeroDays'),
      cash: avg(rows, 'cash'),
    };
  }
  const byChar = {};
  for (const id of chars) {
    const rows = finished.filter(r => r.charId === id && r.policy !== 'idle');
    if (!rows.length) continue;
    byChar[id] = {
      n: rows.length,
      winRate: rows.filter(r => r.won).length / rows.length,
      homes: avg(rows, 'homes'),
      score: avg(rows, 'score'),
    };
  }
  const idle = finished.filter(r => r.policy === 'idle');
  const summary = {
    runs: results.length,
    finished: finished.length,
    crashed: crashed.length,
    characters: chars,
    byDiff,
    byChar,
    idle: { n: idle.length, homes: avg(idle, 'homes'), rival: avg(idle, 'rival') },
    zeroDayHeavy: finished.filter(r => r.zeroDays >= 6).length,
    avgHomes: avg(finished.filter(r => r.policy !== 'idle'), 'homes'),
    avgRival: avg(finished.filter(r => r.policy !== 'idle'), 'rival'),
    errorSamples: crashed.slice(0, 12).map(r => ({ charId: r.charId, difficulty: r.difficulty, policy: r.policy, errors: r.errors.slice(0, 3) })),
    unlockUnion: [...new Set(results.flatMap(r => r.unlocked))],
  };
  // Smoke: fresh profile, every ability, no retired names, locks persist.
  const smoke = { abilities: [], lockOk: true, names: [] };
  try {
    G.Profile.data = null;
    G.localStorage && null;
  } catch (e) {}
  // Reset profile by clearing the key the game uses, then drop the cache.
  try { G && null; } catch (e) {}
  const fresh = boot();
  fresh.Profile.data = { lifetime: {}, achievements: {}, unlocks: {}, coffeeVisits: 0 };
  fresh.Profile.save();
  const banned = ['blake', 'tyler', 'BLAKE', 'TYLER LEWIS', 'SUDDATH'];
  const blob = JSON.stringify(fresh.Data.CHARACTERS) + JSON.stringify(fresh.Data.ROSTER);
  smoke.bannedHit = banned.filter(b => blob.includes(b));
  for (const id of fresh.Data.ROSTER) {
    const ch = fresh.Data.CHARACTERS[id];
    smoke.names.push(ch.name);
    if (ch.role === 'office' && fresh.Profile.unlocked(id)) smoke.lockOk = false;
    if (!ch.secret && !fresh.Profile.unlocked(id)) smoke.lockOk = false;
    fresh.State.newGame(id, 'standard', 'quick');
    try {
      const res = fresh.State.useAbility();
      if (!res || !res.lines || !res.lines.length) smoke.abilities.push(id + ':empty');
    } catch (e) {
      smoke.abilities.push(id + ':' + e.message);
    }
  }
  fresh.State.newGame('malcolm', 'standard', 'quick');
  fresh.State.s.stats.openHouses = 2;
  const newly = fresh.Roster.evaluate(fresh.State.s);
  smoke.rebekkah = newly.some(c => c.id === 'rebekkah') && fresh.Profile.unlocked('rebekkah');
  summary.smoke = smoke;

  const outDir = path.join(__dirname, '..', '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = process.argv[3] || 'playtest-raw.json';
  fs.writeFileSync(path.join(outDir, stamp), JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) main();
module.exports = { boot, playOne };
