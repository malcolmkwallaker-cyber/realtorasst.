// ============================================================
// data.js - characters, leads, upgrades, events, bosses, map
// ============================================================
'use strict';

G.Data = {};

// ------------------------------------------------------------
// Season structure: 3 months, 8 working days each, boss at month end
// ------------------------------------------------------------
G.Data.SEASON = {
  months: ['APRIL', 'MAY', 'JUNE'],
  daysPerMonth: 8,
  baseEnergy: 3,
};

// ------------------------------------------------------------
// Characters
// ------------------------------------------------------------
G.Data.CHARACTERS = {
  malcolm: {
    id: 'malcolm',
    name: 'MALCOLM',
    title: 'The Lake Life Hype Man',
    color: G.C.green,
    accent: G.C.sky,
    sprite: 'malcolm',
    bio: [
      'Social media wizard. Video marketing machine.',
      'Builds relationships one dock chat at a time.',
      'Lake home specialist. Never met a pontoon',
      'he did not like.',
    ],
    strengths: ['VIDEO +25%', 'OPEN HOUSE +15%', 'LAKE LEADS x2'],
    ability: {
      name: 'VIRAL VIDEO',
      desc: 'Post a ridiculous real estate video. Extra leads + followers pour in. Once per day.',
    },
    // gameplay modifiers
    videoBonus: 0.25,       // video minigame score bonus
    openHouseBonus: 0.15,   // open house minigame bonus
    lakeLeadWeight: 2,      // lake/cabin leads twice as likely
    negotiateBonus: 0,
    listingBonus: 0,
    luxuryValueBonus: 0,
  },
  bridger: {
    id: 'bridger',
    name: 'BRIDGER',
    title: 'The Closer',
    color: G.C.navy,
    accent: G.C.yellow,
    sprite: 'bridger',
    bio: [
      'Ruthless negotiator. Luxury client whisperer.',
      'His listing presentations have made grown',
      'sellers weep with joy. Runs on referrals,',
      'black coffee, and that mighty red beard.',
    ],
    strengths: ['NEGOTIATE +25%', 'LISTING PITCH +15%', 'LUXURY VALUE +20%'],
    ability: {
      name: 'POWER CLOSE',
      desc: 'Win a tough appointment or negotiation instantly. Your best lead jumps a stage. Once per day.',
    },
    videoBonus: 0,
    openHouseBonus: 0,
    lakeLeadWeight: 1,
    negotiateBonus: 0.25,
    listingBonus: 0.15,
    luxuryValueBonus: 0.2,
  },
};

// ------------------------------------------------------------
// Lead types
// ------------------------------------------------------------
G.Data.LEAD_TYPES = [
  { id: 'facebook',   label: 'FACEBOOK LEAD',    seller: false, value: [140000, 320000], warmth: 25, weight: 3 },
  { id: 'zestimate',  label: 'ZESTIMATE LEAD',   seller: false, value: [160000, 380000], warmth: 30, weight: 3 },
  { id: 'referral',   label: 'REFERRAL',         seller: false, value: [180000, 450000], warmth: 65, weight: 2 },
  { id: 'pastclient', label: 'PAST CLIENT',      seller: true,  value: [200000, 420000], warmth: 70, weight: 1.5 },
  { id: 'signcall',   label: 'SIGN CALL',        seller: false, value: [150000, 350000], warmth: 45, weight: 2 },
  { id: 'openhouse',  label: 'OPEN HOUSE GUEST', seller: false, value: [140000, 330000], warmth: 40, weight: 2 },
  { id: 'relo',       label: 'RELOCATION BUYER', seller: false, value: [220000, 480000], warmth: 55, weight: 1.5 },
  { id: 'lakehome',   label: 'LAKE HOME BUYER',  seller: false, value: [400000, 900000], warmth: 45, weight: 1.2, lake: true },
  { id: 'cabin',      label: 'CABIN BUYER',      seller: false, value: [180000, 380000], warmth: 50, weight: 1.5, lake: true },
  { id: 'firsttime',  label: 'FIRST-TIME BUYER', seller: false, value: [120000, 240000], warmth: 50, weight: 2.5 },
  { id: 'luxury',     label: 'LUXURY SELLER',    seller: true,  value: [600000, 1400000], warmth: 35, weight: 0.8, luxury: true },
  { id: 'investor',   label: 'INVESTOR',         seller: false, value: [130000, 300000], warmth: 40, weight: 1.5 },
  { id: 'expired',    label: 'EXPIRED LISTING',  seller: true,  value: [180000, 400000], warmth: 20, weight: 1.5 },
  { id: 'fsbo',       label: 'FSBO SELLER',      seller: true,  value: [170000, 380000], warmth: 15, weight: 1.5 },
];

G.Data.LEAD_NAMES = [
  'THE OLSONS', 'DALE & DEB', 'THE JOHNSONS', 'GARY LUNDGREN', 'THE ANDERSONS',
  'SVEN & LENA', 'THE PETERSONS', 'BOB PASTUSZEK', 'THE NELSONS', 'CAROL HAUGEN',
  'THE LARSONS', 'RANDY & TAMMY', 'THE CARLSONS', 'THE BERGSTROMS', 'DOUG SORENSON',
  'THE LINDQUISTS', 'MARGE & VERN', 'THE DAHLS', 'KENNY MOE', 'THE HALVORSONS',
  'THE SETHERS', 'PAT & PAT', 'THE GUSTAFSONS', 'WANDA SCHMIDT', 'THE THORSONS',
  'BIG MIKE', 'THE RUUDS', 'DARLENE & CHUCK', 'THE OSTLUNDS', 'LITTLE MIKE',
];

// Pipeline stages
G.Data.STAGES = ['new', 'hot', 'appt', 'active', 'offer', 'pending', 'closed'];
G.Data.STAGE_LABELS = {
  new: 'NEW', hot: 'WARM', appt: 'APPT SET', active: 'CLIENT',
  offer: 'OFFER IN', pending: 'PENDING', closed: 'SOLD',
};
G.Data.STAGE_COLORS = {
  new: G.C.gray, hot: G.C.orange, appt: G.C.yellow, active: G.C.sky,
  offer: G.C.cyan, pending: G.C.lime, closed: G.C.green,
};

// ------------------------------------------------------------
// Day actions
// ------------------------------------------------------------
G.Data.ACTIONS = [
  { id: 'call',      label: 'CALL LEADS',     energy: 1, loc: 'office',   desc: 'Dial for dollars. Warm up leads, set appointments.', minigame: 'callGame' },
  { id: 'text',      label: 'TEXT LEADS',     energy: 1, loc: 'office',   desc: 'Thumbs of fury. Quick replies keep leads warm.', minigame: 'textGame' },
  { id: 'followup',  label: 'FOLLOW UP',      energy: 1, loc: 'coffee',   desc: 'Coffee + check-ins. Warms your whole pipeline a bit.', minigame: null },
  { id: 'openhouse', label: 'OPEN HOUSE',     energy: 2, loc: 'openhouse', desc: 'Cookies, sign-in sheets, fresh leads.', minigame: 'openHouseGame' },
  { id: 'video',     label: 'MAKE VIDEO',     energy: 1, loc: 'studio',   desc: 'Lights, camera, listings. Followers become leads.', minigame: 'videoGame' },
  { id: 'listing',   label: 'LISTING APPT',   energy: 1, loc: 'cabin',    desc: 'Pitch a seller. Nail it and take the listing.', minigame: 'listingGame' },
  { id: 'show',      label: 'SHOW HOMES',     energy: 1, loc: 'lakehome', desc: 'Tour homes with a buyer. Find "the one".', minigame: 'showGame' },
  { id: 'offer',     label: 'WRITE OFFERS',   energy: 1, loc: 'office',   desc: 'Paperwork power hour. Client goes under offer.', minigame: null },
  { id: 'negotiate', label: 'NEGOTIATE',      energy: 1, loc: 'office',   desc: 'Go to battle over price, closing dates, and the fish house.', minigame: 'negotiateGame' },
  { id: 'inspect',   label: 'INSPECTION',     energy: 1, loc: 'starter',  desc: 'Fix inspection issues before they kill the deal.', minigame: 'inspectGame' },
  { id: 'close',     label: 'CLOSE SALES',    energy: 1, loc: 'title',    desc: 'Sign here. And here. And here. Get paid!', minigame: null },
];

// ------------------------------------------------------------
// Upgrades
// ------------------------------------------------------------
G.Data.UPGRADES = [
  { id: 'vehicle',      name: 'BETTER VEHICLE',      cost: 12000, desc: 'Heated seats + 4WD. Open houses cost 1 energy instead of 2.' },
  { id: 'camera',       name: 'CAMERA GEAR',         cost: 6000,  desc: 'Crispy footage. +15% video scores, +50% follower gains.' },
  { id: 'drone',        name: 'DRONE',               cost: 9000,  desc: 'Sweet aerial lake shots. +15% listing pitch, +10% listing value.' },
  { id: 'crm',          name: 'CRM SYSTEM',          cost: 8000,  desc: 'Leads never go cold or ghost you. Auto follow-up daily.' },
  { id: 'ai',           name: 'AI ASSISTANT',        cost: 15000, desc: 'Handles the busywork. +1 ENERGY every day.' },
  { id: 'tc',           name: 'TRANSACTION COORD.',  cost: 12000, desc: 'Closings run themselves. 50% chance inspections auto-clear.' },
  { id: 'marketing',    name: 'MARKETING BUDGET',    cost: 10000, desc: 'Ads everywhere. Extra lead chance daily, +1 open house lead.' },
  { id: 'website',      name: 'WEBSITE',             cost: 7000,  desc: 'You exist on the internet now. Chance of a free web lead daily.' },
  { id: 'social',       name: 'SOCIAL MEDIA BOOST',  cost: 9000,  desc: 'The algorithm loves you. Follower gains x2, videos convert better.' },
  { id: 'photographer', name: 'PHOTOGRAPHER',        cost: 8000,  desc: 'No more phone pics of toilets. Listings attract offers faster.' },
  { id: 'assistant',    name: 'SHOWING ASSISTANT',   cost: 14000, desc: 'They handle tours too. Showings can advance 2 buyers at once.' },
];

// ------------------------------------------------------------
// Random obstacles (bad-ish) - fire at day end
// ------------------------------------------------------------
G.Data.OBSTACLES = [
  { id: 'inspection', text: 'INSPECTION ISSUE! The inspector found "significant moisture concerns." A pending deal needs repairs.', fx: 'inspectionIssue' },
  { id: 'appraisal',  text: 'LOW APPRAISAL! The appraiser used a comp from 2009. A deal loses 10% of its value.', fx: 'lowAppraisal' },
  { id: 'financing',  text: 'FINANCING PROBLEM! The buyer financed a new ice castle last week. A pending deal is delayed.', fx: 'financeDelay' },
  { id: 'snowstorm',  text: 'SNOWSTORM! 14 inches in April. Classic Minnesota. Tomorrow you lose 1 energy shoveling.', fx: 'snowstorm' },
  { id: 'badreview',  text: 'BAD REVIEW! "Agent was 4 minutes late. One star." Ouch. -1 review, -5 happiness.', fx: 'badReview' },
  { id: 'ghost',      text: 'GHOSTED! A lead vanished like a walleye at noon. They are gone.', fx: 'ghostLead' },
  { id: 'stolen',     text: 'DEAL SNIPED! A competing agent swooped in with cookies and a lower commission. You lose a lead in offer stage.', fx: 'stolenDeal' },
  { id: 'rates',      text: 'INTEREST RATE JUMP! The Fed did a thing. All your buyer deals lose 5% value.', fx: 'rateJump' },
  { id: 'coldfeet',   text: 'COLD FEET! A buyer wants to "sleep on it, maybe till fall." A pending deal drops back to offer stage.', fx: 'coldFeet' },
  { id: 'greedy',     text: 'SELLER WANTS DOUBLE! "The Zillow says..." A seller overprices their listing. It will be slower to sell.', fx: 'greedySeller' },
];

// ------------------------------------------------------------
// Funny events (good-ish flavor) - fire at day end
// ------------------------------------------------------------
G.Data.FUNNY_EVENTS = [
  { id: 'garage',   text: 'A client toured a 4-bed lakefront home and only asked about the garage. "But can it fit the boat AND the wheeler?" +5 happiness when you said yes.', fx: 'happy5' },
  { id: 'hottub',   text: 'A buyer fell head-over-heels for a hot tub. The house? Irrelevant. They want to write an offer TONIGHT.', fx: 'hotTub' },
  { id: 'double',   text: 'A seller thinks their house is worth double because they "redid the trim." You nodded politely for 45 minutes. +1 listing lead anyway.', fx: 'sellerLead' },
  { id: 'deer',     text: 'A DEER walked through your showing. The buyers loved it. You got it on video. +followers!', fx: 'deerVideo' },
  { id: 'fish',     text: 'At a lake showing, the buyer only asked: "So... are the fish biting?" You said "oh you betcha." +warmth on all lake leads.', fx: 'fishBiting' },
  { id: 'wrongviral', text: 'Your video went viral for the WRONG reason (you said "lake-adjacent" about a drainage pond). Huge followers, small shame.', fx: 'wrongViral' },
  { id: 'sawvideo', text: 'The phone rings: "I saw your video and HAD to call." A hot lead appears!', fx: 'videoLead' },
  { id: 'lutefisk', text: 'You sponsored the lutefisk feed at the community center. Everyone knows your name now. +referral!', fx: 'referralLead' },
  { id: 'hotdish',  text: 'A past client dropped off a thank-you hotdish. Morale through the roof. +10 happiness.', fx: 'happy10' },
];

// ------------------------------------------------------------
// Bosses - month-end showdowns
// ------------------------------------------------------------
G.Data.BOSSES = [
  {
    id: 'shark', name: 'DALE "THE SHARK" SWANSON', sprite: 'bossShark',
    intro: ['Dale has sold homes here since 1987.', 'His face is on 14 bus benches.', 'He smells like Old Spice and victory.'],
    taunt: 'Kid, I was door-knocking before you were born.',
    rounds: 3, difficulty: 0.45, reward: { cash: 5000, leads: 2, followers: 100 },
    skills: ['PROSPECTING', 'SPEED', 'CLIENT SERVICE'],
  },
  {
    id: 'lakes', name: 'CINDY "LAKESHORE" LARSEN', sprite: 'bossLakes',
    intro: ['Cindy owns the luxury lake market.', 'Her drone fleet blocks out the sun.', 'Her open houses have charcuterie.'],
    taunt: 'Oh sweetie. That lake is barely swimmable.',
    rounds: 4, difficulty: 0.6, reward: { cash: 9000, leads: 3, followers: 250 },
    skills: ['MARKETING', 'NEGOTIATION', 'STRATEGY', 'SPEED'],
  },
  {
    id: 'mega', name: 'THE MEGA AGENT', sprite: 'megaAgent',
    intro: ['They have 74 agents. A helicopter.', 'A jingle you cannot unhear.', 'They ARE the market... until today.'],
    taunt: 'We close a home every 12 minutes. You are a rounding error.',
    rounds: 6, difficulty: 0.72, reward: { cash: 20000, leads: 4, followers: 1000 },
    skills: ['PROSPECTING', 'MARKETING', 'NEGOTIATION', 'CLIENT SERVICE', 'SPEED', 'STRATEGY'],
    final: true,
  },
];

// ------------------------------------------------------------
// Map of Northern Minnesota (positions in 480x270 space,
// map area is roughly x:150..470 y:40..250)
// ------------------------------------------------------------
G.Data.MAP = {
  lakes: [
    { x: 205, y: 70,  w: 60, h: 34, name: 'LAKE BEMIDJI' },
    { x: 330, y: 95,  w: 88, h: 48, name: 'LEECH LAKE' },
    { x: 255, y: 185, w: 64, h: 36, name: 'GULL LAKE' },
    { x: 405, y: 200, w: 44, h: 26, name: 'MILLE LACS' },
  ],
  towns: [
    { id: 'bemidji',  name: 'BEMIDJI',      x: 185, y: 112 },
    { id: 'walker',   name: 'WALKER',       x: 318, y: 150 },
    { id: 'nisswa',   name: 'NISSWA',       x: 300, y: 205 },
    { id: 'brainerd', name: 'BRAINERD',     x: 355, y: 232 },
    { id: 'grandrapids', name: 'GRAND RAPIDS', x: 415, y: 78 },
    { id: 'parkrapids', name: 'PARK RAPIDS', x: 205, y: 175 },
  ],
  // where the car drives for each action location
  locations: {
    office:    { x: 362, y: 226, sprite: 'office',       label: 'THE OFFICE' },
    coffee:    { x: 310, y: 198, sprite: 'coffee',       label: 'MUGS & PLUGS CAFE' },
    openhouse: { x: 230, y: 160, sprite: 'houseStarter', label: 'OPEN HOUSE' },
    studio:    { x: 190, y: 120, sprite: 'studio',       label: 'VIDEO STUDIO' },
    cabin:     { x: 402, y: 128, sprite: 'cabin',        label: 'SELLER CABIN' },
    lakehome:  { x: 290, y: 118, sprite: 'houseLake',    label: 'LAKE HOME' },
    starter:   { x: 424, y: 95,  sprite: 'houseStarter', label: 'INSPECTION' },
    title:     { x: 340, y: 240, sprite: 'office',       label: 'TITLE CO.' },
  },
};

// Flavor lines for instant actions
G.Data.FLAVOR = {
  followup: [
    'You sent 12 "just checking in!" texts with exactly the right number of exclamation points.',
    'You remembered a lead\'s dog\'s name (Duke). They were deeply moved.',
    'You dropped off pumpkin bars. This is how deals get done up north.',
    'You commented "GORGEOUS!" on 34 posts. Relationship building, baby.',
  ],
  offer: [
    'You wrote an offer so clean the lender framed it.',
    'Escalation clause? Inspection contingency? You know all the words.',
    'Your buyer offered asking price plus one (1) box of smoked whitefish.',
    'The offer is in! Now we wait. And refresh email. And wait.',
  ],
  close: [
    'The pen ran out of ink halfway through. A backup pen appeared. Legend.',
    'Keys handed over. Tears. Hugs. A firm Minnesotan handshake.',
    'The title lady had cookies. Best closing ever.',
    'SOLD! You did the thing! Commission hits different up north.',
  ],
  ghostReasons: [
    'moved to Arizona', 'decided to "wait till spring"', 'bought a houseboat instead',
    'their cousin got a real estate license', 'found the house on their own, sorry',
  ],
};
