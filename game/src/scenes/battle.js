// ============================================================
// scenes/battle.js - HEAD-TO-HEAD LISTING BATTLE
// Both agents pitch the same seller. Four rounds:
// dialogue, market knowledge, presentation, negotiation.
// ============================================================
'use strict';

G.Engine.register('battle', {
  enter() {
    this.t = 0;
    this.phase = 'intro';     // intro | choice | simon | needle | result
    this.round = 0;           // 0 dialogue, 1 market, 2 presentation, 3 negotiation
    this.wins = 0;
    this.losses = 0;
    this.flash = null;
    this.particles = new G.Particles();
    this.rival = G.State.rivalChar();
    G.Audio.stopMusic();
    G.Audio.ring();
  },

  exit() { G.Audio.startMusic(); },

  ROUND_NAMES: ['DIALOGUE', 'MARKET KNOWLEDGE', 'PRESENTATION', 'NEGOTIATION'],

  startRound() {
    this.t = 0;
    if (this.round === 0 || this.round === 1) {
      const pool = this.round === 0 ? G.Data.BATTLE.dialogue : G.Data.BATTLE.market;
      const q = G.choice(pool);
      this.q = q;
      this.opts = G.shuffle([{ t: q.good, ok: true }, { t: q.bad[0], ok: false }, { t: q.bad[1], ok: false }]);
      this.sel = 0;
      this.timer = 7;
      this.phase = 'choice';
    } else if (this.round === 2) {
      const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      this.seq = Array.from({ length: 4 }, () => G.choice(dirs));
      this.showIdx = -1;
      this.showTimer = 0.4;
      this.inputIdx = 0;
      this.simonState = 'show';
      this.phase = 'simon';
    } else {
      const bonus = (G.State.char().negotiateBonus || 0) * 0.3 + G.State.s.stats.reputation / 1500;
      const width = G.clamp(0.16 + bonus, 0.1, 0.3);
      this.zone = { start: G.rand(0.2, 0.8 - width), width };
      this.needle = 0; this.dir = 1; this.speed = 2.1; this.locked = false;
      this.phase = 'needle';
    }
  },

  roundOver(won) {
    if (won) { this.wins++; this.flash = { text: 'ROUND WON!', color: G.C.lime, t: 1 }; G.Audio.good(); }
    else { this.losses++; this.flash = { text: this.rival.name + ' TAKES IT!', color: G.C.red, t: 1 }; G.Audio.bad(); }
    this.phase = 'between';
    setTimeout(() => {
      this.round++;
      if (this.round >= 4) {
        this.phase = 'result';
        this.t = 0;
        this.won = this.wins > this.losses || (this.wins === this.losses && G.State.s.stats.reputation >= 50);
        if (this.won) G.Audio.fanfare(); else G.Audio.sadTromb();
      } else {
        this.startRound();
      }
    }, 1000);
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

    if (this.phase === 'choice') {
      this.timer -= dt;
      if (this.timer <= 0) { this.roundOver(false); return; }
      if (G.Input.up())   { this.sel = (this.sel + 2) % 3; G.Audio.move(); }
      if (G.Input.down()) { this.sel = (this.sel + 1) % 3; G.Audio.move(); }
      let picked = -1;
      if (G.Input.confirm()) picked = this.sel;
      for (let i = 0; i < 3; i++) {
        if (G.Input.clickedRect(60, 130 + i * 30, 360, 26)) picked = i;
      }
      if (picked >= 0) { this.sel = picked; this.roundOver(this.opts[picked].ok); }
      return;
    }

    if (this.phase === 'simon') {
      if (this.simonState === 'show') {
        this.showTimer -= dt;
        if (this.showTimer <= 0) {
          this.showIdx++;
          if (this.showIdx >= this.seq.length) this.simonState = 'input';
          else { this.showTimer = 0.55; G.Audio.tick(); }
        }
        return;
      }
      const dirs = { ArrowUp: G.Input.up(), ArrowDown: G.Input.down(), ArrowLeft: G.Input.left(), ArrowRight: G.Input.right() };
      for (const [key, hit] of Object.entries(dirs)) {
        if (!hit) continue;
        if (key === this.seq[this.inputIdx]) {
          G.Audio.move();
          this.inputIdx++;
          if (this.inputIdx >= this.seq.length) this.roundOver(true);
        } else {
          this.roundOver(false);
        }
        break;
      }
      return;
    }

    if (this.phase === 'needle') {
      if (this.locked) return;
      this.needle += this.dir * this.speed * dt;
      if (this.needle > 1) { this.needle = 1; this.dir = -1; }
      if (this.needle < 0) { this.needle = 0; this.dir = 1; }
      if (G.Input.confirm() || G.Input.mouse.clicked) {
        this.locked = true;
        const hit = this.needle >= this.zone.start && this.needle <= this.zone.start + this.zone.width;
        this.roundOver(hit);
      }
      return;
    }

    if (this.phase === 'result') {
      if (this.t > 0.8 && (G.Input.confirm() || G.Input.mouse.clicked)) {
        const res = G.State.resolveBattle(this.won);
        G.Popup.show({
          title: this.won ? 'LISTING BATTLE WON!' : 'LISTING BATTLE LOST',
          lines: res.lines,
          color: this.won ? G.C.green : G.C.red,
          onClose: () => G.Engine.goto('map', { newDay: false }),
        });
      }
    }
  },

  render(ctx) {
    ctx.fillStyle = G.C.navy;
    ctx.fillRect(0, 0, G.W, G.H);
    // spotlight cone
    ctx.fillStyle = 'rgba(255,205,117,0.06)';
    ctx.beginPath();
    ctx.moveTo(G.W / 2, 0);
    ctx.lineTo(G.W / 2 - 140, G.H);
    ctx.lineTo(G.W / 2 + 140, G.H);
    ctx.fill();

    // header
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(0, 0, G.W, 24);
    G.UI.text(ctx, 'HEAD-TO-HEAD LISTING BATTLE', 8, 5, { size: 11, color: G.C.red });
    G.UI.text(ctx, 'ROUNDS: YOU ' + this.wins + ' - ' + this.losses + ' RIVAL', G.W - 8, 8, { align: 'right', size: 7, color: G.C.gray });

    // both agents + the seller
    G.drawSprite(ctx, G.Sprites[G.State.char().sprite], 50, 46, 3);
    G.drawSprite(ctx, G.Sprites[this.rival.sprite], 380, 46, 3, true);
    G.drawSprite(ctx, G.Sprites.cabin, G.W / 2 - 21, 40, 3);
    G.UI.text(ctx, 'YOU', 71, 100, { align: 'center', size: 8, color: G.C.lime });
    G.UI.text(ctx, this.rival.name, 401, 100, { align: 'center', size: 8, color: G.C.red });
    G.UI.text(ctx, 'THE SELLERS', G.W / 2, 70, { align: 'center', size: 7, color: G.C.yellow });

    if (this.phase === 'intro') {
      G.UI.text(ctx, 'BOTH OF YOU WANT THIS LISTING.', G.W / 2, 120, { align: 'center', size: 10, color: G.C.white, shadow: true });
      G.UI.text(ctx, this.rival.name + ' pulled into the driveway RIGHT behind you.', G.W / 2, 138, { align: 'center', size: 8, color: G.C.gray });
      G.UI.text(ctx, 'Win at dialogue, market knowledge, presentation & negotiation.', G.W / 2, 152, { align: 'center', size: 8, color: G.C.cyan });
      G.UI.text(ctx, 'Best of 4. Ties go to the agent with more REPUTATION.', G.W / 2, 164, { align: 'center', size: 7, color: G.C.slate });
      if (Math.floor(this.t * 2) % 2 === 0) {
        G.UI.text(ctx, '- PRESS ENTER TO PITCH -', G.W / 2, 190, { align: 'center', size: 9, color: G.C.yellow });
      }
      return;
    }

    if (this.phase !== 'result') {
      G.UI.text(ctx, 'ROUND ' + (this.round + 1) + ': ' + this.ROUND_NAMES[Math.min(this.round, 3)], G.W / 2, 108, { align: 'center', size: 10, color: G.C.cyan, shadow: true });
    }

    if (this.phase === 'choice') {
      G.UI.text(ctx, this.q.prompt, G.W / 2, 122, { align: 'center', size: 8, color: G.C.white });
      G.UI.bar(ctx, 140, 118, 200, 4, this.timer / 7, this.timer < 2 ? G.C.red : G.C.orange);
      for (let i = 0; i < 3; i++) {
        const y = 130 + i * 30;
        const sel = this.sel === i;
        ctx.fillStyle = sel ? G.C.blue : G.C.ink;
        ctx.fillRect(60, y, 360, 26);
        ctx.strokeStyle = sel ? G.C.yellow : G.C.slate;
        ctx.strokeRect(60.5, y + 0.5, 359, 25);
        G.UI.text(ctx, (sel ? '> ' : '  ') + this.opts[i].t, 68, y + 9, { size: 8, color: sel ? G.C.white : G.C.gray });
      }
      G.UI.text(ctx, 'UP/DOWN + ENTER (OR CLICK)', G.W / 2, 226, { align: 'center', size: 7, color: G.C.slate });
    }

    if (this.phase === 'simon') {
      const ARROWS = { ArrowUp: '^', ArrowDown: 'v', ArrowLeft: '<', ArrowRight: '>' };
      const n = this.seq.length;
      const startX = G.W / 2 - n * 16;
      G.UI.text(ctx, this.simonState === 'show' ? 'WATCH THE WINNING PRESENTATION FLOW...' : 'REPEAT IT WITH ARROW KEYS!',
        G.W / 2, 128, { align: 'center', size: 9, color: this.simonState === 'show' ? G.C.orange : G.C.cyan });
      for (let i = 0; i < n; i++) {
        const x = startX + i * 32;
        let show = false, litUp = false;
        if (this.simonState === 'show') { show = i <= this.showIdx; litUp = i === this.showIdx; }
        else { show = i < this.inputIdx; }
        ctx.fillStyle = litUp ? G.C.yellow : show ? G.C.blue : G.C.ink;
        ctx.fillRect(x, 148, 26, 26);
        ctx.strokeStyle = G.C.white;
        ctx.strokeRect(x + 0.5, 148.5, 25, 25);
        if (show) G.UI.text(ctx, ARROWS[this.seq[i]], x + 13, 154, { align: 'center', size: 13, color: litUp ? G.C.ink : G.C.white });
        else if (this.simonState === 'input') G.UI.text(ctx, '?', x + 13, 154, { align: 'center', size: 13, color: G.C.slate });
      }
    }

    if (this.phase === 'needle') {
      G.UI.text(ctx, 'CLOSE THE SELLER. STOP IN THE GREEN.', G.W / 2, 128, { align: 'center', size: 9, color: G.C.white });
      const mx = 90, my = 160, mw = 300, mh = 18;
      ctx.fillStyle = G.C.ink;
      ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
      ctx.fillStyle = G.C.red;
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = G.C.green;
      ctx.fillRect(mx + this.zone.start * mw, my, this.zone.width * mw, mh);
      ctx.fillStyle = G.C.white;
      ctx.fillRect(mx + this.needle * mw - 1, my - 5, 3, mh + 10);
      G.UI.text(ctx, 'SPACE / ENTER / CLICK', G.W / 2, my + 28, { align: 'center', size: 8, color: G.C.gray });
    }

    if (this.phase === 'result') {
      G.UI.text(ctx, this.won ? 'THEY PICKED YOU!' : 'THEY PICKED... THEM.', G.W / 2, 140, { align: 'center', size: 18, color: this.won ? G.C.lime : G.C.red, shadow: true });
      if (this.t > 0.8 && Math.floor(this.t * 2) % 2 === 0) {
        G.UI.text(ctx, '- PRESS ENTER -', G.W / 2, 180, { align: 'center', size: 8, color: G.C.yellow });
      }
    }

    this.particles.render(ctx);
    if (this.flash) {
      G.UI.text(ctx, this.flash.text, G.W / 2, 200, { align: 'center', size: 12, color: this.flash.color, shadow: true });
    }
  },
});
