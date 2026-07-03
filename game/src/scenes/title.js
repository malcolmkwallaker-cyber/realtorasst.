// ============================================================
// scenes/title.js - title screen with menu
// ============================================================
'use strict';

G.Engine.register('title', {
  enter() {
    this.t = 0;
    this.snow = [];
    for (let i = 0; i < 40; i++) {
      this.snow.push({ x: G.rand(0, G.W), y: G.rand(0, G.H), v: G.rand(8, 25), drift: G.rand(-6, 6) });
    }
    this.buildMenu();
    G.Audio.startMusic();
  },

  buildMenu() {
    const items = [{ label: 'NEW SEASON', id: 'new' }];
    if (G.Save.hasSave()) items.push({ label: 'CONTINUE', id: 'continue' });
    items.push({ label: 'HOW TO PLAY', id: 'howto' });
    items.push({ label: 'LEADERBOARD', id: 'leaderboard' });
    items.push({ label: 'ACHIEVEMENTS', id: 'achievements' });
    // Cloud sign-in (only shown once you've configured Supabase in cloud.js)
    if (G.Cloud && G.Cloud.enabled()) {
      items.push({ label: G.Cloud.signedIn() ? 'SIGNED IN' : 'SIGN IN / SAVE', id: 'signin' });
    }
    this.menu = new G.Menu(items, {
      x: G.W / 2 - 60, y: 162, w: 120, rowH: 13,
      onSelect: (it) => {
        if (it.id === 'new') G.Engine.goto('select');
        if (it.id === 'continue') {
          if (G.State.loadGame()) G.Engine.goto('map');
          else { G.Audio.bad(); this.buildMenu(); }
        }
        if (it.id === 'howto') G.Engine.goto('howto');
        if (it.id === 'leaderboard') G.Engine.goto('leaderboard');
        if (it.id === 'achievements') G.Engine.goto('achievements');
        if (it.id === 'signin') {
          G.Cloud.showSignIn((identity) => {
            // On sign-in, pull any cloud save down so CONTINUE works cross-device.
            if (identity && G.Cloud.enabled()) {
              G.Cloud.pull().then((cloudSave) => {
                if (cloudSave) { try { G.Save.save(cloudSave); } catch (e) {} }
                this.buildMenu();
              }).catch(() => this.buildMenu());
            } else {
              this.buildMenu();
            }
          });
        }
      },
    });
  },

  update(dt) {
    this.t += dt;
    for (const s of this.snow) {
      s.y += s.v * dt;
      s.x += s.drift * dt;
      if (s.y > G.H) { s.y = -2; s.x = G.rand(0, G.W); }
    }
    this.menu.update();
  },

  render(ctx) {
    // night sky gradient bands
    ctx.fillStyle = G.C.ink; ctx.fillRect(0, 0, G.W, 120);
    ctx.fillStyle = G.C.navy; ctx.fillRect(0, 120, G.W, 60);
    ctx.fillStyle = G.C.dusk; ctx.fillRect(0, 180, G.W, G.H - 180);

    // stars
    for (let i = 0; i < 30; i++) {
      const sx = (i * 97) % G.W, sy = (i * 41) % 100;
      ctx.fillStyle = (i + Math.floor(this.t * 2)) % 5 === 0 ? G.C.white : G.C.slate;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // northern lights
    for (let x = 0; x < G.W; x += 4) {
      const h = 22 + Math.sin(x * 0.03 + this.t * 1.2) * 10;
      const y = 18 + Math.sin(x * 0.015 + this.t * 0.7) * 8;
      ctx.fillStyle = 'rgba(56,183,100,0.16)';
      ctx.fillRect(x, y, 4, h);
      ctx.fillStyle = 'rgba(115,239,247,0.10)';
      ctx.fillRect(x, y + h * 0.4, 4, h * 0.5);
    }

    // treeline
    for (let x = -4; x < G.W; x += 14) {
      G.drawSprite(ctx, G.Sprites.pine, x, 158, 2);
    }

    // title
    const bounce = Math.sin(this.t * 2) * 2;
    G.UI.text(ctx, 'BRIDGER', G.W / 2 - 64, 48 + bounce, { align: 'center', size: 22, color: '#c0562f', shadow: true });
    G.UI.text(ctx, 'vs', G.W / 2, 56 + bounce, { align: 'center', size: 12, color: G.C.yellow, shadow: true });
    G.UI.text(ctx, 'MALCOLM', G.W / 2 + 66, 48 + bounce, { align: 'center', size: 22, color: G.C.lime, shadow: true });
    G.UI.text(ctx, '- REALTOR RIVALS -', G.W / 2, 80, { align: 'center', size: 12, color: G.C.white, shadow: true });
    G.UI.text(ctx, 'A NORTHERN MINNESOTA SALES SHOWDOWN', G.W / 2, 98, { align: 'center', size: 7, color: G.C.gray });

    // characters flanking the menu
    const hop = Math.abs(Math.sin(this.t * 3)) * 3;
    G.drawSprite(ctx, G.Sprites.bridger, 120, 190 - hop, 3);
    G.drawSprite(ctx, G.Sprites.malcolm, 318, 190 - (3 - hop), 3, true);
    G.drawSprite(ctx, G.Sprites.soldSign, 90, 216, 2);
    G.drawSprite(ctx, G.Sprites.soldSign, 372, 216, 2);

    this.menu.render(ctx);

    // snow on top
    ctx.fillStyle = G.C.white;
    for (const s of this.snow) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);

    G.UI.text(ctx, G.CT('ARROWS/WASD + ENTER  -  OR JUST CLICK  -  [M] MUTE', 'TAP TO PLAY  -  BEST IN LANDSCAPE'), G.W / 2, G.H - 10, { align: 'center', size: 7, color: G.C.slate });
  },
});
