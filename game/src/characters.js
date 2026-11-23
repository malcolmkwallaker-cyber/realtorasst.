// ============================================================
// characters.js - THE roster. Edit this file to change who is
// playable, how they play, and how office agents unlock.
//
// Malcolm Wallaker starts unlocked. Parker (CEO) and Liz (operator) are rare.
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
    if (look === 'broccoli') {
      // Big curly top, one gold earring. The hair enters the room first.
      return G.makeSprite([
        'GGGGGGGGGGGGGG',
        '.GGGgGGGgGGGg.',
        'GGGgGGGgGGGgGG',
        '.GGgGGGgGGGgG.',
        '..GSSSSSSSG...',
        '..GSSKSSKSG.E.',
        '...GSSWWSS..E.',
        '....SSSSSS....',
        '...BBBBBBB....',
        '..BBBBBBBBB...',
        '..S.BBBBBB.S..',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
        '..............',
      ], { G: '#3f8f3a', g: '#7dce55', S: skin, K: C.ink, W: C.white, E: '#ffd24a', B: shirt, D: C.dusk });
    }
    if (look === 'beard') {
      // The beard is the whole portrait. It has seniority.
      return G.makeSprite([
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HSSSSSSH...',
        '...HSKSSKSH...',
        '....SSWWSS....',
        '...RRRRRRRR...',
        '..RRRRRRRRRR..',
        '..RRRrRRRrRR..',
        '..RRRRRRRRRR..',
        '...RRRRRRRR...',
        '..S.RRRRRR.S..',
        '....RRRRRR....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
        '..............',
      ], { H: hair, S: skin, K: C.ink, W: C.white, R: '#4a3424', r: '#7a5a3a', D: C.dusk, B: shirt });
    }
    if (look === 'flyer') {
      // Steady as ever, plus the carry-on she will not gate-check.
      return G.makeSprite([
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HSSSSSSH...',
        '...HSKSSKSH...',
        '..THSSSSSSHT..',
        '..T.SSWWSS.T..',
        '..T.SSSSSS....',
        '..T.BBBBBB.UU.',
        '..TBBBBBBBBUU.',
        '..BBBBOBBB.UU.',
        '..S.BBOBBB....',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, O: trim || C.yellow, D: C.dusk, T: trim || shirt, U: '#d7c4a3' });
    }
    if (look === 'range') {
      // Flannel and a cap. Hibbing to Eveleth, she knows the road.
      return G.makeSprite([
        '....CCCCCCCC..',
        '...CCCCCCCCC..',
        '...CSSSSSSC...',
        '...CSKSSKSC...',
        '....SSSSSS....',
        '....SSWWSS....',
        '....SSSSSS....',
        '...FLFLFLFL...',
        '..FLFLFLFLFL..',
        '..SFLFLFLFL.S.',
        '....FLFLFL....',
        '....FLFLFL....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
        '..............',
      ], { C: '#8d1d2c', S: skin, K: C.ink, W: C.white, F: '#6b2a22', L: '#c4553a', D: C.dusk });
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
      catchphrase: 'The season is me and Bridger. The desk makes us better.',
      bio: [
        'Office leader in Grand Rapids. The default agent.',
        'His season is the head-to-head with Bridger Hopkins.',
        'He recruits agents, and the whole team gets louder.',
      ],
      strengths: ['OFFICE LEADER', 'RECRUITS LIFT THE TEAM', 'HEAD TO HEAD WITH BRIDGER'],
      ability: {
        name: 'OFFICE LEADER',
        effect: 'recruit',
        desc: 'Bring an agent onto the desk. The recruit boosts the whole team: warmer leads and a little extra zip. Once per day.',
        lines: [
          'New agent on the floor. Everybody just got backup.',
          'Recruiting day. The book belongs to the whole office now.',
          'One more teammate. Bridger can hear the desk from here.',
        ],
      },
      videoBonus: 0.05, openHouseBonus: 0.05, lakeLeadWeight: 1.2,
    }),
    make({
      id: 'parker',
      name: 'PARKER PEMBERTON',
      short: 'PARKER',
      title: 'CEO, Pemberton Real Estate',
      role: 'owner',
      badge: 'CEO',
      secret: true,
      color: C.yellow, accent: C.white,
      hair: '#3a3f52', shirt: C.navy, trim: C.yellow,
      catchphrase: 'CEO mode. The whole desk gets a lift.',
      bio: [
        'Owner and CEO of Pemberton Real Estate.',
        'Rare. You earn the chair by winning the season and the final boss.',
        'Bigger deals, more energy, and the market notices the boss is in.',
      ],
      strengths: ['CEO MODE', '+1 ENERGY', 'COMMISSION +25%', 'BIGGER DEALS'],
      ability: {
        name: 'CEO MODE',
        effect: 'ceo',
        desc: 'Lift the whole book. Every lead warms up, a bigger deal appears, and the company puts cash behind it. Once per day.',
        lines: [
          'He did not raise his voice. The pipeline stood up straighter.',
          'The whole desk eats when this one moves.',
          'Bigger deal. Same kindness. That is the job.',
        ],
      },
      energyMod: 1, commissionMult: 1.25, negotiateBonus: 0.15, listingBonus: 0.12,
      luxuryValueBonus: 0.15, rivalPressure: 0.1, startCash: 15000, startReputation: 78,
      unlock: {
        hint: 'BEAT THE FINAL BOSS AND WIN THE SEASON',
        met: (s) => !!s.stats.wonSeason && (s.stats.bossWins || 0) >= 3,
      },
    }),
    make({
      id: 'liz',
      name: 'LIZ REIN',
      short: 'LIZ',
      title: 'Second in Command',
      role: 'operator',
      badge: 'OPS',
      secret: true,
      color: C.sky, accent: C.white,
      hair: '#8a5a44', shirt: C.sky, trim: C.white,
      catchphrase: 'Consider it done. I will make it happen.',
      bio: [
        'Pemberton Real Estate. Second chair. She runs the show.',
        'Rare. Win a season with 8 homes and the desk is hers.',
        'Blockers move. Stalled files finish. Deals cross the line.',
      ],
      strengths: ['MAKES IT HAPPEN', 'CLEARS BLOCKERS', 'FOLLOW UP +2'],
      ability: {
        name: 'MAKES IT HAPPEN',
        effect: 'happen',
        desc: 'Clear the blockers. Inspections, delays, and a stalled deal get pushed across the line. Once per day.',
        lines: [
          'She said "on it" and the file was already moving.',
          'The stall ended because Liz decided it would.',
          'No drama. The thing that was stuck is not stuck.',
        ],
      },
      followupBonus: 2, decayMult: 0.75, referralBonus: 0.08,
      unlock: {
        hint: 'WIN A SEASON WITH 8 HOMES SOLD',
        met: (s) => !!s.stats.wonSeason && (s.stats.homesSold || 0) >= 8,
      },
    }),
  ];

  const office = [
    make({
      id: 'rebekkah',
      name: 'REBEKKAH ANDERSON',
      short: 'BEKKAH',
      title: 'The Side Hustle',
      role: 'office', secret: true,
      color: C.yellow, accent: C.orange,
      hair: '#6b4226', shirt: C.orange, trim: C.yellow,
      catchphrase: 'You should start a business. Actually, start twelve.',
      bio: [
        'Grand Rapids office. She goes by Bekkah.',
        'Talks business the way other people talk weather.',
        'Every closing is a commission plus a side-hustle idea.',
      ],
      strengths: ['COMMISSION +18%', 'SIDE-HUSTLE CASH', 'TWELVE IDEAS A DAY'],
      ability: {
        name: 'TWELVE BUSINESSES',
        effect: 'ideas',
        desc: 'Bekkah pitches a dozen side hustles and one of them pays today. Plus a business-minded lead. Once per day.',
        lines: [
          'Bait shop. Ice-castle rental. Hotdish window. Pontoon sunrise tours.',
          'Firewood bundles. Fish-house weekends. Snowmobile shuttle. Cabin coffee.',
          'Leech Lake guides. Yard-sign repair. Chainsaw welcome bears. And real estate, which you already started.',
        ],
      },
      commissionMult: 1.18,
      unlock: { hint: 'EARN $8,000 COMMISSION IN ONE SEASON', met: (s) => s.stats.commission >= 8000 },
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
      catchphrase: 'Slow is smooth. I have also made this drive from the airport.',
      bio: [
        'Grand Rapids office. Steady, and a travel hand.',
        'Keeps jittery deals from bolting.',
        'Out-of-town buyers land softly. She already knows the gate.',
      ],
      strengths: ['GHOSTING DOWN', 'LEADS COOL SLOWER', 'FREQUENT FLYER'],
      ability: {
        name: 'STEADY NOW',
        effect: 'clearIssue',
        desc: 'Talk a snag down, even if the buyer is still on a layover. An issue clears, or a lead steps forward. Once per day.',
        lines: [
          'She talked them through it between connections.',
          'The out-of-town buyer landed. Deb already had the car.',
          'Miles on the card. Patience in the file. Both count.',
        ],
      },
      decayMult: 0.8, ghostMult: 0.65, reloWeight: 2.2, look: 'flyer',
      unlock: { hint: 'WIN A SEASON', met: (s) => !!s.stats.wonSeason },
    }),
    make({
      id: 'jordan',
      name: 'JORDAN HESS',
      short: 'JORDAN',
      title: 'The Buyer Agent',
      role: 'office', secret: true,
      color: C.sky, accent: C.white,
      hair: '#3a3f52', shirt: C.blue, trim: C.sky,
      catchphrase: 'Tell me what home feels like. I will go find it.',
      bio: [
        'Grand Rapids office. Buyer agent, through and through.',
        'Showings click. Buyers sign. Offers get written.',
        'Confident, and still the calm one in the car.',
      ],
      strengths: ['SHOWINGS +18%', 'BUYERS CONVERT FASTER', 'WRITES TWO OFFERS'],
      ability: {
        name: 'BUYER DAY',
        effect: 'buyerday',
        desc: 'A full day on the buy side. Your best buyer signs or goes under offer. Once per day.',
        lines: [
          'Jordan already had three houses in mind.',
          'The buyer said yes before the porch light was off.',
          'Offer drafted in the driveway. That is the job.',
        ],
      },
      showBonus: 0.18,
      unlock: { hint: 'WRITE 3 OFFERS IN ONE SEASON', met: (s) => (s.stats.offersWritten || 0) >= 3 },
    }),
    make({
      id: 'bridger',
      name: 'BRIDGER HOPKINS',
      short: 'BRIDGER',
      title: 'Price Is Right',
      role: 'office', secret: true,
      color: '#e7a07a', accent: C.yellow,
      hair: '#8a3a2a', shirt: C.navy, trim: '#e7a07a',
      catchphrase: 'Price it right and the sign does the rest.',
      bio: [
        'The other half of the season. Malcolm across the table.',
        'Every pricing call runs through him. He lands the number.',
        'If Malcolm overprices, Bridger is already in the driveway.',
      ],
      strengths: ['PRICE IS RIGHT', 'LISTINGS MOVE', 'STEALS AN OVERPRICED LISTING'],
      ability: {
        name: 'PRICE IS RIGHT',
        effect: 'priceisright',
        desc: 'Set the perfect list price. A listing sheds a bad number and draws an offer. Once per day.',
        lines: [
          'He said the number once. The seller nodded.',
          'Not high. Not cute. The price the market will actually pay.',
          'Malcolm can recruit the desk. Bridger will price the house.',
        ],
      },
      listingBonus: 0.08, negotiateBonus: 0,
      unlock: { hint: 'LAND THE RIGHT PRICE ON 2 LISTINGS', met: (s) => (s.stats.perfectPrices || 0) >= 2 },
    }),
    make({
      id: 'matt',
      name: 'MATT HUEBSCHER',
      short: 'MATT',
      title: 'The Price Guide',
      role: 'office', secret: true,
      color: C.yellow, accent: C.white,
      hair: '#3a3f52', shirt: C.slate, trim: C.yellow,
      catchphrase: 'The beard has seen worse deals than this. We are fine.',
      bio: [
        'Grand Rapids office. The beard is the legend.',
        'Folks joke it could fix a Monday. It does fix deals.',
        'A comeback with a smile under all that seniority.',
      ],
      strengths: ['MIRACLE BEARD', 'RESCUES SICK DEALS', 'COMEBACK CLOSER'],
      ability: {
        name: 'MIRACLE BEARD',
        effect: 'miracle',
        desc: 'The beard goes to work. A stuck inspection, a delay, or a cooling lead gets another chance. Once per day.',
        lines: [
          'They joke the beard could fix a whole Monday.',
          'It did not say a word. The deal sat up anyway.',
          'Comeback energy, politely, from behind the beard.',
        ],
      },
      look: 'beard',
      unlock: { hint: 'RESCUE 2 DEALS IN ONE SEASON', met: (s) => (s.stats.dealsRescued || 0) >= 2 },
    }),
    make({
      id: 'bethany',
      name: 'BETHANY LEADLEY',
      short: 'BETHANY',
      title: 'The Tour Guide',
      role: 'office', secret: true,
      color: C.lime, accent: C.sky,
      hair: '#c0a060', shirt: C.lime, trim: C.sky,
      catchphrase: 'You are not a bother. Tell me what you need.',
      bio: [
        'Grand Rapids office. A nurse\'s heart in a listing folder.',
        'She notices when someone is slipping, and she stays.',
        'Trust comes back. Morale comes back with it.',
      ],
      strengths: ['NURSE\'S HEART', 'TRUST COMES BACK', 'MORALE UP'],
      ability: {
        name: 'NURSE\'S HEART',
        effect: 'nurse',
        desc: 'A careful check-in. At-risk clients feel looked after, and the office morale lifts. Once per day.',
        lines: [
          'She asked how they were doing before she asked about the house.',
          'Nobody got a lecture. They got a person who stayed.',
          'Trust is a vital sign. Hers just improved.',
        ],
      },
      happyMult: 1.45, decayMult: 0.82,
      unlock: { hint: 'REACH 85 CLIENT HAPPINESS', met: (s) => s.stats.happiness >= 85 },
    }),
    make({
      id: 'emily',
      name: 'EMILY LUTZ',
      short: 'EMILY',
      title: 'The Connector',
      role: 'office', secret: true,
      color: '#e7a0c8', accent: C.white,
      hair: '#6b4226', shirt: '#c2478f', trim: C.white,
      catchphrase: 'That Zillow ping is a person. I answer like one.',
      bio: [
        'Grand Rapids office. Zillow leads are her craft.',
        'Online inquiries become real appointments.',
        'Fast, kind, and she actually calls them back.',
      ],
      strengths: ['ZILLOW FLIP', 'ONLINE LEADS x2', 'PINGS BECOME APPTS'],
      ability: {
        name: 'ZILLOW FLIP',
        effect: 'zillow',
        desc: 'Turn the newest online leads into appointments. If the inbox is quiet, a fresh Zestimate lead calls. Once per day.',
        lines: [
          'She called before the listing alert finished loading.',
          'Online lead, real voice, Saturday showing.',
          'They said they were just looking. Emily booked the tour.',
        ],
      },
      unlock: { hint: 'FLIP 3 ONLINE LEADS INTO APPOINTMENTS', met: (s) => (s.stats.zillowFlips || 0) >= 3 },
    }),
    make({
      id: 'adam',
      name: 'ADAM MARKS',
      short: 'ADAM',
      title: 'The Early Start',
      role: 'office', secret: true,
      color: C.orange, accent: C.yellow,
      hair: '#3a3f52', shirt: C.gray, trim: C.orange,
      catchphrase: 'Fun fact. I already read the comps. And the buyer.',
      bio: [
        'Grand Rapids office. He knows literally everything.',
        'Lovable about it. Mostly.',
        'Hidden motives, market facts, the right answer. He shares.',
      ],
      strengths: ['KNOW IT ALL', 'SEES THE BEST ANSWER', 'COMPS ON COMMAND'],
      ability: {
        name: 'KNOW IT ALL',
        effect: 'know',
        desc: 'Adam opens the file in his head. You learn what the buyer wants, plus a market fact, and the lead moves. Once per day.',
        lines: [
          'He started with "actually" and somehow it was helpful.',
          'The buyer wants a shop for the truck. Adam knew on page one.',
          'Frontage, sunset side, legal dock. He did not even look it up.',
        ],
      },
      listingBonus: 0.12, negotiateBonus: 0.1,
      unlock: { hint: 'WIN A HEAD-TO-HEAD LISTING BATTLE', met: (s) => (s.stats.battleWins || 0) >= 1 },
    }),
    make({
      id: 'stephanie',
      name: 'STEPHANIE MASCARENAS',
      short: 'STEPHANIE',
      title: 'Sells Anything',
      role: 'office', secret: true,
      color: C.sky, accent: C.white,
      hair: '#3a3f52', shirt: C.blue, trim: C.white,
      catchphrase: 'If it has a door, I can sell it. Watch.',
      bio: [
        'Grand Rapids office. She can sell any home.',
        'Overpriced, odd, or stubborn. She still finds the buyer.',
        'Confident, and the seller feels taken care of.',
      ],
      strengths: ['SELL ANYTHING', 'LISTING PITCH +40%', 'TOUGH HOMES MOVE'],
      ability: {
        name: 'SELL ANYTHING',
        effect: 'sellany',
        desc: 'Guarantee movement on the toughest listing. A stuck or overpriced house gets an offer, or a seller says yes. Once per day.',
        lines: [
          'She looked at the odd house and said, "Yep. I know who."',
          'The seller wanted double. Stephanie found the person anyway.',
          'Tough listing. Easy confidence. The sign is coming.',
        ],
      },
      listingBonus: 0.4,
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
      title: 'Iron Range Insider',
      role: 'office', secret: true,
      color: '#c4553a', accent: C.yellow,
      hair: '#3a3f52', shirt: '#6b2a22', trim: '#c4553a', look: 'range',
      catchphrase: 'Hibbing, Virginia, Eveleth, Chisholm. I know which coffee is good.',
      bio: [
        'Grand Rapids office. Iron Range, born into the work.',
        'Hibbing, Virginia, Eveleth, Chisholm. She has the back roads.',
        'Range deals come in warmer, and they close like neighbors.',
      ],
      strengths: ['IRON RANGE INSIDER', 'RANGE DEALS PAY MORE', 'KNOWS THE TOWNS'],
      ability: {
        name: 'IRON RANGE INSIDER',
        effect: 'range',
        desc: 'A Range buyer calls from Hibbing, Virginia, Eveleth, or Chisholm. Warm, local, and ready to talk. Once per day.',
        lines: [
          'She said the name of the street before they finished the sentence.',
          'Eveleth to Chisholm is not a commute. It is a conversation.',
          'Virginia called. Tania already knew the basement.',
        ],
      },
      rangeValue: 1.12,
      unlock: { hint: 'CLOSE A DEAL IN HIBBING, VIRGINIA, EVELETH, OR CHISHOLM', met: (s) => (s.stats.rangeSold || 0) >= 1 },
    }),
    make({
      id: 'gaige',
      name: 'GAIGE WALDVOGEL',
      short: 'GAIGE',
      title: 'The Hustle',
      role: 'office', secret: true,
      color: C.orange, accent: C.lime,
      hair: '#6b4226', shirt: C.orange, trim: C.lime,
      catchphrase: 'The hair arrived first. The earring caught the porch light.',
      bio: [
        'Grand Rapids office. Broccoli on top, on purpose.',
        'One earring. It sparkles when a deal is about to move.',
        'Starts light. The crown grows every few closings.',
      ],
      strengths: ['BROCCOLI BOOST', 'EARRING TELLS THE TRUTH', '+ENERGY EVERY 3 SALES'],
      ability: {
        name: 'BROCCOLI BOOST',
        effect: 'broccoli',
        desc: 'The top gets ideas. Two days of extra zip, the earring sparks, and a lead steps forward. Once per day.',
        lines: [
          'He shook his head and the whole room noticed.',
          'The earring did a little flash. That means go.',
          'Broccoli boost. Silly name. Real appointments.',
        ],
      },
      look: 'broccoli',
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

  G.Data.RANGE_TOWNS = ['HIBBING', 'VIRGINIA', 'EVELETH', 'CHISHOLM'];
  if (G.Data.MAP && G.Data.MAP.towns) {
    const extra = [
      { id: 'hibbing', name: 'HIBBING', x: 292, y: 42 },
      { id: 'chisholm', name: 'CHISHOLM', x: 348, y: 30 },
      { id: 'virginia', name: 'VIRGINIA', x: 418, y: 34 },
      { id: 'eveleth', name: 'EVELETH', x: 458, y: 52 },
    ];
    for (const t of extra) {
      if (!G.Data.MAP.towns.some((x) => x.id === t.id)) G.Data.MAP.towns.push(t);
    }
  }

  // Earring twinkle for Gaige. t is seconds.
  G.sparkle = function (ctx, x, y, t, n) {
    const count = n || 3;
    for (let i = 0; i < count; i++) {
      const ph = t * 7 + i * 1.8;
      if (Math.sin(ph) < 0.15) continue;
      ctx.fillStyle = i % 2 ? '#fff6c2' : '#ffd24a';
      ctx.fillRect(Math.round(x + Math.cos(ph) * 5), Math.round(y + Math.sin(ph * 1.4) * 4), 2, 2);
    }
  };

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
      for (const ch of list) {
        if (!ch.secret || !ch.unlock || G.Profile.unlocked(ch.id)) continue;
        let met = false;
        try { met = !!ch.unlock.met(s, profile); } catch (e) { met = false; }
        if (met && G.Profile.unlock(ch.id, ch.unlock.hint)) newly.push(ch);
      }
      return newly;
    },
  };
})();
