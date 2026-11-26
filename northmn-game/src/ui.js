'use strict';

(() => {
  const ND = globalThis.ND;
  const byId = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g,
    (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const { money, time, status } = ND;

  const button = (label, handler, primary = false) => ({ label, handler, primary });
  const tutorial = [
    ['Find your footing',[
      'Use WASD to walk. Click the scene to capture the mouse, or use the arrow keys to look. On a touch screen, drag the scene to look.',
      'Press E to use the closest object named on screen. Press C to change camera.',
    ]],
    ['Start with a buyer',[
      'Go inside North Desk and review Mara Chen’s file at Liz’s desk. Open Phone with P and book the showing in Deal.',
      'Watch the showing countdown. You get a fifteen-minute reminder and a buzz when you’re late. A missed showing costs a little trust and goes back to scheduling.',
    ]],
    ['Get to the showing',[
      'Set showing route gives you directions on the map. You can hold W to drive your SUV there, or choose Fast Travel from Map to arrive parked. Fast Travel uses fuel and advances the workday.',
      'Open the lockbox at the property. Walk with the buyer and flag conditions worth checking. Your notes carry through to the offer and inspection.',
    ]],
    ['Take a break',[
      'Phone and menus pause the field clock. End workday returns you to the office in the morning and shows your daily recap.',
      'The Inbox lists your upcoming appointments. If showings overlap, ask the office to cover one. You can wait at an appointment on its scheduled day.',
      'Tanya’s Laser Tag is an optional 45-second arcade match. Find it in Pause or talk to Tanya at North Desk.',
    ]],
  ];

  class Interface {
    constructor(game) {
      this.game = game;
      this.overlay = byId('overlay');
      this.window = byId('window');
      this.content = byId('window-content');
      this.panel = '';
      this.prevFocus = null;
      this.toastTimer = null;
      this.captionTimer = null;
      this.mapPose = null;
      byId('close-window').onclick = () => this.close();
      this.overlay.addEventListener('click', (event) => {
        if (event.target === this.overlay) this.close();
      });
      window.addEventListener('resize', () => this.drawMap());
    }

    resetIntroductions() {
      this.introduced = new Set();
      try { localStorage.removeItem('north-desk-first-opens'); } catch {}
    }

    firstOpen(id) {
      if (!this.introduced) {
        let seen=[];
        try { seen=JSON.parse(localStorage.getItem('north-desk-first-opens')) || []; } catch {}
        this.introduced=new Set(Array.isArray(seen)?seen:[]);
      }
      if (this.introduced.has(id)) return false;
      this.introduced.add(id);
      try { localStorage.setItem('north-desk-first-opens',JSON.stringify([...this.introduced])); } catch {}
      return true;
    }

    show(title, kind, html) {
      this.game.keys.clear();
      this.game.sound.quiet();
      byId('visitor-caption').hidden = true;
      if (document.pointerLockElement) document.exitPointerLock();
      if (!this.panel) this.prevFocus = document.activeElement;
      this.panel = kind;
      this.overlay.classList.toggle('phone',kind === 'phone');
      this.window.classList.toggle('map-window',kind === 'map');
      this.window.classList.toggle('celebrate-window',kind === 'celebrate');
      byId('window-title').textContent = title;
      this.content.innerHTML = html;
      this.content.scrollTop = 0;
      this.overlay.hidden = false;
      byId('hud').inert = true;
      byId('title-screen').inert = true;
      byId('close-window').focus({ preventScroll:true });
    }

    close(focus = true) {
      if (!this.panel) return;
      this.game.sound.stopVoice();
      this.panel = '';
      this.overlay.hidden = true;
      byId('hud').inert = false;
      byId('title-screen').inert = false;
      if (!focus) return;
      if (this.prevFocus?.isConnected && this.prevFocus.getClientRects().length) this.prevFocus.focus({ preventScroll:true });
      else if (this.game.started) this.game.canvas.focus({ preventScroll:true });
    }

    trap(event) {
      if (!this.panel || event.key !== 'Tab') return;
      const targets = Array.from(this.window.querySelectorAll('button:not(:disabled), input, select, a[href]'))
        .filter((target) => target.getClientRects().length);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    notice(message, duration = 3900) {
      const toast = byId('toast');
      this.noticeText = message;
      toast.textContent = message;
      if (this.trustBanner?.career===this.game.career && this.trustBanner.until>performance.now()) {
        for (const line of this.trustBanner.lines) {
          const row=document.createElement('div');
          row.textContent=line;
          toast.append(row);
        }
      }
      toast.hidden = false;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { toast.hidden = true; },duration);
    }

    trustFeedback() {
      const c = this.game.career;
      if (!c.trustUpdates.length) return;
      this.trustBanner={career:c,lines:c.trustUpdates.splice(0),until:performance.now()+6000};
      this.notice(byId('toast').hidden?'':this.noticeText||'',6000);
    }

    visitorLine(person, line) {
      const caption = byId('visitor-caption');
      caption.querySelector('strong').textContent = person.name;
      caption.querySelector('span').textContent = line;
      caption.hidden = false;
      clearTimeout(this.captionTimer);
      this.captionTimer = setTimeout(() => { caption.hidden=true; },5800);
      this.game.sound.say(line,person.id);
    }

    talkToVisitor(person) {
      this.dialog(person.name,[person.greeting],[
        button('Back to the property',() => this.close(),true),
        button('Replay voice',() => this.game.sound.say(person.greeting,person.id)),
      ]);
      this.game.sound.say(person.greeting,person.id);
    }

    actions(actions) {
      return '<div class="actions">'+actions.map((action,i) =>
        '<button type="button" ' + (action.primary ? 'class="primary" ' : '') + 'data-dialog="'+i+'">'+escape(action.label)+'</button>'
      ).join('')+'</div>';
    }

    listen(actions) {
      this.content.querySelectorAll('[data-dialog]').forEach((item) => {
        item.onclick = () => actions[Number(item.dataset.dialog)].handler();
      });
    }

    dialog(title, copies, actions = [], speaker) {
      if (speaker && this.game.sound.enabled) {
        actions = [...actions,button('Replay voice',() => this.game.sound.speak(speaker))];
      }
      this.show(title,'dialog','<div class="dialog-copy">' + copies.map((copy) => '<p>'+escape(copy)+'</p>').join('') +
        '</div>' + this.actions(actions));
      this.listen(actions);
      if (speaker) this.game.sound.speak(speaker);
    }

    row(key, title, subtitle, tag = '') {
      return '<button class="row" type="button" data-row="'+escape(key)+'"><span class="row-text"><strong>'+
        escape(title)+'</strong><small>'+escape(subtitle)+'</small></span>' +
        (tag ? '<span class="tag">'+escape(tag)+'</span>' : '')+'</button>';
    }

    rows(handler) {
      this.content.querySelectorAll('[data-row]').forEach((row) => {
        row.onclick = () => handler(row.dataset.row);
      });
    }

    choose() {
      const game = this.game;
      this.show('Choose your agent','cast','<p>Each North Desk agent brings a different perk to the workday.</p>'+
        '<div class="rows">'+ND.roster.map((person) => this.row(person.id,person.name,
          person.title+' · '+person.perk.name+'. '+person.perk.description,
          person.id===(game.career?.state.agent||game.choice)?'Selected':'')).join('')+'</div>');
      this.rows((id) => {
        game.chooseAgent(id);
        this.close();
        game.sound.speak(id);
      });
    }

    newCareer() {
      const game = this.game;
      if (!game.saved && !game.started) {
        game.start(false);
        return;
      }
      const actions = [button('Start new career',() => { this.close(false); game.start(false); },true),
        button('Keep current career',() => this.close())];
      this.dialog('Start a new career', ['Starting over replaces the North Desk save in this browser.'],actions);
    }

    tutorial(step = 0) {
      const [title,copies] = tutorial[step];
      const finish = () => {
        this.close();
        this.game.captureLook();
      };
      const actions = step===tutorial.length-1 ?
        [button('Start workday',finish,true)] :
        [button('Next',() => this.tutorial(step+1),true),button('Skip tutorial',finish)];
      if (step>0) actions.push(button('Back',() => this.tutorial(step-1)));
      this.dialog(title,copies,actions);
    }

    phone(tab = 'inbox') {
      const g = this.game;
      if (g.driving && Math.abs(g.car.speed) > 1.9) {
        this.notice('Pull over to use your phone.');
        return;
      }
      const career = g.career;
      const tabs = [['inbox','Inbox'],['deal','Deal'],['team','Team'],['ledger','Ledger']];
      const nav = '<nav class="tabs" aria-label="Phone">'+tabs.map(([id,label]) => '<button type="button" data-tab="'+id+
        '" aria-current="'+(id===tab)+'">'+label+'</button>').join('')+'</nav>';
      let html = '';
      let actions = [];
      switch (tab) {
        case 'inbox':
          html = '<div class="day-brief"><strong>'+escape(career.event.title)+'</strong><p>'+escape(career.event.detail)+'</p></div>'+
            this.agenda()+
            '<div class="rows">'+ND.files.map((f) => {
            const site = g.world.features[f.id];
            const r = career.state.files[f.id];
            const showing = career.showing(f);
            const stage = showing?.state==='missed' ? 'Missed · Rebook' : showing?.state==='late' ? 'Showing late' :
              showing?.state==='covered' ? career.role(r.coveredBy)+' covering' :
              r.stage==='lead' && r.arcadeApproval ? 'Pre-approved' : status[r.stage];
            return this.row(f.id,site.name,f.contact+' · '+site.town,stage);
          }).join('')+'</div>';
          break;
        case 'deal': {
          const deal = this.deal();
          html = deal.html;
          actions = deal.actions;
          break;
        }
        case 'team':
          html = '<div class="rows">'+g.world.people.filter((p) => p.id !== career.state.agent)
            .map((p) => this.row(p.id,p.name,p.title,p.town)).join('')+'</div>';
          break;
        case 'ledger': {
          const state = career.state;
          const opening = state.ledger.find((line)=>line.kind==='opening');
          const record = state.ledger.slice().reverse().map((line) => '<div class="row"><span class="row-text"><strong>'+
            escape(line.label)+'</strong><small>'+time(line.day,true)+'</small></span><span>'+
            (line.amount < 0 ? '−'+money(-line.amount) : '+'+money(line.amount))+'</span></div>').join('');
          html = '<h3>'+money(state.cash)+'</h3><p>'+career.totalClosed+' closing'+(career.totalClosed===1?'':'s')+' · '+money(state.volume||0)+' sold · '+
            state.mileage.toFixed(1)+' mi driven · '+Math.round(state.tank)+'% fuel</p>'+
            '<p class="detail">The Pemberton office started your ledger with a '+money(opening.amount)+' expense float for work on the road.</p>'+
            (record ? '<div class="rows">'+record+'</div>' : '<p class="detail">Earn your first fee by closing a transaction.</p>');
          if (state.tank < 99) actions.push(button('Arrange fuel delivery',() => this.refuel()));
          if (state.recaps.length) actions.push(button('Daily recaps',() => this.dailyReport(career.lastWorkingRecap,false)));
          html += this.actions(actions);
          break;
        }
      }
      const hint = this.firstOpen('phone') ? '<p class="day-brief">Use Inbox to pick a client, Deal to book or negotiate, Team to call, and Ledger to check earnings.</p>' : '';
      this.show('Phone','phone',nav+hint+html);
      this.content.querySelectorAll('[data-tab]').forEach((item) => {
        item.onclick = () => this.phone(item.dataset.tab);
      });
      if (tab === 'inbox') this.rows((id) => {
        career.select(id);
        g.clearRoute();
        g.save();
        this.phone('deal');
      });
      if (tab === 'team') this.rows((id) => this.person(id,true));
      this.listen(actions);
      const form = this.content.querySelector('#offer-form');
      if (form) form.onsubmit = (event) => this.submitOffer(event,form);
      const listing = this.content.querySelector('#listing-form');
      if (listing) listing.onsubmit = (event) => {
        event.preventDefault();
        if (!career.publish(Number(new FormData(listing).get('price')))) {
          const error = listing.querySelector('.form-error');
          error.textContent = 'Enter an asking price within the displayed range.';
          error.hidden = false;
          return;
        }
        const market = career.record.market;
        g.changed((market==='high' ? 'Listed above the comps · −5 trust. ' : 'The listing is live. ')+
          'Check for offers '+time(career.record.offerAt,true)+'.');
        this.phone('deal');
      };
      const sellerForm = this.content.querySelector('#seller-counter-form');
      if (sellerForm) sellerForm.onsubmit = (event) => {
        event.preventDefault();
        const result = career.sellerCounter(Number(new FormData(sellerForm).get('price')));
        if (['invalid','ownerDeclined'].includes(result.result)) {
          const error = sellerForm.querySelector('.form-error');
          error.textContent = result.result==='ownerDeclined' ? 'Your seller declined to sign a counter at that price.' :
            'Enter a price within the range shown in the field.';
          error.hidden = false;
          return;
        }
        g.changed({
          accepted: () => 'The buyer accepted '+money(result.price)+'. '+this.dealLine(true,result.delta)+' Inspection scheduled.',
          countered: () => 'The buyer came back at '+money(result.incoming)+'.',
          walked: () => result.reason+(result.lost ? ' · −'+result.lost+' trust' : ''),
        }[result.result](),result.result==='accepted'?'booking':undefined);
        this.phone('deal');
      };
    }

    agenda() {
      const c = this.game.career;
      const labels = {booked:'Showing',inspection:'Inspection',sign:'Closing'};
      const dates = {booked:'showAt',inspection:'inspectAt',sign:'closeAt'};
      const visits = ND.files.flatMap((file) => {
        const r = c.state.files[file.id];
        const at = r[dates[r.stage]];
        if (!Number.isFinite(at)) return [];
        return [{at,client:file.client,label:labels[r.stage],covered:r.coveredBy}];
      }).sort((a,b)=>a.at-b.at);
      if (!visits.length) return '';
      return '<section class="agenda" aria-label="Appointments"><h3>Appointments</h3><ul>'+
        visits.map(({at,client,label,covered}) => '<li><strong>'+escape(label+' · '+client)+'</strong><span>'+
          escape(time(at,true)+(covered?' · '+c.role(covered)+' covering':''))+'</span></li>').join('')+'</ul></section>';
    }

    deal() {
      const g = this.game;
      const career = g.career;
      const f = career.file;
      const r = career.record;
      const site = g.world.features[f.id];
      const actions = [];
      const navigate = (id,label) => button(label,() => g.setGPS(id,true));
      const photo = Number.isInteger(f.photo) ?
        '<div class="case-photo" data-photo="'+f.photo+'" aria-hidden="true"></div>' : '';
      const seller = f.side === 'seller';
      let extra = '';
      if (r.stage === 'lead') {
        if (r.arcadeApproval) {
          extra = '<p>'+escape(career.role('joel'))+' sent the lender’s pre-approval. You can accept the buyer file here.</p>';
          actions.push(button('Accept pre-approved buyer',() => this.acceptFile(),true));
        } else {
          extra = seller ? '<p>Review the listing agreement at the Grand Rapids office.</p>' :
            '<p>Review the client’s intake and preapproval at the Grand Rapids office.</p>';
          actions.push(navigate('office','Route to office'));
        }
      }
      if (r.stage === 'schedule') {
        const end=time(career.showingEnd);
        extra = '<p>'+ (seller ? escape(f.client)+' is available for a listing walkthrough' : 'The seller is taking appointments') +
          ' from 9 AM to '+end+'.</p>';
        if (Number.isFinite(r.missedAt)) extra = '<p>You missed the showing at '+time(r.missedAt,true)+'. Book a new time with the client.</p>'+extra;
        if (career.event.id==='hesitant') extra+='<p class="detail">'+escape(career.event.detail)+'</p>';
        actions.push(button(seller ? 'Book first listing visit' : 'Book earliest showing',() => g.book(false),true),
          button('Book tomorrow at 9 AM',() => g.book(true)));
      }
      if (r.stage === 'booked') {
        const showing = career.showing();
        extra = '<p>Showing booked for '+time(r.showAt,true)+'. The lockbox is at the front door.</p>'+
          (showing?.state==='late' ? '<p>Running late. The showing window closes at '+time(showing.closes)+'.</p>' : '');
        if (r.coveredBy) {
          extra += '<p>'+escape(career.role(r.coveredBy))+' is covering. Their notes will be in the file after the showing.</p>';
        } else if (career.state.minute<r.showAt && !career.showingConflict(r.showAt,career.coveringAgent)) {
          actions.push(button('Ask '+career.role(career.coveringAgent)+' to cover',() => this.delegate()));
        }
        actions.push(navigate(f.id,'Set showing route'));
      }
      if (r.stage === 'tour') {
        extra = '<p>'+r.notes.length+' of '+f.notes.length+' observations logged. Walk the property to finish your notes.</p>';
        actions.push(navigate(f.id,'Route to property'));
      }
      if (r.stage === 'offer' && seller) {
        extra = '<p>Prepare the disclosure and set an asking price from the comparable sales.</p>'+
          '<form id="listing-form" class="offer-form"><label>Asking price ($)<input name="price" type="number" min="'+
          (f.low-10000)+'" max="'+(f.high+20000)+'" step="1" inputmode="numeric" required></label>'+
          '<p class="form-error" role="status" hidden></p><div class="actions"><button class="primary" type="submit">Publish listing</button></div></form>';
      }
      if (r.stage === 'offer' && !seller) {
        const covered = r.coveredBy ? '<p class="detail">'+escape(career.role(r.coveredBy))+
          ' sent a walkthrough summary. Brief Riley yourself if you want evidence for a repair request.</p>' : '';
        extra = covered+'<p>Choose a price and how much to ask the seller to pay toward closing costs. Those costs reduce what the seller receives. Your buyer wants an inspection contingency.</p>'+
          '<form id="offer-form" class="offer-form"><label>Offer price ($)<input name="price" type="number" min="'+(f.low-40000)+
          '" max="'+f.limit+'" step="1" inputmode="numeric" required></label>'+
          '<label>Seller paid costs<select name="credit"><option value="0">$0</option><option value="1500">$1,500</option>'+
          '<option value="3000">$3,000</option></select></label>'+
          '<p class="form-error" role="status" hidden></p><div class="actions"><button class="primary" type="submit">Submit offer</button></div></form>';
        if (career.event.id==='bidding') extra='<p class="detail">'+escape(career.event.detail)+'</p>'+extra;
        if (r.round) {
          extra += '<p class="detail">Round '+(Math.min(r.round,3)+(r.final?0:1))+' of 3. The seller is at '+money(r.counter)+
            (r.final?' and says that is final.':'.')+'</p>'+this.negotiationLog(r);
        }
      }
      if (r.stage === 'market') {
        extra = '<p>Listed at '+money(r.ask)+'. Your first offer review is '+time(r.offerAt,true)+'.</p>'+
          '<p class="detail">You can work another file while the listing is live.</p>';
      }
      if (r.stage === 'counter' && seller) {
        const net = r.incoming-r.buyerCosts;
        const market = { high:'The above-market price held up the first offer. '+escape(f.client)+' wants to see some movement.',
          low:'Pricing under the comps drew a bidding war, but the best offer is capped by where you started.' }[r.market];
        extra = (market ? '<p class="detail">'+market+'</p>' : '')+
          '<p>A buyer offered '+money(r.incoming)+' and asked for '+money(r.buyerCosts)+' toward closing costs.</p>'+
          '<p>Offer after credit '+money(net)+'.</p>'+this.negotiationLog(r)+
          (r.rejectedIncoming ? '<p class="detail">Your seller declined to accept the offer at that amount.</p>' : '')+
          '<form id="seller-counter-form" class="offer-form"><label>Counter price, no seller-paid costs ($)<input name="price" type="number" min="'+
          (f.low-10000)+'" max="'+(f.high+20000)+'" step="1" inputmode="numeric" required></label>'+
          '<p class="detail">The buyer will take '+(r.patience===1?'one more counter':'about two counters')+' before they walk.</p>'+
          '<p class="form-error" role="status" hidden></p><div class="actions"><button type="submit">Send counter</button></div></form>';
        if (!r.rejectedIncoming) actions.push(button('Present '+money(r.incoming)+' to seller',() => this.acceptCounter(),true));
        actions.push(button('Revise list price',() => { r.stage='offer'; g.changed(); this.phone('deal'); }));
      }
      if (r.stage === 'counter' && !seller) {
        extra = '<p>'+(r.final ? 'The seller says '+money(r.counter)+' is their final number.' :
          'The seller countered at '+money(r.counter)+' with no cost credit.')+' The inspection contingency stays in the agreement.</p>'+
          this.negotiationLog(r)+'<p class="detail">'+(r.final ? 'A lower counter can end the deal.' :
          'Round '+Math.min(r.round,3)+' of 3. The seller may walk if you push too far.')+'</p>';
        actions.push(button('Accept '+money(r.counter),() => this.acceptCounter(),true),
          button(r.final ? 'Counter anyway' : 'Counter back',() => { r.stage = 'offer'; g.changed(); this.phone('deal'); }));
      }
      if (['offer','counter'].includes(r.stage)) actions.push(button('Walk away',() => this.withdrawDeal()));
      if (r.stage === 'inspection') {
        extra = '<p>Contract at '+money(r.price)+'. Meet the inspector at the property '+time(r.inspectAt,true)+'.</p>';
        if (!r.inspectionBriefed) actions.push(button('Brief the inspector',() => this.briefInspector()));
        actions.push(navigate(f.id,'Route to inspection'));
      }
      if (r.stage === 'title') {
        extra = '<p>'+escape(r.inspection)+'. Bring the inspection addendum and signed contract back to the office.</p>';
        actions.push(navigate('office','Route to office'));
      }
      if (r.stage === 'sign') {
        const { commission,bonus } = career.payout();
        extra = '<p>Title and lender review are complete. Closing is at the North Desk '+time(r.closeAt,true)+'.</p>'+
          '<p class="detail">Projected payout '+money(commission+bonus)+(bonus?' including a '+money(bonus)+' client-trust bonus.':'.')+'</p>';
        actions.push(navigate('office','Route to closing'));
      }
      if (r.stage === 'closed') extra = '<p>'+money(r.price)+' closed · '+money(r.credit)+' seller credit.</p>'+
        (Number.isFinite(r.nextAt) ? '<p class="detail">The SOLD sign is up. A new lead comes in at this address '+time(r.nextAt,true)+'.</p>' : '');
      if (r.stage === 'lost') extra = '<p>'+escape(r.outcome)+'</p><p class="detail">A new inquiry comes in '+time(r.nextAt,true)+'.</p>'+
        this.negotiationLog(r);
      if (!['lead','closed','lost'].includes(r.stage)) {
        actions.push(button('Call '+career.role(f.advisor),() => this.person(f.advisor,true,true)));
      }
      const details = [[ 'List price', money(seller?(r.ask||f.list):f.list) ],['Comparable sales',money(f.low)+'–'+money(f.high)]];
      if (!seller) details.push(['Buyer approval',money(f.limit)]);
      details.push(['Stage',status[r.stage]],[seller?'Seller trust':'Buyer trust',r.trust+' / 100']);
      const html = '<div class="message"><span class="contact">'+escape(f.contact)+'</span><h3>'+escape(site.name)+
        '</h3><p>'+escape(site.town+' · '+site.road.segment.name+' · '+f.beds)+'</p>'+photo+
        '<p>'+escape(f.intake)+'</p></div>'+
        '<dl class="details">'+details.map(([key,val])=>'<div><dt>'+escape(key)+'</dt><dd>'+escape(val)+'</dd></div>').join('')+
        '</dl>'+(career.recentTrust.has(r)?'<p class="detail">'+escape(career.recentTrust.get(r))+'</p>':'')+extra+this.actions(actions);
      return { html, actions };
    }

    submitOffer(event,form) {
      event.preventDefault();
      const data = new FormData(form);
      const g = this.game;
      const result = g.career.offer(Number(data.get('price')),Number(data.get('credit')));
      if (result.result === 'invalid') {
        const error = form.querySelector('.form-error');
        error.textContent = 'Check the offer price and the buyer’s approved limit.';
        error.hidden = false;
        return;
      }
      const message = {
        accepted: () => 'Offer accepted. '+this.dealLine(false,result.delta)+' Inspection scheduled.',
        counter: () => 'The seller countered at '+money(result.counter)+(result.final ? ' and says it is final.' : '.'),
        firm: () => 'The seller is holding at '+money(result.counter)+'. Another low offer could end negotiations.',
        walked: () => result.reason+(result.lost ? ' · −'+result.lost+' trust' : ''),
      }[result.result]();
      g.changed(message,result.result==='accepted'?'booking':undefined);
      this.phone('deal');
    }

    dealLine(seller, delta) {
      const mood = delta>=6 ? (seller ? 'Your client is pleased with the sale price.' : 'Your buyer is pleased with the price.') :
        delta>0 ? 'Solid price.' : seller ? 'Your client left money on the table.' : 'Your client paid more than they needed to.';
      return mood+(delta ? ' '+(delta>0?'+':'−')+Math.abs(delta)+' trust.' : '');
    }

    acceptCounter() {
      const g = this.game;
      const result = g.career.acceptCounter();
      if (result) g.changed('Offer accepted. '+this.dealLine(g.career.file.side==='seller',result.delta)+' Inspection scheduled.','booking');
      else g.changed('Your seller declined to accept at that amount.');
      this.phone('deal');
    }

    withdrawDeal(fromInspection = false) {
      const g = this.game;
      this.dialog('Close this file?',[
        fromInspection ? 'Your buyer can use the inspection contingency to end the contract.' :
          'You’ll end this negotiation and move on to another client.',
        'You’ll earn no commission on this deal.',
      ],[
        button('Close file',() => {
          const reason = fromInspection ? 'The buyer withdrew under the inspection contingency.' : 'You closed this file during negotiations.';
          g.career.loseDeal(reason);
          g.clearRoute();
          g.changed(reason);
          this.phone('deal');
        },true),
        button('Keep working the deal',() => fromInspection ? this.inspection() : this.phone('deal')),
      ]);
    }

    delegate() {
      const g = this.game;
      const c = g.career;
      const agent = c.role(c.coveringAgent);
      this.dialog('Cover this showing?',[
        agent+' can meet '+c.file.client+' at '+time(c.record.showAt,true)+' and send notes 25 minutes later.',
        'You’ll have time for another client. A teammate’s walkthrough earns less trust than a good walkthrough you lead.',
      ],[
        button('Hand off the showing',() => {
          const handedOff = c.delegateShowing();
          if (handedOff) g.clearRoute();
          g.changed(handedOff ? agent+' is covering the showing.' : agent+' is booked during that window.');
          this.phone('deal');
        },true),
        button('Keep the showing',() => this.phone('deal')),
      ]);
    }

    negotiationLog(r) {
      if (!Array.isArray(r.log) || !r.log.length) return '';
      const who = { you:'You', seller:'Seller', buyer:'Buyer' };
      const label = (entry) => who[entry.by]+({ list:' listed at', hold:' held at', final:' final', accept:' accepted', new:' (new buyer)' }[entry.kind]||'');
      return '<ol class="nego-log" aria-label="Negotiation">'+r.log.slice(-6).map((entry) => '<li class="'+escape(entry.by)+'"><span>'+
        escape(label(entry))+'</span><strong>'+money(entry.amount)+(entry.credit ? ' · '+money(entry.credit)+' costs' : '')+
        '</strong></li>').join('')+'</ol>';
    }

    celebrate(s) {
      const g = this.game;
      const site = g.world.features[s.id];
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const photo = Number.isInteger(s.photo) ? '<div class="case-photo" data-photo="'+s.photo+'"></div>' : '<div class="case-photo"></div>';
      const keys = '<svg class="keys-svg" viewBox="0 0 240 100" aria-hidden="true">'+
        '<rect x="0" y="52" width="44" height="24" rx="7" fill="#43574a"/><ellipse cx="56" cy="62" rx="17" ry="12" fill="#cc9a77"/>'+
        '<rect x="196" y="48" width="44" height="24" rx="7" fill="#6c5a7a"/><ellipse cx="184" cy="58" rx="17" ry="12" fill="#b97d5c"/>'+
        '<g class="key"><circle cx="0" cy="0" r="11" fill="none" stroke="#f1ca88" stroke-width="5"/>'+
        '<rect x="9" y="-3.5" width="40" height="7" rx="2" fill="#f1ca88"/><rect x="38" y="2" width="6" height="9" fill="#f1ca88"/>'+
        '<rect x="28" y="2" width="5" height="7" fill="#f1ca88"/><path d="M-8 8 L-8 24 L8 24 L8 8 L0 1 Z" fill="#e3725f"/></g></svg>';
      const stats = [['Sale price',money(s.price)],['Commission',money(s.commission)],
        ['Trust bonus',s.bonus ? money(s.bonus) : 'None this time'],['Client trust',s.trust+' / 100'],
        ['Career closings',String(s.totalClosed)],['Career volume',money(s.volume)]];
      const actions = [button('Back to work',() => this.close(),true),button('See ledger',() => this.phone('ledger'))];
      const html = '<div class="celebrate"><canvas class="confetti" aria-hidden="true"></canvas>'+
        '<div class="sold-hero">'+photo+'<div class="sold-stamp">SOLD</div></div>'+
        '<h3>'+escape(site.name)+'</h3><p class="detail">'+escape(site.town)+' · '+(s.side==='seller' ? 'Listing sold' : 'Purchase closed')+'</p>'+
        '<div class="keys-handoff">'+keys+'<p>'+escape(s.client)+(s.side==='seller' ? ' hands over the keys.' : ' gets the keys.')+'</p></div>'+
        '<div class="cash-tick"><small>Your ledger</small><strong data-cash>'+money(reduce ? s.cashAfter : s.cashBefore)+'</strong>'+
        '<span>+'+money(s.earned)+(s.bonus ? ' with trust bonus' : '')+'</span></div>'+
        '<dl class="details">'+stats.map(([key,val])=>'<div><dt>'+escape(key)+'</dt><dd>'+escape(val)+'</dd></div>').join('')+'</dl>'+
        '<p class="detail">The SOLD sign goes up out front. A new lead comes in here '+time(s.nextAt,true)+'.</p>'+
        this.actions(actions)+'</div>';
      clearTimeout(this.toastTimer);
      byId('toast').hidden = true;
      this.show('Closed!','celebrate',html);
      this.listen(actions);
      g.sound.celebrate?.();
      if (reduce) return;
      const cash = this.content.querySelector('[data-cash]');
      const begin = performance.now();
      const tick = (now) => {
        if (!cash.isConnected) return;
        const t = Math.min(1,(now-begin-500)/1500);
        const eased = t<=0 ? 0 : 1-Math.pow(1-t,3);
        cash.textContent = money(Math.round(s.cashBefore+(s.cashAfter-s.cashBefore)*eased));
        if (t<1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const canvas = this.content.querySelector('.confetti');
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(2,devicePixelRatio||1);
      canvas.width = Math.max(1,Math.round(box.width*ratio));
      canvas.height = Math.max(1,Math.round(box.height*ratio));
      const ink = canvas.getContext('2d');
      const colors = ['#f1ca88','#b3cdc0','#e3725f','#f4f0e4','#8fb3d9'];
      const bits = Array.from({length:110},(_,i) => ({
        x:canvas.width*(.5+(Math.random()-.5)*.3), y:canvas.height*.42,
        vx:(Math.random()-.5)*canvas.width*.9, vy:-(.35+Math.random()*.75)*canvas.height*1.4,
        spin:Math.random()*6, size:(4+Math.random()*5)*ratio, color:colors[i%colors.length],
      }));
      let previous = performance.now();
      const fall = (now) => {
        if (!canvas.isConnected) return;
        const dt = Math.min(.05,(now-previous)/1000);
        previous = now;
        const age = (now-begin)/1000;
        ink.clearRect(0,0,canvas.width,canvas.height);
        ink.globalAlpha = Math.max(0,Math.min(1,(3.4-age)/.8));
        for (const bit of bits) {
          bit.vy += canvas.height*2.2*dt;
          bit.vx *= 1-.9*dt;
          bit.x += bit.vx*dt;
          bit.y += bit.vy*dt;
          bit.spin += dt*9;
          ink.fillStyle = bit.color;
          ink.save();
          ink.translate(bit.x,bit.y);
          ink.rotate(bit.spin);
          ink.fillRect(-bit.size/2,-bit.size/4,bit.size,bit.size/2);
          ink.restore();
        }
        if (age<3.4) requestAnimationFrame(fall);
        else ink.clearRect(0,0,canvas.width,canvas.height);
      };
      requestAnimationFrame(fall);
    }

    person(id, onPhone, advise = false) {
      if (id==='brother-malcolm') return this.brotherCash(onPhone);
      const g = this.game;
      const career = g.career;
      const f = career.file;
      const real = id === career.state.agent ? (id === 'malcolm' ? 'liz' : 'malcolm') : id;
      const person = ND.agents[real];
      if (real==='bridger' && onPhone) {
        this.dialog(person.name,['Bridger is unavailable...'],[
          button('Back to phone',() => this.phone(advise?'deal':'team'),true),
        ]);
        return;
      }
      const relevant = advise || id === f.advisor;
      const actions = [];
      if (real === 'tanya' && !relevant) actions.push(button('Join Tanya’s laser tag',() => this.tagInvite(),true));
      if (relevant && !career.record.reviewed) {
        actions.push(button('Log file review',() => {
          career.review();
          g.changed('File review logged · client trust gained.');
          if (onPhone) this.phone('deal');
          else this.close();
        },true));
      }
      actions.push(button(onPhone ? 'Back to phone' : 'Back to work',() => onPhone ? this.phone(relevant ? 'deal' : 'team') : this.close()));
      const lines = ND.conversation(person,career,g.world.features[f.id]);
      if (relevant) lines.push(f.guidance);
      this.dialog(person.name,[person.title,...lines],actions,real);
    }

    waitForBridger() {
      const g = this.game;
      const visit = g.career.bridgerVisit;
      if (!visit.late) return this.person('bridger',false);
      this.dialog('Bridger is running late',[
        'He was due at '+time(visit.scheduled,true)+'. His new ETA is '+time(visit.arrival,true)+'.',
      ],[
        button('Wait for Bridger',() => {
          g.career.advanceTo(visit.arrival);
          g.changed('Bridger finally arrived.');
          this.person('bridger',false);
        },true),
        button('Back to work',() => this.close()),
      ]);
    }

    brotherCash(onPhone = false) {
      const g=this.game;
      const c=g.career;
      const brother=ND.agents['brother-malcolm'];
      const playingBrother=c.state.agent===brother.id;
      const outstanding=c.floatAdjustment;
      const copies=[brother.title+'.',brother.line];
      const actions=[];
      if (outstanding) {
        const cash=money(Math.abs(outstanding.amount));
        copies.push('The ledger has a '+cash+' expense adjustment awaiting reconciliation.');
        if (c.state.cash>=outstanding.amount) {
          actions.push(button('Reconcile with Liz',() => {
            const reconciled=c.reconcileFloat();
            if (!reconciled) return;
            g.changed('Expense float reconciled.');
            this.brotherCash(onPhone);
          },true));
        }
      } else if (playingBrother && c.availableAllowance) {
        const cash=money(c.availableAllowance);
        copies.push('Liz approved a '+cash+' allowance for field expenses. The authorization is in the envelope.');
        actions.push(button('Record allowance',() => {
          const amount=c.expenseAllowance();
          if (!amount) return;
          g.changed(money(amount)+' approved for field expenses.');
          this.brotherCash();
        },true));
      } else {
        copies.push(onPhone ? 'You can find him near the spare desk at the Grand Rapids office.' :
          'He has the TV tuned to the local weather for everyone heading out to a showing.');
      }
      actions.push(button(onPhone?'Back to phone':'Back to work',() => onPhone ? this.phone('team') : this.close()));
      this.dialog(brother.name,copies,actions,brother.id);
    }

    refuel() {
      const g = this.game;
      const cost = g.career.fuelCost;
      this.dialog('SUV fuel', ['A local service can refuel the parked SUV for '+money(cost)+'. Allow eight minutes for the stop.'],[
        button('Pay '+money(cost),() => {
          const spent = g.career.refill();
          if (!spent) this.notice('There isn’t enough cash for fuel.');
          else g.changed('SUV refueled.');
          this.phone('ledger');
        },true),button('Back to ledger',() => this.phone('ledger')),
      ]);
    }

    acceptFile() {
      const g = this.game;
      g.career.accept();
      g.changed('File accepted · Schedule the showing on your phone.','accept');
      this.phone('deal');
    }

    desk() {
      const g = this.game;
      const career = g.career;
      const f = career.file;
      const r = career.record;
      const speaker = career.state.agent==='liz' ? 'malcolm' : 'liz';
      if (r.stage === 'lead') {
        const deskAgent = career.role('liz');
        const seller = f.side === 'seller';
        const intro = seller ? f.client+' signed the listing agreement. '+career.role('tanya')+' has the disclosure packet ready.' :
          deskAgent+' hands you the file. '+f.client+' signed the representation agreement. '+career.role('joel')+
          ' verified the lender’s approval up to '+money(f.limit)+'.';
        this.dialog(seller ? 'New listing file' : 'New buyer file',[intro,f.intake],[
          button('Accept file',() => this.acceptFile(),true),button('Back to work',() => this.close()),
        ],speaker);
      } else if (r.stage === 'title') {
        this.dialog('Title and lender review', [
          career.role('liz')+' matched the inspection addendum to the contract. '+career.role('joel')+
            ' has the lender’s approval and the title report is in the file.',
          'Price '+money(r.price)+' · Seller credit '+money(r.credit)+'.',
        ],[button('Confirm closing date',() => {
          career.title();
          g.changed('Closing scheduled for '+time(r.closeAt,true)+'.');
          this.phone('deal');
        },true),button('Back to work',() => this.close())],speaker);
      } else if (r.stage === 'sign') {
        this.closingTable(speaker);
      } else {
        this.phone('deal');
      }
    }

    appointmentWait(at, reopen) {
      const g = this.game;
      return button('Wait here until '+time(at),() => {
        if (g.career.waitFor(at)) g.changed();
        reopen();
      });
    }

    closingTable(speaker) {
      const g = this.game;
      const c = g.career;
      const r = c.record;
      const client = c.file.client;
      const ready = c.state.minute>=r.closeAt;
      const copies = ['Closing appointment '+time(r.closeAt,true)+'.'];
      const actions = [];
      if (!r.closingReviewed) {
        copies.push('Check the final statement against the signed contract and inspection addendum.');
        actions.push(button('Review settlement statement',() => this.closingStatement(speaker),true));
      } else if (ready) {
        copies.push(client+' has signed. The closing agent confirms the funds and deed. It’s time to hand over the keys.');
        actions.push(button('Record the sale and hand over the keys',() => {
          const summary = c.close();
          if (!summary) return;
          g.clearRoute();
          g.changed();
          this.celebrate(summary);
        },true));
      } else {
        copies.push('The statement is ready. '+client+' will meet you here at the appointment.');
      }
      if (c.canWait(r.closeAt)) actions.push(this.appointmentWait(r.closeAt,() => this.closingTable(speaker)));
      actions.push(button('Back to work',() => this.close()));
      this.dialog('Closing table',copies,actions,speaker);
    }

    closingStatement(speaker) {
      const g = this.game;
      const r = g.career.record;
      const actions = [button('Back to closing table',() => this.closingTable(speaker))];
      this.show('Settlement statement','dialog','<p>Contract price '+money(r.price)+'. The signed paperwork shows '+
        money(r.credit)+' in total seller credits. Enter that amount to check the closing statement.</p>'+
        '<form id="closing-statement" class="offer-form"><label>Total seller credit ($)'+
        '<input type="number" name="credit" min="0" max="'+r.price+'" inputmode="numeric" required></label>'+
        '<p class="form-error" role="status" hidden></p><div class="actions"><button type="submit" class="primary">Verify statement</button></div></form>'+
        this.actions(actions));
      this.listen(actions);
      const form = this.content.querySelector('#closing-statement');
      form.onsubmit = (event) => {
        event.preventDefault();
        const checksOut = g.career.reviewClosing(Number(new FormData(form).get('credit')));
        g.changed(checksOut ? 'Settlement statement verified.' : '');
        if (checksOut) this.closingTable(speaker);
        else {
          const error = form.querySelector('.form-error');
          error.textContent = 'The credit differs from the signed paperwork. Check the total.';
          error.hidden = false;
        }
      };
    }

    lockbox() {
      const g = this.game;
      const c = g.career;
      const site = g.world.features[c.file.id];
      const r = c.record;
      if (r.stage !== 'booked') {
        const message = Number.isFinite(r.missedAt) ? 'This showing window has closed. Rebook with '+c.file.client+'.' :
          'The seller releases access for booked showings.';
        this.dialog('Property lockbox',[message],[
          button(Number.isFinite(r.missedAt)?'Rebook showing':'Open deal',() => this.phone('deal'),true),
        ]);
        return;
      }
      if (c.state.minute<r.showAt) {
        const actions = [button('Back to work',() => this.close())];
        if (c.canWait(r.showAt)) actions.unshift(this.appointmentWait(r.showAt,() => this.lockbox()));
        this.dialog(site.name,[c.file.client+' will meet you here '+time(r.showAt,true)+'.'],actions);
        return;
      }
      const delay = c.showingDelay();
      if (delay) {
        g.changed();
        this.dialog(delay.title,[delay.line,delay.minutes+' minutes lost on this showing.'],[
          button('Continue to the showing',() => this.lockbox(),true),
          button('Return to parked SUV',() => { this.close(); g.returnToCar(); }),
        ]);
        return;
      }
      const copies = [c.file.client+' will meet you at the property '+time(r.showAt,true)+'. The seller sent the access instructions.'];
      if (c.file.advisor==='bridger' && c.state.agent!=='bridger') {
        copies.push('Bridger is joining the walkthrough and will be fifteen minutes late.');
      }
      this.dialog(site.name,copies,[
        button('Open lockbox',() => {
          if (!c.openShowing()) return;
          this.close();
          g.changed(c.file.side === 'seller' ? 'Lockbox open. Review the home for the listing.' : 'Lockbox open. Walk the house with the buyer.');
          g.enterBuilding(site);
          const visitor = ND.visitors[c.file.id];
          this.visitorLine(visitor,visitor.greeting);
        },true),
      ]);
    }

    observation(note) {
      const g = this.game;
      const visitor = ND.visitors[g.career.file.id];
      const log = (flag) => {
        const result = g.career.observe(note[0],flag);
        if (!result) return;
        this.close();
        const reason = note[4] || (result.important ? 'This condition can affect the inspection or repair estimate.' :
          'This is a routine condition to document for the client.');
        const scoring = result.matched ? '' : result.important ?
          ' Missing it cost you trust.' : ' Over-flagging a routine item cost a little trust.';
        const bonus = result.bonus ? ' Includes an agent-perk bonus.' : '';
        g.changed(reason+scoring+bonus);
        this.visitorLine(visitor,visitor.reactions?.[note[0]] ??
          (result.important ? 'Thanks for pointing that out. I want the inspector to look at it.' :
            'Thanks. That helps me understand the condition.'));
      };
      this.dialog(note[1],[note[2],'Does this need a follow-up before the client moves forward?'],[
        button('Flag for follow-up',() => log(true)),
        button('Log as routine',() => log(false)),
        button('Keep looking',() => this.close()),
      ]);
    }

    briefInspector(fromProperty = false) {
      const g = this.game;
      const c = g.career;
      this.dialog('Brief Riley',[
        'Which observation should Riley start with? A specific concern gives you evidence if you ask for a repair credit.',
      ],[
        ...c.file.notes.map((note)=>button(note[1],() => {
          const result = c.prepareInspection(note[0]);
          if (result) {
            g.changed();
            this.dialog('Riley’s reply',[result.reason || (result.prepared ? 'I’ll document that first.' : 'I’ll check it during the walkthrough.')],[
              button('Back to appointment',() => fromProperty ? this.beginInspection() : this.phone('deal'),true),
            ]);
          }
        })),
        button('Back',() => fromProperty ? this.beginInspection() : this.phone('deal')),
      ]);
    }

    beginInspection() {
      const g = this.game;
      const c = g.career;
      const site = g.world.features[c.file.id];
      const r = c.record;
      if (r.stage!=='inspection') return;
      if (r.inspectionWalk && c.state.minute>=r.inspectAt) {
        g.enterBuilding(site);
        return;
      }
      const inspector = ND.visitors.inspector;
      const copies = ['Inspection appointment '+time(r.inspectAt,true)+'.'];
      const actions = [];
      if (c.state.minute>=r.inspectAt) {
        copies.push('Head inside with the inspector and review the marked finding.');
        actions.push(button('Walk the inspection',() => {
          if (!c.startInspection()) return;
          this.close();
          g.changed();
          g.enterBuilding(site);
          this.visitorLine(inspector,inspector.greeting);
        },true));
      } else {
        copies.push('The inspector is due at the appointment. You can send Riley your main concern while you wait.');
        if (!r.inspectionBriefed) actions.push(button('Brief the inspector',() => this.briefInspector(true),true));
        if (c.canWait(r.inspectAt)) actions.push(this.appointmentWait(r.inspectAt,() => this.beginInspection()));
      }
      actions.push(button('Back to the property',() => this.close()));
      this.dialog('Meet '+inspector.name,copies,actions);
    }

    inspection() {
      const g = this.game;
      const c = g.career;
      const r = c.record;
      const f = c.file;
      if (!r.inspectionWalk || c.state.minute<r.inspectAt) return this.beginInspection();
      const credit=c.repairCredit;
      const resolve = (decision) => {
        const result = c.inspection(decision);
        if (!result) return;
        if (result.counter) {
          g.changed('The seller offered '+money(result.counter)+' toward the repair.');
          this.inspection();
          return;
        }
        g.changed((result.agreed ? money(result.agreed)+' credit documented.' : 'Inspection complete.')+' Bring the file to the office.');
        this.close();
      };
      const actions = [button('Proceed at contract terms',() => resolve('as-is'),!credit)];
      if (r.inspectionOffer) actions.unshift(button('Accept '+money(r.inspectionOffer)+' credit',() => resolve('counter'),true));
      else if (credit) actions.unshift(button((f.side==='seller'?'Authorize ':'Request ')+money(credit)+' credit',() => resolve('full'),true));
      if (f.side!=='seller') actions.push(button('Use the inspection contingency',() => this.withdrawDeal(true)));
      const copies=[f.report,'Inspection appointment '+time(r.inspectAt,true)+'.'];
      if (f.advisor==='bridger' && g.career.state.agent!=='bridger') {
        copies.push('Bridger will arrive fifteen minutes after the inspection begins.');
      }
      if (r.arcadeSeptic) copies.push('The contractor confirmed the failed septic report and included the work in the estimate.');
      if (f.side==='seller' && credit<f.repair) copies.push('Your seller has authorized up to '+money(credit)+' for this repair.');
      if (f.side!=='seller' && credit) {
        copies.push(r.inspectionOffer ? 'The seller will cover '+money(r.inspectionOffer)+'. Your buyer can accept, proceed without the credit, or withdraw.' :
          c.creditSupported ? 'Riley documented the concern you raised. You have evidence for the full credit.' :
          'The finding came up late. The seller may share the cost if you ask for a credit.');
      }
      this.dialog('Inspection with '+ND.visitors.inspector.name,copies,actions);
    }

    warpShack() {
      const available = ND.arcadeDestinations.filter((name) => this.game.world.townStops[name]);
      this.dialog('Ice-fishing shack',[
        'Choose a shortcut. Your SUV comes with you and the workday advances '+ND.shortcutMinutes+' minutes.',
      ],available.map((name) => button(name,() => this.game.warpTo(name),name===available[0])));
    }

    tagInvite() {
      const actions = [
        button('Start match',() => this.game.startTag(),true),
        button('Back to work',() => this.close()),
      ];
      this.dialog('Tanya’s Laser Tag',[
        ...(this.firstOpen('laser') ? ['Take an optional 45-second arcade break. Your real estate workday pauses during the match.'] : []),
        'Good Lord, that scoreboard owes me a rematch. Step up here, sugar, and tag all five opponents in 45 seconds.',
        'Move with WASD. Aim with the mouse or arrow keys. Click or press F to fire. On touch screens, drag to aim and tap Fire.',
      ],actions,'tanya');
    }

    tagResult(count,total) {
      this.dialog(count === total ? 'Tanya wins the match' : 'Match complete',
        [count+' of '+total+' opponents tagged.','Lord have mercy, that timer just about made me lose my religion.'],[
          button('Play again',() => this.game.startTag(),true),
          button('Back to work',() => this.close()),
        ],'tanya');
    }

    graphics() {
      const g = this.game;
      const mode=g.renderer.quality;
      const golden = g.renderer.lighting==='golden';
      this.dialog('Graphics',[
        'High uses detailed shadows, waves, and wet-road reflections. Medium keeps shadows at a lighter resolution. Low reduces scenery and turns off sun-cast shadows.',
        'Natural lighting follows the game clock. Golden hour gives you a warm late-afternoon look while the workday clock keeps its own time.',
      ],[
        ...['high','medium','low'].map(value=>{
          const label=value[0].toUpperCase()+value.slice(1);
          return button(label+(value===mode?' · Active':''),()=>{g.setGraphics(value);this.graphics();},value===mode);
        }),
        button(golden?'Natural lighting':'Natural lighting · Active',() => { g.setLighting('natural'); this.graphics(); }),
        button(golden?'Golden hour · Active':'Golden hour',() => { g.setLighting('golden'); this.graphics(); }),
        button('Done',() => this.close()),
      ]);
    }

    dailyReport(report,next) {
      const g = this.game;
      const c = g.career;
      const weather = g.career.recapEvent(report);
      const marks = [['Files accepted',report.files],['Showings',report.showings],['Offers',report.offers],
        ['Inspections',report.inspections||0],['Title files cleared',report.titles||0],['Closings',report.closings],
        ['Miles driven',report.miles.toFixed(1)],['Net cash change',money(report.net)],
        ['Trust change',(report.trust>0?'+':'')+report.trust],['Road delays',report.roadNotes]];
      if (report.missed) marks.push(['Missed showings',report.missed]);
      if (report.delegated) marks.push(['Showings covered by the team',report.delegated]);
      if (report.lost) marks.push(['Files closed without sale',report.lost]);
      if (report.rivals || report.showingDelays) marks.push(['Showing delays',(report.rivals||0)+(report.showingDelays||0)]);
      const actions = [next ? button('Start next workday',() => {
        this.close();
        this.notice(g.career.event.title+' · '+g.career.event.detail);
      },true) : button('Back to ledger',() => this.phone('ledger'),true)];
      if (!next) {
        const index = c.state.recaps.indexOf(report);
        if (index>0) actions.push(button('Previous day',() => this.dailyReport(c.state.recaps[index-1],false)));
        if (index<c.state.recaps.length-1) actions.push(button('Next day',() => this.dailyReport(c.state.recaps[index+1],false)));
      }
      const stats = report.worked===false ? '<p>No fieldwork was logged for this day.</p>' :
        '<dl class="details">'+marks.map(([label,value])=>'<div><dt>'+escape(label)+'</dt><dd>'+escape(value)+'</dd></div>').join('')+'</dl>';
      this.show('Day '+(report.index+1)+' recap','recap','<p>'+escape(weather.title)+' · '+escape(weather.detail)+'</p>'+
        stats+(next ? '<p class="detail">Next workday · '+time(c.state.minute,true)+' · '+escape(c.event.title)+'</p>'+this.agenda() : '')+
        this.actions(actions));
      this.listen(actions);
    }

    endWorkday() {
      const g = this.game;
      const c = g.career;
      const pending = ND.files.filter((file) => {
        const r = c.state.files[file.id];
        return r.stage==='booked' && !r.coveredBy && r.showAt+c.showingGrace<c.nextWorkday;
      });
      const copies = ['Wrap up at the office and resume '+time(c.nextWorkday,true)+'.'];
      if (pending.length) copies.push('Any uncovered showings that expire before then will be missed. '+pending.map((file)=>file.client).join(', ')+'.');
      this.dialog('End workday',copies,[
        button('Finish today',() => this.dailyReport(g.endWorkday(),true),true),
        button('Keep working',() => this.pause()),
      ]);
    }

    pause() {
      const g = this.game;
      const actions = [
        button('Back to work',() => this.close(),true),
        button('Change camera',() => { g.toggleView(); this.close(); }),
        button(g.sound.enabled ? 'Mute sound' : 'Turn on sound',() => { g.sound.toggle(); this.pause(); }),
        button(g.sound.musicEnabled ? 'Turn off music' : 'Turn on music',() => { g.sound.toggleMusic(); this.pause(); }),
        button('Return to parked SUV',() => { this.close(); g.returnToCar(); }),
        button('Tanya’s laser tag',() => this.tagInvite()),
        button('Graphics · '+g.renderer.qualityLabel,() => this.graphics()),
        button('Choose agent',() => this.choose()),
        button('First-day tutorial',() => this.tutorial()),
        button('End workday',() => this.endWorkday()),
        button('New career',() => this.newCareer()),
      ];
      if (g.driving) actions.splice(3,1);
      this.show('North Desk','pause','<p>'+escape(ND.agents[g.career.state.agent].name)+' · '+time(g.career.state.minute,true)+'</p>'+
        '<ul class="control-list">'+[
          ['W A S D','Walk or drive'], ['Mouse / ← →','Look around or steer'], ['Shift / Space','Run on foot or brake in the SUV'],
          ['E','Interact or enter and exit the SUV'], ['C','Switch camera'], ['P / M','Open phone or regional map'],
        ].map(([keys,description]) => '<li><kbd>'+keys+'</kbd><span>'+description+'</span></li>').join('')+
        '</ul>'+this.actions(actions));
      this.listen(actions);
    }

    map(focus = false) {
      const g = this.game;
      const selected = g.gps?.target;
      if (!this.mapPose || focus) {
        this.mapPose = focus && selected ? { x:selected.x,z:selected.z,zoom:8 } : null;
      }
      const hint = this.firstOpen('map') ? '<p class="day-brief">Pick a destination for driving directions. Fast Travel takes the trip for you and uses time and fuel.</p>' : '';
      this.show('Northern Minnesota','map',hint+'<div class="map-layout"><div class="map-canvas">'+
        '<canvas id="regional-map" aria-label="Map of Northern Minnesota roads and lakes"></canvas>'+
        '<div class="map-buttons"><button type="button" id="zoom-in" aria-label="Zoom in">+</button>'+
        '<button type="button" id="zoom-out" aria-label="Zoom out">−</button>'+
        '<button type="button" id="local-map">My location</button><button type="button" id="all-map">Region</button></div>'+
        '</div><aside class="map-side"><input id="map-search" class="map-search" type="search" aria-label="Find a town, property, or coin run" placeholder="Find a place or coin run">'+
        '<div id="map-route" class="map-route"></div><div id="map-places" class="rows"></div></aside></div>'+
        '<div class="map-source">Street and water data from <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html" target="_blank" rel="noopener">U.S. Census TIGER/Line</a>. '+
        'Terrain from <a href="https://www.usgs.gov/3d-elevation-program/about-3dep-products-services" target="_blank" rel="noopener">USGS 3DEP</a>.</div>');
      const canvas = byId('regional-map');
      if (!this.mapPose) this.regionMap(canvas);
      const zoom = (factor,px=canvas.clientWidth/2,pz=canvas.clientHeight/2) => {
        const pose = this.mapPose;
        const next = ND.clamp(pose.zoom*factor,1.5,1300);
        pose.x += (px-canvas.clientWidth/2)*(pose.zoom-next);
        pose.z += (pz-canvas.clientHeight/2)*(pose.zoom-next);
        pose.zoom = next;
        this.drawMap();
      };
      byId('zoom-in').onclick = () => zoom(.65);
      byId('zoom-out').onclick = () => zoom(1.55);
      byId('local-map').onclick = () => {
        this.mapPose = { x:g.player.x,z:g.player.z,zoom:6 };
        this.drawMap();
      };
      byId('all-map').onclick = () => { this.regionMap(canvas); this.drawMap(); };
      byId('map-search').oninput = () => this.mapPlaces();
      canvas.addEventListener('wheel',(e) => {
        e.preventDefault();
        zoom(Math.exp(e.deltaY*.002),e.offsetX,e.offsetY);
      },{passive:false});
      let drag;
      canvas.onpointerdown = (e) => {
        drag = { x:e.clientX,z:e.clientY,d:0 };
        canvas.setPointerCapture(e.pointerId);
      };
      canvas.onpointermove = (e) => {
        if (!drag) return;
        const dx = e.clientX-drag.x;
        const dz = e.clientY-drag.z;
        drag = { x:e.clientX,z:e.clientY,d:drag.d+Math.abs(dx)+Math.abs(dz) };
        this.mapPose.x -= dx*this.mapPose.zoom;
        this.mapPose.z -= dz*this.mapPose.zoom;
        this.drawMap();
      };
      canvas.onpointerup = (e) => {
        if (drag?.d < 5) {
          const { x,z,zoom } = this.mapPose;
          const rect = canvas.getBoundingClientRect();
          const px = x+(e.clientX-rect.left-rect.width/2)*zoom;
          const pz = z+(e.clientY-rect.top-rect.height/2)*zoom;
          const items = [
            ...Object.values(g.world.features).map((s)=>({x:s.x,z:s.z,id:s.id})),
            ...Object.values(g.arcade.stops),
            ...g.geo.towns.map((t)=>({x:t.x,z:t.z,id:t.name})),
          ];
          const hit = items.map((p)=>({ id:p.id,d:Math.hypot(p.x-px,p.z-pz) }))
            .sort((a,b)=>a.d-b.d)[0];
          if (hit?.d < zoom*17) g.setGPS(hit.id);
        }
        drag = null;
      };
      canvas.onpointercancel = () => { drag = null; };
      this.mapPlaces();
      this.mapRoute();
      this.drawMap();
    }

    regionMap(canvas) {
      const xs = this.game.geo.towns.map((item) => item.x);
      const zs = this.game.geo.towns.map((item) => item.z);
      const minX = Math.min(...xs)-7000;
      const maxX = Math.max(...xs)+5800;
      const minZ = Math.min(...zs)-5800;
      const maxZ = Math.max(...zs)+5400;
      this.mapPose = { x:(minX+maxX)/2,z:(minZ+maxZ)/2,
        zoom:Math.max((maxX-minX)/Math.max(180,canvas.clientWidth-30),(maxZ-minZ)/Math.max(140,canvas.clientHeight-28)) };
    }

    mapPlaces() {
      if (this.panel !== 'map') return;
      const g = this.game;
      const q = byId('map-search').value.trim().toLowerCase();
      const presets = Object.values(g.world.features).map((site) => [site.id,site.name,site.town]);
      const coinRuns = Object.values(g.arcade.stops).map((stop) => [stop.id,stop.label,stop.town]);
      const towns = g.geo.towns.slice().sort((a,b)=>a.name.localeCompare(b.name)).map((town)=>[town.name,town.name,'']);
      const matches = [...presets,...coinRuns,...towns].filter((p)=>p.slice(1).join(' ').toLowerCase().includes(q));
      byId('map-places').innerHTML = matches.map(([id,label,town]) => '<button type="button" class="row" data-place="'+escape(id)+
        '" aria-current="'+(g.gps?.id===id)+'">'+escape(label)+(town?'<span class="tag">'+escape(town)+'</span>':'')+'</button>').join('') ||
        '<p>No places match.</p>';
      this.content.querySelectorAll('[data-place]').forEach((item)=> {
        item.onclick = () => g.setGPS(item.dataset.place);
      });
    }

    mapRoute() {
      if (this.panel !== 'map') return;
      const g = this.game;
      const selected = g.gps;
      const el = byId('map-route');
      if (!selected) {
        el.innerHTML = '<p>Select a town, property, or coin run to set your GPS.</p>';
        return;
      }
      const miles = selected.route.meters * ND.MILES;
      const near = g.driving || g.nearCar(12);
      el.innerHTML = '<strong>'+escape(selected.target.label)+'</strong><p>'+miles.toFixed(1)+' mi by road</p>'+
        '<p class="detail">Drive it yourself follows the route with you at the wheel. Fast Travel arrives parked and uses about '+
        Math.round(g.career.driveMinutes(miles))+' in-game minutes and fuel.</p>'+
        '<div class="actions"><button type="button" class="small primary" id="follow-gps">Drive it yourself</button>'+
        '<button type="button" class="small" id="assist-gps">'+(near?'Fast Travel':'Return to SUV')+'</button></div>'+
        '<div class="actions"><button class="small" type="button" id="zoom-stop">Show destination</button>'+
        '<button class="small" type="button" id="clear-route">Clear GPS</button></div>';
      byId('follow-gps').onclick = () => this.close();
      byId('assist-gps').onclick = () => {
        if (near) g.assistedDrive();
        else { g.returnToCar(); this.mapRoute(); this.drawMap(); }
      };
      byId('zoom-stop').onclick = () => { this.mapPose = { x:selected.target.x,z:selected.target.z,zoom:8 }; this.drawMap(); };
      byId('clear-route').onclick = () => { g.clearRoute(); this.mapPlaces(); this.mapRoute(); this.drawMap(); };
    }

    drawMap() {
      if (this.panel !== 'map' || !this.mapPose) return;
      const g = this.game;
      g.maps.draw(byId('regional-map'),g.mapView(this.mapPose));
    }
  }

  Object.assign(ND,{ Interface, byId, button });
})();
