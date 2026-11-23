// localStorage save for the Office Cup.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};
  const KEY = 'north-desk-rpg-v2';

  function statsFor(id) {
    const s = { charm: 5, pricing: 5, hustle: 5, lore: 5 };
    if (id === 'bridger' || id === 'stephanie') s.pricing += 2;
    if (id === 'tania' || id === 'adam' || id === 'deb') s.lore += 2;
    if (id === 'malcolm' || id === 'gaige' || id === 'emily') s.charm += 2;
    if (id === 'jordan' || id === 'kaila' || id === 'matt') s.hustle += 2;
    if (id === 'liz' || id === 'parker' || id === 'joel') s.charm += 1;
    if (id === 'bethany' || id === 'scotty' || id === 'bekkah' || id === 'jillian') s.charm += 1;
    return s;
  }

  function fresh(id) {
    return {
      v: 2,
      id: id,
      map: 'office',
      x: 9 * 16 + 8,
      y: 8 * 16 + 8,
      dir: 'down',
      lv: 1,
      xp: 0,
      next: 20,
      money: 400,
      deals: 0,
      energy: 28,
      energyMax: 28,
      focus: 10,
      focusMax: 10,
      stats: statsFor(id),
      items: { coffee: 1, staging: 0, tires: 0, snack: 0, drone: 0 },
      partner: null,
      regions: { home: 0, range: 0, duluth: 0 },
      vehicle: 'sedan',
      inCar: true,
      x: 700,
      y: 500,
      angle: 0,
      vx: 0,
      vy: 0,
      carX: 700,
      carY: 500,
      carAngle: 0,
      tickets: 0,
      escapes: 0,
      quests: {
        cup: 1,
        bird: id === 'bridger' ? 1 : 0,
        lunch: id === 'kaila' ? 1 : 0,
        foundation: id === 'jordan' ? 1 : 0,
        list: id === 'liz' ? 1 : 0,
      },
      flags: {},
      staging: false,
      tiresOn: false,
    };
  }

  G.Save = {
    fresh: fresh,
    load: function () {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || data.v !== 2 || !data.id || G.agentById(data.id).id !== data.id) return null;
        return data;
      } catch (e) {
        return null;
      }
    },
    write: function (data) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    },
    clear: function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    },
  };
})();
