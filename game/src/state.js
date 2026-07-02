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
  newGame(charId) {
    this.s = {
      charId,
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
      commercialUnlocked: false,
      rivalry: 0,
      dayVolume: 0,
      bigfootToday: false,
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

    // starting pipeline (the Rookie starts with almost nothing)
    if (this.perk() === 'rookie') {
      this.spawnLead('firsttime');
    } else {
      this.spawnLead('facebook');
      this.spawnLead('firsttime');
      this.spawnLead('signcall');
      this.spawnLead(this.char().id === 'malcolm' ? 'lakehome' : 'luxury');
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
    st.commercialUnlocked = st.commercialUnlocked || false;
    st.rivalry = st.rivalry || 0;
    st.dayVolume = st.dayVolume || 0;
    st.bigfootToday = st.bigfootToday || false;
    st.pendingBattle = st.pendingBattle || false;
    st.battleDoneMonth = st.battleDoneMonth ?? -1;
    st.bossPlan = st.bossPlan || [...G.shuffle(G.Data.BOSS_POOL).slice(0, 2), G.Data.FINAL_BOSS];
    st.stats.reputation = st.stats.reputation ?? 50;
    st.stats.commercialDeals = st.stats.commercialDeals ?? 0;
    this.s = st;
    if (!this.s.weather) this.rollWeather();
    return st;
  },

  autosave() { if (this.s && !this.s.seasonOver) G.Save.save(this.s); },

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
      + (this.s.scaleMode > 0 ? 1 : 0)   // Blake's Scale Mode: everything speeds up
      + Math.min(3, this.rookieLevel());
  },

  blakeBuff() {
    if (this.s.scaleMode > 0) return { label: 'SCALE MODE', days: this.s.scaleMode, color: G.C.cyan };
    if (this.s.aiOverdrive > 0) return { label: 'AI OVERDRIVE', days: this.s.aiOverdrive, color: G.C.lime };
    return null;
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
  spawnLead(typeId, opts = {}) {
    const s = this.s;
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
    };
    s.leads.push(lead);
    s.stats.leadsReceived++;
    return lead;
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
    if (toStage === 'active') {
      if (lead.seller) this.s.stats.listings++;
      else this.s.stats.buyers++;
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
        return this.leadsInStage('new', 'hot', 'appt').length
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
    return this.leadsInStage('pending').filter(l => !l.issue && (pre || l.delay <= 0) && l.daysInStage >= 1);
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
    if (this.s.scaleMode > 0) adj += 0.12;   // Scale Mode: higher close chance, faster tasks
    return adj;
  },

  // ----------------------------------------------------------
  // Close a single lead: shared by close action, Brad, commercial
  // ----------------------------------------------------------
  closeLead(l, lines) {
    const s = this.s;
    const rate = l.commercial ? 0.015 : 0.027;
    const comm = Math.round(l.value * rate);
    s.stats.homesSold++;
    s.stats.commission += comm;
    s.cash += comm;
    s.dayVolume += l.value;
    if (l.commercial) s.stats.commercialDeals++;
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
        const targets = this.leadsInStage('new', 'hot');
        const n = Math.min(targets.length, Math.round(score * 3.4));
        lines.push(grade(score) + ' You worked the phones.');
        const picked = G.shuffle(targets).slice(0, Math.max(n, 0));
        for (const l of picked) {
          l.warmth = G.clamp(l.warmth + 20, 0, 100);
          if (l.stage === 'new') { this.advance(l, 'hot'); lines.push(l.name + ' warmed up! (' + l.label + ')'); }
          else { this.advance(l, 'appt'); lines.push(l.name + ' booked an appointment!'); }
        }
        if (!picked.length) lines.push('Straight to voicemail. All of them. Brutal.');
        break;
      }

      case 'text': {
        G.Profile.bump('texts');
        const targets = this.leadsInStage('new', 'hot');
        for (const l of targets) l.warmth = G.clamp(l.warmth + Math.round(15 * score), 0, 100);
        const n = Math.min(targets.length, score >= 0.8 ? 2 : score >= 0.45 ? 1 : 0);
        lines.push(grade(score) + ' Thumbs of fury engaged.');
        const picked = G.shuffle(targets).slice(0, n);
        for (const l of picked) {
          if (l.stage === 'new') { this.advance(l, 'hot'); lines.push(l.name + ' replied with 3 emojis. Warm!'); }
          else { this.advance(l, 'appt'); lines.push(l.name + ' set an appointment by text!'); }
        }
        break;
      }

      case 'followup': {
        G.Profile.bump('coffees');
        G.Profile.load().coffeeVisits++;
        G.Profile.save();
        const targets = this.leadsInStage('new', 'hot', 'appt');
        for (const l of targets) l.warmth = G.clamp(l.warmth + 10, 0, 100);
        s.stats.happiness = G.clamp(s.stats.happiness + 2, 0, 100);
        lines.push(G.choice(G.Data.FLAVOR.followup));
        if (G.Profile.load().coffeeVisits === 10) {
          lines.push('The baristas started your order when your car pulled in. You have ARRIVED.');
          this.addReputation(5);
        }
        lines.push('Your whole pipeline feels appreciated. (+warmth)');
        const hot = this.leadsInStage('hot');
        if (hot.length && G.chance(0.3 + (this.has('crm') ? 0.2 : 0))) {
          const l = this.bestLead(hot);
          this.advance(l, 'appt');
          lines.push(l.name + ' says "ope, yeah, let\'s meet!"');
        }
        break;
      }

      case 'openhouse': {
        let count = Math.round(score * 4)
          + (this.has('marketing') ? 1 : 0)
          + (this.has('goldensigns') ? 1 : 0)
          + (this.has('helicopter') ? 2 : 0);
        count = G.clamp(count, 0, 8);
        lines.push(grade(score) + ' The open house wrapped up.');
        for (let i = 0; i < count; i++) {
          const l = this.spawnLead(G.chance(0.7) ? 'openhouse' : null);
          lines.push('+ NEW LEAD: ' + l.name + ' (' + l.label + ')');
          G.Profile.bump('ohLeads');
        }
        if (!count) lines.push('Only visitor was a neighbor who "just loves floor plans."');
        s.stats.followers += Math.round(20 * score * this.followerGainMult());
        const listings = this.leadsInStage('active').filter(l => l.seller);
        if (listings.length && score > 0.5 && G.chance(0.5)) {
          const l = this.bestLead(listings);
          this.advance(l, 'offer');
          lines.push('An open house guest wrote an offer on ' + l.name + '\'s place!');
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
        let leadChance = score * (this.has('social') ? 0.9 : 0.6);
        if (this.has('youtube')) leadChance += 0.1;
        if (G.chance(leadChance)) {
          const l = this.spawnLead(G.chance(0.5) ? 'facebook' : null);
          lines.push('+ NEW LEAD: ' + l.name + ' saw the video!');
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
        lines.push(grade(score) + ' Tour day!');
        for (const l of picked) {
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
        this.advance(l, 'offer');
        lines.push(G.choice(G.Data.FLAVOR.offer));
        lines.push(l.name + ' (' + G.money(l.value) + ') is now UNDER OFFER.');
        break;
      }

      case 'negotiate': {
        const offers = this.leadsInStage('offer');
        const l = this.bestLead(offers);
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
        // Jeff's Commercial Takeover deal - negotiate minigame result
        const J = G.Data.JEFF;
        const power = G.clamp(score + ch.negotiateBonus, 0, 1);
        if (power >= 0.55) {
          const value = G.randInt(1500000, 6000000);
          const comm = Math.round(value * 0.015 * (this.has('commercialdiv') ? 1.1 : 1));
          s.cash += comm;
          s.stats.commission += comm;
          s.stats.homesSold++;
          s.stats.commercialDeals++;
          s.dayVolume += value;
          sold++;
          lines.push('COMMERCIAL TAKEOVER! ' + G.choice(J.dealLines));
          lines.push('DEAL CLOSED: ' + G.money(value) + ' (+' + G.money(comm) + ' commission!)');
          lines.push('JEFF: "Told you. Cap rates don\'t lie."');
          this.addReputation(5);
          s.jeffCooldown = 3;
          if (s.dayVolume >= 1000000) G.Profile.award('monday');
        } else {
          lines.push('The deal collapsed in due diligence. Jeff shrugged: "Happens. Phase 2 environmental."');
          lines.push('(Come back in a day - he always has another deal.)');
          s.jeffCooldown = 1;
        }
        break;
      }
    }

    return { lines, sold };
  },

  // ----------------------------------------------------------
  // Legendary power-ups: Brad Nolan & Jeff Nobleza
  // ----------------------------------------------------------
  visitBrad() {
    const s = this.s;
    if (s.bradUsed) return { lines: ['Brad is out closing loans. Back tomorrow. His voicemail is just air horns.'], used: true };
    s.bradUsed = true;
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
      s.commercialUnlocked = true;
      const l1 = this.spawnLead('ex1031');
      const lines = [J.name + ' - ' + J.title, ...J.intro, '', ...J.unlockLines,
        '', '+ FIRST LEAD: ' + l1.name + ' needs a 1031 Exchange!'];
      return { unlock: true, lines };
    }
    if (s.jeffCooldown > 0) {
      return { lines: ['JEFF: "Nothing on the desk today. Check back in ' + s.jeffCooldown + ' day(s)."', 'He is studying a blueprint upside down. It still makes him money.'], used: true };
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
    s.blakeCooldown = 3;
    const lines = [B.name + ' - ' + B.title];

    if (G.chance(B.scaleChance)) {
      // ULTIMATE: Scale Mode
      s.scaleMode = Math.max(s.scaleMode, 2);
      s.energy = Math.min(s.energy + 2, this.maxEnergy());
      s.abilityUsed = false; // cooldowns melt
      lines.push(...B.scaleLines);
      for (let i = 0; i < 2; i++) {
        const l = this.spawnLead();
        lines.push('+ LEAD: ' + l.name + ' recruited by the AI swarm!');
      }
      lines.push('', 'SCALE MODE active for 2 days: 2x leads, faster closes, +1 energy, free abilities.');
      G.Profile.award('scalemode');
    } else {
      // SPECIAL: AI Overdrive
      s.aiOverdrive = Math.max(s.aiOverdrive, 3);
      lines.push(...B.intro);
      lines.push('', B.ability + ' DEPLOYED:');
      const twoDrones = G.shuffle(B.drones).slice(0, 2);
      for (const d of twoDrones) lines.push('* ' + d);
      const l = this.spawnLead();
      lines.push('', '+ LEAD: ' + l.name + ' (network effect kicking in)');
      lines.push(G.choice(B.coffee));
      lines.push('', 'AI OVERDRIVE active 3 days: passive leads + income, auto follow-up.');
    }
    lines.push(G.choice(B.lines));
    return { lines };
  },

  // ----------------------------------------------------------
  // Special ability (once per day) - per character
  // ----------------------------------------------------------
  useAbility() {
    const s = this.s;
    if (s.abilityUsed && !(s.scaleMode > 0)) return null;
    if (!(s.scaleMode > 0)) s.abilityUsed = true;
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
      const n = G.randInt(2, 4);
      lines.push('VIRAL VIDEO! "' + G.choice([
        'AGENT RATES EVERY LAKE (PART 7)', 'I SLEPT IN AN ICE HOUSE FOR A LISTING',
        'THE LOON CALL CHALLENGE', 'SELLING A HOUSE IN -30 (GONE WRONG)',
      ]) + '"');
      lines.push('+' + gain + ' FOLLOWERS!');
      for (let i = 0; i < n; i++) {
        const l = this.spawnLead(G.chance(0.4) ? 'lakehome' : 'facebook');
        lines.push('+ LEAD: ' + l.name + ' - "saw your video, had to call!"');
      }
    } else if (s.charId === 'bridger') {
      lines.push('POWER CLOSE! Bridger straightens his tie...');
      const r = advanceBest();
      lines.push(r || '...but there was nobody to close. He closed a car door, powerfully.');
    } else if (perk === 'grandpa') {
      lines.push('THE ROLODEX! Grandpa licks a thumb and flips...');
      for (let i = 0; i < 2; i++) {
        const l = this.spawnLead('pastclient');
        l.warmth = 85;
        lines.push('+ ' + l.name + ' answered on the first ring. Of course they did.');
      }
    } else if (perk === 'influencer') {
      const gain = Math.round(G.randInt(400, 900) * this.followerGainMult());
      s.stats.followers += gain;
      lines.push('GOING LIVE! Chaos. Beautiful chaos.');
      lines.push('+' + gain + ' FOLLOWERS!');
      const n = G.randInt(1, 3);
      for (let i = 0; i < n; i++) {
        const l = this.spawnLead('facebook');
        lines.push('+ LEAD: ' + l.name + ' from the live chat!');
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
    const passiveLines = [];
    s.dayVolume = 0;
    s.bigfootToday = G.chance(0.06);

    // 1. age leads, ghosting, influencer collapse
    for (const l of s.leads.slice()) {
      l.daysInStage++;
      if (l.delay > 0) l.delay--;
      if (!this.has('crm') && (l.stage === 'new' || l.stage === 'hot') && l.daysInStage > 3 && G.chance(0.35)) {
        this.removeLead(l);
        passiveLines.push(l.name + ' ghosted you (they ' + G.choice(G.Data.FLAVOR.ghostReasons) + ').');
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
    if (this.has('crm')) {
      for (const l of this.leadsInStage('new', 'hot')) l.warmth = G.clamp(l.warmth + 5, 0, 100);
    }
    if (this.has('smallOffice')) {
      for (const l of this.leadsInStage('new', 'hot', 'appt')) l.warmth = G.clamp(l.warmth + 2, 0, 100);
    }

    // 2. passive lead sources
    const passiveSpawn = (chanceVal, typeId, msg) => {
      if (G.chance(chanceVal)) {
        const l = this.spawnLead(typeId);
        passiveLines.push(msg.replace('%N', l.name).replace('%T', l.label));
      }
    };
    if (this.has('website')) passiveSpawn(0.35, 'zestimate', 'WEBSITE LEAD: %N filled out your contact form!');
    if (this.has('seo')) passiveSpawn(0.3, 'zestimate', 'SEO LEAD: %N googled "best agent up north" and found YOU.');
    if (this.has('fbads')) passiveSpawn(0.3, 'facebook', 'AD LEAD: %N clicked your Facebook ad!');
    if (this.has('marketing')) passiveSpawn(0.35, null, 'AD LEAD: %N saw your billboard by the DQ!');
    if (this.has('marketingdir')) passiveSpawn(0.45, null, 'YOUR MARKETING DIRECTOR delivered: %N (%T)!');
    if (this.has('downtownOffice')) passiveSpawn(0.3, null, 'WALK-IN: %N wandered into the office. Free lead!');
    if (this.perk() === 'influencer') passiveSpawn(0.8, 'facebook', 'DM LEAD: %N slid into the DMs. As they do.');
    if (s.commercialUnlocked && G.chance(G.Data.JEFF.passiveChance)) {
      passiveSpawn(1, 'ex1031', 'JEFF\'S NETWORK: %N called about a 1031 Exchange!');
    }
    if (G.chance(0.2 + s.stats.followers / 20000)) {
      passiveSpawn(1, null, 'NEW LEAD: %N (%T) reached out!');
    }
    if (this.has('youtube')) s.stats.followers += 50;
    if (this.has('retreat')) {
      s.stats.happiness = G.clamp(s.stats.happiness + 2, 0, 100);
      if (G.chance(0.1)) { passiveSpawn(1, 'referral', 'RETREAT MAGIC: %N was referred after a weekend at your cabin!'); s.stats.referrals++; }
    }

    // 3. photographer: listings attract offers passively
    if (this.has('photographer')) {
      for (const l of this.leadsInStage('active').filter(x => x.seller && x.daysInStage >= 2)) {
        if (G.chance(0.4)) {
          this.advance(l, 'offer');
          passiveLines.push('Those pro photos worked: an offer came in on ' + l.name + '\'s place!');
        }
      }
    }

    // 3b. BLAKE SUDDATH buffs: AI Overdrive / Scale Mode + Network Effect
    if (s.scaleMode > 0 || s.aiOverdrive > 0) {
      const scaling = s.scaleMode > 0;
      const drones = scaling ? 2 : 1;                 // AI-sourced leads
      for (let i = 0; i < drones; i++) {
        if (G.chance(scaling ? 0.9 : 0.6)) passiveSpawn(1, null, "BLAKE'S AI SOURCED A LEAD: %N (%T)!");
      }
      // auto follow-up (CRM Sync / Daily Discipline style)
      for (const l of this.leadsInStage('new', 'hot', 'appt')) l.warmth = G.clamp(l.warmth + (scaling ? 12 : 8), 0, 100);
      // passive income (AI drones earning referral fees / marketing)
      const income = scaling ? 2000 : 800;
      s.cash += income; s.stats.commission += income;
      // Network Effect: leads multiply
      if (G.chance(scaling ? 0.6 : 0.35)) {
        const r = this.spawnLead('referral'); s.stats.referrals++; G.Profile.bump('referrals');
        passiveLines.push('NETWORK EFFECT: ' + r.name + ' was introduced by someone Blake connected you with!');
      }
      passiveLines.push((scaling ? 'SCALE MODE' : 'AI OVERDRIVE') + ': AI drones worked overnight (+' + G.money(income) + ' passive).');
      if (scaling) { s.scaleMode--; if (s.scaleMode === 0) passiveLines.push('Scale Mode wound down. The dashboards fade.'); }
      else { s.aiOverdrive--; if (s.aiOverdrive === 0) passiveLines.push('AI Overdrive ended. The drones return to the backpack.'); }
    }

    // 4. rival AI + trash talk scaled by rivalry
    const rivalLines = [];
    const rc = this.rivalChar();
    const closeChance = 0.42 + s.month * 0.1;
    let rivalCloses = G.chance(closeChance) ? 1 : 0;
    if (G.chance(0.08)) rivalCloses++;
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

    // 5. random event: easter eggs are rare and checked first
    let eventText = null, eventGood = null;
    if (G.chance(0.05)) {
      const ev = G.choice(G.Data.EASTER_EGGS);
      const extra = this.applyEventFx(ev.fx);
      if (extra !== false) { eventText = ev.text + (extra ? ' ' + extra : ''); eventGood = true; }
    }
    if (!eventText && G.chance(0.6)) {
      if (G.chance(0.5)) {
        const ev = G.choice(G.Data.OBSTACLES);
        const extra = this.applyEventFx(ev.fx);
        if (extra !== false) { eventText = ev.text + (extra ? ' ' + extra : ''); eventGood = false; }
      } else {
        const ev = G.choice(G.Data.FUNNY_EVENTS);
        const extra = this.applyEventFx(ev.fx);
        if (extra !== false) { eventText = ev.text + (extra ? ' ' + extra : ''); eventGood = true; }
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
    s.energy = this.maxEnergy() - (s.effects.snowTomorrow ? 1 : 0);
    if (s.effects.snowTomorrow) passiveLines.push('You lost an hour shoveling the driveway. (-1 energy)');
    s.effects.snowTomorrow = false;
    s.effects.preapproved = false;
    s.abilityUsed = false;
    s.bradUsed = false;
    if (s.jeffCooldown > 0) s.jeffCooldown--;
    const weatherLines = this.rollWeather();
    passiveLines.push(...weatherLines);

    this.autosave();
    return { eventText, eventGood, rivalLines, passiveLines, bossTime, battleTime: s.pendingBattle };
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
        l.warmth = 80;
        l.stage = 'hot';
        return '(' + l.name + ' is HOT to list)';
      }
      case 'leadFrenzy': {
        const n = G.randInt(2, 3);
        for (let i = 0; i < n; i++) this.spawnLead(G.chance(0.6) ? 'lakehome' : 'cabin');
        return '(+' + n + ' lake-crazed leads!)';
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
      case 'sellerLead': this.spawnLead(G.chance(0.5) ? 'fsbo' : 'expired'); return '';
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
        l.warmth = 80;
        l.stage = 'hot';
        return '(' + l.name + ' is HOT)';
      }
      case 'referralLead': {
        this.spawnLead('referral');
        s.stats.referrals++;
        G.Profile.bump('referrals');
        return '';
      }
      // easter eggs
      case 'bunyanReferral': {
        const l = this.spawnLead(this.commercialOk() ? 'dev100' : 'farm');
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
      for (let i = 0; i < boss.reward.leads; i++) this.spawnLead();
      s.stats.happiness = G.clamp(s.stats.happiness + 8, 0, 100);
      this.addReputation(6);
      lines.push('YOU BEAT ' + boss.name + '!');
      lines.push('+' + G.money(boss.reward.cash) + ' bonus, +' + boss.reward.leads + ' leads, +followers!');
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
      const l = this.spawnLead(G.chance(0.5) ? 'luxury' : 'lakedev');
      l.stage = 'active';
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
