'use strict';

(() => {
  const ND = globalThis.ND;
  const { byId, clamp, angle, time, money, button } = ND;
  const controls = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight',
    'ShiftLeft','ShiftRight','Space','KeyE','KeyC','KeyM','KeyP','Escape']);
  const tagMovement = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
  const turnRate = 3.05;
  const milesPerHour = 2.23694;
  const topSpeed = 120/milesPerHour;
  const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
  const direction = (a,b) => Math.atan2(b.x-a.x,a.z-b.z);
  const mix = (a,b,t) => a+(b-a)*t;

  class Game {
    constructor(geo, renderer, canvas) {
      this.canvas = canvas;
      this.geo = geo;
      this.renderer = renderer;
      this.world = new ND.World(geo,renderer);
      this.nameTags = new Map();
      this.arcade = new ND.Arcade(this.world);
      this.maps = new ND.MapPainter(geo);
      this.sound = new ND.Soundscape();
      this.keys = new Set();
      this.ui = new ND.Interface(this);
      this.saved = ND.restore();
      this.choice = this.saved?.career.agent || 'malcolm';
      this.started = false;
      this.driving = false;
      this.driveCamera = 0;
      this.walkCamera = 0;
      this.last = 0;
      this.hudAt = 0;
      this.autoSaveAt = 0;
      this.rain = 0;
      this.weather = {label:'Clear',intensity:0};
      this.seconds = 0;
      this.transit = false;
      this.tag = null;
      this.crossing = false;
      this.frameDirty = true;
      this.nextDraw = 0;
      this.lastDraw = 0;
      this.setupScene(this.choice);
      this.attach();
      this.canvas.addEventListener('webglcontextlost',(event) => {
        event.preventDefault();
        this.save();
        this.keys.clear();
        this.ui.dialog('Graphics interrupted', ['Reload North Desk to restore the 3D world.'],
          [button('Reload',() => location.reload(),true)]);
      });
      this.startScreen();
      requestAnimationFrame((t) => this.loop(t));
    }

    setupScene(agent) {
      const lot = this.world.features.office;
      const spawn = ND.toWorld(lot,0,-lot.d/2-4.55);
      this.player = { ...spawn,yaw:direction(spawn,lot.lobby),pitch:.006,agent,bob:0,stride:0 };
      this.car = { ...lot.parking,speed:0 };
      this.cameraY = null;
      this.routeAt = { x:this.player.x,z:this.player.z };
      this.world.warm(spawn.x,spawn.z);
    }

    startScreen() {
      byId('load-status').hidden = true;
      byId('start-game').hidden = false;
      byId('start-game').firstChild.textContent = this.saved ? 'New career ' : 'Start workday ';
      byId('resume-game').hidden = !this.saved;
      byId('choose-agent').hidden = false;
      byId('choose-agent').querySelector('strong').textContent = ND.agents[this.choice].name;
      byId('title-graphics').hidden = false;
      this.graphicsLabel();
    }

    start(resume) {
      const saved = resume && this.saved ? this.saved : null;
      this.setupScene(saved?.career.agent || this.choice);
      this.career = new ND.Career(this.choice,saved?.career);
      this.started = true;
      this.sound.open();
      this.driving = false;
      this.snowContact = false;
      this.geneTalkAt = 0;
      this.walkCamera = this.driveCamera = 0;
      this.cameraY = null;
      this.gps = null;
      this.frameDirty = true;
      this.ui.close(false);
      if (!saved) this.ui.resetIntroductions();
      let parkingRecovered = false;
      if (saved && this.validPoint(saved.player) && this.validPoint(saved.car)) {
        Object.assign(this.player,{ x:saved.player.x,z:saved.player.z,
          yaw:saved.player.yaw,pitch:clamp(saved.player.pitch??0,-.50,.50) });
        this.car = { x:saved.car.x,z:saved.car.z,yaw:saved.car.yaw,speed:0 };
        this.driving = !!saved.driving;
        if (this.driving) {
          this.player.x = this.car.x;
          this.player.z = this.car.z;
          this.player.yaw = this.car.yaw;
        }
        this.world.warm(this.player.x,this.player.z);
      }
      this.syncDoors();
      if (this.driving && !this.canPark(this.car)) {
        const position = this.safeParking(this.car);
        if (position) {
          Object.assign(this.car,position);
          Object.assign(this.player,{x:position.x,z:position.z,yaw:position.yaw});
        } else {
          this.driving = false;
          this.setupScene(this.career.state.agent);
        }
        parkingRecovered = true;
      }
      if (saved && !this.driving && !this.canWalk(this.player.x,this.player.z)) {
        this.clearFooting();
      }
      if (saved?.destination) this.setGPS(saved.destination);
      byId('title-screen').hidden = true;
      byId('hud').hidden = false;
      this.canvas.focus({preventScroll:true});
      this.save();
      this.updateHUD(true);
      this.showingReminders();
      if (parkingRecovered) this.ui.notice('Your SUV was moved to a clear parking spot. You can exit once stopped.');
      if (resume) this.captureLook();
      else this.ui.tutorial();
    }

    validPoint(point) {
      const [x0,z0,x1,z1] = this.geo.bounds;
      return point && [point.x,point.z,point.yaw].every(Number.isFinite) &&
        point.x >= x0 && point.x <= x1 && point.z >= z0 && point.z <= z1;
    }

    endWorkday() {
      const destination = this.gps?.id;
      const report = this.career.endDay();
      this.keys.clear();
      this.driving = false;
      this.carLook = 0;
      this.walkCamera = this.driveCamera = 0;
      this.snowContact = false;
      this.setupScene(this.career.state.agent);
      const office = this.world.features.office;
      Object.assign(this.player,office.lobby,{yaw:direction(office.lobby,office.desk),pitch:0});
      this.gps = null;
      if (destination) this.setGPS(destination);
      this.frameDirty = true;
      this.changed();
      return report;
    }

    clearFooting() {
      const p=this.player;
      for (const radius of [.22,.45,.76,1.18,1.78]) {
        for (let i=0;i<8;i++) {
          const yaw=i*Math.PI/4;
          const x=p.x+Math.sin(yaw)*radius;
          const z=p.z-Math.cos(yaw)*radius;
          if (this.canWalk(x,z)) {
            Object.assign(p,{x,z});
            return;
          }
        }
      }
    }

    save() {
      if (!this.started || this.transit) return;
      const data = {
        career:this.career.state,
        player:{x:this.player.x,z:this.player.z,yaw:this.player.yaw,pitch:this.player.pitch},
        car:{x:this.car.x,z:this.car.z,yaw:this.car.yaw},
        driving:this.driving,
        destination:this.gps?.id || null,
      };
      if (ND.persist(data)) this.saved = data;
    }

    syncDoors() {
      for (const file of ND.files) {
        if (this.career.state.files[file.id].unlocked) this.world.unlocked.add(file.id);
        else this.world.unlocked.delete(file.id);
        if (this.career.state.files[file.id].stage==='closed') this.world.sold.add(file.id);
        else this.world.sold.delete(file.id);
      }
    }

    changed(message,cue) {
      if (message) this.ui.notice(message);
      if (cue) this.sound.progress(cue);
      this.syncDoors();
      this.world.updateVisitor(this.career,this.player,this.driving);
      this.save();
      this.updateHUD(true);
      this.showingReminders();
    }

    showingReminders() {
      const leads = this.career.newLeads;
      if (leads?.length) {
        const fresh = leads.splice(0);
        const file = fresh.at(-1);
        this.syncDoors();
        this.sound.phoneBuzz();
        this.ui.notice((fresh.length>1 ? fresh.length+' new leads · ' : 'New lead · ')+file.client+' at '+
          this.world.features[file.id].name+'. Open your phone.',6500);
        this.save();
      }
      const offers = this.career.marketOffers.splice(0);
      if (offers.length) {
        this.sound.phoneBuzz();
        this.ui.notice('Offer ready to review · '+offers.map((file)=>file.client).join(', ')+'.',6500);
        this.save();
      }
      const alerts = this.career.showingAlerts;
      if (!alerts.length) { this.ui.trustFeedback(); return; }
      const reminders = alerts.splice(0);
      const messages = reminders.map(({file,level,left,lost,closes,coveredBy}) => {
        const penalty = lost ? ' · −'+lost+' trust for arriving late' : '';
        if (level===4) return this.career.role(coveredBy)+' finished '+file.client+'’s showing. Notes are in the deal.';
        if (level===1) return left===0 ? 'Showing due now' : 'Showing in '+left+' minutes, head to the property';
        if (level===2) return 'Showing late · '+file.client+penalty+' · Arrive by '+time(closes)+'.';
        return 'Missed showing with '+file.client+penalty+' · Rebook in Phone.';
      });
      this.sound.phoneBuzz();
      this.ui.notice(messages.join(' / '),6500);
      this.ui.trustFeedback();
      this.save();
    }

    chooseAgent(id) {
      this.choice=id;
      byId('choose-agent').querySelector('strong').textContent=ND.agents[id].name;
      if (!this.started) return;
      this.player.agent=id;
      this.career.state.agent=id;
      this.frameDirty=true;
      this.changed('Now playing as '+ND.agents[id].name+'.');
    }

    graphicsLabel() {
      byId('title-graphics').querySelector('strong').textContent = this.renderer.qualityLabel;
    }

    setGraphics(mode) {
      const wasLow=this.renderer.low;
      if (this.renderer.setQuality(mode)) {
        this.graphicsSample=null;
        if (wasLow!==this.renderer.low) this.world.refreshQuality(this.player.x,this.player.z);
        this.frameDirty = true;
      }
      this.graphicsLabel();
    }

    measureGraphics(timestamp,draw,playing) {
      if (!playing || this.renderer.quality!=='high' || this.graphicsAdjusted) {
        this.graphicsSample=null;
        return;
      }
      if (!draw) return;
      const sample=this.graphicsSample;
      if (!sample || timestamp-sample.last>5000) {
        this.graphicsSample={start:timestamp+1200,last:timestamp,frames:0,slow:0};
        return;
      }
      sample.last=timestamp;
      if (timestamp<sample.start) return;
      sample.frames++;
      const elapsed=timestamp-sample.start;
      if (elapsed<3000) return;
      const fps=sample.frames*1000/elapsed;
      sample.slow=fps<24 ? sample.slow+1 : 0;
      sample.start=timestamp;
      sample.frames=0;
      if (sample.slow<2) return;
      this.graphicsAdjusted=true;
      this.setGraphics('medium');
      this.ui.notice('Switched to Medium graphics to keep the game moving. You can change this in Graphics.');
    }

    setLighting(mode) {
      this.renderer.setLighting(mode);
      this.frameDirty = true;
    }

    startTag() {
      if (!this.started || this.transit || this.tag) return;
      this.save();
      this.ui.close(false);
      this.keys.clear();
      this.sound.update({ moving:false,driving:false,rain:0,stride:this.player.stride,speed:0,indoors:true,paved:true });
      this.tag = new ND.LaserTag(this.renderer,this.sound);
      this.frameDirty = true;
      byId('toast').hidden = true;
      byId('rain').hidden = true;
      byId('hud').hidden = true;
      byId('tag-hud').hidden = false;
      this.canvas.setAttribute('aria-label','Tanya’s 3D laser-tag arena');
      this.canvas.focus({preventScroll:true});
    }

    endTag(showResult) {
      if (!this.tag) return;
      const { tagged, rivals } = this.tag;
      this.tag.dispose();
      this.tag = null;
      this.frameDirty = true;
      this.keys.clear();
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
      byId('tag-hud').hidden = true;
      byId('hud').hidden = false;
      this.canvas.setAttribute('aria-label','North Desk 3D world');
      this.canvas.focus({preventScroll:true});
      this.updateHUD(true);
      if (showResult) this.ui.tagResult(tagged,rivals.length);
    }

    attach() {
      const canvas = this.canvas;
      byId('start-game').onclick = () => this.ui.newCareer();
      byId('resume-game').onclick = () => this.start(true);
      byId('choose-agent').onclick = () => this.ui.choose();
      byId('title-graphics').onclick = () => this.ui.graphics();
      window.addEventListener('resize',() => { this.frameDirty = true; });
      byId('open-map').onclick = () => this.ui.map();
      byId('open-phone').onclick = () => this.ui.phone();
      byId('open-menu').onclick = () => this.ui.pause();
      byId('interact').onclick = () => this.interact();
      byId('mouse-look').onclick = () => this.captureLook();
      byId('touch-view').onclick = () => this.toggleView();
      byId('tag-fire').onclick = () => this.tag?.fire();
      byId('tag-exit').onclick = () => this.endTag(false);
      for (const hold of document.querySelectorAll('[data-hold]')) {
        const code = hold.dataset.hold;
        hold.onpointerdown = (event) => {
          event.preventDefault();
          hold.setPointerCapture(event.pointerId);
          this.keys.add(code);
        };
        hold.onpointerup = hold.onlostpointercapture = hold.onpointercancel = () => this.keys.delete(code);
      }
      window.addEventListener('keydown',(event) => {
        this.ui.trap(event);
        if (event.code === 'Escape') {
          if (event.repeat || this.transit || this.crossing) return;
          if (this.ui.panel) this.ui.close();
          else if (this.tag) this.endTag(false);
          else if (this.started) this.ui.pause();
          return;
        }
        if (this.tag) {
          if (this.ui.panel || event.altKey || event.metaKey || event.ctrlKey) return;
          if (tagMovement.has(event.code)) {
            event.preventDefault();
            this.keys.add(event.code);
          } else if (event.code === 'KeyF' || (event.code === 'Space' && event.target.tagName !== 'BUTTON')) {
            event.preventDefault();
            if (!event.repeat) this.tag.fire();
          }
          return;
        }
        if (!this.started || this.transit || this.crossing || event.altKey || event.metaKey || event.ctrlKey ||
          !controls.has(event.code) || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
        if (event.code === 'Space' && event.target.tagName === 'BUTTON' && !this.driving) return;
        if (this.ui.panel) {
          if ((event.code === 'KeyP' && this.ui.panel === 'phone') || (event.code === 'KeyM' && this.ui.panel === 'map')) {
            event.preventDefault();
            if (!event.repeat) this.ui.close();
          }
          return;
        }
        event.preventDefault();
        this.keys.add(event.code);
        if (event.repeat) return;
        switch (event.code) {
          case 'KeyE': this.interact(); break;
          case 'KeyP': this.ui.phone(); break;
          case 'KeyM': this.ui.map(); break;
          case 'KeyC': this.toggleView(); break;
        }
      });
      window.addEventListener('keyup',(event) => this.keys.delete(event.code));
      window.addEventListener('blur',() => { this.keys.clear(); this.save(); });
      window.addEventListener('pagehide',() => this.save());
      document.addEventListener('visibilitychange',() => {
        if (!document.hidden) return;
        this.keys.clear();
        this.save();
      });
      let drag = null;
      canvas.oncontextmenu = (event) => event.preventDefault();
      canvas.onpointerdown = (event) => {
        if (!this.canLook()) return;
        canvas.focus({preventScroll:true});
        if (this.tag && event.pointerType === 'mouse' && event.button === 0) this.tag.fire();
        if (document.pointerLockElement === canvas) return;
        if (event.pointerType==='mouse' && event.button===0) this.captureLook();
        canvas.setPointerCapture(event.pointerId);
        drag = {cx:event.clientX,cy:event.clientY};
      };
      canvas.onpointermove = (event) => {
        if (document.pointerLockElement === canvas || !drag || !this.canLook()) return;
        this.look(event.clientX-drag.cx,event.clientY-drag.cy);
        drag = {cx:event.clientX,cy:event.clientY};
      };
      canvas.onpointercancel = canvas.onpointerup = canvas.onlostpointercapture = () => { drag = null; };
      document.addEventListener('pointerlockchange',() => {
        drag = null;
        if (document.pointerLockElement===canvas) this.lockUnavailable = false;
        this.updateMouseHint();
      });
      document.addEventListener('pointerlockerror',() => this.mouseLockFallback());
      document.addEventListener('mousemove',(event) => {
        if (document.pointerLockElement === canvas && this.canLook()) this.look(event.movementX,event.movementY);
      });
    }

    playing() {
      return this.started && !this.ui.panel && !this.transit && !this.crossing && !this.tag && !document.hidden;
    }

    canLook() {
      return this.playing() || (this.tag && !this.ui.panel && !document.hidden);
    }

    captureLook() {
      if (!this.canLook() || document.pointerLockElement===this.canvas ||
          !matchMedia('(pointer: fine)').matches) return;
      this.canvas.focus({preventScroll:true});
      if (!this.canvas.requestPointerLock) { this.mouseLockFallback(); return; }
      try {
        const lock = this.canvas.requestPointerLock();
        lock?.catch(() => this.mouseLockFallback());
      } catch {
        this.mouseLockFallback();
      }
    }

    mouseLockFallback() {
      this.lockUnavailable = true;
      this.updateMouseHint();
    }

    updateMouseHint() {
      const hint = byId('mouse-look');
      hint.hidden = !this.started || this.ui.panel || this.transit || this.tag ||
        document.pointerLockElement===this.canvas || !matchMedia('(pointer: fine)').matches;
      if (!hint.hidden) {
        const text = this.lockUnavailable ? 'Drag the scene to look' : 'Click to use mouse look';
        if (hint.textContent!==text) hint.textContent = text;
      }
    }

    look(dx,dy) {
      if (this.tag) {
        this.tag.look(dx,dy);
        return;
      }
      const p = this.player;
      if (this.driving) {
        this.carLook = clamp((this.carLook || 0) + dx*.0028,-.95,.95);
        p.pitch = clamp(p.pitch - dy*.00067,-.36,.32);
      } else {
        p.yaw += dx*.0028;
        p.pitch = clamp(p.pitch - dy*.00068,-.50,.50);
      }
    }

    toggleView() {
      if (this.driving) this.driveCamera = (this.driveCamera + 1) % 2;
      else this.walkCamera = (this.walkCamera + 1) % 2;
      this.player.pitch = this.driving || this.walkCamera ? -.08 : 0;
      this.cameraY = null;
    }

    moveFoot(dt) {
      const p = this.player;
      const key = (code) => Number(this.keys.has(code));
      const turn = key('ArrowRight')-key('ArrowLeft');
      const forward = Number(key('KeyW')||key('ArrowUp'))-Number(key('KeyS')||key('ArrowDown'));
      const right = key('KeyD')-key('KeyA');
      p.yaw += turn * dt * turnRate;
      const d = Math.hypot(right,forward) || 1;
      const run = key('ShiftLeft') || key('ShiftRight');
      const coffee = this.career.state.arcade.coffee>0 ? 1.24 : 1;
      const step = (run?5.8:3.65)*coffee*dt/d;
      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      const dx = (sin*forward+cos*right)*step;
      const dz = (-cos*forward+sin*right)*step;
      const oldX = p.x;
      const oldZ = p.z;
      if (dx && this.canWalk(p.x+dx,p.z)) p.x += dx;
      if (dz && this.canWalk(p.x,p.z+dz)) p.z += dz;
      const moved = Math.hypot(p.x-oldX,p.z-oldZ);
      p.walking = moved>.0001;
      p.stride += moved * (run ? 4.8 : 5.5);
      p.bob = mix(p.bob,forward||right ? Math.sin(p.stride)*.026 : 0,Math.min(1,dt*13));
    }

    canWalk(x,z) {
      const [px,pz] = ND.local(this.car,x,z);
      return (Math.abs(px)>1.23 || Math.abs(pz)>2.51) && this.world.allowed(x,z,.30,false);
    }

    moveCar(dt) {
      const car = this.car;
      const p = this.player;
      const key = (code) => Number(this.keys.has(code));
      const push = Number(key('KeyW')||key('ArrowUp')) - Number(key('KeyS')||key('ArrowDown'));
      const steering = Number(key('KeyD')||key('ArrowRight')) - Number(key('KeyA')||key('ArrowLeft'));
      const road = this.geo.nearest(car.x,car.z,13);
      const paved = road && road.distance < road.segment.width/2+1.2;
      const limit = paved ? [topSpeed,topSpeed,18,9][road.segment.type] : 9.1;
      const coffee = this.career.state.arcade.coffee>0 ? 1.28 : 1;
      const usable = this.career.state.tank > 0;
      const brake = key('Space') || !usable;
      const grip = 1-(this.weather.snow?.48:this.weather.label==='Rain'?.25:0)*this.rain;
      const previousSpeed = car.speed;
      const thrust = 8.4*(1-.42*Math.max(0,previousSpeed)/topSpeed);
      const acceleration = push*(previousSpeed*push<-.4?12:thrust)*grip*(push>0?coffee:1);
      car.speed += brake ? -Math.sign(car.speed)*Math.min(Math.abs(car.speed),dt*17*grip) :
        push ? acceleration*dt : -car.speed*Math.min(1,dt*.9);
      car.speed = clamp(car.speed,-7.4,Math.min(topSpeed,Math.max(limit*coffee,previousSpeed-dt*6)));
      car.yaw += steering * Math.sign(car.speed) * Math.min(1,Math.abs(car.speed)/2) * dt *
        (1.60-Math.min(.93,Math.abs(car.speed)*.027))*grip;
      const [hx,,hz] = angle(car.yaw);
      const dx = hx * car.speed * dt;
      const dz = hz * car.speed * dt;
      const move = Math.hypot(dx,dz);
      let moved = false;
      if (move) {
        const [x,z] = [car.x+dx,car.z+dz];
        const nose = Math.sign(car.speed)*1.65;
        if (this.world.allowed(x,z,.81,true) && this.world.allowed(x+hx*nose,z+hz*nose,.74,true)) {
          car.x = x;
          car.z = z;
          moved = true;
          this.career.drive(move);
          this.checkCurb(road,x,z);
        } else {
          car.speed = 0;
          const obstacle=this.world.roadBlocker(x+hx*nose,z+hz*nose) || this.world.roadBlocker(x,z);
          if (obstacle && !obstacle.stopped) {
            obstacle.stopped=true;
            this.career.day.roadNotes++;
            this.ui.notice(obstacle.kind==='deer crossing'?'Stopped for a deer crossing.':'Stopped for '+obstacle.kind+' ahead.');
          } else if (!obstacle && Math.abs(previousSpeed)>2.7 && this.seconds>(this.lastBump||0)) {
            this.lastBump = this.seconds+1.25;
            this.sound.roadBump();
            this.ui.notice('Bump · Back up to clear the obstacle.');
          }
        }
      }
      if (!usable && push && this.seconds > (this.warnedFuel || 0)) {
        this.warnedFuel = this.seconds+5;
        this.ui.notice('The tank is empty. Arrange fuel delivery from your phone ledger.');
      }
      p.x=car.x;
      p.z=car.z;
      p.yaw=car.yaw;
      this.carLook = (this.carLook || 0) * (push ? (1-dt*.92) : 1);
      if (moved) this.checkRoadArcade();
    }

    collectPrize(prize) {
      const message = this.career.collectPrize(prize);
      if (!message) return;
      this.sound.arcade(prize.kind!=='septic');
      this.ui.notice(message);
      this.save();
    }

    checkCurb(road,x,z) {
      if (Math.abs(this.car.speed)<4 || road?.segment.type!==2 || !road.segment.name ||
          road.distance>road.segment.width/2+.42 || this.seconds<(this.lastBump||0)) return;
      const next = this.geo.nearest(x,z,12);
      if (!next || next.segment!==road.segment || next.distance<=next.segment.width/2+.42 ||
          Number.isFinite(this.world.pavingHeight(x,z))) return;
      this.car.speed *= .72;
      this.lastBump = this.seconds+1.25;
      this.sound.roadBump();
      this.ui.notice('Curb · SUV slowed.');
    }

    checkRoadArcade() {
      const prize = this.arcade.roadAt(this.car,this.career);
      const snow = prize?.kind==='snow' && !this.career.state.arcade.star;
      if (snow) {
        if (!this.snowContact) {
          this.car.speed *= .48;
          this.career.day.roadNotes++;
          this.ui.notice('Snowbank · Speed reduced.');
          this.save();
        }
      } else if (prize) {
        this.collectPrize(prize);
      }
      this.snowContact = snow;
    }

    nearCar(radius) {
      return distance(this.player,this.car) <= radius;
    }

    enterCar() {
      this.driving = true;
      this.carLook = 0;
      Object.assign(this.player,{x:this.car.x,z:this.car.z,yaw:this.car.yaw,pitch:-.05,bob:0});
      this.cameraY = null;
      this.canvas.focus({preventScroll:true});
      this.save();
      this.updateHUD(true);
    }

    findExit(car, toward) {
      const ground = this.world.height(car.x,car.z);
      const exits = [[2.32,0],[-2.32,0],[2.32,-1.45],[-2.32,-1.45],[2.32,1.45],[-2.32,1.45],
        [0,3.29],[0,-3.29],[2.55,2.62],[-2.55,2.62],[2.55,-2.62],[-2.55,-2.62]]
        .map(([x,z])=>({
          point:ND.toWorld(car,x,z),
          edge:ND.toWorld(car,clamp(x,-1.18,1.18),clamp(z,-2.38,2.38)),
        }));
      if (toward) exits.sort((a,b)=>distance(a.point,toward)-distance(b.point,toward));
      const safe = exits.find(({point,edge})=>this.world.allowed(point.x,point.z,.31,false) &&
        !this.world.inside(point.x,point.z) && Math.abs(this.world.height(point.x,point.z)-ground)<1 &&
        this.world.allowed(edge.x,edge.z,.15,false) && this.world.canSee(edge,point));
      return safe?.point || null;
    }

    canPark(car) {
      return [-1.58,0,1.58].every((z)=>{
        const point = ND.toWorld(car,0,z);
        return this.world.allowed(point.x,point.z,.85,true);
      }) && Boolean(this.findExit(car));
    }

    safeParking(car) {
      const road = this.geo.nearest(car.x,car.z,90,(segment)=>segment.width>=6);
      const candidates = [];
      if (road) {
        const base = {...road,yaw:road.heading};
        const edge = road.segment.width/2+.95;
        for (const z of [0,-5,5,-12,12,-24,24]) {
          for (const x of [edge,-edge,edge+.9,-edge-.9,edge/2,-edge/2]) {
            candidates.push({...ND.toWorld(base,x,z),yaw:base.yaw});
          }
        }
      }
      for (const radius of [3.5,7,12,20,30]) {
        for (let i=0;i<8;i++) {
          const yaw=i*Math.PI/4;
          candidates.push({x:car.x+Math.sin(yaw)*radius,z:car.z-Math.cos(yaw)*radius,yaw:car.yaw});
        }
      }
      candidates.sort((a,b)=>distance(a,car)-distance(b,car));
      return candidates.find((position)=>this.canPark(position)) || null;
    }

    exitCar(update = true, toward) {
      if (Math.abs(this.car.speed) > 1.9) {
        this.ui.notice('Stop the SUV before getting out.');
        return;
      }
      let outside = this.findExit(this.car,toward);
      let recovered = false;
      if (!outside) {
        const position = this.safeParking(this.car);
        if (!position) { this.ui.notice('Move the SUV to a clear spot.'); return; }
        Object.assign(this.car,position);
        outside = this.findExit(this.car,toward);
        recovered = true;
      }
      this.driving = false;
      this.car.speed = 0;
      this.snowContact = false;
      Object.assign(this.player,{...outside,yaw:this.car.yaw,pitch:0});
      this.cameraY = null;
      if (update) this.changed(recovered ? 'SUV moved to a clear spot.' : '');
    }

    returnToCar() {
      if (this.driving) return;
      const walk = distance(this.player,this.car);
      if (walk < 3.3) return;
      this.world.warm(this.car.x,this.car.z);
      let outside = this.findExit(this.car);
      if (!outside) {
        const position = this.safeParking(this.car);
        if (!position) { this.ui.notice('The SUV has no clear walking approach.'); return; }
        Object.assign(this.car,position);
        outside = this.findExit(this.car);
      }
      this.career.addTime(walk * .011);
      Object.assign(this.player,{...outside,yaw:direction(outside,this.car),pitch:0});
      this.cameraY = null;
      this.changed('Back at your parked SUV.');
    }

    get labelForRoad() {
      const p = this.player;
      const road = this.geo.nearest(p.x,p.z,47);
      if (!road || !road.segment.name) return this.driving ? 'Northland roads' : '';
      return road.segment.name.replace(/^(?:U\.S\. Hwy|US Hwy) /,'US-').replace(/^State Hwy /,'MN-');
    }

    enterBuilding(lot) {
      if (this.driving) return;
      const inside = lot.lobby || ND.toWorld(lot,0,-lot.d/2+2.12);
      const focus = lot.type === 'office' ? lot.desk : this.walkPoints(lot).living;
      this.transitionDoor(inside,direction(inside,focus));
    }

    async transitionDoor(position,yaw) {
      if (this.crossing) return;
      this.crossing = true;
      this.keys.clear();
      const fade = byId('door-fade');
      const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      try {
        if (motion) {
          fade.hidden = false;
          await fade.animate({opacity:[0,1]},{duration:105,fill:'forwards'}).finished;
        }
        Object.assign(this.player,{...position,yaw,pitch:0,bob:0});
        this.cameraY = null;
        this.canvas.focus({preventScroll:true});
        this.frameDirty = true;
        this.changed();
        if (motion) await fade.animate({opacity:[1,0]},{duration:155,fill:'forwards'}).finished;
      } finally {
        fade.hidden = true;
        for (const animation of fade.getAnimations()) animation.cancel();
        this.crossing = false;
      }
    }

    walkPoints(lot) {
      return this.world.walkPoints(lot);
    }

    inspectionPoint(lot) {
      const note = this.career.file.notes.find((item)=>item[3] && item[0]!=='roof');
      return this.walkPoints(lot)[note?.[0] || 'rear'];
    }

    nearby() {
      if (this.driving) return { label:Math.abs(this.car.speed)>1.9?'Stop SUV before exiting':'Exit SUV',play:() => this.exitCar() };
      const g = this;
      const p = this.player;
      const c = this.career;
      const r = c.record;
      const s = this.world.features[c.file.id];
      const o = this.world.features.office;
      const inside = this.world.interiorAt(p.x,p.z);
      const inOffice = inside===o;
      const inListing = inside===s;
      const stage = r.stage;
      const picks = [];
      const doorAt = (site) => ND.toWorld(site,0,-site.d/2-.16);
      const add = (point,radius,label,play,visible=false) => {
        const d = distance(point,p);
        if (d<=radius && (!visible || this.world.canSee(p,point))) picks.push({label,play,d});
      };
      if (inOffice) {
        const title = { lead:c.file.side==='seller'?'Review the listing file':'Review the buyer file',
          title:'Review title and financing',sign:'Use the closing table' }[stage];
        if (title) {
          add(o.deskApproach,4.25,title,() => this.ui.desk());
        }
        if (p.agent==='brother-malcolm') {
          add(o.expenseFloat,1.9,'Check the expense envelope',() => this.ui.brotherCash());
        }
        add(o.threshold,1.75,'Exit North Desk',() => {
          const outside = ND.toWorld(o,0,-o.d/2-3.44);
          this.transitionDoor(outside,o.yaw);
        });
      } else if (!inside) {
        add(doorAt(o),4.6,'Enter North Desk',() => this.enterBuilding(o));
        add(this.arcade.shackDoor,2.1,'Open the ice-fishing shack',() => this.ui.warpShack());
      }
      const prize = this.arcade.roomAt(p,c);
      if (prize) add(prize,1.5,'Open mystery block',() => this.collectPrize(prize));
      if (!inside) {
        if (stage==='booked' || (stage==='schedule' && !r.unlocked)) {
          add(doorAt(s),3.45,stage==='booked'?'Open lockbox':'Check property lockbox',() => this.ui.lockbox());
        } else if (stage==='inspection') {
          add(doorAt(s),3.45,r.inspectionWalk?'Enter for inspection':'Meet the inspector',() => this.ui.beginInspection());
        }
        for (const file of ND.files) {
          const lot = this.world.features[file.id];
          if (!c.state.files[file.id].unlocked || (lot===s && ['booked','inspection'].includes(stage))) continue;
          add(doorAt(lot),3.05,'Enter house · '+lot.name,() => this.enterBuilding(lot));
        }
      } else if (!inOffice) {
        add(inside.threshold,1.65,'Step outside',() => {
          this.transitionDoor(ND.toWorld(inside,0,-inside.d/2-2.62),inside.yaw);
        });
      }
      if (stage === 'tour') {
        const points = this.walkPoints(s);
        const remaining=c.file.notes.filter((note)=>!r.notes.includes(note[0]));
        for (const note of remaining) {
          if ((inListing && note[0]!=='roof') || (!inside && note[0]==='roof')) {
            if (this.world.clearPath(p,points[note[0]])) add(points[note[0]],note[0]==='roof'?3.45:3.12,'Inspect '+note[1].toLowerCase(),() => this.ui.observation(note));
          }
        }
      }
      if (stage==='inspection' && inListing && this.world.clearPath(p,this.inspectionPoint(s))) {
        add(this.inspectionPoint(s),3.18,'Review the inspection',() => this.ui.inspection());
      }
      if (!inside) {
        const [x,z] = ND.local(this.car,p.x,p.z);
        add(ND.toWorld(this.car,clamp(x,-.98,.98),clamp(z,-2.26,2.26)),1.86,'Enter SUV',() => this.enterCar(),true);
      }
      for (const person of this.world.people) {
        if (person.id === p.agent) continue;
        if (person.late) add(person,2.05,'Check for Bridger',() => g.ui.waitForBridger(),true);
        else add(person,2.05,'Talk to '+person.short,() => g.ui.person(person.id,false),true);
      }
      const visitor = this.world.visitor;
      if (visitor) add(visitor,1.85,'Talk to '+visitor.name,() => this.ui.talkToVisitor(visitor),true);
      picks.sort((a,b)=>a.d-b.d);
      return picks[0] || null;
    }

    interact() {
      if (!this.playing()) return;
      this.updateInteraction()?.play();
    }

    updateInteraction() {
      const active = this.nearby();
      const el = byId('interact');
      el.hidden = !active;
      if (active && el.querySelector('span').textContent!==active.label) el.querySelector('span').textContent = active.label;
      return active;
    }

    goal() {
      const p = this.player;
      const goal = this.career.goal(this.world);
      const c = this.career;
      if (c.file.id==='ramble' && !c.file.gen && !c.record.coveredBy && !Number.isFinite(c.record.missedAt)) {
        const guide = {
          lead:'Meet Liz at her desk and accept Mara’s file.',
          schedule:'Open Phone → Deal and book Mara’s showing.',
          booked:'Drive the SUV to Mara’s lockbox · '+time(c.record.showAt,true),
          tour:'Walk the rooms with Mara and log each observation.',
        };
        if (guide[c.record.stage]) goal.detail=guide[c.record.stage];
      }
      const site = this.world.features[this.career.file.id];
      const office = this.world.features.office;
      const [x,z] = ND.local(office,p.x,p.z);
      const stage = this.career.record.stage;
      if (goal.point && ['lead','title','sign'].includes(stage) && Math.abs(x)<office.w/2 && Math.abs(z)<office.d/2) {
        return { ...goal,point:office.desk };
      }
      if (Math.abs(x)<office.w/2 && Math.abs(z)<office.d/2 && stage === 'booked') {
        return { ...goal,point:{...office.threshold,y:office.y,label:'Office exit',markerHeight:1.98} };
      }
      if (stage === 'tour') {
        const [sx,sz] = ND.local(site,p.x,p.z);
        const indoors=Math.abs(sx)<site.w/2 && Math.abs(sz)<site.d/2;
        const points=this.walkPoints(site);
        const remaining=this.career.file.notes.filter((note)=>!this.career.record.notes.includes(note[0]));
        const [note]=remaining.filter((n)=>indoors===(n[0]!=='roof'))
          .sort((a,b)=>distance(p,points[a[0]])-distance(p,points[b[0]]));
        if (note) return {...goal,point:this.walkMarker(site,points[note[0]],note[1])};
        if (indoors && remaining.some((n)=>n[0]==='roof')) {
          return {...goal,point:{...site.threshold,y:site.y,label:'Exit for the roof view',markerHeight:1.78}};
        }
      }
      if (stage==='inspection' && this.career.record.inspectionWalk) {
        const [sx,sz] = ND.local(site,p.x,p.z);
        if (Math.abs(sx)<site.w/2 && Math.abs(sz)<site.d/2) {
          return {title:'Review the visible defect',detail:'Walk to the inspection marker to review the estimate.',
            point:this.walkMarker(site,this.inspectionPoint(site),'Inspection finding')};
        }
      }
      return goal;
    }

    walkMarker(site,target,label) {
      const player=this.player;
      if (this.world.clearPath(player,target)) return {...target,y:site.y,label,markerHeight:1.36,walkMarker:true};
      const cached=this.inspectionRoute;
      if (!cached || cached.site!==site || cached.label!==label || distance(player,cached.start)>.72) {
        this.inspectionRoute={site,label,start:{x:player.x,z:player.z},path:this.world.walkingRoute(site,player,target,.4)};
      }
      const waypoint=this.inspectionRoute.path.findLast((point)=>distance(player,point)>.3 && this.world.clearPath(player,point,.24));
      return waypoint ? {...waypoint,y:site.y,label:'This way · '+label,markerHeight:.65,walkMarker:true} : null;
    }

    book(tomorrow) {
      const c = this.career;
      const id = c.file.id;
      const site = this.world.features[id];
      const road = this.geo.route(this.car,site.parking);
      const at = c.showingSlot(c.driveMinutes((road?.meters||0)*ND.MILES),tomorrow);
      const finish = () => {
        if (!c.book(at)) return;
        this.setGPS(id);
        this.changed('Showing booked for '+time(c.record.showAt,true)+'.','booking');
        this.ui.phone('deal');
      };
      const conflict = c.showingConflict(at);
      if (!conflict) { finish(); return; }
      this.ui.dialog('Appointments overlap',[
        conflict.client+' is booked at '+time(c.state.files[conflict.id].showAt,true)+'. This showing would be '+time(at,true)+'.',
        'You can hand a booked showing off to the office if a teammate is free.',
      ],[button('Book this time',finish,true),button('Pick another time',() => this.ui.phone('deal'))]);
    }

    setGPS(id, openMap = false) {
      const site = this.world.features[id];
      const target = site ? site.parking : this.arcade.stops[id] || this.world.townStops[id];
      if (!target) { if (openMap) this.ui.notice('No paved approach is available for this destination.'); return; }
      const route = this.geo.route(this.driving ? this.car : this.player,target);
      if (!route) { this.ui.notice('This destination is outside the road network.'); return; }
      this.gps = { id,target,route };
      this.routeAt = {x:this.player.x,z:this.player.z};
      this.save();
      if (openMap) {
        this.ui.map();
      } else if (this.ui.panel === 'map') {
        this.ui.mapPlaces();
        this.ui.mapRoute();
        this.ui.drawMap();
      }
    }

    clearRoute() {
      this.gps = null;
      this.save();
    }

    assistedDrive() {
      if (!this.gps || this.transit) return;
      if (!this.driving && !this.nearCar(12)) return;
      const { target } = this.gps;
      const route = this.geo.route(this.car,target);
      if (!route) { this.ui.notice('The GPS could not find a route from your SUV.'); return; }
      const miles = route.meters * ND.MILES;
      if (miles*.36 >= this.career.state.tank) {
        this.ui.notice('There isn’t enough fuel for this drive. Arrange fuel from your phone ledger.');
        return;
      }
      this.travelTo(target,route.end,{
        mode:'FAST TRAVEL',detail:miles.toFixed(1)+' mi · '+Math.round(this.career.driveMinutes(miles))+' in-game min',
        duration:1750,advance:() => this.career.drive(route.meters,true),
      });
    }

    warpTo(name) {
      const target = this.world.townStops[name];
      if (this.transit || this.driving || !ND.arcadeDestinations.includes(name) || !target ||
          distance(this.player,this.arcade.shackDoor)>2.1) return;
      this.travelTo(target,this.geo.nearest(target.x,target.z,45),{
        mode:'ICE SHACK SHORTCUT',detail:'SUV comes with you · '+ND.shortcutMinutes+' min',
        duration:1250,advance:() => this.career.addTime(ND.shortcutMinutes),keepRoute:true,
      });
    }

    travelTo(target, fallback, { mode,detail,duration,advance,keepRoute }) {
      const destination = this.gps?.id;
      this.transit = true;
      this.ui.close(false);
      this.keys.clear();
      const curtain = byId('transit');
      curtain.style.setProperty('--trip-duration',duration+'ms');
      byId('transit-mode').textContent = mode;
      byId('transit-destination').textContent = target.label;
      byId('transit-miles').textContent = detail;
      curtain.hidden = false;
      setTimeout(() => {
        advance();
        this.world.warm(target.x,target.z);
        let position = target;
        if (fallback && !this.world.allowed(target.x,target.z,.85,true)) {
          position = { ...target,x:fallback.x,z:fallback.z,yaw:fallback.heading };
        }
        this.car={ ...position,speed:0 };
        this.enterCar();
        this.gps = null;
        this.transit = false;
        this.frameDirty = true;
        curtain.hidden = true;
        const site = this.world.features[target.id];
        this.exitCar(false,site?.entry);
        if (site && !this.driving) this.player.yaw = direction(this.player,site.entry);
        if (keepRoute && destination && destination!==target.name) this.setGPS(destination);
        this.changed('Arrived · '+target.label+'.');
        this.canvas.focus({preventScroll:true});
      },duration);
    }

    mapView(pose) {
      const p = this.player;
      const stops = Object.values(this.world.features).map((site) => ({
        x:site.x,z:site.z,label:site.name,active:site.id===this.career.file.id,
      }));
      if (this.gps && !this.world.features[this.gps.id]) stops.push({ ...this.gps.target,active:true });
      return { ...pose, player:p,car:this.car,driving:this.driving,route:this.gps?.route,stops };
    }

    camera(dt) {
      const aspect = this.renderer.resize();
      const p = this.player;
      if (!this.started) {
        const lot = this.world.features.office;
        const origin = ND.toWorld(lot,-12.8,-lot.d/2-9.25);
        const y = this.world.height(origin.x,origin.z) + 1.71;
        const sway = Math.sin(this.seconds*.084)*.043;
        const yaw = direction(origin,lot) - .235 + sway;
        return ND.frame([origin.x,y,origin.z],yaw,-.018,aspect,Math.PI/3.14);
      }
      let ground = this.world.height(p.x,p.z);
      const eased = this.cameraY ?? ground;
      this.cameraY = mix(eased,ground,Math.min(1,dt*11));
      ground = this.cameraY;
      const yaw = p.yaw+(this.driving ? (this.carLook || 0) : 0);
      const pitch = p.pitch;
      const [fx,,fz] = angle(yaw);
      const speedFov = this.driving ? Math.abs(this.car.speed)/topSpeed*.24 : 0;
      if (this.driving && this.driveCamera === 0) {
        const back = this.world.cameraDistance(p.x,p.z,-fx,-fz,7.65+Math.min(2.4,Math.abs(this.car.speed)*.083));
        const x = p.x-fx*back;
        const z = p.z-fz*back;
        const y = Math.max(this.world.height(x,z)+1.6,ground+3.62);
        return ND.frame([x,y,z],yaw,-.22+pitch*.49,aspect,Math.PI/(3.0-speedFov));
      }
      if (this.driving) {
        const seat = ND.toWorld(this.car,-.427,-.19);
        return ND.frame([seat.x,ground+1.68,seat.z],yaw,pitch-.075,aspect,Math.PI/(2.91-speedFov));
      }
      if (this.walkCamera) {
        const back = this.world.cameraDistance(p.x,p.z,-fx,-fz,4.35);
        if (back>1.25) {
          const x = p.x-fx*back;
          const z = p.z-fz*back;
          const eye = this.world.inside(x,z) ? 2.22 : 2.73;
          return ND.frame([x,Math.max(ground+eye,this.world.height(x,z)+1.7),z],
            yaw,pitch*.66-.21,aspect,Math.PI/3.31);
        }
      }
      const clearance = this.world.cameraDistance(p.x,p.z,Math.sin(yaw),-Math.cos(yaw),.76);
      const setback = clearance<.69 ? this.world.cameraDistance(p.x,p.z,-Math.sin(yaw),Math.cos(yaw),.73-clearance) : 0;
      return ND.frame([p.x-Math.sin(yaw)*setback,ground+1.66+p.bob,p.z+Math.cos(yaw)*setback],
        yaw,pitch,aspect,Math.PI/3.04);
    }

    updateHUD(quick = false) {
      if (!this.started || this.transit) return;
      this.updateInteraction();
      if (!quick && this.seconds < this.hudAt) return;
      this.hudAt = this.seconds+.16;
      this.updateMouseHint();
      const c = this.career;
      const p = this.player;
      this.world.placeBridger(c.bridgerVisit);
      const goal = this.goal();
      byId('objective-title').textContent = goal.title;
      byId('objective-detail').textContent = goal.detail;
      byId('speedometer').hidden = !this.driving;
      byId('speed').textContent = String(Math.round(Math.abs(this.car.speed)*milesPerHour));
      byId('fuel').textContent = 'Fuel '+Math.round(c.state.tank)+'%';
      byId('fuel').classList.toggle('low-fuel',c.state.tank<18);
      const town = this.geo.townFor(p.x,p.z);
      byId('hud-town').textContent = town.name;
      byId('hud-street').textContent = this.labelForRoad;
      byId('hud-clock').textContent = time(c.state.minute,true)+' · '+
        (!this.driving && this.world.inside(p.x,p.z) ? 'Indoors' : this.weather.label);
      const showing = c.nextShowing;
      const appointment = byId('showing-clock');
      appointment.hidden = !showing;
      if (showing) {
        const {state,file,left,at} = showing;
        const when = state==='covered' ? 'Teammate covering' : state==='missed' ? 'Showing missed · Rebook' : state==='due' ? 'Showing due now' :
          state==='late' ? 'Showing late' : 'Showing in '+left+' min';
        appointment.dataset.state = state;
        if (byId('showing-when').textContent!==when) byId('showing-when').textContent = when;
        if (byId('showing-who').textContent!==file.client) byId('showing-who').textContent = file.client;
      }
      const boost = byId('arcade-status');
      const { star,coffee } = c.state.arcade;
      boost.hidden = !star && !coffee;
      if (!boost.hidden) boost.textContent = (star ? 'Top Producer Star' : 'Caribou Coffee boost')+
        ' · '+Math.ceil(star||coffee)+'s';
      byId('hud-agent').textContent = ND.agents[c.state.agent].name;
      byId('hud-cash').textContent = money(c.state.cash);
      const deg = (Math.round(p.yaw*180/Math.PI)%360+360)%360;
      const heading = ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg/45)%8];
      const route = this.gps;
      const nav=byId('navigation');
      nav.hidden=!this.driving || !route;
      if (!nav.hidden) {
        const next=ND.guidance(route.route,this.car,route.target);
        byId('nav-arrow').textContent=next.arrow;
        byId('nav-step').textContent=next.instruction;
      }
      const warning=byId('road-warning');
      const alert=this.driving && (this.world.roadWarning(this.car) ||
        (this.arcade.snowAhead(this.car,c)?'Snowbank ahead':this.weather.snow?'Snow on the road':''));
      warning.hidden=!alert;
      if (alert && warning.textContent!==alert) warning.textContent=alert;
      byId('heading').textContent = heading+' '+String(deg).padStart(3,'0')+'°'+
        (route ? '  ◆ '+(distance(p,route.target)*ND.MILES).toFixed(1)+' MI' : '');
      if (quick || this.seconds>=(this.minimapAt||0)) {
        this.minimapAt = this.seconds+(this.renderer.low?.40:.24);
        this.maps.draw(byId('minimap'),this.mapView({ x:p.x,z:p.z,zoom:this.driving?4.2:2.45,mini:true }));
      }
    }

    pin(camera) {
      const el = byId('world-pin');
      if (!this.started || this.ui.panel || this.transit) { el.hidden = true; return; }
      const goal = this.goal();
      const target = this.driving && this.gps && distance(this.player,this.gps.target)>40 ? this.gps.target : goal.point;
      if (!target) { el.hidden = true; return; }
      if (target.walkMarker && !this.world.clearPath({x:camera.eye[0],z:camera.eye[2]},target,.09)) {
        el.hidden=true;
        return;
      }
      const d = distance(this.player,target);
      const xy = ND.project(camera,[target.x,(target.y??this.world.height(target.x,target.z))+(target.markerHeight??2.35),target.z]);
      if (!xy || d > 900 || xy[0] < .05 || xy[0] > .95 || xy[1] < .09 || xy[1] > .81) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.classList.toggle('desk-pin',target===this.world.features.office.desk);
      el.style.left = 100*xy[0]+'%';
      el.style.top = 100*xy[1]+'%';
      el.textContent = (target.label || goal.title)+(d>8?' · '+(d<1609?Math.round(d)+' m':(d*ND.MILES).toFixed(1)+' mi'):'');
    }

    visitorTag(camera) {
      for (const tag of this.nameTags.values()) tag.hidden = true;
      const clientTag = byId('visitor-tag');
      clientTag.hidden = true;
      if (this.ui.panel || !this.started || this.transit) return;
      const visitor = this.world.visitor;
      for (const person of visitor ? [...this.world.people,visitor] : this.world.people) {
        if (person.late || person.id===this.player.agent || distance(this.player,person)>105) continue;
        const pos = ND.project(camera,[person.x,person.y+(person.style==='small'?1.68:1.96),person.z]);
        if (!pos || pos.some((v)=>v<.02 || v>.98) || !this.world.canSee(this.player,person)) continue;
        let tag = person===visitor ? clientTag : this.nameTags.get(person.id);
        if (!tag) {
          tag = document.createElement('div');
          tag.className = 'visitor-tag';
          clientTag.parentNode.append(tag);
          this.nameTags.set(person.id,tag);
        }
        const label = person.name+(person===visitor?' · '+person.title:'');
        if (tag.textContent!==label) tag.textContent = label;
        tag.style.left = pos[0]*100+'%';
        tag.style.top = pos[1]*100+'%';
        tag.hidden = false;
      }
    }

    weatherOverlay() {
      const canvas = byId('rain');
      const snow=this.weather.snow;
      if (this.rain < .28 || (!snow && this.weather.label!=='Rain') || (!this.driving && this.world.inside(this.player.x,this.player.z))) {
        canvas.hidden = true;
        return;
      }
      canvas.hidden = false;
      const ratio = this.renderer.low ? .64 : this.renderer.software ? .84 : Math.min(devicePixelRatio||1,1.45);
      const w = Math.round(canvas.clientWidth*ratio);
      const h = Math.round(canvas.clientHeight*ratio);
      if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,w,h);
      if (snow) {
        ctx.fillStyle='rgba(231,243,246,.61)';
        const count = this.renderer.low?39:91;
        for (let i=0;i<count;i++) {
          const y=(i*2689+this.seconds*(75+i%7*13))%h;
          const x=(i*2179+this.seconds*(24+i%9*4)+Math.sin(this.seconds*1.2+i)*12+w)%w;
          ctx.beginPath();
          ctx.arc(x,y,Math.max(.55,(1+i%4*.43)*ratio),0,Math.PI*2);
          ctx.fill();
        }
        return;
      }
      ctx.strokeStyle='rgba(220,234,237,'+(this.rain*.19)+')';
      ctx.lineWidth=.8*ratio;
      ctx.beginPath();
      for (let i=0;i<(this.renderer.low?56:112);i++) {
        const x = (i*6797+this.seconds*55) % w;
        const y = (i*8951+this.seconds*(350+i%7*33)) % h;
        ctx.moveTo(x,y);
        ctx.lineTo(x+4+i%3,y+11+i%6);
      }
      ctx.stroke();
    }

    nearLake(p) {
      if (!this.lakeCheck || distance(p,this.lakeCheck)>210) {
        const reach = 620;
        const water = this.geo.water.area(p.x-reach,p.z-reach,p.x+reach,p.z+reach);
        const nearby = [...water].some((body)=>{
          if (body.moving) return false;
          const [x0,z0,x1,z1] = body.bounds;
          return (x1-x0)*(z1-z0)>75000 && p.x+reach>x0 && p.x-reach<x1 && p.z+reach>z0 && p.z-reach<z1;
        });
        this.lakeCheck = {x:p.x,z:p.z,nearby};
      }
      return this.lakeCheck.nearby;
    }

    headlightBeam(minutes) {
      const hour = minutes%1440/60;
      if (!this.driving || (hour>=7 && hour<18 && this.rain<.25)) return null;
      const front = ND.toWorld(this.car,0,-2.23);
      return {position:[front.x,this.world.height(this.car.x,this.car.z)+.99,front.z],
        forward:angle(this.car.yaw,-.065)};
    }

    loop(timestamp) {
      const dt = Math.min(.15,Math.max(.001,(timestamp-(this.last || timestamp))/1000));
      this.last=timestamp;
      if (document.hidden) { this.graphicsSample=null; requestAnimationFrame((t) => this.loop(t)); return; }
      this.seconds+=dt;
      const draw = this.frameDirty || (!this.ui.panel && timestamp>=this.nextDraw);
      const frameDt = Math.min(.15,(timestamp-(this.lastDraw||timestamp))/1000);
      if (draw && !this.transit) {
        const rate = this.renderer.low ? (this.started?30:16) :
          (this.started && !this.renderer.software ? 60 : 30);
        this.frameDirty = false;
        this.lastDraw = timestamp;
        this.nextDraw = timestamp+(1000/rate-1.5);
      }
      const active=this.playing();
      this.measureGraphics(timestamp,draw,active);
      if (this.tag) {
        if (!this.ui.panel) this.tag.tick(dt,this.keys);
        if (draw) this.tag.draw();
        if (this.tag.finished && !this.ui.panel) this.endTag(true);
        requestAnimationFrame((t) => this.loop(t));
        return;
      }
      if (active) {
        this.career.tickArcade(dt);
        const steps = Math.ceil(dt/(this.driving && Math.abs(this.car.speed)>35 ? .022 : .038));
        for (let i=0;i<steps;i++) {
          if (this.driving) this.moveCar(dt/steps);
          else this.moveFoot(dt/steps);
        }
        this.career.addTime(dt*(this.driving ? .21 : .37));
        this.world.updateTraffic(this.player,dt);
        const wallBump = this.world.updatePeople(this.player,dt);
        if (wallBump && this.seconds>=this.geneTalkAt) {
          this.geneTalkAt=this.seconds+18;
          this.sound.speak(wallBump.id);
          this.ui.notice('Gene · I only want people who are ready to buy a house in the next five minutes.');
        }
        this.world.updateWildlife(this.car,dt,this.driving);
        this.world.updateVisitor(this.career,this.player,this.driving,dt);
        this.showingReminders();
        if (this.gps && distance(this.player,this.routeAt)>130) {
          const route = this.geo.route(this.player,this.gps.target);
          if (route) this.gps.route=route;
          this.routeAt={x:this.player.x,z:this.player.z};
        }
        if (this.seconds>this.autoSaveAt) {
          this.autoSaveAt=this.seconds+7;
          this.save();
        }
      }
      if (this.started && draw) {
        const p = this.player;
        this.sound.update({moving:active,driving:this.driving,rain:this.rain,stride:p.stride,speed:this.car.speed,
          indoors:this.world.inside(p.x,p.z),paved:!!this.geo.nearest(p.x,p.z,4.4)});
      }
      if (!this.transit && draw) {
        const p = this.player;
        this.world.stream(p.x,p.z);
        const minutes = this.started ? this.career.state.minute : 549;
        if (this.started) this.weather=this.career.weather(this.nearLake(p));
        this.rain = mix(this.rain,this.weather.intensity,Math.min(1,frameDt*.85));
        const camera = this.camera(frameDt);
        const onFoot = this.started && !this.driving;
        const castShadows = this.renderer.low ? null : (center) =>
          this.world.drawShadows(center,p,this.car,this.seconds,onFoot);
        const snow = this.weather.snow ? this.rain : 0;
        const mist = this.weather.label==='Lake mist' ? this.rain : 0;
        const room = onFoot ? this.world.interiorAt(p.x,p.z) : null;
        this.renderer.begin(camera,this.seconds,minutes,this.rain-mist*.79-snow*.55,castShadows,{
          world:true,snow,mist,headlights:this.headlightBeam(minutes),room,
        });
        const shown = onFoot && this.walkCamera && distance(p,{x:camera.eye[0],z:camera.eye[2]})>1;
        this.world.draw(camera,p,this.car,this.seconds,shown,this.driving && this.driveCamera===1);
        if (this.started) this.arcade.draw(camera,this.career,this.car,this.seconds,this.driving && this.driveCamera===1);
        this.weatherOverlay();
        if (this.started && !this.ui.panel) this.updateHUD();
        this.pin(camera);
        this.visitorTag(camera);
      }
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  async function boot() {
    const canvas = byId('scene');
    try {
      const renderer = new ND.Renderer(canvas);
      const [geo] = await Promise.all([ND.Geography.open(),renderer.loadMaterials()]);
      new Game(geo,renderer,canvas);
    } catch (error) {
      console.error(error);
      byId('load-status').textContent = 'North Desk couldn’t load the 3D world. Open the game in a browser with WebGL 2 enabled.';
    }
  }

  boot();
})();
