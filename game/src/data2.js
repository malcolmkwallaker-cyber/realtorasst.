// ============================================================
// data2.js - EXPANSION content: legendary power-ups, secret
// characters, new leads/events/bosses, weather, achievements,
// office & toys, easter eggs, rivalry system data.
// Loaded after data.js; extends G.Data in place.
// ============================================================
'use strict';

(function expand() {
  const D = G.Data;

  // ----------------------------------------------------------
  // Legendary character power-ups
  // ----------------------------------------------------------
  D.BRAD = {
    name: 'BRAD NOLAN',
    title: 'THE MORTGAGE WIZARD',
    sprite: 'bradNolan',
    ability: 'CLEAR TO CLOSE',
    rare: 'WEEKEND UNDERWRITING',
    intro: [
      'Local lending legend. His rate sheet glows.',
      'He pulls out a GOLDEN LOAN FOLDER.',
      'Paperwork flies everywhere.',
    ],
    lines: [
      '"They\'re pre-approved. They were pre-approved before they called."',
      '"Financing contingency? Expired. I underwrote it in the parking lot."',
      '"Send me the inspection report. I eat inspection reports."',
      '"Rates? Locked. Vibes? Immaculate."',
    ],
    rareLine: 'WEEKEND UNDERWRITING!! "Every pending deal closes before Monday. Tell no one how."',
    rareChance: 0.12,
  };

  D.JEFF = {
    name: 'JEFF NOBLEZA',
    title: 'THE COMMERCIAL KING',
    sprite: 'jeffNobleza',
    ability: 'COMMERCIAL TAKEOVER',
    intro: [
      'Commercial real estate royalty.',
      'He arrives in a suit carrying blueprints.',
      'Commercial buildings RISE FROM THE GROUND.',
    ],
    unlockLines: [
      'JEFF: "Residential is cute. Let me show you CAP RATES."',
      'COMMERCIAL DIVISION UNLOCKED!',
      'New deals: apartments, retail, offices, warehouses,',
      'industrial parks, investment portfolios. 5-20x commissions.',
    ],
    dealLines: [
      '"I have a strip mall. It prints money. You want in?"',
      '"Warehouse. 40,000 square feet. The tenant is a pickle company."',
      '"Apartment complex. 24 doors. The roof is... a journey."',
      '"Office building. Half vacant, fully charming."',
    ],
    passiveChance: 0.03, // 1031 exchange investor calls
  };

  D.BLAKE = {
    name: 'BLAKE SUDDATH',
    title: 'THE GROWTH GURU',
    sprite: 'blakeSuddath',
    ability: 'AI OVERDRIVE',
    ultimate: 'SCALE MODE',
    scaleChance: 0.08, // chance a visit rolls the ultimate instead
    talkChance: 0.07,  // RARE: the 22-minute parking lot talk
    talkDays: 6,
    intro: [
      'Mentor. Rival. Power-up vendor. All at 100 mph.',
      'Laptop in one hand, phone in the other, earbuds in,',
      'coffee that never empties. Holographic charts orbit him.',
      'The most POSITIVE man in real estate. He believes in you',
      'harder than you believe in yourself. It\'s a little scary.',
    ],
    // AI Overdrive drone flavor
    drones: [
      'FOLLOW-UP DRONE nudging your whole pipeline...',
      'CONTENT CANNON firing viral videos across the map...',
      'CRM SYNC organizing every old lead...',
      'SCHEDULER BOT booking appointments...',
      'COPY BOT writing listing descriptions...',
      'GEO BOOSTER spawning clients online...',
    ],
    lines: [
      '"Work smarter, not harder."',
      '"Let\'s automate that."',
      '"Scale beats hustle."',
      '"Your next client is already looking for you."',
      '"If AI can do it, why are you doing it?"',
      '"You\'re ONE follow-up away. You\'ve ALWAYS been one follow-up away."',
      '"Reps. Volume. Outcomes. In that order. LET\'S GO."',
      '"Nobody\'s coming to save your pipeline. GOOD. More reps for you."',
      '"Average agents wait for leads. YOU manufacture them."',
      '"Motivation fades. Systems don\'t. Lucky you - you\'ve got BOTH."',
    ],
    coffee: [
      '*sips the coffee that never empties*',
      '*already testing a newer AI tool mid-sentence*',
      '*a holographic funnel chart rotates behind him*',
    ],
    scaleLines: [
      'SCALE MODE ENGAGED!! The backpack of AI gadgets OPENS.',
      'A swarm of AI agents deploys. Everything speeds up.',
      'Leads double. Deals close faster. Cooldowns melt.',
    ],
    // RARE power-up find (submitted by the real Blake): pure analog belief
    talkLines: [
      '*** RARE POWER-UP FIND ***',
      'THE 22-MINUTE PARKING LOT TALK',
      '',
      'Blake catches you by your car. Laptop CLOSED. Earbuds OUT.',
      'No slides. No funnels. Just 22 straight minutes of belief,',
      'delivered at full volume in a light drizzle.',
      '"Volume beats talent! Talent that DOES volume is UNSTOPPABLE!',
      'WHO\'S GONNA CARRY THE LISTINGS?! YOU ARE! LOOK AT YOU!"',
      'You could cold-call a blizzard right now.',
      '',
      'MOTIVATION +100% for a quarter*  (*balance team: 6 days)',
      '+1 max energy every morning, and every task runs hotter.',
    ],
  };

  D.TYLER = {
    name: 'TYLER LEWIS',
    title: 'THE SYSTEMS ARCHITECT',
    sprite: 'tylerLewis',
    overrideChance: 0.06,   // requires tier 3
    engineChance: 0.12,     // requires tier 2
    intro: [
      'Calm. Analytical. Builds the system once, then leverages it.',
      'A glowing tablet controls his digital assistants; his smartwatch',
      'streams analytics. Floating dashboards hum around him.',
    ],
    scanLines: [
      'CIRQL SCAN: a holographic radar sweeps the whole map...',
      '- forgotten past clients light up',
      '- warm leads highlighted',
      '- referral opportunities revealed',
      '- a hidden listing appointment surfaces',
    ],
    engineLines: [
      'OPEN HOUSE ENGINE deployed. Visitors keep arriving on their own,',
      'generating buyer leads, seller leads, and referrals for days.',
    ],
    overrideLines: [
      'SYSTEM OVERRIDE!! Every follow-up automates. Paperwork completes',
      'itself. The CRM organizes. Referrals double. Passive income climbs.',
    ],
    lines: [
      '"The basics always win."',
      '"Build the system once."',
      '"Consistency beats intensity."',
      '"Automation creates freedom."',
      '"Your CRM should work harder than you do."',
    ],
  };

  // ----------------------------------------------------------
  // Secret characters (unlockable, playable)
  // ----------------------------------------------------------
  D.SECRET_CHARACTERS = {
    grandpa: {
      id: 'grandpa', name: 'GRANDPA REALTOR', title: 'The Handshake', secret: true,
      color: G.C.slate, accent: G.C.yellow, sprite: 'grandpa',
      bio: ['Has never used technology. Will never use technology.',
        'Runs a 100% referral business powered by firm',
        'handshakes and 60 years of favors.'],
      strengths: ['2x REFERRALS', 'WARMER LEADS', 'NO VIDEOS (EVER)'],
      ability: { name: 'THE ROLODEX', desc: 'Grandpa flips the sacred Rolodex. Two past clients call immediately. Once per day.' },
      videoBonus: -1, openHouseBonus: 0.05, lakeLeadWeight: 1, negotiateBonus: 0.1, listingBonus: 0.1, luxuryValueBonus: 0,
      perk: 'grandpa',
      unlockHint: 'FINISH A SEASON',
    },
    influencer: {
      id: 'influencer', name: 'THE INFLUENCER', title: 'Ring Light Royalty', secret: true,
      color: '#c2478f', accent: G.C.cyan, sprite: 'influencer',
      bio: ['Does not know what a contract is. Gets endless',
        'leads anyway. HIRE A TRANSACTION COORDINATOR',
        'IMMEDIATELY or pending deals will evaporate.'],
      strengths: ['ENDLESS LEADS', 'VIDEO +35%', 'DEALS COLLAPSE W/O TC'],
      ability: { name: 'GO LIVE', desc: 'Start a chaotic livestream. Followers and leads pour in. Once per day.' },
      videoBonus: 0.35, openHouseBonus: 0.1, lakeLeadWeight: 1, negotiateBonus: -0.1, listingBonus: 0, luxuryValueBonus: 0,
      perk: 'influencer',
      unlockHint: 'REACH 5,000 FOLLOWERS',
    },
    veteran: {
      id: 'veteran', name: 'THE VETERAN', title: '30 Years In', secret: true,
      color: G.C.teal, accent: G.C.white, sprite: 'veteran',
      bio: ['Thirty years of listings. Wins almost every',
        'presentation. Thinks social media is "a CB',
        'radio for people who hate money."'],
      strengths: ['LISTING PITCH +35%', 'NEGOTIATE +15%', 'HATES SOCIAL MEDIA'],
      ability: { name: 'WAR STORY', desc: 'Tell the 1994 blizzard closing story. A client is moved to action. Once per day.' },
      videoBonus: -0.3, openHouseBonus: 0, lakeLeadWeight: 1, negotiateBonus: 0.15, listingBonus: 0.35, luxuryValueBonus: 0.1,
      perk: 'veteran',
      unlockHint: 'WIN ALL 3 BOSS BATTLES IN ONE SEASON',
    },
    rookie: {
      id: 'rookie', name: 'THE ROOKIE', title: 'Day One Energy', secret: true,
      color: G.C.orange, accent: G.C.lime, sprite: 'rookie',
      bio: ['Starts broke. One lead. A dream. Levels up',
        'absurdly fast - every 3 closings makes them',
        'permanently better at everything.'],
      strengths: ['LEVELS UP FAST', '+ENERGY PER 3 SALES', 'STARTS WITH NOTHING'],
      ability: { name: 'HUSTLE', desc: 'Pure rookie hustle. A random lead advances a stage. Once per day.' },
      videoBonus: 0, openHouseBonus: 0, lakeLeadWeight: 1, negotiateBonus: 0, listingBonus: 0, luxuryValueBonus: 0,
      perk: 'rookie',
      unlockHint: 'LOSE A SEASON (IT BUILDS CHARACTER)',
    },
    blake: {
      id: 'blake', name: 'BLAKE SUDDATH', title: 'The Growth Guru', secret: true,
      color: G.C.teal, accent: G.C.cyan, sprite: 'blakeSuddath',
      bio: ['High-energy growth strategist. Deploys AI to do the',
        'busywork and generate passive leads - but runs entirely',
        'on coffee, and drags to a crawl the moment it runs dry.'],
      strengths: ['AI PASSIVE LEADS', 'VIDEO +15%, FOLLOWERS +25%', 'COFFEE-POWERED (WEAKNESS)'],
      ability: { name: 'AI OVERDRIVE', desc: 'Deploy AI drones: instant leads + a follower spike, plus 2 days of passive AI lead-gen. Once per day.' },
      videoBonus: 0.15, openHouseBonus: 0, lakeLeadWeight: 1, negotiateBonus: 0, listingBonus: 0, luxuryValueBonus: 0,
      perk: 'blake',
      unlockHint: "TRIGGER BLAKE'S SCALE MODE AT THE LAB",
    },
    tyler: {
      id: 'tyler', name: 'TYLER LEWIS', title: 'The Systems Architect', secret: true,
      color: G.C.sky, accent: G.C.cyan, sprite: 'tylerLewis',
      bio: ['Calm systems builder. WEAK EARLY - his automations need',
        'a few days to gain momentum - but Daily Discipline compounds',
        'until he is one of the strongest agents late in the season.'],
      strengths: ['COMPOUNDING SYSTEMS', 'DAILY DISCIPLINE (SCALES)', 'WEAK EARLY / STRONG LATE'],
      ability: { name: 'SYSTEM OVERRIDE', desc: 'Automate the night: auto follow-up, a lead advances, referrals spike. Grows stronger as your systems build. Once per day.' },
      videoBonus: 0, openHouseBonus: 0.1, lakeLeadWeight: 1, negotiateBonus: 0.05, listingBonus: 0.1, luxuryValueBonus: 0,
      perk: 'tyler',
      unlockHint: "TRIGGER TYLER'S SYSTEM OVERRIDE AT THE LAB",
    },
  };
  Object.assign(D.CHARACTERS, D.SECRET_CHARACTERS);

  // ----------------------------------------------------------
  // New lead types (commercial gated behind the Commercial Division)
  // ----------------------------------------------------------
  const L = (id, label, seller, lo, hi, warmth, weight, flags = {}) =>
    ({ id, label, seller, value: [lo, hi], warmth, weight, ...flags });

  D.LEAD_TYPES.push(
    L('divorce',    'DIVORCE SALE',          true,  160000, 340000, 30, 0.8),
    L('estate',     'ESTATE SALE',           true,  140000, 320000, 40, 0.8),
    L('probate',    'PROBATE',               true,  120000, 300000, 25, 0.6),
    L('corprelo',   'CORPORATE RELO',        false, 250000, 500000, 60, 0.7, { relo: true }),
    L('milrelo',    'MILITARY RELO',         false, 200000, 400000, 65, 0.6, { relo: true }),
    L('vacation',   'VACATION HOME BUYER',   false, 250000, 600000, 45, 0.7, { lake: true }),
    L('cabininv',   'CABIN INVESTOR',        false, 150000, 350000, 40, 0.7, { lake: true }),
    L('lakedev',    'LAKEFRONT DEVELOPER',   false, 500000, 1200000, 35, 0.4, { lake: true, luxury: true }),
    L('builder',    'BUILDER',               false, 100000, 250000, 45, 0.6),
    L('landdev',    'LAND DEVELOPER',        false, 300000, 900000, 30, 0.4, { outdoors: true }),
    L('outofstate', 'OUT-OF-STATE BUYER',    false, 200000, 450000, 50, 0.7, { relo: true }),
    L('downsizing', 'DOWNSIZING COUPLE',     true,  180000, 380000, 55, 0.7),
    L('celeb',      'LUXURY CELEBRITY',      false, 900000, 2500000, 25, 0.25, { luxury: true, relo: true }),
    L('athlete',    'PRO ATHLETE',           false, 800000, 2000000, 30, 0.25, { luxury: true, relo: true }),
    L('doctor',     'DOCTOR',                false, 400000, 900000, 45, 0.5),
    L('dentist',    'DENTIST',               false, 350000, 800000, 45, 0.5),
    L('airbnbinv',  'AIRBNB INVESTOR',       false, 200000, 500000, 40, 0.6),
    L('vrinv',      'VACAY RENTAL INVESTOR', false, 250000, 550000, 40, 0.5, { lake: true }),
    L('hunting',    'HUNTING LAND BUYER',    false, 120000, 300000, 45, 0.6, { outdoors: true }),
    L('fishcabin',  'FISHING CABIN BUYER',   false, 130000, 320000, 50, 0.7, { lake: true, outdoors: true }),
    L('farm',       'FARM BUYER',            false, 300000, 800000, 35, 0.4, { outdoors: true }),
    L('apartment',  'APARTMENT COMPLEX',     true,  1500000, 5000000, 35, 0.6, { commercial: true }),
    L('retail',     'RETAIL CENTER',         true,  1200000, 4000000, 35, 0.6, { commercial: true }),
    L('officebldg', 'OFFICE BUILDING',       true,  1000000, 3500000, 30, 0.5, { commercial: true }),
    L('warehouse',  'WAREHOUSE',             false, 800000, 2500000, 40, 0.6, { commercial: true }),
    L('industrial', 'INDUSTRIAL PARK',       true,  2000000, 6000000, 25, 0.4, { commercial: true }),
    L('portfolio',  'INVESTMENT PORTFOLIO',  false, 2500000, 8000000, 30, 0.3, { commercial: true }),
    L('ex1031',     '1031 EXCHANGE',         false, 900000, 3000000, 60, 0.5, { commercial: true }),
    L('church',     'CHURCH',                false, 200000, 600000, 50, 0.4, { commercial: true }),
    L('schooldist', 'SCHOOL DISTRICT',       false, 300000, 900000, 40, 0.3, { commercial: true }),
    L('comtenant',  'COMMERCIAL TENANT',     false, 150000, 400000, 45, 0.5, { commercial: true }),
    L('restaurant', 'RESTAURANT OWNER',      false, 250000, 700000, 40, 0.5, { commercial: true }),
    L('coffeeinv',  'COFFEE SHOP INVESTOR',  false, 200000, 500000, 45, 0.5, { commercial: true }),
    L('dev100',     '100-ACRE DEVELOPER',    false, 1000000, 3000000, 25, 0.3, { commercial: true }),
  );

  // ----------------------------------------------------------
  // New random events
  // ----------------------------------------------------------
  D.OBSTACLES.push(
    { id: 'changemind', w: 0.6, text: 'BUYER CHANGED THEIR MIND! "We prayed on it and we\'re gonna keep renting." A pending deal falls back a stage.', fx: 'coldFeet' },
    { id: 'raccoons',   w: 0.6, text: 'INSPECTION FOUND RACCOONS. A whole family. They have opinions about the attic. A pending deal needs repairs.', fx: 'inspectionIssue' },
    { id: 'refuseclean', w: 1.0, text: 'SELLER REFUSES TO CLEAN. "Buyers should see the POTENTIAL." The potential smells like walleye. A deal loses 5% value.', fx: 'valueHit5' },
    { id: 'flood',      w: 0.2, text: 'HOUSE FLOODED! The basement is now "lake-adjacent" in the worst way. A deal takes a 15% hit and needs repairs.', fx: 'floodHit' },
    { id: 'wellfails',  w: 0.6, text: 'THE WELL FAILED. The water is technically chewable. A pending deal needs repairs.', fx: 'inspectionIssue' },
    { id: 'septic',     w: 0.2, text: 'SEPTIC FAILED THE TEST. Nobody wants to talk about why. A deal loses 10% and needs repairs.', fx: 'septicHit' },
    { id: 'mosquito',   w: 1.0, text: 'MOSQUITO SWARM AT THE SHOWING. The state bird of Minnesota claims another victim. -3 happiness.', fx: 'unhappy3' },
    { id: 'mowing',     w: 1.0, text: 'THE NEIGHBOR STARTED MOWING DURING YOUR SHOWING. For two hours. One lawn. -2 happiness.', fx: 'unhappy2' },
    { id: 'powerout',   w: 1.0, text: 'POWER WENT OUT DURING A SHOWING. You toured by phone flashlight. "Cozy," said nobody. Buyers cool off.', fx: 'buyersCool' },
    { id: 'deeropener', w: 0.6, text: 'OPENING DAY OF DEER SEASON. Every client in the county is in a tree stand. All leads cool off.', fx: 'allCool' },
    { id: 'lakefreeze', w: 0.6, text: 'THE LAKE FROZE EARLY. Lake buyers suddenly remember they hate winter. Lake deal values -10%.', fx: 'lakeFreeze' },
    { id: 'moose',      w: 1.0, text: 'A MOOSE IS BLOCKING THE DRIVEWAY. He lives here now. You lose an hour tomorrow negotiating with him.', fx: 'snowstorm' },
    { id: 'blizzcancel', w: 1.0, text: 'A BLIZZARD CANCELED EVERY SHOWING. Even the snowplow guy stayed home. Tomorrow starts slow.', fx: 'snowstorm' },
    // --- Funny Minnesota setbacks (always-ish eligible minor pain) ---
    { id: 'lockbox',    w: 1.0, text: 'LOCKBOX FROZE SHUT! You breathed on it, hit it with your mitten, and questioned your career choices. Your next showing costs one extra energy.', fx: 'lockboxFroze' },
    { id: 'detour',     w: 1.0, text: 'COUNTY ROAD DETOUR! The "quick alternate route" included eleven miles of gravel and one suspicious bridge. Tomorrow\'s showings and open house are harder.', fx: 'roadDetour' },
    { id: 'caramel',    w: 0.6, text: 'A COMPETING AGENT BROUGHT FULL-SIZE CARAMEL ROLLS. Your grocery-store cookies never stood a chance. Your warmest prospect cools off.', fx: 'caramelRolls' },
    { id: 'zestimate',  w: 0.6, text: 'THE SELLER FOUND A SCREENSHOT OF THEIR 2021 ZESTIMATE. It is now framed above the fireplace. Their listing becomes overpriced.', fx: 'zestimateFrame' },
    { id: 'grouptext',  w: 1.0, text: 'YOU REPLIED ALL TO THE ENTIRE TRANSACTION GROUP. The message was meant for your spouse. Nobody will make eye contact at closing.', fx: 'groupText' },
    { id: 'notifs',     w: 1.0, text: 'YOUR PHONE UPDATED OVERNIGHT AND TURNED OFF EVERY NOTIFICATION. Three leads believe you moved to Canada.', fx: 'notifyOff' },
  );

  D.FUNNY_EVENTS.push(
    { id: 'dreamhouse', text: 'A BUYER FOUND THEIR DREAM HOUSE. They cried in the driveway. You cried a little too. Straight to offer!', fx: 'hotTub' },
    { id: 'sellerfires', text: 'A SELLER FIRED THEIR PREVIOUS AGENT ("he kept calling our cabin a shed") and called YOU. Hot seller lead!', fx: 'hotSellerLead' },
    { id: 'ratefall',   text: 'INTEREST RATES FELL! Buyers are feeling brave. All buyer deal values +5%.', fx: 'rateFall' },
    { id: 'apprhigh',   text: 'APPRAISAL CAME IN HIGH! The appraiser must have had a great breakfast. A deal gains 10% value.', fx: 'apprHigh' },
    { id: 'dogshoe',    text: 'THE SELLER\'S DOG STOLE A BUYER\'S SHOE and everyone loved it. That dog has done more for this deal than anyone. +4 happiness.', fx: 'happy4' },
    { id: 'nlights',    text: 'THE NORTHERN LIGHTS APPEARED DURING AN EVENING SHOWING. Everyone just stood there in the driveway. +8 happiness, +followers.', fx: 'auroraMoment' },
    { id: 'proposal',   text: 'A BUYER PROPOSED MARRIAGE DURING THE SHOWING. In the kitchen. They said yes! Now they need a bigger house. +10 happiness.', fx: 'happy10' },
    { id: 'lottery',    text: 'A CLIENT WON THE LOTTERY (scratch-off, but still). Budget: UPGRADED. Their deal value jumps 20%!', fx: 'lotteryWin' },
    { id: 'transferred', text: 'A SELLER GOT TRANSFERRED TO DULUTH. They need to sell YESTERDAY. Motivated seller lead!', fx: 'hotSellerLead' },
    { id: 'haunted',    text: 'WORD GOT OUT THAT A CABIN IS "HAUNTED" (the furnace bangs twice at 3am). Ghost hunters follow you online now. +followers!', fx: 'deerVideo' },
    { id: 'fishopener', text: 'FISHING OPENER WEEKEND! Half the metro drove north and fell in love with lake life. BUYER FRENZY - new leads!', fx: 'leadFrenzy' },
    { id: 'iceroad',    text: 'THE ICE ROAD OPENED. Island cabin showings are BACK ON, baby. Lake leads warm up.', fx: 'fishBiting' },
    { id: 'kidstoys',   text: 'THE SELLERS\' KIDS LEFT TOYS EVERYWHERE. A buyer stepped on a LEGO and still wrote an offer. Warrior. +3 happiness.', fx: 'happy3' },
    { id: 'bear',       text: 'A BEAR WALKED THROUGH THE YARD MID-SHOWING. You narrated it like a nature documentary. The video? Gold. +followers!', fx: 'deerVideo' },
  );

  // Easter eggs: rare, wonderful, very Minnesota
  D.EASTER_EGGS = [
    { id: 'paulbunyan', text: 'PAUL BUNYAN HIMSELF stopped by the office. "Good land up here," he said, and gave you a referral. His friend needs 100 acres.', fx: 'bunyanReferral' },
    { id: 'babe',       text: 'BABE THE BLUE OX IS BLOCKING MAIN STREET. Traffic backed up past the DQ. Everyone was late. Nobody was mad. +4 happiness.', fx: 'happy4' },
    { id: 'walleye',    text: 'YOU CAUGHT A TROPHY WALLEYE before your morning appointments. +20 CHARISMA. Every lead can sense it.', fx: 'walleyeCharisma' },
    { id: 'countyfair', text: 'YOU WON THE COUNTY FAIR SEED ART CONTEST. Your reputation in three counties is now unshakeable. +10 reputation.', fx: 'fairRep' },
    { id: 'lakefall',   text: 'YOU FELL IN THE LAKE DURING A LISTING VIDEO. It has 2 million views. You are famous for the wrong reason. HUGE followers.', fx: 'lakeFallViral' },
  ];

  // ----------------------------------------------------------
  // Weather system (rolled daily; weight per month [APR, MAY, JUN])
  // ----------------------------------------------------------
  D.WEATHER = [
    { id: 'clear',    label: 'CRISP & CLEAR',    desc: 'A fine day to sell houses.', mods: {}, weight: [3, 3, 3] },
    { id: 'perfect',  label: 'PERFECT LAKE DAY', desc: 'Lake leads warm up. Open houses thrive.', mods: { openhouse: 0.1, show: 0.05 }, daily: 'lakeWarm', weight: [0.5, 2, 4] },
    { id: 'blizzard', label: 'BLIZZARD',         desc: 'Showings & open houses suffer. (Snowmobile fixes this.)', mods: { show: -0.15, openhouse: -0.15 }, snow: true, weight: [3, 0.5, 0] },
    { id: 'icestorm', label: 'ICE STORM',        desc: 'Everything is a rink. Showings suffer. (Snowmobile helps.)', mods: { show: -0.15, listing: -0.05 }, snow: true, weight: [2, 0.5, 0] },
    { id: 'thunder',  label: 'THUNDERSTORM',     desc: 'Open houses suffer, but everyone answers the phone.', mods: { openhouse: -0.1, call: 0.05 }, rain: true, weight: [1, 2, 2] },
    { id: 'rain',     label: 'HEAVY RAIN',       desc: 'Soggy showings, moody videos.', mods: { show: -0.08, video: -0.05 }, rain: true, weight: [2, 2.5, 2] },
    { id: 'heat',     label: 'HEAT WAVE',        desc: 'Everyone is cranky. Leads cool slightly.', mods: { call: -0.05 }, daily: 'heatCool', weight: [0, 1, 2.5] },
    { id: 'fog',      label: 'DENSE FOG',        desc: 'Nobody drives anywhere. Great day for calls and texts.', mods: { call: 0.1, text: 0.05, show: -0.1 }, fog: true, weight: [2, 1.5, 1] },
    { id: 'wind',     label: 'WIND ADVISORY',    desc: 'The drone stays home. Listing pitches lose flair.', mods: { listing: -0.1 }, weight: [1.5, 1.5, 1] },
    { id: 'aurora',   label: 'NORTHERN LIGHTS',  desc: 'Magic in the sky tonight. Videos shine, spirits soar.', mods: { video: 0.15 }, daily: 'auroraJoy', aurora: true, weight: [1, 1, 1] },
  ];

  // ----------------------------------------------------------
  // New bosses. Months 1-2 draw randomly from the pool;
  // the final is always THE MEGA TEAM.
  // ----------------------------------------------------------
  D.BOSS_POOL = ['shark', 'lakes', 'zillow', 'luxking', 'investor', 'fsbo'];
  D.FINAL_BOSS = 'megateam';

  D.BOSSES.push(
    {
      id: 'zillow', name: 'THE ZILLOW MONSTER', sprite: 'bossZillow',
      intro: ['A creature made entirely of internet leads.', 'It floods the market. It knows your', 'home value. It is always slightly wrong.'],
      taunt: 'Your listing? I already estimated it. Poorly.',
      rounds: 3, difficulty: 0.5, gimmick: { speed: 1.35 },
      reward: { cash: 6000, leads: 1, followers: 150 },
      skills: ['PROSPECTING', 'SPEED', 'MARKETING'],
    },
    {
      id: 'luxking', name: 'THE LUXURY KING', sprite: 'bossLux',
      intro: ['His listing presentations have intermissions.', 'His brochures are hardcover.', 'His cufflinks cost more than your car.'],
      taunt: 'Darling, your marketing is... rustic.',
      rounds: 3, difficulty: 0.55, gimmick: { zone: 0.8 },
      reward: { cash: 8000, leads: 1, followers: 200 },
      skills: ['NEGOTIATION', 'CLIENT SERVICE', 'STRATEGY'],
    },
    {
      id: 'investor', name: 'THE INVESTOR', sprite: 'bossInvestor',
      intro: ['Offers cash on everything. Sight unseen.', 'Closes in 6 days. Feels nothing.', 'Every round you lose costs you $2,000.'],
      taunt: 'Cash offer, no contingencies. Beat that. You can\'t.',
      rounds: 3, difficulty: 0.55, gimmick: { loseCash: 2000 },
      reward: { cash: 10000, leads: 1, followers: 100 },
      skills: ['NEGOTIATION', 'STRATEGY', 'SPEED'],
    },
    {
      id: 'fsbo', name: 'THE FSBO MASTER', sprite: 'bossFsbo',
      intro: ['Convinces sellers they don\'t need Realtors.', 'His yard signs are hand-painted.', 'His paperwork is... also hand-painted.'],
      taunt: 'Six percent?! I\'ll sell it myself with a sign and a dream!',
      rounds: 4, difficulty: 0.5, gimmick: {},
      reward: { cash: 7000, leads: 1, followers: 120 },
      skills: ['PROSPECTING', 'CLIENT SERVICE', 'NEGOTIATION', 'STRATEGY'],
    },
    {
      id: 'megateam', name: 'THE MEGA TEAM', sprite: 'megaAgent',
      intro: ['Marketing dept. Photographer. Videographer.', 'ISA team. Transaction coordinators. Inside sales.', 'Listing manager. Marketing manager. Buyer specialists.', 'One of them exists only to hold the door.'],
      taunt: 'We are 74 agents. You are one person with a car.',
      rounds: 6, difficulty: 0.72, gimmick: { speed: 1.15 },
      reward: { cash: 20000, leads: 2, followers: 1000 },
      skills: ['PROSPECTING', 'MARKETING', 'NEGOTIATION', 'CLIENT SERVICE', 'SPEED', 'STRATEGY'],
      final: true,
    },
  );

  // ----------------------------------------------------------
  // Expanded shop: new GEAR + OFFICE ladder + TOYS
  // ----------------------------------------------------------
  D.UPGRADES.push(
    { id: 'matterport',   name: 'MATTERPORT SCANNER',      cost: 7000,  desc: '3D tours! Buyers arrive pre-sold. +10% listing & +5% showing scores.' },
    { id: 'staging',      name: 'PRO STAGING',             cost: 9000,  desc: 'Throw pillows change lives. New listings gain 5% value.' },
    { id: 'goldensigns',  name: 'GOLDEN OPEN HOUSE SIGNS', cost: 5000,  desc: 'Visible from space. Open house attendees more likely to be QUALIFIED, +25% chance of a bonus lead.' },
    { id: 'luxbrochure',  name: 'LUXURY BROCHURE',         cost: 6000,  desc: 'Cardstock so thick it has its own agent. Luxury values +10%.' },
    { id: 'fbads',        name: 'FACEBOOK ADS',            cost: 8000,  desc: 'The algorithm feeds. Daily chance of a Facebook lead.' },
    { id: 'seo',          name: 'GOOGLE SEO',              cost: 10000, desc: 'Page one, baby. Daily chance of a web lead.' },
    { id: 'tiktok',       name: 'TIKTOK BOOST',            cost: 9000,  desc: 'Dances optional. Video scores +10%, follower gains +30%.' },
    { id: 'youtube',      name: 'YOUTUBE CHANNEL',         cost: 12000, desc: 'Long-form lake tours. +50 followers daily, videos convert better.' },
    { id: 'videographer', name: 'PRO VIDEOGRAPHER',        cost: 10000, desc: 'Cinematic everything. Video scores +15%.' },
    { id: 'marketingdir', name: 'MARKETING DIRECTOR',      cost: 20000, desc: 'A grown-up runs your funnel now. Daily lead chance way up.' },
    { id: 'commercialdiv', name: 'COMMERCIAL DIVISION',    cost: 30000, desc: 'Unlocks commercial deals (or visit Jeff Nobleza for free). +10% commercial values.' },
    { id: 'luxdiv',       name: 'LUXURY DIVISION',         cost: 25000, desc: 'Champagne problems welcome. Luxury leads 2x, values +10%.' },
    { id: 'lakecert',     name: 'LAKE SPECIALIST CERT',    cost: 8000,  desc: 'You know every sandbar. Lake leads warmer, lake showings +8%.' },
    { id: 'cabinexpert',  name: 'VACATION CABIN EXPERT',   cost: 8000,  desc: 'Knotty pine authority. Cabin & vacation leads warmer and more common.' },
  );

  D.OFFICES = [
    { id: 'smallOffice',      name: 'SMALL OFFICE',      cost: 20000,  desc: 'A real desk! Your pipeline warms itself a little every day.' },
    { id: 'downtownOffice',   name: 'DOWNTOWN OFFICE',   cost: 45000,  desc: 'Foot traffic! Daily walk-in lead chance.' },
    { id: 'luxOffice',        name: 'LUXURY OFFICE',     cost: 80000,  desc: 'Marble everything. Listing values +5%, +10 reputation.' },
    { id: 'waterfrontOffice', name: 'WATERFRONT OFFICE', cost: 120000, desc: 'Clients arrive by boat. Lake leads far more common.' },
    { id: 'corporateHQ',      name: 'CORPORATE HQ',      cost: 200000, desc: 'You ARE the market now. +1 ENERGY every day.' },
  ];
  D.TOYS = [
    { id: 'luxsuv',      name: 'LUXURY SUV',         cost: 30000,  desc: 'Heated everything. Showings +5%. Clients feel fancy.' },
    { id: 'fishingboat', name: 'FISHING BOAT',       cost: 25000,  desc: 'Close deals at 7am on the water. New lake leads spawn warmer.' },
    { id: 'pontoon',     name: 'PONTOON',            cost: 35000,  desc: 'The lake limousine. Lake showings +8%.' },
    { id: 'snowmobile',  name: 'SNOWMOBILE',         cost: 18000,  desc: 'Blizzards and ice storms no longer slow you down.' },
    { id: 'atv',         name: 'ATV',                cost: 15000,  desc: 'Show the back 40 properly. Hunting/farm/land leads warmer.' },
    { id: 'helicopter',  name: 'HELICOPTER',         cost: 150000, desc: 'Aerial arrivals. A great open house is guaranteed one extra qualified lead.' },
    { id: 'privatejet',  name: 'PRIVATE JET',        cost: 250000, desc: 'Relocation & celebrity buyers flock to you (2x their leads).' },
    { id: 'retreat',     name: 'LAKE CABIN RETREAT', cost: 100000, desc: 'Host clients up north. +2 happiness daily, extra referral chance.' },
  ];

  // ----------------------------------------------------------
  // Achievements (persist across seasons in the profile)
  // ----------------------------------------------------------
  D.ACHIEVEMENTS = [
    { id: 'neighbor',   name: 'WAIT, WRONG HOUSE',     desc: 'Accidentally sold the neighbor\'s house. It happens.' },
    { id: 'coffee',     name: 'COFFEE ADDICT',         desc: 'Buy 1,000 coffees. (*Fine: 15. Coffee is expensive.)', stat: 'coffees', goal: 15 },
    { id: 'texter',     name: 'PROFESSIONAL TEXTER',   desc: 'Send 10,000 texts. (*30 texting sessions.)', stat: 'texts', goal: 30 },
    { id: 'phone',      name: 'PHONE WARRIOR',         desc: 'Make 25,000 calls. (*45 call sessions.)', stat: 'calls', goal: 45 },
    { id: 'inspector',  name: 'INSPECTION SURVIVOR',   desc: 'Survive 100 inspections. (*12. Each one ages you.)', stat: 'inspections', goal: 12 },
    { id: 'paperwork',  name: 'PAPERWORK WIZARD',      desc: 'Complete 1,000 contracts. (*25 offers written.)', stat: 'offers', goal: 25 },
    { id: 'lakeexpert', name: 'THE LAKE EXPERT',       desc: 'Sell 250 waterfront homes. (*10 lake closings.)', stat: 'lakeSold', goal: 10 },
    { id: 'closer',     name: 'CLOSING MACHINE',       desc: 'Close 12 homes in a single season.' },
    { id: 'monday',     name: 'MILLION DOLLAR MONDAY', desc: 'Close $1M+ in volume in a single day.' },
    { id: 'refking',    name: 'THE REFERRAL KING',     desc: 'Earn 10 lifetime referrals.', stat: 'referrals', goal: 10 },
    { id: 'coldcaller', name: 'COLD CALLER',           desc: 'Score PERFECT on the call minigame 5 times.', stat: 'perfectCalls', goal: 5 },
    { id: 'butterfly',  name: 'SOCIAL BUTTERFLY',      desc: 'Reach 5,000 followers in a season.' },
    { id: 'ohhero',     name: 'OPEN HOUSE HERO',       desc: 'Capture 20 lifetime open house leads.', stat: 'ohLeads', goal: 20 },
    { id: 'aimaster',   name: 'AI MASTER',             desc: 'Own the AI Assistant and close 5 deals with it.', stat: 'aiCloses', goal: 5 },
    { id: 'squatch',    name: 'SQUATCH SPOTTER',       desc: 'Find Bigfoot in the woods. He is shy.' },
    { id: 'megaslayer', name: 'GIANT SLAYER',          desc: 'Defeat the final boss.' },
    { id: 'scalemode',  name: 'SCALE BEATS HUSTLE',    desc: 'Trigger Blake Suddath\'s Scale Mode ultimate.' },
    { id: 'parkinglot', name: 'THE 22-MINUTE TALK',    desc: 'Catch Blake\'s rare parking lot talk power-up.' },
    { id: 'sysoverride', name: 'AUTOMATION IS FREEDOM', desc: 'Trigger Tyler Lewis\'s System Override.' },
  ];

  // ----------------------------------------------------------
  // Dynamic rivalry: trash talk tiers + head-to-head battles
  // ----------------------------------------------------------
  D.TRASH_TALK = {
    malcolm: [
      ['"Nice sale! I taught him that." - MALCOLM, to a barista', '"Bridger who? Kidding. Kind of." - MALCOLM'],
      ['"Bridger\'s idea of video marketing is a fax." - MALCOLM', '"I heard his listing binder has its own binder." - MALCOLM'],
      ['"This lake ain\'t big enough for the two of us, and I have the pontoon." - MALCOLM', '"His beard called. It wants a better agent." - MALCOLM'],
    ],
    bridger: [
      ['"Good month, Malcolm. Adorable, even." - BRIDGER', '"I respect the hustle. From a distance." - BRIDGER'],
      ['"Malcolm closes deals when the WiFi cooperates." - BRIDGER', '"Nice video. My clients don\'t have ring lights. They have money." - BRIDGER'],
      ['"I don\'t compete with content creators. I compete with closers. So: nobody." - BRIDGER', '"Tell Malcolm the adults are negotiating." - BRIDGER'],
    ],
  };

  D.BATTLE = {
    dialogue: [
      { prompt: 'SELLER: "Why should we pick you?"', good: 'Because I\'ll treat your sale like it\'s my own house.', bad: ['Because my rival is objectively worse.', 'I have a coupon.'] },
      { prompt: 'SELLER: "What\'s our house actually worth?"', good: 'Let\'s walk the comps together - then YOU tell me.', bad: ['A million dollars. Next question.', 'Whatever Zillow says, minus my feelings.'] },
      { prompt: 'SELLER: "The other agent says they already have a buyer."', good: 'Great! My marketing brings you TEN buyers - and a bidding war.', bad: ['They\'re lying and I hate them.', 'One buyer? I once met three buyers.'] },
    ],
    market: [
      { prompt: 'MARKET CHECK: What actually sells lake homes up here?', good: 'Frontage, sunset side, and a legal dock.', bad: ['The vibes.', 'Proximity to my office.'] },
      { prompt: 'MARKET CHECK: Best listing window in the northland?', good: 'Right before fishing opener - buyers flood north.', bad: ['February. Nothing says "buy" like -30.', 'Whenever Mercury is in retrograde.'] },
      { prompt: 'MARKET CHECK: Who is buying cabins right now?', good: 'Metro families chasing weekend lake life.', bad: ['Ghosts, mostly.', 'People who love mice.'] },
    ],
  };

  // ----------------------------------------------------------
  // Follow-up minigame: pick the response that keeps the
  // relationship alive. The best answer depends on the situation.
  // ----------------------------------------------------------
  D.FOLLOWUP_ROUNDS = [
    { msg: '"Hey, we are probably going to wait until next year."',
      good: 'Totally fair. What would need to change for sooner to make sense?',
      bad: ['Okay, let me know.', 'Rates will probably be higher next year. Just saying.'] },
    { msg: '"We saw a FSBO down the road that looks nice..."',
      good: 'Want me to pull the history on it? I can show you both options.',
      bad: ['FSBOs are always haunted. Always.', 'Fine. Go. See what happens.'] },
    { msg: '"Sorry we missed your call, super busy lately."',
      good: 'No worries! Texting works too - want a quick market update?',
      bad: ['I called four times.', 'Busy people still need houses, you know.'] },
    { msg: '"Is NOW even a good time to buy?"',
      good: 'Depends on your plans - let\'s look at your numbers together.',
      bad: ['It is ALWAYS a good time to buy.', 'I have literally no idea.'] },
    { msg: '"My brother-in-law says the market is about to crash."',
      good: 'He might be right! Here\'s what the local data actually shows.',
      bad: ['Your brother-in-law sells vapes.', 'Crashes are a myth invented by renters.'] },
    { msg: '"We toured an open house this weekend. It was okay."',
      good: 'Nice! What did you like about it? I\'ll find you a better one.',
      bad: ['WITHOUT ME?', 'Cool cool cool cool cool.'] },
    { msg: '"What was that lake house you mentioned again?"',
      good: 'The one on Gull Lake! Still available - want to see it Saturday?',
      bad: ['I mention a lot of houses.', 'Buy first, questions later.'] },
    { msg: '"We need to sell our place before we can buy anything."',
      good: 'Great news - let\'s get your home ready and time both moves.',
      bad: ['Everyone says that.', 'Have you tried owning two houses?'] },
  ];

  // Map additions: bank + commercial plaza + growth lab
  D.MAP.locations.bank = { x: 434, y: 168, sprite: 'bank', label: 'FIRST NORTHERN BANK' };
  D.MAP.locations.plaza = { x: 222, y: 218, sprite: 'plaza', label: 'NOBLEZA COMMERCIAL PLAZA' };
  D.MAP.locations.growthlab = { x: 278, y: 250, sprite: 'growthlab', label: 'SUDDATH GROWTH LAB' };
  D.MAP.locations.systemslab = { x: 185, y: 242, sprite: 'systemslab', label: 'LEWIS SYSTEMS LAB' };

  // Hidden actions reached via map visits (not in the sidebar list)
  D.ACTIONS.push(
    { id: 'commercial', label: 'JEFF\'S COMMERCIAL DEAL', energy: 2, loc: 'plaza', hidden: true, desc: 'Take on one of Jeff\'s monster commercial deals.', minigame: 'negotiateGame' },
  );
})();
