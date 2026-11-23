// The North Desk Trail. Oregon Trail, with a Pemberton SUV.
'use strict';

(function () {
  const G = globalThis.G;
  G.buildSprites();

  const app = document.getElementById('app');
  const keys = { left: false, right: false, up: false, down: false, throw: false };
  let screen = 'title';
  let state = null;
  let leadId = 'malcolm';
  let crewPick = [];
  let cart = { fuel: 0, coffee: 0, signs: 0, tires: 0, locks: 0, kits: 0 };
  let budget = 900;
  let hunt = null;
  let highway = null;
  let eventText = '';
  let crossing = null;
  let anim = 0;
  let pending = null;

  const view = document.getElementById('view');
  const ctx = view.getContext('2d');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function order() {
    const m = G.agentById('malcolm');
    const rest = G.ROSTER.filter(function (a) { return a.id !== 'malcolm'; });
    rest.sort(function (a, b) { return a.short < b.short ? -1 : a.short > b.short ? 1 : 0; });
    return [m].concat(rest);
  }

  function agent(id) { return G.agentById(id); }

  function paint(id, scale) {
    const cv = document.createElement('canvas');
    G.paintSprite(cv, agent(id).sprite, scale || 3);
    return cv;
  }

  function spent() {
    return G.Trail.STOCK.reduce(function (sum, item) {
      return sum + item.price * (cart[item.id] || 0);
    }, 0);
  }

  function show(html) {
    app.innerHTML = html;
    document.getElementById('stage').hidden = screen === 'title' || screen === 'lead' || screen === 'crew' || screen === 'store' || screen === 'tomb' || screen === 'score' || screen === 'event' || screen === 'crossing' || screen === 'town';
  }

  function title() {
    screen = 'title';
    show(
      '<p class="kicker">PEMBERTON REAL ESTATE</p>' +
      '<h1>THE NORTH DESK TRAIL</h1>' +
      '<p class="lede">Grand Rapids to the Lift Bridge. Four in the SUV. Do not run out of coffee.</p>' +
      '<p>An Oregon Trail for the corridor. Hunt leads. Dodge troopers on the ice. Reach Canal Park.</p>' +
      '<button class="btn" id="go" type="button">Pack the SUV</button>'
    );
    document.getElementById('go').onclick = leadScreen;
  }

  function leadScreen() {
    screen = 'lead';
    crewPick = [];
    show('<p class="kicker">LEAD AGENT</p><h1>WHO DRIVES</h1><p>Malcolm is first. Everyone is unlocked.</p><div class="cards" id="cards"></div>');
    const cards = document.getElementById('cards');
    order().forEach(function (a) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card' + (a.id === 'malcolm' ? ' on' : '');
      b.appendChild(paint(a.id));
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = a.short + (a.id === 'malcolm' ? ' · start here' : '');
      const pk = document.createElement('div');
      pk.className = 'pk';
      pk.textContent = a.perkName;
      b.appendChild(nm);
      b.appendChild(pk);
      b.onclick = function () { leadId = a.id; crewScreen(); };
      cards.appendChild(b);
    });
  }

  function crewScreen() {
    screen = 'crew';
    show(
      '<p class="kicker">CREW</p><h1>THREE MORE SEATS</h1>' +
      '<p>Pick 3 coworkers. <span id="count"></span></p><div class="cards" id="cards"></div>' +
      '<button class="btn" id="next" type="button" disabled>To the general store</button>'
    );
    const cards = document.getElementById('cards');
    order().forEach(function (a) {
      if (a.id === leadId) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card' + (crewPick.indexOf(a.id) !== -1 ? ' on' : '');
      b.appendChild(paint(a.id, 2));
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = a.short;
      const pk = document.createElement('div');
      pk.className = 'pk';
      pk.textContent = a.perkName;
      b.appendChild(nm);
      b.appendChild(pk);
      b.onclick = function () {
        const i = crewPick.indexOf(a.id);
        if (i === -1) {
          if (crewPick.length >= 3) return;
          crewPick.push(a.id);
        } else crewPick.splice(i, 1);
        crewScreen();
      };
      cards.appendChild(b);
    });
    document.getElementById('count').textContent = crewPick.length + ' / 3';
    const next = document.getElementById('next');
    next.disabled = crewPick.length !== 3;
    next.onclick = storeScreen;
  }

  function storeScreen() {
    screen = 'store';
    const faces = [leadId].concat(crewPick);
    show(
      '<p class="kicker">GRAND RAPIDS GENERAL STORE</p><h1>$' + (900 - spent()) + ' LEFT</h1>' +
      '<div class="crew" id="faces"></div>' +
      '<div id="stock"></div>' +
      '<button class="btn" id="depart" type="button">Leave Grand Rapids</button>'
    );
    const facesEl = document.getElementById('faces');
    faces.forEach(function (id) { facesEl.appendChild(paint(id, 2)); });
    const stock = document.getElementById('stock');
    G.Trail.STOCK.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'rowline';
      row.innerHTML = '<div><strong>' + esc(item.name) + '</strong> $' + item.price + '<br><span>' + esc(item.blurb) + '</span></div>';
      const controls = document.createElement('div');
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'btn alt tiny';
      minus.textContent = '−';
      const qty = document.createElement('b');
      qty.textContent = String(cart[item.id] || 0);
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'btn tiny';
      plus.textContent = '+';
      minus.onclick = function () {
        if (cart[item.id] > 0) cart[item.id] -= 1;
        storeScreen();
      };
      plus.onclick = function () {
        if (spent() + item.price <= 900) cart[item.id] += 1;
        storeScreen();
      };
      controls.appendChild(minus);
      controls.appendChild(qty);
      controls.appendChild(plus);
      row.appendChild(controls);
      stock.appendChild(row);
    });
    document.getElementById('depart').onclick = function () {
      state = G.Trail.fresh(leadId, crewPick);
      G.Trail.party(state).forEach(function (id) { state.health[id] = 100; });
      G.Trail.STOCK.forEach(function (item) { state[item.id] += cart[item.id]; });
      state.money = 900 - spent();
      cart = { fuel: 0, coffee: 0, signs: 0, tires: 0, locks: 0, kits: 0 };
      trailScreen();
    };
  }

  function dash() {
    const next = G.Trail.LANDMARKS[Math.min(state.nextStop, G.Trail.LANDMARKS.length - 1)];
    const health = Math.round(G.Trail.party(state).reduce(function (s, id) { return s + state.health[id]; }, 0) / 4);
    return '<div class="dash">' +
      '<span>DATE ' + esc(G.Trail.dateLabel(state)) + '</span>' +
      '<span>WEATHER ' + esc(state.weather) + '</span>' +
      '<span>CREW ' + health + '</span>' +
      '<span>COFFEE ' + state.coffee + '</span>' +
      '<span>FUEL ' + state.fuel + '</span>' +
      '<span>NEXT ' + esc(next.name) + '</span>' +
      '<span>MILES ' + state.miles + '</span>' +
      '</div>';
  }

  function trailScreen() {
    screen = 'trail';
    document.getElementById('stage').hidden = false;
    app.innerHTML = dash() +
      '<p id="log">' + esc(state.log[0] || '') + '</p>' +
      '<div class="rowline">' +
      '<button class="btn tiny" id="pace" type="button">Pace: ' + G.Trail.PACE[state.pace].label + '</button>' +
      '<button class="btn tiny" id="rations" type="button">Rations: ' + G.Trail.RATIONS[state.rations].label + '</button>' +
      '</div>' +
      '<div class="stack">' +
      '<button class="btn" id="go" type="button">Hit the road</button>' +
      '<button class="btn alt" id="hunt" type="button">Scout for leads</button>' +
      '<button class="btn alt" id="ice" type="button">Icy highway</button>' +
      '</div>';
    document.getElementById('pace').onclick = function () {
      const orderP = ['steady', 'hustle', 'grueling'];
      state.pace = orderP[(orderP.indexOf(state.pace) + 1) % 3];
      trailScreen();
    };
    document.getElementById('rations').onclick = function () {
      const orderR = ['generous', 'standard', 'bare'];
      state.rations = orderR[(orderR.indexOf(state.rations) + 1) % 3];
      trailScreen();
    };
    document.getElementById('go').onclick = function () {
      anim = 1.3;
      pending = 'travel';
    };
    document.getElementById('hunt').onclick = function () {
      if (state.signs <= 0) { state.log.unshift('No yard signs. The general store has them.'); trailScreen(); return; }
      state.signs -= 1;
      hunt = new G.Play.Hunt();
      screen = 'hunt';
      huntScreen();
    };
    document.getElementById('ice').onclick = function () {
      highway = new G.Play.Highway();
      screen = 'highway';
      highwayScreen();
    };
  }

  function huntScreen() {
    document.getElementById('stage').hidden = false;
    app.innerHTML = '<p class="kicker">LEAD HUNT</p><p>Toss yard signs at buyers and sellers. Skip the deer and the grumpy neighbors.</p>' +
      '<div class="rowline"><button class="btn tiny" data-k="left" type="button">Left</button>' +
      '<button class="btn tiny" data-k="right" type="button">Right</button>' +
      '<button class="btn tiny" data-k="up" type="button">Up</button>' +
      '<button class="btn tiny" data-k="down" type="button">Down</button>' +
      '<button class="btn tiny" id="throw" type="button">Throw</button></div>';
    bindHold();
    document.getElementById('throw').onclick = function () { keys.throw = true; };
  }

  function highwayScreen() {
    document.getElementById('stage').hidden = false;
    app.innerHTML = '<p class="kicker">ICY HIGHWAY</p><p>US-2, US-169, US-53. Dodge drifts, deer, holes, and troopers. Yellow slips are hot-buyer texts.</p>' +
      '<div class="rowline"><button class="btn tiny" data-k="left" type="button">Left</button>' +
      '<button class="btn tiny" data-k="right" type="button">Right</button></div>';
    bindHold();
  }

  function bindHold() {
    document.querySelectorAll('[data-k]').forEach(function (btn) {
      const k = btn.getAttribute('data-k');
      function down(e) { e.preventDefault(); keys[k] = true; }
      function up(e) { e.preventDefault(); keys[k] = false; }
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
    });
  }

  function eventScreen(text) {
    screen = 'event';
    document.getElementById('stage').hidden = true;
    app.innerHTML = '<p class="kicker">ON THE TRAIL</p><h1>SOMETHING HAPPENED</h1><p class="lede">' + esc(text) + '</p>' +
      '<button class="btn" id="ok" type="button">Keep rolling</button>';
    document.getElementById('ok').onclick = trailScreen;
  }

  function crossingScreen(mark) {
    screen = 'crossing';
    crossing = mark;
    document.getElementById('stage').hidden = true;
    const kind = mark.crossing === 'river' ? 'The Mississippi is up at Cohasset.' : 'A blizzard is sitting on the highway.';
    app.innerHTML = '<p class="kicker">' + esc(mark.name).toUpperCase() + '</p><h1>' + (mark.crossing === 'river' ? 'RIVER' : 'BLIZZARD') + '</h1>' +
      '<p class="lede">' + kind + '</p>' +
      '<div class="stack">' +
      '<button class="btn" id="wait" type="button">Wait it out</button>' +
      '<button class="btn" id="plow" type="button">Plow through</button>' +
      '<button class="btn alt" id="detour" type="button">Take the detour</button></div>';
    document.getElementById('wait').onclick = function () {
      state.day += 1;
      state.date = new Date(state.date.getTime() + 86400000);
      state.weather = 'Cloudy';
      state.morale = Math.min(100, state.morale + 2);
      state.log.unshift('You waited. The road opened.');
      townScreen(mark, false);
    };
    document.getElementById('plow').onclick = function () {
      highway = new G.Play.Highway();
      highway.fromCrossing = true;
      highway.mark = mark;
      screen = 'highway';
      highwayScreen();
    };
    document.getElementById('detour').onclick = function () {
      state.fuel = Math.max(0, state.fuel - 1);
      state.miles += 4;
      state.log.unshift('Detour. Longer, quieter, thirstier.');
      if (state.fuel <= 0) return tomb('gas');
      townScreen(mark, false);
    };
  }

  function townScreen(mark, done) {
    screen = 'town';
    document.getElementById('stage').hidden = true;
    app.innerHTML = '<p class="kicker">LANDMARK</p><h1>' + esc(mark.name).toUpperCase() + '</h1>' +
      '<p class="lede">' + esc(mark.detail) + '</p>' +
      '<div class="stack">' +
      (done ? '<button class="btn" id="finish" type="button">See the score</button>' : '') +
      '<button class="btn" id="rest" type="button">Rest the crew</button>' +
      '<button class="btn" id="close" type="button">Close a local deal</button>' +
      '<button class="btn alt" id="on" type="button">Back on the trail</button></div>';
    const fin = document.getElementById('finish');
    if (fin) fin.onclick = function () { scoreScreen(); };
    document.getElementById('rest').onclick = function () {
      G.Trail.heal(state, 18);
      state.morale = Math.min(100, state.morale + 6);
      state.day += 1;
      state.date = new Date(state.date.getTime() + 86400000);
      state.log.unshift('Rest at ' + mark.name + '.');
      trailScreen();
    };
    document.getElementById('close').onclick = function () {
      if (state.signs <= 0) { state.log.unshift('No signs left to plant.'); trailScreen(); return; }
      state.signs -= 1;
      state.deals += 1;
      state.money += 220;
      state.log.unshift('Closed one at ' + mark.name + '.');
      trailScreen();
    };
    document.getElementById('on').onclick = trailScreen;
  }

  function tomb(why) {
    screen = 'tomb';
    document.getElementById('stage').hidden = true;
    const who = agent(state.lead).short;
    const where = G.Trail.nextName(state);
    const cause = why === 'gas' ? 'ran out of gas' : 'the crew could not go another mile';
    app.innerHTML = '<p class="kicker">TOMBSTONE</p><h1>HERE LIES ' + esc(who).toUpperCase() + '\'S SUV</h1>' +
      '<p class="lede">' + esc(cause) + ' outside ' + esc(where) + '.</p>' +
      '<p>' + state.miles + ' miles. ' + state.deals + ' deals. The coffee was ' + state.coffee + '.</p>' +
      '<button class="btn" id="again" type="button">Try the trail again</button>';
    saveHof(false);
    document.getElementById('again').onclick = title;
  }

  function scoreScreen() {
    screen = 'score';
    document.getElementById('stage').hidden = true;
    const points = G.Trail.score(state);
    saveHof(true);
    const hof = loadHof();
    app.innerHTML = '<p class="kicker">CANAL PARK</p><h1>YOU REACHED THE BRIDGE</h1>' +
      '<p class="lede">' + esc(agent(state.lead).name) + ' and the crew made Duluth.</p>' +
      '<p>Miles ' + state.miles + ' · Deals ' + state.deals + ' · Cash $' + state.money + ' · Days ' + state.day + '</p>' +
      '<p>Score ' + points + '</p><h2>Hall of fame</h2>' +
      hof.map(function (row, i) { return '<p>' + (i + 1) + '. ' + esc(row.name) + ' — ' + row.score + '</p>'; }).join('') +
      '<button class="btn" id="again" type="button">Ride again</button>';
    document.getElementById('again').onclick = title;
  }

  function loadHof() {
    try { return JSON.parse(localStorage.getItem('north-desk-trail-hof') || '[]'); } catch (e) { return []; }
  }

  function saveHof(won) {
    const row = { name: agent(state.lead).short, score: G.Trail.score(state) + (won ? 500 : 0), won: !!won };
    const list = loadHof();
    list.push(row);
    list.sort(function (a, b) { return b.score - a.score; });
    try { localStorage.setItem('north-desk-trail-hof', JSON.stringify(list.slice(0, 5))); } catch (e) { /* ignore */ }
  }

  function afterTravel(result) {
    if (!result) return trailScreen();
    if (result.dead) return tomb(result.dead);
    if (result.arrived && result.arrived.crossing && !result.done) {
      state.log.unshift(result.arrived.name + '. ' + result.arrived.detail);
      return crossingScreen(result.arrived);
    }
    if (result.arrived) {
      state.log.unshift(result.arrived.name + '. ' + result.arrived.detail);
      return townScreen(result.arrived, result.done);
    }
    if (result.notes && result.notes.length > 1) return eventScreen(result.notes.slice(1).join(' '));
    trailScreen();
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - (loop.last || t)) / 1000);
    loop.last = t;
    if (screen === 'trail' || screen === 'hunt' || screen === 'highway') {
      const miles = state ? state.miles : 0;
      if (screen === 'trail') {
        anim = Math.max(0, anim - dt);
        G.Play.drawTravel(ctx, view.width, view.height, miles, t / 1000, state ? agent(state.lead) : agent('malcolm'));
        if (anim <= 0 && pending === 'travel') {
          pending = null;
          afterTravel(G.Trail.travel(state));
        }
      } else if (screen === 'hunt' && hunt) {
        hunt.update(dt, keys);
        hunt.draw(ctx, view.width, view.height, agent(state.lead).sprite);
        if (hunt.over) {
          state.deals += hunt.score > 4 ? 1 : 0;
          state.morale = Math.min(100, state.morale + hunt.score);
          state.log.unshift('Lead hunt: ' + hunt.score + ' signs that stuck.');
          hunt = null;
          trailScreen();
        }
      } else if (screen === 'highway' && highway) {
        highway.update(dt, keys);
        highway.draw(ctx, view.width, view.height);
        if (highway.over) {
          const fromCrossing = highway.fromCrossing;
          if (highway.ticket) {
            state.money = Math.max(0, state.money - 150);
            state.log.unshift('A trooper liked your texting. $150, and a wink.');
          }
          if (highway.hits >= 5) {
            G.Trail.hurt(state, 10);
            state.fuel = Math.max(0, state.fuel - 1);
            state.log.unshift('The ice won a round.');
          } else {
            state.miles += 6 + highway.texts * 2;
            state.morale = Math.min(100, state.morale + 4);
            state.log.unshift('You made the icy stretch.');
          }
          const mark = highway.mark;
          highway = null;
          if (!G.Trail.party(state).some(function (id) { return state.health[id] > 0; })) return tomb('crew');
          if (fromCrossing && mark) townScreen(mark, false);
          else trailScreen();
        }
      }
    }
    requestAnimationFrame(loop);
  }

  const keyMap = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
  };
  window.addEventListener('keydown', function (e) {
    const name = keyMap[e.key];
    if (name) { keys[name] = true; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'e' || e.key === 'E') { keys.throw = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', function (e) {
    const name = keyMap[e.key];
    if (name) keys[name] = false;
  });

  window.addEventListener('error', function (e) {
    const pre = document.createElement('pre');
    pre.id = 'err';
    pre.textContent = String(e.message || e.error);
    document.body.appendChild(pre);
  });

  const shot = new URLSearchParams(location.search).get('shot');
  if (shot === 'crew') {
    leadId = 'malcolm';
    crewPick = ['liz', 'bridger', 'tania'];
    storeScreen();
  } else if (shot === 'trail' || shot === 'hunt' || shot === 'highway') {
    leadId = 'malcolm';
    crewPick = ['kaila', 'gaige', 'liz'];
    state = G.Trail.fresh(leadId, crewPick);
    G.Trail.party(state).forEach(function (id) { state.health[id] = 100; });
    state.miles = shot === 'highway' ? 140 : 40;
    if (shot === 'hunt') {
      hunt = new G.Play.Hunt();
      screen = 'hunt';
      huntScreen();
    } else if (shot === 'highway') {
      highway = new G.Play.Highway();
      screen = 'highway';
      highwayScreen();
    } else trailScreen();
  } else title();

  requestAnimationFrame(loop);
})();
