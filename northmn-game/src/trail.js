// The Northern Minnesota Trail. Landmarks stay on the corridor.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  const LANDMARKS = [
    { miles: 0, name: 'Grand Rapids', detail: 'Pemberton office. The SUV is packed.' },
    { miles: 14, name: 'Cohasset', detail: 'Mississippi River crossing.', crossing: 'river' },
    { miles: 32, name: 'Coleraine & Bovey', detail: 'US-169 by Trout Lake.' },
    { miles: 58, name: 'Nashwauk & Keewatin', detail: 'The Range starts to show red.' },
    { miles: 86, name: 'Hibbing', detail: 'Hull-Rust Mahoning open-pit mine, north of town.' },
    { miles: 108, name: 'Chisholm & Buhl', detail: 'Pit roads and pine.' },
    { miles: 132, name: 'Mountain Iron & Virginia', detail: 'US-53 junction.', crossing: 'blizzard' },
    { miles: 154, name: 'Eveleth & Gilbert', detail: 'Short hops, long stories.' },
    { miles: 178, name: 'Biwabik, Aurora & Hoyt Lakes', detail: 'East end of the Range.' },
    { miles: 230, name: 'Hermantown & Proctor', detail: 'The hill down to the lake.', crossing: 'blizzard' },
    { miles: 268, name: 'Duluth', detail: 'Canal Park and the Aerial Lift Bridge. You made it.' },
  ];

  const PACE = {
    steady: { miles: 14, fuel: 1, health: 1, label: 'Steady' },
    hustle: { miles: 20, fuel: 2, health: 3, label: 'Hustle' },
    grueling: { miles: 27, fuel: 3, health: 6, label: 'Grueling' },
  };

  const RATIONS = {
    generous: { coffee: 2, morale: 4, label: 'Generous' },
    standard: { coffee: 1, morale: 0, label: 'Standard' },
    bare: { coffee: 0, morale: -6, label: 'Bare Bones' },
  };

  const STOCK = [
    { id: 'fuel', name: 'Gas cans', price: 40, blurb: 'Miles in the tank.' },
    { id: 'coffee', name: 'Caribou Coffee & snacks', price: 25, blurb: 'Morale, in a cup.' },
    { id: 'signs', name: 'Yard signs', price: 15, blurb: 'Ammunition for a lead hunt.' },
    { id: 'tires', name: 'Spare tires', price: 50, blurb: 'Potholes happen.' },
    { id: 'locks', name: 'Lockboxes', price: 30, blurb: 'Until they freeze.' },
    { id: 'kits', name: 'Winter / staging kits', price: 60, blurb: 'For blizzards and bare rooms.' },
  ];

  function party(state) {
    return [state.lead].concat(state.crew);
  }

  function has(state, id) {
    return party(state).indexOf(id) !== -1;
  }

  function events() {
    return [
      { who: 'kaila', text: 'Kaila found onions in her wrap. Morale drops.', morale: -12 },
      { who: 'bridger', text: 'Bridger\'s bird Malcolm escaped into the backseat.', morale: -5, coffee: -1 },
      { who: 'matt', text: 'Matt spotted a flip house on Facebook Marketplace.', money: 90 },
      { who: 'liz', text: 'Liz pulled out her 100-item checklist. The next stretch goes faster.', bonusMiles: 8 },
      { who: 'gaige', text: 'Gaige got lit up by a trooper for texting on US-2.', money: -150 },
      { who: 'emily', text: 'Emily turned a Zillow ping into a wave from a driveway.', deals: 1 },
      { who: 'tania', text: 'Tania knew the pit road before the map did. No wrong turn.', fuel: 1 },
      { who: 'deb', text: 'Deb took the long way on purpose. It was the right way.', bonusMiles: 6 },
      { who: 'jordan', text: 'Jordan walked a foundation at the stop and shook on it.', deals: 1 },
      { who: 'adam', text: 'Adam already knew the weather. You miss the worst of it.', health: 4 },
      { who: 'bethany', text: 'Bethany checked the whole crew in. Nurse\'s heart, still on the clock.', health: 8 },
      { who: 'scotty', text: 'Scotty says everything is figure-out-able, and the spare tire agrees.', health: 5 },
      { who: 'stephanie', text: 'Stephanie could sell the turnout. A buyer bites.', deals: 1 },
      { who: 'bekkah', text: 'Bekkah framed the lake in one photo. A grant-shaped smile follows.', money: 70 },
      { who: 'jillian', text: 'Jillian, small and mighty, parallel-parked the SUV. Goose and James approve.', morale: 6 },
      { who: 'joel', text: 'Joel had the buyer approved before the second cup.', deals: 1 },
      { who: 'parker', text: 'Parker read one page from the handbook. The crew sat up.', morale: 8 },
      { who: 'malcolm', text: 'Malcolm pulled up another chair. Even in an SUV, it helps.', morale: 6 },
      { text: 'A lockbox froze solid in the wind.', locks: -1 },
      { text: 'Somebody caught Caribou Withdrawal.', health: -8, morale: -4 },
      { text: 'MLS Burnout rolls through the back seat.', morale: -10 },
      { text: 'Frozen Lockbox Finger.', health: -7, protect: 'kits', saved: 'A winter kit thawed the lockbox finger.' },
      { text: 'A deer considered the bumper and chose the ditch.', morale: 2 },
      { text: 'Mine dust on the windshield. You drive the next mile by memory.', fuel: -1 },
      { text: 'Lake wind shoves the SUV. Coffee saves the mood.', coffee: -1 },
    ];
  }

  function fresh(lead, crew) {
    return {
      lead: lead,
      crew: crew.slice(),
      money: 0,
      fuel: 2,
      coffee: 2,
      signs: 4,
      tires: 0,
      locks: 1,
      kits: 0,
      miles: 0,
      day: 1,
      date: new Date(2026, 9, 1),
      weather: 'Clear',
      pace: 'steady',
      rations: 'standard',
      morale: 80,
      health: {},
      deals: 0,
      log: ['The North Desk Trail leaves Grand Rapids.'],
      nextStop: 1,
    };
  }

  function bumpDate(state, days) {
    state.date = new Date(state.date.getTime() + days * 86400000);
    state.day += days;
  }

  function dateLabel(state) {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m[state.date.getMonth()] + ' ' + state.date.getDate();
  }

  function biome(miles) {
    if (miles < 30) return 'lake';
    if (miles < 70) return 'pine';
    if (miles < 180) return 'mine';
    if (miles < 230) return 'snow';
    return 'superior';
  }

  function weatherFor(miles) {
    const roll = Math.random();
    if (miles > 200) {
      if (roll < 0.34) return 'Lake wind';
      if (roll < 0.5) return 'Flurries';
      if (roll < 0.66) return 'Cloudy';
      return 'Clear';
    }
    if (miles > 120) {
      if (roll < 0.28) return 'Blizzard';
      if (roll < 0.46) return 'Mine dust';
      if (roll < 0.6) return 'Flurries';
      if (roll < 0.75) return 'Cloudy';
      return 'Clear';
    }
    if (miles > 70) {
      if (roll < 0.32) return 'Mine dust';
      if (roll < 0.48) return 'Flurries';
      if (roll < 0.68) return 'Cloudy';
      return 'Clear';
    }
    if (roll < 0.18) return 'Flurries';
    if (roll < 0.4) return 'Cloudy';
    return 'Clear';
  }

  function lowestHealth(state) {
    let id = state.lead;
    let n = state.health[id];
    party(state).forEach(function (pid) {
      if (state.health[pid] < n) { n = state.health[pid]; id = pid; }
    });
    return { id: id, n: n };
  }

  function hurt(state, amount) {
    const who = lowestHealth(state);
    state.health[who.id] = Math.max(0, state.health[who.id] - amount);
    return who.id;
  }

  function heal(state, amount) {
    party(state).forEach(function (id) {
      state.health[id] = Math.min(100, state.health[id] + amount);
    });
  }

  function alive(state) {
    return party(state).some(function (id) { return state.health[id] > 0; });
  }

  function travel(state) {
    const pace = PACE[state.pace];
    const food = RATIONS[state.rations];
    const notes = [];
    if (state.fuel <= 0) return { dead: 'gas', where: nextName(state) };
    let miles = pace.miles;
    if (has(state, 'liz')) miles += 3;
    if (has(state, 'deb') && state.miles > 100) miles += 2;
    if (has(state, 'tania') && state.miles > 50 && state.miles < 190) miles += 2;
    if (state.weather === 'Blizzard') {
      if (state.kits > 0) {
        state.kits -= 1;
        miles = Math.max(10, miles - 3);
        notes.push('A winter kit kept the blizzard to a crawl.');
      } else miles = Math.max(6, miles - 8);
    }
    if (state.weather === 'Mine dust') miles = Math.max(8, miles - 3);
    state.miles += miles;
    state.fuel = Math.max(0, state.fuel - pace.fuel);
    state.coffee = Math.max(0, state.coffee - food.coffee);
    state.morale = Math.max(0, Math.min(100, state.morale + food.morale - (state.pace === 'grueling' ? 4 : 0)));
    party(state).forEach(function (id) {
      state.health[id] = Math.max(0, state.health[id] - pace.health);
    });
    if (state.coffee <= 0) {
      hurt(state, 6);
      notes.push('The coffee is gone. Caribou Withdrawal.');
    }
    if (state.morale < 25) hurt(state, 4);
    bumpDate(state, 1);
    state.weather = weatherFor(state.miles);
    const arrived = LANDMARKS[state.nextStop] && state.miles >= LANDMARKS[state.nextStop].miles;
    let event = null;
    if (!arrived && Math.random() < 0.72) event = pickEvent(state);
    if (event) notes.push(applyEvent(state, event));
    notes.unshift(miles + ' miles. ' + state.weather + '.');
    state.log.unshift(notes[0]);
    if (!alive(state)) return { dead: 'crew', where: nextName(state), notes: notes };
    if (state.fuel <= 0 && !arrived) return { dead: 'gas', where: nextName(state), notes: notes };
    if (arrived) {
      const mark = LANDMARKS[state.nextStop];
      state.nextStop += 1;
      return { arrived: mark, notes: notes, done: mark.name === 'Duluth' };
    }
    return { notes: notes };
  }

  function nextName(state) {
    const mark = LANDMARKS[Math.min(state.nextStop, LANDMARKS.length - 1)];
    return mark ? mark.name : 'the corridor';
  }

  function pickEvent(state) {
    const pool = events().filter(function (ev) { return !ev.who || has(state, ev.who); });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function applyEvent(state, ev) {
    let text = ev.text;
    let health = ev.health || 0;
    if (ev.protect === 'kits' && state.kits > 0) {
      state.kits -= 1;
      health = 0;
      text = ev.saved;
    }
    if (ev.morale) state.morale = Math.max(0, Math.min(100, state.morale + ev.morale));
    if (ev.money) state.money = Math.max(0, state.money + ev.money);
    if (ev.coffee) state.coffee = Math.max(0, state.coffee + ev.coffee);
    if (ev.fuel) state.fuel = Math.max(0, state.fuel + ev.fuel);
    if (ev.locks) state.locks = Math.max(0, state.locks + ev.locks);
    if (ev.deals) state.deals += ev.deals;
    if (ev.bonusMiles) state.miles += ev.bonusMiles;
    if (health > 0) heal(state, health);
    if (health < 0) hurt(state, -health);
    return text;
  }

  function score(state) {
    const health = party(state).reduce(function (s, id) { return s + state.health[id]; }, 0);
    return state.miles * 8 + state.deals * 400 + state.money + health + state.morale;
  }

  G.Trail = {
    LANDMARKS: LANDMARKS,
    PACE: PACE,
    RATIONS: RATIONS,
    STOCK: STOCK,
    fresh: fresh,
    party: party,
    dateLabel: dateLabel,
    biome: biome,
    travel: travel,
    heal: heal,
    nextName: nextName,
    score: score,
    hurt: hurt,
  };
})();
