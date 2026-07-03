// ============================================================
// scenes/results.js - season end + leaderboard
// ============================================================
'use strict';

G.Engine.register('seasonEnd', {
  enter() {
    this.t = 0;
    this.particles = new G.Particles();
    const s = G.State.s;
    this.won = G.State.playerWon();
    this.tied = G.State.tied();
    this.score = G.State.seasonScore();

    // record on the leaderboard once
    if (!s.recorded) {
      s.recorded = true;
      G.Save.addLeaderboardEntry({
        name: G.State.char().name,
        homesSold: s.stats.homesSold,
        commission: s.stats.commission,
        score: this.score,
        won: this.won,
        date: new Date().toLocaleDateString(),
      });
    }
    // Cloud: record the completed season (engagement signal for the agent)
    if (G.Cloud && G.Cloud.signedIn()) {
      const id = G.Cloud.loadIdentity();
      id.seasons = (id.seasons || 0) + 1;
      G.Cloud.saveIdentity(id);
      try { G.Cloud.push(s); } catch (e) {}
    }

    if (this.won) G.Audio.fanfare(); else G.Audio.sadTromb();
  },

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    if (this.won && Math.random() < 0.2) {
      this.particles.spawn(G.rand(40, G.W - 40), -4, {
        count: 3, vyMin: 30, vyMax: 70, vxMin: -15, vxMax: 15, gravity: 10,
        colors: [G.C.yellow, G.C.lime, G.C.cyan, G.C.orange], life: 3,
      });
    }
    if (this.t > 1 && (G.Input.confirm() || G.Input.mouse.clicked)) {
      G.Audio.select();
      G.Engine.goto('leaderboard', { fromSeason: true });
    }
  },

  render(ctx) {
    const s = G.State.s;
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(0, 0, G.W, G.H);

    const title = this.tied ? 'DEAD HEAT!' : this.won ? 'REALTOR OF THE SEASON!' : 'SO CLOSE...';
    const col = this.tied ? G.C.yellow : this.won ? G.C.lime : G.C.red;
    G.UI.text(ctx, 'SEASON OVER', G.W / 2, 12, { align: 'center', size: 10, color: G.C.gray });
    G.UI.text(ctx, title, G.W / 2, 26, { align: 'center', size: 16, color: col, shadow: true });

    // podium
    const ch = G.State.char();
    const rc = G.State.rivalChar();
    const meX = this.won || this.tied ? 150 : 290;
    const themX = this.won || this.tied ? 290 : 150;
    ctx.fillStyle = G.C.slate;
    ctx.fillRect(130, 118, 80, this.won ? 26 : 14);
    ctx.fillRect(270, 118, 80, this.won ? 14 : 26);
    G.drawSprite(ctx, G.Sprites[ch.sprite], meX, (this.won ? 66 : 78), 3);
    G.drawSprite(ctx, G.Sprites[rc.sprite], themX, (this.won ? 78 : 66), 3);
    if (this.won) G.drawSprite(ctx, G.Sprites.trophy, meX + 42, 60, 2);
    else if (!this.tied) G.drawSprite(ctx, G.Sprites.trophy, themX + 42, 60, 2);

    G.UI.text(ctx, 'YOU: ' + s.stats.homesSold + ' HOMES', 170, 148, { align: 'center', size: 9, color: G.C.lime });
    G.UI.text(ctx, rc.name + ': ' + s.rival.homesSold + ' HOMES', 310, 148, { align: 'center', size: 9, color: G.C.red });

    // stat strip (3 columns x 3 rows)
    const rows = [
      ['COMMISSION', G.money(s.stats.commission)],
      ['LISTINGS', s.stats.listings],
      ['BUYERS', s.stats.buyers],
      ['REFERRALS', s.stats.referrals],
      ['REVIEWS', s.stats.reviews],
      ['FOLLOWERS', s.stats.followers],
      ['HAPPINESS', s.stats.happiness + '/100'],
      ['CONVERSION', G.pct(G.State.conversionRate())],
      ['BOSS WINS', s.stats.bossWins],
    ];
    for (let i = 0; i < rows.length; i++) {
      const cx = 40 + (i % 3) * 150;
      const cy = 168 + Math.floor(i / 3) * 24;
      G.UI.text(ctx, String(rows[i][0]), cx, cy, { size: 7, color: G.C.gray });
      G.UI.text(ctx, String(rows[i][1]), cx, cy + 9, { size: 9, color: G.C.white });
    }

    G.UI.text(ctx, 'FINAL SCORE: ' + this.score.toLocaleString('en-US'), G.W / 2, 244, { align: 'center', size: 11, color: G.C.yellow, shadow: true });

    this.particles.render(ctx);
    if (this.t > 1 && Math.floor(this.t * 2) % 2 === 0) {
      G.UI.text(ctx, '- PRESS ENTER FOR LEADERBOARD -', G.W / 2, 258, { align: 'center', size: 7, color: G.C.cyan });
    }
  },
});

// ------------------------------------------------------------
G.Engine.register('leaderboard', {
  enter(params = {}) {
    this.t = 0;
    this.fromSeason = !!params.fromSeason;
    this.entries = G.Save.getLeaderboard();
  },

  update(dt) {
    this.t += dt;
    if (this.t > 0.5 && (G.Input.confirm() || G.Input.cancel() || G.Input.mouse.clicked)) {
      G.Audio.back();
      G.Engine.goto('title');
    }
  },

  render(ctx) {
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(0, 0, G.W, G.H);
    G.UI.panel(ctx, 40, 10, G.W - 80, G.H - 20, { title: 'HALL OF FAME - TOP AGENTS', titleBg: G.C.purple });

    if (!this.entries.length) {
      G.UI.text(ctx, 'NO SEASONS COMPLETED YET.', G.W / 2, 110, { align: 'center', size: 10, color: G.C.gray });
      G.UI.text(ctx, 'GO SELL SOME HOUSES!', G.W / 2, 128, { align: 'center', size: 9, color: G.C.yellow });
    } else {
      G.UI.text(ctx, '#', 56, 32, { size: 7, color: G.C.slate });
      G.UI.text(ctx, 'AGENT', 76, 32, { size: 7, color: G.C.slate });
      G.UI.text(ctx, 'HOMES', 170, 32, { size: 7, color: G.C.slate });
      G.UI.text(ctx, 'COMMISSION', 220, 32, { size: 7, color: G.C.slate });
      G.UI.text(ctx, 'SCORE', 330, 32, { size: 7, color: G.C.slate });
      G.UI.text(ctx, 'W?', 396, 32, { size: 7, color: G.C.slate });

      let y = 46;
      this.entries.forEach((e, i) => {
        const rowCol = i === 0 ? G.C.yellow : i === 1 ? G.C.gray : i === 2 ? G.C.orange : G.C.white;
        G.UI.text(ctx, String(i + 1), 56, y, { size: 8, color: rowCol });
        G.UI.text(ctx, e.name, 76, y, { size: 8, color: e.name === 'BRIDGER' ? '#c0562f' : G.C.lime });
        G.UI.text(ctx, String(e.homesSold), 170, y, { size: 8, color: rowCol });
        G.UI.text(ctx, G.money(e.commission), 220, y, { size: 8, color: G.C.yellow });
        G.UI.text(ctx, e.score.toLocaleString('en-US'), 330, y, { size: 8, color: rowCol });
        G.UI.text(ctx, e.won ? 'W' : 'L', 396, y, { size: 8, color: e.won ? G.C.lime : G.C.red });
        y += 17;
      });
    }

    if (Math.floor(this.t * 2) % 2 === 0) {
      G.UI.text(ctx, '- PRESS ENTER FOR TITLE -', G.W / 2, G.H - 24, { align: 'center', size: 8, color: G.C.cyan });
    }
  },
});
