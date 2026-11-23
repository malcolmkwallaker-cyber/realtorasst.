// ============================================================
// scenes/select.js - roster select
// Malcolm, Parker, and Liz up top. Office agents below,
// locked until a milestone, saved in localStorage.
// ============================================================
'use strict';

G.Engine.register('select', {
  enter() {
    this.t = 0;
    this.phase = 'char';
    this.diffIndex = 1;
    this.pace = 'quick';
    this.scroll = 0;
    const order = this.order();
    const malcolm = order.indexOf('malcolm');
    this.index = malcolm >= 0 ? malcolm : 0;
  },

  DIFFS: ['casual', 'standard', 'hard'],

  order() { return G.Data.ROSTER || Object.keys(G.Data.CHARACTERS); },
  charAt(i) { return G.Data.CHARACTERS[this.order()[i]]; },
  isUnlocked(i) {
    const ch = this.charAt(i);
    return !!(ch && G.Profile.unlocked(ch.id));
  },

  visibleRows() { return Math.max(6, Math.floor((G.H - 46) / 16)); },

  update(dt) {
    this.t += dt;
    const I = G.Input;
    if (this.phase === 'difficulty') {
      this.updateDifficulty(I);
      return;
    }

    const n = this.order().length;
    if (I.up()) { this.index = (this.index + n - 1) % n; G.Audio.move(); }
    if (I.down()) { this.index = (this.index + 1) % n; G.Audio.move(); }

    if (I.touch && I.drag.active) {
      this._drag = (this._drag || 0) - I.drag.frameDY;
      const vis = this.visibleRows();
      const maxScroll = Math.max(0, n - vis);
      while (this._drag >= 16 && this.scroll < maxScroll) { this.scroll++; this._drag -= 16; }
      while (this._drag <= -16 && this.scroll > 0) { this.scroll--; this._drag += 16; }
    }

    const vis = this.visibleRows();
    const maxScroll = Math.max(0, n - vis);
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + vis) this.scroll = this.index - vis + 1;
    this.scroll = G.clamp(this.scroll, 0, maxScroll);

    for (let row = 0; row < vis; row++) {
      const i = this.scroll + row;
      if (i >= n) break;
      if (I.clickedRect(6, 24 + row * 16, 158, 15)) {
        if (this.index === i) this.pick();
        else { this.index = i; G.Audio.move(); }
      }
    }
    if (I.clickedRect(172, 24, G.W - 180, G.H - 40)) {
      if (this.isUnlocked(this.index)) this.pick();
      else G.Audio.bad();
    }
    if (I.confirm()) this.pick();
    if (I.cancel()) G.Engine.goto('title');
  },

  pick() {
    if (!this.isUnlocked(this.index)) { G.Audio.bad(); return; }
    G.Audio.select();
    this.phase = 'difficulty';
  },

  updateDifficulty(I) {
    if (I.left()) { this.diffIndex = (this.diffIndex + 2) % 3; G.Audio.move(); }
    if (I.right()) { this.diffIndex = (this.diffIndex + 1) % 3; G.Audio.move(); }
    for (let i = 0; i < 3; i++) {
      const x = 16 + i * 154;
      if (I.clickedRect(x, 48, 146, 130, 4)) {
        if (this.diffIndex === i) { this.startGame(); return; }
        this.diffIndex = i; G.Audio.move();
      }
    }
    if (I.clickedRect(16, G.H - 46, 140, 18)) { this.pace = 'quick'; G.Audio.move(); }
    if (I.clickedRect(164, G.H - 46, 140, 18)) { this.pace = 'full'; G.Audio.move(); }
    if (I.confirm()) { this.startGame(); return; }
    if (I.cancel()) { this.phase = 'char'; G.Audio.back(); }
  },

  startGame() {
    G.Audio.fanfare();
    const ch = this.charAt(this.index);
    G.State.newGame(ch.id, this.DIFFS[this.diffIndex], this.pace);
    G.State.autosave();
    G.Engine.goto('map', { newDay: true });
  },

  render(ctx) {
    ctx.fillStyle = G.C.dusk;
    ctx.fillRect(0, 0, G.W, G.H);
    if (this.phase === 'difficulty') { this.renderDifficulty(ctx); return; }

    const unlockedN = G.Roster ? G.Roster.unlockedCount() : 0;
    const officeN = G.Roster ? G.Roster.officeCount : 0;
    G.UI.text(ctx, 'CHOOSE YOUR AGENT', 8, 6, { size: 12, color: G.C.yellow, shadow: true });
    G.UI.text(ctx, 'OFFICE ' + unlockedN + '/' + officeN, G.W - 8, 8, { align: 'right', size: 8, color: G.C.cyan });

    const n = this.order().length;
    const vis = this.visibleRows();
    for (let row = 0; row < vis; row++) {
      const i = this.scroll + row;
      if (i >= n) break;
      const ch = this.charAt(i);
      const un = this.isUnlocked(i);
      const sel = i === this.index;
      const y = 24 + row * 16;
      ctx.fillStyle = sel ? G.C.navy : G.C.ink;
      ctx.fillRect(6, y, 158, 15);
      ctx.strokeStyle = sel ? G.C.yellow : G.C.slate;
      ctx.strokeRect(6.5, y + 0.5, 157, 14);
      if (un) {
        G.drawSprite(ctx, G.Sprites[ch.sprite] || G.Sprites.silhouette, 8, y - 1, 1);
        G.UI.text(ctx, ch.short || ch.name, 28, y + 3, { size: 7, color: ch.color || G.C.white });
      } else {
        G.drawSprite(ctx, G.Sprites.silhouette, 8, y - 1, 1);
        G.UI.text(ctx, ch.short || 'LOCKED', 28, y + 3, { size: 7, color: G.C.slate });
      }
      if (ch.badge && un) G.UI.text(ctx, ch.badge, 158, y + 3, { align: 'right', size: 6, color: G.C.yellow });
      else if (!un) G.UI.text(ctx, 'LOCK', 158, y + 3, { align: 'right', size: 6, color: G.C.slate });
    }

    this.renderCard(ctx);
    G.UI.text(ctx, G.CT('UP/DOWN, ENTER   [ESC] BACK', 'TAP A NAME, TAP THE CARD TO START'), G.W / 2, G.H - 10, { align: 'center', size: 6, color: G.C.gray });
  },

  renderCard(ctx) {
    const ch = this.charAt(this.index);
    const un = this.isUnlocked(this.index);
    const x = 172, y = 24, w = G.W - 180, h = G.H - 40;
    G.UI.panel(ctx, x, y, w, h, {
      bg: G.C.navy,
      border: un ? (ch.badge ? G.C.yellow : G.C.white) : G.C.slate,
      title: un ? ch.name : ch.name,
      titleBg: un ? (ch.color || G.C.blue) : G.C.dusk,
      titleColor: un && ch.color === G.C.yellow ? G.C.ink : G.C.white,
    });
    const sprite = un ? (G.Sprites[ch.sprite] || G.Sprites.silhouette) : G.Sprites.silhouette;
    const hop = un ? Math.abs(Math.sin(this.t * 4)) * 2 : 0;
    G.drawSprite(ctx, sprite, x + 8, y + 20 - hop, 3);

    let ty = y + 18;
    const tx = x + 62;
    const tw = w - 72;
    if (un) {
      G.UI.text(ctx, ch.title + (ch.badge ? '  [' + ch.badge + ']' : ''), tx, ty, { size: 7, color: G.C.yellow });
      ty += 12;
      for (const line of G.UI.wrap(ctx, ch.bio.join(' '), tw, 7).slice(0, 4)) {
        G.UI.text(ctx, line, tx, ty, { size: 7, color: G.C.gray });
        ty += 8;
      }
      ty += 3;
      for (const st of ch.strengths) {
        G.UI.text(ctx, '* ' + st, tx, ty, { size: 7, color: G.C.lime });
        ty += 8;
      }
      ty += 2;
      G.UI.text(ctx, 'SPECIAL: ' + ch.ability.name, tx, ty, { size: 7, color: G.C.yellow });
      ty += 9;
      for (const line of G.UI.wrap(ctx, ch.ability.desc, tw, 7).slice(0, 3)) {
        G.UI.text(ctx, line, tx, ty, { size: 7, color: G.C.white });
        ty += 8;
      }
      G.UI.text(ctx, '"' + ch.catchphrase + '"', x + 10, y + h - 22, { size: 7, color: G.C.cyan });
      if (Math.floor(this.t * 2) % 2 === 0) {
        G.UI.text(ctx, G.CT('ENTER TO PLAY', 'TAP THE CARD'), x + w - 8, y + h - 14, { align: 'right', size: 7, color: G.C.yellow });
      }
    } else {
      G.UI.text(ctx, 'LOCKED', tx, ty, { size: 12, color: G.C.slate });
      ty += 16;
      G.UI.text(ctx, ch.title, tx, ty, { size: 7, color: G.C.gray });
      ty += 14;
      G.UI.text(ctx, 'HOW TO UNLOCK', tx, ty, { size: 7, color: G.C.cyan });
      ty += 10;
      for (const line of G.UI.wrap(ctx, ch.unlockHint || 'KEEP PLAYING', tw, 8)) {
        G.UI.text(ctx, line, tx, ty, { size: 8, color: G.C.yellow });
        ty += 10;
      }
      ty += 6;
      G.UI.text(ctx, 'Win milestones as Malcolm, Parker, or Liz.', tx, ty, { size: 7, color: G.C.gray });
      ty += 9;
      G.UI.text(ctx, 'Unlocks stay on this device.', tx, ty, { size: 7, color: G.C.gray });
    }
  },

  renderDifficulty(ctx) {
    const ch = this.charAt(this.index);
    G.UI.text(ctx, 'MARKET AND SEASON', G.W / 2, 8, { align: 'center', size: 13, color: G.C.yellow, shadow: true });
    G.UI.text(ctx, ch.short + '  -  ' + ch.title, G.W / 2, 26, { align: 'center', size: 8, color: G.C.gray });

    const DETAIL = {
      casual: ['Patient leads', 'A sleepy rival', 'Good for learning'],
      standard: ['Leads cool daily', 'A fair race', 'The intended game'],
      hard: ['Leads cool fast', 'A hungry rival', 'More setbacks'],
    };
    const COLS = [G.C.green, G.C.blue, G.C.red];
    for (let i = 0; i < 3; i++) {
      const id = this.DIFFS[i];
      const B = G.Data.BALANCE[id];
      const x = 16 + i * 154;
      const sel = this.diffIndex === i;
      G.UI.panel(ctx, x, 48, 146, 132, {
        bg: sel ? G.C.navy : G.C.ink,
        border: sel ? G.C.yellow : G.C.slate,
        title: B.label,
        titleBg: COLS[i],
      });
      let y = 68;
      for (const line of G.UI.wrap(ctx, B.desc, 130, 7)) {
        G.UI.text(ctx, line, x + 8, y, { size: 7, color: G.C.gray });
        y += 9;
      }
      y += 4;
      for (const d of DETAIL[id]) {
        G.UI.text(ctx, '* ' + d, x + 8, y, { size: 7, color: sel ? G.C.white : G.C.slate });
        y += 11;
      }
    }

    const qSel = this.pace === 'quick';
    G.UI.button(ctx, qSel ? 'QUICK SEASON *' : 'QUICK SEASON', 16, G.H - 46, 140, 18, { size: 7, selected: qSel });
    G.UI.button(ctx, !qSel ? 'FULL SEASON *' : 'FULL SEASON', 164, G.H - 46, 140, 18, { size: 7, selected: !qSel });
    G.UI.text(ctx, qSel ? '5 DAYS A MONTH. A TIGHT RACE.' : '8 DAYS A MONTH. THE LONG HAUL.', 312, G.H - 42, { size: 6, color: G.C.gray });
    G.UI.text(ctx, G.CT('ENTER STARTS  [ESC] BACK', 'TAP A MARKET, TAP AGAIN TO START'), G.W / 2, G.H - 12, { align: 'center', size: 7, color: G.C.slate });
  },
});
