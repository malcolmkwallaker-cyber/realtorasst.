// ============================================================
// scenes/howto.js - instructions
// ============================================================
'use strict';

G.Engine.register('howto', {
  enter() { this.t = 0; },

  update(dt) {
    this.t += dt;
    if (G.Input.confirm() || G.Input.cancel() || G.Input.mouse.clicked) {
      G.Audio.back();
      G.Engine.goto('title');
    }
  },

  render(ctx) {
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(0, 0, G.W, G.H);
    G.UI.panel(ctx, 16, 8, G.W - 32, G.H - 16, { title: 'HOW TO PLAY', titleBg: G.C.teal });

    const L = [
      ['GOAL', G.C.yellow],
      ['Sell more homes than your rival by the end of the season (3 months).', G.C.white],
      ['', 0],
      ['EACH DAY', G.C.yellow],
      ['Spend ENERGY on actions: call & text leads, host open houses, film', G.C.white],
      ['videos, pitch listings, show homes, write offers, negotiate, fix', G.C.white],
      ['inspections, and CLOSE. Most actions launch a quick mini-game -', G.C.white],
      ['play well and your leads move down the pipeline.', G.C.white],
      ['', 0],
      ['THE PIPELINE', G.C.yellow],
      ['NEW > WARM > APPT SET > CLIENT > OFFER IN > PENDING > SOLD', G.C.cyan],
      ['', 0],
      ['TIPS', G.C.yellow],
      ['* Leads go cold if ignored (a CRM fixes that). Spend commission', G.C.gray],
      ['  in the SHOP on upgrades. Use your SPECIAL ability daily - it is free!', G.C.gray],
      ['* Month-end: BOSS SHOWDOWN vs a top local agent. Stop the needle', G.C.gray],
      ['  in the green zone. Win for big bonuses.', G.C.gray],
      ['', 0],
      ['CONTROLS: ARROWS/WASD + ENTER, or mouse. [M] mute. [ESC] back.', G.C.lime],
    ];

    let y = 26;
    for (const [text, color] of L) {
      if (text) G.UI.text(ctx, text, 28, y, { size: 8, color });
      y += 12;
    }

    if (Math.floor(this.t * 2) % 2 === 0) {
      G.UI.text(ctx, '- PRESS ENTER -', G.W / 2, G.H - 22, { align: 'center', size: 8, color: G.C.yellow });
    }
  },
});
