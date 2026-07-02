// ============================================================
// scenes/map.js - the day hub: Northern MN map + action menu,
// weather, Brad's bank, Jeff's plaza, and the occasional squatch
// ============================================================
'use strict';

G.Engine.register('map', {
  MAP_X: 150,

  enter(params = {}) {
    this.t = 0;
    this.mode = 'menu';           // menu | drive | stats | pipeline
    this.pipeScroll = 0;
    this.particles = new G.Particles();
    this.banner = null;
    this.deer = { x: G.rand(200, 440), y: G.rand(60, 230), vx: 6, show: G.chance(0.5) };
    this.bigfoot = null;

    const s = G.State.s;
    if (!s) { G.Engine.goto('title'); return; }

    // head-to-head listing battle interrupts the morning
    if (s.pendingBattle && !params.result) {
      G.Engine.goto('battle');
      return;
    }

    if (s.bigfootToday) {
      this.bigfoot = { x: G.rand(180, 450), y: G.rand(40, 230), t: 0, found: false };
    }

    const loc = G.Data.MAP.locations.office;
    if (this.carX === undefined) { this.carX = loc.x; this.carY = loc.y; }
    this.carTarget = null;
    this.pendingAction = null;

    this.buildMenu();
    G.Audio.startMusic();

    if (params.newDay) {
      const d = Math.min(s.dayOfMonth, G.Data.SEASON.daysPerMonth);
      const w = G.State.weatherData();
      this.banner = { text: G.State.monthName() + ' DAY ' + d + '/' + G.Data.SEASON.daysPerMonth + ' - ' + w.label, t: 2.4 };
    }

    if (params.result) {
      const { actionId, score } = params.result;
      this.resolveAction(actionId, score);
    }
    if (params.jeffDeal) {
      // returning from Jeff's negotiate minigame is handled via result above
    }
  },

  buildMenu() {
    const items = [];
    for (const a of G.Data.ACTIONS) {
      if (a.hidden) continue;
      const avail = G.State.actionAvailable(a.id);
      items.push({
        label: a.label,
        id: a.id,
        kind: 'action',
        disabled: !avail.ok,
        note: avail.ok ? '-' + G.State.actionCost(a.id) + 'E' : avail.reason,
        desc: a.desc,
      });
    }
    // legendary visits
    const s = G.State.s;
    items.push({
      label: '$ BRAD (BANK)', id: 'brad', kind: 'visit',
      disabled: s.bradUsed,
      note: s.bradUsed ? 'GONE' : 'FREE',
      desc: 'Visit Brad Nolan, The Mortgage Wizard. CLEAR TO CLOSE awaits.',
    });
    const jeffAvail = !s.commercialUnlocked || (s.jeffCooldown <= 0 && s.energy >= 1);
    items.push({
      label: '# JEFF (PLAZA)', id: 'jeff', kind: 'visit',
      disabled: !jeffAvail,
      note: !s.commercialUnlocked ? 'MEET' : (s.jeffCooldown > 0 ? s.jeffCooldown + 'D' : '-1E'),
      desc: 'Visit Jeff Nobleza, The Commercial King. Cap rates. Big money.',
    });
    const ab = G.State.char().ability;
    items.push({
      label: '* ' + ab.name, id: 'ability', kind: 'ability',
      disabled: s.abilityUsed,
      note: s.abilityUsed ? 'USED' : 'FREE',
      desc: ab.desc,
    });
    items.push({ label: 'SHOP', id: 'shop', kind: 'nav', note: G.money(s.cash), desc: 'Gear, offices, and toys. Spend that commission.' });
    items.push({ label: 'STATS', id: 'stats', kind: 'nav', desc: 'Your full season stat sheet.' });
    items.push({ label: 'PIPELINE', id: 'pipeline', kind: 'nav', desc: 'Every lead and where they stand.' });
    items.push({ label: 'END DAY', id: 'endday', kind: 'nav', note: 'Zz', desc: 'Call it a day. Leads age, rival moves, stuff happens.' });

    const keepIndex = this.menu ? this.menu.index : 0;
    this.menu = new G.Menu(items, {
      x: 4, y: 44, w: 142, rowH: 12,
      maxVisible: 15,
      onSelect: (it) => this.onMenuPick(it),
    });
    this.menu.index = Math.min(keepIndex, items.length - 1);
    this.menu.skipDisabled(1);
  },

  onMenuPick(it) {
    const s = G.State.s;
    if (it.kind === 'action') {
      const a = G.Data.ACTIONS.find(x => x.id === it.id);
      const loc = G.Data.MAP.locations[a.loc];
      this.pendingAction = a;
      this.carTarget = { x: loc.x, y: loc.y + 12 };
      this.mode = 'drive';
      G.Audio.swoosh();
    } else if (it.id === 'brad') {
      const loc = G.Data.MAP.locations.bank;
      this.pendingAction = { id: '_brad', loc: 'bank' };
      this.carTarget = { x: loc.x, y: loc.y + 12 };
      this.mode = 'drive';
      G.Audio.swoosh();
    } else if (it.id === 'jeff') {
      const loc = G.Data.MAP.locations.plaza;
      this.pendingAction = { id: '_jeff', loc: 'plaza' };
      this.carTarget = { x: loc.x, y: loc.y + 12 };
      this.mode = 'drive';
      G.Audio.swoosh();
    } else if (it.id === 'ability') {
      const res = G.State.useAbility();
      if (res) {
        this.particles.spawn(74, 140, { count: 20, colors: [G.C.yellow, G.C.cyan, G.C.lime] });
        G.Popup.show({
          title: G.State.char().ability.name, lines: res.lines,
          color: G.C.purple, onClose: () => this.buildMenu(),
        });
      }
    } else if (it.id === 'shop') {
      G.Engine.goto('shop');
    } else if (it.id === 'stats') {
      this.mode = 'stats';
    } else if (it.id === 'pipeline') {
      this.mode = 'pipeline'; this.pipeScroll = 0;
    } else if (it.id === 'endday') {
      this.endDay();
    }
  },

  // ----------------------------------------------------------
  visitBrad() {
    const res = G.State.visitBrad();
    if (res.sold) {
      G.Audio.cash();
      G.Engine.shake = 5;
      // golden paperwork everywhere
      this.particles.spawn(G.W / 2, 100, { count: 60, colors: [G.C.yellow, G.C.white, '#e6c86e'], life: 1.8, vyMin: -120, vyMax: -30 });
    }
    G.Popup.show({
      title: res.used ? 'THE BANK' : 'CLEAR TO CLOSE!',
      lines: res.lines,
      sprite: 'bradNolan',
      color: G.C.yellow, textColor: G.C.white,
      onClose: () => this.buildMenu(),
    });
  },

  visitJeff() {
    const res = G.State.visitJeff();
    if (res.unlock) {
      G.Audio.fanfare();
      G.Engine.shake = 4;
      // commercial buildings rise from the ground (particles will do)
      this.particles.spawn(222, 200, { count: 40, colors: [G.C.slate, G.C.sky, G.C.cyan], life: 1.5, vyMin: -100, vyMax: -40 });
      G.Popup.show({
        title: 'COMMERCIAL TAKEOVER!',
        lines: res.lines,
        sprite: 'jeffNobleza',
        color: G.C.purple,
        onClose: () => this.buildMenu(),
      });
    } else if (res.deal) {
      G.Popup.show({
        title: 'JEFF HAS A DEAL',
        lines: [...res.lines, '', 'Win the negotiation to close it. Ready?'],
        sprite: 'jeffNobleza',
        color: G.C.purple,
        onClose: () => G.Engine.goto('negotiateGame', { actionId: 'commercial' }),
      });
    } else {
      G.Popup.show({
        title: 'NOBLEZA COMMERCIAL',
        lines: res.lines,
        sprite: 'jeffNobleza',
        color: G.C.slate,
        onClose: () => this.buildMenu(),
      });
    }
  },

  // ----------------------------------------------------------
  resolveAction(actionId, score) {
    const res = G.State.performAction(actionId, score);
    const a = G.Data.ACTIONS.find(x => x.id === actionId);
    if (res.sold > 0) {
      G.Audio.cash();
      G.Engine.shake = 4;
      this.particles.spawn(G.W / 2, G.H / 2, { count: 40, colors: [G.C.yellow, G.C.green, G.C.lime, G.C.white], life: 1.4 });
    }
    G.Popup.show({
      title: (a ? a.label : 'RESULTS') + ' - RESULTS',
      lines: res.lines,
      color: res.sold > 0 ? G.C.green : G.C.blue,
      onClose: () => {
        this.buildMenu();
        if (G.State.s.energy <= 0) {
          G.Popup.show({
            title: 'OUT OF ENERGY',
            lines: ['You are running on fumes and gas station coffee.', 'Time to end the day.'],
            color: G.C.slate,
            onClose: () => this.endDay(),
          });
        }
      },
    });
  },

  // ----------------------------------------------------------
  endDay() {
    const s = G.State.s;
    const r = G.State.endDay();
    const lines = [];
    if (r.passiveLines.length) lines.push(...r.passiveLines, '');
    if (r.rivalLines.length) {
      lines.push('MEANWHILE...', ...r.rivalLines);
    } else {
      lines.push('Your rival was suspiciously quiet today.');
    }
    lines.push('', 'SCORE: YOU ' + s.stats.homesSold + ' - RIVAL ' + s.rival.homesSold);

    G.Popup.show({
      title: 'END OF DAY', lines, color: G.C.navy,
      onClose: () => {
        const proceed = () => {
          if (r.bossTime) G.Engine.goto('boss');
          else G.Engine.goto('map', { newDay: true });
        };
        if (r.eventText) {
          G.Audio[r.eventGood ? 'good' : 'thud']();
          G.Popup.show({
            title: r.eventGood ? 'PLOT TWIST!' : 'UFF DA...',
            lines: [r.eventText],
            color: r.eventGood ? G.C.green : G.C.red,
            onClose: proceed,
          });
        } else proceed();
      },
    });
  },

  // ----------------------------------------------------------
  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }

    if (this.deer.show) {
      this.deer.x += this.deer.vx * dt;
      if (this.deer.x > 460) this.deer.vx = -6;
      if (this.deer.x < 160) this.deer.vx = 6;
    }

    // bigfoot: shy, wanders, click to spot him
    if (this.bigfoot && !this.bigfoot.found) {
      this.bigfoot.t += dt;
      this.bigfoot.x += Math.sin(this.bigfoot.t * 0.7) * 8 * dt;
      if (G.Input.clickedRect(this.bigfoot.x - 6, this.bigfoot.y - 6, 20, 24)) {
        this.bigfoot.found = true;
        G.State.s.stats.followers += 500;
        G.Profile.award('squatch');
        G.Audio.fanfare();
        this.particles.spawn(this.bigfoot.x, this.bigfoot.y, { count: 24, colors: [G.C.lime, G.C.yellow] });
        G.Popup.show({
          title: 'SQUATCH SPOTTED!',
          lines: ['You saw him. He saw you. He nodded.', 'You got a (blurry) photo. +500 FOLLOWERS.', 'He is a homeowner, by the way. Paid cash.'],
          sprite: 'bigfoot',
          color: G.C.green,
        });
      }
    }

    if (this.mode === 'drive') {
      const tgt = this.carTarget;
      const d = G.dist(this.carX, this.carY, tgt.x, tgt.y);
      if (d < 3) {
        this.mode = 'menu';
        const a = this.pendingAction;
        this.pendingAction = null;
        if (a.id === '_brad') { this.visitBrad(); return; }
        if (a.id === '_jeff') { this.visitJeff(); return; }
        if (a.minigame) {
          G.Engine.goto(a.minigame, { actionId: a.id });
        } else {
          this.resolveAction(a.id, null);
        }
      } else {
        const sp = 130 * dt;
        this.carX += (tgt.x - this.carX) / d * sp;
        this.carY += (tgt.y - this.carY) / d * sp;
      }
      return;
    }

    if (this.mode === 'stats' || this.mode === 'pipeline') {
      if (this.mode === 'pipeline') {
        if (G.Input.up()) { this.pipeScroll = Math.max(0, this.pipeScroll - 1); return; }
        if (G.Input.down()) { this.pipeScroll++; return; }
      }
      if (G.Input.cancel() || G.Input.confirm() || G.Input.mouse.clicked) {
        this.mode = 'menu'; G.Audio.back();
      }
      return;
    }

    this.menu.update();
  },

  // ----------------------------------------------------------
  render(ctx) {
    const s = G.State.s;
    if (!s) return;

    this.renderMap(ctx);
    this.renderWeather(ctx);
    this.renderSidebar(ctx);
    this.renderHud(ctx);
    this.particles.render(ctx);

    if (this.mode === 'stats') this.renderStats(ctx);
    if (this.mode === 'pipeline') this.renderPipeline(ctx);

    if (this.banner) {
      const a = Math.min(1, this.banner.t);
      ctx.globalAlpha = a;
      ctx.fillStyle = G.C.ink;
      ctx.fillRect(0, 110, G.W, 34);
      G.UI.text(ctx, this.banner.text, G.W / 2, 122, { align: 'center', size: 12, color: G.C.yellow });
      ctx.globalAlpha = 1;
    }
  },

  renderMap(ctx) {
    const s = G.State.s;
    const MX = this.MAP_X;

    ctx.fillStyle = ['#41684d', '#4a7c59', '#529960'][s.month] || '#529960';
    ctx.fillRect(MX, 0, G.W - MX, G.H);

    for (let i = 0; i < 60; i++) {
      const px = MX + ((i * 53) % (G.W - MX));
      const py = (i * 37) % G.H;
      ctx.fillStyle = i % 3 ? 'rgba(26,28,44,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(px, py, 3, 2);
    }
    if (s.month === 0) {
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = 'rgba(244,244,244,0.5)';
        ctx.fillRect(MX + ((i * 89) % (G.W - MX - 10)), (i * 61) % (G.H - 8), 6, 3);
      }
    }

    ctx.strokeStyle = '#6b6f82';
    ctx.lineWidth = 2;
    const T = G.Data.MAP.towns;
    ctx.beginPath();
    for (let i = 0; i < T.length - 1; i++) {
      ctx.moveTo(T[i].x, T[i].y);
      ctx.lineTo(T[i + 1].x, T[i + 1].y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;

    for (const lake of G.Data.MAP.lakes) {
      ctx.fillStyle = G.C.blue;
      ctx.beginPath();
      ctx.ellipse(lake.x + lake.w / 2, lake.y + lake.h / 2, lake.w / 2, lake.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = G.C.sky;
      for (let i = 0; i < 5; i++) {
        const wx = lake.x + 8 + ((i * 31 + Math.floor(this.t * 8)) % (lake.w - 16));
        ctx.fillRect(wx, lake.y + 6 + (i * 7) % (lake.h - 12), 4, 1);
      }
      G.UI.text(ctx, lake.name, lake.x + lake.w / 2, lake.y + lake.h / 2 - 3, { align: 'center', size: 6, color: G.C.cyan });
    }

    for (let i = 0; i < 26; i++) {
      const px = MX + 6 + ((i * 47) % (G.W - MX - 16));
      const py = 4 + ((i * 71) % (G.H - 30));
      const onLake = G.Data.MAP.lakes.some(l =>
        px > l.x - 6 && px < l.x + l.w + 2 && py > l.y - 8 && py < l.y + l.h + 2);
      if (!onLake) G.drawSprite(ctx, i % 2 ? G.Sprites.pine : G.Sprites.pine2, px, py, 1);
    }

    for (const t of T) {
      ctx.fillStyle = G.C.gray;
      ctx.fillRect(t.x - 3, t.y - 2, 6, 4);
      G.UI.text(ctx, t.name, t.x, t.y + 5, { align: 'center', size: 6, color: G.C.white, shadow: true });
    }

    // action locations
    const selected = this.menu && this.menu.items[this.menu.index];
    let selLoc = null;
    if (selected) {
      if (selected.kind === 'action') selLoc = (G.Data.ACTIONS.find(a => a.id === selected.id) || {}).loc;
      if (selected.id === 'brad') selLoc = 'bank';
      if (selected.id === 'jeff') selLoc = 'plaza';
    }
    for (const [key, loc] of Object.entries(G.Data.MAP.locations)) {
      const sp = G.Sprites[loc.sprite];
      G.drawSprite(ctx, sp, loc.x - sp.width / 2, loc.y - sp.height, 1);
      if (key === selLoc) {
        const bob = Math.sin(this.t * 6) * 2;
        ctx.fillStyle = G.C.yellow;
        ctx.beginPath();
        ctx.moveTo(loc.x, loc.y - sp.height - 4 + bob);
        ctx.lineTo(loc.x - 4, loc.y - sp.height - 10 + bob);
        ctx.lineTo(loc.x + 4, loc.y - sp.height - 10 + bob);
        ctx.fill();
        G.UI.text(ctx, loc.label, loc.x, loc.y - sp.height - 19 + bob, { align: 'center', size: 6, color: G.C.yellow, shadow: true });
      }
    }

    if (this.deer.show) {
      G.drawSprite(ctx, G.Sprites.deer, this.deer.x, this.deer.y, 1, this.deer.vx < 0);
    }

    // bigfoot lurks among the pines
    if (this.bigfoot && !this.bigfoot.found) {
      ctx.globalAlpha = 0.6 + Math.sin(this.bigfoot.t * 2) * 0.2;
      G.drawSprite(ctx, G.Sprites.bigfoot, this.bigfoot.x, this.bigfoot.y, 1);
      ctx.globalAlpha = 1;
    }

    const carSprite = (G.State.has('vehicle') || G.State.has('luxsuv')) ? G.Sprites.carFancy : G.Sprites.car;
    G.drawSprite(ctx, carSprite, this.carX - 5, this.carY - 4, 1, this.carTarget && this.carTarget.x < this.carX);

    G.UI.text(ctx, 'NORTHERN MINNESOTA', G.W - 6, G.H - 10, { align: 'right', size: 6, color: 'rgba(244,244,244,0.5)' });
  },

  renderWeather(ctx) {
    const w = G.State.weatherData();
    const MX = this.MAP_X;
    if (w.snow) {
      ctx.fillStyle = G.C.white;
      for (let i = 0; i < 40; i++) {
        const x = MX + ((i * 83 + this.t * 30) % (G.W - MX));
        const y = (i * 47 + this.t * 60) % G.H;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    if (w.rain) {
      ctx.strokeStyle = 'rgba(115,239,247,0.4)';
      for (let i = 0; i < 30; i++) {
        const x = MX + ((i * 97 + this.t * 140) % (G.W - MX));
        const y = (i * 53 + this.t * 240) % G.H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 5); ctx.stroke();
      }
    }
    if (w.fog) {
      ctx.fillStyle = 'rgba(148,176,194,0.28)';
      ctx.fillRect(MX, 0, G.W - MX, G.H);
    }
    if (w.aurora) {
      for (let x = MX; x < G.W; x += 4) {
        const h = 16 + Math.sin(x * 0.04 + this.t * 1.4) * 8;
        ctx.fillStyle = 'rgba(56,183,100,0.18)';
        ctx.fillRect(x, 4 + Math.sin(x * 0.02 + this.t) * 5, 4, h);
      }
    }
    if (w.id === 'heat') {
      ctx.fillStyle = 'rgba(239,125,87,0.10)';
      ctx.fillRect(MX, 0, G.W - MX, G.H);
    }
  },

  renderSidebar(ctx) {
    const s = G.State.s;
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(0, 0, this.MAP_X, G.H);
    ctx.strokeStyle = G.C.slate;
    ctx.beginPath(); ctx.moveTo(this.MAP_X - 0.5, 0); ctx.lineTo(this.MAP_X - 0.5, G.H); ctx.stroke();

    const ch = G.State.char();
    G.drawSprite(ctx, G.Sprites[ch.sprite], 4, 4, 2);
    G.UI.text(ctx, ch.name, 38, 6, { size: 9, color: ch.id === 'bridger' ? '#c0562f' : (ch.color || G.C.lime) });
    G.UI.text(ctx, G.money(s.cash), 38, 17, { size: 8, color: G.C.yellow });

    G.UI.text(ctx, 'ENERGY', 38, 28, { size: 6, color: G.C.gray });
    for (let i = 0; i < G.State.maxEnergy(); i++) {
      ctx.fillStyle = i < s.energy ? G.C.lime : G.C.dusk;
      ctx.fillRect(72 + i * 8, 28, 6, 6);
      ctx.strokeStyle = G.C.slate;
      ctx.strokeRect(72.5 + i * 8, 28.5, 5, 5);
    }

    this.menu.render(ctx);

    const it = this.menu.items[this.menu.index];
    if (it && it.desc) {
      const lines = G.UI.wrap(ctx, it.desc, 138, 7);
      let y = G.H - 8 - lines.length * 8;
      ctx.fillStyle = G.C.dusk;
      ctx.fillRect(2, y - 3, this.MAP_X - 6, lines.length * 8 + 6);
      for (const l of lines) {
        G.UI.text(ctx, l, 6, y, { size: 7, color: G.C.cyan });
        y += 8;
      }
    }
  },

  renderHud(ctx) {
    const s = G.State.s;
    const w = 210, x = G.W - w - 4, y = 3;
    ctx.fillStyle = 'rgba(26,28,44,0.85)';
    ctx.fillRect(x, y, w, 22);
    ctx.strokeStyle = G.C.slate;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 21);
    G.UI.text(ctx, G.State.monthName() + ' D' + Math.min(s.dayOfMonth, G.Data.SEASON.daysPerMonth) + '/' + G.Data.SEASON.daysPerMonth, x + 5, y + 3, { size: 7, color: G.C.white });
    G.UI.text(ctx, 'YOU ' + s.stats.homesSold, x + 5, y + 12, { size: 7, color: G.C.lime });
    G.UI.text(ctx, 'RIVAL ' + s.rival.homesSold, x + 50, y + 12, { size: 7, color: G.C.red });
    const wd = G.State.weatherData();
    G.UI.text(ctx, wd.label, x + w - 5, y + 3, { align: 'right', size: 7, color: G.C.cyan });
    G.UI.text(ctx, 'LEADS ' + s.leads.length + '  FLW ' + s.stats.followers, x + w - 5, y + 12, { align: 'right', size: 7, color: G.C.yellow });
  },

  renderStats(ctx) {
    const s = G.State.s;
    ctx.fillStyle = 'rgba(26,28,44,0.85)';
    ctx.fillRect(0, 0, G.W, G.H);
    G.UI.panel(ctx, 90, 14, 300, 244, { title: 'SEASON STAT SHEET', titleBg: G.C.teal, bg: G.C.ink });

    const rows = [
      ['HOMES SOLD', s.stats.homesSold, G.C.lime],
      ['COMMISSION EARNED', G.money(s.stats.commission), G.C.yellow],
      ['COMMERCIAL DEALS', s.stats.commercialDeals, G.C.purple],
      ['LISTINGS TAKEN', s.stats.listings, G.C.white],
      ['BUYER CLIENTS', s.stats.buyers, G.C.white],
      ['REFERRALS', s.stats.referrals, G.C.white],
      ['ONLINE REVIEWS', s.stats.reviews + ' (5-STAR)', G.C.cyan],
      ['SOCIAL FOLLOWERS', s.stats.followers, G.C.sky],
      ['CLIENT HAPPINESS', s.stats.happiness + '/100', G.C.orange],
      ['REPUTATION', s.stats.reputation + '/100', G.C.yellow],
      ['LEADS RECEIVED', s.stats.leadsReceived, G.C.gray],
      ['CONVERSION RATE', G.pct(G.State.conversionRate()), G.C.lime],
      ['BOSS WINS', s.stats.bossWins, G.C.purple],
      ['RIVALRY LEVEL', ['FRIENDLY', 'SPICY', 'FULL FEUD'][Math.min(2, Math.floor(s.rivalry / 2))], G.C.red],
      ['CASH ON HAND', G.money(s.cash), G.C.yellow],
    ];
    let y = 32;
    for (const [label, val, color] of rows) {
      G.UI.text(ctx, label, 104, y, { size: 8, color: G.C.gray });
      G.UI.text(ctx, String(val), 376, y, { align: 'right', size: 8, color });
      y += 14;
    }
    G.UI.text(ctx, '[ESC] CLOSE', G.W / 2, y + 4, { align: 'center', size: 7, color: G.C.yellow });
  },

  renderPipeline(ctx) {
    const s = G.State.s;
    ctx.fillStyle = 'rgba(26,28,44,0.85)';
    ctx.fillRect(0, 0, G.W, G.H);
    G.UI.panel(ctx, 60, 16, 360, 238, { title: 'LEAD PIPELINE (' + s.leads.length + ')', titleBg: G.C.blue, bg: G.C.ink });

    const order = G.Data.STAGES;
    const leads = s.leads.slice().sort((a, b) => order.indexOf(b.stage) - order.indexOf(a.stage));
    const perPage = 13;
    const maxScroll = Math.max(0, leads.length - perPage);
    this.pipeScroll = G.clamp(this.pipeScroll, 0, maxScroll);
    const visible = leads.slice(this.pipeScroll, this.pipeScroll + perPage);

    let y = 36;
    if (!leads.length) {
      G.UI.text(ctx, 'NO LEADS. GO MAKE A VIDEO OR HOST AN OPEN HOUSE!', G.W / 2, 120, { align: 'center', size: 8, color: G.C.gray });
    }
    for (const l of visible) {
      G.UI.text(ctx, l.name, 70, y, { size: 7, color: G.C.white });
      G.UI.text(ctx, l.label, 165, y, { size: 7, color: l.commercial ? G.C.purple : l.lake ? G.C.cyan : l.luxury ? G.C.yellow : G.C.gray });
      G.UI.text(ctx, G.money(l.value), 300, y, { size: 7, color: G.C.yellow });
      const sc = G.Data.STAGE_COLORS[l.stage];
      ctx.fillStyle = sc;
      ctx.fillRect(340, y, 4, 6);
      G.UI.text(ctx, G.Data.STAGE_LABELS[l.stage] + (l.issue ? '!' : ''), 348, y, { size: 7, color: l.issue ? G.C.red : sc });
      y += 15;
    }
    if (maxScroll > 0) {
      G.UI.text(ctx, 'UP/DOWN TO SCROLL (' + (this.pipeScroll + 1) + '-' + Math.min(leads.length, this.pipeScroll + perPage) + ')', G.W / 2, 236, { align: 'center', size: 6, color: G.C.slate });
    }
    G.UI.text(ctx, '[ESC] CLOSE', G.W / 2, 245, { align: 'center', size: 7, color: G.C.yellow });
  },
});
