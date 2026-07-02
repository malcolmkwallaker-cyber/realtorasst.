// ============================================================
// scenes/select.js - character selection
// ============================================================
'use strict';

G.Engine.register('select', {
  enter() {
    this.t = 0;
    this.index = 0; // 0 = bridger, 1 = malcolm
    this.chars = [G.Data.CHARACTERS.bridger, G.Data.CHARACTERS.malcolm];
  },

  update(dt) {
    this.t += dt;
    const I = G.Input;
    if (I.left() || I.right()) { this.index = 1 - this.index; G.Audio.move(); }

    // mouse hover/click on cards
    for (let i = 0; i < 2; i++) {
      const x = 24 + i * 236;
      if (I.inRect(x, 40, 196, 190)) {
        if (I.mouse.x !== this._mx || I.mouse.y !== this._my) this.index = i;
        if (I.mouse.clicked) this.pick();
      }
    }
    this._mx = I.mouse.x; this._my = I.mouse.y;

    if (I.confirm()) this.pick();
    if (I.cancel()) G.Engine.goto('title');
  },

  pick() {
    G.Audio.fanfare();
    const ch = this.chars[this.index];
    G.State.newGame(ch.id);
    G.State.autosave();
    G.Engine.goto('map', { newDay: true });
  },

  render(ctx) {
    ctx.fillStyle = G.C.dusk;
    ctx.fillRect(0, 0, G.W, G.H);

    G.UI.text(ctx, 'CHOOSE YOUR AGENT', G.W / 2, 12, { align: 'center', size: 14, color: G.C.yellow, shadow: true });

    for (let i = 0; i < 2; i++) {
      const ch = this.chars[i];
      const x = 24 + i * 236;
      const sel = this.index === i;
      G.UI.panel(ctx, x, 40, 196, 190, {
        bg: sel ? G.C.navy : G.C.ink,
        border: sel ? G.C.yellow : G.C.slate,
        title: ch.name + ' - ' + ch.title,
        titleBg: ch.color,
      });

      const hop = sel ? Math.abs(Math.sin(this.t * 4)) * 3 : 0;
      G.drawSprite(ctx, G.Sprites[ch.sprite], x + 14, 62 - hop, 3);

      let ty = 58;
      for (const line of G.UI.wrap(ctx, ch.bio.join(' '), 122, 6)) {
        G.UI.text(ctx, line, x + 66, ty, { size: 6, color: G.C.gray });
        ty += 7;
      }

      ty = 106;
      G.UI.text(ctx, 'STRENGTHS:', x + 66, ty, { size: 7, color: G.C.cyan }); ty += 9;
      for (const s of ch.strengths) {
        G.UI.text(ctx, '* ' + s, x + 70, ty, { size: 7, color: G.C.lime });
        ty += 9;
      }

      ty += 4;
      G.UI.text(ctx, 'SPECIAL: ' + ch.ability.name, x + 10, ty, { size: 8, color: G.C.yellow }); ty += 10;
      for (const l of G.UI.wrap(ctx, ch.ability.desc, 176, 7)) {
        G.UI.text(ctx, l, x + 10, ty, { size: 7, color: G.C.white });
        ty += 8;
      }

      if (sel && Math.floor(this.t * 2) % 2 === 0) {
        G.UI.text(ctx, 'PRESS ENTER!', x + 98, 218, { align: 'center', size: 8, color: G.C.yellow });
      }
    }

    G.UI.text(ctx, 'YOUR RIVAL PLAYS THE OTHER AGENT. MOST HOMES SOLD BY END OF JUNE WINS.', G.W / 2, 244, { align: 'center', size: 7, color: G.C.gray });
    G.UI.text(ctx, '[ESC] BACK', G.W / 2, 256, { align: 'center', size: 7, color: G.C.slate });
  },
});
