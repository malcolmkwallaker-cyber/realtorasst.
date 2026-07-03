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
      ['GOAL: sell more homes than your rival in 3 months. Pick a DIFFICULTY', G.C.white],
      ['(CASUAL / STANDARD / HARD) when you start - STANDARD is the real game.', G.C.white],
      ['', 0],
      ['THE PIPELINE & WARMTH', G.C.yellow],
      ['NEW > WARM > APPT > CLIENT > OFFER > PENDING > SOLD.', G.C.cyan],
      ['Leads advance on WARMTH: 40+ to go WARM, 65+ to book an APPT.', G.C.white],
      ['Calls, texts & follow-ups add warmth. UNTOUCHED leads COOL EVERY', G.C.white],
      ['NIGHT and eventually GHOST - check the PIPELINE screen for risk!', G.C.white],
      ['Pipeline cap: 12 leads on Standard. Full plate = missed opportunities.', G.C.gray],
      ['Fresh PENDING deals need 2 days before closing (TC speeds it up).', G.C.gray],
      ['', 0],
      ['THE LOOP THAT WINS', G.C.yellow],
      ['OPEN HOUSES bring attendees, listing momentum & market visibility.', G.C.white],
      ['FOLLOW UP fast (attendees by NEXT DAY!) to turn them into buyers,', G.C.white],
      ['sellers & referrals. Neglected listings = angry sellers.', G.C.white],
      ['', 0],
      ['MENTORS: Brad, Jeff, Blake & Tyler - ONE mentor power-up per day.', G.C.orange],
      ['Jeff\'s commercial deals pay cash & score but do NOT count as homes.', G.C.orange],
      ['', 0],
      [null, 0], // controls line - filled at render time
    ];

    let y = 24;
    for (const [text, color] of L) {
      if (text === null) {
        G.UI.text(ctx, G.CT('CONTROLS: ARROWS/WASD + ENTER, or mouse. [M] mute. [ESC] back.',
          'CONTROLS: TAP buttons & cards. DRAG to scroll lists & the sign-in sheet.'), 28, y, { size: 8, color: G.C.lime });
      } else if (text) G.UI.text(ctx, text, 28, y, { size: 8, color });
      y += 10.5;
    }

    if (Math.floor(this.t * 2) % 2 === 0) {
      G.UI.text(ctx, '- PRESS ENTER -', G.W / 2, G.H - 22, { align: 'center', size: 8, color: G.C.yellow });
    }
  },
});
