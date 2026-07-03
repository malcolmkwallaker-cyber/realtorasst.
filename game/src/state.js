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
    if (ch) G.Toast.push('SECRET AGENT UNLOCKED: ' + ch.name, why || ch.unlockHint);
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
  newGame(charId, difficulty) {
    this.s = {
      charId,
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
      bradUsed: false,
      jeffCooldown: 0,
      blakeCooldown: 0,
      aiOverdrive: 0,
      scaleMode: 0,
      tylerCooldown: 0,
      tylerTier: 0,
      systemOverride: 0,
      openHouseEngine: 0,
      commercialUnlocked: false,
      coffee: 100,          // Blake's coffee meter (only drains when playing Blake)
      rivalry: 0,
      dayVolume: 0,
      bigfootToday: false,
      mentorUsedToday: false,   // one major mentor benefit per day
      marketVisibility: 40,     // 0..100 public-marketing momentum
      eventHistory: [],         // last 5 event ids (no immediate repeats)
      followReport: null,       // yesterday's follow-up summary
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
    // boss plan: two random pool bosses + the final
    const pool = G.shuffle(G.Data.BOSS_POOL).slice(0, 2);
    this.s.bossPlan = [...pool, G.Data.FINAL_BOSS];

    // starting pipeline (Rookie & Tyler start slow; size set by difficulty)
    if (this.perk() === 'rookie') {
      this.spawnLead('firsttime');
    } else if (this.perk() === 'tyler') {
      this.spawnLead('firsttime');
      this.spawnLead('signcall');
    } else {
      const pool = ['firsttime', 'signcall', this.char().id === 'malcolm' ? 'lakehome' : 'luxury', 'facebook'];
      for (const t of pool.slice(0, this.bal().startingLeadCount)) this.spawnLead(t);
    }
    if (this.perk() === 'influencer') { this.spawnLead('facebook'); this.spawnLead('facebook'); }

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
    st.bradUsed = st.bradUsed || false;
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
    st.systemOverride = Math.min(st.systemOverride || 0, 1);
    st.openHouseEngine = Math.min(st.openHouseEngine || 0, 1);
    const today = st.month * G.Data.SEASON.daysPerMonth + st.dayOfMonth;
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
  char() { return G.Data.CHARACTERS[this.s.charId]; },
  perk() { return this.char().perk || null; },
  rivalChar() {
    // secret characters still feud with Bridger by default; Bridger plays vs Malcolm
    if (this.s.charId === 'bridger') return G.Data.CHARACTERS.malcolm;
    return G.Data.CHARACTERS.bridger;
  },
  has(up) { return !!this.s.upgrades[up]; },
  commercialOk() { return this.s.commercialUnlocked || this.has('commercialdiv'); },

  rookieLevel() {
    return this.perk() === 'rookie' ? Math.floor(this.s.stats.homesSold / 3) : 0;
  },

  maxEnergy() {
    return G.Data.SEASON.baseEnergy
      + (this.has('ai') ? 1 : 0)
      + (this.has('corporateHQ') ? 1 : 0)
      + (this.perk() === 'blake' && this.s.coffee <= 0 ? -1 : 0)  // out of coffee: slower
      + Math.min(3, this.rookieLevel());
  },

  // Tyler's Daily Discipline passive tier (playable). Dormant the first
  // few days (weak early), then compounds (strong late).
  tylerPassiveTier() {
    return this.perk() === 'tyler' ? Math.min(3, Math.floor((this.totalDay() - 1) / 3)) : 0;
  },

  blakeBuff() {
    if (this.s.scaleMode > 0) return { label: 'SCALE MODE', days: this.s.scaleMode, color: G.C.cyan };
    if (this.s.aiOverdrive > 0) return { label: 'AI OVERDRIVE', days: this.s.aiOverdrive, color: G.C.lime };
    return null;
  },

  // Compact list of active timed buffs / passive tiers for the HUD badge line
  activeBuffs() {
    const s = this.s, out = [];
    if (s.scaleMode > 0) out.push({ t: 'SCALE' + s.scaleMode, c: G.C.cyan });
    else if (s.aiOverdrive > 0) out.push({ t: 'AI' + s.aiOverdrive, c: G.C.lime });
    if (s.systemOverride > 0) out.push({ t: 'SYS' + s.systemOverride, c: G.C.sky });
    else if (s.openHouseEngine > 0) out.push({ t: 'OH' + s.openHouseEngine, c: G.C.orange });
    const dsc = s.tylerTier + this.tylerPassiveTier();
    if (dsc > 0) out.push({ t: 'DSC' + dsc, c: G.C.teal });
    return out;
  },

  totalDay() { return this.s.month * G.Data.SEASON.daysPerMonth + this.s.dayOfMonth; },
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
    const perk = this.perk();
    if (perk === 'grandpa') m *= 0.25;
    if (perk === 'veteran') m *= 0.5;
    if (perk === 'influencer') m *= 1.5;
    if (perk === 'blake') m *= 1.25;
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
    if (mod < 0 && (w.id === 'blizzard' || w.id === 'icestorm') && this.has('snowmobile')) mod = 0;
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
    if (this.perk() === 'grandpa') warmth = G.clamp(warmth + 15, 5, 100);
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
    s.leads.push(lead);
    s.stats.leadsReceived++;
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
        if (this.perk() === 'grandpa') return { ok: false, reason: 'GRANDPA SAYS NO' };
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
    if (this.has('tc')) wait = Math.max(1, wait - 1);
    return this.leadsInStage('pending').filter(l => !l.issue && (pre || l.delay <= 0) && l.daysInStage >= wait);
  },

  // Extra score from gear + weather + rookie level (applied to minigame results)
  scoreAdjust(id) {
    let adj = this.weatherMod(id);
    adj += this.rookieLevel() * 0.04;
    if (id === 'show') {
      if (this.has('matterport')) adj += 0.05;
      if (this.has('luxsuv')) adj += 0.05;
      if (this.has('pontoon')) adj += 0.08;
      if (this.has('lakecert')) adj += 0.04;
    }
    if (id === 'listing' && this.has('matterport')) adj += 0.1;
    if (id === 'video') {
      if (this.has('tiktok')) adj += 0.1;
      if (this.has('videographer')) adj += 0.15;
    }
    if ((id === 'negotiate' || id === 'inspect') && this.s.effects.preapproved) adj += 0.15;
    if (this.s.scaleMode > 0) adj += 0.05;   // Scale Mode: everything a touch smoother
    // county road detour: tomorrow's tours suffer
    if (this.s.effects.detour > 0 && (id === 'show' || id === 'openhouse')) adj -= 0.15;
    // market visibility: known agents draw better open house crowds
    if (id === 'openhouse') adj += (this.s.marketVisibility - 40) / 500;
    return adj;
  },

  // ----------------------------------------------------------
  // Close a single lead: shared by close action, Brad, commercial
  // ----------------------------------------------------------
  closeLead(l, lines) {
    const s = this.s;
    const rate = l.commercial ? 0.005 : 0.027;
    const comm = Math.round(l.value * rate);
    // Commercial deals are their own stat - they do NOT count as homes sold
    if (l.commercial) s.stats.commercialDeals++;
    else s.stats.homesSold++;
    s.stats.commission += comm;
    s.cash += comm;
    s.dayVolume += l.value;
    s.marketVisibility = G.clamp(s.marketVisibility + 5, 0, 100);  // SOLD signs sell
    lines.push('SOLD! ' + l.name + ' - ' + G.money(l.value) + ' (+' + G.money(comm) + ' commission)');
    s.stats.happiness = G.clamp(s.stats.happiness + 4, 0, 100);

    if (G.chance(0.5)) {
      s.stats.reviews++;
      this.addReputation(2);
      lines.push('+ 5-STAR REVIEW: "' + G.choice([
        'Sold our place in a weekend, dontcha know!', 'Best agent north of Brainerd.',
        'They brought bars to closing. BARS.', '10/10 would house again.',
      ]) + '"');
    }
    const refChance = 0.35 + s.stats.happiness / 400 + (this.has('retreat') ? 0.1 : 0);
    if (G.chance(refChance)) {
      const n = this.perk() === 'grandpa' ? 2 : 1;
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
    if (l.lake) G.Profile.bump('lakeSold');
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
          if (l.stage === 'new' && l.warmth >= bal.warmThreshold) {
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
            this.advance(l, 'hot'); lines.push(l.name + ' replied with 3 emojis. Warm!'); advanced++;
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
        // Blake refuels at the coffee shop
        if (this.perk() === 'blake') {
          const wasEmpty = s.coffee <= 0;
          s.coffee = 100;
          if (wasEmpty) { s.energy = Math.min(s.energy + 1, this.maxEnergy()); lines.push('COFFEE REFILLED to 100%! Blake is back to 100 mph. (+1 energy)'); }
          else lines.push('Coffee topped off to 100%. The cup that never empties, empties into Blake.');
        }
        lines.push(grade(score) + ' ' + G.choice(G.Data.FLAVOR.followup));
        // Contact a limited number of people - most at-risk first
        const riskOrder = { 'ABOUT TO GHOST': 0, 'AT RISK': 1, 'DUE TODAY': 2, 'SAFE': 3 };
        const pool = this.leadsInStage('attendee', 'new', 'hot', 'appt', 'active')
          .sort((a, b) => (riskOrder[this.leadRisk(a)] - riskOrder[this.leadRisk(b)]) ||
                          ((b.daysSinceContact || 0) - (a.daysSinceContact || 0)));
        const contacts = bal.followupContacts + (this.has('crm') ? 2 : 0);
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
            lines.push('AI ASSISTANT auto-texted ' + l.name + '. It used two emojis. (+3 warmth)');
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
        if (s.stats.followers >= 5000) {
          G.Profile.award('butterfly');
          G.Profile.unlock('influencer', 'You reached 5,000 followers!');
        }
        break;
      }

      case 'listing': {
        const sellers = this.leadsInStage('appt').filter(l => l.seller);
        const l = this.bestLead(sellers);
        this.touch(l);
        const bonus = ch.listingBonus + (this.has('drone') ? 0.15 : 0);
        if (score + bonus >= 0.5) {
          this.advance(l, 'active');
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
        const howMany = this.has('assistant') ? 2 : 1;
        const picked = buyers.slice(0, howMany);
        if (s.effects.showPenalty) { s.effects.showPenalty = false; lines.push('(The lockbox finally opened. Your mitten will never be the same.)'); }
        lines.push(grade(score) + ' Tour day!');
        for (const l of picked) {
          this.touch(l);
          if (l.stage === 'appt') {
            if (score >= 0.35) {
              this.advance(l, 'active');
              lines.push(l.name + ' is now YOUR buyer client!');
            } else {
              lines.push(l.name + ' "didn\'t vibe with the carpet." Still at appt.');
            }
          } else if (score >= 0.55) {
            this.advance(l, 'offer');
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
        const ready = this.offerReadyLeads();
        const l = this.bestLead(ready);
        this.touch(l);
        this.advance(l, 'offer');
        lines.push(G.choice(G.Data.FLAVOR.offer));
        lines.push(l.name + ' (' + G.money(l.value) + ') is now UNDER OFFER.');
        break;
      }

      case 'negotiate': {
        const offers = this.leadsInStage('offer');
        const l = this.bestLead(offers);
        this.touch(l);
        let power = G.clamp(score + ch.negotiateBonus, 0, 1);
        if (s.effects.preapproved) {
          power = 1;
          lines.push('BRAD\'S PRE-APPROVAL DID THE TALKING. No contingencies. No mercy.');
          s.effects.preapproved = false;
        }
        if (power >= 0.45) {
          this.advance(l, 'pending');
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

    return { lines, sold };
  },

  // ----------------------------------------------------------
  // Legendary power-ups: Brad Nolan & Jeff Nobleza
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

  visitBrad() {
    const s = this.s;
    if (s.bradUsed) return { lines: ['Brad is out closing loans. Back tomorrow. His voicemail is just air horns.'], used: true };
    const busy = this.mentorBusy();
    if (busy) return busy;
    s.bradUsed = true;
    s.mentorUsedToday = true;
    const B = G.Data.BRAD;
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
  // Blake Suddath - The Growth Guru (AI Overdrive / Scale Mode)
  // ----------------------------------------------------------
  visitBlake() {
    const s = this.s;
    const B = G.Data.BLAKE;
    if (s.blakeCooldown > 0) {
      return { lines: ['BLAKE: "Systems are still running - give it ' + s.blakeCooldown + ' day(s)."',
        G.choice(B.coffee), '"' + G.choice(['Scale beats hustle.', 'Work smarter, not harder.']) + '"'], used: true };
    }
    const busy = this.mentorBusy();
    if (busy) return busy;
    if (s.energy < 1) {
      return { lines: ['BLAKE: "Love the energy. Wait. You have none. Come back with 1 energy."'], used: true };
    }
    s.energy -= 1;
    s.blakeCooldown = 6;
    s.mentorUsedToday = true;
    const lines = [B.name + ' - ' + B.title];

    if (G.chance(B.scaleChance)) {
      // ULTIMATE: Scale Mode (1 day)
      s.scaleMode = Math.max(s.scaleMode, 1);
      s.energy = Math.min(s.energy + 1, this.maxEnergy());
      lines.push(...B.scaleLines);
      const l = this.spawnLead();
      if (l) lines.push('+ LEAD: ' + l.name + ' recruited by the AI swarm!');
      else lines.push('The AI swarm found a lead... but your pipeline is FULL.');
      lines.push('', 'SCALE MODE active today: +1 energy, smoother tasks, drones hunt overnight.');
      G.Profile.award('scalemode');
      G.Profile.unlock('blake', 'You triggered Blake\'s Scale Mode!');
    } else {
      // SPECIAL: AI Overdrive (2 days, passive-only)
      s.aiOverdrive = Math.max(s.aiOverdrive, 2);
      lines.push(...B.intro);
      lines.push('', B.ability + ' DEPLOYED:');
      const twoDrones = G.shuffle(B.drones).slice(0, 2);
      for (const d of twoDrones) lines.push('* ' + d);
      lines.push(G.choice(B.coffee));
      lines.push('', 'AI OVERDRIVE active 2 days: the drones may source leads overnight,');
      lines.push('nudge your pipeline, and earn a little passive income.');
    }
    lines.push(G.choice(B.lines));
    return { lines };
  },

  // ----------------------------------------------------------
  // Tyler Lewis - The Systems Architect (systems that compound;
  // weak early, strong late). Every visit runs Cirql Scan and
  // strengthens the Daily Discipline passive; may deploy the
  // Open House Engine or the System Override ultimate.
  // ----------------------------------------------------------
  visitTyler() {
    const s = this.s;
    const T = G.Data.TYLER;
    if (s.tylerCooldown > 0) {
      return { lines: ['TYLER: "The systems are running. Give it ' + s.tylerCooldown + ' day(s)."',
        '"' + G.choice(['Consistency beats intensity.', 'The basics always win.']) + '"'], used: true };
    }
    const busy = this.mentorBusy();
    if (busy) return busy;
    if (s.energy < 1) {
      return { lines: ['TYLER: "A system needs an operator. Come back with 1 energy."'], used: true };
    }
    s.energy -= 1;
    s.tylerCooldown = 5;
    s.mentorUsedToday = true;
    s.tylerTier = Math.min(s.tylerTier + 1, 3);
    const lines = [T.name + ' - ' + T.title];

    // Cirql Scan: warms only your two coldest prospects
    lines.push(...T.scanLines.slice(0, 3));
    const coldest = this.leadsInStage('new', 'hot').sort((a, b) => a.warmth - b.warmth).slice(0, 2);
    for (const l of coldest) {
      l.warmth = G.clamp(l.warmth + 5, 0, 100);
      lines.push('* ' + l.name + ' resurfaced in the CRM. (+5 warmth)');
    }
    // Sometimes the scan digs up a real person
    if (G.chance(0.35)) {
      const l = this.spawnLead(G.chance(0.5) ? 'pastclient' : 'referral');
      if (l) lines.push('+ REVEALED: ' + l.name + ' (' + l.label + ')');
      else lines.push('The scan found someone... but your pipeline is FULL.');
    }

    // Bigger systems unlock at higher tiers (weak early, useful late)
    if (s.tylerTier >= 3 && G.chance(T.overrideChance)) {
      s.systemOverride = Math.max(s.systemOverride, 1);
      lines.push('', ...T.overrideLines);
      lines.push('SYSTEM OVERRIDE active 1 day.');
      G.Profile.award('sysoverride');
      G.Profile.unlock('tyler', 'You triggered Tyler\'s System Override!');
    } else if (s.tylerTier >= 2 && G.chance(T.engineChance)) {
      s.openHouseEngine = Math.max(s.openHouseEngine, 1);
      lines.push('', ...T.engineLines);
      lines.push('OPEN HOUSE ENGINE active 1 day.');
    } else {
      lines.push('', 'DAILY DISCIPLINE strengthened (tier ' + s.tylerTier + '/3): nightly warmth,',
        'lower ghosting risk, and a small referral chance. Systems compound.');
    }
    lines.push(G.choice(T.lines));
    return { lines };
  },

  // ----------------------------------------------------------
  // Special ability (once per day) - per character
  // ----------------------------------------------------------
  useAbility() {
    const s = this.s;
    if (s.abilityUsed) return null;
    s.abilityUsed = true;
    const lines = [];
    const perk = this.perk();

    const advanceBest = () => {
      const pick =
        this.bestLead(this.leadsInStage('pending').filter(l => l.issue)) ||
        this.bestLead(this.leadsInStage('offer')) ||
        this.bestLead(this.offerReadyLeads()) ||
        this.bestLead(this.leadsInStage('appt')) ||
        this.bestLead(this.leadsInStage('hot')) ||
        this.bestLead(this.leadsInStage('new'));
      if (!pick) return null;
      if (pick.stage === 'pending' && pick.issue) { pick.issue = false; return pick.name + '\'s inspection issue: waived!'; }
      const next = { new: 'hot', hot: 'appt', appt: 'active', active: 'offer', offer: 'pending' }[pick.stage];
      this.advance(pick, next);
      return pick.name + ' advances to ' + G.Data.STAGE_LABELS[next] + '!';
    };

    if (s.charId === 'malcolm') {
      const gain = Math.round(G.randInt(300, 800) * this.followerGainMult());
      s.stats.followers += gain;
      const n = G.randInt(1, 2);
      lines.push('VIRAL VIDEO! "' + G.choice([
        'AGENT RATES EVERY LAKE (PART 7)', 'I SLEPT IN AN ICE HOUSE FOR A LISTING',
        'THE LOON CALL CHALLENGE', 'SELLING A HOUSE IN -30 (GONE WRONG)',
      ]) + '"');
      lines.push('+' + gain + ' FOLLOWERS!');
      for (let i = 0; i < n; i++) {
        const l = this.spawnLead(G.chance(0.4) ? 'lakehome' : 'facebook');
        if (l) lines.push('+ LEAD: ' + l.name + ' - "saw your video, had to call!"');
        else lines.push('More viewers wanted to call... but your pipeline is FULL.');
      }
    } else if (s.charId === 'bridger') {
      lines.push('POWER CLOSE! Bridger straightens his tie...');
      const r = advanceBest();
      lines.push(r || '...but there was nobody to close. He closed a car door, powerfully.');
    } else if (perk === 'grandpa') {
      lines.push('THE ROLODEX! Grandpa licks a thumb and flips...');
      for (let i = 0; i < 2; i++) {
        const l = this.spawnLead('pastclient');
        if (l) { l.warmth = 85; lines.push('+ ' + l.name + ' answered on the first ring. Of course they did.'); }
        else lines.push('The Rolodex had more names, but your plate is FULL.');
      }
    } else if (perk === 'influencer') {
      const gain = Math.round(G.randInt(400, 900) * this.followerGainMult());
      s.stats.followers += gain;
      lines.push('GOING LIVE! Chaos. Beautiful chaos.');
      lines.push('+' + gain + ' FOLLOWERS!');
      const n = G.randInt(1, 2);
      for (let i = 0; i < n; i++) {
        const l = this.spawnLead('facebook');
        if (l) lines.push('+ LEAD: ' + l.name + ' from the live chat!');
        else lines.push('The chat is full of buyers... and your pipeline is full of everyone else.');
      }
      if (s.stats.followers >= 5000) G.Profile.award('butterfly');
    } else if (perk === 'veteran') {
      lines.push('WAR STORY: "...so there we were, blizzard of \'94, the ink was FROZEN..."');
      const r = advanceBest();
      lines.push(r || 'The room was moved. Unfortunately the room was empty.');
      s.stats.happiness = G.clamp(s.stats.happiness + 3, 0, 100);
    } else if (perk === 'rookie') {
      lines.push('HUSTLE! The rookie does everything, everywhere, all at once.');
      const r = advanceBest();
      lines.push(r || 'Nothing to hustle yet. The rookie does pushups instead.');
    } else if (perk === 'blake') {
      s.aiOverdrive = Math.max(s.aiOverdrive, 2);
      const gain = Math.round(G.randInt(200, 500) * this.followerGainMult());
      s.stats.followers += gain;
      lines.push('AI OVERDRIVE! Drones deploy - holographic dashboards everywhere.');
      lines.push('+' + gain + ' FOLLOWERS');
      const l = this.spawnLead();
      if (l) lines.push('+ LEAD: ' + l.name + ' (AI-sourced)');
      lines.push('2 days of passive AI drone work now active.');
    } else if (perk === 'tyler') {
      s.systemOverride = Math.max(s.systemOverride, 1);
      lines.push('SYSTEM OVERRIDE! Automations take the wheel tonight.');
      const r = advanceBest();
      lines.push(r || 'Systems primed - nothing to advance yet.');
      for (const l of this.leadsInStage('new', 'hot', 'appt')) l.warmth = G.clamp(l.warmth + 8, 0, 100);
      lines.push('Full auto follow-up + referral engine engaged for the night.');
    }
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
    const bal = this.bal();
    const today = this.totalDay();
    const passiveLines = [];
    const report = { contacted: 0, due: 0, atRisk: 0, lost: [] };
    s.dayVolume = 0;
    s.bigfootToday = G.chance(0.06);
    if (s.effects.detour > 0) s.effects.detour--;

    // Tyler's Daily Discipline tier (vendor visits + playable passive)
    const disciplineTier = Math.min(6, s.tylerTier + this.tylerPassiveTier());

    // 1. FOLLOW-UP DECAY: untouched leads cool, then ghost.
    // CRM softens decay (-40%) and halves ghosting; Tyler -10%/tier ghosting.
    const decayMult = this.has('crm') ? 0.6 : 1;
    const ghostMult = (this.has('crm') ? 0.5 : 1) * Math.max(0.4, 1 - 0.1 * disciplineTier);
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
    if (this.perk() === 'influencer' && !this.has('tc')) {
      for (const l of this.leadsInStage('pending').slice()) {
        if (G.chance(0.2)) {
          this.removeLead(l);
          passiveLines.push(l.name + '\'s deal COLLAPSED. "Wait, the contract needed... signing?" GET A TRANSACTION COORDINATOR.');
        }
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
    if (this.perk() === 'influencer') roll('dm', 0.5, 'facebook', 'DM LEAD: %N slid into the DMs. As they do.');
    if (s.commercialUnlocked) roll('jeff', G.Data.JEFF.passiveChance, 'ex1031', 'JEFF\'S NETWORK: %N called about a 1031 Exchange!');
    const organicChance = Math.min(0.18, 0.08 + s.stats.followers / 40000 + Math.max(0, s.marketVisibility - 40) / 800);
    roll('organic', organicChance, null, 'NEW LEAD: %N (%T) reached out!');
    if (s.scaleMode > 0) roll('blakeScale', 0.6, null, 'BLAKE\'S DRONE SWARM delivered: %N (%T)!');
    else if (s.aiOverdrive > 0) roll('blakeAI', 0.35, null, 'BLAKE\'S AI SOURCED A LEAD: %N (%T)!');
    if (this.perk() === 'blake') roll('network', 0.15, null, 'NETWORK EFFECT: %N was introduced through Blake\'s network!');
    if (s.openHouseEngine > 0) roll('ohengine', 0.8, 'openhouse', 'OPEN HOUSE ENGINE: %N signed in overnight.');
    if (disciplineTier > 0) roll('discipline', 0.03 * disciplineTier, 'referral', 'DAILY DISCIPLINE: consistent follow-up earned a referral from %N.', true);
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
      if (l.daysInStage >= 1 && !l.overpriced && G.chance(l.listingMomentum / 250 + (this.has('photographer') ? 0.08 : 0))) {
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

    // 3b. BLAKE SUDDATH buffs (leads come via the passive pool above)
    if (s.scaleMode > 0 || s.aiOverdrive > 0) {
      const scaling = s.scaleMode > 0;
      // gentle auto follow-up
      for (const l of this.leadsInStage('new', 'hot', 'appt')) l.warmth = G.clamp(l.warmth + (scaling ? 5 : 3), 0, 100);
      // modest passive income
      const income = scaling ? 250 : 100;
      s.cash += income; s.stats.commission += income;
      passiveLines.push((scaling ? 'SCALE MODE' : 'AI OVERDRIVE') + ': AI drones worked overnight (+' + G.money(income) + ' passive).');
      if (scaling) { s.scaleMode--; if (s.scaleMode === 0) passiveLines.push('Scale Mode wound down. The dashboards fade.'); }
      else { s.aiOverdrive--; if (s.aiOverdrive === 0) passiveLines.push('AI Overdrive ended. The drones return to the backpack.'); }
    }

    // 3b2. BLAKE (playable): coffee drains; shiny-tool distraction costs real time
    if (this.perk() === 'blake') {
      s.coffee = Math.max(0, s.coffee - 34);
      if (s.coffee <= 0) passiveLines.push('COFFEE EMPTY! Blake is dragging - do FOLLOW UP to refuel. (-1 energy until then)');
      else if (s.coffee <= 34) passiveLines.push('Coffee low (' + s.coffee + '%). Refill soon or slow down.');
      if (G.chance(0.15)) {
        s.effects.distracted = true;
        passiveLines.push('Blake stayed up testing a shiny new AI tool. Tomorrow starts slow. (-1 energy)');
      }
    }

    // 3c. TYLER: Daily Discipline (+1 warmth per tier, referrals via pool)
    if (disciplineTier > 0) {
      for (const l of this.leadsInStage('new', 'hot', 'appt')) l.warmth = G.clamp(l.warmth + disciplineTier, 0, 100);
    }
    if (s.systemOverride > 0) {
      // paperwork moves itself along: unstick one snagged transaction
      const stuck = this.leadsInStage('pending').filter(l => l.issue || l.delay > 0)[0];
      if (stuck) { stuck.issue = false; stuck.delay = 0; passiveLines.push('SYSTEM OVERRIDE cleared the paperwork snag on ' + stuck.name + '\'s deal.'); }
      s.stats.followers += 40;
      s.cash += 200; s.stats.commission += 200;
      passiveLines.push('SYSTEM OVERRIDE: automations ran the business overnight (+' + G.money(200) + ').');
      s.systemOverride--; if (s.systemOverride === 0) passiveLines.push('System Override ended. The systems keep humming.');
    }
    if (s.openHouseEngine > 0) {
      s.openHouseEngine--; if (s.openHouseEngine === 0) passiveLines.push('Open House Engine wrapped up.');
    }

    // 4. rival AI + trash talk scaled by rivalry
    const rivalLines = [];
    const rc = this.rivalChar();
    const closeChance = bal.rivalCloseChances[Math.min(s.month, 2)];
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
    s.dayOfMonth++;
    if (s.dayOfMonth > G.Data.SEASON.daysPerMonth) {
      bossTime = true;
      s.pendingBoss = true;
      if (s.rival.homesSold > s.stats.homesSold) s.rivalry++;
    }

    // 8. energy + daily resets + weather for tomorrow
    let energyPenalty = 0;
    if (s.effects.snowTomorrow) { energyPenalty++; passiveLines.push('You lost an hour shoveling the driveway. (-1 energy)'); }
    if (s.effects.distracted) { energyPenalty++; s.effects.distracted = false; }
    s.energy = Math.max(0, this.maxEnergy() - energyPenalty);
    s.effects.snowTomorrow = false;
    s.effects.preapproved = false;
    s.abilityUsed = false;
    s.bradUsed = false;
    s.mentorUsedToday = false;
    if (s.jeffCooldown > 0) s.jeffCooldown--;
    if (s.blakeCooldown > 0) s.blakeCooldown--;
    if (s.tylerCooldown > 0) s.tylerCooldown--;
    const weatherLines = this.rollWeather();
    passiveLines.push(...weatherLines);

    // finalize the FOLLOW-UP REPORT (who is due / at risk tomorrow)
    for (const l of s.leads) {
      const r = this.leadRisk(l);
      if (r === 'DUE TODAY') report.due++;
      else if (r === 'AT RISK' || r === 'ABOUT TO GHOST') report.atRisk++;
    }
    s.followReport = report;

    this.autosave();
    return { eventText, eventGood, rivalLines, passiveLines, bossTime, battleTime: s.pendingBattle, report };
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
        if (s.stats.followers >= 5000) { G.Profile.award('butterfly'); G.Profile.unlock('influencer', 'You reached 5,000 followers!'); }
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
      if (boss.final) {
        G.Profile.award('megaslayer');
        if (s.stats.bossWins >= 3) G.Profile.unlock('veteran', 'You won every boss battle this season!');
      }
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
      // season-end unlocks
      G.Profile.unlock('grandpa', 'You finished a season!');
      if (s.stats.homesSold < s.rival.homesSold) {
        G.Profile.unlock('rookie', 'You lost the season. The Rookie respects the grind.');
      }
      if (s.stats.followers >= 5000) G.Profile.unlock('influencer', 'You reached 5,000 followers!');
      G.Save.clear();
    } else {
      this.rollWeather();
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
