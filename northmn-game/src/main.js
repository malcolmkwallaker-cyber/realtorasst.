// Title, character select, HUD, phone, and the frame loop.
'use strict';

(function () {
  const G = globalThis.G;
  G.buildSprites();

  const app = document.getElementById('app');
  const play = document.getElementById('play');
  const view = document.getElementById('view');
  const ctx = view.getContext('2d');
  const atlas = document.getElementById('atlas');
  const atlasCtx = atlas.getContext('2d');
  let selected = 'malcolm';
  let mode = 'title';
  let battlePage = 'main';
  let stamp = '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function order() {
    const malcolm = G.agentById('malcolm');
    const rest = G.ROSTER.filter(function (a) { return a.id !== 'malcolm'; });
    rest.sort(function (a, b) { return a.short < b.short ? -1 : a.short > b.short ? 1 : 0; });
    return [malcolm].concat(rest);
  }

  function showTitle() {
    mode = 'title';
    app.hidden = false;
    play.hidden = true;
    const cont = G.Save.load();
    app.innerHTML =
      '<p class="kicker">PEMBERTON REAL ESTATE</p>' +
      '<h1>NORTH DESK</h1>' +
      '<p class="lede">Top-down on US-2, US-169, and US-53. Drive, hop out, walk the house, close the deal.</p>' +
      '<p>Troopers mind the highways. Pull over to text, or answer while moving and enjoy the lights. A ticket is $150 and a joke. Never a game over.</p>' +
      '<div class="stack">' +
      '<button class="btn" id="new" type="button">New game</button>' +
      (cont ? '<button class="btn alt" id="cont" type="button">Continue as ' + esc(G.agentById(cont.id).short) + '</button>' : '') +
      '</div>';
    document.getElementById('new').onclick = function () { showSelect(); };
    const c = document.getElementById('cont');
    if (c) c.onclick = function () { begin(cont); };
  }

  function showSelect() {
    mode = 'select';
    app.hidden = false;
    play.hidden = true;
    app.innerHTML =
      '<p class="kicker">THE WHOLE DESK</p>' +
      '<h1>PICK A DRIVER</h1>' +
      '<p>Malcolm is first. All 18 are unlocked. Everyone else is back at the Grand Rapids office.</p>' +
      '<div class="cards" id="cards"></div>' +
      '<div class="stack" style="margin-top:12px">' +
      '<button class="btn" id="begin" type="button">Drive as Malcolm</button>' +
      '<button class="btn alt" id="back" type="button">Back</button>' +
      '</div>';
    const cards = document.getElementById('cards');
    order().forEach(function (a) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card' + (selected === a.id ? ' on' : '');
      const cv = document.createElement('canvas');
      G.paintSprite(cv, a.sprite, 3);
      b.appendChild(cv);
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = a.short + (a.id === 'malcolm' ? ' · start here' : '');
      const pk = document.createElement('div');
      pk.className = 'pk';
      pk.textContent = a.perkName;
      b.appendChild(nm);
      b.appendChild(pk);
      b.onclick = function () { selected = a.id; showSelect(); };
      cards.appendChild(b);
    });
    document.getElementById('begin').textContent = 'Drive as ' + G.agentById(selected).short;
    document.getElementById('begin').onclick = function () {
      G.Save.clear();
      begin(G.Save.fresh(selected));
    };
    document.getElementById('back').onclick = showTitle;
  }

  function begin(save) {
    mode = 'play';
    stamp = '';
    app.hidden = true;
    play.hidden = false;
    battlePage = 'main';
    G.Game.start(save.id, save);
    G.Audio.blip();
  }

  function sync() {
    if (mode !== 'play') return;
    const v = G.Game.view();
    const s = v.save;
    document.getElementById('who').textContent = v.who.short + ' LV' + s.lv + ' · ' + v.vehicle;
    document.getElementById('where').textContent = v.place === 'world'
      ? (v.inCar ? 'Driving ' + v.speed : 'On foot')
      : (v.place === 'office' ? 'Pemberton Office' : 'Home tour ' + v.tour + '/4');
    document.getElementById('cash').textContent = '$' + s.money + ' · deals ' + s.deals;
    document.querySelector('#hp > i').style.width = Math.round(100 * s.energy / s.energyMax) + '%';
    document.querySelector('#mp > i').style.width = Math.round(100 * s.focus / s.focusMax) + '%';
    document.getElementById('notice').textContent = v.notice;
    document.getElementById('heat').hidden = !v.wanted;
    document.getElementById('heat').textContent = v.wanted ? 'WANTED *  pull over for a $150 joke ticket, or lose them' : '';
    document.getElementById('mute').textContent = G.Audio.muted() ? 'Sound off' : 'Sound on';

    const sig = [
      v.menu || '',
      v.phone ? v.phone.from + v.phone.text : '',
      v.dialogue ? v.dialogue.i + v.dialogue.lines[v.dialogue.i] : '',
      v.battle ? v.battle.phase + ':' + battlePage + ':' + v.battle.log.length + ':' + v.battle.hp : '',
      v.tour,
      s.money,
      v.place,
    ].join('|');
    if (sig === stamp) return;
    stamp = sig;

    const phone = document.getElementById('phone');
    if (v.phone) {
      phone.hidden = false;
      phone.innerHTML =
        '<h2>' + esc(v.phone.from) + '</h2>' +
        '<p class="lede">' + esc(v.phone.text) + '</p>' +
        '<div class="cmds">' +
        '<button class="btn good" id="reply-safe" type="button">Pull over and reply</button>' +
        '<button class="btn" id="reply-risk" type="button">Reply while driving</button>' +
        '</div>';
      document.getElementById('reply-safe').onclick = function () { G.Game.reply(false); };
      document.getElementById('reply-risk').onclick = function () { G.Game.reply(true); };
    } else phone.hidden = true;

    const dlg = document.getElementById('dialogue');
    if (v.dialogue) {
      dlg.hidden = false;
      document.getElementById('dlg-who').textContent = v.dialogue.speaker;
      document.getElementById('dlg-text').textContent = v.dialogue.lines[v.dialogue.i];
    } else dlg.hidden = true;

    const battle = document.getElementById('battle');
    if (v.battle) {
      battle.hidden = false;
      document.getElementById('foe').textContent = v.battle.title;
      document.querySelector('#deal > i').style.width = Math.round(100 * v.battle.hp / v.battle.max) + '%';
      document.getElementById('deal-n').textContent = v.battle.hp + '/' + v.battle.max;
      document.getElementById('log').innerHTML = v.battle.log.slice(-3).map(function (line) {
        return '<div>' + esc(line) + '</div>';
      }).join('');
      const cmds = document.getElementById('cmds');
      if (v.battle.phase !== 'fight') {
        cmds.innerHTML = '<button class="btn good" id="battle-done" type="button">' +
          (v.battle.phase === 'won' ? 'Pocket the commission' : 'They will call back') + '</button>';
        document.getElementById('battle-done').onclick = function () { G.Game.closeBattle(); };
      } else if (battlePage === 'skills') {
        cmds.innerHTML = v.skills.map(function (sk) {
          return '<button class="btn" data-skill="' + esc(sk.id) + '" type="button">' + esc(sk.name) + ' · ' + sk.cost + ' Focus</button>';
        }).join('') + '<button class="btn alt" id="cmd-back" type="button">Back</button>';
        cmds.querySelectorAll('[data-skill]').forEach(function (btn) {
          btn.onclick = function () { G.Game.battleAct('skill', btn.getAttribute('data-skill')); battlePage = 'main'; };
        });
        document.getElementById('cmd-back').onclick = function () { battlePage = 'main'; };
      } else if (battlePage === 'items') {
        [['coffee', 'Caribou Coffee'], ['staging', 'Staging Kit'], ['tires', 'Snow Tires'], ['drone', 'Drone'], ['snack', 'Onion-Free Snack']].forEach(function () {});
        const items = [['coffee', 'Caribou Coffee'], ['staging', 'Staging Kit'], ['tires', 'Snow Tires'], ['drone', 'Drone'], ['snack', 'Onion-Free Snack']];
        cmds.innerHTML = items.map(function (it) {
          return '<button class="btn" data-item="' + it[0] + '" type="button">' + it[1] + ' × ' + (s.items[it[0]] || 0) + '</button>';
        }).join('') + '<button class="btn alt" id="cmd-back" type="button">Back</button>';
        cmds.querySelectorAll('[data-item]').forEach(function (btn) {
          btn.onclick = function () { G.Game.battleAct('item', btn.getAttribute('data-item')); battlePage = 'main'; };
        });
        document.getElementById('cmd-back').onclick = function () { battlePage = 'main'; };
      } else {
        cmds.innerHTML =
          '<button class="btn" id="cmd-pitch" type="button">Pitch</button>' +
          '<button class="btn" id="cmd-skills" type="button">Skills</button>' +
          '<button class="btn" id="cmd-items" type="button">Items</button>' +
          '<button class="btn" id="cmd-backup" type="button">Backup</button>';
        document.getElementById('cmd-pitch').onclick = function () { G.Game.battleAct('pitch'); };
        document.getElementById('cmd-skills').onclick = function () { battlePage = 'skills'; };
        document.getElementById('cmd-items').onclick = function () { battlePage = 'items'; };
        document.getElementById('cmd-backup').onclick = function () { G.Game.battleAct('backup'); };
      }
    } else battle.hidden = true;

    const menu = document.getElementById('menu');
    const atlasWrap = document.getElementById('atlas-wrap');
    if (v.menu === 'map') {
      menu.hidden = true;
      atlasWrap.hidden = false;
      G.Game.drawFullMap(atlasCtx, atlas.width, atlas.height);
    } else {
      atlasWrap.hidden = true;
      if (!v.menu) menu.hidden = true;
      else if (v.menu === 'quest') {
        menu.hidden = false;
        menu.innerHTML = '<h2>Quest log</h2>' + v.quests.map(function (q) {
          return '<p><strong style="color:#ffcd75">' + esc(q.name) + '</strong><br>' + esc(q.text) + '</p>';
        }).join('') + '<p>Partner: ' + (v.partner ? esc(v.partner.short) : 'none') + '</p>' +
          '<button class="btn alt" id="m-close" type="button">Close</button>';
        document.getElementById('m-close').onclick = function () { G.Game.closeMenu(); };
      } else if (v.menu === 'shop') {
        menu.hidden = false;
        const stock = [
          ['suv', 'AWD SUV', 2500],
          ['truck', 'Heated-Seat Luxury Truck', 6000],
          ['tires', 'Snow Tires', 100],
          ['drone', 'Drone', 200],
          ['staging', 'Staging Kit', 80],
          ['coffee', 'Caribou Coffee', 40],
          ['snack', 'Onion-Free Snack', 15],
        ];
        menu.innerHTML = '<h2>Office counter</h2><div class="stack">' + stock.map(function (it) {
          return '<button class="btn" data-buy="' + it[0] + '" data-price="' + it[2] + '" type="button">' + it[1] + ' $' + it[2] + '</button>';
        }).join('') + '<button class="btn alt" id="m-close" type="button">Leave</button></div>';
        menu.querySelectorAll('[data-buy]').forEach(function (btn) {
          btn.onclick = function () { G.Game.buy(btn.getAttribute('data-buy'), Number(btn.getAttribute('data-price'))); };
        });
        document.getElementById('m-close').onclick = function () { G.Game.closeMenu(); };
      } else {
        menu.hidden = false;
        menu.innerHTML =
          '<h2>Desk</h2><div class="stack">' +
          '<button class="btn" id="m-quest" type="button">Quest log</button>' +
          '<button class="btn" id="m-map" type="button">Full regional map</button>' +
          '<button class="btn" id="m-shop" type="button">Upgrades</button>' +
          '<button class="btn" id="m-save" type="button">Save</button>' +
          '<button class="btn alt" id="m-close" type="button">Close</button></div>';
        document.getElementById('m-quest').onclick = function () { G.Game.openMenu('quest'); };
        document.getElementById('m-map').onclick = function () { G.Game.openMenu('map'); };
        document.getElementById('m-shop').onclick = function () { G.Game.openMenu('shop'); };
        document.getElementById('m-save').onclick = function () { G.Save.write(G.Game.view().save); G.Game.closeMenu(); };
        document.getElementById('m-close').onclick = function () { G.Game.closeMenu(); };
      }
    }

    const tour = document.getElementById('tour');
    if (v.place === 'house' && !v.battle) {
      tour.hidden = false;
      document.getElementById('tour-go').disabled = v.tour < 2;
      document.getElementById('tour-go').textContent = v.tour < 2 ? 'Walk two rooms first' : 'Handle their question';
    } else tour.hidden = true;
  }

  const keyNames = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
    ' ': 'down',
  };

  window.addEventListener('keydown', function (e) {
    if (mode !== 'play') return;
    const name = keyNames[e.key];
    if (name) { G.Game.setKey(name, true); e.preventDefault(); }
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') { G.Game.interact(); e.preventDefault(); }
    if (e.key === 'm' || e.key === 'M') G.Game.openMenu(G.Game.view().menu ? null : 'map');
    if (e.key === 'p' || e.key === 'P') G.Game.openPhone();
    if (e.key === 'h' || e.key === 'H') G.Game.horn();
  });
  window.addEventListener('keyup', function (e) {
    const name = keyNames[e.key];
    if (name) G.Game.setKey(name, false);
  });

  document.querySelectorAll('#pad [data-dir]').forEach(function (btn) {
    const dir = btn.getAttribute('data-dir');
    function down(ev) { ev.preventDefault(); G.Game.setPad(dir, true); }
    function up(ev) { ev.preventDefault(); G.Game.setPad(dir, false); }
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
  });
  document.getElementById('btn-a').onclick = function () { G.Game.interact(); };
  document.getElementById('btn-b').onclick = function () {
    const v = G.Game.view();
    if (v.menu) G.Game.closeMenu();
    else G.Game.openMenu('root');
  };
  document.getElementById('btn-phone').onclick = function () { G.Game.openPhone(); };
  document.getElementById('hud-phone').onclick = function () { G.Game.openPhone(); };
  document.getElementById('btn-horn').onclick = function () { G.Game.horn(); };
  document.getElementById('btn-pull').onclick = function () { G.Game.pullOver(); };
  document.getElementById('hud-menu').onclick = function () { G.Game.openMenu('root'); };
  document.getElementById('mute').onclick = function () { G.Audio.toggle(); };
  document.getElementById('dlg-next').onclick = function () { G.Game.interact(); };
  document.getElementById('atlas-close').onclick = function () { G.Game.closeMenu(); };
  document.getElementById('tour-go').onclick = function () { G.Game.startTalk(); };

  let last = 0;
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    if (mode === 'play') {
      G.Game.update(dt);
      G.Game.draw(ctx, view.width, view.height);
      sync();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('error', function (e) {
    const pre = document.createElement('pre');
    pre.id = 'err';
    pre.textContent = String(e.message || e.error);
    document.body.appendChild(pre);
  });

  const shot = new URLSearchParams(location.search).get('shot');
  if (shot === 'select') showSelect();
  else if (shot === 'drive' || shot === 'house' || shot === 'deal') {
    begin(G.Save.fresh(shot === 'deal' ? 'tania' : 'malcolm'));
    if (shot === 'drive') G.Game.openPhone();
    if (shot === 'house' || shot === 'deal') {
      const cabin = G.Geo.BUILDINGS[1];
      const st = G.Game.state;
      st.place = 'house';
      st.room = cabin;
      st.save.inCar = false;
      st.save.x = 90;
      st.save.y = 80;
      st.tour.live = 'Living room';
      st.tour.kit = 'Kitchen';
    }
    if (shot === 'deal') G.Game.startTalk();
  } else showTitle();
})();
