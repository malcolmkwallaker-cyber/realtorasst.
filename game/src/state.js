// ============================================================
// state.js - game state, lead pipeline, action resolution,
//            rival AI, weather, legendary power-ups, rivalry,
//            achievements profile, day/season progression
// ============================================================
'use strict';

// ------------------------------------------------------------
// Persistent profile: lifetime stats, achievements, unlocks.
// Survives across seasons in localStorage.
// ------------------------------------------------------------
G.Profile = {
  KEY: 'realtorRivals.profile.v1',
  data: null,

  load() {
    if (this.data) return this.data;
    try {
      this.data = JSON.parse(localStorage.getItem(this.KEY)) || null;
    } catch (e) { this.data = null; }
    if (!this.data) {
      this.data = { lifetime: {}, achievements: {}, unlocks: {}, coffeeVisits: 0 };
    }
    this.data.lifetime = this.data.lifetime || {};
    this.data.achievements = this.data.achievements || {};
    this.data.unlocks = this.data.unlocks || {};
    return this.data;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {}
  },

  bump(stat, n = 1) {
    const d = this.load();
    d.lifetime[stat] = (d.lifetime[stat] || 0) + n;
    this.checkStatAchievements();
    this.save();
  },

  award(id) {
    const d = this.load();
    if (d.achievements[id]) return false;
    d.achievements[id] = true;
    this.save();
    const a = G.Data.ACHIEVEMENTS.find(x => x.id === id);
    if (a) G.Toast.push('ACHIEVEMENT: ' + a.name, a.desc);
    return true;
  },

  has(id) { return !!this.load().achievements[id]; },

  checkStatAchievements() {
    const d = this.load();
    for (const a of G.Data.ACHIEVEMENTS) {
      if (!a.stat || d.achievements[a.id]) continue;
      if ((d.lifetime[a.stat] || 0) >= a.goal) this.award(a.id);
    }
  },

  unlock(charId, why) {
    const d = this.load();
    if (d.unlocks[charId]) return false;
    d.unlocks[charId] = true;
    this.save();
    const ch = G.Data.CHARACTERS[charId];
    if (ch) {
      const label = ch.role === 'office' ? 'OFFICE UNLOCKED: ' : 'UNLOCKED: ';
      G.Toast.push(label + ch.short, why || ch.unlockHint);
    }
    return true;
  },

  unlocked(charId) {
    const ch = G.Data.CHARACTERS[charId];
    if (!ch || !ch.secret) return true;
    return !!this.load().unlocks[charId];
  },
};

// ------------------------------------------------------------
G.State = {
  s: null, // current game state

  // ----------------------------------------------------------
  newGame(charId, difficulty, pace) {
    this.s = {
      charId: G.Data.CHARACTERS[charId] ? charId : 'malcolm',
      difficulty: G.Data.BALANCE[difficulty] ? difficulty : 'standard',
      month: 0,        // 0..2
      dayOfMonth: 1,   // 1..daysPerMonth
      energy: G.Data.SEASON.baseEnergy,
      cash: 0,
      abilityUsed: false,
      leadSeq: 0,
      pendingBoss: false,
      pendingBattle: false,
      battleDoneMonth: -1,
      bossIndex: 0,
      bossPlan: null,
      seasonOver: false,
      effects: { snowTomorrow: false, preapproved: false },
      weather: null,
      joelUsed: false,
      jeffCooldown: 0,
      blakeCooldown: 0,
      aiOverdrive: 0,
      scaleMode: 0,
      parkingLotTalk: 0,
      tylerCooldown: 0,
      tylerTier: 0,
      systemOverride: 0,
      openHouseEngine: 0,
      commercialUnlocked: false,
      coffee: 100,
      rivalry: 0,
      dayVolume: 0,
      bigfootToday: false,
      mentorUsedToday: false,   // one major mentor benefit per day
      marketVisibility: 40,     // 0..100 public-marketing momentum
      eventHistory: [],         // last 5 event ids (no immediate repeats)
      followReport: null,       // yesterday's follow-up summary
      daysPerMonth: 5,
      streak: 0,
      bestStreak: 0,
      dayMarks: 0,
      milestones: {},
      pendingCelebrations: [],
      stats: {
        homesSold: 0, commission: 0, listings: 0, buyers: 0,
        referrals: 0, reviews: 5, followers: 120, happiness: 70,
        reputation: 50, commercialDeals: 0,
        leadsReceived: 0, bossWins: 0,
      },
      rival: { homesSold: 0, commission: 0, followers: 150 },
      leads: [],
      upgrades: {},
      log: [],
    };
    this.s.daysPerMonth = pace === 'full' ? 8 : 5;

    // boss plan: two random pool bosses + the final
    const pool = G.shuffle(G.Data.BOSS_POOL).slice(0, 2);
    this.s.bossPlan = [...pool, G.Data.FINAL_BOSS];

    const ch = this.char();
    if (ch.startCash) this.s.cash = ch.startCash;
    if (ch.startReputation) this.s.stats.reputation = ch.startReputation;
    if (ch.startFollowers) this.s.stats.followers = ch.startFollowers;

    // starting pipeline. Gaige starts light on purpose.
    if (ch.perk === 'gaige' || ch.id === 'gaige') {
      this.spawnLead('firsttime');
      this.s.cash = Math.min(this.s.cash, 500);
    } else {
      const pool = ['firsttime', 'signcall', (ch.lakeLeadWeight || 1) > 1 ? 'lakehome' : 'facebook', 'referral'];
      for (const t of pool.slice(0, this.bal().startingLeadCount)) this.spawnLead(t);
    }
    if (ch.id === 'liz') this.spawnLead('referral');
    this.s.energy = this.maxEnergy();

    this.rollWeather();
    this.pushLog('Season started. Go get \'em!');
    return this.s;
  },

  loadGame() {
    const st = G.Save.load();
    if (!st) return null;
    // migrate older saves
    st.effects = st.effects || { snowTomorrow: false };
    st.effects.preapproved = st.effects.preapproved || false;
    st.weather = st.weather || null;
    st.joelUsed = st.joelUsed || st.bradUsed || false;
    st.jeffCooldown = st.jeffCooldown || 0;
    st.blakeCooldown = st.blakeCooldown || 0;
    st.aiOverdrive = st.aiOverdrive || 0;
    st.scaleMode = st.scaleMode || 0;
    st.tylerCooldown = st.tylerCooldown || 0;
    st.tylerTier = st.tylerTier || 0;
    st.systemOverride = st.systemOverride || 0;
    st.openHouseEngine = st.openHouseEngine || 0;
    st.commercialUnlocked = st.commercialUnlocked || false;
    st.coffee = st.coffee == null ? 100 : st.coffee;
    st.rivalry = st.rivalry || 0;
    st.dayVolume = st.dayVolume || 0;
    st.bigfootToday = st.bigfootToday || false;
    st.pendingBattle = st.pendingBattle || false;
    st.battleDoneMonth = st.battleDoneMonth ?? -1;
    st.bossPlan = st.bossPlan || [...G.shuffle(G.Data.BOSS_POOL).slice(0, 2), G.Data.FINAL_BOSS];
    st.stats.reputation = st.stats.reputation ?? 50;
    st.stats.commercialDeals = st.stats.commercialDeals ?? 0;
    // v2 migration: difficulty modes, mentor limit, momentum, follow-up tracking
    st.difficulty = G.Data.BALANCE[st.difficulty] ? st.difficulty : 'standard';
    st.mentorUsedToday = st.mentorUsedToday || false;
    st.marketVisibility = st.marketVisibility == null ? 40 : st.marketVisibility;
    st.eventHistory = st.eventHistory || [];
    st.followReport = st.followReport || null;
    st.effects.showPenalty = st.effects.showPenalty || false;
    st.effects.detour = st.effects.detour || 0;
    st.effects.distracted = st.effects.distracted || false;
    st.tylerTier = Math.min(st.tylerTier || 0, 3);
    st.scaleMode = Math.min(st.scaleMode || 0, 1);
    st.aiOverdrive = Math.min(st.aiOverdrive || 0, 2);
    st.parkingLotTalk = 0;
    st.systemOverride = 0;
    st.openHouseEngine = 0;
    st.scaleMode = 0;
    st.aiOverdrive = 0;
    st.daysPerMonth = st.daysPerMonth === 8 ? 8 : (st.daysPerMonth || 5);
    st.streak = st.streak || 0;
    st.bestStreak = st.bestStreak || 0;
    st.dayMarks = st.dayMarks || 0;
    st.milestones = st.milestones || {};
    st.pendingCelebrations = st.pendingCelebrations || [];
    st.stats.openHouses = st.stats.openHouses || 0;
    st.stats.pendings = st.stats.pendings || 0;
    st.stats.lakeSold = st.stats.lakeSold || 0;
    st.stats.inspectionsCleared = st.stats.inspectionsCleared || 0;
    const retired = { blake: 1, tyler: 1, grandpa: 1, influencer: 1, veteran: 1, rookie: 1 };
    if (!G.Data.CHARACTERS[st.charId] || retired[st.charId]) st.charId = 'malcolm';
    const today = st.month * (st.daysPerMonth || G.Data.SEASON.daysPerMonth) + st.dayOfMonth;
    for (const l of st.leads || []) {
      l.lastContactDay = l.lastContactDay ?? today;
      l.daysSinceContact = l.daysSinceContact || 0;
      l.contactAttempts = l.contactAttempts || 0;
      l.qualified = l.qualified ?? (l.stage !== 'attendee');
      l.attendedOpenHouse = l.attendedOpenHouse || false;
      l.followUpDeadline = l.followUpDeadline ?? null;
      if (l.seller && (l.stage === 'active')) {
        l.listingMomentum = l.listingMomentum ?? 50;
        l.expectsOpenHouse = l.expectsOpenHouse ?? false;
      }
    }
    this.s = st;
    if (!this.s.weather) this.rollWeather();
    return st;
  },

  // Current difficulty's balance table
  bal() { return G.Data.BALANCE[(this.s && this.s.difficulty) || 'standard'] || G.Data.BALANCE.standard; },

  autosave() {
    if (this.s && !this.s.seasonOver) G.Save.save(this.s);
    if (this.s && G.Cloud && G.Cloud.signedIn()) G.Cloud.push(this.s);
  },

  // ----------------------------------------------------------
  char() { return G.Data.CHARACTERS[this.s.charId] || G.Data.CHARACTERS.malcolm; },
  perk() { return this.char().perk || this.char().id || null; },
  rivalChar() {
    // The season is Malcolm Wallaker vs Bridger Hopkins.
    // Playing anyone else, you are still chasing Bridger. Playing Bridger, Malcolm is the one across the table.
    const me = this.char();
    if (me && me.id === 'bridger') return G.Data.CHARACTERS.malcolm;
    return G.Data.CHARACTERS.bridger;
  },
  daysInMonth() { return (this.s && this.s.daysPerMonth) || G.Data.SEASON.daysPerMonth; },
  has(up) { return !!this.s.upgrades[up]; },
  commercialOk() { return this.s.commercialUnlocked || this.has('commercialdiv'); },

  rookieLevel() {
    return this.perk() === 'rookie' ? Math.floor(this.s.stats.homesSold / 3) : 0;
  },

  maxEnergy() {
    const ch = this.char();
    const hustle = ch.id === 'gaige' ? Math.min(2, Math.floor(this.s.stats.homesSold / 3)) : Math.min(3, this.rookieLevel());
    return G.Data.SEASON.baseEnergy
      + (this.has('ai') ? 1 : 0)
      + (this.has('corporateHQ') ? 1 : 0)
      + (ch.energyMod || 0)
      + ((this.s.streak || 0) >= 5 ? 1 : 0)
      + hustle;
  },

  tylerPassiveTier() { return 0; },

  blakeBuff() {
    if (this.s.scaleMode > 0) return { label: 'SCALE MODE', days: this.s.scaleMode, color: G.C.cyan };
    if (this.s.parkingLotTalk > 0) return { label: 'PARKING LOT TALK', days: this.s.parkingLotTalk, color: G.C.yellow };
    if (this.s.aiOverdrive > 0) return { label: 'AI OVERDRIVE', days: this.s.aiOverdrive, color: G.C.lime };
    return null;
  },

  // Compact list of active timed buffs / passive tiers for the HUD badge line
  activeBuffs() {
    const s = this.s, out = [];
    if (s.scaleMode > 0) out.push({ t: 'SCALE' + s.scaleMode, c: G.C.cyan });
    else if (s.aiOverdrive > 0) out.push({ t: 'AI' + s.aiOverdrive, c: G.C.lime });
    if (s.parkingLotTalk > 0) out.push({ t: 'PLT' + s.parkingLotTalk, c: G.C.yellow });
    if (s.systemOverride > 0) out.push({ t: 'SYS' + s.systemOverride, c: G.C.sky });
    else if (s.openHouseEngine > 0) out.push({ t: 'OH' + s.openHouseEngine, c: G.C.orange });
    const dsc = s.tylerTier + this.tylerPassiveTier();
    if (dsc > 0) out.push({ t: 'DSC' + dsc, c: G.C.teal });
    return out;
  },

  totalDay() { return this.s.month * this.daysInMonth() + this.s.dayOfMonth; },
  monthName() { return G.Data.SEASON.months[this.s.month]; },

  pushLog(msg) {
    this.s.log.unshift(msg);
    if (this.s.log.length > 40) this.s.log.pop();
  },

  conversionRate() {
    const st = this.s.stats;
    return st.leadsReceived > 0 ? st.homesSold / st.leadsReceived : 0;
  },

  addReputation(n) {
    this.s.stats.reputation = G.clamp(this.s.stats.reputation + n, 0, 100);
  },

  followerGainMult() {
    let m = 1;
    if (this.has('camera')) m *= 1.5;
    if (this.has('social')) m *= 2;
    if (this.has('tiktok')) m *= 1.3;
    m *= this.char().followerMult || 1;
    return m;
  },

  // ----------------------------------------------------------
  // Weather
  // ----------------------------------------------------------
  rollWeather() {
    const s = this.s;
    const m = Math.min(s.month, 2);
    const options = G.Data.WEATHER
      .map(w => ({ ...w, weight: w.weight[m] }))
      .filter(w => w.weight > 0);
    s.weather = G.weightedChoice(options).id;
    return this.applyWeatherDaily();
  },

  weatherData() { return G.Data.WEATHER.find(w => w.id === this.s.weather) || G.Data.WEATHER[0]; },

  weatherMod(actionId) {
    const w = this.weatherData();
    let mod = (w.mods || {})[actionId] || 0;
    // snowmobile makes winter weather harmless
    if (mod < 0 && (w.id === 'blizzard' || w.id === 'icestorm') && (this.has('snowmobile') || this.char().id === 'kaila')) mod = 0;
    return mod;
  },

  applyWeatherDaily() {
    const w = this.weatherData();
    const s = this.s;
    const lines = [];
    if (w.daily === 'lakeWarm') {
      for (const l of s.leads) if (l.lake) l.warmth = G.clamp(l.warmth + 5, 0, 100);
      lines.push('Lake leads are dreaming of dock sunsets. (+warmth)');
    }
    if (w.daily === 'heatCool') {
      for (const l of this.leadsInStage('new', 'hot')) l.warmth = G.clamp(l.warmth - 5, 0, 100);
      lines.push('Too hot to house hunt. Leads cool slightly.');
    }
    if (w.daily === 'auroraJoy') {
      s.stats.happiness = G.clamp(s.stats.happiness + 3, 0, 100);
      lines.push('Everyone is in a great mood under the lights. (+happiness)');
    }
    return lines;
  },

  // ----------------------------------------------------------
  // Leads
  // ----------------------------------------------------------
  // Returns the new lead, or null if the pipeline is full (opportunity lost).
  // opts.force bypasses the cap (story-critical spawns only).
  spawnLead(typeId, opts = {}) {
    const s = this.s;
    if (!opts.force && s.leads.length >= this.bal().maxActivePipeline) {
      s.stats.leadsMissed = (s.stats.leadsMissed || 0) + 1;
      return null;
    }
    let type;
    if (typeId) {
      type = G.Data.LEAD_TYPES.find(t => t.id === typeId);
    } else {
      const ch = this.char();
      const weighted = G.Data.LEAD_TYPES
        .filter(t => !t.commercial || this.commercialOk())
        .map(t => {
          let w = t.weight || 1;
          if (t.lake) {
            w *= ch.lakeLeadWeight || 1;
            if (this.has('waterfrontOffice')) w *= 2;
          }
          if (t.outdoors && (ch.outdoorsWeight || 1) > 1) w *= ch.outdoorsWeight;
          if ((t.id === 'facebook' || t.id === 'zestimate') && ch.id === 'emily') w *= 2.6;
          if (t.relo && (ch.reloWeight || 1) > 1) w *= ch.reloWeight;
          if (t.luxury && this.has('luxdiv')) w *= 2;
          if (t.relo && this.has('privatejet')) w *= 2;
          if ((t.id === 'cabin' || t.id === 'cabininv' || t.id === 'vacation') && this.has('cabinexpert')) w *= 1.5;
          return { ...t, weight: w };
        });
      type = G.weightedChoice(weighted);
    }
    let value = G.randInt(type.value[0], type.value[1]);
    if (type.luxury) {
      if (this.char().luxuryValueBonus) value = Math.round(value * (1 + this.char().luxuryValueBonus));
      if (this.has('luxbrochure')) value = Math.round(value * 1.1);
      if (this.has('luxdiv')) value = Math.round(value * 1.1);
    }
    if (type.commercial && this.has('commercialdiv')) value = Math.round(value * 1.1);

    let warmth = G.clamp(type.warmth + G.randInt(-10, 10), 5, 95);
    if ((type.outdoors || type.lake) && this.char().id === 'kaila') warmth = G.clamp(warmth + 8, 5, 100);
    if ((type.id === 'facebook' || type.id === 'zestimate') && this.char().id === 'emily') warmth = G.clamp(warmth + 12, 5, 100);
    if (type.relo && this.char().id === 'deb') warmth = G.clamp(warmth + 12, 5, 100);
    if (type.lake && this.has('fishingboat')) warmth = G.clamp(warmth + 10, 5, 100);
    if (type.lake && this.has('lakecert')) warmth = G.clamp(warmth + 10, 5, 100);
    if (type.outdoors && this.has('atv')) warmth = G.clamp(warmth + 15, 5, 100);
    if ((type.id === 'cabin' || type.id === 'cabininv' || type.id === 'vacation') && this.has('cabinexpert')) warmth = G.clamp(warmth + 10, 5, 100);
    if (type.relo && this.has('privatejet')) warmth = G.clamp(warmth + 20, 5, 100);

    const lead = {
      id: ++s.leadSeq,
      name: G.choice(G.Data.LEAD_NAMES),
      type: type.id,
      label: type.label,
      seller: !!type.seller,
      lake: !!type.lake,
      outdoors: !!(type.outdoors || type.lake),
      online: type.id === 'facebook' || type.id === 'zestimate',
      range: false,
      town: null,
      luxury: !!type.luxury,
      commercial: !!type.commercial,
      value,
      warmth,
      stage: opts.stage || 'new',
      daysInStage: 0,
      issue: false,
      delay: 0,
      overpriced: false,
      // follow-up tracking
      lastContactDay: this.totalDay(),
      daysSinceContact: 0,
      contactAttempts: 0,
      qualified: opts.stage !== 'attendee',
      attendedOpenHouse: opts.stage === 'attendee',
      followUpDeadline: opts.stage === 'attendee' ? this.bal().attendeeDeadline : null,
    };
    const rangeChance = this.char().id === 'tania' ? 0.5 : 0.1;
    if (!lead.commercial && G.chance(rangeChance)) this.tagRange(lead);
    s.leads.push(lead);
    s.stats.leadsReceived++;
    return lead;
  },

  // Bridger's number: fair price, buyers show up, the listing is not a trophy.
  priceRight(lead, lines) {
    if (!lead) return;
    lead.overpriced = false;
    lead.pricedRight = true;
    lead.listingMomentum = Math.max(lead.listingMomentum || 0, 52);
    this.s.stats.perfectPrices = (this.s.stats.perfectPrices || 0) + 1;
    if (lines) lines.push('PRICE IS RIGHT: ' + lead.name + ' listed at ' + G.money(lead.value) + '.');
  },

  tagRange(lead) {
    const towns = G.Data.RANGE_TOWNS || ['HIBBING', 'VIRGINIA', 'EVELETH', 'CHISHOLM'];
    lead.range = true;
    lead.town = G.choice(towns);
    if (lead.label.indexOf(lead.town) !== 0) lead.label = lead.town + ' ' + lead.label;
    const bump = this.char().id === 'tania' ? (this.char().rangeValue || 1.12) : 1.04;
    lead.value = Math.round(lead.value * bump);
    if (this.char().id === 'tania') lead.warmth = G.clamp(lead.warmth + 14, 5, 100);
    return lead;
  },

  // Mark a lead as personally contacted today
  touch(lead) {
    lead.lastContactDay = this.totalDay();
    lead.daysSinceContact = 0;
    lead.contactAttempts = (lead.contactAttempts || 0) + 1;
  },

  // Follow-up risk assessment for a lead (drives UI + report)
  leadRisk(l) {
    if (l.stage === 'attendee') {
      return l.followUpDeadline <= 0 ? 'ABOUT TO GHOST' : 'DUE TODAY';
    }
    if (l.stage === 'pending' || l.stage === 'offer') return 'SAFE';
    const d = l.daysSinceContact || 0;
    if (l.stage === 'appt') return d >= 1 ? 'AT RISK' : 'SAFE';
    if (d >= 3) return 'ABOUT TO GHOST';
    if (d >= 2) return 'AT RISK';
    if (d >= 1) return 'DUE TODAY';
    return 'SAFE';
  },

  leadsInStage(...stages) {
    return this.s.leads.filter(l => stages.includes(l.stage));
  },

  bestLead(leads) {
    const order = G.Data.STAGES;
    return leads.slice().sort((a, b) =>
      (order.indexOf(b.stage) - order.indexOf(a.stage)) || (b.warmth - a.warmth)
    )[0];
  },

  advance(lead, toStage) {
    lead.stage = toStage;
    lead.daysInStage = 0;
    if (toStage !== 'attendee') { lead.qualified = true; lead.followUpDeadline = null; }
    if (toStage === 'pending') this.s.stats.pendings = (this.s.stats.pendings || 0) + 1;
    if (toStage === 'active') {
      if (lead.seller) {
        this.s.stats.listings++;
        // Listings track marketing momentum + some sellers expect open houses
        lead.listingMomentum = 50;
        lead.expectsOpenHouse = G.chance(0.45);
        lead.ohExpectation = G.choice([
          'wants an open house ASAP', 'does not care about open houses',
          'wants one only if it has not sold', 'expects 40 people minimum',
          'does not want strangers touching anything',
        ]);
      } else this.s.stats.buyers++;
    }
  },

  removeLead(lead) {
    const i = this.s.leads.indexOf(lead);
    if (i >= 0) this.s.leads.splice(i, 1);
  },

  // ----------------------------------------------------------
  // Action availability
  // ----------------------------------------------------------
  actionAvailable(id) {
    const s = this.s;
    const cost = this.actionCost(id);
    if (s.energy < cost) return { ok: false, reason: 'NO ENERGY' };
    switch (id) {
      case 'call': case 'text':
        return this.leadsInStage('new', 'hot').length
          ? { ok: true } : { ok: false, reason: 'NO NEW/WARM LEADS' };
      case 'followup':
        return this.leadsInStage('attendee', 'new', 'hot', 'appt', 'active').length
          ? { ok: true } : { ok: false, reason: 'NOBODY TO NUDGE' };
      case 'video':
        return { ok: true };
      case 'listing':
        return this.leadsInStage('appt').some(l => l.seller)
          ? { ok: true } : { ok: false, reason: 'NO SELLER APPTS' };
      case 'show':
        return this.leadsInStage('appt', 'active').some(l => !l.seller)
          ? { ok: true } : { ok: false, reason: 'NO BUYERS READY' };
      case 'offer':
        return this.offerReadyLeads().length
          ? { ok: true } : { ok: false, reason: 'NO CLIENTS READY' };
      case 'negotiate':
        return this.leadsInStage('offer').length
          ? { ok: true } : { ok: false, reason: 'NO OFFERS OUT' };
      case 'inspect':
        return this.leadsInStage('pending').some(l => l.issue)
          ? { ok: true } : { ok: false, reason: 'NO ISSUES FOUND' };
      case 'close':
        return this.closableLeads().length
          ? { ok: true } : { ok: false, reason: 'NOTHING TO CLOSE' };
      case 'commercial':
        if (!this.commercialOk()) return { ok: false, reason: 'MEET JEFF FIRST' };
        return s.jeffCooldown <= 0
          ? { ok: true } : { ok: false, reason: 'BACK IN ' + s.jeffCooldown + 'D' };
      default:
        return { ok: true };
    }
  },

  actionCost(id) {
    const a = G.Data.ACTIONS.find(x => x.id === id);
    let cost = a ? a.energy : 1;
    if (id === 'openhouse' && this.has('vehicle')) cost = 1;
    if (id === 'show' && this.s.effects.showPenalty) cost += 1;  // frozen lockbox
    return cost;
  },

  offerReadyLeads() {
    return this.leadsInStage('active').filter(l => {
      if (l.seller) {
        const wait = this.has('photographer') ? 0 : 1;
        return l.daysInStage >= wait + (l.overpriced ? 2 : 0);
      }
      return true;
    });
  },

  closableLeads() {
    const pre = this.s.effects.preapproved;
    // New pendings must sit a couple days (TC trims one, never below 1)
    let wait = this.bal().pendingDaysBeforeClose;
    if (this.has('tc') || this.char().id === 'tania') wait = Math.max(1, wait - 1);
    return this.leadsInStage('pending').filter(l => !l.issue && (pre || l.delay <= 0) && l.daysInStage >= wait);
  },

  // Extra score from gear + weather + rookie level (applied to minigame results)
  scoreAdjust(id) {
    let adj = this.weatherMod(id);
    adj += this.rookieLevel() * 0.04;
    const ch = this.char();
    if (id === 'show') {
      if (this.has('matterport')) adj += 0.05;
      if (this.has('luxsuv')) adj += 0.05;
      if (this.has('pontoon')) adj += 0.08;
      if (this.has('lakecert')) adj += 0.04;
      adj += ch.showBonus || 0;
    }
    if (id === 'inspect') adj += ch.inspectBonus || 0;
    if (ch.id === 'malcolm') adj += Math.min(0.08, (this.s.teamRecruits || 0) * 0.02);
    if (ch.id === 'adam' && (id === 'listing' || id === 'negotiate' || id === 'show')) adj += 0.08;
    if ((this.s.broccoliDays || 0) > 0) adj += 0.08;
    adj += Math.min(0.1, (this.s.streak || 0) * 0.02);
    if (ch.id === 'scotty') adj += (this.s.stats.happiness - 50) / 900;
    if (id === 'listing' && this.has('matterport')) adj += 0.1;
    if (id === 'video') {
      if (this.has('tiktok')) adj += 0.1;
      if (this.has('videographer')) adj += 0.15;
    }
    if ((id === 'negotiate' || id === 'inspect') && this.s.effects.preapproved) adj += 0.15;
    if (this.s.scaleMode > 0) adj += 0.05;   // Scale Mode: everything a touch smoother
    if (this.s.parkingLotTalk > 0) adj += 0.05; // legacy buff, no longer granted
    // county road detour: tomorrow's tours suffer
    if (this.s.effects.detour > 0 && (id === 'show' || id === 'openhouse') && ch.id !== 'deb') adj -= 0.15;
    // market visibility: known agents draw better open house crowds
    if (id === 'openhouse') adj += (this.s.marketVisibility - 40) / 500;
    return adj;
  },

  // ----------------------------------------------------------
  // Close a single lead: shared by close action, Joel, commercial
  // ----------------------------------------------------------
  closeLead(l, lines) {
    const s = this.s;
    const rate = l.commercial ? 0.005 : 0.027;
    const comm = Math.round(l.value * rate * (this.char().commissionMult || 1));
    // Commercial deals are their own stat - they do NOT count as homes sold
    if (l.commercial) s.stats.commercialDeals++;
    else s.stats.homesSold++;
    s.stats.commission += comm;
    s.cash += comm;
    s.dayVolume += l.value;
    s.marketVisibility = G.clamp(s.marketVisibility + 5, 0, 100);  // SOLD signs sell
    lines.push('SOLD! ' + l.name + ' - ' + G.money(l.value) + ' (+' + G.money(comm) + ' commission)');
    const happyGain = Math.round(4 * (this.char().happyMult || 1));
    s.stats.happiness = G.clamp(s.stats.happiness + happyGain, 0, 100);

    if (G.chance(0.5)) {
      s.stats.reviews++;
      this.addReputation(2);
      lines.push('+ 5-STAR REVIEW: "' + G.choice([
        'Sold our place in a weekend, dontcha know!', 'Best agent north of Brainerd.',
        'They brought bars to closing. BARS.', '10/10 would house again.',
      ]) + '"');
    }
    const refChance = 0.35 + s.stats.happiness / 400 + (this.has('retreat') ? 0.1 : 0) + (this.char().referralBonus || 0);
    if (G.chance(refChance)) {
      const n = this.char().id === 'emily' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const r = this.spawnLead('referral');
        if (!r) { lines.push('They wanted to refer a friend, but your plate is FULL. (pipeline cap)'); break; }
        s.stats.referrals++;
        G.Profile.bump('referrals');
        lines.push('+ REFERRAL: they told ' + r.name + ' about you!');
      }
    }
    // lifetime achievements
    G.Profile.bump('closes');
    if (l.lake) {
      G.Profile.bump('lakeSold');
      s.stats.lakeSold = (s.stats.lakeSold || 0) + 1;
    }
    if (l.lake || l.outdoors) s.stats.outdoorsSold = (s.stats.outdoorsSold || 0) + 1;
    if (l.range) s.stats.rangeSold = (s.stats.rangeSold || 0) + 1;
    if (!l.commercial && s.month === 0) s.stats.aprilClose = true;
    if (!l.commercial && s.stats.homesSold === 1) {
      this.celebrate('firstHome', 'FIRST KEYS!', ['The first closing of the season.', 'Uff da, that feels good.']);
    }
    if (!l.commercial && s.stats.homesSold === 5) {
      this.celebrate('fiveHomes', 'FIVE HOMES!', ['The yard signs are multiplying. Nice work.']);
    }
    if (!l.commercial && s.stats.homesSold > s.rival.homesSold) {
      this.celebrate('ahead', 'YOU TOOK THE LEAD!', ['The billboard broker can wait.']);
    }
    if (G.Roster) G.Roster.evaluate(s);
    if (this.has('ai')) G.Profile.bump('aiCloses');
    if (s.stats.homesSold >= 12) G.Profile.award('closer');
    if (s.dayVolume >= 1000000) G.Profile.award('monday');
    if (G.chance(0.02)) G.Profile.award('neighbor');

    this.removeLead(l);
  },

  // ----------------------------------------------------------
  // Perform an action. score: 0..1 from a minigame (or null)
  // ----------------------------------------------------------
  performAction(id, score) {
    const s = this.s;
    const ch = this.char();
    s.energy -= this.actionCost(id);
    if (score !== null && score !== undefined) {
      score = G.clamp(score + this.scoreAdjust(id), 0, 1);
    }
    const lines = [];
    let sold = 0;

    const grade = (sc) => sc >= 0.85 ? 'PERFECT!' : sc >= 0.6 ? 'GREAT!' : sc >= 0.35 ? 'OKAY.' : 'ROUGH...';

    switch (id) {
      case 'call': {
        G.Profile.bump('calls');
        if (score >= 0.99) G.Profile.bump('perfectCalls');
        const bal = this.bal();
        const targets = this.leadsInStage('new', 'hot');
        const n = Math.min(targets.length, Math.round(score * 3.4));
        lines.push(grade(score) + ' You worked the phones.');
        const picked = G.shuffle(targets).slice(0, Math.max(n, 0));
        for (const l of picked) {
          this.touch(l);
          l.warmth = G.clamp(l.warmth + Math.round(10 + 10 * score), 0, 100);
          if (ch.id === 'emily' && l.online && score >= 0.4 && (l.stage === 'new' || l.stage === 'hot')) {
            this.advance(l, 'appt');
            s.stats.zillowFlips = (s.stats.zillowFlips || 0) + 1;
            lines.push(l.name + ' went from a Zillow ping to an appointment.');
          } else if (l.stage === 'new' && l.warmth >= bal.warmThreshold) {
            this.advance(l, 'hot'); lines.push(l.name + ' warmed up! (' + l.label + ')');
          } else if (l.stage === 'hot' && l.warmth >= bal.apptThreshold) {
            this.advance(l, 'appt'); lines.push(l.name + ' booked an appointment!');
          } else {
            lines.push(l.name + ' is warming: ' + l.warmth + '/' + (l.stage === 'new' ? bal.warmThreshold : bal.apptThreshold) + ' to advance.');
          }
        }
        if (!picked.length) lines.push('Straight to voicemail. All of them. Brutal.');
        break;
      }

      case 'text': {
        G.Profile.bump('texts');
        const bal = this.bal();
        const targets = this.leadsInStage('new', 'hot');
        for (const l of targets) { this.touch(l); l.warmth = G.clamp(l.warmth + Math.round(12 * score), 0, 100); }
        const n = Math.min(targets.length, score >= 0.8 ? 2 : score >= 0.45 ? 1 : 0);
        lines.push(grade(score) + ' Thumbs of fury engaged.');
        const picked = G.shuffle(targets).slice(0, n);
        let advanced = 0;
        for (const l of picked) {
          if (l.stage === 'new' && l.warmth >= bal.warmThreshold) {
            this.advance(l, 'hot'); lines.push(l.name + ' replied with three exclamation points. Warm!'); advanced++;
          } else if (l.stage === 'hot' && l.warmth >= bal.apptThreshold) {
            this.advance(l, 'appt'); lines.push(l.name + ' set an appointment by text!'); advanced++;
          }
        }
        if (targets.length && !advanced) lines.push('Everyone is "def interested!!" but nobody committed. Keep warming them.');
        break;
      }

      case 'followup': {
        G.Profile.bump('coffees');
        G.Profile.load().coffeeVisits++;
        G.Profile.save();
        const bal = this.bal();
        lines.push(grade(score) + ' ' + G.choice(G.Data.FLAVOR.followup));
        // Contact a limited number of people - most at-risk first
        const riskOrder = { 'ABOUT TO GHOST': 0, 'AT RISK': 1, 'DUE TODAY': 2, 'SAFE': 3 };
        const pool = this.leadsInStage('attendee', 'new', 'hot', 'appt', 'active')
          .sort((a, b) => (riskOrder[this.leadRisk(a)] - riskOrder[this.leadRisk(b)]) ||
                          ((b.daysSinceContact || 0) - (a.daysSinceContact || 0)));
        const contacts = bal.followupContacts + (this.has('crm') ? 2 : 0) + (ch.followupBonus || 0);
        const picked = pool.slice(0, contacts);
        for (const l of picked) {
          const late = (l.daysSinceContact || 0) >= 2;
          this.touch(l);
          let gain = Math.round(4 + 10 * score);
          if (late) gain = Math.ceil(gain / 2);
          if (l.stage === 'attendee') {
            // Open house attendee: this follow-up decides if they become business
            if (score >= 0.45 && !late) {
              const roll = Math.random();
              if (roll < 0.5) {
                l.stage = 'new'; l.qualified = true; l.followUpDeadline = null;
                l.warmth = G.clamp(l.warmth + 15, 0, 100);
                lines.push(l.name + ' is a REAL buyer - qualified into your pipeline!');
              } else if (roll < 0.65) {
                l.stage = 'new'; l.seller = true; l.qualified = true; l.followUpDeadline = null;
                l.warmth = G.clamp(l.warmth + 15, 0, 100);
                lines.push(l.name + ' needs to SELL first. Seller opportunity!');
              } else if (roll < 0.75) {
                this.removeLead(l);
                const r = this.spawnLead('referral');
                if (r) { s.stats.referrals++; G.Profile.bump('referrals'); lines.push(l.name + ' is not moving - but referred ' + r.name + '!'); }
                else lines.push(l.name + ' offered a referral, but your pipeline is FULL.');
              } else if (roll < 0.9) {
                this.removeLead(l);
                lines.push(l.name + ' was a neighbor who "just loves floor plans." Farewell.');
              } else {
                this.removeLead(l);
                lines.push(l.name + ' already has an agent. (Their cousin. It is always the cousin.)');
              }
            } else {
              this.removeLead(l);
              lines.push(l.name + ' (attendee) slipped away. ' + G.choice(G.Data.FLAVOR.lostReasons));
            }
            continue;
          }
          l.warmth = G.clamp(l.warmth + gain, 0, 100);
          if (late && score < 0.4 && (l.stage === 'new' || l.stage === 'hot') && G.chance(0.25)) {
            this.removeLead(l);
            lines.push(l.name + ': "Oh! We actually went with another agent." Ouch.');
            continue;
          }
          if (l.stage === 'new' && l.warmth >= bal.warmThreshold) {
            this.advance(l, 'hot'); lines.push(l.name + ' warmed up! (+' + gain + ' warmth)');
          } else if (l.stage === 'hot' && l.warmth >= bal.apptThreshold && G.chance(0.4 + score * 0.4)) {
            this.advance(l, 'appt'); lines.push(l.name + ' says "ope, yeah, let\'s meet!"');
          } else if (l.stage === 'active') {
            s.stats.happiness = G.clamp(s.stats.happiness + 1, 0, 100);
            lines.push(l.name + ' (client) feels looked after.');
          } else {
            lines.push(l.name + ': +' + gain + ' warmth' + (late ? ' (they noticed the delay)' : '') + '.');
          }
        }
        // AI assistant sends one extra automated, low-quality touch
        if (this.has('ai') && pool.length > picked.length) {
          const l = pool[picked.length];
          if (l.stage !== 'attendee') {
            this.touch(l);
            l.warmth = G.clamp(l.warmth + 3, 0, 100);
            lines.push('AI ASSISTANT auto-texted ' + l.name + '. Polite, and only one exclamation point. (+3 warmth)');
          }
        }
        // Excellent follow-up occasionally creates something special
        if (score >= 0.9 && G.chance(0.5)) {
          const roll = Math.random();
          if (roll < 0.4) {
            const r = this.spawnLead('referral');
            if (r) { s.stats.referrals++; G.Profile.bump('referrals'); lines.push('+ A delighted lead referred ' + r.name + '!'); }
          } else if (roll < 0.7) {
            const r = this.spawnLead('pastclient');
            if (r) lines.push('+ Past client ' + r.name + ' wants a market analysis!');
          } else {
            const cold = this.leadsInStage('new').sort((a, b) => a.warmth - b.warmth)[0];
            if (cold) { cold.warmth = G.clamp(cold.warmth + 25, 0, 100); lines.push('+ ' + cold.name + ' unexpectedly got MOTIVATED. (+25 warmth)'); }
          }
        }
        if (!picked.length) lines.push('Nobody to follow up with. A rare, eerie silence.');
        s.stats.happiness = G.clamp(s.stats.happiness + 2, 0, 100);
        if (score >= 0.7) this.addReputation(1);
        if (G.Profile.load().coffeeVisits === 10) {
          lines.push('The baristas started your order when your car pulled in. You have ARRIVED.');
          this.addReputation(5);
        }
        break;
      }

      case 'openhouse': {
        // Open houses feed the whole business: attendees to follow up with,
        // listing momentum, market visibility - not a pile of free leads.
        const listings = this.leadsInStage('active').filter(l => l.seller);
        const listing = this.bestLead(listings);
        const bumpMomentum = (n) => { if (listing) listing.listingMomentum = G.clamp((listing.listingMomentum ?? 50) + n, 0, 100); };
        const band = score >= 0.9 ? 3 : score >= 0.7 ? 2 : score >= 0.45 ? 1 : 0;
        s.stats.openHouses = (s.stats.openHouses || 0) + 1;
        lines.push(grade(score) + ' The open house wrapped up.');

        let qualified = 0, attendees = 0;
        if (band === 0) {
          lines.push('Only visitor was a neighbor who "just loves floor plans."');
          this.addReputation(-1);
          bumpMomentum(-5);
          if (listing && G.chance(0.4)) {
            lines.push(listing.name + ' (seller) is FRUSTRATED: "Where was everybody?" (-3 happiness)');
            s.stats.happiness = G.clamp(s.stats.happiness - 3, 0, 100);
          }
        } else if (band === 1) {
          attendees = 1;
          bumpMomentum(10);
          s.marketVisibility = G.clamp(s.marketVisibility + 15, 0, 100);
        } else if (band === 2) {
          qualified = 1; attendees = 1;
          bumpMomentum(20);
          s.marketVisibility = G.clamp(s.marketVisibility + 20, 0, 100);
          this.addReputation(1);
          if (G.chance(0.3)) {
            const w = this.bestLead(this.leadsInStage('new', 'hot'));
            if (w) { w.warmth = G.clamp(w.warmth + 10, 0, 100); lines.push(w.name + ' stopped by too. (+10 warmth)'); }
          }
        } else {
          qualified = 2;
          bumpMomentum(30);
          s.marketVisibility = G.clamp(s.marketVisibility + 30, 0, 100);
          this.addReputation(2);
          if (listing && G.chance(0.4)) {
            this.advance(listing, 'offer');
            lines.push('AN OFFER came in on ' + listing.name + '\'s place before the bars ran out!');
          } else if (G.chance(0.4)) {
            const sl = this.spawnLead(G.chance(0.5) ? 'fsbo' : 'expired');
            if (sl) lines.push('+ SELLER OPPORTUNITY: ' + sl.name + ' asked "what would OURS go for?"');
          }
          s.rivalry++;
          lines.push('Competing agents noticed the packed driveway. The rivalry heats up.');
        }
        if (band > 0) {
          // Upgrades improve the crowd - hard cap of 3 qualified leads
          if (this.has('marketing') && G.chance(0.35)) qualified++;
          if (this.has('goldensigns') && G.chance(0.25)) qualified++;
          if (this.has('helicopter')) qualified++;
          qualified = Math.min(qualified, 3);
          for (let i = 0; i < qualified; i++) {
            const l = this.spawnLead('openhouse');
            if (l) {
              l.warmth = G.randInt(25, 40);
              lines.push('+ QUALIFIED LEAD: ' + l.name + ' (' + l.label + ')');
              G.Profile.bump('ohLeads');
            } else lines.push('Another serious buyer showed up... but your pipeline is FULL. They left.');
          }
          for (let i = 0; i < attendees; i++) {
            const a = this.spawnLead('openhouse', { stage: 'attendee' });
            if (a) {
              a.warmth = G.randInt(20, 45);
              lines.push('+ ATTENDEE: ' + a.name + ' signed in. FOLLOW UP by tomorrow or lose them!');
            }
          }
          s.stats.followers += Math.round(20 * score * this.followerGainMult());
        }
        break;
      }

      case 'video': {
        const gain = Math.round((80 + 420 * score) * this.followerGainMult());
        s.stats.followers += gain;
        lines.push(grade(score) + ' Video posted: "' + G.choice([
          'TOP 5 LAKES THAT SLAP', 'THIS CABIN HAS A SECRET...', 'POV: YOU OWN A DOCK',
          'WE FOUND THE CHEAPEST HOUSE IN TOWN', 'ICE FISHING HOUSE TOUR (YES REALLY)',
        ]) + '"');
        lines.push('+' + gain + ' FOLLOWERS');
        s.marketVisibility = G.clamp(s.marketVisibility + Math.round(5 + 5 * score), 0, 100);
        let leadChance = 0.08 + score * 0.30;
        if (this.has('social')) leadChance += 0.08;
        if (this.has('youtube')) leadChance += 0.05;
        leadChance = Math.min(leadChance, 0.45);
        if (G.chance(leadChance)) {
          const l = this.spawnLead(G.chance(0.5) ? 'facebook' : null);
          if (l) lines.push('+ NEW LEAD: ' + l.name + ' saw the video!');
          else lines.push('Someone DMed about the video... but your pipeline is FULL.');
        }
        if (score >= 0.9 && G.chance(0.5)) {
          const extra = Math.round(600 * this.followerGainMult());
          s.stats.followers += extra;
          lines.push('IT\'S TRENDING LOCALLY! +' + extra + ' bonus followers!');
        }
        if (s.stats.followers >= 5000) G.Profile.award('butterfly');
        if (G.Roster) G.Roster.evaluate(s);
        break;
      }

      case 'listing': {
        const sellers = this.leadsInStage('appt').filter(l => l.seller);
        const l = this.bestLead(sellers);
        this.touch(l);
        const bonus = ch.listingBonus + (this.has('drone') ? 0.15 : 0);
        if (score + bonus >= 0.5) {
          this.advance(l, 'active');
          if (ch.id === 'bridger') this.priceRight(l, lines);
          if (ch.valueBonus) l.value = Math.round(l.value * (1 + ch.valueBonus));
          if (this.has('drone')) l.value = Math.round(l.value * 1.1);
          if (this.has('staging')) l.value = Math.round(l.value * 1.05);
          if (this.has('luxOffice')) l.value = Math.round(l.value * 1.05);
          lines.push(grade(G.clamp(score + bonus, 0, 1)) + ' LISTING TAKEN!');
          lines.push(l.name + ' listed at ' + G.money(l.value) + '.');
          lines.push('They loved the ' + G.choice(['drone footage', 'comp analysis', 'firm handshake', 'laminated flyers']) + '.');
        } else {
          l.warmth = G.clamp(l.warmth - 10, 0, 100);
          lines.push('ROUGH... ' + l.name + ' said they "wanna think about it."');
          lines.push('(Try again - they\'re still at appointment stage.)');
        }
        break;
      }

      case 'show': {
        let buyers = this.leadsInStage('active', 'appt').filter(l => !l.seller);
        buyers.sort((a, b) => (a.stage === 'active' ? -1 : 1) - (b.stage === 'active' ? -1 : 1));
        const howMany = (this.has('assistant') || ch.id === 'jordan') ? 2 : 1;
        const picked = buyers.slice(0, howMany);
        const signAt = ch.id === 'jordan' ? 0.22 : 0.35;
        const offerAt = ch.id === 'jordan' ? 0.4 : 0.55;
        if (s.effects.showPenalty) { s.effects.showPenalty = false; lines.push('(The lockbox finally opened. Your mitten will never be the same.)'); }
        lines.push(grade(score) + (ch.id === 'jordan' ? ' Jordan knows this buyer already.' : ' Tour day!'));
        for (const l of picked) {
          this.touch(l);
          if (l.stage === 'appt') {
            if (score >= signAt) {
              this.advance(l, 'active');
              lines.push(l.name + ' is now YOUR buyer client!');
            } else {
              lines.push(l.name + ' "didn\'t vibe with the carpet." Still at appt.');
            }
          } else if (score >= offerAt) {
            this.advance(l, 'offer');
            s.stats.offersWritten = (s.stats.offersWritten || 0) + 1;
            lines.push(l.name + ' FOUND THE ONE! (' + G.choice([
              'It was the hot tub.', 'The garage fits the boat AND the wheeler.',
              'A bald eagle flew by during the tour. Done deal.', 'Granite. Countertops.',
            ]) + ')');
          } else {
            l.warmth = G.clamp(l.warmth + 5, 0, 100);
            lines.push(l.name + ' wants to see "just a few more."');
          }
        }
        break;
      }

      case 'offer': {
        G.Profile.bump('offers');
        let ready = this.offerReadyLeads();
        if (ch.id === 'jordan') {
          const buyersOnly = ready.filter(l => !l.seller);
          if (buyersOnly.length) ready = buyersOnly;
        }
        ready = ready.slice().sort((a, b) => b.value - a.value);
        const count = ch.id === 'jordan' ? Math.min(2, ready.length) : 1;
        const picked = ready.slice(0, count);
        if (ch.id === 'jordan') lines.push('Jordan already had the offer language ready.');
        for (const l of picked) {
          this.touch(l);
          this.advance(l, 'offer');
          s.stats.offersWritten = (s.stats.offersWritten || 0) + 1;
          lines.push(G.choice(G.Data.FLAVOR.offer));
          lines.push(l.name + ' (' + G.money(l.value) + ') is now UNDER OFFER.');
        }
        break;
      }

      case 'negotiate': {
        const offers = this.leadsInStage('offer');
        const l = this.bestLead(offers);
        this.touch(l);
        let power = G.clamp(score + ch.negotiateBonus, 0, 1);
        if (s.effects.preapproved) {
          power = 1;
          lines.push('JOEL\'S PRE-APPROVAL DID THE TALKING. No contingencies. No mercy.');
          s.effects.preapproved = false;
        }
        if (power >= 0.45) {
          this.advance(l, 'pending');
          s.stats.negotiationsWon = (s.stats.negotiationsWon || 0) + 1;
          if (ch.id === 'jillian') lines.push('Jillian did not blink. They did. Everybody shook on it.');
          if (power >= 0.8) {
            l.value = Math.round(l.value * 1.05);
            lines.push('MASTERCLASS. Deal agreed ABOVE asking: ' + G.money(l.value) + '!');
          } else {
            lines.push('Deal agreed! ' + l.name + ' at ' + G.money(l.value) + ' is PENDING.');
          }
          const issueChance = l.overpriced ? 0.5 : 0.3;
          if (G.chance(issueChance) && !(this.has('tc') && G.chance(0.5))) {
            l.issue = true;
            lines.push('...but the inspection flagged ' + G.choice([
              'a mystery switch that does nothing', 'squirrels with a lease',
              'a roof "older than disco"', '"moisture concerns" (it\'s Minnesota)',
            ]) + '. Fix it before closing!');
          }
        } else {
          l.warmth = G.clamp(l.warmth - 5, 0, 100);
          lines.push('The other side didn\'t budge. Deal still at OFFER stage.');
          lines.push(G.choice(['They countered with "no."', 'Their agent quoted a podcast.', 'They want the fish house excluded. Bold.']));
        }
        break;
      }

      case 'inspect': {
        G.Profile.bump('inspections');
        const issues = this.leadsInStage('pending').filter(l => l.issue);
        const l = this.bestLead(issues);
        this.touch(l);
        if (score >= 0.4) {
          l.issue = false;
          s.stats.inspectionsCleared = (s.stats.inspectionsCleared || 0) + 1;
          G.Profile.bump('inspectionsCleared');
          lines.push(grade(score) + ' Issues fixed on ' + l.name + '\'s deal!');
          lines.push('The inspector nodded approvingly. High praise.');
        } else {
          lines.push('The repair guy "can maybe swing by Thursday." Issue remains.');
        }
        break;
      }

      case 'close': {
        const list = this.closableLeads();
        const howMany = this.has('tc') ? 2 : 1;
        const toClose = list.slice(0, howMany);
        for (const l of toClose) {
          this.closeLead(l, lines);
          sold++;
        }
        lines.unshift(G.choice(G.Data.FLAVOR.close));
        break;
      }

      case 'commercial': {
        // Jeff's Commercial Takeover deal - negotiate minigame result.
        // Commercial money is great, but it does NOT count as homes sold.
        const J = G.Data.JEFF;
        s.mentorUsedToday = true;
        const power = G.clamp(score + ch.negotiateBonus, 0, 1);
        if (power >= 0.75) {
          const value = G.randInt(750000, 3000000);
          const comm = Math.round(value * 0.005 * (this.has('commercialdiv') ? 1.1 : 1));
          s.cash += comm;
          s.stats.commission += comm;
          s.stats.commercialDeals++;
          s.dayVolume += value;
          lines.push('COMMERCIAL TAKEOVER! ' + G.choice(J.dealLines));
          lines.push('DEAL CLOSED: ' + G.money(value) + ' (+' + G.money(comm) + ' commission!)');
          lines.push('JEFF: "Told you. Cap rates don\'t lie."');
          lines.push('(Commercial deals boost cash & score - not your homes-sold race.)');
          this.addReputation(5);
          s.jeffCooldown = 6;
          if (s.dayVolume >= 1000000) G.Profile.award('monday');
        } else {
          lines.push('The deal collapsed in due diligence. Jeff shrugged: "Happens. Phase 2 environmental."');
          lines.push('(Come back in a few days - he always finds another deal.)');
          s.jeffCooldown = 3;
        }
        break;
      }
    }

    const good = score == null || score >= 0.45;
    if (good) s.dayMarks = (s.dayMarks || 0) + 1;
    if (G.Roster) G.Roster.evaluate(s);
    return { lines, sold };
  },

  // ----------------------------------------------------------
  // Legendary power-ups: Joel & Jeff Nobleza
  // ----------------------------------------------------------
  // One major mentor benefit per day - visiting a second mentor gets a rain check
  mentorBusy() {
    if (!this.s.mentorUsedToday) return null;
    return { lines: ['You already leaned on a mentor today.', G.choice([
      '"Spread the wisdom out. Sleep on it." they say.',
      'Two mentors in one day is how you end up with a podcast.',
      'Their assistant offers you a granola bar and a smile.',
    ]), '(One mentor power-up per day - come back tomorrow.)'], used: true };
  },

  visitJoel() {
    const s = this.s;
    if (s.joelUsed) return { lines: ['Joel is out closing loans. Back tomorrow. His voicemail is just air horns.'], used: true };
    const busy = this.mentorBusy();
    if (busy) return busy;
    s.joelUsed = true;
    s.mentorUsedToday = true;
    const B = G.Data.JOEL;
    const lines = [B.name + ' - ' + B.title];
    lines.push(...B.intro);
    lines.push(G.choice(B.lines));

    let sold = 0;
    if (G.chance(B.rareChance) && this.leadsInStage('pending').length) {
      // RARE: Weekend Underwriting - every pending deal closes NOW
      lines.push('', B.rareLine);
      for (const l of this.leadsInStage('pending').slice()) {
        l.issue = false; l.delay = 0; l.daysInStage = 1;
        this.closeLead(l, lines);
        sold++;
      }
    } else {
      // CLEAR TO CLOSE
      s.effects.preapproved = true;
      let cleared = 0;
      for (const l of this.leadsInStage('pending')) {
        if (l.delay > 0) { l.delay = 0; cleared++; }
      }
      for (const l of this.leadsInStage('new', 'hot')) {
        if (!l.seller) l.warmth = G.clamp(l.warmth + 10, 0, 100);
      }
      lines.push('', 'CLEAR TO CLOSE: buyers pre-approved, financing contingencies expired' + (cleared ? ' (' + cleared + ' deal(s) unstuck)' : '') + '.');
      lines.push('Your next negotiation is UNLOSABLE. Inspections look easier too.');
    }
    this.addReputation(10);
    lines.push('+10 REPUTATION. Lenders love you. Title companies love you. Everyone loves you.');
    return { lines, sold };
  },

  visitJeff() {
    const s = this.s;
    const J = G.Data.JEFF;
    if (!s.commercialUnlocked) {
      const busy = this.mentorBusy();
      if (busy) return busy;
      s.commercialUnlocked = true;
      s.mentorUsedToday = true;
      // one cold commercial opportunity - it still needs nurturing
      const l1 = this.spawnLead('ex1031', { force: true });
      l1.warmth = 25;
      const lines = [J.name + ' - ' + J.title, ...J.intro, '', ...J.unlockLines,
        '', '+ COLD OPPORTUNITY: ' + l1.name + ' might need a 1031 Exchange. Warm them up!'];
      return { unlock: true, lines };
    }
    if (s.jeffCooldown > 0) {
      return { lines: ['JEFF: "Nothing on the desk today. Check back in ' + s.jeffCooldown + ' day(s)."', 'He is studying a blueprint upside down. It still makes him money.'], used: true };
    }
    const busy = this.mentorBusy();
    if (busy) return busy;
    if (s.energy < this.actionCost('commercial')) {
      return { lines: ['JEFF: "This deal needs your FULL attention. Come back with 2 energy."'], used: true };
    }
    // offer the takeover deal (launches negotiate minigame)
    return { deal: true, lines: [G.choice(J.dealLines)] };
  },

  // ----------------------------------------------------------
  // Daily celebrations and the once-a-day ability.
  // Abilities are data (characters.js effect ids).
  // ----------------------------------------------------------
  celebrate(id, title, textLines) {
    const s = this.s;
    s.milestones = s.milestones || {};
    if (s.milestones[id]) return false;
    s.milestones[id] = true;
    s.pendingCelebrations = s.pendingCelebrations || [];
    s.pendingCelebrations.push({ title, lines: textLines });
    return true;
  },

  pullCelebrations() {
    const c = (this.s && this.s.pendingCelebrations) || [];
    if (this.s) this.s.pendingCelebrations = [];
    return c;
  },

  coachTip() {
    if (this.actionAvailable('close').ok) return 'A deal can close today.';
    if (this.actionAvailable('inspect').ok) return 'An inspection is waiting on you.';
    if (this.actionAvailable('negotiate').ok) return 'An offer wants a yes.';
    if (this.actionAvailable('offer').ok) return 'A client is ready for an offer.';
    if (this.leadsInStage('attendee').length) return 'Open house guests need a follow-up.';
    if (this.actionAvailable('listing').ok) return 'A seller appointment is on the books.';
    if (this.actionAvailable('show').ok) return 'A buyer is ready to tour.';
    const cooling = this.s.leads.filter(l => this.leadRisk(l) !== 'SAFE').length;
    if (cooling) return cooling + ' leads are cooling. Follow up.';
    return 'Prospect, then move the warm ones.';
  },

  useAbility() {
    const s = this.s;
    if (s.abilityUsed) return null;
    const ch = this.char();
    const effect = (ch.ability && ch.ability.effect) || 'advance';
    s.abilityUsed = true;
    const lines = [];

    const advanceBest = () => {
      const pick =
        this.bestLead(this.leadsInStage('pending').filter(l => l.issue)) ||
        this.bestLead(this.leadsInStage('offer')) ||
        this.bestLead(this.offerReadyLeads()) ||
        this.bestLead(this.leadsInStage('appt')) ||
        this.bestLead(this.leadsInStage('hot')) ||
        this.bestLead(this.leadsInStage('new'));
      if (!pick) return null;
      if (pick.stage === 'pending' && pick.issue) { pick.issue = false; return pick.name + ' inspection issue: cleared.'; }
      const next = { new: 'hot', hot: 'appt', appt: 'active', active: 'offer', offer: 'pending' }[pick.stage];
      if (!next) return null;
      this.advance(pick, next);
      return pick.name + ' moves to ' + G.Data.STAGE_LABELS[next] + '.';
    };

    lines.push(ch.ability.name + '!');
    switch (effect) {
      case 'priceisright': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const listing = this.leadsInStage('active').filter(l => l.seller)
          .sort((a, b) => ((b.overpriced ? 1 : 0) - (a.overpriced ? 1 : 0)) || ((a.listingMomentum || 50) - (b.listingMomentum || 50)))[0];
        if (listing) {
          this.priceRight(listing, lines);
          lines.push(listing.name + ' is priced for the buyers who are actually out there.');
          break;
        }
        lines.push('No listing to reprice yet. The next pricing call still runs through Bridger.');
        break;
      }
      case 'recruit': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const desk = (G.Roster && G.Roster.office) || [];
        const hire = desk.length ? G.choice(desk) : null;
        s.teamRecruits = (s.teamRecruits || 0) + 1;
        const zip = Math.min(4, s.teamRecruits);
        for (const l of s.leads) l.warmth = G.clamp(l.warmth + 3 + zip, 0, 100);
        if (hire) lines.push(hire.short + ' JOINS THE DESK. The whole team just got a lift.');
        lines.push('TEAM SIZE ' + (1 + s.teamRecruits) + '. Every lead felt the extra hands.');
        if (G.chance(0.55)) {
          const extra = this.spawnLead();
          if (extra) lines.push('+ LEAD: ' + extra.name + ' came in because the office showed up.');
        }
        break;
      }
      case 'viral': {
        const gain = Math.round(G.randInt(280, 760) * this.followerGainMult());
        s.stats.followers += gain;
        lines.push('"' + G.choice([
          'AGENT RATES EVERY LAKE, PART 7', 'I SLEPT IN AN ICE HOUSE FOR A LISTING',
          'THE LOON CALL CHALLENGE', 'SELLING A HOUSE IN A COLD SNAP',
        ]) + '"');
        lines.push('+' + gain + ' FOLLOWERS.');
        const n = ch.id === 'jillian' ? 1 : G.randInt(1, 2);
        for (let i = 0; i < n; i++) {
          const l = this.spawnLead(G.chance(0.4) ? 'lakehome' : 'facebook');
          if (l) lines.push('+ LEAD: ' + l.name + ' saw it and called.');
          else lines.push('More viewers wanted in, but the pipeline is full.');
        }
        if (s.stats.followers >= 5000) G.Profile.award('butterfly');
        break;
      }
      case 'warmAll': {
        let leads = s.leads.filter(l => ['AT RISK', 'ABOUT TO GHOST', 'DUE TODAY'].includes(this.leadRisk(l)));
        if (!leads.length) leads = this.leadsInStage('new', 'hot', 'attendee');
        for (const l of leads) { this.touch(l); l.warmth = G.clamp(l.warmth + 14, 0, 100); }
        lines.push(leads.length ? ('Checked in with ' + leads.length + ' people.') : 'The list was quiet. You still made the calls.');
        break;
      }
      case 'owner': {
        const r = advanceBest();
        lines.push(r || 'The line was open. Nobody needed a push yet.');
        const ref = this.spawnLead('referral');
        if (ref) { ref.warmth = 75; s.stats.referrals++; G.Profile.bump('referrals'); lines.push('+ REFERRAL: ' + ref.name + ' heard the owner was on it.'); }
        this.addReputation(4);
        break;
      }
      case 'ideas': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const side = G.randInt(1200, 2800);
        s.cash += side;
        s.stats.commission += side;
        lines.push('SIDE HUSTLE PAID: +' + G.money(side) + '. Bekkah says that one was obvious.');
        const biz = this.spawnLead(G.chance(0.5) ? 'investor' : 'facebook');
        if (biz) lines.push('+ LEAD: ' + biz.name + ' wants in on the idea. And a house.');
        else lines.push('A future business partner called. Your pipeline is full, so she took a note.');
        break;
      }
      case 'buyerday': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const buyer =
          this.bestLead(this.leadsInStage('active').filter(l => !l.seller)) ||
          this.bestLead(this.leadsInStage('appt').filter(l => !l.seller)) ||
          this.bestLead(this.leadsInStage('hot').filter(l => !l.seller));
        if (!buyer) {
          lines.push(advanceBest() || 'No buyer on the hook yet. Jordan is already previewing three houses.');
          break;
        }
        this.touch(buyer);
        if (buyer.stage === 'active') {
          this.advance(buyer, 'offer');
          s.stats.offersWritten = (s.stats.offersWritten || 0) + 1;
          lines.push(buyer.name + ' is UNDER OFFER. Written before lunch.');
        } else if (buyer.stage === 'appt' || buyer.stage === 'hot' || buyer.stage === 'new') {
          const next = { new: 'hot', hot: 'appt', appt: 'active' }[buyer.stage];
          this.advance(buyer, next);
          lines.push(buyer.name + ' moves to ' + G.Data.STAGE_LABELS[next] + '. That buyer is in good hands.');
        } else {
          lines.push(advanceBest() || 'The buy side is quiet. Jordan is fine with that for one hour.');
        }
        break;
      }
      case 'welcome': {
        let made = 0;
        for (let i = 0; i < 2; i++) {
          const l = this.spawnLead('openhouse', { stage: 'attendee' });
          if (l) { l.warmth = G.randInt(30, 50); made++; lines.push('+ GUEST: ' + l.name + ' signed in early.'); }
        }
        if (!made) lines.push('The cookies were ready. The pipeline was not. It is full.');
        break;
      }
      case 'referral': {
        for (let i = 0; i < 2; i++) {
          const l = this.spawnLead('referral');
          if (l) { l.warmth = 72; s.stats.referrals++; G.Profile.bump('referrals'); lines.push('+ REFERRAL: ' + l.name + '.'); }
          else lines.push('Someone wanted to refer a friend. Your plate is full.');
        }
        break;
      }
      case 'clearIssue': {
        if (ch.id === 'deb' && ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const issue = this.leadsInStage('pending').find(l => l.issue);
        if (issue) { issue.issue = false; lines.push(issue.name + ' inspection worry: talked down.'); }
        else lines.push(advanceBest() || 'Everyone is steady. That counts.');
        s.stats.happiness = G.clamp(s.stats.happiness + 3, 0, 100);
        break;
      }
      case 'spark': {
        s.energy = Math.min(this.maxEnergy(), s.energy + 1);
        lines.push('+1 ENERGY.');
        lines.push(advanceBest() || 'Energy banked. The pipeline will catch up.');
        break;
      }
      case 'price': {
        const listing = this.leadsInStage('active').filter(l => l.seller).sort((a, b) => b.value - a.value)[0];
        if (listing) {
          listing.value = Math.round(listing.value * 1.08);
          listing.listingMomentum = G.clamp((listing.listingMomentum || 50) + 20, 0, 100);
          lines.push(listing.name + ' repriced with care: ' + G.money(listing.value) + '.');
        } else lines.push(advanceBest() || 'No listing to reprice yet. The comps are ready.');
        break;
      }
      case 'dawn': {
        const leads = this.leadsInStage('new', 'hot');
        for (const l of leads) { this.touch(l); l.warmth = G.clamp(l.warmth + 14, 0, 100); }
        lines.push(leads.length ? ('Morning calls warmed ' + leads.length + ' leads.') : 'Nobody on the morning list. Coffee still counts.');
        break;
      }
      case 'lake': {
        const lakes = s.leads.filter(l => l.lake);
        for (const l of lakes) l.warmth = G.clamp(l.warmth + 10, 0, 100);
        const newbie = this.spawnLead('cabin');
        if (newbie) lines.push('+ CABIN BUYER: ' + newbie.name + '.');
        else lines.push('A cabin buyer called. The pipeline is full.');
        if (lakes.length) lines.push(lakes.length + ' lake leads warmed up.');
        break;
      }
      case 'bigfork': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const woods = s.leads.filter(l => l.lake || l.outdoors);
        for (const l of woods) { this.touch(l); l.warmth = G.clamp(l.warmth + 12, 0, 100); }
        const newbie = this.spawnLead(G.chance(0.5) ? 'hunting' : 'fishcabin');
        if (newbie) lines.push('+ FROM THE WOODS: ' + newbie.name + ' (' + newbie.label + ').');
        else lines.push('A camp buyer called. The pipeline is full, so they left a note on the truck.');
        if (woods.length) lines.push(woods.length + ' woods leads warmed up. The truck did not mind the weather.');
        s.stats.happiness = G.clamp(s.stats.happiness + 4, 0, 100);
        break;
      }
      case 'standoff': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const offer = this.bestLead(this.leadsInStage('offer'));
        if (offer) {
          this.touch(offer);
          this.advance(offer, 'pending');
          s.stats.negotiationsWon = (s.stats.negotiationsWon || 0) + 1;
          lines.push(offer.name + ' is PENDING. She smiled the whole time.');
        } else {
          const moved = advanceBest();
          lines.push(moved || 'Nobody at the table yet. She is shadowboxing the listing binder.');
        }
        break;
      }
      case 'prayerchain': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        s.stats.happiness = G.clamp(s.stats.happiness + Math.round(8 * (ch.happyMult || 1)), 0, 100);
        let made = 0;
        for (let i = 0; i < 2; i++) {
          const ref = this.spawnLead('referral');
          if (ref) {
            ref.warmth = 78;
            s.stats.referrals++;
            G.Profile.bump('referrals');
            made++;
            lines.push('+ REFERRAL: ' + ref.name + '. The church family thought of them.');
          }
        }
        if (!made) lines.push('The chain had more names. Your plate is full, so she saved them a plate anyway.');
        for (const l of this.leadsInStage('new', 'hot', 'attendee')) l.warmth = G.clamp(l.warmth + 6, 0, 100);
        break;
      }
      case 'file': {
        const stuck = this.leadsInStage('pending').find(l => l.issue || l.delay > 0) || this.leadsInStage('pending')[0];
        if (stuck) {
          stuck.issue = false; stuck.delay = 0;
          if (stuck.daysInStage < 1) stuck.daysInStage = 1;
          lines.push(stuck.name + ' file is clean. Ready when the calendar is.');
        } else lines.push(advanceBest() || 'No file to tidy. The desk is clear.');
        break;
      }
      case 'pep': {
        const bump = Math.round(12 * (ch.happyMult || 1));
        s.stats.happiness = G.clamp(s.stats.happiness + bump, 0, 100);
        for (const l of s.leads) l.warmth = G.clamp(l.warmth + 4, 0, 100);
        lines.push('+' + bump + ' HAPPINESS. The whole pipeline felt that.');
        break;
      }
      case 'broccoli': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        s.broccoliDays = Math.max(s.broccoliDays || 0, 2);
        lines.push(advanceBest() || 'The boost is planted. The earring is on duty.');
        lines.push('BROCCOLI BOOST for 2 days. The earring keeps score.');
        break;
      }
      case 'miracle': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const sick = this.leadsInStage('pending').find(l => l.issue || l.delay > 0);
        if (sick) {
          sick.issue = false;
          sick.delay = 0;
          s.stats.dealsRescued = (s.stats.dealsRescued || 0) + 1;
          lines.push(sick.name + ' is back on track. The beard took the meeting.');
          break;
        }
        const fading = s.leads.filter(l => {
          const risk = this.leadRisk(l);
          return risk === 'ABOUT TO GHOST' || risk === 'AT RISK';
        })[0];
        if (fading) {
          this.touch(fading);
          fading.warmth = G.clamp(fading.warmth + 25, 0, 100);
          s.stats.dealsRescued = (s.stats.dealsRescued || 0) + 1;
          lines.push(fading.name + ' picked up. Trust came back with the beard.');
          break;
        }
        lines.push(advanceBest() || 'Every deal is healthy. The beard is resting, kindly.');
        break;
      }
      case 'zillow': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const online = s.leads.filter(l => l.online && (l.stage === 'new' || l.stage === 'hot')).slice(0, 2);
        if (!online.length) {
          const l = this.spawnLead('zestimate');
          if (l) {
            l.online = true;
            this.advance(l, 'appt');
            s.stats.zillowFlips = (s.stats.zillowFlips || 0) + 1;
            lines.push(l.name + ' came off Zillow and already has an appointment.');
          } else lines.push('The inbox pinged. The pipeline is full.');
          break;
        }
        for (const l of online) {
          this.touch(l);
          this.advance(l, 'appt');
          s.stats.zillowFlips = (s.stats.zillowFlips || 0) + 1;
          lines.push(l.name + ' flipped from online to an appointment.');
        }
        break;
      }
      case 'nurse': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const bump = Math.round(10 * (ch.happyMult || 1));
        s.stats.happiness = G.clamp(s.stats.happiness + bump, 0, 100);
        const hurting = s.leads.filter(l => this.leadRisk(l) !== 'SAFE');
        for (const l of hurting) { this.touch(l); l.warmth = G.clamp(l.warmth + 16, 0, 100); }
        lines.push('+' + bump + ' MORALE. ' + (hurting.length ? hurting.length + ' clients felt looked after.' : 'The office exhaled.'));
        break;
      }
      case 'know': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        lines.push(G.choice([
          'Market fact: sunset-side frontage still sells the lake.',
          'Market fact: fishing opener week is when the north fills up.',
          'Market fact: a legal dock is worth more than a new couch.',
        ]));
        const lead = this.bestLead(s.leads);
        if (lead) {
          const motive = lead.seller
            ? 'They want a clean exit and to feel respected.'
            : (lead.lake ? 'They want the dock more than the kitchen.' : 'They want to feel sure before they sign.');
          lines.push(lead.name + ' (' + lead.warmth + ' warmth): ' + motive);
          const next = { new: 'hot', hot: 'appt', appt: 'active', active: 'offer', offer: 'pending' }[lead.stage];
          if (next) {
            this.advance(lead, next);
            lines.push('Moved to ' + G.Data.STAGE_LABELS[next] + '. Adam had already guessed.');
          }
        } else lines.push('No file to read yet. He is reciting lake facts anyway.');
        break;
      }
      case 'sellany': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const sellers = this.leadsInStage('active').filter(l => l.seller);
        const tough = sellers.slice().sort((a, b) => ((b.overpriced ? 1 : 0) - (a.overpriced ? 1 : 0)) || ((a.listingMomentum || 50) - (b.listingMomentum || 50)))[0];
        if (tough) {
          const wasTough = !!tough.overpriced || (tough.listingMomentum || 50) < 40;
          tough.overpriced = false;
          tough.listingMomentum = 85;
          this.advance(tough, 'offer');
          if (wasTough) s.stats.toughOffers = (s.stats.toughOffers || 0) + 1;
          lines.push(tough.name + ' has an offer. Even the tough ones move.');
          break;
        }
        const appt = this.leadsInStage('appt').find(l => l.seller);
        if (appt) {
          this.advance(appt, 'active');
          lines.push('LISTING TAKEN: ' + appt.name + '. She can sell this one too.');
          break;
        }
        lines.push(advanceBest() || 'No listing on the hook. She is already picturing the sign.');
        break;
      }
      case 'range': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        const l = this.spawnLead(G.chance(0.5) ? 'signcall' : 'facebook');
        if (l) {
          this.tagRange(l);
          l.warmth = Math.max(l.warmth, 72);
          lines.push('+ ' + l.town + ': ' + l.name + ' is ready to talk.');
        } else lines.push('A Range buyer called. The pipeline is full, so she named a diner and a time.');
        for (const r of s.leads.filter(x => x.range)) r.warmth = G.clamp(r.warmth + 8, 0, 100);
        break;
      }
      case 'ceo': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        for (const l of s.leads) l.warmth = G.clamp(l.warmth + 8, 0, 100);
        const big = this.spawnLead(G.chance(0.5) ? 'luxury' : 'lakehome');
        if (big) {
          big.value = Math.round(big.value * 1.25);
          big.warmth = Math.max(big.warmth, 70);
          lines.push('+ BIGGER DEAL: ' + big.name + ' at ' + G.money(big.value) + '.');
        } else lines.push('A bigger deal called. The pipeline is full, so he took the name himself.');
        const stipend = 2500;
        s.cash += stipend;
        s.stats.commission += stipend;
        this.addReputation(5);
        lines.push('THE COMPANY BACKS YOU: +' + G.money(stipend) + '. The whole book warmed up.');
        lines.push(advanceBest() || 'Nothing to push. The lift is still on the team.');
        break;
      }
      case 'happen': {
        if (ch.ability.lines) lines.push(G.choice(ch.ability.lines));
        let cleared = 0;
        for (const l of this.leadsInStage('pending')) {
          if (l.issue || l.delay > 0) {
            l.issue = false;
            l.delay = 0;
            cleared++;
          }
          if (l.daysInStage < 2) l.daysInStage = 2;
        }
        if (cleared) lines.push(cleared + ' blocker' + (cleared === 1 ? '' : 's') + ' cleared. Those files can close.');
        const stalled = s.leads.filter(l => this.leadRisk(l) === 'ABOUT TO GHOST' || this.leadRisk(l) === 'AT RISK')[0];
        if (stalled) {
          this.touch(stalled);
          stalled.warmth = G.clamp(stalled.warmth + 20, 0, 100);
          lines.push(stalled.name + ' was stalled. Liz unstalled them.');
        }
        lines.push(advanceBest() || 'The desk is clear. She already moved on to the next thing.');
        break;
      }
      case 'advance': {
        lines.push(advanceBest() || 'Nothing to move yet. The offer template is ready.');
        break;
      }
      default: {
        lines.push(advanceBest() || 'Saved for the right moment.');
        break;
      }
    }
    if (ch.catchphrase) lines.push('"' + ch.catchphrase + '"');
    s.dayMarks = (s.dayMarks || 0) + 1;
    if (G.Roster) G.Roster.evaluate(s);
    G.Audio.ability();
    return { lines };
  },

  // ----------------------------------------------------------
  // Upgrades / offices / toys (all use s.upgrades)
  // ----------------------------------------------------------
  allShopItems() { return [...G.Data.UPGRADES, ...G.Data.OFFICES, ...G.Data.TOYS]; },

  officeIndex() {
    let idx = -1;
    G.Data.OFFICES.forEach((o, i) => { if (this.has(o.id)) idx = Math.max(idx, i); });
    return idx;
  },

  buyUpgrade(id) {
    const up = this.allShopItems().find(u => u.id === id);
    if (!up || this.has(id) || this.s.cash < up.cost) return false;
    // offices must be bought in order
    const oi = G.Data.OFFICES.findIndex(o => o.id === id);
    if (oi > 0 && !this.has(G.Data.OFFICES[oi - 1].id)) return false;
    this.s.cash -= up.cost;
    this.s.upgrades[id] = true;
    if (id === 'ai' || id === 'corporateHQ') this.s.energy = Math.min(this.s.energy + 1, this.maxEnergy());
    if (id === 'luxOffice') this.addReputation(10);
    if (id === 'retreat') this.s.stats.happiness = G.clamp(this.s.stats.happiness + 5, 0, 100);
    this.pushLog('Bought ' + up.name + '!');
    return true;
  },

  // ----------------------------------------------------------
  // End of day
  // ----------------------------------------------------------
  endDay() {
    const s = this.s;
    if (s._ending) {
      return { eventText: null, eventGood: false, rivalLines: [], passiveLines: [], bossTime: !!s.pendingBoss, battleTime: !!s.pendingBattle, report: s.followReport, celebrations: [] };
    }
    s._ending = true;
    s._calendarMoved = false;
    const bal = this.bal();
    const today = this.totalDay();
    const passiveLines = [];
    const report = { contacted: 0, due: 0, atRisk: 0, lost: [] };
    s.dayVolume = 0;
    s.bigfootToday = G.chance(0.06);
    if (s.effects.detour > 0) s.effects.detour--;

    const chNow = this.char();
    // 1. FOLLOW-UP DECAY: untouched leads cool, then ghost.
    // CRM softens decay. Some agents simply lose fewer people.
    const decayMult = (this.has('crm') ? 0.6 : 1) * (chNow.decayMult || 1);
    const ghostMult = (this.has('crm') ? 0.5 : 1) * (chNow.ghostMult || 1);
    const lose = (l, why) => { this.removeLead(l); report.lost.push(l.name + ' (' + G.Data.STAGE_LABELS[l.stage] + '): ' + why); };
    for (const l of s.leads.slice()) {
      l.daysInStage++;
      if (l.delay > 0) l.delay--;
      const touched = (l.lastContactDay ?? 0) >= today;
      if (touched) { report.contacted++; l.daysSinceContact = 0; continue; }
      l.daysSinceContact = (l.daysSinceContact || 0) + 1;
      const d = l.daysSinceContact;
      switch (l.stage) {
        case 'attendee': {
          l.followUpDeadline = (l.followUpDeadline ?? 1) - 1;
          if (l.followUpDeadline < 0) lose(l, G.choice(G.Data.FLAVOR.lostReasons));
          break;
        }
        case 'new': {
          l.warmth = G.clamp(l.warmth - Math.round((d === 1 ? bal.decayNew[0] : bal.decayNew[1]) * decayMult), 0, 100);
          if (d >= 4 && G.chance(bal.ghostNew4 * ghostMult)) lose(l, G.choice(G.Data.FLAVOR.lostReasons));
          else if (d === 3 && G.chance(bal.ghostNew3 * ghostMult)) lose(l, G.choice(G.Data.FLAVOR.lostReasons));
          break;
        }
        case 'hot': {
          l.warmth = G.clamp(l.warmth - Math.round((d === 1 ? bal.decayWarm[0] : bal.decayWarm[1]) * decayMult), 0, 100);
          if (d >= 3 && G.chance(bal.ghostWarm3 * ghostMult)) { lose(l, G.choice(G.Data.FLAVOR.lostReasons)); break; }
          if (l.warmth < bal.warmThreshold - 10) {
            l.stage = 'new';
            passiveLines.push(l.name + ' cooled back to NEW. "We kind of forgot we were moving?"');
          }
          break;
        }
        case 'appt': {
          if (d >= 2 && G.chance(bal.apptStealChance)) {
            s.rivalry++;
            lose(l, 'A competing agent responded in eleven seconds.');
          } else if (d >= 1 && G.chance(bal.apptDropChance)) {
            l.stage = 'hot';
            l.warmth = G.clamp(l.warmth - 8, 0, 100);
            passiveLines.push(l.name + '\'s appointment fell through - nobody confirmed. Back to WARM.');
          }
          break;
        }
        case 'active': {
          if (d >= bal.clientNeglectDays) {
            s.stats.happiness = G.clamp(s.stats.happiness - 2, 0, 100);
            if (l.seller) passiveLines.push(l.name + ' (seller) left a voicemail: "Any... updates?" (-happiness)');
            else if (G.chance(0.25)) { l.warmth = G.clamp(l.warmth - 5, 0, 100); passiveLines.push(l.name + ' (buyer) is pausing their search. They feel forgotten.'); }
            if (d >= bal.clientNeglectDays + 2 && G.chance(0.15)) {
              this.addReputation(-3);
              lose(l, 'They fired you by text. The text had a typo. It still hurt.');
            }
          }
          break;
        }
        // offer/pending are committed - they decay via events, not neglect
      }
    }
    if (this.has('smallOffice')) {
      for (const l of this.leadsInStage('new', 'hot', 'appt')) l.warmth = G.clamp(l.warmth + 2, 0, 100);
    }

    // 2. PASSIVE LEAD SOURCES: every source rolls, but only
    // maxPassiveLeadsPerDay actually become leads. The rest convert
    // into small warmth / follower / reputation bumps.
    const hits = [];
    const roll = (id, ch, typeId, msg, isRef) => { if (ch > 0 && G.chance(ch)) hits.push({ id, typeId, msg, isRef }); };
    if (this.has('website')) roll('website', 0.12, 'zestimate', 'WEBSITE LEAD: %N filled out your contact form!');
    if (this.has('seo')) roll('seo', 0.10, 'zestimate', 'SEO LEAD: %N googled "best agent up north" and found YOU.');
    if (this.has('fbads')) roll('fbads', 0.12, 'facebook', 'AD LEAD: %N clicked your Facebook ad!');
    if (this.has('marketing')) roll('marketing', 0.15, null, 'AD LEAD: %N saw your billboard by the DQ!');
    if (this.has('marketingdir')) roll('mdir', 0.20, null, 'YOUR MARKETING DIRECTOR delivered: %N (%T)!');
    if (this.has('downtownOffice')) roll('walkin', 0.10, null, 'WALK-IN: %N wandered into the office. Free lead!');
    if (s.commercialUnlocked) roll('jeff', G.Data.JEFF.passiveChance, 'ex1031', 'JEFF\'S NETWORK: %N called about a 1031 Exchange!');
    const organicChance = Math.min(0.18, 0.08 + s.stats.followers / 40000 + Math.max(0, s.marketVisibility - 40) / 800);
    roll('organic', organicChance, null, 'NEW LEAD: %N (%T) reached out!');
    if (s.openHouseEngine > 0) roll('ohengine', 0.8, 'openhouse', 'OPEN HOUSE ENGINE: %N signed in overnight.');
    if (this.has('retreat')) roll('retreat', 0.10, 'referral', 'RETREAT MAGIC: %N was referred after a weekend at your cabin!', true);

    const winners = G.shuffle(hits).slice(0, bal.maxPassiveLeadsPerDay);
    for (const src of winners) {
      const l = this.spawnLead(src.typeId);
      if (!l) { passiveLines.push('A lead came in overnight... and got no reply. Your pipeline is FULL.'); continue; }
      if (src.id === 'ohengine') l.warmth = G.randInt(20, 35);
      if (src.isRef) { s.stats.referrals++; G.Profile.bump('referrals'); }
      passiveLines.push(src.msg.replace('%N', l.name).replace('%T', l.label));
    }
    for (const src of hits.slice(bal.maxPassiveLeadsPerDay)) {
      // consolation: buzz instead of a full lead
      const r = Math.random();
      if (r < 0.4) {
        const cold = this.leadsInStage('new', 'hot').sort((a, b) => a.warmth - b.warmth)[0];
        if (cold) cold.warmth = G.clamp(cold.warmth + 3, 0, 100);
        passiveLines.push('Buzz from ' + src.id.toUpperCase() + ': your pipeline warmed a little.');
      } else if (r < 0.7) {
        s.stats.followers += G.randInt(15, 40);
        passiveLines.push('Buzz from ' + src.id.toUpperCase() + ': +followers.');
      } else {
        this.addReputation(1);
        passiveLines.push('Buzz from ' + src.id.toUpperCase() + ': +1 reputation.');
      }
    }
    if (this.has('youtube')) s.stats.followers += 50;
    if (this.has('retreat')) s.stats.happiness = G.clamp(s.stats.happiness + 2, 0, 100);

    // 3. LISTING MOMENTUM: marketed listings attract offers; neglected
    // listings breed unhappy sellers.
    for (const l of this.leadsInStage('active').filter(x => x.seller).slice()) {
      if (l.listingMomentum == null) l.listingMomentum = 50;
      if (l.expectsOpenHouse === undefined) l.expectsOpenHouse = G.chance(0.4);
      l.listingMomentum = G.clamp(l.listingMomentum - 6 + (this.has('photographer') ? 3 : 0), 0, 100);
      const stephanie = this.char().id === 'stephanie';
      if (l.daysInStage >= 1 && (!l.overpriced || stephanie) && G.chance(l.listingMomentum / 250 + (this.has('photographer') ? 0.08 : 0) + (stephanie ? 0.08 : 0))) {
        if (l.overpriced) { l.overpriced = false; s.stats.toughOffers = (s.stats.toughOffers || 0) + 1; }
        this.advance(l, 'offer');
        passiveLines.push('MOMENTUM: an offer came in on ' + l.name + '\'s listing!');
        continue;
      }
      if (l.expectsOpenHouse && l.listingMomentum < 40 && l.daysInStage >= 2) {
        l.listingMomentum = G.clamp(l.listingMomentum - 4, 0, 100);
        passiveLines.push(l.name + ' expected an OPEN HOUSE by now. Their patience thins.');
      }
      if (l.listingMomentum <= 15) {
        const r = Math.random();
        if (r < 0.35) {
          s.stats.happiness = G.clamp(s.stats.happiness - 2, 0, 100);
          passiveLines.push(l.name + ' called: "What exactly are you DOING to sell our house?"');
        } else if (r < 0.5 && !l.overpriced) {
          l.overpriced = true;
          passiveLines.push(l.name + ' now wants "a new pricing strategy." The listing got harder.');
        } else if (r < 0.6 && l.daysInStage >= 4) {
          s.rivalry++;
          this.addReputation(-2);
          lose(l, 'They canceled the listing and called your rival. Devastating.');
        }
      }
    }
    // market visibility fades without public marketing
    s.marketVisibility = G.clamp(s.marketVisibility - 8, 0, 100);

    // 4. rival AI + trash talk scaled by rivalry
    const rivalLines = [];
    const rc = this.rivalChar();
    let closeChance = bal.rivalCloseChances[Math.min(s.month, 2)] + (this.char().rivalPressure || 0);
    // The real rivalry shows up. Malcolm and Bridger chase each other harder than a normal market.
    if ((this.char().id === 'malcolm' && rc.id === 'bridger') || (this.char().id === 'bridger' && rc.id === 'malcolm')) {
      closeChance += 0.10;
    }
    let rivalCloses = G.chance(closeChance) ? 1 : 0;
    if (G.chance(bal.rivalDoubleChance)) rivalCloses++;
    for (let i = 0; i < rivalCloses; i++) {
      const val = G.randInt(150000, s.month === 2 ? 600000 : 420000);
      s.rival.homesSold++;
      s.rival.commission += Math.round(val * 0.027);
      rivalLines.push(rc.name + ' closed a ' + G.money(val) + ' sale' + G.choice([
        '. Ugh.', ' and posted about it. Twice.', '. The nerve.', ' with a SOLD selfie.', '.',
      ]));
    }
    s.rival.followers += G.randInt(20, 120);
    const tier = Math.min(2, Math.floor(s.rivalry / 2));
    const talkPool = (G.Data.TRASH_TALK[rc.id] || G.Data.TRASH_TALK.bridger)[tier];
    if (G.chance(0.35 + tier * 0.15)) {
      rivalLines.push(G.choice(talkPool));
    } else if (!rivalCloses && G.chance(0.5)) {
      rivalLines.push(rc.name + ' ' + G.choice([
        'spent all day arguing in a Facebook group.', 'got a flat tire on the logging road.',
        'is "rebranding." Again.', 'held an open house. One guy came for the cookies.',
        'left a voicemail 4 minutes long.',
      ]));
    }

    // 5. random event: easter eggs are rare and checked first.
    // Regular events are weighted (minor 1.0 / medium 0.6 / major 0.2),
    // only eligible events fire, and the last 5 never repeat.
    let eventText = null, eventGood = null;
    if (G.chance(0.05)) {
      const ev = G.choice(G.Data.EASTER_EGGS);
      const extra = this.applyEventFx(ev.fx);
      if (extra !== false) { eventText = ev.text + (extra ? ' ' + extra : ''); eventGood = true; }
    }
    if (!eventText && G.chance(bal.eventChance)) {
      const negative = G.chance(bal.negativeEventShare);
      const recent = s.eventHistory || (s.eventHistory = []);
      const pickFrom = (pool) => {
        const ok = pool.filter(ev => !recent.includes(ev.id) && this.eventEligible(ev));
        return ok.length ? G.weightedChoice(ok.map(e => ({ ...e, weight: e.w || 1 }))) : null;
      };
      let ev = pickFrom(negative ? G.Data.OBSTACLES : G.Data.FUNNY_EVENTS);
      // if no negative event can bite, fall back to a minor always-on setback
      if (!ev && negative) {
        const minors = G.Data.OBSTACLES.filter(e => (e.w || 1) >= 1 && !recent.includes(e.id) && this.eventEligible(e));
        ev = minors.length ? G.choice(minors) : null;
      }
      if (ev) {
        const extra = this.applyEventFx(ev.fx);
        if (extra !== false) {
          eventText = ev.text + (extra ? ' ' + extra : '');
          eventGood = !negative;
          recent.push(ev.id);
          if (recent.length > 5) recent.shift();
        }
      }
    }

    // 6. head-to-head listing battle trigger (rivalry system)
    if (s.month >= 1 && s.battleDoneMonth !== s.month && !s.pendingBoss &&
        s.dayOfMonth >= 3 && G.chance(0.22 + s.rivalry * 0.05)) {
      s.pendingBattle = true;
      s.battleDoneMonth = s.month;
    }

    // 7. advance calendar
    let bossTime = false;
    s._calendarMoved = true;
    s.dayOfMonth++;
    if (s.dayOfMonth > this.daysInMonth()) {
      bossTime = true;
      s.pendingBoss = true;
      if (s.rival.homesSold > s.stats.homesSold) s.rivalry++;
    }

    // 8. streaks first, so a hot streak can add energy tomorrow
    const marked = s.dayMarks || 0;
    const goal = 2;
    if (marked >= goal) {
      s.streak = (s.streak || 0) + 1;
      if (s.streak > (s.bestStreak || 0)) s.bestStreak = s.streak;
      passiveLines.push('DAILY GOAL MET (' + marked + '/' + goal + '). Streak: ' + s.streak + '.');
      if (s.streak === 3) {
        s.cash += 500; s.stats.commission += 500;
        this.celebrate('streak3', '3-DAY STREAK!', ['The hot dish is working. +$500.']);
      }
      if (s.streak === 5) this.celebrate('streak5', '5-DAY STREAK!', ['You are on a roll. +1 energy while it holds.']);
      if (s.streak === 7) this.celebrate('streak7', 'ONE HOT WEEK!', ['Grand Rapids noticed. Keep the lights on.']);
    } else {
      if ((s.streak || 0) > 0) passiveLines.push('Streak reset. Tomorrow is a fresh start.');
      s.streak = 0;
      passiveLines.push('Daily goal: ' + marked + '/' + goal + ' solid tasks.');
    }
    s.dayMarks = 0;
    // Head to head: Bridger takes the listing if Malcolm overpriced it.
    // Playing Bridger, Malcolm overprices one out in the market and you price it instead.
    if (this.char().id === 'malcolm') {
      const ripe = this.leadsInStage('active').filter(l => l.seller && l.overpriced);
      if (ripe.length && G.chance(0.7)) {
        const lost = ripe[0];
        this.removeLead(lost);
        s.rival.homesSold++;
        s.rivalry++;
        passiveLines.push('BRIDGER priced ' + lost.name + ' right and took the listing. Malcolm had aimed too high.');
      }
    } else if (this.char().id === 'bridger' && G.chance(0.1)) {
      const stolen = this.spawnLead(G.chance(0.5) ? 'expired' : 'fsbo', { stage: 'appt' });
      if (stolen) {
        stolen.seller = true;
        this.priceRight(stolen, null);
        passiveLines.push('MALCOLM overpriced a listing. BRIDGER took it at ' + G.money(stolen.value) + '.');
      }
    }
    if (this.char().id === 'malcolm' && (s.teamRecruits || 0) > 0) {
      const zip = Math.min(3, s.teamRecruits);
      for (const l of s.leads) l.warmth = G.clamp(l.warmth + zip + 1, 0, 100);
      passiveLines.push('THE DESK (' + s.teamRecruits + ' recruit' + (s.teamRecruits === 1 ? '' : 's') + ') worked the book overnight.');
    }
    if (s.broccoliDays > 0) {
      s.broccoliDays--;
      if (s.broccoliDays === 0) passiveLines.push('The broccoli boost settled. The earring is just shiny again.');
    }
    if (G.Roster) G.Roster.evaluate(s);

    let energyPenalty = 0;
    if (s.effects.snowTomorrow) { energyPenalty++; passiveLines.push('You lost an hour shoveling the driveway. (-1 energy)'); }
    if (s.effects.distracted) { energyPenalty++; s.effects.distracted = false; }
    s.energy = Math.max(0, this.maxEnergy() - energyPenalty);
    s.effects.snowTomorrow = false;
    s.effects.preapproved = false;

    s.abilityUsed = false;
    s.joelUsed = false;
    s.mentorUsedToday = false;
    if (s.jeffCooldown > 0) s.jeffCooldown--;
    const weatherLines = this.rollWeather();
    passiveLines.push(...weatherLines);

    // finalize the FOLLOW-UP REPORT (who is due / at risk tomorrow)
    for (const l of s.leads) {
      const r = this.leadRisk(l);
      if (r === 'DUE TODAY') report.due++;
      else if (r === 'AT RISK' || r === 'ABOUT TO GHOST') report.atRisk++;
    }
    s.followReport = report;

    const celebrations = (s.pendingCelebrations || []).slice();
    s.pendingCelebrations = [];
    for (const c of celebrations) passiveLines.push(c.title + ' ' + (c.lines || []).join(' '));

    s._ending = false;
    this.autosave();
    return { eventText, eventGood, rivalLines, passiveLines, bossTime, battleTime: s.pendingBattle, report, celebrations };
  },

  // Can this event actually affect the current game state?
  eventEligible(ev) {
    const st = (...stages) => this.leadsInStage(...stages).length > 0;
    switch (ev.fx) {
      case 'inspectionIssue': return this.leadsInStage('pending').some(l => !l.issue);
      case 'lowAppraisal': case 'floodHit': case 'septicHit': case 'apprHigh': return st('offer', 'pending');
      case 'financeDelay': case 'coldFeet': return st('pending');
      case 'ghostLead': return st('new', 'hot', 'appt');
      case 'stolenDeal': return st('offer');
      case 'greedySeller': case 'zestimateFrame': return this.leadsInStage('active').some(l => l.seller && !l.overpriced);
      case 'valueHit5': return st('active', 'offer', 'pending');
      case 'hotTub': return this.leadsInStage('active', 'appt').some(l => !l.seller);
      case 'buyersCool': case 'rateJump': case 'rateFall': return this.s.leads.some(l => !l.seller);
      case 'allCool': case 'notifyOff': case 'caramelRolls': return st('new', 'hot', 'appt');
      case 'lakeFreeze': case 'fishBiting': return this.s.leads.some(l => l.lake);
      case 'lotteryWin': return this.leadsInStage('active', 'offer', 'pending').some(l => !l.seller);
      default: return true;
    }
  },

  // Returns extra text ('' ok), or false if the event fizzled
  applyEventFx(fx) {
    const s = this.s;
    switch (fx) {
      case 'inspectionIssue': {
        const t = this.leadsInStage('pending').filter(l => !l.issue);
        if (!t.length) return false;
        G.choice(t).issue = true;
        return '';
      }
      case 'lowAppraisal': {
        const t = this.leadsInStage('offer', 'pending');
        if (!t.length) return false;
        const l = G.choice(t);
        l.value = Math.round(l.value * 0.9);
        return '(' + l.name + ' now ' + G.money(l.value) + ')';
      }
      case 'financeDelay': {
        const t = this.leadsInStage('pending');
        if (!t.length) return false;
        G.choice(t).delay = 2;
        return '';
      }
      case 'snowstorm':
        s.effects.snowTomorrow = true;
        return '';
      case 'lockboxFroze':
        s.effects.showPenalty = true;
        return '';
      case 'roadDetour':
        s.effects.detour = 1;
        return '';
      case 'caramelRolls': {
        const t = this.leadsInStage('new', 'hot').sort((a, b) => b.warmth - a.warmth)[0];
        if (!t) return false;
        t.warmth = G.clamp(t.warmth - 20, 0, 100);
        s.rivalry++;
        return '(' + t.name + ' cooled off -20 warmth)';
      }
      case 'zestimateFrame': {
        const t = this.leadsInStage('active').filter(l => l.seller && !l.overpriced);
        if (!t.length) return false;
        const l = G.choice(t);
        l.overpriced = true;
        if (l.listingMomentum != null) l.listingMomentum = G.clamp(l.listingMomentum - 15, 0, 100);
        return '(' + l.name + '\'s listing is now overpriced)';
      }
      case 'groupText':
        s.stats.reviews = Math.max(0, s.stats.reviews - 1);
        s.stats.happiness = G.clamp(s.stats.happiness - 3, 0, 100);
        this.addReputation(-2);
        return '';
      case 'notifyOff':
        for (const l of this.leadsInStage('new', 'hot')) l.warmth = G.clamp(l.warmth - 5, 0, 100);
        return '';
      case 'badReview':
        s.stats.reviews = Math.max(0, s.stats.reviews - 1);
        s.stats.happiness = G.clamp(s.stats.happiness - 5, 0, 100);
        this.addReputation(-4);
        return '';
      case 'ghostLead': {
        const t = this.leadsInStage('new', 'hot', 'appt');
        if (!t.length) return false;
        const l = G.choice(t);
        this.removeLead(l);
        return '(RIP ' + l.name + ')';
      }
      case 'stolenDeal': {
        const t = this.leadsInStage('offer');
        if (!t.length) return false;
        const l = G.choice(t);
        this.removeLead(l);
        s.rival.homesSold++;
        s.rival.commission += Math.round(l.value * 0.027);
        s.rivalry++;
        return '(' + l.name + ' - gone! The rivalry deepens.)';
      }
      case 'rateJump':
        for (const l of s.leads) if (!l.seller && l.stage !== 'closed') l.value = Math.round(l.value * 0.95);
        return '';
      case 'rateFall':
        for (const l of s.leads) if (!l.seller && l.stage !== 'closed') l.value = Math.round(l.value * 1.05);
        return '';
      case 'coldFeet': {
        const t = this.leadsInStage('pending');
        if (!t.length) return false;
        const l = G.choice(t);
        this.advance(l, 'offer');
        return '(' + l.name + ' back to offer stage)';
      }
      case 'greedySeller': {
        const t = this.leadsInStage('active').filter(l => l.seller && !l.overpriced);
        if (!t.length) return false;
        const l = G.choice(t);
        l.overpriced = true;
        l.value = Math.round(l.value * 1.2);
        return '(' + l.name + ' at ' + G.money(l.value) + ' now. Good luck.)';
      }
      case 'valueHit5': {
        const t = this.leadsInStage('active', 'offer', 'pending');
        if (!t.length) return false;
        const l = G.choice(t);
        l.value = Math.round(l.value * 0.95);
        return '(' + l.name + ' now ' + G.money(l.value) + ')';
      }
      case 'floodHit': {
        const t = this.leadsInStage('offer', 'pending');
        if (!t.length) return false;
        const l = G.choice(t);
        l.value = Math.round(l.value * 0.85);
        l.issue = true;
        return '(' + l.name + ' now ' + G.money(l.value) + ' + repairs needed)';
      }
      case 'septicHit': {
        const t = this.leadsInStage('offer', 'pending');
        if (!t.length) return false;
        const l = G.choice(t);
        l.value = Math.round(l.value * 0.9);
        l.issue = true;
        return '(' + l.name + ' now ' + G.money(l.value) + ' + repairs)';
      }
      case 'apprHigh': {
        const t = this.leadsInStage('offer', 'pending');
        if (!t.length) return false;
        const l = G.choice(t);
        l.value = Math.round(l.value * 1.1);
        return '(' + l.name + ' now ' + G.money(l.value) + '!)';
      }
      case 'lotteryWin': {
        const t = this.leadsInStage('active', 'offer', 'pending').filter(l => !l.seller);
        if (!t.length) return false;
        const l = G.choice(t);
        l.value = Math.round(l.value * 1.2);
        return '(' + l.name + ' now shopping at ' + G.money(l.value) + '!)';
      }
      case 'buyersCool':
        for (const l of s.leads) if (!l.seller) l.warmth = G.clamp(l.warmth - 8, 0, 100);
        return '';
      case 'allCool':
        for (const l of this.leadsInStage('new', 'hot', 'appt')) l.warmth = G.clamp(l.warmth - 10, 0, 100);
        return '';
      case 'lakeFreeze':
        for (const l of s.leads) if (l.lake && !l.seller) l.value = Math.round(l.value * 0.9);
        return '';
      case 'hotSellerLead': {
        const l = this.spawnLead(G.chance(0.5) ? 'expired' : 'divorce');
        if (!l) return false;
        l.warmth = 80;
        l.stage = 'hot';
        return '(' + l.name + ' is HOT to list)';
      }
      case 'leadFrenzy': {
        const n = G.randInt(1, 2);
        let got = 0;
        for (let i = 0; i < n; i++) if (this.spawnLead(G.chance(0.6) ? 'lakehome' : 'cabin')) got++;
        return got ? '(+' + got + ' lake-crazed lead' + (got > 1 ? 's' : '') + '!)' : false;
      }
      // happiness tweaks
      case 'happy3': s.stats.happiness = G.clamp(s.stats.happiness + 3, 0, 100); return '';
      case 'happy4': s.stats.happiness = G.clamp(s.stats.happiness + 4, 0, 100); return '';
      case 'happy5': s.stats.happiness = G.clamp(s.stats.happiness + 5, 0, 100); return '';
      case 'happy10': s.stats.happiness = G.clamp(s.stats.happiness + 10, 0, 100); return '';
      case 'unhappy2': s.stats.happiness = G.clamp(s.stats.happiness - 2, 0, 100); return '';
      case 'unhappy3': s.stats.happiness = G.clamp(s.stats.happiness - 3, 0, 100); return '';
      case 'hotTub': {
        const t = this.leadsInStage('active', 'appt').filter(l => !l.seller);
        if (!t.length) return false;
        const l = this.bestLead(t);
        if (l.stage === 'appt') this.advance(l, 'active');
        this.advance(l, 'offer');
        return '(' + l.name + ' jumped to OFFER!)';
      }
      case 'sellerLead': return this.spawnLead(G.chance(0.5) ? 'fsbo' : 'expired') ? '' : false;
      case 'deerVideo': {
        const gain = Math.round(200 * this.followerGainMult());
        s.stats.followers += gain;
        return '(+' + gain + ' followers)';
      }
      case 'auroraMoment': {
        s.stats.happiness = G.clamp(s.stats.happiness + 8, 0, 100);
        const gain = Math.round(150 * this.followerGainMult());
        s.stats.followers += gain;
        return '(+' + gain + ' followers)';
      }
      case 'fishBiting':
        for (const l of s.leads) if (l.lake) l.warmth = G.clamp(l.warmth + 15, 0, 100);
        return '';
      case 'wrongViral': {
        const gain = Math.round(400 * this.followerGainMult());
        s.stats.followers += gain;
        s.stats.reviews = Math.max(0, s.stats.reviews - 1);
        return '(+' + gain + ' followers, -1 review)';
      }
      case 'videoLead': {
        const l = this.spawnLead('facebook');
        if (!l) return false;
        l.warmth = 80;
        l.stage = 'hot';
        return '(' + l.name + ' is HOT)';
      }
      case 'referralLead': {
        if (!this.spawnLead('referral')) return false;
        s.stats.referrals++;
        G.Profile.bump('referrals');
        return '';
      }
      // easter eggs
      case 'bunyanReferral': {
        const l = this.spawnLead(this.commercialOk() ? 'dev100' : 'farm', { force: true });
        l.warmth = 90;
        s.stats.referrals++;
        return '(' + l.name + ', friend of Paul. Warm as a griddle.)';
      }
      case 'walleyeCharisma':
        for (const l of s.leads) l.warmth = G.clamp(l.warmth + 20, 0, 100);
        return '';
      case 'fairRep':
        this.addReputation(10);
        return '';
      case 'lakeFallViral': {
        const gain = Math.round(900 * this.followerGainMult());
        s.stats.followers += gain;
        this.addReputation(-5);
        if (s.stats.followers >= 5000) G.Profile.award('butterfly');
        return '(+' + gain + ' followers, -5 reputation, +1 great story)';
      }
    }
    return '';
  },

  // ----------------------------------------------------------
  // Bosses
  // ----------------------------------------------------------
  currentBoss() {
    const id = this.s.bossPlan[Math.min(this.s.bossIndex, this.s.bossPlan.length - 1)];
    return G.Data.BOSSES.find(b => b.id === id) || G.Data.BOSSES[0];
  },

  resolveBoss(won) {
    const s = this.s;
    const boss = this.currentBoss();
    const lines = [];
    if (won) {
      s.stats.bossWins++;
      s.cash += boss.reward.cash;
      s.stats.commission += boss.reward.cash;
      s.stats.followers += Math.round(boss.reward.followers * this.followerGainMult());
      let bossLeads = 0;
      for (let i = 0; i < boss.reward.leads; i++) { if (this.spawnLead()) bossLeads++; }
      s.stats.happiness = G.clamp(s.stats.happiness + 8, 0, 100);
      this.addReputation(6);
      lines.push('YOU BEAT ' + boss.name + '!');
      lines.push('+' + G.money(boss.reward.cash) + ' bonus, +' + bossLeads + ' lead' + (bossLeads === 1 ? '' : 's') + ', +followers!');
      if (boss.final) G.Profile.award('megaslayer');
    } else {
      s.rival.homesSold++;
      s.stats.happiness = G.clamp(s.stats.happiness - 6, 0, 100);
      this.addReputation(-3);
      lines.push(boss.name + ' takes the round...');
      lines.push('They win a listing you wanted. It stings.');
    }
    s.pendingBoss = false;
    s.bossIndex++;
    s.month++;
    s.dayOfMonth = 1;
    if (s.month >= G.Data.SEASON.months.length) {
      s.seasonOver = true;
      s.stats.wonSeason = this.playerWon();
      G.Profile.bump('seasons');
      if (G.Roster) G.Roster.evaluate(s);
      G.Save.clear();
    } else {
      this.rollWeather();
      if (G.Roster) G.Roster.evaluate(s);
      this.autosave();
    }
    return { lines, seasonOver: s.seasonOver };
  },

  // ----------------------------------------------------------
  // Head-to-head listing battle resolution
  // ----------------------------------------------------------
  resolveBattle(won) {
    const s = this.s;
    s.pendingBattle = false;
    s.rivalry++;
    const lines = [];
    if (won) {
      s.stats.battleWins = (s.stats.battleWins || 0) + 1;
      const l = this.spawnLead(G.chance(0.5) ? 'luxury' : 'lakedev', { force: true });
      l.stage = 'active';
      l.listingMomentum = 50;
      l.expectsOpenHouse = G.chance(0.4);
      l.seller = true;
      this.s.stats.listings++;
      this.addReputation(8);
      lines.push('THE SELLERS CHOSE YOU!');
      lines.push('+ LISTING: ' + l.name + ' at ' + G.money(l.value) + '!');
      lines.push(this.rivalChar().name + ' drove away very slowly. Menacingly slowly.');
    } else {
      s.rival.homesSold++;
      this.addReputation(-4);
      s.stats.happiness = G.clamp(s.stats.happiness - 4, 0, 100);
      lines.push('The sellers went with ' + this.rivalChar().name + '...');
      lines.push('"It was the laminated flyers," they said. LAMINATED. FLYERS.');
    }
    this.autosave();
    return { lines };
  },

  // ----------------------------------------------------------
  // Scoring
  // ----------------------------------------------------------
  seasonScore() {
    const st = this.s.stats;
    return Math.round(
      st.homesSold * 1000 +
      st.commission / 100 +
      st.reviews * 50 +
      st.followers / 10 +
      st.happiness * 10 +
      st.reputation * 10 +
      st.bossWins * 750 +
      st.referrals * 100 +
      st.commercialDeals * 500
    );
  },

  playerWon() { return this.s.stats.homesSold > this.s.rival.homesSold; },
  tied() { return this.s.stats.homesSold === this.s.rival.homesSold; },
};
