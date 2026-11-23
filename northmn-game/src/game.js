// Top-down driving, on-foot tours, and lighthearted trooper chases.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  const VEHICLES = {
    sedan: { name: 'Starter Sedan', accel: 220, max: 210, grip: 0.1, cost: 0, color: '#c4b49a' },
    suv: { name: 'AWD SUV', accel: 155, max: 190, grip: 0.16, cost: 2500, color: '#38b764' },
    truck: { name: 'Heated-Seat Luxury Truck', accel: 130, max: 176, grip: 0.22, cost: 6000, color: '#29366f' },
  };

  const TEXTS = [
    { from: 'Hot buyer', text: 'Still rolling? We are in the driveway and the coffee is getting cold.' },
    { from: 'Emily', text: 'Zillow lead is at the door. Two hands on the wheel, then call me.' },
    { from: 'Liz', text: 'Complete sentences. Also a complete stop. I run this company, not your group chat.' },
    { from: 'Kaila', text: 'No onions. And do not text the guy while you are on US-169.' },
    { from: 'Jordan', text: 'Foundation question. Pull over. Concrete does not multitask and neither should you.' },
    { from: 'Bridger', text: 'Quick price check. The bird named Malcolm is not the one driving.' },
    { from: 'Matt', text: 'Marketplace seller is itchy. The trooper is itchier. Beard says pull over.' },
    { from: 'Tania', text: 'Hibbing showing moved up. US-169 is not a desk.' },
    { from: 'Deb', text: 'Long road ahead. Answer at a stop, not at highway speed.' },
  ];

  const state = {
    save: null,
    keys: {},
    pad: {},
    place: 'world',
    room: null,
    rx: 80,
    ry: 200,
    wanted: 0,
    seen: 0,
    exposed: 0,
    pulling: false,
    pause: 0,
    phone: null,
    nextText: 3,
    cops: [],
    traffic: [],
    battle: null,
    dialogue: null,
    menu: null,
    notice: '',
    noticeT: 0,
    tour: {},
    lead: null,
    time: 0,
    horn: 0,
  };

  function notice(text) {
    state.notice = text;
    state.noticeT = 3;
  }

  function veh() { return VEHICLES[state.save.vehicle] || VEHICLES.sedan; }

  function speed() { return Math.hypot(state.save.vx, state.save.vy); }

  function pointOnPath(pts, t) {
    let total = 0;
    const lens = [];
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      lens.push(len);
      total += len;
    }
    let dist = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < lens.length; i++) {
      if (dist <= lens[i] || i === lens.length - 1) {
        const u = lens[i] ? dist / lens[i] : 0;
        const ax = pts[i][0];
        const ay = pts[i][1];
        const bx = pts[i + 1][0];
        const by = pts[i + 1][1];
        return {
          x: ax + (bx - ax) * u,
          y: ay + (by - ay) * u,
          angle: Math.atan2(by - ay, bx - ax),
        };
      }
      dist -= lens[i];
    }
    return { x: pts[0][0], y: pts[0][1], angle: 0 };
  }

  function spawnTraffic() {
    state.cops = [
      { path: 0, t: 0.55, dir: -1, chase: false, x: 820, y: 500 },
      { path: 1, t: 0.35, dir: 1, chase: false, x: 1200, y: 390 },
      { path: 1, t: 0.72, dir: -1, chase: false, x: 1700, y: 360 },
      { path: 2, t: 0.4, dir: 1, chase: false, x: 1960, y: 860 },
      { path: 2, t: 0.78, dir: -1, chase: false, x: 2140, y: 1360 },
    ];
    state.traffic = [];
    G.Geo.ROADS.forEach(function (road, i) {
      for (let n = 0; n < 2; n++) {
        const t = (n + 1) / 3;
        const p = pointOnPath(road.pts, t);
        state.traffic.push({ path: i, t: t, dir: n ? -1 : 1, x: p.x, y: p.y, angle: p.angle, color: n ? '#ef7d57' : '#41a6f6' });
      }
    });
  }

  function los(ax, ay, bx, by) {
    const steps = 7;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      const hit = G.Geo.BUILDINGS.some(function (box) {
        return x > box.x && y > box.y && x < box.x + box.w && y < box.y + box.h;
      });
      if (hit) return false;
    }
    return true;
  }

  function spotPlayer() {
    const s = state.save;
    if (state.place !== 'world' || !s.inCar) return;
    const spd = speed();
    const limit = G.Geo.roadLimit(s.x, s.y);
    const texting = state.exposed > 0 && spd > 18;
    const flying = spd > limit * 1.55;
    if (!texting && !flying) return;
    state.cops.forEach(function (cop) {
      const d = Math.hypot(cop.x - s.x, cop.y - s.y);
      if (d < 250 && los(cop.x, cop.y, s.x, s.y)) {
        state.wanted = 1;
        state.seen = 0;
        cop.chase = true;
        if (texting) notice('Trooper saw the phone. Lights on. It is a ticket, not the end.');
        else notice('That was showing-speed. The cruiser would like a word.');
      }
    });
  }

  function driveBody(body, dt, gas, brake, steer, grip, max) {
    const hx = Math.cos(body.angle);
    const hy = Math.sin(body.angle);
    if (gas) { body.vx += hx * grip.accel * dt; body.vy += hy * grip.accel * dt; }
    if (brake) { body.vx *= 0.9; body.vy *= 0.9; }
    body.angle += steer * 2.4 * dt * Math.min(1, speedOf(body) / 50);
    const forward = body.vx * hx + body.vy * hy;
    const side = body.vx * -hy + body.vy * hx;
    const damp = grip.grip;
    const newSide = side * (1 - damp);
    body.vx = hx * forward - hy * newSide;
    body.vy = hy * forward + hx * newSide;
    const sp = speedOf(body);
    if (sp > max) {
      body.vx *= max / sp;
      body.vy *= max / sp;
    }
    body.vx *= 0.992;
    body.vy *= 0.992;
  }

  function speedOf(body) { return Math.hypot(body.vx, body.vy); }

  function moveCar(dt) {
    const s = state.save;
    const spec = veh();
    let grip = spec.grip + (s.items.tires ? 0.06 : 0);
    const on = G.Geo.onRoad(s.x, s.y);
    if (!on) grip = Math.min(0.35, grip + 0.12);
    const gas = state.pause > 0 ? false : (state.keys.up || state.pad.up || state.pad.gas);
    const brake = state.pulling || state.keys.down || state.pad.down || state.pad.brake;
    let steer = 0;
    if (state.keys.left || state.pad.left) steer -= 1;
    if (state.keys.right || state.pad.right) steer += 1;
    driveBody(s, dt, gas, brake, steer, { accel: on ? spec.accel : spec.accel * 0.45, grip: grip }, on ? spec.max : spec.max * 0.45);
    const nx = s.x + s.vx * dt;
    const ny = s.y + s.vy * dt;
    if (!G.Geo.blocked(nx, s.y)) s.x = nx;
    else s.vx *= -0.3;
    if (!G.Geo.blocked(s.x, ny)) s.y = ny;
    else s.vy *= -0.3;
    s.x = Math.max(30, Math.min(G.Geo.W - 30, s.x));
    s.y = Math.max(30, Math.min(G.Geo.H - 30, s.y));
    s.carX = s.x;
    s.carY = s.y;
    s.carAngle = s.angle;
  }

  function moveFoot(dt) {
    const s = state.save;
    let dx = 0;
    let dy = 0;
    if (state.keys.left || state.pad.left) dx -= 1;
    if (state.keys.right || state.pad.right) dx += 1;
    if (state.keys.up || state.pad.up) dy -= 1;
    if (state.keys.down || state.pad.down) dy += 1;
    if (!dx && !dy) return;
    if (Math.abs(dx) > Math.abs(dy)) s.dir = dx < 0 ? 'left' : 'right';
    else s.dir = dy < 0 ? 'up' : 'down';
    const sp = 96 * dt;
    const nx = s.x + dx * sp;
    const ny = s.y + dy * sp;
    if (state.place === 'world') {
      if (!G.Geo.blocked(nx, s.y)) s.x = nx;
      if (!G.Geo.blocked(s.x, ny)) s.y = ny;
    } else {
      const bounds = roomBounds();
      s.x = Math.max(18, Math.min(bounds.w - 18, s.x + dx * sp));
      s.y = Math.max(24, Math.min(bounds.h - 18, s.y + dy * sp));
      if (state.place === 'house') markTour();
    }
  }

  function roomBounds() { return { w: 480, h: 300 }; }

  function markTour() {
    const s = state.save;
    const spots = hotspots();
    spots.forEach(function (spot) {
      if (Math.hypot(spot.x - s.x, spot.y - s.y) < 36) state.tour[spot.id] = spot.line;
    });
  }

  function hotspots() {
    const deck = (state.room && state.room.deck) || 'garage';
    return [
      { id: 'live', x: 90, y: 70, line: 'Living room. The light is the whole pitch.' },
      { id: 'kit', x: 250, y: 70, line: 'Kitchen. Room for a real table.' },
      { id: 'bed', x: 90, y: 190, line: 'Bedroom. Quiet enough for a first home or a long winter.' },
      { id: 'deck', x: 300, y: 190, line: deck === 'lake deck' ? 'Lake deck toward Pokegama.' : deck === 'bridge view' ? 'You can see the Lift Bridge from here.' : 'Garage. Jordan would check the slab.' },
    ];
  }

  function patrol(car, dt, chasing) {
    if (chasing) {
      const s = state.save;
      const ang = Math.atan2(s.y - car.y, s.x - car.x);
      let diff = ang - (car.angle || 0);
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle = (car.angle || 0) + Math.max(-1, Math.min(1, diff)) * 3 * dt;
      const spd = 150;
      const nx = car.x + Math.cos(car.angle) * spd * dt;
      const ny = car.y + Math.sin(car.angle) * spd * dt;
      if (!G.Geo.blocked(nx, ny)) { car.x = nx; car.y = ny; }
      return;
    }
    const road = G.Geo.ROADS[car.path];
    car.t += car.dir * dt * 0.035;
    if (car.t > 1) { car.t = 1; car.dir = -1; }
    if (car.t < 0) { car.t = 0; car.dir = 1; }
    const p = pointOnPath(road.pts, car.t);
    car.x = p.x;
    car.y = p.y;
    car.angle = p.angle + (car.dir < 0 ? Math.PI : 0);
  }

  function updateChase(dt) {
    const s = state.save;
    if (state.place !== 'world') return;
    state.cops.forEach(function (cop) { patrol(cop, dt, state.wanted > 0); });
    state.traffic.forEach(function (car) {
      if (state.horn > 0 && Math.hypot(car.x - s.x, car.y - s.y) < 90) car.t += 0.01;
      patrol(car, dt, false);
    });
    if (state.wanted > 0 && s.inCar) {
      let close = false;
      state.cops.forEach(function (cop) {
        if (Math.hypot(cop.x - s.x, cop.y - s.y) < 360) close = true;
      });
      if (close) state.seen = 0;
      else state.seen += dt;
      if (state.seen > 7) {
        state.wanted = 0;
        state.seen = 0;
        s.escapes += 1;
        state.cops.forEach(function (cop) { cop.chase = false; });
        notice('You lost them past the pines. Slippery Listing. No ticket.');
        s.xp += 8;
      }
    }
  }

  function ticket() {
    const s = state.save;
    s.money = Math.max(0, s.money - 150);
    s.tickets += 1;
    state.wanted = 0;
    state.seen = 0;
    state.exposed = 0;
    state.pulling = false;
    state.pause = 1.4;
    s.vx = 0;
    s.vy = 0;
    state.cops.forEach(function (cop) { cop.chase = false; });
    notice('Trooper: "Listing can wait. $150. Drive like a neighbor."');
    G.Save.write(s);
  }

  function nearestBuilding() {
    const s = state.save;
    let best = null;
    let dist = 42;
    G.Geo.BUILDINGS.forEach(function (b) {
      const d = Math.hypot(b.doorX - s.x, b.doorY - s.y);
      if (d < dist) { dist = d; best = b; }
    });
    return best;
  }

  function enterBuilding(b) {
    state.place = b.kind === 'office' ? 'office' : 'house';
    state.room = b;
    state.save.inCar = false;
    state.save.x = 240;
    state.save.y = 250;
    state.tour = {};
    if (state.place === 'house') state.tour.live = hotspots()[0].line;
    notice(b.name);
  }

  function leaveBuilding() {
    const b = state.room;
    state.place = 'world';
    state.save.x = b.doorX;
    state.save.y = b.doorY + 16;
    state.room = null;
  }

  function interact() {
    if (state.battle) return;
    if (state.dialogue) {
      state.dialogue.i += 1;
      if (state.dialogue.i >= state.dialogue.lines.length) state.dialogue = null;
      return;
    }
    if (state.menu) { state.menu = null; return; }
    const s = state.save;
    if (state.place === 'world') {
      if (s.inCar) {
        if (speed() > 36) { notice('Too fast to hop out. Brake first.'); return; }
        s.inCar = false;
        s.vx = 0;
        s.vy = 0;
        s.x = s.carX + 18;
        s.y = s.carY + 10;
        notice('On foot.');
        return;
      }
      if (Math.hypot(s.x - s.carX, s.y - s.carY) < 40) {
        s.inCar = true;
        s.x = s.carX;
        s.y = s.carY;
        s.angle = s.carAngle;
        notice(veh().name + '. E hops out.');
        return;
      }
      const b = nearestBuilding();
      if (b) enterBuilding(b);
      return;
    }
    if (s.y > 250 && Math.abs(s.x - 240) < 40) { leaveBuilding(); return; }
    if (state.place === 'office') {
      const n = nearestClerk();
      if (n) talk(n);
      else if (Math.hypot(s.x - 70, s.y - 60) < 36) state.menu = 'shop';
    }
  }

  function nearestClerk() {
    let best = null;
    let dist = 36;
    officeNpcs().forEach(function (n) {
      const d = Math.hypot(n.x - state.save.x, n.y - state.save.y);
      if (d < dist) { dist = d; best = n; }
    });
    return best;
  }

  function officeNpcs() {
    const people = G.ROSTER.filter(function (a) { return a.id !== state.save.id; });
    return people.map(function (a, i) {
      return { id: a.id, x: 40 + (i % 6) * 70, y: 50 + Math.floor(i / 6) * 70 };
    });
  }

  function talk(n) {
    const lines = G.Npcs.lines(n.id);
    if (n.id === 'parker' || n.id === 'malcolm' || n.id === 'liz') {
      lines.push('Office Cup: close homes in Grand Rapids, on the Range, and in Duluth. Canal Park is the loud one.');
    }
    if (n.id === 'kaila') lines.push('Onion-free snack lives at the coffee counter. I will know.');
    state.dialogue = { speaker: G.agentById(n.id).short, lines: lines, i: 0 };
    state.save.partner = n.id;
    notice(G.agentById(n.id).short + ' rides shotgun.');
    G.Audio.talk();
    G.Save.write(state.save);
  }

  function openPhone(force) {
    if (state.battle) return;
    const i = Math.floor(Math.random() * TEXTS.length);
    const msg = TEXTS[i];
    state.phone = { from: msg.from, text: msg.text, challenge: !!force || state.save.inCar };
    state.menu = null;
  }

  function reply(whileDriving) {
    const s = state.save;
    const moving = state.place === 'world' && s.inCar && speed() > 18;
    state.phone = null;
    if (whileDriving && moving) {
      state.exposed = 3;
      notice('One thumb on the reply. Eyes mostly on US-169.');
      spotPlayer();
    } else {
      state.exposed = 0;
      if (state.place === 'world' && s.inCar) state.pulling = true;
      notice('Pulled over. The buyer still likes you. The trooper does too.');
    }
  }

  function buy(id, price) {
    const s = state.save;
    if (id === 'suv' || id === 'truck') {
      if (s.money < price) { notice('Not enough commission.'); return; }
      s.money -= price;
      s.vehicle = id;
      notice(VEHICLES[id].name + ' is yours.');
    } else {
      if (s.money < price) { notice('Not enough commission.'); return; }
      s.money -= price;
      s.items[id] = (s.items[id] || 0) + 1;
      notice('Picked up.');
    }
    G.Audio.blip();
    G.Save.write(s);
  }

  function startTalk() {
    const rooms = Object.keys(state.tour).length;
    if (rooms < 2) { notice('Walk them through another room first.'); return; }
    const b = state.room;
    state.battle = G.Battle.make(state.save, {
      title: (b ? b.name : 'Deal') + ' negotiation',
      kind: b && b.region === 'duluth' ? 'buyer' : 'listing',
      region: (b && b.region) || 'home',
    });
    G.Audio.blip();
  }

  function closeBattle() {
    const b = state.battle;
    if (b && b.phase === 'won') {
      notice('Closed. The Office Cup felt that.');
      if (state.save.regions.home && state.save.regions.range && state.save.regions.duluth) {
        notice('Grand Rapids, the Range, and Duluth all have a closing.');
      }
    } else if (b && b.phase === 'lost') {
      state.save.energy = Math.max(10, Math.floor(state.save.energyMax / 2));
      notice('They slept on it. You are still the agent.');
    }
    state.battle = null;
    G.Save.write(state.save);
  }

  const Game = {
    state: state,
    vehicles: VEHICLES,

    start: function (id, loaded) {
      state.save = loaded || G.Save.fresh(id);
      state.place = 'world';
      state.room = null;
      state.wanted = 0;
      state.seen = 0;
      state.exposed = 0;
      state.phone = null;
      state.battle = null;
      state.dialogue = null;
      state.menu = null;
      state.pause = 0;
      state.nextText = 3;
      state.lead = { name: 'Pokegama Cabin showing', x: 732, y: 692 };
      state.tour = {};
      spawnTraffic();
      notice('US-2 at Grand Rapids. E hops out. A showing is south, by Pokegama.');
    },

    setKey: function (name, down) { state.keys[name] = down; },
    setPad: function (name, down) { state.pad[name] = down; },
    interact: interact,
    openPhone: function () { openPhone(true); },
    reply: reply,
    pullOver: function () { state.pulling = true; notice('Coasting to the shoulder.'); },
    horn: function () { state.horn = 0.4; G.Audio.blip(); },
    openMenu: function (name) {
      if (state.battle) return;
      state.menu = name || null;
    },
    closeMenu: function () { state.menu = null; },
    buy: buy,
    startTalk: startTalk,
    battleAct: function (type, arg) {
      const b = state.battle;
      if (!b || b.phase !== 'fight') return;
      if (type === 'pitch') G.Battle.pitch(state.save, b);
      else if (type === 'skill') G.Battle.cast(state.save, b, arg);
      else if (type === 'item') G.Battle.useItem(state.save, b, arg);
      else if (type === 'backup') G.Battle.backup(state.save, b);
    },
    closeBattle: closeBattle,

    update: function (dt) {
      state.time += dt;
      if (state.noticeT > 0) state.noticeT -= dt;
      if (state.horn > 0) state.horn -= dt;
      if (state.exposed > 0) state.exposed -= dt;
      if (state.pause > 0) { state.pause -= dt; return; }
      if (!state.save || state.battle || state.dialogue) return;
      const s = state.save;
      if (state.place === 'world' && s.inCar) {
        moveCar(dt);
        updateChase(dt);
        spotPlayer();
        if (state.pulling && speed() < 16) {
          state.pulling = false;
          if (state.wanted) ticket();
          else notice('On the shoulder.');
        }
        if (!state.phone && !state.menu) {
          state.nextText -= dt;
          if (state.nextText <= 0) {
            state.nextText = 22;
            openPhone(true);
          }
        }
      } else if (!state.menu) {
        moveFoot(dt);
        if (state.place === 'world') updateChase(dt);
      }
    },

    draw: function (ctx, vw, vh) {
      ctx.imageSmoothingEnabled = false;
      if (state.place === 'world') drawWorld(ctx, vw, vh);
      else if (state.place === 'office') drawOffice(ctx, vw, vh);
      else drawHouse(ctx, vw, vh);
    },

    drawFullMap: function (ctx, w, h) {
      const bg = G.Geo.map().canvas;
      ctx.drawImage(bg, 0, 0, w, h);
      const sx = w / G.Geo.W;
      const sy = h / G.Geo.H;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      G.Geo.TOWNS.forEach(function (t) {
        const tx = t.x * sx;
        const ty = t.y * sy - 10;
        ctx.fillStyle = '#1a1c2c';
        ctx.fillText(t.name, tx + 1, ty + 1);
        ctx.fillStyle = '#ffcd75';
        ctx.fillText(t.name, tx, ty);
      });
      const s = state.save;
      if (!s) return;
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(s.x * sx - 3, s.y * sy - 3, 6, 6);
      if (state.lead) {
        ctx.fillStyle = '#ffcd75';
        ctx.fillRect(state.lead.x * sx - 3, state.lead.y * sy - 3, 6, 6);
      }
    },

    view: function () {
      const s = state.save;
      return {
        save: s,
        who: s ? G.agentById(s.id) : null,
        place: state.place,
        inCar: s ? s.inCar : false,
        speed: s ? Math.round(speed()) : 0,
        wanted: state.wanted,
        phone: state.phone,
        battle: state.battle,
        dialogue: state.dialogue,
        menu: state.menu,
        notice: state.noticeT > 0 ? state.notice : '',
        skills: s ? G.Battle.skills(s) : [],
        lead: state.lead,
        vehicle: s ? veh().name : '',
        tour: Object.keys(state.tour).length,
        partner: s && s.partner ? G.agentById(s.partner) : null,
        quests: s ? [
          { name: 'Office Cup', text: 'Closings — Grand Rapids ' + s.regions.home + ', Range ' + s.regions.range + ', Duluth ' + s.regions.duluth + '.' },
          { name: 'Showing', text: state.lead ? state.lead.name + '. Park, hop out, walk the rooms, then negotiate.' : 'Watch the phone.' },
          { name: 'Trooper tales', text: 'Tickets ' + s.tickets + '. Clean getaways ' + s.escapes + '.' },
        ] : [],
      };
    },
  };

  function camOf(vw, vh) {
    const s = state.save;
    const x = Math.max(0, Math.min(G.Geo.W - vw, s.x - vw / 2));
    const y = Math.max(0, Math.min(G.Geo.H - vh, s.y - vh / 2));
    return { x: x, y: y };
  }

  function drawWorld(ctx, vw, vh) {
    const s = state.save;
    const cam = camOf(vw, vh);
    const bg = G.Geo.map().canvas;
    ctx.drawImage(bg, cam.x, cam.y, vw, vh, 0, 0, vw, vh);
    state.traffic.forEach(function (car) { drawCar(ctx, car.x - cam.x, car.y - cam.y, car.angle, car.color, false); });
    state.cops.forEach(function (cop) { drawCop(ctx, cop.x - cam.x, cop.y - cam.y, cop.angle || 0); });
    if (state.lead) {
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(state.lead.x - cam.x - 3, state.lead.y - cam.y - 14, 6, 10);
    }
    if (s.inCar) {
      if (s.partner) drawActor(ctx, s.partner, s.x - cam.x + 8, s.y - cam.y + 4);
      drawCar(ctx, s.x - cam.x, s.y - cam.y, s.angle, veh().color, true);
    } else {
      drawCar(ctx, s.carX - cam.x, s.carY - cam.y, s.carAngle, veh().color, false);
      drawActor(ctx, s.id, s.x - cam.x, s.y - cam.y);
    }
    drawMinimap(ctx, vw);
    drawArrow(ctx, vw, vh, cam);
    if (state.wanted) drawStar(ctx);
  }

  function drawCar(ctx, x, y, angle, color, lights) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(-12, -7, 24, 14);
    ctx.fillStyle = color;
    ctx.fillRect(-11, -6, 22, 12);
    ctx.fillStyle = '#73eff7';
    ctx.fillRect(2, -4, 6, 8);
    if (lights) {
      ctx.fillStyle = 'rgba(255,205,117,0.9)';
      ctx.fillRect(11, -4, 3, 2);
      ctx.fillRect(11, 2, 3, 2);
    }
    ctx.restore();
    if (lights) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(255,205,117,0.18)';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(70, -28);
      ctx.lineTo(70, 28);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCop(ctx, x, y, angle) {
    drawCar(ctx, x, y, angle, '#1a1c2c', false);
    const flash = Math.floor(state.time * 8) % 2;
    ctx.fillStyle = flash ? '#b13e53' : '#3b5dc9';
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }

  function drawActor(ctx, id, x, y) {
    const a = G.agentById(id);
    if (!a || !a.sprite) return;
    ctx.drawImage(a.sprite, Math.round(x - a.sprite.width / 2), Math.round(y - a.sprite.height + 6));
  }

  function drawMinimap(ctx, vw) {
    const size = 92;
    const x = vw - size - 8;
    const y = 8;
    const m = G.Geo.map().canvas;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(x - 2, y - 2, size + 4, size + 4);
    const view = 520;
    const s = state.save;
    ctx.drawImage(m, s.x - view / 2, s.y - view / 2, view, view, x, y, size, size);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(x + size / 2 - 2, y + size / 2 - 2, 4, 4);
    if (state.lead) {
      const dx = (state.lead.x - s.x) / view * size;
      const dy = (state.lead.y - s.y) / view * size;
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(x + size / 2 + dx - 2, y + size / 2 + dy - 2, 4, 4);
    }
    ctx.strokeStyle = '#ffcd75';
    ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
  }

  function drawArrow(ctx, vw, vh, cam) {
    if (!state.lead || state.place !== 'world') return;
    const s = state.save;
    const sx = state.lead.x - cam.x;
    const sy = state.lead.y - cam.y;
    if (sx > 16 && sy > 16 && sx < vw - 16 && sy < vh - 16) return;
    const ang = Math.atan2(state.lead.y - s.y, state.lead.x - s.x);
    const cx = vw / 2 + Math.cos(ang) * (vw * 0.38);
    const cy = vh / 2 + Math.sin(ang) * (vh * 0.38);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffcd75';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-8, 6);
    ctx.fill();
    ctx.restore();
  }

  function drawStar(ctx) {
    const flash = Math.floor(state.time * 10) % 2;
    ctx.fillStyle = flash ? '#b13e53' : '#3b5dc9';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WANTED *', 8, 22);
  }

  function drawOffice(ctx, vw, vh) {
    ctx.fillStyle = '#cbb892';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#2a3148';
    ctx.fillRect(0, 0, vw, 16);
    ctx.fillRect(0, 284, vw, 16);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(24, 28, 50, 36);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(40, 40, 36, 22);
    ctx.fillStyle = '#ffcd75';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('COFFEE', 28, 78);
    ctx.fillText('DOOR', 220, 276);
    officeNpcs().forEach(function (n) { drawActor(ctx, n.id, n.x, n.y); });
    drawActor(ctx, state.save.id, state.save.x, state.save.y);
  }

  function drawHouse(ctx, vw, vh) {
    ctx.fillStyle = '#d7c4a3';
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 24, 200, 120);
    ctx.strokeRect(230, 24, 200, 120);
    ctx.strokeRect(16, 150, 200, 110);
    ctx.strokeRect(230, 150, 210, 110);
    ctx.fillStyle = '#1a1c2c';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('LIVING ROOM', 28, 44);
    ctx.fillText('KITCHEN', 246, 44);
    ctx.fillText('BEDROOM', 28, 170);
    ctx.fillText((state.room && state.room.deck) || 'GARAGE', 246, 170);
    ctx.fillText('DOOR OUT', 200, 290);
    hotspots().forEach(function (spot) {
      ctx.fillStyle = state.tour[spot.id] ? '#38b764' : '#ef7d57';
      ctx.fillRect(spot.x - 4, spot.y - 4, 8, 8);
    });
    drawActor(ctx, state.save.id, state.save.x, state.save.y);
  }

  G.Game = Game;
})();
