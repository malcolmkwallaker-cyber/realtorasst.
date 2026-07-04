// ============================================================
// scenes/achievements.js - lifetime achievements + unlocks
// ============================================================
'use strict';

G.Engine.register('achievements', {
  enter() {
    this.t = 0;
    this.scroll = 0;
  },

  // rows that fit between the header (y=26) and the roster footer
  perPage() { return Math.floor((G.H - 26 - 56) / 17); },

  update(dt) {
    this.t += dt;
    const list = G.Data.ACHIEVEMENTS;
    const maxScroll = Math.max(0, list.length - this.perPage());
    if (G.Input.up()) this.scroll = Math.max(0, this.scroll - 1);
    else if (G.Input.down()) this.scroll = Math.min(maxScroll, this.scroll + 1);
    else if (G.Input.cancel() || G.Input.confirm() || G.Input.mouse.clicked) {
      G.Audio.back();
      G.Engine.goto('title');
    }
  },

  render(ctx) {
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(0, 0, G.W, G.H);
    const p = G.Profile.load();
    const done = G.Data.ACHIEVEMENTS.filter(a => p.achievements[a.id]).length;

    G.UI.panel(ctx, 20, 8, G.W - 40, G.H - 16, {
      title: 'ACHIEVEMENTS (' + done + '/' + G.Data.ACHIEVEMENTS.length + ')',
      titleBg: G.C.purple,
    });

    let y = 26;
    const list = G.Data.ACHIEVEMENTS.slice(this.scroll, this.scroll + this.perPage());
    for (const a of list) {
      const got = !!p.achievements[a.id];
      ctx.fillStyle = got ? 'rgba(56,183,100,0.15)' : 'rgba(26,28,44,0.6)';
      ctx.fillRect(28, y, G.W - 56, 16);
      G.UI.text(ctx, got ? '*' : '-', 34, y + 4, { size: 8, color: got ? G.C.yellow : G.C.slate });
      G.UI.text(ctx, a.name, 46, y + 4, { size: 8, color: got ? G.C.lime : G.C.gray });
      let progress = '';
      if (a.stat && !got) {
        progress = (p.lifetime[a.stat] || 0) + '/' + a.goal + '  ';
      }
      G.UI.text(ctx, progress + a.desc, G.W - 34, y + 5, { align: 'right', size: 6, color: got ? G.C.white : G.C.slate });
      y += 17;
    }

    // secret agent roster
    const unlockedChars = Object.keys(G.Data.SECRET_CHARACTERS).filter(id => p.unlocks[id]).length;
    G.UI.text(ctx, 'SECRET AGENTS UNLOCKED: ' + unlockedChars + '/4', G.W / 2, G.H - 52, { align: 'center', size: 8, color: G.C.cyan });
    G.UI.text(ctx, 'UP/DOWN SCROLL - [ESC] BACK', G.W / 2, G.H - 26, { align: 'center', size: 7, color: G.C.yellow });
  },
});
