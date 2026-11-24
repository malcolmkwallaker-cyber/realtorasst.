'use strict';

(() => {
  const ND = globalThis.ND;
  const byId = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g,
    (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const { money, time, status } = ND;

  const button = (label, handler, primary = false) => ({ label, handler, primary });

  class Interface {
    constructor(game) {
      this.game = game;
      this.overlay = byId('overlay');
      this.window = byId('window');
      this.content = byId('window-content');
      this.panel = '';
      this.prevFocus = null;
      this.toastTimer = null;
      this.mapPose = null;
      byId('close-window').onclick = () => this.close();
      this.overlay.addEventListener('click', (event) => {
        if (event.target === this.overlay) this.close();
      });
      window.addEventListener('resize', () => this.drawMap());
    }

    show(title, kind, html) {
      this.game.keys.clear();
      this.game.sound.quiet();
      if (document.pointerLockElement) document.exitPointerLock();
      if (!this.panel) this.prevFocus = document.activeElement;
      this.panel = kind;
      this.overlay.classList.toggle('phone',kind === 'phone');
      this.window.classList.toggle('map-window',kind === 'map');
      byId('window-title').textContent = title;
      this.content.innerHTML = html;
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

    notice(message) {
      const toast = byId('toast');
      toast.textContent = message;
      toast.hidden = false;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { toast.hidden = true; },3900);
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
            '<div class="rows">'+ND.files.map((f) => {
            const site = g.world.features[f.id];
            const r = career.state.files[f.id];
            const stage = r.stage==='lead' && r.arcadeApproval ? 'Pre-approved' : status[r.stage];
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
          html = '<h3>'+money(state.cash)+'</h3><p>'+career.closed+' of '+ND.files.length+' closings · '+
            state.mileage.toFixed(1)+' mi driven · '+Math.round(state.tank)+'% fuel</p>'+
            '<p class="detail">The Pemberton office started your ledger with a '+money(opening.amount)+' expense float for work on the road.</p>'+
            (record ? '<div class="rows">'+record+'</div>' : '<p class="detail">Earn your first fee by closing a transaction.</p>');
          if (state.tank < 99) actions.push(button('Arrange fuel delivery',() => this.refuel()));
          if (state.recaps.length) actions.push(button('Latest day recap',() => this.dailyReport(state.recaps.at(-1),false)));
          html += this.actions(actions);
          break;
        }
      }
      this.show('Phone','phone',nav+html);
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
        g.changed('The listing is live. A buyer sent an offer.');
        this.phone('deal');
      };
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
        extra = '<p>'+ (seller ? 'Avery is available for a listing walkthrough' : 'The seller is taking appointments') +
          ' from 9 AM to '+end+'.</p>';
        if (career.event.id==='hesitant') extra+='<p class="detail">'+escape(career.event.detail)+'</p>';
        actions.push(button(seller ? 'Book first listing visit' : 'Book earliest showing',() => g.book(false),true),button('Book tomorrow at 9 AM',() => g.book(true)));
      }
      if (r.stage === 'booked') {
        extra = '<p>Showing booked for '+time(r.showAt,true)+'. The lockbox is at the front door.</p>';
        actions.push(navigate(f.id,'Route to showing'));
      }
      if (r.stage === 'tour') {
        extra = '<p>'+r.notes.length+' of '+f.notes.length+' observations logged. Walk the property to finish your notes.</p>';
        actions.push(navigate(f.id,'Route to property'));
      }
      if (r.stage === 'offer' && seller) {
        extra = '<p>Prepare the disclosure and set an asking price from the comparable sales.</p>'+
          '<form id="listing-form" class="offer-form"><label>Asking price ($)<input name="price" type="number" min="'+
          (f.low-10000)+'" max="'+(f.high+20000)+'" value="'+(r.ask||f.list)+'" step="100" required></label>'+
          '<p class="form-error" role="status" hidden></p><div class="actions"><button class="primary" type="submit">Publish listing</button></div></form>';
      }
      if (r.stage === 'offer' && !seller) {
        const defaultPrice = Math.min(f.limit, Math.round((f.low + f.high) / 1000) * 500);
        extra = '<p>'+escape(career.role(f.advisor))+' can review the inspection notes and the comps. The buyer authorized an inspection contingency.</p>'+
          '<form id="offer-form" class="offer-form"><label>Offer price ($)<input name="price" type="number" min="'+(f.low-40000)+
          '" max="'+f.limit+'" value="'+(r.lastOffer||defaultPrice)+'" step="100" required></label>'+
          '<label>Seller paid costs<select name="credit"><option value="0">$0</option><option value="1500">$1,500</option>'+
          '<option value="3000">$3,000</option></select></label>'+
          '<p class="form-error" role="status" hidden></p><div class="actions"><button class="primary" type="submit">Submit offer</button></div></form>';
        if (career.event.id==='bidding') extra='<p class="detail">'+escape(career.event.detail)+'</p>'+extra;
      }
      if (r.stage === 'counter' && seller) {
        const net = r.incoming-r.buyerCosts;
        extra = '<p>A buyer offered '+money(r.incoming)+' with '+money(r.buyerCosts)+' in closing costs and an inspection contingency.</p>'+
          '<p>Offer after credit '+money(net)+'. Seller’s minimum '+money(f.reserve)+'.</p>';
        if (net >= f.reserve) actions.push(button('Accept buyer’s offer',() => {
          career.contract(r.incoming,r.buyerCosts);
          g.changed('Offer accepted. Inspection scheduled.');
          this.phone('deal');
        },true));
        actions.push(button('Counter within seller’s terms',() => {
          career.sellerCounter();
          g.changed('Buyer accepted the counteroffer.');
          this.phone('deal');
        },net<f.reserve),button('Revise list price',() => { r.stage='offer'; g.changed(); this.phone('deal'); }));
      }
      if (r.stage === 'counter' && !seller) {
        extra = '<p>The seller countered at '+money(r.counter)+' with no cost credit. The inspection contingency stays in the agreement.</p>';
        actions.push(button('Accept '+money(r.counter),() => {
          career.contract(r.counter,0);
          g.changed('Offer accepted. Inspection scheduled.');
          this.phone('deal');
        },true),button('Revise offer',() => { r.stage = 'offer'; g.changed(); this.phone('deal'); }));
      }
      if (r.stage === 'inspection') {
        extra = '<p>Contract at '+money(r.price)+'. Meet the inspector at the property '+time(r.inspectAt,true)+'.</p>';
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
      if (r.stage === 'closed') extra = '<p>'+money(r.price)+' closed · '+money(r.credit)+' seller credit.</p>';
      if (r.stage !== 'lead' && r.stage !== 'closed') {
        actions.push(button('Call '+career.role(f.advisor),() => this.person(f.advisor,true,true)));
      }
      const details = [[ 'List price', money(f.list) ],['Comparable sales',money(f.low)+'–'+money(f.high)],
        [seller?'Seller minimum':'Buyer approval',money(seller?f.reserve:f.limit)],['Stage',status[r.stage]],
        [seller?'Seller trust':'Buyer trust',r.trust+' / 100']];
      const html = '<div class="message"><span class="contact">'+escape(f.contact)+'</span><h3>'+escape(site.name)+
        '</h3><p>'+escape(site.town+' · '+site.road.segment.name+' · '+f.beds)+'</p>'+photo+
        '<p>'+escape(f.intake)+'</p></div>'+
        '<dl class="details">'+details.map(([key,val])=>'<div><dt>'+escape(key)+'</dt><dd>'+escape(val)+'</dd></div>').join('')+
        '</dl>'+extra+this.actions(actions);
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
      g.career.record.lastOffer = Number(data.get('price'));
      g.changed(result.result === 'accepted' ? 'Offer accepted. Inspection scheduled.' : 'The seller sent a counteroffer.');
      this.phone('deal');
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
      const amount=playingBrother || onPhone ? 0 : c.takeOfficeCash();
      if (amount<0) g.changed(money(-amount)+' missing from the expense float.');
      const outstanding=c.outstandingOfficeTheft;
      const copies=[brother.title+'.',brother.line];
      const actions=[];
      if (outstanding) {
        const cash=money(Math.abs(outstanding.amount));
        copies.push('Brother Malcolm pocketed '+cash+' from the office float. The ledger records the swipe.');
        const returning=outstanding.amount>0;
        if (!returning || c.state.cash>=outstanding.amount) {
          actions.push(button(returning?'Put the cash back':'Ask Liz to recover it',() => {
            const returned=c.returnOfficeCash();
            if (!returned) return;
            g.changed(cash+' returned to the float.');
            this.brotherCash(onPhone);
          },true));
        }
      } else if (c.officeTheft) {
        copies.push('The expense envelope is back in order. Liz has it on her desk.');
      } else if (playingBrother) {
        const cash=money(brother.perk.floatCash);
        copies.push('There’s '+cash+' in the expense envelope at the spare desk.');
        actions.push(button('Pocket '+cash,() => {
          const taken=c.takeOfficeCash();
          if (!taken) return;
          g.changed(money(taken)+' added to your ledger.');
          this.brotherCash();
        },true));
      } else {
        copies.push(onPhone ? 'You can find him near the spare desk at the Grand Rapids office.' :
          'He looks at the empty envelope and puts it back on the desk.');
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
        this.dialog('Closing table', [
          f.client+' has the final statement and completed the last walkthrough. Funds are ready for disbursement.',
          'Closing appointment '+time(r.closeAt,true)+'.',
        ],[button('Sign and record closing',() => {
          const earned = career.close();
          g.clearRoute();
          g.changed('Closed · '+money(earned)+' to your ledger.');
          this.phone('ledger');
        },true),button('Back to work',() => this.close())],speaker);
      } else {
        this.phone('deal');
      }
    }

    lockbox() {
      const g = this.game;
      const c = g.career;
      const site = g.world.features[c.file.id];
      const r = c.record;
      if (r.stage !== 'booked') {
        this.dialog('Property lockbox',['The seller releases access for booked showings.'],[
          button('Open deal',() => this.phone('deal'),true),
        ]);
        return;
      }
      if (c.state.minute > r.showAt+c.showingGrace) {
        this.dialog('Showing window passed',['Contact the seller for the next available time.'],[
          button('Request a new time',() => { r.stage = 'schedule'; g.changed(); this.phone('deal'); },true),
        ]);
        return;
      }
      const rival = c.rivalAtShowing();
      if (rival) {
        g.changed();
        if (rival.impact && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          g.canvas.animate([
            { transform:'translateX(0)' },{ transform:'translateX(-9px) scale(1.025)' },
            { transform:'translateX(6px) scale(1.015)' },{ transform:'none' },
          ],{duration:320});
          g.sound.arcade(false);
        }
        this.dialog(rival.title,[rival.crew+rival.line,rival.minutes+' minutes lost on this showing.'],[
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
        button(c.state.minute < r.showAt ? 'Wait and open lockbox' : 'Open lockbox',() => {
          c.openShowing();
          g.changed(c.file.side === 'seller' ? 'Lockbox open. Review the home for the listing.' : 'Lockbox open. Walk the house with the buyer.');
          this.close();
          g.enterBuilding(site);
        },true),
      ]);
    }

    observation(note) {
      const g = this.game;
      const log = (flag) => {
        const result = g.career.observe(note[0],flag);
        if (!result) return;
        const feedback = result.matched ? 'Well documented' :
          note[3] ? 'Worth a closer look during inspection' : 'The client marked this as routine';
        const next = g.career.record.stage === 'offer' ? ' · Open the deal on your phone.' : '';
        g.changed(feedback+' · +'+result.gained+' trust'+next);
        this.close();
      };
      this.dialog(note[1],[note[2],'Does this need a follow-up before the client moves forward?'],[
        button('Flag for follow-up',() => log(true)),
        button('Log as routine',() => log(false)),
        button('Keep looking',() => this.close()),
      ]);
    }

    inspection() {
      const g = this.game;
      const r = g.career.record;
      const f = g.career.file;
      const credit=g.career.repairCredit;
      const actions=[
        button('Proceed at contract terms',() => {
          g.career.inspection(false);
          g.changed('Inspection complete. Bring the file to the office.');
          this.close();
        },!credit),
      ];
      if (credit) {
        actions.unshift(button((f.side==='seller'?'Authorize ':'Request ')+money(credit)+' credit',() => {
          g.career.inspection(true);
          g.changed('Credit documented. Bring the addendum to the office.');
          this.close();
        },true));
      }
      const copies=[f.report,'Inspection appointment '+time(r.inspectAt,true)+'.'];
      if (f.advisor==='bridger' && g.career.state.agent!=='bridger') {
        copies.push('Bridger will arrive fifteen minutes after the inspection begins.');
      }
      if (r.arcadeSeptic) copies.push('The contractor confirmed the failed septic report and included the work in the estimate.');
      if (f.side==='seller' && credit<f.repair) copies.push('The seller’s minimum leaves '+money(credit)+' for a repair credit.');
      this.dialog('Inspection with '+f.client,copies,actions);
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
        'Good Lord, that scoreboard makes me fit to stab somebody. Step up here, sugar, and tag all five opponents in 45 seconds.',
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
      const low = g.renderer.low;
      this.dialog('Graphics',[
        'Low uses a smaller render size, fewer scenery details, and a 30 FPS cap. High adds sun-cast shadows, wave detail, wet pavement reflections, and a longer view.',
      ],[
        button(low?'Low · Active':'Low',() => { g.setGraphics('low'); this.graphics(); },low),
        button(low?'High':'High · Active',() => { g.setGraphics('high'); this.graphics(); },!low),
        button('Done',() => this.close()),
      ]);
    }

    dailyReport(report,next) {
      const g = this.game;
      const weather = g.career.recapEvent(report);
      const marks = [['Files accepted',report.files],['Showings',report.showings],['Offers',report.offers],
        ['Closings',report.closings],['Miles driven',report.miles.toFixed(1)],['Net earnings',money(report.net)],
        ['Trust gained','+'+report.trust],['Road delays',report.roadNotes]];
      if (report.rivals) marks.push(['Rival run-ins',report.rivals]);
      const actions = [next ? button('Start next workday',() => {
        this.close();
        this.notice(g.career.event.title+' · '+g.career.event.detail);
      },true) : button('Back to ledger',() => this.phone('ledger'),true)];
      this.show('Day '+(report.index+1)+' recap','recap','<p>'+escape(weather.title)+' · '+escape(weather.detail)+'</p>'+
        '<dl class="details">'+marks.map(([label,value])=>'<div><dt>'+escape(label)+'</dt><dd>'+escape(value)+'</dd></div>').join('')+
        '</dl>'+(next?'<p class="detail">Tomorrow · '+escape(g.career.event.title)+'</p>':'')+this.actions(actions));
      this.listen(actions);
    }

    pause() {
      const g = this.game;
      const actions = [
        button('Back to work',() => this.close(),true),
        button('Change camera',() => { g.toggleView(); this.close(); }),
        button(g.sound.enabled ? 'Mute sound' : 'Turn on sound',() => { g.sound.toggle(); this.pause(); }),
        button('Return to parked SUV',() => { this.close(); g.returnToCar(); }),
        button('Tanya’s laser tag',() => this.tagInvite()),
        button('Graphics · '+(g.renderer.low?'Low':'High'),() => this.graphics()),
        button('Choose agent',() => this.choose()),
        button('End workday',() => {
          g.car.speed=0;
          const report=g.career.endDay();
          g.changed();
          this.dailyReport(report,true);
        }),
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
      this.show('Northern Minnesota','map','<div class="map-layout"><div class="map-canvas">'+
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
        '<div class="actions"><button type="button" class="small primary" id="follow-gps">Back to world</button>'+
        '<button type="button" class="small" id="assist-gps">'+(near?'Drive with GPS':'Return to SUV')+'</button></div>'+
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
