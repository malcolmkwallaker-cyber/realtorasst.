'use strict';

(() => {
  const ND = globalThis.ND;
  const SAVE = 'north-desk-fieldwork-v1';
  const DAY = 1440;
  const OPENING_MINUTE = 8*60+8;
  const OPENING_FLOAT = 1650;
  const events = [
    { id:'steady', title:'Clear roads', detail:'Normal showing windows and light traffic in the morning.' },
    { id:'snow', title:'Morning flurries', detail:'Snow crossings and shaded pavement stay slick into late morning.' },
    { id:'rain', title:'Afternoon rain', detail:'Rain moves across the Northland after lunch.' },
    { id:'fog', title:'Lake fog', detail:'Visibility drops near Lake Superior in the morning.' },
    { id:'bidding', title:'Another buyer is in', detail:'A competing offer gives sellers more room to hold their price.' },
    { id:'hesitant', title:'Seller asks for more time', detail:'Build in an extra 35 minutes when scheduling a new visit.' },
    { id:'contractor', title:'Contractor calls back', detail:'Same-day estimates shorten inspection follow-up.' },
  ];

  function makeDay(index,seed) {
    let hash = (seed^Math.imul(index,0x9e3779b9)) >>> 0;
    hash = Math.imul(hash^(hash>>>16),0x7feb352d) >>> 0;
    const random=(hash^(hash>>>15))>>>0;
    const event = index===0 ? 0 : index===1 ? 1+random%(events.length-1) : random%events.length;
    return { index,event,files:0,showings:0,offers:0,closings:0,miles:0,trust:0,roadNotes:0 };
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
        ['living', 'Living room & front windows', 'The front window opens freely. The lower sash has light staining from condensation.'],
        ['kitchen', 'Kitchen & plumbing', 'The cabinets are dry below the sink. The water heater date is in the seller’s disclosure.'],
        ['rear', 'Basement entry & grading', 'At the basement stairwell, there’s a water mark under the rear window. The outside grade runs toward that wall.', true],
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

  const status = {
    lead: 'New inquiry', schedule: 'Book showing', booked: 'Showing booked', tour: 'Walkthrough',
    offer: 'Write offer', counter: 'Seller counter', inspection: 'Inspection', title: 'Title & lender',
    sign: 'Ready to close', closed: 'Closed',
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
      const s = this.state;
      if (!Number.isInteger(s.seed)) s.seed = Math.floor(Math.random()*4294967296);
      if (!s.ledger.some((line)=>line.kind==='opening')) s.ledger.unshift(openingEntry());
      const index = Math.floor(s.minute/DAY);
      s.day = { ...makeDay(index,s.seed),...(s.day?.index===index?s.day:null) };
      s.recaps ||= [];
      for (const file of files) {
        const record = s.files[file.id];
        if (!Number.isFinite(record.trust)) record.trust=50+Math.min(35,record.notes.length*9);
      }
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

    advanceTo(minute, wrap = false) {
      if (!Number.isFinite(minute) || minute<=this.state.minute) return;
      const day = this.day;
      this.state.minute=minute;
      const index=Math.floor(minute/DAY);
      if (index===day.index) return;
      const net = this.state.ledger.filter((line)=>line.kind!=='opening' && Math.floor(line.day/DAY)===day.index)
        .reduce((sum,line)=>sum+line.amount,0);
      if (wrap || net || day.files || day.showings || day.offers || day.closings || day.miles>.01 || day.trust || day.roadNotes) {
        this.state.recaps.push({...day,net});
        if (this.state.recaps.length>21) this.state.recaps.shift();
      }
      this.state.day=makeDay(index,this.state.seed);
    }

    endDay() {
      this.advanceTo((this.day.index+1)*DAY+8*60,true);
      return this.state.recaps.at(-1);
    }

    recapEvent(report) {
      return events[report.event] || events[0];
    }

    weather(nearSuperior) {
      const hour = this.state.minute%DAY/60;
      const event = this.event.id;
      if (event==='snow' && hour<12) return { label:'Snow flurries', intensity:hour<10.5?.67:.39, snow:true };
      if (event==='rain' && hour>=12) return { label:'Rain',intensity:.71 };
      if (nearSuperior && hour<(event==='fog'?13:10)) return { label:'Lake mist',intensity:event==='fog'?.58:.31 };
      return { label:'Clear',intensity:0 };
    }

    trust(points) {
      const before=this.record.trust;
      this.record.trust=ND.clamp(before+points,0,100);
      this.day.trust+=this.record.trust-before;
    }

    review() {
      if (this.record.reviewed) return;
      this.record.reviewed=true;
      this.trust(4);
      this.addTime(7);
    }

    accept() {
      if (this.record.stage !== 'lead') return;
      this.record.stage = 'schedule';
      this.day.files++;
      this.trust(this.perk.leadTrust??0);
      this.addTime(this.perk.intake??9);
    }

    book(travelMinutes, tomorrow = false) {
      const now = this.state.minute;
      const open = Math.floor(now / DAY) * DAY + 9 * 60;
      const delay = this.event.id==='hesitant' ? 35 : 0;
      const travel = travelMinutes + 12 + delay;
      const next = Math.max(open, Math.ceil((now+travel)/15)*15);
      this.record.showAt = tomorrow || next >= open+this.showingEnd-9*60 ? open+DAY : next;
      this.record.stage = 'booked';
      this.addTime(3);
    }

    openShowing() {
      this.advanceTo(this.record.showAt);
      this.day.showings++;
      if (this.state.minute<=this.record.showAt+8) this.trust(7);
      this.record.stage = 'tour';
      this.record.unlocked = true;
    }

    observe(item, flag) {
      const note = this.file.notes.find((entry)=>entry[0]===item);
      if (!note || this.record.stage !== 'tour' || this.record.notes.includes(item)) return null;
      const matched = Boolean(note[3])===flag;
      const regional = this.perk.markets?.includes(this.file.id) ? this.perk.marketTrust : 0;
      const structural = ['rear','roof'].includes(item) ? (this.perk.structuralTrust??0) : 0;
      const gained = matched ? (note[3]?14:9)+regional+structural : 2;
      this.trust(gained);
      this.record.notes.push(item);
      if (this.record.notes.length === this.file.notes.length) this.record.stage = 'offer';
      this.addTime(this.perk.noteTime??5);
      return { matched, gained };
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
      this.addTime((DAY+(price>f.high?DAY:31))*(this.perk.publishTime??1));
      r.incoming = Math.min(f.limit,Math.round((price-(price>f.high?4750:2000)+competition+(this.perk.buyerBump??0))/250)*250);
      r.buyerCosts = 1500;
      r.stage = 'counter';
      return true;
    }

    sellerCounter() {
      const f = this.file;
      const r = this.record;
      this.addTime(41);
      this.contract(Math.min(f.limit, Math.max(f.reserve+2000,r.incoming)),0);
    }

    counterPrice() {
      const r = this.record;
      return Math.min(this.file.limit,this.file.list,this.reserve()+
        Math.max(0,(r.reviewed?1000:2500)-(this.perk.counter??0)));
    }

    reserve() {
      return this.file.reserve+(this.event.id==='bidding'?1250:0);
    }

    offer(price, credit) {
      const f = this.file;
      const r = this.record;
      if (r.stage!=='offer' || f.side==='seller' || !Number.isFinite(price) || price < f.low - 40000 || price > f.limit ||
        ![0,1500,3000].includes(credit)) return { result:'invalid' };
      r.attempt++;
      this.day.offers++;
      const reserve=this.reserve();
      const counter=this.counterPrice();
      this.addTime(18);
      if (price - credit >= reserve) {
        this.contract(price,credit);
        return { result:'accepted' };
      }
      r.stage = 'counter';
      r.counter = counter;
      return { result:'counter' };
    }

    contract(price, credit) {
      const r = this.record;
      r.price = price;
      r.credit = credit;
      r.stage = 'inspection';
      r.inspectAt = Math.floor(this.state.minute / DAY) * DAY + DAY + 10 * 60;
    }

    inspection(request) {
      const r = this.record;
      this.advanceTo(r.inspectAt);
      this.addTime(Math.max(7,(this.perk.inspectionTime??28)-(this.event.id==='contractor'?9:0)));
      r.credit += request ? this.repairCredit : 0;
      r.inspection = request ? 'Seller credit confirmed in writing' : 'Buyer accepted condition after review';
      this.trust(request?5:3);
      r.stage = 'title';
    }

    title() {
      this.record.stage = 'sign';
      this.record.closeAt = (this.day.index+(this.perk.closeDays??2))*DAY+13*60;
      this.addTime(this.perk.titleTime??31);
    }

    payout() {
      const gross = this.record.price*this.file.fee;
      const trust = this.record.trust;
      return { commission:Math.round(gross*.70),
        bonus:Math.round(gross*(trust>=94?.075:trust>=82?.045:0)) };
    }

    close() {
      if (this.record.stage !== 'sign') return null;
      const r = this.record;
      this.advanceTo(r.closeAt);
      this.addTime(45);
      const { commission,bonus } = this.payout();
      const earned = commission+bonus;
      this.state.cash += earned;
      this.state.ledger.push({ label:this.file.client+' closing',amount:commission,day:this.state.minute });
      if (bonus) this.state.ledger.push({ label:this.file.client+' trust bonus',amount:bonus,day:this.state.minute });
      this.day.closings++;
      r.stage = 'closed';
      return earned;
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

    get officeTheft() {
      return this.state.ledger.find((line)=>line.kind==='office-theft');
    }

    get outstandingOfficeTheft() {
      if (this.state.ledger.some((line)=>line.kind==='office-theft-return')) return undefined;
      return this.officeTheft;
    }

    takeOfficeCash() {
      if (this.officeTheft) return 0;
      const cap=ND.agents['brother-malcolm'].perk.floatCash;
      const amount=this.perk.floatCash || -Math.min(cap,Math.max(0,this.state.cash));
      if (!amount) return 0;
      this.state.cash+=amount;
      this.state.ledger.push({ label:'Brother Malcolm swiped office cash',amount,day:this.state.minute,kind:'office-theft' });
      return amount;
    }

    returnOfficeCash() {
      const theft=this.outstandingOfficeTheft;
      if (!theft || this.state.cash<theft.amount) return 0;
      const amount=-theft.amount;
      this.state.cash+=amount;
      this.state.ledger.push({ label:'Office cash returned',amount,day:this.state.minute,kind:'office-theft-return' });
      return amount;
    }

    goal(world) {
      const f = this.file;
      const r = this.record;
      const site = world.features[f.id];
      const desk = world.features.office;
      const [title, detail, point] = {
        lead: ['Review the inquiry', this.role(f.staff) + ' left a file at Liz’s desk.', desk.entry],
        schedule: [f.side === 'seller' ? 'Book the listing visit' : 'Book the showing', site.name + ' · Open your phone to schedule.', site.entry],
        booked: ['Meet at the property', site.name + ' · ' + time(r.showAt, true), site.entry],
        tour: ['Walk through the property', r.notes.length + '/' + f.notes.length + ' observations logged.', site.entry],
        offer: f.side === 'seller' ? ['Price and publish the listing','Use your phone to review comparable sales.',site.entry] :
          ['Write the offer', 'Review the comps and buyer’s approval on your phone.', site.entry],
        counter: [f.side === 'seller' ? 'Review the buyer’s offer' : 'Review the seller’s counter', 'Open the deal on your phone.', site.entry],
        inspection: ['Attend the inspection', site.name + ' · ' + time(r.inspectAt, true), site.entry],
        title: ['Clear title and financing', 'Take the file to the North Desk.', desk.entry],
        sign: ['Close the transaction', 'North Desk · ' + time(r.closeAt, true), desk.entry],
        closed: [this.closed === files.length ? 'All five files closed' : 'Transaction closed',
          this.closed === files.length ? 'You can keep exploring the Northland.' : 'Open your phone to pick up another lead.', null],
      }[r.stage];
      return { title, detail, point };
    }
  }

  Object.assign(ND, { files, Career, status, restore, persist, money, time });
})();
