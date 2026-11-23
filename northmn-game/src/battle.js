// Turn-based deal battles. Energy is HP. Focus is MP. The deal has a bar.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  const KINDS = {
    listing: { name: 'Listing', hp: 20, power: 4 },
    buyer: { name: 'Buyer Lead', hp: 18, power: 3 },
    openhouse: { name: 'Open House', hp: 22, power: 4 },
    blizzard: { name: 'Blizzard Delay', hp: 24, power: 5 },
    appraisal: { name: 'Low Appraisal', hp: 22, power: 4 },
    inspector: { name: 'Grumpy Inspector', hp: 26, power: 5 },
    bidding: { name: 'Bidding War', hp: 28, power: 5 },
    fsbo: { name: 'FSBO Skeptic', hp: 24, power: 4 },
    inspection: { name: 'Inspection Surprise', hp: 23, power: 5 },
    cold: { name: 'Cold Lead', hp: 16, power: 3 },
    rival: { name: 'Out-of-Town Rival', hp: 30, power: 6 },
    boss: { name: 'Canal Park Boss Deal', hp: 48, power: 7 },
  };

  function agent(save) { return G.agentById(save.id); }

  function skills(save) {
    const list = [{ id: 'sig', name: agent(save).perkName, cost: 3 }];
    if (save.lv >= 2) list.push({ id: 'follow', name: 'Follow Up', cost: 2 });
    if (save.lv >= 3) list.push({ id: 'deal', name: 'Negotiate', cost: 4 });
    return list;
  }

  function power(save, encounter, which) {
    const s = save.stats;
    let dmg = 4 + Math.floor(s.charm / 2) + Math.floor(s.hustle / 4);
    if (which === 'pitch') dmg += 2;
    if (which === 'follow') dmg += 5;
    if (which === 'deal') dmg += 6 + Math.floor(s.pricing / 2);
    if (which === 'sig') {
      dmg += 7 + Math.floor(s.lore / 2);
      const id = save.id;
      if (id === 'bridger') dmg += s.pricing;
      if (id === 'tania' && encounter.region === 'range') dmg += 6;
      if (id === 'deb') dmg += 4;
      if (id === 'adam' && encounter.region === 'duluth') dmg += 6;
      if (id === 'kaila' && encounter.region === 'home') dmg += 4;
      if (id === 'stephanie') dmg += 3;
      if (id === 'liz') dmg += 3;
      if (id === 'matt') dmg += 3;
      if (id === 'gaige') dmg += 3;
      if (id === 'joel') dmg += 3;
      if (id === 'emily' && encounter.kind === 'cold') dmg += 6;
      if (id === 'jordan' && encounter.kind === 'buyer') dmg += 5;
      if (id === 'jillian') dmg += 3;
      if (id === 'malcolm') dmg += 2;
      if (id === 'parker') dmg += 2;
      if (id === 'bekkah') dmg += 2;
      if (id === 'scotty') dmg += 2;
      if (id === 'bethany') dmg += 1;
    }
    if (save.staging && (which === 'pitch' || which === 'sig')) {
      dmg += 4;
      save.staging = false;
    }
    if (encounter.kind === 'blizzard' && save.tiresOn) dmg += 4;
    return Math.max(1, dmg);
  }

  function foeHit(save, encounter) {
    let hit = encounter.power + Math.floor(Math.random() * 3);
    if (save.tiresOn && encounter.kind === 'blizzard') hit = Math.max(1, hit - 3);
    save.energy = Math.max(0, save.energy - hit);
    return hit;
  }

  function finishCheck(save, b) {
    if (b.hp <= 0) {
      b.phase = 'won';
      const xp = b.boss ? 36 : 14;
      const pay = b.boss ? 2500 : 700 + b.max * 10;
      save.xp += xp;
      save.money += pay;
      save.deals += 1;
      if (save.regions[b.region] !== undefined) save.regions[b.region] += 1;
      const ups = [];
      while (save.xp >= save.next) {
        save.xp -= save.next;
        save.lv += 1;
        save.next += 8;
        save.energyMax += 4;
        save.focusMax += 1;
        save.stats.charm += 1;
        save.stats.pricing += 1;
        save.stats.hustle += 1;
        save.stats.lore += 1;
        ups.push(save.lv);
      }
      save.energy = save.energyMax;
      save.focus = save.focusMax;
      b.log.push('Deal closed. +' + xp + ' XP, +$' + pay + '.');
      if (ups.length) b.log.push('Level ' + ups[ups.length - 1] + '. Charm, Pricing, Hustle, and Local Lore are up.');
      if (ups.indexOf(2) !== -1) b.log.push('Learned Follow Up.');
      if (ups.indexOf(3) !== -1) b.log.push('Learned Negotiate.');
      G.Audio.win();
      return true;
    }
    if (save.energy <= 0) {
      b.phase = 'lost';
      b.log.push('The deal got away.');
      G.Audio.hurt();
      return true;
    }
    return false;
  }

  function afterPlayer(save, b, text) {
    b.log.push(text);
    if (finishCheck(save, b)) return;
    const hit = foeHit(save, b);
    b.log.push(b.title + ' pushes back for ' + hit + ' Energy.');
    G.Audio.hurt();
    finishCheck(save, b);
  }

  G.Battle = {
    kinds: KINDS,
    skills: skills,

    make: function (save, spec) {
      const kind = KINDS[spec.kind] || KINDS.listing;
      const boss = spec.kind === 'boss';
      return {
        title: spec.title || kind.name,
        kind: spec.kind || 'listing',
        region: spec.region || 'home',
        hp: boss ? kind.hp : kind.hp,
        max: kind.hp,
        power: kind.power,
        boss: boss,
        phase: 'fight',
        backupUsed: false,
        log: [kind.name + ' wants a reason to say yes.'],
      };
    },

    pitch: function (save, b) {
      if (b.phase !== 'fight') return;
      const dmg = power(save, b, 'pitch');
      b.hp = Math.max(0, b.hp - dmg);
      G.Audio.hit();
      afterPlayer(save, b, 'Pitch lands for ' + dmg + '.');
    },

    cast: function (save, b, skillId) {
      if (b.phase !== 'fight') return;
      const skill = skills(save).filter(function (s) { return s.id === skillId; })[0];
      if (!skill) return;
      if (save.focus < skill.cost) {
        b.log.push('Not enough Focus.');
        return;
      }
      save.focus -= skill.cost;
      let text = skill.name + '.';
      if (save.id === 'bethany' && skillId === 'sig') {
        const heal = 8;
        save.energy = Math.min(save.energyMax, save.energy + heal);
        text = 'Nurse\'s Heart restores ' + heal + ' Energy.';
      } else if (save.id === 'malcolm' && skillId === 'sig') {
        const heal = 4;
        save.energy = Math.min(save.energyMax, save.energy + heal);
        const dmg = power(save, b, 'sig');
        b.hp = Math.max(0, b.hp - dmg);
        text = 'Office Leader Rally for ' + dmg + ', and the desk breathes (' + heal + ').';
      } else {
        const dmg = power(save, b, skillId === 'sig' ? 'sig' : skillId);
        b.hp = Math.max(0, b.hp - dmg);
        text = skill.name + ' for ' + dmg + '.';
      }
      G.Audio.hit();
      afterPlayer(save, b, text);
    },

    useItem: function (save, b, itemId) {
      if (b.phase !== 'fight') return;
      if (!save.items[itemId]) {
        b.log.push('None left.');
        return;
      }
      save.items[itemId] -= 1;
      if (itemId === 'coffee') {
        save.energy = Math.min(save.energyMax, save.energy + 12);
        afterPlayer(save, b, 'Caribou Coffee. +12 Energy.');
        return;
      }
      if (itemId === 'staging') {
        save.staging = true;
        b.log.push('Staging Kit is set. The next pitch hits harder.');
        return;
      }
      if (itemId === 'tires') {
        save.tiresOn = true;
        b.log.push('Snow Tires. Winter pushes less.');
        return;
      }
      if (itemId === 'snack') {
        save.energy = Math.min(save.energyMax, save.energy + 6);
        afterPlayer(save, b, 'Onion-free snack. +6 Energy.');
        return;
      }
      if (itemId === 'drone') {
        const dmg = 6;
        b.hp = Math.max(0, b.hp - dmg);
        afterPlayer(save, b, 'Drone shows the roof. ' + dmg + ' off the deal.');
      }
    },

    backup: function (save, b) {
      if (b.phase !== 'fight') return;
      if (!save.partner) {
        b.log.push('Nobody came with you. Ask in the office.');
        return;
      }
      if (b.backupUsed) {
        b.log.push(G.agentById(save.partner).short + ' already jumped in.');
        return;
      }
      b.backupUsed = true;
      const mate = G.agentById(save.partner);
      const dmg = 8 + Math.floor(save.lv * 1.5);
      b.hp = Math.max(0, b.hp - dmg);
      G.Audio.blip();
      afterPlayer(save, b, mate.short + ' assists with ' + mate.perkName + ' for ' + dmg + '.');
    },
  };
})();
