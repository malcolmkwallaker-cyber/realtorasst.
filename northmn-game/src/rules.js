// Season rules shared by the browser game and the balance sim.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  function randOf(rng) {
    return rng || Math.random;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function agent(state) {
    return G.agentById(state.agentId);
  }

  function rule(state) {
    return G.PERK_RULES[agent(state).perkId];
  }

  function storyDue(state) {
    return state.week === 2 || state.week === 5 || state.week === 8 || state.week === 11;
  }

  function pushLog(state, line) {
    state.log.unshift(line);
    if (state.log.length > 6) state.log.length = 6;
  }

  const Rules = {
    officeScore(state) {
      const story = state.storyBeats >= 4 ? G.BALANCE.storyBonus : 0;
      return state.units + state.teammates + story;
    },

    skillFor(state, job) {
      const r = rule(state);
      let skill = G.BALANCE.skill;
      if (r && r.kind === 'skill' && job.region === r.region) {
        skill += G.BALANCE.adamSkill;
      }
      return clamp(skill, 0, 0.97);
    },

    bonusFor(state, job) {
      const r = rule(state);
      if (!r || r.kind !== 'success') return 0;
      if (job.perkTag !== agent(state).perkId) return 0;
      if (r.region && job.region !== r.region) return 0;
      return G.BALANCE.nicheBonus;
    },

    newGame(agentId) {
      return {
        agentId: agentId,
        week: 0,
        phase: 'offer',
        units: 0,
        teammates: 0,
        rangeUnits: 0,
        duluthUnits: 0,
        regions: { home: 0, range: 0, duluth: 0 },
        storyBeats: 0,
        offers: [],
        job: null,
        result: null,
        storyPick: null,
        log: [],
        won: false,
        tied: false,
      };
    },

    beginWeek(state, rng) {
      const rand = randOf(rng);
      const id = agent(state).perkId;
      const first = rand() < G.BALANCE.nicheRate
        ? id
        : G.ROSTER[Math.floor(rand() * G.ROSTER.length)].perkId;
      const second = G.ROSTER[Math.floor(rand() * G.ROSTER.length)].perkId;
      const a = G.Flavor.offer(first, rand);
      let b = G.Flavor.offer(second, rand);
      let guard = 0;
      while (b.text === a.text && guard < 6) {
        b = G.Flavor.offer(second, rand);
        guard += 1;
      }
      state.offers = [a, b];
      state.job = null;
      state.result = null;
      state.storyPick = null;
      state.phase = 'offer';
    },

    chooseOffer(state, index) {
      const job = state.offers[index];
      if (!job) return;
      state.job = job;
      state.phase = 'call';
    },

    chooseCall(state, index, rng) {
      const rand = randOf(rng);
      const job = state.job;
      const right = index === job.correct;
      let p = right ? G.BALANCE.pRight : G.BALANCE.pWrong;
      p += Rules.bonusFor(state, job);
      p = clamp(p, 0.05, 0.95);
      const ok = rand() < p;
      if (ok) {
        state.units += 1;
        state.regions[job.region] += 1;
      }
      const who = agent(state);
      state.result = {
        ok: ok,
        townName: job.townName,
        region: job.region,
        line: ok
          ? who.short + ' closes one for the Grand Rapids desk in ' + job.townName + '.'
          : who.short + ' keeps the ' + job.townName + ' file alive. Not a closing this week.',
      };
      pushLog(state, state.result.line);
      if (storyDue(state) && state.storyBeats === Math.floor(state.week / 3)) {
        state.phase = 'story';
      } else {
        state.phase = 'recap';
      }
    },

    chooseStory(state, index) {
      const beat = agent(state).beats[state.storyBeats];
      state.storyPick = index === 1 ? beat.b : beat.a;
      state.storyBeats += 1;
      state.phase = 'recap';
    },

    endWeek(state, rng) {
      const rand = randOf(rng);
      const mates = G.matesExcept(state.agentId);
      const mate = mates[Math.floor(rand() * mates.length)];
      if (rand() < G.BALANCE.teammateP) {
        const town = G.Flavor.randomTown(rand);
        state.teammates += 1;
        state.regions[town.region] += 1;
        pushLog(state, mate.deskLine.replaceAll('{town}', town.name));
      } else {
        const town = G.Flavor.randomTown(rand);
        pushLog(state, mate.workLine.replaceAll('{town}', town.name));
      }
      let rangeAdd = 0;
      let duluthAdd = 0;
      for (let i = 0; i < G.BALANCE.rivalDraws; i++) {
        if (rand() < G.BALANCE.rivalP) rangeAdd += 1;
        if (rand() < G.BALANCE.rivalP) duluthAdd += 1;
      }
      state.rangeUnits += rangeAdd;
      state.duluthUnits += duluthAdd;
      if (rangeAdd) {
        const t = G.Flavor.rangeTown(rand);
        pushLog(state, 'Range desk closes in ' + t.name + '.');
      }
      if (duluthAdd) {
        const t = G.Flavor.duluthTown(rand);
        pushLog(state, 'Duluth desk closes in ' + t.name + '.');
      }
      state.week += 1;
      if (state.week >= G.BALANCE.weeks) {
        const score = Rules.officeScore(state);
        state.won = score > state.rangeUnits && score > state.duluthUnits;
        state.tied = !state.won && (score === state.rangeUnits || score === state.duluthUnits);
        state.phase = 'done';
        return;
      }
      Rules.beginWeek(state, rand);
    },

    bestOffer(state) {
      const id = agent(state).perkId;
      let best = 0;
      let bestScore = -1;
      for (let i = 0; i < state.offers.length; i++) {
        const job = state.offers[i];
        const fake = { agentId: state.agentId };
        const score = Rules.bonusFor(fake, job) + (Rules.skillFor(fake, job) > G.BALANCE.skill ? 0.07 : 0);
        if (job.perkTag === id && score >= bestScore) {
          best = i;
          bestScore = score;
        }
      }
      if (bestScore < 0) return 0;
      return best;
    },

    autoSeason(agentId, rng) {
      const rand = randOf(rng);
      const state = Rules.newGame(agentId);
      Rules.beginWeek(state, rand);
      while (state.phase !== 'done') {
        const index = Rules.bestOffer(state);
        Rules.chooseOffer(state, index);
        const skill = Rules.skillFor(state, state.job);
        let pick = state.job.correct;
        if (rand() > skill) {
          const wrong = [0, 1, 2].filter(function (i) { return i !== state.job.correct; });
          pick = wrong[Math.floor(rand() * wrong.length)];
        }
        Rules.chooseCall(state, pick, rand);
        if (state.phase === 'story') Rules.chooseStory(state, rand() < 0.5 ? 0 : 1);
        Rules.endWeek(state, rand);
      }
      return state;
    },
  };

  G.Rules = Rules;
})();
