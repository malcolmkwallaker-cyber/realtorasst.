// ============================================================
// scenes/shop.js - business upgrades
// ============================================================
'use strict';

G.Engine.register('shop', {
  enter() {
    this.t = 0;
    this.buildMenu();
  },

  buildMenu() {
    const s = G.State.s;
    const items = G.Data.UPGRADES.map(u => {
      const owned = G.State.has(u.id);
      const afford = s.cash >= u.cost;
      return {
        label: u.name,
        id: u.id,
        disabled: owned || !afford,
        note: owned ? 'OWNED' : G.money(u.cost),
        desc: u.desc,
      };
    });
    items.push({ label: 'BACK TO MAP', id: 'back', note: '', desc: 'Return to the grind.' });

    const keep = this.menu ? this.menu.index : 0;
    this.menu = new G.Menu(items, {
      x: 12, y: 40, w: 210, rowH: 15,
      onSelect: (it) => {
        if (it.id === 'back') { G.Engine.goto('map'); return; }
        if (G.State.buyUpgrade(it.id)) {
          G.Audio.cash();
          this.buildMenu();
        } else {
          G.Audio.bad();
        }
      },
    });
    this.menu.index = Math.min(keep, items.length - 1);
  },

  update(dt) {
    this.t += dt;
    if (G.Input.cancel()) { G.Audio.back(); G.Engine.goto('map'); return; }
    this.menu.update();
  },

  render(ctx) {
    const s = G.State.s;
    ctx.fillStyle = G.C.dusk;
    ctx.fillRect(0, 0, G.W, G.H);

    G.UI.panel(ctx, 4, 4, G.W - 8, G.H - 8, { title: 'PRO SHOP - GROW YOUR BUSINESS', titleBg: G.C.purple, bg: G.C.ink });
    G.UI.text(ctx, 'CASH: ' + G.money(s.cash), G.W - 16, 22, { align: 'right', size: 10, color: G.C.yellow });

    this.menu.render(ctx);

    // detail card for the highlighted upgrade
    const it = this.menu.items[this.menu.index];
    G.UI.panel(ctx, 236, 40, 230, 150, { title: it.label, titleBg: G.C.blue, bg: G.C.navy });
    let y = 60;
    for (const l of G.UI.wrap(ctx, it.desc || '', 206, 8)) {
      G.UI.text(ctx, l, 246, y, { size: 8, color: G.C.white });
      y += 11;
    }
    if (it.id !== 'back') {
      const owned = G.State.has(it.id);
      G.UI.text(ctx, owned ? 'ALREADY OWNED' : 'COST: ' + it.note, 246, 170, {
        size: 9, color: owned ? G.C.lime : (s.cash >= (G.Data.UPGRADES.find(u => u.id === it.id) || {}).cost ? G.C.yellow : G.C.red),
      });
    }

    // owned list
    const owned = G.Data.UPGRADES.filter(u => G.State.has(u.id));
    G.UI.text(ctx, 'OWNED: ' + (owned.length ? owned.map(u => u.name).join(', ') : 'NOTHING YET'), 12, G.H - 30, { size: 6, color: G.C.gray });
    G.UI.text(ctx, '[ESC] BACK', G.W / 2, G.H - 18, { align: 'center', size: 7, color: G.C.slate });
  },
});
