'use strict';

(() => {
  const ND = globalThis.ND;
  const SAVE = 'north-desk-fieldwork-v1';
  const DAY = 1440;
  const OPENING_MINUTE = 8*60+8;
  const OPENING_FLOAT = 1650;
  const COIN_VALUE = 20;
  const COFFEE_SECONDS = 10;
  const STAR_SECONDS = 15;
  const BRIDGER_DELAY = 15;
  const SHOWING_REMINDER = 15;
  const LATE_SHOWING_TRUST = 3;
  // Continue the existing saved showingAlert sequence (reminder, late, missed).
  const CHECKED_IN_ON_TIME=4, CHECKED_IN_IN_GRACE=5;
  const checkedIn=r=>r.showingAlert===CHECKED_IN_ON_TIME || r.showingAlert===CHECKED_IN_IN_GRACE;
  const events = [
    { id:'steady', title:'Clear roads', detail:'Normal showing windows and light traffic in the morning.' },
    { id:'snow', title:'Morning flurries', detail:'Snow crossings and shaded pavement stay slick into late morning.' },
    { id:'rain', title:'Afternoon rain', detail:'Rain moves across the Northland after lunch.' },
    { id:'fog', title:'Lake fog', detail:'Visibility drops near Lake Superior in the morning.' },
    { id:'bidding', title:'Another buyer is in', detail:'A competing offer gives sellers more room to hold their price.' },
    { id:'hesitant', title:'Seller asks for more time', detail:'Build in an extra 35 minutes when scheduling a new visit.' },
    { id:'contractor', title:'Contractor calls back', detail:'Same-day estimates shorten inspection follow-up.' },
  ];

  const showingDelays = [
    { title:'Wrong driveway', minutes:8, trust:-2,
      line:'A second open-house sign pointed your buyer to the house next door. You call and walk them over.' },
    { title:'Calendar mix-up', minutes:6, trust:-1,
      line:'Your client got a reminder with the wrong start time. You check the appointment and confirm access.' },
    { title:'Lockbox code changed', minutes:12, trust:-2,
      line:'The listing office sends you the updated code after you call from the porch.' },
    { title:'Two showings overlap', minutes:15, trust:-2,
      line:'Another agent is still finishing their walkthrough. You offer your client a look at the yard while you wait.' },
  ];

  function makeDay(index,seed) {
    let hash = (seed^Math.imul(index,0x9e3779b9)) >>> 0;
    hash = Math.imul(hash^(hash>>>16),0x7feb352d) >>> 0;
    const random=(hash^(hash>>>15))>>>0;
    const event = index===0 ? 0 : index===1 ? 1+random%(events.length-1) : random%events.length;
    return { index,event,files:0,showings:0,missed:0,delegated:0,offers:0,inspections:0,titles:0,closings:0,lost:0,
      miles:0,trust:0,roadNotes:0,showingDelays:0 };
  }

  function worked(day) {
    return Boolean(day.net || day.files || day.showings || day.missed || day.delegated || day.offers || day.inspections ||
      day.titles || day.closings || day.lost || day.miles>.01 || day.trust || day.roadNotes || day.showingDelays || day.rivals);
  }

  function openingEntry() {
    return { label:'Pemberton office expense float',amount:OPENING_FLOAT,day:OPENING_MINUTE,kind:'opening' };
  }

  const files = [
    {
      id: 'ramble', contact: 'Emily · buyer referral', staff: 'emily', advisor: 'jordan',
      client: 'Mara Chen', photo: 0, beds: '3 beds · 1 bath · 1,250 sq ft',
      list: 249000, low: 239000, high: 253000, limit: 251000, reserve: 245000, repair: 2100, fee: .024,
      intake: 'Mara wants a starter home within a short drive of work. She asked about the basement and wants an inspection even if the seller gets another offer.',
      notes: [
        ['living', 'Living room & front windows', 'The front window opens freely. The lower sash has light staining from condensation.',
          false,'Light condensation on a working sash is a routine condition.'],
        ['kitchen', 'Kitchen & plumbing', 'The cabinets are dry below the sink. The water heater date is in the seller’s disclosure.',
          false,'Dry cabinets and a documented heater age call for a routine note.'],
        ['rear', 'Basement entry & grading', 'At the basement stairwell, there’s a water mark under the rear window. The outside grade runs toward that wall.',
          true,'The water mark and grade point to possible water intrusion.'],
      ],
      report: 'The inspector found a disconnected downspout and soil sloped toward the foundation. The buyer wants a written drainage plan.',
      guidance: 'Recent closes cluster near $246,000. Keep the inspection contingency and leave room to negotiate the drainage separately.',
    },
    {
      id: 'cabin', contact: 'Kaila · acreage inquiry', staff: 'kaila', advisor: 'bridger',
      client: 'Nora and Ben Ortiz', photo: 1, beds: '2 beds · 1 bath · 0.8 acres',
      list: 399000, low: 368000, high: 397000, limit: 398000, reserve: 386500, repair: 4800, fee: .021,
      intake: 'Nora and Ben want year-round access without committing to a full renovation. They need a clear answer on the shared lane, private well, and septic system.',
      notes: [
        ['living', 'Porch & access', 'The gravel lane serves two lots. The seller provided a recorded maintenance agreement.'],
        ['kitchen', 'Well & water supply', 'The pressure tank is labeled. The last water test in the disclosure is two years old.', true],
        ['rear', 'Septic & shore setback', 'The seller’s sketch locates the drain field uphill, away from the shoreline.'],
      ],
      report: 'The well sample came back clear. A contractor found that the septic connection needs a new section before winter.',
      guidance: 'The easement and septic details matter more than another photo of the lake. Price it from the year-round comps.',
    },
    {
      id: 'range', contact: 'Tania · local buyer', staff: 'tania', advisor: 'matt',
      client: 'Rowan Fields', photo: 3, beds: '3 beds · 1 bath · 1,460 sq ft',
      list: 169500, low: 151000, high: 172000, limit: 165000, reserve: 159000, repair: 3100, fee: .025,
      intake: 'Rowan can do cosmetic work and has a firm financing ceiling. They need to know what to plan for before they commit to a fixer.',
      notes: [
        ['living', 'Plaster & old windows', 'One window sash sticks. The plaster cracks above it are narrow, with no visible movement at the frame.'],
        ['kitchen', 'Outlets & service', 'The seller’s disclosure identifies an older panel and a few ungrounded outlets.', true],
        ['rear', 'Back room & floor', 'A section of finish flooring is soft near the rear threshold.', true],
        ['roof', 'Roof & flashing', 'From the front walk, you can see missing shingles and a lifted edge on the chimney flashing.', true],
      ],
      report: 'The electrical service needs work. The electrician supplied a quote and flagged a few ungrounded outlets.',
      guidance: 'Give the buyer separate numbers for work they can do and work they need to hire out. Their financing ceiling is firm.',
    },
    {
      id: 'hoyt', side:'seller', contact: 'Stephanie · seller referral', staff: 'stephanie', advisor: 'tania',
      client: 'Avery Lund', photo: 4, beds: '2 beds · 1 bath · 1,190 sq ft',
      list: 179500, low: 170000, high: 181000, limit: 181000, reserve: 176500, repair: 1250, fee: .023,
      intake: 'Avery is relocating and wants you to list the house. Review the furnace records and the rear door before setting a price. Avery needs at least $176,500 before fees and expenses.',
      notes: [
        ['living', 'Daylight & layout', 'Two front windows light the main room. The second bedroom opens off the hall.'],
        ['kitchen', 'Heating controls', 'The thermostat responds. The seller included a furnace service sticker and the last two winter bills.'],
        ['rear', 'Weather sealing', 'Cold air is visible on the inspector’s thermal photo of the back door frame.', true],
      ],
      report: 'The furnace passed. A damaged exterior door and weather seal are the open items.',
      guidance: 'The renovated comps go higher than this house. Price it to bring buyers through and include the furnace service record in the disclosure packet.',
    },
    {
      id: 'duluth', contact: 'Adam · hillside inquiry', staff: 'adam', advisor: 'bekkah',
      client: 'Lena and Sam Patel', photo: 2, beds: '3 beds · 2 baths · 1,740 sq ft',
      list: 349900, low: 334000, high: 355000, limit: 352000, reserve: 341500, repair: 3600, fee: .0225,
      intake: 'Lena and Sam like the hillside and the view. Their lender wants the retaining wall checked, and the buyers want to know who can actually use the driveway.',
      notes: [
        ['living', 'View & window condition', 'The view opens downhill. A fogged pane in the side window looks like a failed seal.'],
        ['kitchen', 'Mechanical disclosure', 'The boiler was serviced last fall. The seller disclosed no changes to the boiler since purchase.'],
        ['rear', 'Retaining wall & driveway', 'The wall leans slightly at one corner. The parcel sketch shows the driveway crossing the property line.', true],
      ],
      report: 'A mason priced a small retaining wall repair. Title found a recorded shared-drive easement that needs to be delivered to the buyer.',
      guidance: 'Review the recorded driveway easement and keep the retaining wall in the inspection scope.',
    },
  ];

  const visitors = {
    ramble: { id:'mara',name:'Mara Chen',title:'Buyer',hair:'#24262b',shirt:'#46676d',skin:'#cc9a77',style:'bob',
      greeting:'Hi, I’m Mara. Can we take a look at the basement before we talk numbers?',
      reactions:{ living:'I can see the condensation on the sash. Let’s ask how often that happens.',
        kitchen:'That cabinet looks dry. I’d still like to see the water heater’s service date.',
        rear:'Good catch on that water mark. Let’s have the inspector trace where the water is coming from.' } },
    cabin: { id:'nora',name:'Nora Ortiz',title:'Buyer',hair:'#3e2c26',shirt:'#77634b',skin:'#b97d5c',style:'long',
      greeting:'Ben asked me to check the well and septic before we make a decision.' },
    range: { id:'rowan',name:'Rowan Fields',title:'Buyer',hair:'#6d493d',shirt:'#406064',skin:'#d3a783',style:'short',
      greeting:'I can handle paint and flooring. Tell me if you see anything that needs a specialist.' },
    hoyt: { id:'avery',name:'Avery Lund',title:'Seller',hair:'#806b55',shirt:'#827568',skin:'#ca9476',style:'short',
      greeting:'I pulled the furnace records. Let’s make sure we have the right details for the listing.' },
    duluth: { id:'lena',name:'Lena Patel',title:'Buyer',hair:'#29292e',shirt:'#8e654d',skin:'#a66c50',style:'long',
      greeting:'Sam and I are both curious about the retaining wall and who gets to use the driveway.' },
    inspector: { id:'inspector',name:'Riley Morgan',title:'Inspector',hair:'#685644',shirt:'#827444',style:'shortbeard',
      greeting:'Come take a look. I’ll point out what I found, then we can review the estimate.' },
  };

  const status = {
    lead: 'New inquiry', schedule: 'Book showing', booked: 'Showing booked', tour: 'Walkthrough',
    offer: 'Write offer', market: 'Listed', counter: 'Negotiation', inspection: 'Inspection', title: 'Title & lender',
    sign: 'Ready to close', closed: 'Closed', lost: 'File closed without sale',
  };

  const clockFormat = new Intl.DateTimeFormat('en-US', { hour:'numeric',minute:'2-digit',timeZone:'UTC' });
  const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday:'short',timeZone:'UTC' });
  const usd = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
  const money = (value) => usd.format(value);
  const time = (minute, date = false) => {
    if (!Number.isFinite(minute)) return '';
    const local = new Date(Date.UTC(2026,10,23,0,Math.floor(minute)));
    const clock = clockFormat.format(local);
    if (!date) return clock;
    const weekday = weekdayFormat.format(local);
    return weekday + ' · ' + clock;
  };

  const baseFiles = structuredClone(files);
  const baseVisitors = structuredClone(visitors);
  const DEAL_PEOPLE = {
    first:['Jess','Marcus','Dana','Kyle','Priya','Tom','Hannah','Luis','Grace','Owen','Bri','Cole','Nina','Derek','Sofia',
      'Wes','Tara','Gabe','Ellie','Reid','Maya','Jonah','Ruth','Andre'],
    last:['Halvorsen','Lindqvist','Okafor','Brennan','Moreau','Nyberg','Castillo','Dahl','Fischer','Ramos','Larsen','Quinn',
      'Kowalski','Sandberg','Whitfield','Aune','Moreno','Kask','Berg','Tollefson','Nguyen','Ostby'],
    hair:['#24262b','#3e2c26','#6d493d','#806b55','#29292e','#a07a4e','#4a3a2e','#b8a079'],
    shirt:['#46676d','#77634b','#406064','#827568','#8e654d','#5d6e4a','#6c5a7a','#7a4a44','#4d5f7a'],
    skin:['#cc9a77','#b97d5c','#d3a783','#ca9476','#a66c50','#e0b694','#8d5a3f'],
    style:['bob','long','short'],
  };
  const NOTE_POOL = {
    living: [
      ['Front windows & trim','Two sashes stick and the paint on the sills is checking.',false,'Sticky sashes and worn paint are routine upkeep.'],
      ['Ceiling stain','There’s a brown ring on the living room ceiling right below the upstairs bathroom.',true,
        'A stain under a bathroom can point to an active leak.',
        'The inspector traced the ceiling stain to a failed seal under the upstairs toilet. A plumber quoted the repair and a drywall patch.'],
      ['Floors & layout','The hardwood is worn near the entry but feels solid underfoot.',false,'Surface wear on solid flooring is cosmetic.'],
      ['Fireplace & damper','The firebox mortar is cracked and the damper won’t close all the way.',true,
        'Cracked firebox mortar is a fire safety item for a chimney sweep.',
        'A chimney sweep found cracked firebox mortar and a damaged damper. The fireplace needs repair before anyone uses it.'],
      ['Smoke detectors','Two smoke detectors chirp for new batteries and the hallway unit is missing.',false,
        'Detectors are a cheap, routine fix before closing.'],
      ['Wall crack','A diagonal crack runs from the corner of the front window toward the floor.',true,
        'A diagonal crack at a window corner can mean the house is settling.',
        'A structural engineer measured minor settling at the front wall and recommended a gutter extension and monitoring.'],
    ],
    kitchen: [
      ['Kitchen & sink','The cabinet under the sink is dry and the faucet runs clean.',false,'A dry sink base is a routine note.'],
      ['Sink cabinet','The cabinet floor under the sink is swollen and soft, with a water ring around the drain.',true,
        'A soft cabinet floor means a slow leak that needs a plumber.',
        'The plumber found a leaking drain trap and some subfloor damage under the kitchen sink.'],
      ['Water heater','The water heater label says it is twelve years old, and there’s rust at the base.',true,
        'An aging, rusting water heater is near the end of its life.',
        'The inspector confirmed the water heater is past its expected life and recommended replacing it.'],
      ['Appliances','The range and fridge are older but they work. The seller is leaving both.',false,
        'Working older appliances are a routine note.'],
      ['Electrical panel','The panel in the utility corner has a double-tapped breaker and a scorched label.',true,
        'Double taps and scorch marks are an electrician item.',
        'The electrician found a double-tapped breaker and a loose neutral. The panel needs a service call before closing.'],
      ['Furnace & filter','The furnace filter is dusty but the unit runs quietly. The service sticker is from last year.',false,
        'A recent service sticker makes this a routine note.'],
    ],
    rear: [
      ['Back door & deck','The back door sticks a little and two deck boards are weathered.',false,
        'Weathered boards and a sticky door are routine upkeep.'],
      ['Basement wall','There’s a white chalky line on the basement wall about a foot off the floor.',true,
        'A mineral line on a foundation wall points to past water.',
        'The inspector found grading that slopes toward the foundation and a short downspout. The buyer wants a drainage fix.'],
      ['Back steps','The concrete back steps have pulled about an inch away from the house.',true,
        'Steps separating from the house can mean soil movement.',
        'A contractor priced new footings for the back steps and recommended regrading.'],
      ['Back yard','The yard is level and the shed is in fair shape.',false,'A level yard and a fair shed are routine notes.'],
      ['Rear window','The window by the back door has a fogged pane from a failed seal.',false,
        'A failed window seal is a routine cosmetic note.'],
      ['Sump pit','The sump pump runs nonstop and the pit is nearly full.',true,
        'A pump that never stops can mean high groundwater or a failed check valve.',
        'The plumber found a failed check valve and high groundwater. The buyer wants a backup pump added.'],
    ],
    roof: [
      ['Roof & gutters','From the front walk, the shingles look even and the gutters are clear.',false,
        'Even shingles and clear gutters are routine notes.'],
      ['Roof & flashing','From the front walk, you can see curled shingles and lifted flashing at the chimney.',true,
        'Curled shingles and lifted flashing can let water in.',
        'A roofer found worn shingles and failed chimney flashing and quoted a partial reroof.'],
      ['Ice dam marks','There are water stains on the fascia boards below the eaves.',true,
        'Fascia stains point to ice dams from thin attic insulation.',
        'The inspector found thin attic insulation and ice dam damage along the eaves.'],
    ],
  };
  const DEAL_REASONS = {
    buyer:['{be} starting a new job at the hospital in town','{be} moving up from an apartment','{want} to be closer to family',
      '{be} downsizing now that the kids are grown','{want} a place close to the lakes','{be} moving back home after a few years away'],
    seller:['{be} relocating for work','{be} moving into a bigger place across town','{be} heading south for retirement',
      '{be} settling a family estate','{be} buying a lake place up north'],
  };
  const DEAL_GREETINGS = {
    buyer:['Thanks for meeting me. I want to know what an inspector would find before we write anything.',
      'I like the street. Walk me through anything that would worry you.',
      'I can handle paint. Tell me if something needs a pro.',
      'I drove by twice this week. Let’s see what it looks like inside.'],
    seller:['I pulled every record I could find. Let’s figure out what this place is worth.',
      'Be honest with me about what buyers are going to notice.',
      'I want this priced right the first time. Show me what you see.'],
  };

  function makeDeal(id, gen, seed) {
    const base = baseFiles.find((file) => file.id === id);
    const host = baseVisitors[id];
    let state = (seed ^ Math.imul(gen+7,0x9e3779b9) ^ Math.imul(id.charCodeAt(0)*131+id.length,0x85ebca6b))|0;
    const roll = () => {
      state = state+0x6d2b79f5|0;
      let t = Math.imul(state^state>>>15,1|state);
      t = t+Math.imul(t^t>>>7,61|t)^t;
      return ((t^t>>>14)>>>0)/4294967296;
    };
    const pick = (list) => list[Math.floor(roll()*list.length)];
    const range = (a,b) => a+(b-a)*roll();
    const step = (value,size=500) => Math.round(value/size)*size;
    const seller = roll()<.32;
    const list = step(base.list*(1+.035*Math.min(gen,8))*range(.92,1.1));
    const low = step(list*range(.925,.96));
    const high = step(list*range(1.012,1.035));
    const reserve = step(list*(seller?range(.965,.982):range(.955,.985)),250);
    const limit = seller ? step(list*range(1.004,1.015),250) : Math.max(reserve+2500,step(list*range(.975,1.02),250));
    const last = pick(DEAL_PEOPLE.last);
    const first = pick(DEAL_PEOPLE.first);
    let partner = pick(DEAL_PEOPLE.first);
    if (partner===first) partner = DEAL_PEOPLE.first[(DEAL_PEOPLE.first.indexOf(first)+5)%DEAL_PEOPLE.first.length];
    const couple = roll()<.3;
    const client = couple ? first+' and '+partner+' '+last : first+' '+last;
    const words = (text) => text.replace('{be}',couple?'are':'is').replace('{want}',couple?'want':'wants');
    const reason = words(pick(DEAL_REASONS[seller?'seller':'buyer']));
    const notes = ['living','kitchen','rear'].map((loc) => [loc,...pick(NOTE_POOL[loc])]);
    if (!notes.some((note) => note[3])) {
      const index = Math.floor(roll()*3);
      const loc = notes[index][0];
      notes[index] = [loc,...pick(NOTE_POOL[loc].filter((note) => note[2]))];
    }
    if (roll()<.4) notes.push(['roof',...pick(NOTE_POOL.roof)]);
    const findings = notes.filter((note) => note[3] && note[5]).map((note) => note[5]);
    const mid = step((low+high)/2);
    const file = {
      ...structuredClone(base),
      contact: base.contact.split(' · ')[0]+' · '+(seller ? pick(['seller referral','past client referral']) :
        pick(['buyer referral','open house lead','website inquiry','past client referral'])),
      client, list, low, high, limit, reserve,
      repair: step(list*range(.007,.018),50),
      fee: pick([.021,.0225,.023,.024,.025]),
      intake: seller ?
        client+' '+reason+' and '+(couple?'want':'wants')+' you to list the house. They need at least '+money(reserve)+' before fees and expenses.' :
        client+' '+reason+'. Their lender approved them up to '+money(limit)+', and they want to keep the inspection contingency.',
      notes: notes.map((note) => note.slice(0,5)),
      report: findings.slice(0,2).join(' ') || 'The inspection came back clean apart from routine maintenance.',
      guidance: seller ?
        'Comparable sales run '+money(low)+' to '+money(high)+'. Price it inside that range and let the buyer come to you.' :
        'Recent closes cluster near '+money(mid)+'. Keep the inspection contingency, and don’t show the seller your client’s full approval.',
      gen,
    };
    if (seller) file.side = 'seller';
    else delete file.side;
    const visitor = {
      id: host.id.split('~')[0]+'~'+gen, name: first+' '+last, title: seller ? 'Seller' : 'Buyer',
      hair: pick(DEAL_PEOPLE.hair), shirt: pick(DEAL_PEOPLE.shirt), skin: pick(DEAL_PEOPLE.skin), style: pick(DEAL_PEOPLE.style),
      greeting: pick(DEAL_GREETINGS[seller?'seller':'buyer']),
    };
    return { gen, file, visitor };
  }

  function applyDeal(id, deal) {
    const file = files.find((entry) => entry.id === id);
    const next = structuredClone(deal?.file || baseFiles.find((entry) => entry.id === id));
    for (const key of Object.keys(file)) delete file[key];
    Object.assign(file,next,{ id });
    const visitor = visitors[id];
    const person = structuredClone(deal?.visitor || baseVisitors[id]);
    for (const key of Object.keys(visitor)) delete visitor[key];
    Object.assign(visitor,person);
  }

  function fresh(agent) {
    return {
      version:1, agent, minute:OPENING_MINUTE, cash:OPENING_FLOAT, tank:88, mileage:0, active:'ramble', ledger:[openingEntry()],
      files:Object.fromEntries(files.map((f) => [f.id, { stage:'lead', notes:[], attempt:0, reviewed:false, trust:50 }])),
    };
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE));
      const v = saved?.career;
      if (!ND.agents[v?.agent] || v.version !== 1 || !Number.isFinite(v.minute) ||
        !Number.isFinite(v.cash) || !Number.isFinite(v.tank) || !Number.isFinite(v.mileage) ||
        !files.some((f) => f.id === v.active) || !Array.isArray(v.ledger) ||
        !files.every((file) => status[v?.files?.[file.id]?.stage] && Array.isArray(v.files[file.id].notes))) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function persist(data) {
    try {
      localStorage.setItem(SAVE, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  class Career {
    constructor(agent, saved) {
      this.state = saved || fresh(agent);
      this.showingAlerts = [];
      this.trustUpdates = [];
      this.recentTrust = new WeakMap();
      const s = this.state;
      if (!Number.isInteger(s.seed)) s.seed = Math.floor(Math.random()*4294967296);
      if (!s.ledger.some((line)=>line.kind==='opening')) s.ledger.unshift(openingEntry());
      for (const line of s.ledger) {
        if (line.kind==='office-theft') {
          line.kind='float-adjustment';
          line.label='Expense float adjustment';
        } else if (line.kind==='office-theft-return') {
          line.kind='float-reconciled';
          line.label='Expense float reconciled';
        }
      }
      const index = Math.floor(s.minute/DAY);
      s.day = { ...makeDay(index,s.seed),...(s.day?.index===index?s.day:null) };
      s.recaps ||= [];
      const arcade = s.arcade;
      s.arcade = {
        collected:Array.isArray(arcade?.collected) ? arcade.collected : [],
        coffee:ND.clamp(Number(arcade?.coffee)||0,0,COFFEE_SECONDS),
        star:ND.clamp(Number(arcade?.star)||0,0,STAR_SECONDS),
      };
      this.newLeads = [];
      this.marketOffers = [];
      if (!s.deals || typeof s.deals !== 'object') s.deals = {};
      for (const file of files) {
        const deal = s.deals[file.id];
        if (deal && !(deal.file && deal.visitor)) delete s.deals[file.id];
        applyDeal(file.id,s.deals[file.id]);
      }
      for (const file of files) {
        const record = s.files[file.id];
        if (!Number.isFinite(record.trust)) record.trust=50+Math.min(35,record.notes.length*9);
        if (['closed','lost'].includes(record.stage) && !Number.isFinite(record.nextAt)) record.nextAt=this.nextWorkday;
      }
      const closedNow = files.filter((file) => s.files[file.id].stage==='closed');
      if (!Number.isFinite(s.totalClosed)) s.totalClosed = closedNow.length;
      if (!Number.isFinite(s.volume)) s.volume = closedNow.reduce((sum,file) => sum+(s.files[file.id].price||0),0);
      this.checkShowings(s.minute);
      this.refreshDeals();
    }

    refreshDeals() {
      const s = this.state;
      for (const file of files) {
        const r = s.files[file.id];
        if (r.stage==='market' && s.minute>=r.offerAt) {
          r.stage='counter';
          this.marketOffers.push(file);
        }
        if (!['closed','lost'].includes(r.stage) || !Number.isFinite(r.nextAt) || s.minute<r.nextAt) continue;
        const gen = (s.deals[file.id]?.gen||0)+1;
        s.deals[file.id] = makeDeal(file.id,gen,s.seed);
        applyDeal(file.id,s.deals[file.id]);
        s.files[file.id] = { stage:'lead', notes:[], attempt:0, reviewed:false, trust:50 };
        this.newLeads.push(file);
      }
    }

    get totalClosed() {
      return this.state.totalClosed || 0;
    }

    get file() {
      return files.find((file) => file.id === this.state.active);
    }

    get record() {
      return this.state.files[this.state.active];
    }

    get perk() {
      return ND.agents[this.state.agent].perk;
    }

    get day() {
      return this.state.day;
    }

    get nextWorkday() {
      return (this.day.index+1)*DAY+8*60;
    }

    get lastWorkingRecap() {
      return this.state.recaps.findLast(worked) || this.state.recaps.at(-1);
    }

    get bridgerVisit() {
      const cabin = this.state.files.cabin;
      const meeting = cabin.stage==='inspection' ? cabin.inspectAt :
        ['booked','tour'].includes(cabin.stage) ? cabin.showAt : null;
      const minute = this.state.minute;
      const atCabin = Number.isFinite(meeting) && minute>=meeting && minute<meeting+75;
      const scheduled = atCabin ? meeting : this.day.index*DAY+8*60;
      const arrival = scheduled+BRIDGER_DELAY;
      return { site:atCabin?'cabin':'office',scheduled,arrival,late:minute<arrival };
    }

    get event() {
      return events[this.day.event] || events[0];
    }

    get fuelCost() {
      return Math.ceil((100-this.state.tank)*.48*(this.perk.fuelFactor??1));
    }

    get repairCredit() {
      const requested=this.file.repair+(this.perk.repair??0);
      if (this.file.side==='seller') {
        return Math.max(0,Math.min(requested,this.record.price-this.record.credit-this.file.reserve));
      }
      return requested;
    }

    get showingGrace() {
      return 50+(this.perk.grace??0);
    }

    checkIn(file=this.file) {
      const r=this.state.files[file.id], now=Math.floor(this.state.minute);
      if (r.stage!=='booked' || r.coveredBy || checkedIn(r) || !Number.isFinite(r.showAt) ||
          Math.floor(now/DAY)!==Math.floor(r.showAt/DAY) || now>r.showAt+this.showingGrace) return false;
      this.checkShowings(now);
      r.showingAlert=now<=r.showAt+8 ? CHECKED_IN_ON_TIME : CHECKED_IN_IN_GRACE;
      return true;
    }

    showing(file = this.file) {
      const r = this.state.files[file.id];
      if (r.stage==='schedule' && Number.isFinite(r.missedAt)) {
        return { state:'missed',file,at:r.missedAt };
      }
      if (r.stage!=='booked' || !Number.isFinite(r.showAt)) return null;
      const left = r.showAt-Math.floor(this.state.minute);
      return { state:r.coveredBy?'covered':checkedIn(r)?'attended':left<0?'late':left===0?'due':left<=SHOWING_REMINDER?'soon':'booked',
        file,at:r.showAt,left,closes:r.showAt+this.showingGrace };
    }

    get nextShowing() {
      const upcoming = files.map((file)=>this.showing(file))
        .filter((showing)=>showing && !['missed','covered'].includes(showing.state)).sort((a,b)=>a.at-b.at);
      return upcoming[0] || this.showing();
    }

    checkShowings(minute) {
      for (const file of files) {
        const r = this.state.files[file.id];
        if (r.stage!=='booked' || !Number.isFinite(r.showAt)) continue;
        if (r.coveredBy) {
          if (minute>=r.showAt+25) {
            r.stage='offer';
            r.notes=file.notes.map((note)=>note[0]);
            r.flags=[];
            this.day.showings++;
            this.day.delegated++;
            this.trust(9,'A teammate completed the showing.',r);
            this.showingAlerts.push({level:4,file,coveredBy:r.coveredBy});
          }
          continue;
        }
        if (checkedIn(r)) continue;
        const left = r.showAt-Math.floor(minute);
        const level = left < -this.showingGrace ? 3 : left < 0 ? 2 : left <= SHOWING_REMINDER ? 1 : 0;
        if (level <= (r.showingAlert || 0)) continue;
        const lost = level>=2 && (r.showingAlert||0)<2 ? -this.trust(-LATE_SHOWING_TRUST,'The showing started before you arrived.',r) : 0;
        r.showingAlert = level;
        if (level===3) {
          r.missedAt = r.showAt;
          r.stage = 'schedule';
          this.day.missed++;
        }
        this.showingAlerts.push({ level,file,left,lost,closes:r.showAt+this.showingGrace });
      }
    }

    get showingEnd() {
      return 18*60+(this.perk.afterHours??0);
    }

    get closed() {
      return files.filter((file) => this.state.files[file.id].stage === 'closed').length;
    }

    select(id) {
      if (files.some((f) => f.id === id)) this.state.active = id;
    }

    role(id) {
      if (id !== this.state.agent) return ND.agents[id].short;
      return id === 'malcolm' ? 'Liz' : 'Malcolm';
    }

    addTime(minutes) {
      if (Number.isFinite(minutes) && minutes>0) this.advanceTo(this.state.minute+minutes);
    }

    advanceTo(minute) {
      if (!Number.isFinite(minute) || minute<=this.state.minute) return;
      const previous = this.state.minute;
      const index=Math.floor(minute/DAY);
      while (this.day.index<index) {
        const day = this.day;
        this.state.minute=(day.index+1)*DAY-1;
        this.checkShowings(this.state.minute);
        this.refreshDeals();
        const net = this.state.ledger.filter((line)=>line.kind!=='opening' && Math.floor(line.day/DAY)===day.index)
          .reduce((sum,line)=>sum+line.amount,0);
        this.state.recaps.push({...day,net,worked:worked({...day,net})});
        if (this.state.recaps.length>21) this.state.recaps.shift();
        this.state.day=makeDay(day.index+1,this.state.seed);
      }
      this.state.minute=minute;
      if (Math.floor(minute)!==Math.floor(previous)) {
        this.checkShowings(minute);
        this.refreshDeals();
      }
    }

    endDay() {
      this.advanceTo(this.nextWorkday);
      return this.state.recaps.at(-1);
    }

    canWait(at) {
      return Number.isFinite(at) && at>this.state.minute && Math.floor(at/DAY)===this.day.index;
    }

    waitFor(at) {
      if (!this.canWait(at)) return false;
      this.advanceTo(at);
      return true;
    }

    recapEvent(report) {
      return events[report.event] || events[0];
    }

    weather(nearLake) {
      const hour = this.state.minute%DAY/60;
      const event = this.event.id;
      if (event==='snow' && hour<12) return { label:'Snow flurries', intensity:hour<10.5?.67:.39, snow:true };
      if (event==='rain' && hour>=12) return { label:'Rain',intensity:.71 };
      if (nearLake && hour<(event==='fog'?13:10)) return { label:'Lake mist',intensity:event==='fog'?.58:.31 };
      return { label:'Clear',intensity:0 };
    }

    trust(points, reason, record = this.record) {
      const before = record.trust;
      record.trust = ND.clamp(before+points,0,100);
      const change = record.trust-before;
      this.day.trust += change;
      if (change) {
        const file = files.find((item)=>this.state.files[item.id]===record);
        const line = (change>0?'+':'−')+Math.abs(change)+' trust · '+reason;
        this.trustUpdates.push(file.client+' · '+line);
        this.recentTrust.set(record,line);
      }
      return change;
    }

    hasPrize(id) {
      return this.state.arcade.collected.includes(id);
    }

    tickArcade(seconds) {
      const a = this.state.arcade;
      if (a.coffee>0) a.coffee = Math.max(0,a.coffee-seconds);
      if (a.star>0) a.star = Math.max(0,a.star-seconds);
    }

    collectPrize({id,kind}) {
      if (this.hasPrize(id)) return '';
      const s = this.state;
      let message;
      switch (kind) {
        case 'coin': {
          s.cash += COIN_VALUE;
          const today = s.ledger.find((line) => line.kind==='arcade-coins' && Math.floor(line.day/DAY)===this.day.index);
          if (today) today.amount += COIN_VALUE;
          else s.ledger.push({ label:'Commission coins',amount:COIN_VALUE,day:s.minute,kind:'arcade-coins' });
          message = 'Commission coin · +'+money(COIN_VALUE);
          break;
        }
        case 'coffee':
          s.arcade.coffee = COFFEE_SECONDS;
          message = 'Caribou Coffee boost · '+COFFEE_SECONDS+' seconds';
          break;
        case 'star':
          s.arcade.star = STAR_SECONDS;
          message = 'Top Producer Star · '+STAR_SECONDS+' seconds of snowbank clearance';
          break;
        case 'snow':
          if (!s.arcade.star) return '';
          message = 'Top Producer Star · Snowbank cleared';
          break;
        case 'approval': {
          const buyer = [this.file,...files].find((file) =>
            file.side!=='seller' && s.files[file.id].stage==='lead' && !s.files[file.id].arcadeApproval);
          if (buyer) {
            s.files[buyer.id].arcadeApproval = true;
            message = 'Buyer pre-approval · '+buyer.client+' is ready in your phone inbox';
          } else {
            message = 'Buyer pre-approval · Every buyer file already has approval';
          }
          break;
        }
        case 'septic':
          s.files.cabin.arcadeSeptic = true;
          this.addTime(12);
          message = 'Failed septic report · 12 minutes to call the contractor';
          break;
        default: return '';
      }
      s.arcade.collected.push(id);
      return message;
    }

    review() {
      if (this.record.reviewed) return;
      this.record.reviewed=true;
      this.trust(4,'An advisor reviewed the file.');
      this.addTime(7);
    }

    accept() {
      if (this.record.stage !== 'lead') return;
      this.record.stage = 'schedule';
      this.day.files++;
      this.trust(this.perk.leadTrust??0,'Your buyer-care perk helped at intake.');
      this.addTime(this.perk.intake??9);
    }

    showingSlot(travelMinutes, tomorrow = false) {
      const now = this.state.minute;
      const open = Math.floor(now / DAY) * DAY + 9 * 60;
      const delay = this.event.id==='hesitant' ? 35 : 0;
      const travel = travelMinutes + 12 + delay;
      const next = Math.max(open, Math.ceil((now+travel)/15)*15);
      return tomorrow || next >= open+this.showingEnd-9*60 ? open+DAY : next;
    }

    showingConflict(at, coveredBy = undefined) {
      return files.find((file) => file!==this.file && this.state.files[file.id].stage==='booked' &&
        this.state.files[file.id].coveredBy===coveredBy && Math.abs(this.state.files[file.id].showAt-at)<75);
    }

    book(at) {
      if (this.record.stage!=='schedule') return false;
      this.record.showAt = at;
      this.record.stage = 'booked';
      this.record.showingAlert = 0;
      delete this.record.missedAt;
      this.addTime(3);
      return true;
    }

    get coveringAgent() {
      return this.state.agent==='liz' ? 'malcolm' : 'liz';
    }

    delegateShowing() {
      const r = this.record;
      const agent = this.coveringAgent;
      if (r.stage!=='booked' || checkedIn(r) || r.coveredBy || this.state.minute>=r.showAt || this.showingConflict(r.showAt,agent)) return false;
      r.coveredBy = agent;
      this.addTime(3);
      return true;
    }

    showingDelay() {
      const r = this.record;
      if (r.stage!=='booked' || !Number.isFinite(r.showAt) || r.rivalVisit===r.showAt) return null;
      const fileNumber = files.indexOf(this.file)+1;
      const roll = ND.rng(this.state.seed^Math.imul(r.showAt,0x9e3779b9)^Math.imul(fileNumber,0x85ebca6b));
      if (roll()>=.48) return null;
      const delay = showingDelays[Math.floor(roll()*showingDelays.length)];
      r.rivalVisit = r.showAt;
      this.day.showingDelays++;
      this.trust(delay.trust,delay.title+' delayed the showing.');
      this.addTime(delay.minutes);
      return delay;
    }

    openShowing() {
      const r = this.record;
      if (r.stage!=='booked' || this.state.minute<r.showAt) return false;
      delete r.coveredBy;
      r.stage = 'tour';
      r.unlocked = true;
      this.day.showings++;
      if (r.showingAlert===CHECKED_IN_ON_TIME || (!checkedIn(r) && this.state.minute<=r.showAt+8)) this.trust(7,'You met the client on time.');
      return true;
    }

    observe(item, flag) {
      const note = this.file.notes.find((entry)=>entry[0]===item);
      if (!note || this.record.stage !== 'tour' || this.record.notes.includes(item)) return null;
      const matched = Boolean(note[3])===flag;
      const regional = this.perk.markets?.includes(this.file.id) ? this.perk.marketTrust : 0;
      const structural = ['rear','roof'].includes(item) ? (this.perk.structuralTrust??0) : 0;
      const reason = note[3] ? (flag?'You flagged a defect for inspection.':'A significant defect went unflagged.') :
        (flag?'The client expected this routine wear.':'You correctly identified a routine condition.');
      const gained = this.trust(matched ? (note[3]?14:9)+regional+structural : (note[3] ? -5 : -2),
        reason+(matched && regional+structural?' Your agent specialty helped.':''));
      this.record.flags ||= [];
      if (flag) this.record.flags.push(item);
      this.record.notes.push(item);
      if (this.record.notes.length === this.file.notes.length) this.record.stage = 'offer';
      this.addTime(this.perk.noteTime??5);
      return { matched,gained,important:Boolean(note[3]),bonus:matched ? regional+structural : 0 };
    }

    publish(price) {
      const f = this.file;
      const r = this.record;
      if (f.side !== 'seller' || r.stage !== 'offer' || !Number.isFinite(price) || price < f.low-10000 || price > f.high+20000) {
        return false;
      }
      r.ask = price;
      r.attempt++;
      this.day.offers++;
      const competition=this.event.id==='bidding' ? 1250 : 0;
      const bump=this.perk.buyerBump??0;
      const step=(value) => Math.round(value/250)*250;
      const pace=this.perk.publishTime??1;
      let market='fair';
      let expectedDelay=2*60;
      if (price>f.high) {
        market='high';
        expectedDelay=6*60;
        this.trust(-5,'The asking price exceeded the local comps.');
        r.incoming=Math.min(f.limit,step(f.limit-3000+competition+bump));
      } else if (price<f.low) {
        market='low';
        expectedDelay=75;
        r.incoming=Math.min(f.limit,step(price+3500+competition+bump));
      } else {
        r.incoming=Math.min(f.limit,step(price-2000+competition+bump));
      }
      const now = this.state.minute;
      const at = now+31+Math.ceil(expectedDelay*pace);
      r.offerAt = at%DAY >= 18*60 || Math.floor(at/DAY)>this.day.index ? this.nextWorkday+60 : at;
      r.buyerCosts = 1500;
      r.market = market;
      r.patience = 2;
      r.log = [{ by:'you',amount:price,kind:'list' },{ by:'buyer',amount:r.incoming,credit:r.buyerCosts }];
      delete r.rejectedIncoming;
      r.stage = 'market';
      this.addTime(31);
      return market;
    }

    sellerCounter(price) {
      const f = this.file;
      const r = this.record;
      if (r.stage!=='counter' || f.side!=='seller' || !Number.isInteger(price) || price<f.low-10000 || price>f.high+20000) {
        return { result:'invalid' };
      }
      if (price<f.reserve) return { result:'ownerDeclined' };
      this.day.offers++;
      this.addTime(41);
      r.log ||= [];
      r.log.push({ by:'you',amount:price });
      if (price<=f.limit) {
        r.log.push({ by:'buyer',amount:price,kind:'accept' });
        return { result:'accepted',price,...this.contract(price,0) };
      }
      r.patience=(Number.isFinite(r.patience)?r.patience:2)-1;
      if (r.patience<=0) {
        return this.loseDeal('The buyer moved on after the second counter.',-4);
      }
      r.incoming=Math.min(f.limit,Math.round((r.incoming+price)/2/250)*250);
      r.log.push({ by:'buyer',amount:r.incoming,credit:r.buyerCosts });
      return { result:'countered',incoming:r.incoming };
    }

    reserve() {
      return this.file.reserve+(this.event.id==='bidding'?1250:0);
    }

    offer(price, credit) {
      const f = this.file;
      const r = this.record;
      if (r.stage!=='offer' || f.side==='seller' || !Number.isInteger(price) || price < f.low - 40000 || price > f.limit ||
        ![0,1500,3000].includes(credit)) return { result:'invalid' };
      r.attempt++;
      this.day.offers++;
      this.addTime(18);
      const reserve=this.reserve();
      const net=price-credit;
      r.log ||= [];
      r.log.push({ by:'you',amount:price,credit });
      if (r.final && net<r.counter) {
        return this.loseDeal('The seller let their final counter expire and moved on.',-7);
      }
      r.round=(r.round||0)+1;
      const round=Math.min(r.round,3);
      const ask=Number.isFinite(r.sellerAsk) ? r.sellerAsk : f.list+(this.event.id==='bidding'?1250:0);
      const margin=[3000,1500,0][round-1];
      if (net>=reserve+margin || net>=ask) return { result:'accepted',...this.contract(price,credit) };
      const lowball=net<reserve-f.list*.08;
      if (lowball && r.lowball) return this.loseDeal('The seller ended negotiations after a second low offer.',-8);
      if (lowball) r.lowball=true;
      const floor=reserve+[1500,0,0][round-1];
      const next=lowball ? ask : Math.max(floor,ask-(ask-net)*(round>=3?.5:.35));
      const counter=Math.min(f.limit,Math.round(next/250)*250);
      if (counter<=net) return { result:'accepted',...this.contract(price,credit) };
      r.sellerAsk=counter;
      r.counter=counter;
      r.final=round>=3;
      r.stage='counter';
      r.log.push({ by:'seller',amount:counter,kind:r.final?'final':lowball?'hold':'' });
      return { result:lowball?'firm':'counter',counter,final:r.final };
    }

    loseDeal(reason, points = 0) {
      const r = this.record;
      if (!['offer','counter','inspection','sign'].includes(r.stage)) return null;
      const lost = -this.trust(points,reason);
      this.day.lost++;
      r.stage = 'lost';
      r.outcome = reason;
      r.nextAt = this.nextWorkday;
      return { result:'walked',lost,reason };
    }

    acceptCounter() {
      const r = this.record;
      if (r.stage!=='counter') return null;
      if (this.file.side!=='seller') {
        r.log?.push({by:'you',amount:r.counter,kind:'accept'});
        return this.contract(r.counter,0);
      }
      if (r.incoming-r.buyerCosts<this.file.reserve) {
        r.rejectedIncoming = true;
        return null;
      }
      r.log?.push({by:'you',amount:r.incoming,credit:r.buyerCosts,kind:'accept'});
      return this.contract(r.incoming,r.buyerCosts);
    }

    contract(price, credit) {
      const f = this.file;
      const r = this.record;
      r.price = price;
      r.credit = credit;
      r.stage = 'inspection';
      r.inspectAt = this.nextWorkday+2*60;
      const net = price-credit;
      const gap = f.side==='seller' ? f.limit-net : net-this.reserve();
      const points = gap<=1000 ? 6 : gap<=3000 ? 2 : -Math.min(15,Math.round((gap-3000)/700));
      const delta = this.trust(points,points>0?'The agreed price worked in your client’s favor.':'The negotiated price left value on the table.');
      r.dealScore = { delta };
      return { delta };
    }

    get creditSupported() {
      const r = this.record;
      return this.file.side==='seller' || r.inspectionPrepared || !Array.isArray(r.flags) ||
        this.file.notes.some((note)=>note[3] && r.flags.includes(note[0]));
    }

    prepareInspection(item) {
      const r = this.record;
      if (r.stage!=='inspection' || r.inspectionBriefed) return null;
      const note = this.file.notes.find((entry)=>entry[0]===item);
      if (!note) return null;
      r.inspectionBriefed = true;
      r.inspectionPrepared = Boolean(note[3]);
      this.addTime(9);
      if (r.inspectionPrepared) this.trust(3,'You briefed Riley on a significant concern.');
      return { prepared:r.inspectionPrepared, reason:note[4] };
    }

    inspection(decision) {
      const r = this.record;
      if (r.stage!=='inspection' || !r.inspectionWalk || this.state.minute<r.inspectAt ||
          !['as-is','full','counter'].includes(decision) || (decision==='counter' && !r.inspectionOffer) ||
          (decision==='full' && r.inspectionOffer)) return null;
      const credit = this.repairCredit;
      if (decision==='full' && credit && !this.creditSupported) {
        r.inspectionOffer = Math.max(1,Math.round(credit*.5));
        this.addTime(12);
        this.trust(-3,'The request lacked evidence for the full credit.');
        return { counter:r.inspectionOffer };
      }
      const agreed = decision==='full' ? credit : decision==='counter' ? r.inspectionOffer : 0;
      this.addTime(Math.max(7,(this.perk.inspectionTime??28)-(this.event.id==='contractor'?9:0)));
      r.credit += agreed;
      r.inspection = agreed ? 'Seller credit confirmed in writing' : 'Buyer accepted condition after review';
      this.trust(agreed ? 5 : credit && this.file.side!=='seller' ? -3 : 3,
        agreed ? 'You secured a documented repair credit.' : credit && this.file.side!=='seller' ? 'The buyer took on the repair cost.' : 'You resolved the inspection terms.');
      this.day.inspections++;
      r.stage = 'title';
      return { agreed };
    }

    startInspection() {
      if (this.record.stage!=='inspection' || !Number.isFinite(this.record.inspectAt) || this.state.minute<this.record.inspectAt) {
        return false;
      }
      this.record.inspectionWalk = true;
      return true;
    }

    title() {
      const r = this.record;
      if (r.stage!=='title') return false;
      r.stage = 'sign';
      this.addTime(this.perk.titleTime??31);
      const today = this.day.index*DAY+(this.perk.closeEarlier ? 14 : 15)*60;
      r.closeAt = this.state.minute+20 <= today ? today : this.nextWorkday+2*60;
      this.day.titles++;
      return true;
    }

    reviewClosing(credit) {
      const r = this.record;
      if (r.stage!=='sign') return false;
      if (r.closingReviewed) return true;
      this.addTime(6);
      if (credit!==r.credit) return false;
      r.closingReviewed = true;
      return true;
    }

    payout() {
      const gross = this.record.price*this.file.fee;
      const trust = this.record.trust;
      return { commission:Math.round(gross*.70),
        bonus:Math.round(gross*(trust>=90?.10:trust>=80?.06:trust>=70?.03:0)) };
    }

    close() {
      const r = this.record;
      if (r.stage!=='sign' || !r.closingReviewed || !Number.isFinite(r.closeAt) || this.state.minute<r.closeAt) return null;
      this.addTime(45);
      const { commission,bonus } = this.payout();
      const earned = commission+bonus;
      const cashBefore = this.state.cash;
      this.state.cash += earned;
      this.state.ledger.push({ label:this.file.client+' closing',amount:commission,day:this.state.minute });
      if (bonus) this.state.ledger.push({ label:this.file.client+' trust bonus',amount:bonus,day:this.state.minute });
      this.day.closings++;
      r.stage = 'closed';
      r.nextAt = this.nextWorkday;
      this.state.totalClosed = (this.state.totalClosed||0)+1;
      this.state.volume = (this.state.volume||0)+r.price;
      const f = this.file;
      return { id:f.id,client:f.client,side:f.side,photo:f.photo,price:r.price,list:f.list,credit:r.credit,commission,bonus,
        earned,trust:r.trust,cashBefore,cashAfter:this.state.cash,totalClosed:this.state.totalClosed,
        volume:this.state.volume,nextAt:r.nextAt };
    }

    drive(meters, assisted = false) {
      const miles = meters * ND.MILES;
      this.state.mileage += miles;
      this.day.miles += miles;
      this.state.tank = Math.max(0,this.state.tank - miles * .36);
      if (assisted) this.addTime(this.driveMinutes(miles));
    }

    driveMinutes(miles) {
      return Math.max(3,miles*1.37*(this.perk.driveTime??1));
    }

    refill() {
      const cost = this.fuelCost;
      if (cost <= 0 || cost > this.state.cash) return 0;
      this.state.cash -= cost;
      this.state.tank = 100;
      this.state.ledger.push({ label:'SUV fuel', amount:-cost, day:this.state.minute });
      this.addTime(8);
      return cost;
    }

    get floatAdjustment() {
      if (this.state.ledger.some((line)=>line.kind==='float-reconciled')) return undefined;
      return this.state.ledger.find((line)=>line.kind==='float-adjustment');
    }

    reconcileFloat() {
      const adjustment=this.floatAdjustment;
      if (!adjustment || this.state.cash<adjustment.amount) return 0;
      const amount=-adjustment.amount;
      this.state.cash+=amount;
      this.state.ledger.push({ label:'Expense float reconciled',amount,day:this.state.minute,kind:'float-reconciled' });
      return amount;
    }

    get availableAllowance() {
      if (this.state.ledger.some((line)=>['expense-allowance','float-adjustment'].includes(line.kind))) return 0;
      return this.perk.expenseAllowance || 0;
    }

    expenseAllowance() {
      const amount = this.availableAllowance;
      if (!amount) return 0;
      this.state.cash+=amount;
      this.state.ledger.push({label:'Approved field expense allowance',amount,day:this.state.minute,kind:'expense-allowance'});
      return amount;
    }

    goal(world) {
      const f = this.file;
      const r = this.record;
      const site = world.features[f.id];
      const desk = world.features.office;
      if (r.stage==='lead' && r.arcadeApproval) {
        return { title:'Accept the approved buyer file',detail:f.client+' · Open Deal on your phone.',point:null };
      }
      if (r.stage==='schedule' && Number.isFinite(r.missedAt)) {
        return { title:'Rebook the missed showing',detail:f.client+' · Open Deal on your phone.',point:null };
      }
      if (r.stage==='booked' && r.coveredBy) {
        return { title:this.role(r.coveredBy)+' is covering',detail:f.client+' · Notes due '+time(r.showAt+25,true)+'.',point:null };
      }
      const [title, detail, point] = {
        lead: ['Review the inquiry', this.role(f.staff) + ' left a file at Liz’s desk.', desk.entry],
        schedule: [f.side === 'seller' ? 'Book the listing visit' : 'Book the showing', site.name + ' · Open your phone to schedule.', site.entry],
        booked: ['Meet at the property', site.name + ' · ' + time(r.showAt, true), site.entry],
        tour: ['Walk through the property', r.notes.length + '/' + f.notes.length + ' observations logged.', site.entry],
        offer: f.side === 'seller' ? ['Price and publish the listing','Use your phone to review comparable sales.',site.entry] :
          ['Write the offer', 'Review the comps and buyer’s approval on your phone.', site.entry],
        market: ['Listing is live','First offer review · '+time(r.offerAt,true)+'.',null],
        counter: [f.side === 'seller' ? 'Review the buyer’s offer' : 'Review the seller’s counter', 'Open the deal on your phone.', site.entry],
        inspection: ['Attend the inspection', site.name + ' · ' + time(r.inspectAt, true), site.entry],
        title: ['Clear title and financing', 'Take the file to the North Desk.', desk.entry],
        sign: ['Close the transaction', 'North Desk · ' + time(r.closeAt, true), desk.entry],
        closed: [this.closed === files.length ? 'Every open file is closed' : 'Transaction closed',
          this.closed === files.length ? 'New leads land at '+time(Math.min(...files.map((file) => this.state.files[file.id].nextAt||Infinity)),true)+'. Keep exploring.' :
            'Open your phone to pick up another lead.', null],
        lost: ['File closed without a sale','Open Phone for another file. A new inquiry lands '+time(r.nextAt,true)+'.',null],
      }[r.stage];
      return { title, detail, point };
    }
  }

  Object.assign(ND, { files, visitors, Career, status, restore, persist, money, time });
})();
