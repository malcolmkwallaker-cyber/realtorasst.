// ============================================================
// scenes/select.js - character selection carousel
// 2 headliners + 4 unlockable secret agents
// ============================================================
'use strict';

G.Engine.register('select', {
  ORDER: ['bridger', 'malcolm', 'grandpa', 'influencer', 'veteran', 'rookie', 'blake', 'tyler'],

  enter() {
    this.t = 0;
    this.index = 0;
  },

  charAt(i) { return G.Data.CHARACTERS[this.ORDER[i]]; },
  isUnlocked(i) { return G.Profile.unlocked(this.ORDER[i]); },

  update(dt) {
    this.t += dt;
    const I = G.Input;
    if (I.left())  { this.index = (this.index + this.ORDER.length - 1) % this.ORDER.length; G.Audio.move(); }
    if (I.right()) { this.index = (this.index + 1) % this.ORDER.length; G.Audio.move(); }

    // thumbnail strip clicks
    for (let i = 0; i < this.ORDER.length; i++) {
      const x = G.W / 2 - this.ORDER.length * 22 + i * 44;
      if (I.clickedRect(x, 218, 40, 40)) {
        if (this.index === i) this.pick();
        else { this.index = i; G.Audio.move(); }
      }
    }
    // big card click
    if (I.clickedRect(90, 30, 300, 180)) this.pick();

    if (I.confirm()) this.pick();
    if (I.cancel()) G.Engine.goto('title');
  },

  pick() {
    if (!this.isUnlocked(this.index)) { G.Audio.bad(); return; }
    G.Audio.fanfare();
    const ch = this.charAt(this.index);
    G.State.newGame(ch.id);
    G.State.autosave();
    G.Engine.goto('map', { newDay: true });
  },

  render(ctx) {
    ctx.fillStyle = G.C.dusk;
    ctx.fillRect(0, 0, G.W, G.H);

    G.UI.text(ctx, 'CHOOSE YOUR AGENT', G.W / 2, 8, { align: 'center', size: 13, color: G.C.yellow, shadow: true });
    G.UI.text(ctx, '< LEFT / RIGHT >', G.W / 2, 22, { align: 'center', size: 7, color: G.C.slate });

    const ch = this.charAt(this.index);
    const unlocked = this.isUnlocked(this.index);

    // big card
    G.UI.panel(ctx, 90, 32, 300, 178, {
      bg: G.C.navy,
      border: unlocked ? G.C.yellow : G.C.slate,
      title: unlocked ? (ch.name + ' - ' + ch.title) : '????? - SECRET AGENT',
      titleBg: unlocked ? ch.color : G.C.dusk,
    });

    if (unlocked) {
      const hop = Math.abs(Math.sin(this.t * 4)) * 3;
      G.drawSprite(ctx, G.Sprites[ch.sprite], 108, 56 - hop, 4);

      let ty = 50;
      for (const line of G.UI.wrap(ctx, ch.bio.join(' '), 190, 7)) {
        G.UI.text(ctx, line, 186, ty, { size: 7, color: G.C.gray });
        ty += 8;
      }
      ty += 4;
      G.UI.text(ctx, 'STRENGTHS:', 186, ty, { size: 7, color: G.C.cyan }); ty += 9;
      for (const st of ch.strengths) {
        G.UI.text(ctx, '* ' + st, 190, ty, { size: 7, color: G.C.lime });
        ty += 9;
      }
      ty += 3;
      G.UI.text(ctx, 'SPECIAL: ' + ch.ability.name, 104, Math.max(ty, 150), { size: 8, color: G.C.yellow });
      let ay = Math.max(ty, 150) + 10;
      for (const l of G.UI.wrap(ctx, ch.ability.desc, 274, 7)) {
        G.UI.text(ctx, l, 104, ay, { size: 7, color: G.C.white });
        ay += 8;
      }
      if (Math.floor(this.t * 2) % 2 === 0) {
        G.UI.text(ctx, 'PRESS ENTER!', 240, 198, { align: 'center', size: 8, color: G.C.yellow });
      }
    } else {
      // locked silhouette
      ctx.fillStyle = G.C.ink;
      ctx.fillRect(108, 56, 56, 68);
      G.UI.text(ctx, '?', 136, 78, { align: 'center', size: 26, color: G.C.slate });
      G.UI.text(ctx, 'LOCKED', 240, 90, { align: 'center', size: 12, color: G.C.slate });
      G.UI.text(ctx, 'HOW TO UNLOCK:', 240, 120, { align: 'center', size: 8, color: G.C.cyan });
      G.UI.text(ctx, ch.unlockHint, 240, 134, { align: 'center', size: 8, color: G.C.yellow });
    }

    // thumbnail strip
    for (let i = 0; i < this.ORDER.length; i++) {
      const c = this.charAt(i);
      const un = this.isUnlocked(i);
      const x = G.W / 2 - this.ORDER.length * 22 + i * 44;
      const sel = i === this.index;
      ctx.fillStyle = sel ? G.C.blue : G.C.ink;
      ctx.fillRect(x, 218, 40, 40);
      ctx.strokeStyle = sel ? G.C.yellow : G.C.slate;
      ctx.strokeRect(x + 0.5, 218.5, 39, 39);
      if (un) {
        G.drawSprite(ctx, G.Sprites[c.sprite], x + 6, 220, 2);
      } else {
        G.UI.text(ctx, '?', x + 20, 228, { align: 'center', size: 14, color: G.C.slate });
      }
    }

    G.UI.text(ctx, 'MOST HOMES SOLD BY END OF JUNE WINS. [ESC] BACK', G.W / 2, 262, { align: 'center', size: 6, color: G.C.gray });
  },
});
