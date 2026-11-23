'use strict';

(() => {
  const ND = globalThis.ND;
  const SAVE = 'north-desk-fieldwork-v1';
  const DAY = 1440;

  const files = [
    {
      id: 'ramble', contact: 'Emily · buyer referral', staff: 'emily', advisor: 'jordan',
      client: 'Mara Chen', photo: 0, beds: '3 beds · 1 bath · 1,250 sq ft',
      list: 249000, low: 239000, high: 253000, limit: 251000, reserve: 245000, repair: 2100, fee: .024,
      intake: 'Mara wants a starter home within a short drive of work. She asked about the basement and wants an inspection even if the seller gets another offer.',
      notes: [
        ['living', 'Living room & front windows', 'The front window opens freely. The lower sash has light staining from condensation.'],
        ['kitchen', 'Kitchen & plumbing', 'The cabinets are dry below the sink. The water heater date is in the seller’s disclosure.'],
        ['rear', 'Foundation & grading', 'There’s an old water mark below the rear window. The grade runs toward the house here.'],
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
        ['kitchen', 'Well & water supply', 'The pressure tank is labeled. The last water test in the disclosure is two years old.'],
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
        ['kitchen', 'Outlets & service', 'The seller’s disclosure identifies an older panel. Get the electrician to look before writing the repair request.'],
        ['rear', 'Back room & floor', 'A section of finish flooring is soft near the rear threshold. Check what’s carrying the load below it.'],
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
        ['rear', 'Weather sealing', 'Cold air is visible on the inspector’s thermal photo of the back door frame.'],
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
        ['rear', 'Retaining wall & driveway', 'The wall leans slightly at one corner. The parcel sketch shows the driveway crossing the property line.'],
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
    const local = new Date(Date.UTC(2026,7,24,0,Math.floor(minute)));
    const clock = clockFormat.format(local);
    if (!date) return clock;
    const weekday = weekdayFormat.format(local);
    return weekday + ' · ' + clock;
  };

  function fresh(agent) {
    return {
      version:1, agent, minute:8*60+8, cash:1650, tank:88, mileage:0, active:'ramble', ledger:[],
      files:Object.fromEntries(files.map((f) => [f.id, { stage:'lead', notes:[], attempt:0, reviewed:false }])),
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
    }

    get file() {
      return files.find((file) => file.id === this.state.active);
    }

    get record() {
      return this.state.files[this.state.active];
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
      this.state.minute += Math.max(0, minutes);
    }

    accept() {
      if (this.record.stage !== 'lead') return;
      this.record.stage = 'schedule';
      this.addTime(9);
    }

    book(travelMinutes, tomorrow = false) {
      const now = this.state.minute;
      const open = Math.floor(now / DAY) * DAY + 9 * 60;
      const next = Math.max(open, Math.ceil((now + travelMinutes + 12) / 15) * 15);
      this.record.showAt = tomorrow || next >= open + 9 * 60 ? open + DAY : next;
      this.record.stage = 'booked';
      this.addTime(3);
    }

    openShowing() {
      this.state.minute = Math.max(this.state.minute, this.record.showAt);
      this.record.stage = 'tour';
      this.record.unlocked = true;
    }

    observe(item) {
      if (this.record.stage !== 'tour' || this.record.notes.includes(item)) return;
      this.record.notes.push(item);
      if (this.record.notes.length === this.file.notes.length) this.record.stage = 'offer';
      this.addTime(5);
    }

    publish(price) {
      const f = this.file;
      const r = this.record;
      if (f.side !== 'seller' || r.stage !== 'offer' || !Number.isFinite(price) || price < f.low-10000 || price > f.high+20000) {
        return false;
      }
      r.ask = price;
      r.attempt++;
      this.addTime(DAY + (price > f.high ? DAY : 31));
      r.incoming = Math.min(f.limit,Math.round((price - (price > f.high ? 4750 : 2000))/250)*250);
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
      return Math.min(this.file.list, this.file.reserve + (r.reviewed ? 1000 : 2500));
    }

    offer(price, credit) {
      const f = this.file;
      const r = this.record;
      if (!Number.isFinite(price) || price < f.low - 40000 || price > f.limit ||
        ![0,1500,3000].includes(credit)) return { result:'invalid' };
      r.attempt++;
      this.addTime(18);
      if (price - credit >= f.reserve) {
        this.contract(price,credit);
        return { result:'accepted' };
      }
      r.stage = 'counter';
      r.counter = this.counterPrice();
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
      this.state.minute = Math.max(this.state.minute,r.inspectAt);
      this.addTime(28);
      r.credit += request ? this.file.repair : 0;
      r.inspection = request ? 'Seller credit confirmed in writing' : 'Buyer accepted condition after review';
      r.stage = 'title';
    }

    title() {
      this.record.stage = 'sign';
      this.record.closeAt = Math.floor(this.state.minute / DAY) * DAY + 2 * DAY + 13 * 60;
      this.addTime(31);
    }

    close() {
      if (this.record.stage !== 'sign') return null;
      const r = this.record;
      this.state.minute = Math.max(this.state.minute,r.closeAt);
      this.addTime(45);
      // Each fictional engagement has its own fee. The player's brokerage split is 70%.
      const earned = Math.round(r.price * this.file.fee * 0.70);
      this.state.cash += earned;
      this.state.ledger.push({ label:this.file.client + ' closing', amount:earned, day:this.state.minute });
      r.stage = 'closed';
      return earned;
    }

    drive(meters, assisted = false) {
      const miles = meters * ND.MILES;
      this.state.mileage += miles;
      this.state.tank = Math.max(0,this.state.tank - miles * .36);
      if (assisted) this.addTime(Math.max(3,miles * 1.37));
    }

    refill() {
      const cost = Math.ceil((100 - this.state.tank) * .48);
      if (cost <= 0 || cost > this.state.cash) return 0;
      this.state.cash -= cost;
      this.state.tank = 100;
      this.state.ledger.push({ label:'SUV fuel', amount:-cost, day:this.state.minute });
      this.addTime(8);
      return cost;
    }

    goal(world) {
      const f = this.file;
      const r = this.record;
      const site = world.features[f.id];
      const desk = world.features.office;
      const [title, detail, point] = {
        lead: ['Review the inquiry', this.role(f.staff) + ' left a file at the North Desk.', desk.entry],
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
