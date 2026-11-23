// North Desk. The whole Grand Rapids office, one season on the corridor.
'use strict';

(function () {
  const G = globalThis.G;
  G.buildSprites();
  const app = document.getElementById('app');
  let screen = 'title';
  let selected = null;
  let state = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function canvasFor(agent, scale) {
    const cv = document.createElement('canvas');
    cv.className = 'sprite';
    cv.setAttribute('aria-hidden', 'true');
    G.paintSprite(cv, agent.sprite, scale);
    return cv;
  }

  function mount(html) {
    app.innerHTML = html;
  }

  function go(next) {
    screen = next;
    draw();
    window.scrollTo(0, 0);
  }

  function drawBanner() {
    const wrap = document.createElement('div');
    wrap.className = 'banner-wrap';
    const cv = document.createElement('canvas');
    G.drawBanner(cv);
    wrap.appendChild(cv);
    return wrap;
  }

  function renderTitle() {
    mount(
      '<p class="kicker">PEMBERTON REAL ESTATE</p>' +
      '<h1>NORTH DESK</h1>' +
      '<p class="lede">One office. Every agent. Grand Rapids, the Iron Range, and Duluth.</p>' +
      '<p>Twelve weeks. Fall, winter, thaw, summer. You play as anyone. The rest of the desk keeps working. The Grand Rapids desk wins by closing more homes than the Range desk and the Duluth desk.</p>' +
      '<div class="rail" id="rail"></div>' +
      '<div class="stack" style="margin-top:12px">' +
      '<button class="btn" id="go-select" type="button">See the whole desk</button>' +
      '<button class="btn alt" id="go-how" type="button">How the season works</button>' +
      '</div>'
    );
    app.insertBefore(drawBanner(), app.firstChild);
    const rail = document.getElementById('rail');
    G.ROSTER.forEach(function (a) { rail.appendChild(canvasFor(a, 2)); });
    document.getElementById('go-select').onclick = function () { go('select'); };
    document.getElementById('go-how').onclick = function () { go('how'); };
  }

  function townList(region) {
    return G.townsIn(region).map(function (t) { return esc(t.name); }).join(', ');
  }

  function renderHow() {
    mount(
      '<p class="kicker">HOW TO PLAY</p>' +
      '<h1>THE SEASON</h1>' +
      '<p class="lede">You are one agent on a full desk. Nobody carries the season alone.</p>' +
      '<p>Each week, two cards show up on the corridor. Take the one that fits your perk when you can. Then make the call. Three choices. One of them is the work you actually do.</p>' +
      '<p>Your perk fires when you take your kind of card. It is not stronger than anyone else\'s. A finished personal story adds one closing for the desk, same for every agent.</p>' +
      '<p>Win: Grand Rapids closings, yours plus the desk\'s, ahead of both the Range desk and the Duluth desk.</p>' +
      '<p class="group-label">GRAND RAPIDS</p><p>' + townList('home') + '</p>' +
      '<p class="group-label">IRON RANGE</p><p>' + townList('range') + '</p>' +
      '<p class="group-label">DULUTH</p><p>' + townList('duluth') + '</p>' +
      '<div class="stack" style="margin-top:12px">' +
      '<button class="btn" id="go-select" type="button">Choose an agent</button>' +
      '<button class="btn alt" id="go-title" type="button">Back</button>' +
      '</div>'
    );
    document.getElementById('go-select').onclick = function () { go('select'); };
    document.getElementById('go-title').onclick = function () { go('title'); };
  }

  function renderSelect() {
    mount(
      '<p class="kicker">EVERYONE IS IN</p>' +
      '<h1>THE DESK</h1>' +
      '<p>All ' + G.ROSTER.length + ' agents are unlocked. Pick who you will play. The others stay on the desk.</p>' +
      '<div class="cards" id="cards"></div>' +
      '<div id="detail"></div>' +
      '<div class="stack" style="margin-top:12px">' +
      '<button class="btn" id="play" type="button" disabled>Pick someone</button>' +
      '<button class="btn alt" id="back" type="button">Back</button>' +
      '</div>'
    );
    const cards = document.getElementById('cards');
    G.ROSTER.forEach(function (a) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card' + (selected === a.id ? ' on' : '');
      b.appendChild(canvasFor(a, 3));
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = a.short;
      const pk = document.createElement('div');
      pk.className = 'pk';
      pk.textContent = a.perkName;
      b.appendChild(nm);
      b.appendChild(pk);
      b.onclick = function () {
        selected = a.id;
        try { localStorage.setItem('north-desk-agent', a.id); } catch (e) { /* ignore */ }
        renderSelect();
        const det = document.getElementById('detail');
        if (det) det.scrollIntoView({ block: 'nearest' });
      };
      cards.appendChild(b);
    });
    const detail = document.getElementById('detail');
    const play = document.getElementById('play');
    if (selected) {
      const a = G.agentById(selected);
      detail.innerHTML =
        '<div class="detail" style="margin-top:12px">' +
        '<h2>' + esc(a.name) + '</h2>' +
        '<p class="catch">' + esc(a.title) + ' · ' + esc(a.perkName) + '</p>' +
        '<p>"' + esc(a.catchphrase) + '"</p>' +
        a.bio.map(function (line) { return '<p>' + esc(line) + '</p>'; }).join('') +
        '<p>' + esc(a.perkBlurb) + '</p>' +
        '<p>Story: ' + esc(a.storyTitle) + '</p>' +
        '</div>';
      play.disabled = false;
      play.textContent = 'Play as ' + a.short;
    }
    play.onclick = function () { if (selected) startGame(selected); };
    document.getElementById('back').onclick = function () { go('title'); };
  }

  function startGame(id) {
    selected = id;
    state = G.Rules.newGame(id);
    G.Rules.beginWeek(state, Math.random);
    screen = 'play';
    draw();
  }

  function regionPills(here) {
    const parts = [];
    ['home', 'range', 'duluth'].forEach(function (region) {
      parts.push('<div class="group-label">' + esc(G.REGIONS[region].label) + '</div><div class="towns">');
      G.townsIn(region).forEach(function (t) {
        const on = here && t.id === here ? ' class="here"' : '';
        parts.push('<i' + on + '>' + esc(t.name) + '</i>');
      });
      parts.push('</div>');
    });
    return parts.join('');
  }

  function scoreBlock() {
    const pendingStory = state.storyBeats >= 4 ? G.BALANCE.storyBonus : 0;
    const us = state.units + state.teammates + pendingStory;
    return (
      '<div class="score">' +
      '<div class="us"><strong>' + us + '</strong><span>GRAND RAPIDS</span></div>' +
      '<div class="range"><strong>' + state.rangeUnits + '</strong><span>RANGE DESK</span></div>' +
      '<div class="duluth"><strong>' + state.duluthUnits + '</strong><span>DULUTH DESK</span></div>' +
      '</div>' +
      '<div class="regions">' +
      '<span>HOME ' + state.regions.home + '</span>' +
      '<span>RANGE ' + state.regions.range + '</span>' +
      '<span>DULUTH ' + state.regions.duluth + '</span>' +
      '<span>YOU ' + state.units + ' · DESK ' + state.teammates + '</span>' +
      '<span>STORY ' + state.storyBeats + '/4</span>' +
      '</div>'
    );
  }

  function renderPlay() {
    const a = G.agentById(state.agentId);
    const shownWeek = Math.min(state.week, G.BALANCE.weeks - 1);
    const season = G.Flavor.season(shownWeek);
    const weekLabel = state.phase === 'done'
      ? 'SEASON OVER'
      : season.name.toUpperCase() + ' · WEEK ' + (shownWeek + 1) + '/' + G.BALANCE.weeks;
    mount('<div id="top"></div><div id="body"></div>');
    const top = document.getElementById('top');
    top.innerHTML =
      '<div class="meta"><span>' + esc(weekLabel) + '</span>' +
      '<span>' + esc(season.line) + '</span></div>' +
      scoreBlock() +
      '<div class="who" id="who"></div>' +
      '<div class="rail" id="rail"></div>';
    const who = document.getElementById('who');
    who.appendChild(canvasFor(a, 3));
    const label = document.createElement('div');
    label.innerHTML = '<div class="name">' + esc(a.name) + '</div><div class="perk">' + esc(a.perkName) + '</div>';
    who.appendChild(label);
    const rail = document.getElementById('rail');
    G.ROSTER.forEach(function (mate) {
      const cv = canvasFor(mate, 2);
      if (mate.id === a.id) cv.classList.add('on');
      rail.appendChild(cv);
    });

    const body = document.getElementById('body');
    const phase = state.phase;
    if (phase === 'offer') renderOffers(body, a);
    else if (phase === 'call') renderCall(body, a);
    else if (phase === 'story') renderStory(body, a);
    else if (phase === 'recap') renderRecap(body);
    else if (phase === 'done') renderDone(body, a);
    else {
      const never = phase;
      body.textContent = 'Lost the week: ' + never;
    }
  }

  function renderOffers(body, a) {
    const here = state.job && state.job.townId;
    let html = '<h2>Pick a card</h2><div class="stack" id="offers"></div>' + regionPills(here);
    body.innerHTML = html;
    const box = document.getElementById('offers');
    state.offers.forEach(function (job, i) {
      const mine = job.perkTag === a.perkId;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn' + (mine ? ' good' : '');
      b.innerHTML = '<strong>' + esc(job.title) + ' · ' + esc(job.townName) + '</strong><br>' +
        esc(job.text) +
        (mine ? '<br><span class="hint">Your perk is on this card.</span>' : '');
      b.onclick = function () {
        G.Rules.chooseOffer(state, i);
        draw();
      };
      box.appendChild(b);
    });
  }

  function renderCall(body, a) {
    const job = state.job;
    const showHint = a.perkId === 'know' && job.region === 'duluth' && job.hint;
    body.innerHTML =
      '<h2>' + esc(job.title) + ' · ' + esc(job.townName) + '</h2>' +
      '<p class="lede">' + esc(job.text) + '</p>' +
      (showHint ? '<p class="hint">' + esc(job.hint) + '</p>' : '') +
      '<div class="stack" id="calls"></div>' +
      regionPills(job.townId);
    const box = document.getElementById('calls');
    job.choices.forEach(function (choice, i) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = choice;
      b.onclick = function () {
        G.Rules.chooseCall(state, i, Math.random);
        draw();
      };
      box.appendChild(b);
    });
  }

  function renderStory(body, a) {
    const beat = a.beats[state.storyBeats];
    const job = state.result;
    if (!beat) {
      state.phase = 'recap';
      renderRecap(body);
      return;
    }
    body.innerHTML =
      '<p class="stamp ' + (job.ok ? '' : 'no') + '">' + (job.ok ? 'CLOSED' : 'STILL OPEN') + '</p>' +
      '<p>' + esc(job.line) + '</p>' +
      '<h2>' + esc(a.storyTitle) + '</h2>' +
      '<p class="lede">' + esc(beat.text) + '</p>' +
      '<div class="stack">' +
      '<button class="btn" id="sa" type="button">' + esc(beat.a) + '</button>' +
      '<button class="btn alt" id="sb" type="button">' + esc(beat.b) + '</button>' +
      '</div>';
    document.getElementById('sa').onclick = function () {
      G.Rules.chooseStory(state, 0);
      draw();
    };
    document.getElementById('sb').onclick = function () {
      G.Rules.chooseStory(state, 1);
      draw();
    };
  }

  function renderRecap(body) {
    const job = state.result;
    const note = state.storyPick ? '<p>Story: ' + esc(state.storyPick) + '</p>' : '';
    body.innerHTML =
      '<p class="stamp ' + (job.ok ? '' : 'no') + '">' + (job.ok ? 'CLOSED' : 'STILL OPEN') + '</p>' +
      '<p class="lede">' + esc(job.line) + '</p>' +
      note +
      '<ul class="log">' + state.log.map(function (line) { return '<li>' + esc(line) + '</li>'; }).join('') + '</ul>' +
      '<div class="stack" style="margin-top:12px"><button class="btn" id="next" type="button">Next week</button></div>';
    document.getElementById('next').onclick = function () {
      G.Rules.endWeek(state, Math.random);
      draw();
    };
  }

  function renderDone(body, a) {
    const score = G.Rules.officeScore(state);
    const headline = state.won
      ? 'The Grand Rapids desk takes the season.'
      : state.tied
        ? 'The Grand Rapids desk finishes level for the season.'
        : 'Another desk finishes ahead. The corridor is still the office\'s.';
    body.innerHTML =
      '<h2>' + esc(headline) + '</h2>' +
      '<p class="lede">You played as ' + esc(a.name) + '. Story: ' + esc(a.storyTitle) + ' (' + state.storyBeats + '/4).</p>' +
      '<p>Grand Rapids ' + score + ' · Range desk ' + state.rangeUnits + ' · Duluth desk ' + state.duluthUnits + '.</p>' +
      '<p>Your closings ' + state.units + '. The rest of the desk ' + state.teammates + '.</p>' +
      '<ul class="log">' + state.log.map(function (line) { return '<li>' + esc(line) + '</li>'; }).join('') + '</ul>' +
      '<div class="stack" style="margin-top:12px">' +
      '<button class="btn" id="again" type="button">Same agent, new season</button>' +
      '<button class="btn alt" id="switch" type="button">Pick someone else</button>' +
      '</div>';
    document.getElementById('again').onclick = function () { startGame(a.id); };
    document.getElementById('switch').onclick = function () { go('select'); };
  }

  function draw() {
    if (screen === 'title') renderTitle();
    else if (screen === 'how') renderHow();
    else if (screen === 'select') renderSelect();
    else if (screen === 'play') renderPlay();
    else {
      const never = screen;
      app.textContent = 'Unknown screen ' + never;
    }
  }

  try {
    const saved = localStorage.getItem('north-desk-agent');
    if (saved && G.agentById(saved).id === saved) selected = saved;
  } catch (e) { /* ignore */ }

  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot === 'select') screen = 'select';
  if (shot === 'how') screen = 'how';
  if (shot === 'play') {
    startGame(params.get('as') || 'tania');
    return;
  }
  draw();
})();
