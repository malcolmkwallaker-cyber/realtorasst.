// ============================================================
// scenes/shop.js - business upgrades: GEAR | OFFICES | TOYS
// ============================================================
'use strict';

G.Engine.register('shop', {
  TABS: ['GEAR', 'OFFICES', 'TOYS'],

  enter() {
    this.t = 0;
    this.tab = 0;
    this.buildMenu();
  },

  tabItems() {
    if (this.tab === 0) return G.Data.UPGRADES;
    if (this.tab === 1) return G.Data.OFFICES;
    return G.Data.TOYS;
  },

  buildMenu() {
    const s = G.State.s;
    const items = this.tabItems().map((u, i) => {
      const owned = G.State.has(u.id);
      const afford = s.cash >= u.cost;
      // offices unlock in order
      let lockedByOrder = false;
      if (this.tab === 1 && i > 0 && !G.State.has(G.Data.OFFICES[i - 1].id)) lockedByOrder = true;
      return {
        label: u.name,
        id: u.id,
        disabled: owned || !afford || lockedByOrder,
        note: owned ? 'OWNED' : lockedByOrder ? 'LOCKED' : G.money(u.cost),
        desc: u.desc + (lockedByOrder ? ' (Buy the previous office first.)' : ''),
        cost: u.cost,
      };
    });
    items.push({ label: 'BACK TO MAP', id: 'back', note: '', desc: 'Return to the grind.' });

    const keep = this.menu ? this.menu.index : 0;
    this.menu = new G.Menu(items, {
      x: 12, y: 52, w: 210, rowH: 14,
      maxVisible: 13,
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
    // tab switching
    if (G.Input.left())  { this.tab = (this.tab + 2) % 3; this.buildMenu(); G.Audio.move(); return; }
    if (G.Input.right()) { this.tab = (this.tab + 1) % 3; this.buildMenu(); G.Audio.move(); return; }
    for (let i = 0; i < 3; i++) {
      const x = 12 + i * 74;
      if (G.Input.clickedRect(x, 30, 70, 16)) { this.tab = i; this.buildMenu(); G.Audio.move(); return; }
    }
    this.menu.update();
  },

  render(ctx) {
    const s = G.State.s;
    ctx.fillStyle = G.C.dusk;
    ctx.fillRect(0, 0, G.W, G.H);

    G.UI.panel(ctx, 4, 4, G.W - 8, G.H - 8, { title: 'PRO SHOP - GROW YOUR EMPIRE', titleBg: G.C.purple, bg: G.C.ink });
    G.UI.text(ctx, 'CASH: ' + G.money(s.cash), G.W - 16, 22, { align: 'right', size: 10, color: G.C.yellow });

    // tabs
    for (let i = 0; i < 3; i++) {
      const x = 12 + i * 74;
      const sel = this.tab === i;
      ctx.fillStyle = sel ? G.C.blue : G.C.navy;
      ctx.fillRect(x, 30, 70, 16);
      ctx.strokeStyle = sel ? G.C.yellow : G.C.slate;
      ctx.strokeRect(x + 0.5, 30.5, 69, 15);
      G.UI.text(ctx, this.TABS[i], x + 35, 34, { align: 'center', size: 8, color: sel ? G.C.white : G.C.gray });
    }
    G.UI.text(ctx, '< > SWITCH TAB', 240, 34, { size: 7, color: G.C.slate });

    this.menu.render(ctx);

    // detail card
    const it = this.menu.items[this.menu.index];
    G.UI.panel(ctx, 240, 52, 226, 140, { title: it.label, titleBg: G.C.blue, bg: G.C.navy });
    let y = 72;
    for (const l of G.UI.wrap(ctx, it.desc || '', 202, 8)) {
      G.UI.text(ctx, l, 250, y, { size: 8, color: G.C.white });
      y += 11;
    }
    if (it.id !== 'back') {
      const owned = G.State.has(it.id);
      G.UI.text(ctx, owned ? 'ALREADY OWNED' : 'COST: ' + G.money(it.cost || 0), 250, 172, {
        size: 9, color: owned ? G.C.lime : (s.cash >= (it.cost || 0) ? G.C.yellow : G.C.red),
      });
    }

    const ownedCount = G.State.allShopItems().filter(u => G.State.has(u.id)).length;
    G.UI.text(ctx, 'OWNED: ' + ownedCount + '/' + G.State.allShopItems().length + ' UPGRADES', 240, G.H - 70, { size: 7, color: G.C.gray });
    G.UI.text(ctx, '[ESC] BACK', 240, G.H - 58, { size: 7, color: G.C.slate });
  },
});
