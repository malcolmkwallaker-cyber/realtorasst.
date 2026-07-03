// ============================================================
// scenes/minigames.js - the 8 action mini-games
// All share a frame: INTRO -> PLAY -> RESULT -> back to map.
// Each finishes with a score 0..1 that state.js turns into results.
// ============================================================
'use strict';

// ------------------------------------------------------------
// On-screen touch buttons. IMPORTANT: hit-test in play() (before
// input is cleared), draw in draw(). Each button:
// { label, key, x, y, w, h }
// ------------------------------------------------------------
G.TouchBtns = {
  // call from play(): taps inject virtual key presses
  check(btns) {
    const I = G.Input;
    if (!I.touch) return false;
    let hit = false;
    for (const b of btns) {
      if (I.clickedRect(b.x, b.y, b.w, b.h, 4)) {
        I.pressVirtual(b.key);
        I.vibrate(10);
        hit = true;
      }
    }
    return hit;
  },
  // did this frame's tap land on any button? (so games don't double-count)
  hitAny(btns) {
    const I = G.Input;
    return I.touch && I.mouse.clicked && btns.some(b => I.inRect(b.x, b.y, b.w, b.h, 4));
  },
  draw(ctx, btns) {
    if (!G.Input.touch) return;
    for (const b of btns) {
      const held = G.Input.mouse.down && G.Input.inRect(b.x, b.y, b.w, b.h, 4);
      ctx.fillStyle = held ? G.C.blue : 'rgba(26,28,44,0.82)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = held ? G.C.yellow : G.C.gray;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      G.UI.text(ctx, b.label, b.x + b.w / 2, b.y + (b.h - (b.size || 12)) / 2 + 1, { align: 'center', size: b.size || 12, color: held ? G.C.white : G.C.cyan });
    }
  },
};

// ------------------------------------------------------------
// Shared minigame scaffolding
// def: { title, subtitle, howto:[], duration, init(), play(dt), draw(ctx), bonus() }
// ------------------------------------------------------------
G.makeMinigame = (name, def) => {
  const scene = {
    enter(params) {
      this.actionId = params.actionId;
      this.phase = 'intro';
      this.t = 0;
      this.playT = 0;
      this.score = 0;
      this.flash = null; // {text, color, t}
      this.particles = new G.Particles();
      def.init.call(this);
      G.Audio.stopMusic();
    },

    exit() { G.Audio.startMusic(); },

    finish(rawScore) {
      if (this.phase === 'done') return;
      let sc = G.clamp(rawScore, 0, 1);
      if (def.bonus) sc = G.clamp(sc + def.bonus.call(this), 0, 1);
      this.score = sc;
      this.phase = 'done';
      this.t = 0;
      G.Input.vibrate(sc >= 0.6 ? 20 : 45);
      if (sc >= 0.6) G.Audio.great(); else if (sc >= 0.35) G.Audio.good(); else G.Audio.sadTromb();
    },

    pop(text, color) { this.flash = { text, color: color || G.C.yellow, t: 0.7 }; },

    update(dt) {
      this.t += dt;
      this.particles.update(dt);
      if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }

      if (this.phase === 'intro') {
        if (this.t > 0.3 && (G.Input.confirm() || G.Input.mouse.clicked)) {
          this.phase = 'play';
          this.t = 0;
          G.Audio.select();
        }
        return;
      }
      if (this.phase === 'play') {
        this.playT += dt;
        def.play.call(this, dt);
        if (def.duration && this.playT >= def.duration) this.finish(def.timeUp ? def.timeUp.call(this) : this.score);
        return;
      }
      if (this.phase === 'done') {
        if (this.t > 0.5 && (G.Input.confirm() || G.Input.mouse.clicked)) {
          G.Engine.goto('map', { result: { actionId: this.actionId, score: this.score } });
        }
      }
    },

    render(ctx) {
      ctx.fillStyle = def.bg || G.C.dusk;
      ctx.fillRect(0, 0, G.W, G.H);

      // header
      ctx.fillStyle = G.C.ink;
      ctx.fillRect(0, 0, G.W, 24);
      G.UI.text(ctx, def.title, 8, 5, { size: 11, color: G.C.yellow });
      G.UI.text(ctx, def.subtitle, G.W - 8, 8, { align: 'right', size: 7, color: G.C.gray });

      if (this.phase === 'intro') {
        G.UI.panel(ctx, 90, 70, 300, 130, { title: 'GET READY', titleBg: G.C.blue, bg: G.C.ink });
        let y = 92;
        const howtoLines = typeof def.howto === 'function' ? def.howto.call(this) : def.howto;
        for (const line of howtoLines) {
          for (const l of G.UI.wrap(ctx, line, 270, 8)) {
            G.UI.text(ctx, l, 104, y, { size: 8, color: G.C.white });
            y += 11;
          }
        }
        if (Math.floor(this.t * 2) % 2 === 0) {
          G.UI.text(ctx, G.CT('- PRESS ENTER TO START -', '- TAP TO START -'), G.W / 2, 182, { align: 'center', size: 8, color: G.C.yellow });
        }
        return;
      }

      def.draw.call(this, ctx);
      this.particles.render(ctx);

      // timer bar
      if (def.duration && this.phase === 'play') {
        G.UI.bar(ctx, 8, G.H - 12, G.W - 16, 6, 1 - this.playT / def.duration,
          this.playT / def.duration > 0.75 ? G.C.red : G.C.cyan);
      }

      // flash text
      if (this.flash) {
        G.UI.text(ctx, this.flash.text, G.W / 2, 110, { align: 'center', size: 14, color: this.flash.color, shadow: true });
      }

      if (this.phase === 'done') {
        ctx.fillStyle = 'rgba(26,28,44,0.8)';
        ctx.fillRect(0, 0, G.W, G.H);
        const grade = this.score >= 0.85 ? 'S' : this.score >= 0.7 ? 'A' : this.score >= 0.5 ? 'B' : this.score >= 0.3 ? 'C' : 'D';
        const gcol = this.score >= 0.7 ? G.C.lime : this.score >= 0.4 ? G.C.yellow : G.C.red;
        G.UI.text(ctx, 'RANK', G.W / 2, 82, { align: 'center', size: 10, color: G.C.gray });
        G.UI.text(ctx, grade, G.W / 2, 98, { align: 'center', size: 44, color: gcol, shadow: true });
        G.UI.text(ctx, def.gradeLines ? def.gradeLines.call(this) : Math.round(this.score * 100) + '%', G.W / 2, 152, { align: 'center', size: 9, color: G.C.white });
        if (this.t > 0.5 && Math.floor(this.t * 2) % 2 === 0) {
          G.UI.text(ctx, G.CT('- PRESS ENTER -', '- TAP -'), G.W / 2, 190, { align: 'center', size: 8, color: G.C.yellow });
        }
      }
    },
  };

  // expose the definition's helpers AND data (e.g. newRound, PAD layouts)
  for (const [k, v] of Object.entries(def)) {
    if (!(k in scene)) scene[k] = v;
  }
  G.Engine.register(name, scene);
};

// ------------------------------------------------------------
// 1. CALL LEADS - stop the needle in the sweet-talk zone (x3)
// ------------------------------------------------------------
G.makeMinigame('callGame', {
  title: 'COLD CALL FRENZY',
  subtitle: 'STOP THE NEEDLE IN THE GREEN',
  howto() {
    return [
      G.CT('Your lead answers! Hit SPACE/ENTER (or click) when the needle is in the GREEN sweet-talk zone.',
           'Your lead answers! TAP anywhere when the needle is in the GREEN sweet-talk zone.'),
      '3 calls. Green = appointment. Red = voicemail abyss.',
    ];
  },
  bg: G.C.navy,

  init() {
    this.calls = 0;
    this.hits = 0;
    this.needle = 0;
    this.dir = 1;
    this.speed = 1.6;
    this.zone = { start: 0.4, width: 0.2 };
    this.locked = false;
    G.Audio.ring();
  },

  play(dt) {
    if (this.locked) return;
    this.needle += this.dir * this.speed * dt;
    if (this.needle > 1) { this.needle = 1; this.dir = -1; }
    if (this.needle < 0) { this.needle = 0; this.dir = 1; }

    if (G.Input.confirm() || G.Input.mouse.clicked) {
      this.locked = true;
      const inZone = this.needle >= this.zone.start && this.needle <= this.zone.start + this.zone.width;
      if (inZone) {
        this.hits++;
        this.pop(G.choice(['"OH YEAH, LET\'S MEET!"', '"YOU BETCHA!"', '"FINALLY, A REAL AGENT!"']), G.C.lime);
        G.Audio.good();
        this.particles.spawn(G.W / 2, 130, { count: 12, colors: [G.C.lime, G.C.cyan] });
      } else {
        this.pop(G.choice(['VOICEMAIL...', '"NEW PHONE WHO DIS"', '*DIAL TONE*']), G.C.red);
        G.Audio.bad();
      }
      setTimeout(() => {
        this.calls++;
        if (this.calls >= 3) { this.finish(this.hits / 3); return; }
        this.locked = false;
        this.speed += 0.55;
        this.zone.width = Math.max(0.12, this.zone.width - 0.03);
        this.zone.start = G.rand(0.15, 0.85 - this.zone.width);
        G.Audio.ring();
      }, 700);
    }
  },

  draw(ctx) {
    G.UI.text(ctx, 'CALL ' + Math.min(this.calls + 1, 3) + ' OF 3', G.W / 2, 44, { align: 'center', size: 10, color: G.C.white });
    G.drawSprite(ctx, G.Sprites.phone, G.W / 2 - 40 - Math.sin(this.t * 20) * (this.locked ? 0 : 2), 60, 4);
    G.drawSprite(ctx, G.Sprites[G.State.char().sprite], G.W / 2 + 20, 52, 3);

    // meter
    const mx = 90, my = 170, mw = 300, mh = 18;
    ctx.fillStyle = G.C.ink;
    ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    ctx.fillStyle = G.C.red;
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = G.C.green;
    ctx.fillRect(mx + this.zone.start * mw, my, this.zone.width * mw, mh);
    // needle
    ctx.fillStyle = G.C.white;
    ctx.fillRect(mx + this.needle * mw - 1, my - 5, 3, mh + 10);
    G.UI.text(ctx, 'HITS: ' + this.hits, G.W / 2, 200, { align: 'center', size: 9, color: G.C.lime });
  },

  gradeLines() { return this.hits + ' APPOINTMENT' + (this.hits === 1 ? '' : 'S') + ' FROM 3 CALLS'; },
});

// ------------------------------------------------------------
// 2. TEXT LEADS - pick the right reply, fast
// ------------------------------------------------------------
G.TEXT_ROUNDS = [
  { msg: 'Is the house still available??', good: 'Yes! Want to tour it today?', bad: ['Define "available"...', 'It has always been available. Always.'] },
  { msg: 'What are the sellers like?', good: 'Lovely folks, motivated to sell!', bad: ['Never met em. Nobody has.', 'They live in the walls now.'] },
  { msg: 'Can we see it at 9pm tonight?', good: 'Absolutely, I will bring flashlights!', bad: ['No. I sleep at 8:30.', 'Only if you buy me dinner first.'] },
  { msg: 'Is the basement dry?', good: 'Inspection says yes - report attached!', bad: ['Depends how you define "lake".', 'It has a built-in pool (unintentional).'] },
  { msg: 'We love it but the price...', good: 'Let\'s write a smart offer together!', bad: ['Prices are fake. Money is fake.', 'Have you tried being richer?'] },
  { msg: 'Do the appliances stay?', good: 'Washer, dryer & fridge all stay!', bad: ['The fridge chooses who stays.', 'Everything must go... including you?'] },
];

G.makeMinigame('textGame', {
  title: 'THUMB STORM',
  subtitle: 'PICK THE PRO REPLY - FAST',
  howto() {
    return [
      G.CT('Leads are texting! Pick the PROFESSIONAL reply with UP/DOWN + ENTER (or click) before the patience meter empties.',
           'Leads are texting! TAP the PROFESSIONAL reply before the patience meter empties.'),
      '4 messages. Speed earns bonus points.',
    ];
  },
  bg: G.C.teal,

  init() {
    this.rounds = G.shuffle(G.TEXT_ROUNDS).slice(0, 4);
    this.round = 0;
    this.points = 0;
    this.max = 4;
    this.newRound();
  },

  newRound() {
    const r = this.rounds[this.round];
    const opts = G.shuffle([{ t: r.good, ok: true }, { t: r.bad[0], ok: false }, { t: r.bad[1], ok: false }]);
    this.opts = opts;
    this.sel = 0;
    this.timer = 5;
    this.answered = false;
    G.Audio.tick();
  },

  play(dt) {
    if (this.answered) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.pop('TOO SLOW! LEAD WANDERED OFF', G.C.red);
      G.Audio.bad();
      this.nextRound();
      return;
    }
    if (G.Input.up()) { this.sel = (this.sel + 2) % 3; G.Audio.move(); }
    if (G.Input.down()) { this.sel = (this.sel + 1) % 3; G.Audio.move(); }

    const cardH = G.Input.touch ? 32 : 30;
    let picked = -1;
    if (G.Input.confirm()) picked = this.sel;
    for (let i = 0; i < 3; i++) {
      if (G.Input.clickedRect(60, 116 + i * cardH, 360, cardH - 4, 3)) picked = i;
    }

    if (picked >= 0) {
      this.sel = picked;
      if (this.opts[picked].ok) {
        const speedBonus = this.timer > 3 ? 0.25 : 0;
        this.points += 0.75 + speedBonus;
        this.pop(speedBonus ? 'LIGHTNING THUMBS! +BONUS' : 'SMOOTH REPLY!', G.C.lime);
        G.Audio.good();
      } else {
        this.pop('...THEY LEFT YOU ON READ', G.C.red);
        G.Audio.bad();
      }
      this.nextRound();
    }
  },

  nextRound() {
    this.answered = true;
    setTimeout(() => {
      this.round++;
      if (this.round >= 4) { this.finish(this.points / this.max); return; }
      this.newRound();
    }, 650);
  },

  draw(ctx) {
    const r = this.rounds[Math.min(this.round, 3)];
    G.UI.text(ctx, 'MSG ' + Math.min(this.round + 1, 4) + '/4', 8, 32, { size: 8, color: G.C.white });
    // incoming bubble
    G.UI.panel(ctx, 60, 44, 360, 40, { bg: G.C.ink, border: G.C.gray });
    G.UI.text(ctx, 'LEAD:', 70, 52, { size: 7, color: G.C.orange });
    G.UI.text(ctx, r.msg, 70, 64, { size: 9, color: G.C.white });
    // patience
    G.UI.text(ctx, 'PATIENCE', 60, 92, { size: 7, color: G.C.gray });
    G.UI.bar(ctx, 120, 92, 240, 7, this.timer / 5, this.timer < 1.5 ? G.C.red : G.C.orange);
    // replies (full card is tappable; taller cards on touch)
    const cardH = G.Input.touch ? 32 : 30;
    for (let i = 0; i < 3; i++) {
      const y = 116 + i * cardH;
      const sel = this.sel === i;
      ctx.fillStyle = sel ? G.C.blue : G.C.ink;
      ctx.fillRect(60, y, 360, cardH - 4);
      ctx.strokeStyle = sel ? G.C.yellow : G.C.slate;
      ctx.strokeRect(60.5, y + 0.5, 359, cardH - 5);
      G.UI.text(ctx, (sel ? '> ' : '  ') + this.opts[i].t, 68, y + (cardH - 12) / 2, { size: 8, color: sel ? G.C.white : G.C.gray });
    }
  },

  gradeLines() { return 'REPLY GAME: ' + Math.round(this.score * 100) + '% SMOOTH'; },
});

// ------------------------------------------------------------
// 3. LISTING APPOINTMENT - repeat the pitch (Simon-style)
// ------------------------------------------------------------
G.makeMinigame('listingGame', {
  title: 'PITCH PERFECT',
  subtitle: 'REPEAT THE WINNING PITCH',
  howto() {
    return [
      'The seller wants to hear THE PITCH, in exactly the right order.',
      G.CT('Watch the arrow sequence, then repeat it with the ARROW KEYS.',
           'Watch the arrow sequence, then repeat it on the TOUCH PAD.'),
      '3 rounds. Each round gets longer. No pressure.',
    ];
  },
  bg: G.C.purple,

  PAD: [
    { label: '^', key: 'ArrowUp',    x: 402, y: 156, w: 36, h: 34 },
    { label: '<', key: 'ArrowLeft',  x: 364, y: 192, w: 36, h: 34 },
    { label: '>', key: 'ArrowRight', x: 440, y: 192, w: 36, h: 34 },
    { label: 'v', key: 'ArrowDown',  x: 402, y: 228, w: 36, h: 34 },
  ],

  init() {
    this.round = 0;         // 0..2, lengths 3,4,5
    this.state = 'show';    // show | input | between
    this.seq = [];
    this.showIdx = 0;
    this.showTimer = 0;
    this.inputIdx = 0;
    this.done = 0;
    this.newSeq();
  },

  newSeq() {
    const len = 3 + this.round;
    const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    this.seq = Array.from({ length: len }, () => G.choice(dirs));
    this.state = 'show';
    this.showIdx = -1;
    this.showTimer = 0.4;
    this.inputIdx = 0;
  },

  play(dt) {
    const PITCH_WORDS = ['COMPS!', 'STAGING!', 'MARKETING!', 'PRICE!', 'DRONE!', 'TRUST!'];
    if (this.state === 'input') G.TouchBtns.check(this.PAD);

    if (this.state === 'show') {
      this.showTimer -= dt;
      if (this.showTimer <= 0) {
        this.showIdx++;
        if (this.showIdx >= this.seq.length) {
          this.state = 'input';
          this.pop('YOUR TURN!', G.C.cyan);
        } else {
          this.showTimer = 0.55;
          G.Audio.tick();
        }
      }
      return;
    }

    if (this.state !== 'input') return;

    const dirs = { ArrowUp: G.Input.up(), ArrowDown: G.Input.down(), ArrowLeft: G.Input.left(), ArrowRight: G.Input.right() };
    for (const [key, hit] of Object.entries(dirs)) {
      if (!hit) continue;
      if (key === this.seq[this.inputIdx]) {
        G.Audio.move();
        this.pop(PITCH_WORDS[this.inputIdx % PITCH_WORDS.length], G.C.lime);
        this.inputIdx++;
        if (this.inputIdx >= this.seq.length) {
          this.done++;
          this.state = 'between';
          G.Audio.good();
          this.pop('NAILED IT!', G.C.lime);
          setTimeout(() => {
            this.round++;
            if (this.round >= 3) this.finish(this.done / 3);
            else this.newSeq();
          }, 700);
        }
      } else {
        G.Audio.bad();
        this.pop('"UM, THE ZILLOW SAYS..."', G.C.red);
        this.state = 'between';
        setTimeout(() => {
          this.round++;
          if (this.round >= 3) this.finish(this.done / 3);
          else this.newSeq();
        }, 700);
      }
      break;
    }
  },

  draw(ctx) {
    G.UI.text(ctx, 'ROUND ' + Math.min(this.round + 1, 3) + '/3   PITCHES LANDED: ' + this.done, G.W / 2, 34, { align: 'center', size: 9, color: G.C.white });
    G.drawSprite(ctx, G.Sprites[G.State.char().sprite], 80, 60, 3);
    G.drawSprite(ctx, G.Sprites.cabin, 340, 66, 3);

    const ARROWS = { ArrowUp: '^', ArrowDown: 'v', ArrowLeft: '<', ArrowRight: '>' };
    const n = this.seq.length;
    const startX = G.W / 2 - n * 16;
    for (let i = 0; i < n; i++) {
      const x = startX + i * 32;
      let show = false, litUp = false;
      if (this.state === 'show') {
        show = i <= this.showIdx;
        litUp = i === this.showIdx;
      } else {
        show = i < this.inputIdx;
        litUp = false;
      }
      ctx.fillStyle = litUp ? G.C.yellow : show ? G.C.blue : G.C.ink;
      ctx.fillRect(x, 150, 26, 26);
      ctx.strokeStyle = G.C.white;
      ctx.strokeRect(x + 0.5, 150.5, 25, 25);
      if (show || this.state === 'input') {
        const label = show ? ARROWS[this.seq[i]] : '?';
        G.UI.text(ctx, label, x + 13, 156, { align: 'center', size: 13, color: litUp ? G.C.ink : G.C.white });
      }
    }

    G.UI.text(ctx, this.state === 'show' ? 'MEMORIZE THE PITCH...' : G.CT('REPEAT IT WITH ARROW KEYS!', 'REPEAT IT ON THE PAD!'),
      G.CT ? (G.Input.touch ? 200 : G.W / 2) : G.W / 2, 196, { align: G.Input.touch ? 'center' : 'center', size: 9, color: this.state === 'show' ? G.C.orange : G.C.cyan });
    if (this.state === 'input') G.TouchBtns.draw(ctx, this.PAD);
  },

  bonus() { return G.State.has('drone') ? 0.05 : 0; },
  gradeLines() { return this.done + '/3 PITCH ROUNDS LANDED'; },
});

// ------------------------------------------------------------
// 4. SHOW HOMES - hit the feature keys as they light up
// ------------------------------------------------------------
G.makeMinigame('showGame', {
  title: 'THE GRAND TOUR',
  subtitle: 'HYPE THE FEATURES ON CUE',
  howto() {
    return [
      G.CT('You are touring buyers through the house. When a feature lights up, press its KEY before the excitement fades!',
           'You are touring buyers through the house. When a feature lights up, TAP IT before the excitement fades!'),
      G.CT('Keys: A S D F. 6 features. Sell that granite.', '6 features. Sell that granite.'),
    ];
  },
  bg: G.C.navy,

  duration: 18,

  init() {
    this.features = [
      { key: 'a', label: 'HOT TUB', x: 90, y: 170 },
      { key: 's', label: 'GARAGE', x: 190, y: 190 },
      { key: 'd', label: 'GRANITE', x: 290, y: 160 },
      { key: 'f', label: 'LAKE VIEW', x: 390, y: 150 },
      { key: 'a', label: 'FIREPLACE', x: 140, y: 120 },
      { key: 'd', label: 'DOCK', x: 340, y: 210 },
    ];
    this.queue = G.shuffle(this.features);
    this.idx = 0;
    this.active = null;
    this.activeT = 0;
    this.hits = 0;
    this.misses = 0;
    this.spawnT = 0.8;
  },

  play(dt) {
    if (!this.active) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.idx < this.queue.length) {
        this.active = this.queue[this.idx++];
        this.activeT = 1.6;
        G.Audio.tick();
      } else if (this.idx >= this.queue.length && !this.active) {
        this.finish(this.hits / this.queue.length);
      }
      return;
    }

    this.activeT -= dt;
    if (this.activeT <= 0) {
      this.misses++;
      this.pop('"...IS THAT WATER DAMAGE?"', G.C.red);
      G.Audio.bad();
      this.active = null;
      this.spawnT = 0.7;
      return;
    }

    // touch: tap the glowing feature itself (generous 26px hitbox)
    if (G.Input.touch && G.Input.mouse.clicked) {
      const m = G.Input.mouse;
      if (G.dist(m.x, m.y, this.active.x, this.active.y) <= 26) {
        this.hits++;
        this.pop(this.active.label + '! "WOW!"', G.C.lime);
        this.particles.spawn(this.active.x, this.active.y, { count: 10, colors: [G.C.yellow, G.C.cyan] });
        G.Audio.good();
        G.Input.vibrate(10);
      } else {
        this.misses++;
        this.pop('YOU HYPED THE WRONG ROOM', G.C.red);
        G.Audio.bad();
      }
      this.active = null;
      this.spawnT = 0.7;
      return;
    }
    for (const k of ['a', 's', 'd', 'f']) {
      if (G.Input.p(k)) {
        if (k === this.active.key) {
          this.hits++;
          this.pop(this.active.label + '! "WOW!"', G.C.lime);
          this.particles.spawn(this.active.x, this.active.y, { count: 10, colors: [G.C.yellow, G.C.cyan] });
          G.Audio.good();
        } else {
          this.misses++;
          this.pop('YOU HYPED THE WRONG ROOM', G.C.red);
          G.Audio.bad();
        }
        this.active = null;
        this.spawnT = 0.7;
        break;
      }
    }
  },

  timeUp() { return this.hits / this.queue.length; },

  draw(ctx) {
    // house cross-section
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(60, 100, 360, 130);
    ctx.fillStyle = G.C.red;
    ctx.beginPath();
    ctx.moveTo(50, 100); ctx.lineTo(240, 60); ctx.lineTo(430, 100);
    ctx.fill();
    ctx.fillStyle = G.C.ink;
    for (let i = 0; i < 3; i++) ctx.fillRect(100 + i * 110, 115, 60, 100);

    G.UI.text(ctx, 'FEATURES HYPED: ' + this.hits, 8, 32, { size: 8, color: G.C.lime });

    for (const f of this.features) {
      const on = this.active === f;
      if (on) {
        const pulse = Math.abs(Math.sin(this.t * 8)) * 6;
        ctx.fillStyle = G.C.yellow;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 10 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = G.C.ink;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 9, 0, Math.PI * 2);
        ctx.fill();
        G.UI.text(ctx, G.Input.touch ? '!' : f.key.toUpperCase(), f.x, f.y - 4, { align: 'center', size: 9, color: G.C.yellow });
        G.UI.text(ctx, f.label, f.x, f.y - 24, { align: 'center', size: 8, color: G.C.white, shadow: true });
        G.UI.bar(ctx, f.x - 15, f.y + 14, 30, 4, this.activeT / 1.6, G.C.orange);
      } else {
        ctx.fillStyle = 'rgba(244,244,244,0.25)';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  bonus() { return G.State.has('photographer') ? 0.08 : 0; },
  gradeLines() { return this.hits + '/' + this.queue.length + ' FEATURES HYPED'; },
});

// ------------------------------------------------------------
// 5. NEGOTIATION BATTLE - talk/listen tug-of-war
// ------------------------------------------------------------
G.makeMinigame('negotiateGame', {
  title: 'DEAL DUEL',
  subtitle: 'TALK WHEN GREEN. LISTEN WHEN RED.',
  howto() {
    return [
      G.CT('Tug-of-war over the deal! During TALK phases, MASH SPACE to push the bar your way.',
           'Tug-of-war over the deal! During TALK phases, TAP REPEATEDLY to push the bar your way.'),
      G.CT('During LISTEN phases, DO NOT press anything - interrupting costs you.',
           'During LISTEN phases, DO NOT tap - interrupting costs you.'),
      'Get the bar as far right as you can before time runs out.',
    ];
  },
  bg: G.C.ink,
  duration: 15,

  init() {
    this.bar = 0.35;
    this.phase2 = 'talk'; // talk | listen
    this.phaseT = 2.5;
    this.mash = 0;
  },

  play(dt) {
    this.phaseT -= dt;
    if (this.phaseT <= 0) {
      this.phase2 = this.phase2 === 'talk' ? 'listen' : 'talk';
      this.phaseT = this.phase2 === 'talk' ? G.rand(2, 3) : G.rand(1.2, 2);
      G.Audio[this.phase2 === 'talk' ? 'good' : 'thud']();
    }

    // opponent pressure
    this.bar -= 0.045 * dt;

    if (G.Input.p(' ') || G.Input.p('Enter') || G.Input.mouse.clicked) {
      if (this.phase2 === 'talk') {
        this.bar += 0.035;
        G.Audio.tick();
      } else {
        this.bar -= 0.06;
        this.pop('"LET ME FINISH!" -THEM', G.C.red);
        G.Audio.bad();
      }
    }
    this.bar = G.clamp(this.bar, 0, 1);
    if (this.bar >= 1) this.finish(1);
  },

  timeUp() { return this.bar; },

  draw(ctx) {
    const talk = this.phase2 === 'talk';
    ctx.fillStyle = talk ? 'rgba(56,183,100,0.15)' : 'rgba(177,62,83,0.2)';
    ctx.fillRect(0, 24, G.W, G.H - 24);

    G.drawSprite(ctx, G.Sprites[G.State.char().sprite], 90, 64, 3);
    G.drawSprite(ctx, G.Sprites.bossShark, 340, 64, 3);
    G.UI.text(ctx, 'YOU', 111, 122, { align: 'center', size: 8, color: G.C.lime });
    G.UI.text(ctx, 'OTHER AGENT', 361, 122, { align: 'center', size: 8, color: G.C.red });

    G.UI.text(ctx, talk ? G.CT('>>> TALK! MASH SPACE! <<<', '>>> TALK! TAP TAP TAP! <<<') : G.CT('*** LISTEN... DO NOT PRESS ***', '*** LISTEN... DO NOT TAP ***'),
      G.W / 2, 44, { align: 'center', size: 12, color: talk ? G.C.lime : G.C.red, shadow: true });

    // tug bar
    const bx = 60, by = 160, bw = 360, bh = 20;
    ctx.fillStyle = G.C.dusk;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = G.C.red;
    ctx.fillRect(bx, by, bw * 0.45, bh);
    ctx.fillStyle = G.C.green;
    ctx.fillRect(bx + bw * 0.45, by, bw * 0.55, bh);
    ctx.fillStyle = G.C.white;
    ctx.fillRect(bx + this.bar * bw - 2, by - 5, 5, bh + 10);
    G.UI.text(ctx, 'DEAL DIES', bx, by + 26, { size: 7, color: G.C.red });
    G.UI.text(ctx, 'DEAL SIGNED', bx + bw, by + 26, { align: 'right', size: 7, color: G.C.lime });
  },

  bonus() { return 0; }, // character bonus handled in state.js
  gradeLines() { return 'LEVERAGE: ' + Math.round(this.score * 100) + '%'; },
});

// ------------------------------------------------------------
// 6. INSPECTION - fix issues by typing their key combos
// ------------------------------------------------------------
G.makeMinigame('inspectGame', {
  title: 'FIX-IT FRENZY',
  subtitle: 'CLEAR THE INSPECTION REPORT',
  howto() {
    return [
      G.CT('The inspection report is BAD. Fix each issue by pressing its two keys in order.',
           'The inspection report is BAD. Fix each issue by TAPPING its two tool keys in order.'),
      'Clear as many of the 5 issues as you can before time runs out!',
    ];
  },
  bg: G.C.dusk,
  duration: 16,

  init() {
    const ISSUES = ['LEAKY FAUCET', 'SQUIRRELS (RUDE)', 'ROOF FROM 1971', 'RADON???', 'MYSTERY SWITCH', 'SPOOKY FURNACE', 'DOOR TO NOWHERE'];
    const KEYS = 'qwerasdfzxcv'.split('');
    this.issues = G.shuffle(ISSUES).slice(0, 5).map((label, i) => ({
      label,
      combo: [G.choice(KEYS), G.choice(KEYS)],
      progress: 0,
      fixed: false,
    }));
    this.current = 0;
    this.buildTouchKeys();
  },

  // 2x2 touch grid: the current combo keys + 2 decoys, shuffled
  buildTouchKeys() {
    const cur = this.issues[this.current];
    if (!cur) { this.touchKeys = []; return; }
    const KEYS = 'qwerasdfzxcv'.split('');
    const decoys = G.shuffle(KEYS.filter(k => !cur.combo.includes(k))).slice(0, 2);
    const set = G.shuffle([...new Set([...cur.combo, ...decoys])]);
    this.touchKeys = set.map((k, i) => ({
      label: k.toUpperCase(), key: k,
      x: 16 + (i % 2) * 60, y: 150 + Math.floor(i / 2) * 44, w: 54, h: 40,
    }));
  },

  play(dt) {
    const cur = this.issues[this.current];
    if (!cur) return;
    G.TouchBtns.check(this.touchKeys || []);

    for (const k of 'qwerasdfzxcv'.split('')) {
      if (!G.Input.p(k)) continue;
      if (k === cur.combo[cur.progress]) {
        cur.progress++;
        G.Audio.tick();
        if (cur.progress >= 2) {
          cur.fixed = true;
          this.pop(cur.label + ' - FIXED!', G.C.lime);
          this.particles.spawn(G.W / 2, 130, { count: 10, colors: [G.C.lime, G.C.white] });
          G.Audio.good();
          this.current++;
          this.buildTouchKeys();
          if (this.current >= this.issues.length) this.finish(1);
        }
      } else {
        cur.progress = 0;
        this.pop('WRONG TOOL!', G.C.red);
        G.Audio.bad();
      }
      break;
    }
  },

  timeUp() { return this.issues.filter(i => i.fixed).length / this.issues.length; },

  draw(ctx) {
    G.drawSprite(ctx, G.Sprites.houseStarter, 30, 50, 3);
    G.TouchBtns.draw(ctx, this.touchKeys || []);
    if (G.Input.touch && this.issues[this.current]) {
      G.UI.text(ctx, 'TOOLS:', 16, 140, { size: 7, color: G.C.gray });
    }
    let y = 44;
    for (let i = 0; i < this.issues.length; i++) {
      const iss = this.issues[i];
      const active = i === this.current;
      ctx.fillStyle = iss.fixed ? 'rgba(56,183,100,0.25)' : active ? G.C.navy : G.C.ink;
      ctx.fillRect(150, y, 300, 30);
      ctx.strokeStyle = active ? G.C.yellow : G.C.slate;
      ctx.strokeRect(150.5, y + 0.5, 299, 29);
      G.UI.text(ctx, (iss.fixed ? '[OK] ' : '[!!] ') + iss.label, 158, y + 5, {
        size: 8, color: iss.fixed ? G.C.lime : active ? G.C.white : G.C.slate,
      });
      if (!iss.fixed && active) {
        for (let c = 0; c < 2; c++) {
          const done = c < iss.progress;
          ctx.fillStyle = done ? G.C.lime : G.C.dusk;
          ctx.fillRect(360 + c * 24, y + 5, 20, 20);
          ctx.strokeStyle = G.C.white;
          ctx.strokeRect(360.5 + c * 24, y + 5.5, 19, 19);
          G.UI.text(ctx, iss.combo[c].toUpperCase(), 370 + c * 24, y + 10, { align: 'center', size: 10, color: done ? G.C.ink : G.C.yellow });
        }
      }
      y += 36;
    }
  },

  bonus() { return G.State.has('tc') ? 0.05 : 0; },
  gradeLines() { return this.issues.filter(i => i.fixed).length + '/5 ISSUES FIXED'; },
});

// ------------------------------------------------------------
// 7. MAKE VIDEO - rhythm game, hit notes at the line
// ------------------------------------------------------------
G.makeMinigame('videoGame', {
  title: 'LIGHTS, CAMERA, LISTING!',
  subtitle: 'HIT THE BEATS - LEFT / DOWN / RIGHT',
  howto() {
    return [
      'Film the perfect listing video! Notes fall down 3 lanes.',
      G.CT('Press LEFT / DOWN / RIGHT when a note reaches the glowing line.',
           'TAP a lane button when its note reaches the glowing line.'),
      'Great timing = great content = leads.',
    ];
  },
  bg: G.C.purple,
  duration: 16,

  LANE_BTNS: [
    { label: 'LEFT',  key: 'ArrowLeft',  x: 106, y: 216, w: 68, h: 38, size: 9 },
    { label: 'DOWN',  key: 'ArrowDown',  x: 206, y: 216, w: 68, h: 38, size: 9 },
    { label: 'RIGHT', key: 'ArrowRight', x: 306, y: 216, w: 68, h: 38, size: 9 },
  ],

  init() {
    this.lanes = ['ArrowLeft', 'ArrowDown', 'ArrowRight'];
    this.notes = [];
    let t = 1.2;
    for (let i = 0; i < 14; i++) {
      this.notes.push({ lane: G.randInt(0, 2), t, hit: false, missed: false });
      t += G.rand(0.55, 1.0);
    }
    this.hits = 0;
    this.combo = 0;
    this.FALL = 3.0;   // seconds from top to line
    this.LINE_Y = 200;
  },

  play(dt) {
    G.TouchBtns.check(this.LANE_BTNS);
    const inputs = [G.Input.left(), G.Input.down(), G.Input.right()];
    for (let lane = 0; lane < 3; lane++) {
      if (!inputs[lane]) continue;
      // find nearest unhit note in this lane near the line
      let best = null, bestD = 1;
      for (const n of this.notes) {
        if (n.lane !== lane || n.hit || n.missed) continue;
        const d = Math.abs(n.t - this.playT);
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best && bestD <= 0.18) {
        best.hit = true;
        this.hits++;
        this.combo++;
        this.pop(bestD < 0.07 ? 'PERFECT! x' + this.combo : 'NICE! x' + this.combo, bestD < 0.07 ? G.C.cyan : G.C.lime);
        this.particles.spawn(140 + lane * 100, this.LINE_Y, { count: 8, colors: [G.C.cyan, G.C.yellow] });
        G.Audio.good();
      } else {
        this.combo = 0;
        this.pop('OFF BEAT!', G.C.red);
        G.Audio.bad();
      }
    }
    // mark misses
    for (const n of this.notes) {
      if (!n.hit && !n.missed && this.playT - n.t > 0.2) {
        n.missed = true;
        this.combo = 0;
      }
    }
    if (this.notes.every(n => n.hit || n.missed)) {
      this.finish(this.hits / this.notes.length);
    }
  },

  timeUp() { return this.hits / this.notes.length; },

  draw(ctx) {
    const laneX = [140, 240, 340];
    const LABELS = ['<', 'v', '>'];
    // lanes
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(26,28,44,0.6)';
      ctx.fillRect(laneX[i] - 18, 24, 36, G.H - 24);
    }
    // hit line
    const pulse = Math.abs(Math.sin(this.t * 4));
    ctx.fillStyle = 'rgba(115,239,247,' + (0.5 + pulse * 0.5) + ')';
    ctx.fillRect(110, this.LINE_Y, 260, 3);
    for (let i = 0; i < 3; i++) {
      G.UI.text(ctx, LABELS[i], laneX[i], this.LINE_Y + 10, { align: 'center', size: 12, color: G.C.cyan });
    }
    // notes
    for (const n of this.notes) {
      if (n.hit) continue;
      const yProg = 1 - (n.t - this.playT) / this.FALL;
      if (yProg < 0 || yProg > 1.15) continue;
      const y = 24 + yProg * (this.LINE_Y - 24);
      ctx.fillStyle = n.missed ? G.C.slate : [G.C.orange, G.C.lime, G.C.sky][n.lane];
      ctx.fillRect(laneX[n.lane] - 10, y - 5, 20, 10);
      ctx.strokeStyle = G.C.white;
      ctx.strokeRect(laneX[n.lane] - 10.5, y - 5.5, 21, 11);
    }
    G.TouchBtns.draw(ctx, this.LANE_BTNS);
    // camera guy
    G.drawSprite(ctx, G.Sprites[G.State.char().sprite], 40, 100, 3);
    G.UI.text(ctx, 'HITS ' + this.hits + '/' + this.notes.length, G.W - 12, 32, { align: 'right', size: 9, color: G.C.white });
    if (this.combo >= 3) {
      G.UI.text(ctx, 'COMBO x' + this.combo + '!', G.W - 12, 46, { align: 'right', size: 9, color: G.C.yellow });
    }
  },

  bonus() {
    let b = G.State.char().videoBonus || 0;
    if (G.State.has('camera')) b += 0.15;
    return b;
  },
  gradeLines() { return this.hits + '/' + this.notes.length + ' BEATS HIT'; },
});

// ------------------------------------------------------------
// FOLLOW UP - short decision game: pick the reply that keeps
// the relationship alive. Your score drives warmth gains and
// whether at-risk leads (and open-house attendees) stick around.
// ------------------------------------------------------------
G.makeMinigame('followupGame', {
  title: 'FOLLOW-UP HOUR',
  subtitle: 'SAY THE RIGHT THING',
  howto() {
    return [
      'Your leads wrote back! Pick the reply that keeps the relationship alive.',
      G.CT('UP/DOWN + ENTER (or click). 3 conversations.', 'TAP the best reply. 3 conversations.'),
      'Great replies warm leads up. Bad ones lose them.',
    ];
  },
  bg: '#4a3429',

  init() {
    this.rounds = G.shuffle(G.Data.FOLLOWUP_ROUNDS).slice(0, 3);
    this.round = 0;
    this.points = 0;
    this.max = 3;
    this.newRound();
  },

  newRound() {
    const r = this.rounds[this.round];
    this.opts = G.shuffle([{ t: r.good, ok: true }, { t: r.bad[0], ok: false }, { t: r.bad[1], ok: false }]);
    this.sel = 0;
    this.timer = 8;
    this.answered = false;
    G.Audio.tick();
  },

  play(dt) {
    if (this.answered) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.pop('YOU LEFT THEM ON READ', G.C.red);
      G.Audio.bad();
      this.nextRound();
      return;
    }
    if (G.Input.up()) { this.sel = (this.sel + 2) % 3; G.Audio.move(); }
    if (G.Input.down()) { this.sel = (this.sel + 1) % 3; G.Audio.move(); }

    const cardH = G.Input.touch ? 36 : 32;
    let picked = -1;
    if (G.Input.confirm()) picked = this.sel;
    for (let i = 0; i < 3; i++) {
      if (G.Input.clickedRect(50, 118 + i * cardH, 380, cardH - 4, 3)) picked = i;
    }
    if (picked >= 0) {
      this.sel = picked;
      if (this.opts[picked].ok) {
        this.points += 1;
        this.pop(G.choice(['PERFECT TOUCH!', 'THEY FEEL HEARD!', 'RELATIONSHIP: STRONGER']), G.C.lime);
        G.Audio.good();
        G.Input.vibrate(12);
      } else {
        this.points += 0.15;
        this.pop(G.choice(['...OOF.', 'READ AT 2:14 PM', 'THE TYPING BUBBLE VANISHED']), G.C.red);
        G.Audio.bad();
        G.Input.vibrate(35);
      }
      this.nextRound();
    }
  },

  nextRound() {
    this.answered = true;
    setTimeout(() => {
      this.round++;
      if (this.round >= 3) { this.finish(this.points / this.max); return; }
      this.newRound();
    }, 650);
  },

  draw(ctx) {
    const r = this.rounds[Math.min(this.round, 2)];
    G.UI.text(ctx, 'CONVO ' + Math.min(this.round + 1, 3) + '/3', 8, 32, { size: 8, color: G.C.white });
    G.drawSprite(ctx, G.Sprites[G.State.char().sprite], 20, 48, 2);
    // incoming message
    G.UI.panel(ctx, 50, 44, 380, 42, { bg: G.C.ink, border: G.C.gray });
    G.UI.text(ctx, 'LEAD:', 60, 52, { size: 7, color: G.C.orange });
    for (const [i, line] of G.UI.wrap(ctx, r.msg, 350, 8).entries()) {
      G.UI.text(ctx, line, 60, 64 + i * 9, { size: 8, color: G.C.white });
    }
    G.UI.text(ctx, 'PATIENCE', 50, 96, { size: 7, color: G.C.gray });
    G.UI.bar(ctx, 110, 96, 240, 7, this.timer / 8, this.timer < 2.5 ? G.C.red : G.C.orange);
    // reply cards
    const cardH = G.Input.touch ? 36 : 32;
    for (let i = 0; i < 3; i++) {
      const y = 118 + i * cardH;
      const sel = this.sel === i;
      ctx.fillStyle = sel ? G.C.blue : G.C.ink;
      ctx.fillRect(50, y, 380, cardH - 4);
      ctx.strokeStyle = sel ? G.C.yellow : G.C.slate;
      ctx.strokeRect(50.5, y + 0.5, 379, cardH - 5);
      const wrapped = G.UI.wrap(ctx, this.opts[i].t, 360, 7);
      for (const [j, line] of wrapped.slice(0, 2).entries()) {
        G.UI.text(ctx, (j === 0 ? (sel ? '> ' : '  ') : '  ') + line, 58, y + 5 + j * 9, { size: 7, color: sel ? G.C.white : G.C.gray });
      }
    }
  },

  bonus() { return G.State.has('crm') ? 0.05 : 0; },
  gradeLines() { return Math.round(this.points) + '/3 GREAT REPLIES'; },
});

// ------------------------------------------------------------
// 8. OPEN HOUSE - catch guests, dodge tire kickers
// ------------------------------------------------------------
G.makeMinigame('openHouseGame', {
  title: 'OPEN HOUSE RUSH',
  subtitle: 'CATCH LEADS - DODGE TIRE KICKERS',
  howto() {
    return [
      G.CT('Guests are flooding in! Move your SIGN-IN SHEET with LEFT/RIGHT to catch falling guests.',
           'Guests are flooding in! DRAG anywhere - the SIGN-IN SHEET follows your finger.'),
      'YELLOW STARS are hot leads (+2). WHITE guests are leads (+1).',
      'RED tire kickers just want free cookies (-1). Avoid!',
    ];
  },
  bg: G.C.teal,
  duration: 20,

  init() {
    this.px = G.W / 2;
    this.items = [];
    this.spawnT = 0;
    this.points = 0;
    this.MAX = 14;
  },

  play(dt) {
    // move
    const sp = 220 * dt;
    if (G.Input.held('ArrowLeft') || G.Input.held('a')) this.px -= sp;
    if (G.Input.held('ArrowRight') || G.Input.held('d')) this.px += sp;
    if (G.Input.mouse.down && G.Input.mouse.x > 0) {
      if (G.Input.touch) {
        // finger drag: the sheet tracks the finger closely
        this.px += (G.Input.mouse.x - this.px) * Math.min(1, dt * 14);
      } else if (Math.abs(G.Input.mouse.x - this.px) > 8) {
        this.px += Math.sign(G.Input.mouse.x - this.px) * sp;
      }
    }
    // optional hold zones: press-and-hold the bottom corners to steer
    if (G.Input.touch && G.Input.mouse.down && G.Input.mouse.y > 240) {
      if (G.Input.mouse.x < 60) this.px -= sp;
      if (G.Input.mouse.x > G.W - 60) this.px += sp;
    }
    this.px = G.clamp(this.px, 40, G.W - 40);

    // spawn
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = G.rand(0.45, 0.85);
      const roll = Math.random();
      this.items.push({
        x: G.rand(50, G.W - 50),
        y: 20,
        v: G.rand(60, 110) + this.playT * 3,
        kind: roll < 0.15 ? 'star' : roll < 0.62 ? 'guest' : 'kicker',
      });
    }

    // fall + catch
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.y += it.v * dt;
      if (it.y > 228 && it.y < 248 && Math.abs(it.x - this.px) < 30) {
        if (it.kind === 'star') { this.points += 2; this.pop('HOT LEAD! +2', G.C.yellow); G.Audio.great(); }
        else if (it.kind === 'guest') { this.points += 1; this.pop('SIGNED IN! +1', G.C.lime); G.Audio.good(); }
        else { this.points = Math.max(0, this.points - 1); this.pop('"JUST LOOKING" -1', G.C.red); G.Audio.bad(); }
        this.items.splice(i, 1);
      } else if (it.y > G.H) {
        this.items.splice(i, 1);
      }
    }
  },

  timeUp() { return this.points / this.MAX; },

  draw(ctx) {
    // house backdrop
    ctx.fillStyle = 'rgba(26,28,44,0.3)';
    ctx.fillRect(0, 24, G.W, G.H - 24);
    G.drawSprite(ctx, G.Sprites.houseStarter, G.W / 2 - 21, 26, 3);
    G.UI.text(ctx, 'SIGN-INS: ' + this.points, 8, 32, { size: 9, color: G.C.lime });

    for (const it of this.items) {
      if (it.kind === 'star') {
        G.drawSprite(ctx, G.Sprites.star, it.x - 5, it.y - 5, 2);
      } else {
        ctx.fillStyle = it.kind === 'guest' ? G.C.white : G.C.red;
        ctx.fillRect(it.x - 3, it.y - 8, 6, 6);      // head
        ctx.fillRect(it.x - 4, it.y - 1, 8, 8);      // body
      }
    }

    // player + clipboard
    G.drawSprite(ctx, G.Sprites[G.State.char().sprite], this.px - 14, 224, 2);
    ctx.fillStyle = G.C.yellow;
    ctx.fillRect(this.px - 30, 236, 60, 5);
    G.UI.text(ctx, 'SIGN-IN', this.px, 243, { align: 'center', size: 6, color: G.C.ink });
  },

  bonus() { return G.State.char().openHouseBonus || 0; },
  gradeLines() { return this.points + ' SIGN-INS COLLECTED'; },
});
