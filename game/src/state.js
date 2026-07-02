// ============================================================
// state.js - game state, lead pipeline, action resolution,
//            rival AI, day/season progression
// ============================================================
'use strict';

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
      bossIndex: 0,
      seasonOver: false,
      effects: { snowTomorrow: false },
      stats: {
        homesSold: 0, commission: 0, listings: 0, buyers: 0,
        referrals: 0, reviews: 5, followers: 120, happiness: 70,
        leadsReceived: 0, bossWins: 0,
      },
      rival: { homesSold: 0, commission: 0, followers: 150 },
      leads: [],
      upgrades: {},
      log: [],
    };
    // starting pipeline
    this.spawnLead('facebook');
    this.spawnLead('firsttime');
    this.spawnLead('signcall');
    this.spawnLead(this.char().id === 'malcolm' ? 'lakehome' : 'luxury');
    this.pushLog('Season started. Go get \'em!');
    return this.s;
  },

  loadGame() {
    const st = G.Save.load();
    if (st) this.s = st;
    return st;
  },

  autosave() { if (this.s && !this.s.seasonOver) G.Save.save(this.s); },

  // ----------------------------------------------------------
  char() { return G.Data.CHARACTERS[this.s.charId]; },
  rivalChar() { return G.Data.CHARACTERS[this.s.charId === 'malcolm' ? 'bridger' : 'malcolm']; },
  has(up) { return !!this.s.upgrades[up]; },
  maxEnergy() { return G.Data.SEASON.baseEnergy + (this.has('ai') ? 1 : 0); },
  totalDay() { return this.s.month * G.Data.SEASON.daysPerMonth + this.s.dayOfMonth; },
  totalDays() { return G.Data.SEASON.months.length * G.Data.SEASON.daysPerMonth; },
  monthName() { return G.Data.SEASON.months[this.s.month]; },

  pushLog(msg) {
    this.s.log.unshift(msg);
    if (this.s.log.length > 40) this.s.log.pop();
  },

  conversionRate() {
    const st = this.s.stats;
    return st.leadsReceived > 0 ? st.homesSold / st.leadsReceived : 0;
  },

  followerGainMult() {
    let m = 1;
    if (this.has('camera')) m *= 1.5;
    if (this.has('social')) m *= 2;
    return m;
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
      const weighted = G.Data.LEAD_TYPES.map(t => ({
        ...t,
        weight: (t.weight || 1) * (t.lake ? ch.lakeLeadWeight : 1),
      }));
      type = G.weightedChoice(weighted);
    }
    let value = G.randInt(type.value[0], type.value[1]);
    if (type.luxury && this.char().luxuryValueBonus) {
      value = Math.round(value * (1 + this.char().luxuryValueBonus));
    }
    const lead = {
      id: ++s.leadSeq,
      name: G.choice(G.Data.LEAD_NAMES),
      type: type.id,
      label: type.label,
      seller: !!type.seller,
      lake: !!type.lake,
      luxury: !!type.luxury,
      value,
      warmth: G.clamp(type.warmth + G.randInt(-10, 10), 5, 95),
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

  // Most advanced lead first, warm ones preferred
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
  // Action availability (so the menu can grey out useless picks)
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
    // buyers who found "the one" (active + toured a bit) or listings with buyer interest
    return this.leadsInStage('active').filter(l => {
      if (l.seller) {
        const wait = this.has('photographer') ? 0 : 1;
        return l.daysInStage >= wait + (l.overpriced ? 2 : 0);
      }
      return true;
    });
  },

  closableLeads() {
    return this.leadsInStage('pending').filter(l => !l.issue && l.delay <= 0 && l.daysInStage >= 1);
  },

  // ----------------------------------------------------------
  // Perform an action. score: 0..1 from a minigame (or null for instant)
  // Returns { lines: [], sold: n } for the results popup.
  // ----------------------------------------------------------
  performAction(id, score) {
    const s = this.s;
    const ch = this.char();
    s.energy -= this.actionCost(id);
    const lines = [];
    let sold = 0;

    const grade = (sc) => sc >= 0.85 ? 'PERFECT!' : sc >= 0.6 ? 'GREAT!' : sc >= 0.35 ? 'OKAY.' : 'ROUGH...';

    switch (id) {
      case 'call': {
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
        const targets = this.leadsInStage('new', 'hot', 'appt');
        for (const l of targets) l.warmth = G.clamp(l.warmth + 10, 0, 100);
        s.stats.happiness = G.clamp(s.stats.happiness + 2, 0, 100);
        lines.push(G.choice(G.Data.FLAVOR.followup));
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
        let count = Math.round(score * 4) + (this.has('marketing') ? 1 : 0);
        count = G.clamp(count, 0, 6);
        lines.push(grade(score) + ' The open house wrapped up.');
        for (let i = 0; i < count; i++) {
          const l = this.spawnLead(G.chance(0.7) ? 'openhouse' : null);
          lines.push('+ NEW LEAD: ' + l.name + ' (' + l.label + ')');
        }
        if (!count) lines.push('Only visitor was a neighbor who "just loves floor plans."');
        s.stats.followers += Math.round(20 * score * this.followerGainMult());
        // buyer interest in your listings
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
        const leadChance = score * (this.has('social') ? 0.9 : 0.6);
        if (G.chance(leadChance)) {
          const l = this.spawnLead(G.chance(0.5) ? 'facebook' : null);
          lines.push('+ NEW LEAD: ' + l.name + ' saw the video!');
        }
        if (score >= 0.9 && G.chance(0.5)) {
          const extra = Math.round(600 * this.followerGainMult());
          s.stats.followers += extra;
          lines.push('IT\'S TRENDING LOCALLY! +' + extra + ' bonus followers!');
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
        const power = G.clamp(score + ch.negotiateBonus, 0, 1);
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
          this.advance(l, 'closed');
          const comm = Math.round(l.value * 0.027);
          s.stats.homesSold++;
          s.stats.commission += comm;
          s.cash += comm;
          sold++;
          lines.push('SOLD! ' + l.name + ' - ' + G.money(l.value) + ' (+' + G.money(comm) + ' commission)');
          s.stats.happiness = G.clamp(s.stats.happiness + 4, 0, 100);
          if (G.chance(0.5)) { s.stats.reviews++; lines.push('+ 5-STAR REVIEW: "' + G.choice([
            'Sold our place in a weekend, dontcha know!', 'Best agent north of Brainerd.',
            'They brought bars to closing. BARS.', '10/10 would house again.',
          ]) + '"'); }
          if (G.chance(0.35 + s.stats.happiness / 400)) {
            const r = this.spawnLead('referral');
            s.stats.referrals++;
            lines.push('+ REFERRAL: they told ' + r.name + ' about you!');
          }
          this.removeLead(l); // keep list tidy; stats carry the record
        }
        lines.unshift(G.choice(G.Data.FLAVOR.close));
        break;
      }
    }

    return { lines, sold };
  },

  // ----------------------------------------------------------
  // Special ability (once per day)
  // ----------------------------------------------------------
  useAbility() {
    const s = this.s;
    if (s.abilityUsed) return null;
    s.abilityUsed = true;
    const lines = [];
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
    } else {
      // Bridger: advance the best advanceable lead one stage
      const pick =
        this.bestLead(this.leadsInStage('pending').filter(l => l.issue)) ||
        this.bestLead(this.leadsInStage('offer')) ||
        this.bestLead(this.offerReadyLeads()) ||
        this.bestLead(this.leadsInStage('appt')) ||
        this.bestLead(this.leadsInStage('hot')) ||
        this.bestLead(this.leadsInStage('new'));
      lines.push('POWER CLOSE! Bridger straightens his tie...');
      if (!pick) {
        lines.push('...but there was nobody to close. He closed a car door, powerfully.');
      } else if (pick.stage === 'pending' && pick.issue) {
        pick.issue = false;
        lines.push('He talked the buyer PAST the inspection report. Issue waived!');
      } else {
        const next = { new: 'hot', hot: 'appt', appt: 'active', active: 'offer', offer: 'pending' }[pick.stage];
        this.advance(pick, next);
        lines.push(pick.name + ' never stood a chance. Now: ' + G.Data.STAGE_LABELS[next] + '.');
      }
    }
    G.Audio.ability();
    return { lines };
  },

  // ----------------------------------------------------------
  // Upgrades
  // ----------------------------------------------------------
  buyUpgrade(id) {
    const up = G.Data.UPGRADES.find(u => u.id === id);
    if (!up || this.has(id) || this.s.cash < up.cost) return false;
    this.s.cash -= up.cost;
    this.s.upgrades[id] = true;
    if (id === 'ai') this.s.energy = Math.min(this.s.energy + 1, this.maxEnergy());
    this.pushLog('Bought ' + up.name + '!');
    return true;
  },

  // ----------------------------------------------------------
  // End of day: aging, passive leads, rival AI, random events
  // Returns { eventText, eventGood, rivalLines, passiveLines, bossTime, seasonOver }
  // ----------------------------------------------------------
  endDay() {
    const s = this.s;
    const passiveLines = [];

    // 1. age leads, ghosting
    for (const l of s.leads.slice()) {
      l.daysInStage++;
      if (l.delay > 0) l.delay--;
      if (!this.has('crm') && (l.stage === 'new' || l.stage === 'hot') && l.daysInStage > 3 && G.chance(0.35)) {
        this.removeLead(l);
        passiveLines.push(l.name + ' ghosted you (they ' + G.choice(G.Data.FLAVOR.ghostReasons) + ').');
      }
    }
    if (this.has('crm')) {
      for (const l of this.leadsInStage('new', 'hot')) l.warmth = G.clamp(l.warmth + 5, 0, 100);
    }

    // 2. passive lead sources
    if (this.has('website') && G.chance(0.35)) {
      const l = this.spawnLead('zestimate');
      passiveLines.push('WEBSITE LEAD: ' + l.name + ' filled out your contact form!');
    }
    if (this.has('marketing') && G.chance(0.35)) {
      const l = this.spawnLead();
      passiveLines.push('AD LEAD: ' + l.name + ' saw your billboard by the DQ!');
    }
    if (G.chance(0.2 + s.stats.followers / 20000)) {
      const l = this.spawnLead();
      passiveLines.push('NEW LEAD: ' + l.name + ' (' + l.label + ') reached out!');
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

    // 4. rival AI
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
    if (!rivalCloses && G.chance(0.5)) {
      rivalLines.push(rc.name + ' ' + G.choice([
        'spent all day arguing in a Facebook group.', 'got a flat tire on the logging road.',
        'is "rebranding." Again.', 'held an open house. One guy came for the cookies.',
        'left a voicemail 4 minutes long.',
      ]));
    }

    // 5. random event
    let eventText = null, eventGood = null;
    if (G.chance(0.6)) {
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

    // 6. advance calendar
    let bossTime = false;
    s.dayOfMonth++;
    if (s.dayOfMonth > G.Data.SEASON.daysPerMonth) {
      bossTime = true;
      s.pendingBoss = true;
    }

    // 7. reset energy
    s.energy = this.maxEnergy() - (s.effects.snowTomorrow ? 1 : 0);
    if (s.effects.snowTomorrow) passiveLines.push('You lost an hour shoveling the driveway. (-1 energy)');
    s.effects.snowTomorrow = false;
    s.abilityUsed = false;

    this.autosave();
    return { eventText, eventGood, rivalLines, passiveLines, bossTime };
  },

  // Returns extra text ('' ok), or false if the event fizzled (no valid target)
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
        return '(' + l.name + ' - gone!)';
      }
      case 'rateJump':
        for (const l of s.leads) if (!l.seller && l.stage !== 'closed') l.value = Math.round(l.value * 0.95);
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
      // funny (good) events
      case 'happy5': s.stats.happiness = G.clamp(s.stats.happiness + 5, 0, 100); return '';
      case 'happy10': s.stats.happiness = G.clamp(s.stats.happiness + 10, 0, 100); return '';
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
        return '';
      }
    }
    return '';
  },

  // ----------------------------------------------------------
  // Boss resolution
  // ----------------------------------------------------------
  currentBoss() { return G.Data.BOSSES[Math.min(this.s.bossIndex, G.Data.BOSSES.length - 1)]; },

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
      lines.push('YOU BEAT ' + boss.name + '!');
      lines.push('+' + G.money(boss.reward.cash) + ' bonus, +' + boss.reward.leads + ' leads, +followers!');
    } else {
      s.rival.homesSold++;
      s.stats.happiness = G.clamp(s.stats.happiness - 6, 0, 100);
      lines.push(boss.name + ' takes the round...');
      lines.push('They win a listing you wanted. It stings.');
    }
    // advance month
    s.pendingBoss = false;
    s.bossIndex++;
    s.month++;
    s.dayOfMonth = 1;
    if (s.month >= G.Data.SEASON.months.length) {
      s.seasonOver = true;
      G.Save.clear();
    } else {
      this.autosave();
    }
    return { lines, seasonOver: s.seasonOver };
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
      st.bossWins * 750 +
      st.referrals * 100
    );
  },

  playerWon() { return this.s.stats.homesSold > this.s.rival.homesSold; },
  tied() { return this.s.stats.homesSold === this.s.rival.homesSold; },
};
