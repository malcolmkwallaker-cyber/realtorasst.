// ============================================================
// characters.js - THE roster. Edit this file to change who is
// playable, how they play, and how office agents unlock.
//
// Malcolm Wallaker, Parker Pemberton, and Liz Rein start unlocked.
// Everyone else is a Grand Rapids office agent. They begin locked
// and unlock through play. Progress is saved in localStorage.
//
// To add a future teammate: copy an office entry, set a new id,
// name, title, perk, catchphrase, colors, and unlock hint. Do not
// invent people. Only add someone when you know they are on the team.
//
// Bios are playful game traits, not biographies.
// ============================================================
'use strict';

(function buildRoster() {
  const C = G.C;

  function agentSprite(hair, shirt, trim, look) {
    const skin = '#e8b796';
    if (look === 'camo') {
      // Blaze-orange cap, camo jacket. A Bigfork truck-and-woods costume.
      return G.makeSprite([
        '....OOOOOO....',
        '...OOOOOOOO...',
        '...OSSSSSSO...',
        '...OSKSSKSO...',
        '..TOSSSSSSOT..',
        '..T.SSWWSS.T..',
        '..T.SSSSSS....',
        '..T.MCMCMC....',
        '..TMCMCMCMC...',
        '..MCMCOCMCM...',
        '..S.MCMCMC.S..',
        '....CMCMCM....',
        '....MCMCMC....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { O: '#e07020', S: skin, K: C.ink, W: C.white, M: '#3d5c34', C: '#8faf62', T: '#6b4226', D: C.dusk });
    }
    if (look === 'welcome') {
      // Soft cardigan and a small cross pin. Sincere, not a punchline.
      return G.makeSprite([
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HSSSSSSH...',
        '...HSKSSKSH...',
        '..THSSSSSSHT..',
        '..T.SSWWSS.T..',
        '..T.SSSSSS....',
        '..T.BBBBBB....',
        '..TBBBXBBBB...',
        '..BBBXBXBBB...',
        '..S.BBXBBB.S..',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, X: trim || C.yellow, D: C.dusk, T: trim || shirt });
    }
    if (look === 'tiny') {
      // Same frame as everyone else, figure packed at the bottom so she is clearly short.
      // Fists out. Feet land on the same line.
      return G.makeSprite([
        '..............',
        '..............',
        '..............',
        '..............',
        '.....HHHH.....',
        '....HHHHHH....',
        '....HSSSSSH...',
        '....HSKSKSH...',
        '.....SSWWSS...',
        '..F..SSSSS..F.',
        '...FBBBBBBF...',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
        '..............',
        '..............',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, F: trim || C.orange, D: C.dusk });
    }
    return G.makeSprite([
      '....HHHHHH....',
      '...HHHHHHHH...',
      '...HSSSSSSH...',
      '...HSKSSKSH...',
      '..THSSSSSSHT..',
      '..T.SSWWSS.T..',
      '..T.SSSSSS....',
      '..T.BBBBBB....',
      '..TBBBBBBBB...',
      '..BBBBOBBBB...',
      '..S.BBOBBB.S..',
      '....BBBBBB....',
      '....BBBBBB....',
      '....DD..DD....',
      '....DD..DD....',
      '....DD..DD....',
      '...KK....KK...',
    ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, O: trim || C.yellow, D: C.dusk, T: trim || shirt });
  }

  G.Sprites.silhouette = G.makeSprite([
    '....HHHHHH....',
    '...HHHHHHHH...',
    '...HHHHHHHH...',
    '...HHKHHKHH...',
    '....HHHHHH....',
    '....HHHHHH....',
    '....HHHHHH....',
    '....BBBBBB....',
    '...BBBBBBBB...',
    '...BBBBBBBB...',
    '....BBBBBB....',
    '....BBBBBB....',
    '....BBBBBB....',
    '....DD..DD....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { H: C.dusk, K: C.ink, B: C.slate, D: C.ink });

  G.Sprites.rivalBroker = agentSprite('#3a3f52', C.red, C.yellow);

  const base = {
    videoBonus: 0, openHouseBonus: 0, lakeLeadWeight: 1,
    negotiateBonus: 0, listingBonus: 0, luxuryValueBonus: 0,
    energyMod: 0, commissionMult: 1, followupBonus: 0, decayMult: 1,
    referralBonus: 0, showBonus: 0, inspectBonus: 0, followerMult: 1,
    happyMult: 1, rivalPressure: 0, valueBonus: 0,
    secret: false, role: 'starter', unlock: null,
  };

  function make(partial) {
    const ch = Object.assign({}, base, partial);
    ch.sprite = 'agent_' + ch.id;
    ch.unlockHint = ch.unlock ? ch.unlock.hint : '';
    G.Sprites[ch.sprite] = agentSprite(ch.hair, ch.shirt, ch.trim, ch.look);
    return ch;
  }

  const starters = [
    make({
      id: 'malcolm',
      name: 'MALCOLM WALLAKER',
      short: 'MALCOLM',
      title: 'Office Leader',
      role: 'leader',
      color: C.green, accent: C.sky,
      hair: '#6b4226', shirt: C.green, trim: C.sky,
      catchphrase: 'Let us put this lake on the internet.',
      bio: [
        'Office leader in Grand Rapids.',
        'Leads with a camera, a follow-up, and a lake story.',
        'The default agent. The season starts with him.',
      ],
      strengths: ['VIDEO +25%', 'OPEN HOUSE +10%', 'LAKE LEADS x2'],
      ability: {
        name: 'VIRAL VIDEO',
        effect: 'viral',
        desc: 'Post a ridiculous, good-hearted listing video. Leads and followers show up. Once per day.',
      },
      videoBonus: 0.25, openHouseBonus: 0.10, lakeLeadWeight: 2,
    }),
    make({
      id: 'parker',
      name: 'PARKER PEMBERTON',
      short: 'PARKER',
      title: 'Owner, Pemberton Real Estate',
      role: 'owner',
      badge: 'OWNER',
      color: C.yellow, accent: C.white,
      hair: '#3a3f52', shirt: C.navy, trim: C.yellow,
      catchphrase: 'Make them feel looked after.',
      bio: [
        'Owner of Pemberton Real Estate.',
        'Boss-tier: more energy and a stronger close.',
        'The rival brokerage notices when the owner is in the field.',
      ],
      strengths: ['+1 ENERGY', 'COMMISSION +12%', 'RIVAL TRIES HARDER'],
      ability: {
        name: 'THE OWNER CALLS',
        effect: 'owner',
        desc: 'One call from the owner. Your best lead jumps a stage and a referral appears. Once per day.',
      },
      energyMod: 1, commissionMult: 1.12, negotiateBonus: 0.12, listingBonus: 0.08,
      rivalPressure: 0.08, startCash: 8000, startReputation: 68,
    }),
    make({
      id: 'liz',
      name: 'LIZ REIN',
      short: 'LIZ',
      title: 'The Follow-Through',
      role: 'starter',
      color: C.sky, accent: C.white,
      hair: '#8a5a44', shirt: C.sky, trim: C.white,
      catchphrase: 'A quick hello keeps a deal alive.',
      bio: [
        'Pemberton Real Estate.',
        'Shows up for the follow-up. Leads cool slower around her.',
        'Wins by staying in touch, not by shouting.',
      ],
      strengths: ['FOLLOW UP +2', 'LEADS COOL SLOWER', 'REFERRALS +'],
      ability: {
        name: 'CHECK-IN ROUND',
        effect: 'warmAll',
        desc: 'A kind lap through the people who are slipping. Warmth up, ghosting down. Once per day.',
      },
      followupBonus: 2, decayMult: 0.72, referralBonus: 0.1, videoBonus: -0.05,
    }),
  ];

  const office = [
    make({
      id: 'rebekkah',
      name: 'REBEKKAH ANDERSON',
      short: 'REBEKKAH',
      title: 'The Welcomer',
      role: 'office', secret: true,
      color: C.orange, accent: C.yellow,
      hair: '#6b4226', shirt: C.orange, trim: C.yellow,
      catchphrase: 'Come on in. The cookies are out.',
      bio: [
        'Grand Rapids office.',
        'Open houses feel like a visit, not a trap.',
        'Crowds linger. Sign-in sheets fill up.',
      ],
      strengths: ['OPEN HOUSE +20%', 'WARMER GUESTS'],
      ability: {
        name: 'WELCOME TABLE',
        effect: 'welcome',
        desc: 'Set out the sign-in sheet early. Two guests appear, ready for a follow-up. Once per day.',
      },
      openHouseBonus: 0.2,
      unlock: { hint: 'HOST 2 OPEN HOUSES IN ONE SEASON', met: (s) => (s.stats.openHouses || 0) >= 2 },
    }),
    make({
      id: 'jillian',
      name: 'JILLIAN BILDEN',
      short: 'JILLIAN',
      title: 'The Short Fight',
      role: 'office', secret: true,
      color: C.orange, accent: C.yellow,
      hair: '#3a3f52', shirt: C.red, trim: C.yellow, look: 'tiny',
      catchphrase: 'I am short. The offer is not.',
      bio: [
        'Grand Rapids office. Tiny, and she knows it.',
        'Will pick a friendly fight with any standoff.',
        'Fearless at the table. Shakes hands after. Always.',
      ],
      strengths: ['NEGOTIATE +30%', 'STANDOFFS GO HER WAY'],
      ability: {
        name: 'STAND YOUR GROUND',
        effect: 'standoff',
        desc: 'Square up with a smile. The best offer goes pending. Hard talks are her fun. Once per day.',
        lines: [
          'She stepped up. The other side sat down.',
          'Short speech. Firm number. Then a grin.',
          'Friendly fight. Firm handshake after.',
        ],
      },
      negotiateBonus: 0.3,
      unlock: { hint: 'WIN 2 NEGOTIATIONS IN ONE SEASON', met: (s) => (s.stats.negotiationsWon || 0) >= 2 },
    }),
    make({
      id: 'deb',
      name: 'DEB DANLEY',
      short: 'DEB',
      title: 'The Steady Hand',
      role: 'office', secret: true,
      color: C.lime, accent: C.white,
      hair: '#c0a060', shirt: C.teal, trim: C.lime,
      catchphrase: 'Slow is smooth. Smooth gets to closing.',
      bio: [
        'Grand Rapids office.',
        'Keeps jittery deals from bolting.',
        'Leads ghost less often on her watch.',
      ],
      strengths: ['GHOSTING DOWN', 'LEADS COOL SLOWER'],
      ability: {
        name: 'STEADY NOW',
        effect: 'clearIssue',
        desc: 'Talk a snag down. An inspection issue clears, or a lead steps forward. Once per day.',
      },
      decayMult: 0.8, ghostMult: 0.65,
      unlock: { hint: 'WIN A SEASON', met: (s) => !!s.stats.wonSeason },
    }),
    make({
      id: 'jordan',
      name: 'JORDAN HESS',
      short: 'JORDAN',
      title: 'The Spark',
      role: 'office', secret: true,
      color: C.yellow, accent: C.orange,
      hair: '#6b4226', shirt: C.red, trim: C.yellow,
      catchphrase: 'One more call. Then one more.',
      bio: [
        'Grand Rapids office.',
        'Streaks suit this agent. Momentum is the whole bit.',
        'A hot week makes every task a little easier.',
      ],
      strengths: ['STREAKS HIT HARDER', 'SPARK REFRESH'],
      ability: {
        name: 'SPARK',
        effect: 'spark',
        desc: 'Catch a second wind. +1 energy and your best lead moves. Once per day.',
      },
      unlock: { hint: 'BUILD A 4-DAY STREAK', met: (s) => (s.bestStreak || 0) >= 4 },
    }),
    make({
      id: 'bridger',
      name: 'BRIDGER HOPKINS',
      short: 'BRIDGER',
      title: 'The Kind Closer',
      role: 'office', secret: true,
      color: '#e7a07a', accent: C.yellow,
      hair: '#8a3a2a', shirt: C.navy, trim: '#e7a07a',
      catchphrase: 'A clean offer is a kind offer.',
      bio: [
        'Grand Rapids office.',
        'Good at the moment a maybe becomes a yes.',
        'Negotiates like a neighbor, not a hammer.',
      ],
      strengths: ['NEGOTIATE +20%', 'LISTING PITCH +10%'],
      ability: {
        name: 'CLEAN OFFER',
        effect: 'advance',
        desc: 'Put a tidy offer on the table. Your best lead jumps a stage. Once per day.',
      },
      negotiateBonus: 0.2, listingBonus: 0.1,
      unlock: { hint: 'GET 3 DEALS TO PENDING IN ONE SEASON', met: (s) => (s.stats.pendings || 0) >= 3 },
    }),
    make({
      id: 'matt',
      name: 'MATT HUEBSCHER',
      short: 'MATT',
      title: 'The Price Guide',
      role: 'office', secret: true,
      color: C.yellow, accent: C.white,
      hair: '#3a3f52', shirt: C.slate, trim: C.yellow,
      catchphrase: 'The right price finds the right buyer.',
      bio: [
        'Grand Rapids office.',
        'Pricing is the game, and the game is fair.',
        'Listings he touches tend to be worth a little more.',
      ],
      strengths: ['LISTING VALUE +8%', 'LUXURY +10%'],
      ability: {
        name: 'PRICE IT RIGHT',
        effect: 'price',
        desc: 'Revisit the price with care. A listing gains value and momentum. Once per day.',
      },
      valueBonus: 0.08, luxuryValueBonus: 0.1, listingBonus: 0.08,
      unlock: { hint: 'EARN $12,000 COMMISSION IN ONE SEASON', met: (s) => s.stats.commission >= 12000 },
    }),
    make({
      id: 'bethany',
      name: 'BETHANY LEADLEY',
      short: 'BETHANY',
      title: 'The Tour Guide',
      role: 'office', secret: true,
      color: C.lime, accent: C.sky,
      hair: '#c0a060', shirt: C.lime, trim: C.sky,
      catchphrase: 'We will know it when we walk in.',
      bio: [
        'Grand Rapids office.',
        'Showings are her favorite room in the job.',
        'Buyers find "the one" a little faster.',
      ],
      strengths: ['SHOWINGS +12%', 'TOUR ADVANCE'],
      ability: {
        name: 'THE RIGHT HOUSE',
        effect: 'advance',
        desc: 'Walk a buyer into the right kitchen. Your best lead jumps a stage. Once per day.',
      },
      showBonus: 0.12,
      unlock: { hint: 'SIGN 3 BUYER CLIENTS IN ONE SEASON', met: (s) => (s.stats.buyers || 0) >= 3 },
    }),
    make({
      id: 'emily',
      name: 'EMILY LUTZ',
      short: 'EMILY',
      title: 'The Connector',
      role: 'office', secret: true,
      color: '#e7a0c8', accent: C.white,
      hair: '#6b4226', shirt: '#c2478f', trim: C.white,
      catchphrase: 'Good work gets talked about.',
      bio: [
        'Grand Rapids office.',
        'Introductions are the whole strategy.',
        'Happy clients hand her the next name.',
      ],
      strengths: ['REFERRALS +', 'TWO NAMES A DAY'],
      ability: {
        name: 'WHO DO YOU KNOW',
        effect: 'referral',
        desc: 'Ask the kind question. Two referrals call before supper. Once per day.',
      },
      referralBonus: 0.15,
      unlock: { hint: 'EARN 3 REFERRALS IN ONE SEASON', met: (s) => (s.stats.referrals || 0) >= 3 },
    }),
    make({
      id: 'adam',
      name: 'ADAM MARKS',
      short: 'ADAM',
      title: 'The Early Start',
      role: 'office', secret: true,
      color: C.orange, accent: C.yellow,
      hair: '#3a3f52', shirt: C.gray, trim: C.orange,
      catchphrase: 'The early call gets the listing.',
      bio: [
        'Grand Rapids office.',
        'The first task of the day lands cleaner.',
        'April closings are a point of pride in this game.',
      ],
      strengths: ['FIRST TASK +', 'MORNING WARMTH'],
      ability: {
        name: 'DAWN DIAL',
        effect: 'dawn',
        desc: 'A morning round of calls. Every new and warm lead heats up. Once per day.',
      },
      unlock: { hint: 'CLOSE A HOME IN APRIL', met: (s) => !!s.stats.aprilClose },
    }),
    make({
      id: 'stephanie',
      name: 'STEPHANIE MASCARENAS',
      short: 'STEPHANIE',
      title: 'The Presenter',
      role: 'office', secret: true,
      color: C.sky, accent: C.white,
      hair: '#3a3f52', shirt: C.blue, trim: C.white,
      catchphrase: 'Let the house do the talking.',
      bio: [
        'Grand Rapids office.',
        'Listing appointments are a show she is ready for.',
        'Sellers say yes a little more often.',
      ],
      strengths: ['LISTING PITCH +25%'],
      ability: {
        name: 'THE WALKTHROUGH',
        effect: 'advance',
        desc: 'Walk the house like you mean it. Your best lead jumps a stage. Once per day.',
      },
      listingBonus: 0.25,
      unlock: { hint: 'TAKE 2 LISTINGS IN ONE SEASON', met: (s) => (s.stats.listings || 0) >= 2 },
    }),
    make({
      id: 'scotty',
      name: 'SCOTTY PUGLISI',
      short: 'SCOTTY',
      title: 'The Pastor\'s Wife',
      role: 'office', secret: true,
      color: '#e7b7c8', accent: C.yellow,
      hair: '#6b4226', shirt: '#f0d8c8', trim: C.yellow, look: 'welcome',
      catchphrase: 'Come in. The coffee is on, and so is the church family.',
      bio: [
        'Grand Rapids office. A pastor\'s wife.',
        'Hospitality first. A casserole, a kitchen table, a real welcome.',
        'The prayer chain is a referral network with a kind heart.',
      ],
      strengths: ['PRAYER-CHAIN REFERRALS', 'HOSPITALITY', 'LEADS FEEL LOOKED AFTER'],
      ability: {
        name: 'PRAYER CHAIN',
        effect: 'prayerchain',
        desc: 'Ask the church family who could use a good hand. Warm referrals and a hotdish. Once per day.',
        lines: [
          'The prayer chain went out with the morning coffee.',
          'Somebody brought tater-tot hotdish. Somebody brought a name.',
          'No pitch. Just "we have been thinking of you."',
        ],
      },
      referralBonus: 0.18, happyMult: 1.25, openHouseBonus: 0.1, decayMult: 0.85,
      unlock: { hint: 'EARN 2 REFERRALS IN ONE SEASON', met: (s) => (s.stats.referrals || 0) >= 2 },
    }),
    make({
      id: 'tania',
      name: 'TANIA SUONVIERI',
      short: 'TANIA',
      title: 'The File Captain',
      role: 'office', secret: true,
      color: C.cyan, accent: C.white,
      hair: '#3a3f52', shirt: '#245860', trim: C.cyan,
      catchphrase: 'Signed, dated, and ready for keys.',
      bio: [
        'Grand Rapids office.',
        'Paperwork moves when she is on the file.',
        'Pending deals reach the closing table sooner.',
      ],
      strengths: ['FASTER PENDINGS', 'INSPECTIONS +'],
      ability: {
        name: 'FILE IT',
        effect: 'file',
        desc: 'Clear the snag in the file. An issue or a delay comes off a pending deal. Once per day.',
      },
      inspectBonus: 0.1,
      unlock: { hint: 'CLEAR 2 INSPECTION ISSUES', met: (s, p) => (p.lifetime.inspectionsCleared || 0) >= 2 },
    }),
    make({
      id: 'gaige',
      name: 'GAIGE WALDVOGEL',
      short: 'GAIGE',
      title: 'The Hustle',
      role: 'office', secret: true,
      color: C.orange, accent: C.lime,
      hair: '#6b4226', shirt: C.orange, trim: C.lime,
      catchphrase: 'New day, new doorbell.',
      bio: [
        'Grand Rapids office.',
        'Starts light and levels up with every few closings.',
        'The grind is the perk. It shows.',
      ],
      strengths: ['STARTS LIGHT', '+ENERGY EVERY 3 SALES'],
      ability: {
        name: 'ONE MORE DOOR',
        effect: 'advance',
        desc: 'Knock one more time. Your best lead jumps a stage. Once per day.',
      },
      unlock: { hint: 'FINISH 2 SEASONS', met: (s, p) => (p.lifetime.seasons || 0) >= 2 },
    }),
    make({
      id: 'kaila',
      name: 'KAILA WASS',
      short: 'KAILA',
      title: 'Bigfork Original',
      role: 'office', secret: true,
      color: '#8faf62', accent: '#e07020',
      hair: '#c0a060', shirt: '#3d5c34', trim: '#e07020', look: 'camo',
      catchphrase: 'Truck is warm. Ice is thick. Let us go look at that camp.',
      bio: [
        'Grand Rapids office. From Bigfork.',
        'Camo jacket, blaze-orange cap, a truck that starts in January.',
        'Deer camp, ice fishing, and a handshake that means something.',
      ],
      strengths: ['WOODS LEADS x2', 'BLIZZARDS DO NOT STOP THE TRUCK', 'ICE HOUSE TOUR'],
      ability: {
        name: 'ICE HOUSE TOUR',
        effect: 'bigfork',
        desc: 'Take the truck out. Woods and lake leads warm up, and a camp buyer calls. Weather does not get a vote. Once per day.',
        lines: [
          'Bigfork called. The fish are biting and so is a buyer.',
          'She left the truck running. That is hospitality up here.',
          'Deer camp small talk just turned into a showing.',
        ],
      },
      lakeLeadWeight: 1.7, outdoorsWeight: 2, showBonus: 0.08,
      unlock: { hint: 'SELL A LAKE, CABIN, HUNTING, OR FARM PLACE', met: (s) => (s.stats.outdoorsSold || 0) >= 1 },
    }),
  ];

  const list = starters.concat(office);
  G.Data.CHARACTERS = {};
  list.forEach((ch) => { G.Data.CHARACTERS[ch.id] = ch; });
  G.Data.ROSTER = list.map((ch) => ch.id);
  G.Data.SECRET_CHARACTERS = {};
  delete G.Data.BLAKE;
  delete G.Data.TYLER;
  if (G.Data.MAP && G.Data.MAP.locations) {
    delete G.Data.MAP.locations.growthlab;
    delete G.Data.MAP.locations.systemslab;
  }

  G.Data.RIVAL = {
    id: 'billboard',
    name: 'BILLBOARD',
    title: 'A fictional highway-sign brokerage',
    sprite: 'rivalBroker',
    color: C.red,
  };

  G.Roster = {
    list,
    starters,
    office,
    officeCount: office.length,

    unlockedCount() {
      return office.filter((ch) => G.Profile.unlocked(ch.id)).length;
    },

    evaluate(s) {
      const profile = G.Profile.load();
      const newly = [];
      for (const ch of office) {
        if (!ch.unlock || G.Profile.unlocked(ch.id)) continue;
        let met = false;
        try { met = !!ch.unlock.met(s, profile); } catch (e) { met = false; }
        if (met && G.Profile.unlock(ch.id, ch.unlock.hint)) newly.push(ch);
      }
      return newly;
    },
  };
})();
