// ============================================================
// scenes/boss.js - month-end boss showdown vs a top local agent
// Best-of-N skill clashes: stop the needle in the green zone.
// Your stats & upgrades widen the zone; boss gimmicks fight back.
// ============================================================
'use strict';

G.Engine.register('boss', {
  enter() {
    this.t = 0;
    this.boss = G.State.currentBoss();
    this.phase = 'intro';
    this.round = 0;
    this.playerWins = 0;
    this.bossWins = 0;
    this.flash = null;
    this.particles = new G.Particles();
    this.needle = 0;
    this.dir = 1;
    this.locked = false;
    G.Audio.stopMusic();
    G.Audio.thud();
  },

  exit() { G.Audio.startMusic(); },

  // How much a skill widens your green zone (0..~0.14)
  skillBonus(skill) {
    const s = G.State.s;
    const has = (u) => G.State.has(u);
    let b = 0;
    switch (skill) {
      case 'PROSPECTING':
        if (has('crm')) b += 0.05;
        if (has('website') || has('seo')) b += 0.03;
        b += Math.min(0.05, s.stats.leadsReceived / 400);
        break;
      case 'MARKETING':
        if (has('camera')) b += 0.03;
        if (has('social') || has('tiktok')) b += 0.04;
        if (has('marketing') || has('marketingdir')) b += 0.04;
        b += Math.min(0.04, s.stats.followers / 30000);
        break;
      case 'NEGOTIATION':
        b += (G.State.char().negotiateBonus || 0) * 0.4;
        b += Math.min(0.04, s.stats.homesSold / 250);
        break;
      case 'CLIENT SERVICE':
        b += s.stats.happiness / 1200;
        b += Math.min(0.03, s.stats.reviews / 300);
        b += s.stats.reputation / 2000;
        break;
      case 'SPEED':
        if (has('vehicle') || has('luxsuv')) b += 0.04;
        if (has('ai')) b += 0.04;
        if (has('assistant')) b += 0.03;
        break;
      case 'STRATEGY':
        b += Object.keys(s.upgrades).length * 0.008;
        break;
    }
    return Math.min(0.14, b);
  },

  startRound() {
    const skill = this.boss.skills[this.round % this.boss.skills.length];
    const gim = this.boss.gimmick || {};
    this.skill = skill;
    let width = Math.max(0.09, 0.30 - this.boss.difficulty * 0.22 + this.skillBonus(skill));
    if (gim.zone) width *= gim.zone;
    width = Math.max(0.07, width);
    this.zone = { start: G.rand(0.15, 0.85 - width), width };
    this.speed = (1.4 + this.boss.difficulty * 1.4 + this.round * 0.22) * (gim.speed || 1);
    this.needle = 0;
    this.dir = 1;
    this.locked = false;
    this.phase = 'round';
    G.Audio.ring();
  },

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }

    if (this.phase === 'intro') {
      if (this.t > 0.5 && (G.Input.confirm() || G.Input.mouse.clicked)) {
        G.Audio.select();
        this.startRound();
      }
      return;
    }

    if (this.phase === 'round') {
      if (this.locked) return;
      this.needle += this.dir * this.speed * dt;
      if (this.needle > 1) { this.needle = 1; this.dir = -1; }
      if (this.needle < 0) { this.needle = 0; this.dir = 1; }

      if (G.Input.confirm() || G.Input.mouse.clicked) {
        this.locked = true;
        const hit = this.needle >= this.zone.start && this.needle <= this.zone.start + this.zone.width;
        if (hit) {
          this.playerWins++;
          this.flash = { text: this.skill + ' - YOU WIN THE ROUND!', color: G.C.lime, t: 1.1 };
          this.particles.spawn(G.W / 2, 130, { count: 20, colors: [G.C.lime, G.C.yellow, G.C.cyan] });
          G.Audio.great();
        } else {
          this.bossWins++;
          this.flash = { text: this.boss.name.split(' ').slice(0, 2).join(' ') + ' TAKES ' + this.skill + '!', color: G.C.red, t: 1.1 };
          G.Engine.shake = 3;
          G.Audio.thud();
          const gim = this.boss.gimmick || {};
          if (gim.loseCash) {
            G.State.s.cash = Math.max(0, G.State.s.cash - gim.loseCash);
            this.flash.text += ' (-' + G.money(gim.loseCash) + ')';
          }
        }
        setTimeout(() => {
          this.round++;
          const need = Math.floor(this.boss.rounds / 2) + 1;
          if (this.playerWins >= need || this.bossWins >= need || this.round >= this.boss.rounds) {
            this.phase = 'result';
            this.t = 0;
            if (this.playerWins > this.bossWins) G.Audio.fanfare(); else G.Audio.sadTromb();
          } else {
            this.startRound();
          }
        }, 1000);
      }
      return;
    }

    if (this.phase === 'result') {
      if (this.t > 0.8 && (G.Input.confirm() || G.Input.mouse.clicked)) {
        const won = this.playerWins > this.bossWins;
        const res = G.State.resolveBoss(won);
        G.Popup.show({
          title: won ? 'SHOWDOWN WON!' : 'SHOWDOWN LOST',
          lines: res.lines,
          color: won ? G.C.green : G.C.red,
          onClose: () => {
            if (res.seasonOver) G.Engine.goto('seasonEnd');
            else G.Engine.goto('map', { newDay: true });
          },
        });
      }
    }
  },

  render(ctx) {
    const b = this.boss;
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(0, 0, G.W, G.H);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + this.t * 0.4;
      ctx.strokeStyle = 'rgba(93,39,93,0.5)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(G.W / 2, 100);
      ctx.lineTo(G.W / 2 + Math.cos(a) * 400, 100 + Math.sin(a) * 400);
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    if (this.phase === 'intro') {
      G.UI.text(ctx, b.final ? 'FINAL BOSS' : 'MONTH-END SHOWDOWN', G.W / 2, 16, { align: 'center', size: 12, color: G.C.red, shadow: true });
      const shake = b.final ? Math.sin(this.t * 30) * 1.5 : 0;
      G.drawSprite(ctx, G.Sprites[b.sprite], G.W / 2 - 28 + shake, 36, 4);
      G.UI.text(ctx, b.name, G.W / 2, 106, { align: 'center', size: 13, color: G.C.yellow, shadow: true });
      let y = 126;
      for (const line of b.intro) {
        G.UI.text(ctx, line, G.W / 2, y, { align: 'center', size: 8, color: G.C.gray });
        y += 10;
      }
      G.UI.text(ctx, '"' + b.taunt + '"', G.W / 2, y + 5, { align: 'center', size: 8, color: G.C.orange });
      G.UI.text(ctx, 'BEST OF ' + b.rounds + ' SKILL CLASHES. STOP THE NEEDLE IN THE GREEN.', G.W / 2, y + 22, { align: 'center', size: 7, color: G.C.cyan });
      if (Math.floor(this.t * 2) % 2 === 0) {
        G.UI.text(ctx, G.CT('- PRESS ENTER TO THROW DOWN -', '- TAP TO THROW DOWN -'), G.W / 2, y + 38, { align: 'center', size: 9, color: G.C.yellow });
      }
      return;
    }

    G.drawSprite(ctx, G.Sprites[G.State.char().sprite], 80, 60, 4);
    G.drawSprite(ctx, G.Sprites[b.sprite], 336, 60, 4);
    G.UI.text(ctx, G.State.char().name, 108, 132, { align: 'center', size: 9, color: G.C.lime });
    G.UI.text(ctx, b.name.split(' ').slice(0, 2).join(' '), 364, 132, { align: 'center', size: 8, color: G.C.red });

    for (let i = 0; i < b.rounds; i++) {
      const x = G.W / 2 - b.rounds * 7 + i * 14;
      let col = G.C.dusk;
      if (i < this.playerWins) col = G.C.lime;
      else if (i >= b.rounds - this.bossWins) col = G.C.red;
      ctx.fillStyle = col;
      ctx.fillRect(x, 26, 10, 10);
      ctx.strokeStyle = G.C.white;
      ctx.strokeRect(x + 0.5, 26.5, 9, 9);
    }

    if (this.phase === 'round') {
      G.UI.text(ctx, 'ROUND ' + (this.round + 1) + ': ' + this.skill, G.W / 2, 46, { align: 'center', size: 12, color: G.C.cyan, shadow: true });

      const mx = 90, my = 170, mw = 300, mh = 20;
      ctx.fillStyle = G.C.ink;
      ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
      ctx.fillStyle = G.C.red;
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = G.C.green;
      ctx.fillRect(mx + this.zone.start * mw, my, this.zone.width * mw, mh);
      ctx.fillStyle = G.C.white;
      ctx.fillRect(mx + this.needle * mw - 1, my - 6, 3, mh + 12);

      G.UI.text(ctx, G.CT('SPACE / ENTER / CLICK TO STRIKE', 'TAP ANYWHERE TO STRIKE'), G.W / 2, my + 30, { align: 'center', size: 8, color: G.C.gray });
      G.UI.text(ctx, 'YOUR ' + this.skill + ' SKILL WIDENS THE GREEN ZONE', G.W / 2, my + 44, { align: 'center', size: 6, color: G.C.slate });
    }

    if (this.phase === 'result') {
      const won = this.playerWins > this.bossWins;
      G.UI.text(ctx, won ? 'VICTORY!' : 'DEFEAT...', G.W / 2, 150, { align: 'center', size: 26, color: won ? G.C.lime : G.C.red, shadow: true });
      G.UI.text(ctx, 'ROUNDS: YOU ' + this.playerWins + ' - ' + this.bossWins + ' THEM', G.W / 2, 186, { align: 'center', size: 10, color: G.C.white });
      if (won) G.drawSprite(ctx, G.Sprites.trophy, G.W / 2 - 7, 202, 2);
      if (this.t > 0.8 && Math.floor(this.t * 2) % 2 === 0) {
        G.UI.text(ctx, G.CT('- PRESS ENTER -', '- TAP -'), G.W / 2, 230, { align: 'center', size: 8, color: G.C.yellow });
      }
    }

    this.particles.render(ctx);
    if (this.flash) {
      G.UI.text(ctx, this.flash.text, G.W / 2, 106, { align: 'center', size: 11, color: this.flash.color, shadow: true });
    }
  },
});
