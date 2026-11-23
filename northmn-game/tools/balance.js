// Simulated seasons. Same rules as the browser game.
// node tools/balance.js
// node tools/balance.js --sample tania
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', 'src');
const context = { console: console, Math: Math };
vm.createContext(context);
['palette.js', 'towns.js', 'perks.js', 'roster.js', 'flavor.js', 'rules.js'].forEach(function (file) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
});

const G = context.G;
const BANNED_TOWNS = ['brainerd', 'bemidji', 'aitkin', 'cloquet', 'mora', 'ely', 'bigfork', 'tower', 'virginia mn'];
const BANNED_PEOPLE = ['tyler', 'blake', 'brad'];
const BANNED_WORDS = ['prayer chain', "pastor's wife", 'pastors wife'];

function fail(msg) {
  console.error('FAIL ' + msg);
  process.exitCode = 1;
}

const townNames = G.TOWNS.map(function (t) { return t.name; });
const expectedTowns = [
  'Cohasset', 'Grand Rapids', 'Coleraine', 'Bovey', 'Nashwauk', 'Keewatin',
  'Hibbing', 'Chisholm', 'Buhl', 'Mountain Iron', 'Virginia', 'Eveleth',
  'Gilbert', 'Biwabik', 'Aurora', 'Hoyt Lakes', 'Hermantown', 'Proctor', 'Duluth',
];
expectedTowns.forEach(function (name) {
  if (townNames.indexOf(name) === -1) fail('missing town ' + name);
});
if (townNames.length !== expectedTowns.length) fail('town count ' + townNames.length);
townNames.forEach(function (name) {
  if (BANNED_TOWNS.indexOf(name.toLowerCase()) !== -1) fail('banned town ' + name);
});

const ids = {};
G.ROSTER.forEach(function (a) {
  if (ids[a.id]) fail('duplicate id ' + a.id);
  ids[a.id] = true;
  if (!G.PERK_RULES[a.perkId]) fail('no perk rule ' + a.perkId);
  if (BANNED_PEOPLE.indexOf(a.id) !== -1) fail('banned person ' + a.id);
  const blob = JSON.stringify(a).toLowerCase();
  BANNED_WORDS.forEach(function (w) {
    if (blob.indexOf(w) !== -1) fail(a.id + ' has banned phrase ' + w);
  });
  if (!a.beats || a.beats.length !== 4) fail(a.id + ' needs 4 story beats');
});
if (G.ROSTER.length !== 18) fail('expected 18 agents, got ' + G.ROSTER.length);

const sample = process.argv.indexOf('--sample');
if (sample !== -1) {
  const id = process.argv[sample + 1] || 'tania';
  const game = G.Rules.autoSeason(id, Math.random);
  console.log(JSON.stringify({
    agent: id,
    won: game.won,
    office: G.Rules.officeScore(game),
    you: game.units,
    desk: game.teammates,
    range: game.rangeUnits,
    duluth: game.duluthUnits,
    story: game.storyBeats,
    regions: game.regions,
    log: game.log,
  }, null, 2));
  process.exit(process.exitCode || 0);
}

const runs = G.BALANCE.runs;
const rows = [];
G.ROSTER.forEach(function (a) {
  let wins = 0;
  let ties = 0;
  let office = 0;
  let you = 0;
  for (let i = 0; i < runs; i++) {
    const game = G.Rules.autoSeason(a.id, Math.random);
    if (game.won) wins += 1;
    if (game.tied) ties += 1;
    office += G.Rules.officeScore(game);
    you += game.units;
  }
  rows.push({
    id: a.id,
    name: a.name,
    perk: a.perkName,
    win: wins / runs,
    tie: ties / runs,
    office: office / runs,
    you: you / runs,
  });
});

rows.sort(function (a, b) { return a.win - b.win; });
const lo = rows[0].win;
const hi = rows[rows.length - 1].win;
console.log('runs ' + runs + '  skill ' + G.BALANCE.skill + '  nicheBonus ' + G.BALANCE.nicheBonus);
console.log('name                     perk                  win%   tie%   office  you');
rows.forEach(function (r) {
  const line = [
    r.name.padEnd(24),
    r.perk.padEnd(20),
    (r.win * 100).toFixed(1).padStart(5),
    (r.tie * 100).toFixed(1).padStart(6),
    r.office.toFixed(2).padStart(7),
    r.you.toFixed(2).padStart(6),
  ].join('  ');
  console.log(line);
});
console.log('spread ' + (lo * 100).toFixed(1) + '% – ' + (hi * 100).toFixed(1) + '%');
const outside = rows.filter(function (r) { return r.win < 0.40 || r.win > 0.60; });
if (outside.length) {
  outside.forEach(function (r) { fail(r.name + ' win rate ' + (r.win * 100).toFixed(1)); });
} else {
  console.log('PASS all agents inside 40–60%');
}
