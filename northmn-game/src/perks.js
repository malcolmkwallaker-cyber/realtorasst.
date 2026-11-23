// Season math. Words for each perk live in roster.js.
// Every perk is worth about the same. Niches differ. Power does not.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  G.BALANCE = {
    weeks: 12,
    skill: 0.72,
    pRight: 0.62,
    pWrong: 0.34,
    // Chance the first card is your own kind of work.
    nicheRate: 0.62,
    // Success added when you take a card that matches your perk.
    // Adam is the exception: his Duluth cards raise skill instead.
    nicheBonus: 0.07,
    adamSkill: 0.25,
    teammateP: 0.5,
    rivalDraws: 2,
    rivalP: 0.515,
    storyBonus: 1,
    runs: 1000,
  };

  // perkId -> how a matching card behaves. Regions are data, not power.
  G.PERK_RULES = {
    lead: { kind: 'success' },
    price: { kind: 'success' },
    handbook: { kind: 'success' },
    checklist: { kind: 'success' },
    grant: { kind: 'success' },
    mighty: { kind: 'success' },
    travel: { kind: 'success' },
    firsthome: { kind: 'success' },
    beard: { kind: 'success' },
    nurse: { kind: 'success' },
    zillow: { kind: 'success' },
    know: { kind: 'skill', region: 'duluth' },
    anyhome: { kind: 'success' },
    figure: { kind: 'success' },
    range: { kind: 'success', region: 'range' },
    room: { kind: 'success' },
    guy: { kind: 'success', region: 'home' },
    lender: { kind: 'success' },
  };
})();
