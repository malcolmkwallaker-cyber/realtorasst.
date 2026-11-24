'use strict';

(() => {
  const ND = globalThis.ND;
  const { byId, clamp, angle, time, money, button } = ND;
  const controls = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight',
    'ShiftLeft','ShiftRight','Space','KeyE','KeyC','KeyM','KeyP','Escape']);
  const tagMovement = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
  const turnRate = 3.05;
  const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
  const direction = (a,b) => Math.atan2(b.x-a.x,a.z-b.z);
  const mix = (a,b,t) => a+(b-a)*t;

  class Game {
    constructor(geo, renderer, canvas) {
      this.canvas = canvas;
      this.geo = geo;
      this.renderer = renderer;
      this.world = new ND.World(geo,renderer);
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
      this.walkCamera = this.driveCamera = 0;
      this.cameraY = null;
      this.gps = null;
      this.frameDirty = true;
      this.ui.close(false);
      if (saved && this.validPoint(saved.player) && this.validPoint(saved.car)) {
        Object.assign(this.player,{ x:saved.player.x,z:saved.player.z,
          yaw:saved.player.yaw,pitch:clamp(saved.player.pitch??0,-.95,1.05) });
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
      if (saved && !this.driving && this.world.collides(this.player.x,this.player.z,.30)) {
        this.clearFooting();
      }
      if (saved?.destination) this.setGPS(saved.destination);
      byId('title-screen').hidden = true;
      byId('hud').hidden = false;
      this.canvas.focus({preventScroll:true});
      this.save();
      this.updateHUD(true);
      if (!resume) this.ui.notice('WASD move · Mouse or arrows look · E interact · P phone · M map');
    }

    validPoint(point) {
      const [x0,z0,x1,z1] = this.geo.bounds;
      return point && [point.x,point.z,point.yaw].every(Number.isFinite) &&
        point.x >= x0 && point.x <= x1 && point.z >= z0 && point.z <= z1;
    }

    clearFooting() {
      const p=this.player;
      for (const radius of [.22,.45,.76,1.18,1.78]) {
        for (let i=0;i<8;i++) {
          const yaw=i*Math.PI/4;
          const x=p.x+Math.sin(yaw)*radius;
          const z=p.z-Math.cos(yaw)*radius;
          if (this.world.allowed(x,z,.30,false)) {
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
      }
    }

    changed(message,cue) {
      if (message) this.ui.notice(message);
      if (cue) this.sound.progress(cue);
      this.syncDoors();
      this.save();
      this.updateHUD(true);
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
      byId('title-graphics').querySelector('strong').textContent = this.renderer.low ? 'Low' : 'High';
    }

    setGraphics(mode) {
      if (this.renderer.setQuality(mode)) {
        this.world.refreshQuality(this.player.x,this.player.z);
        this.frameDirty = true;
      }
      this.graphicsLabel();
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
        canvas.setPointerCapture(event.pointerId);
        drag = {cx:event.clientX,cy:event.clientY};
        if (event.pointerType === 'mouse' && event.button === 0 && canvas.requestPointerLock) {
          try {
            const lock = canvas.requestPointerLock();
            lock?.catch(() => {});
          } catch {}
        }
      };
      canvas.onpointermove = (event) => {
        if (document.pointerLockElement === canvas || !drag || !this.canLook()) return;
        this.look(event.clientX-drag.cx,event.clientY-drag.cy);
        drag = {cx:event.clientX,cy:event.clientY};
      };
      canvas.onpointercancel = canvas.onpointerup = canvas.onlostpointercapture = () => { drag = null; };
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

    look(dx,dy) {
      if (this.tag) {
        this.tag.look(dx,dy);
        return;
      }
      const p = this.player;
      if (this.driving) {
        this.carLook = clamp((this.carLook || 0) + dx*.0028,-.95,.95);
        p.pitch = clamp(p.pitch - dy*.0026,-.50,.42);
      } else {
        p.yaw += dx*.0028;
        p.pitch = clamp(p.pitch - dy*.0026,-1.08,1.18);
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
      const step = (run?5.8:3.65)*dt/d;
      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      const dx = (sin*forward+cos*right)*step;
      const dz = (-cos*forward+sin*right)*step;
      const oldX = p.x;
      const oldZ = p.z;
      if (dx && this.world.allowed(p.x+dx,p.z,.30,false)) p.x += dx;
      if (dz && this.world.allowed(p.x,p.z+dz,.30,false)) p.z += dz;
      p.stride += Math.hypot(p.x-oldX,p.z-oldZ) * (run ? 4.8 : 5.5);
      p.bob = mix(p.bob,forward||right ? Math.sin(p.stride)*.026 : 0,Math.min(1,dt*13));
    }

    moveCar(dt) {
      const car = this.car;
      const p = this.player;
      const key = (code) => Number(this.keys.has(code));
      const push = Number(key('KeyW')||key('ArrowUp')) - Number(key('KeyS')||key('ArrowDown'));
      const steering = Number(key('KeyD')||key('ArrowRight')) - Number(key('KeyA')||key('ArrowLeft'));
      const road = this.geo.nearest(car.x,car.z,13);
      const paved = road && road.distance < road.segment.width/2+1.2;
      const limit = paved ? [34,27,18,9][road.segment.type] : 9.1;
      const usable = this.career.state.tank > 0;
      const brake = key('Space') || !usable;
      const grip = 1-(this.weather.snow?.48:this.weather.label==='Rain'?.25:0)*this.rain;
      const acceleration = push*(car.speed*push<-.4?12:6.8)*grip;
      car.speed += brake ? -Math.sign(car.speed)*Math.min(Math.abs(car.speed),dt*17*grip) :
        push ? acceleration*dt : -car.speed*Math.min(1,dt*.9);
      car.speed = clamp(car.speed,-7.4,Math.max(limit,car.speed-dt*6));
      car.yaw += steering * Math.sign(car.speed) * Math.min(1,Math.abs(car.speed)/2) * dt *
        (1.60-Math.min(.93,Math.abs(car.speed)*.027))*grip;
      const [hx,,hz] = angle(car.yaw);
      const dx = hx * car.speed * dt;
      const dz = hz * car.speed * dt;
      const move = Math.hypot(dx,dz);
      if (move) {
        const [x,z] = [car.x+dx,car.z+dz];
        const nose = Math.sign(car.speed)*1.65;
        if (this.world.allowed(x,z,.81,true) && this.world.allowed(x+hx*nose,z+hz*nose,.74,true)) {
          car.x = x;
          car.z = z;
          this.career.drive(move);
        } else {
          car.speed = 0;
          const obstacle=this.world.roadBlocker(x+hx*nose,z+hz*nose) || this.world.roadBlocker(x,z);
          if (obstacle && !obstacle.stopped) {
            obstacle.stopped=true;
            this.career.day.roadNotes++;
            this.ui.notice(obstacle.kind==='deer crossing'?'Stopped for a deer crossing.':'Stopped for '+obstacle.kind+' ahead.');
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

    findExit(car) {
      for (const [dx,dz] of [[2.75,0],[-2.75,0],[0,3.29],[0,-3.29],[3.5,1.3],[-3.5,1.3]]) {
        const p = ND.toWorld(car,dx,dz);
        if (this.world.allowed(p.x,p.z,.25,false)) return p;
      }
      return null;
    }

    exitCar() {
      if (Math.abs(this.car.speed) > 1.9) {
        this.ui.notice('Stop the SUV before getting out.');
        return;
      }
      const outside = this.findExit(this.car);
      if (!outside) { this.ui.notice('Move the SUV to a clear spot.'); return; }
      this.driving = false;
      this.car.speed = 0;
      Object.assign(this.player,{...outside,yaw:this.car.yaw,pitch:0});
      this.cameraY = null;
      this.changed();
    }

    returnToCar() {
      if (this.driving) return;
      const walk = distance(this.player,this.car);
      if (walk < 3.3) return;
      this.world.warm(this.car.x,this.car.z);
      const outside = this.findExit(this.car);
      if (!outside) {
        this.enterCar();
        return;
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
      const focus = lot.type === 'office' ? lot.desk : ND.toWorld(lot,-1.6,.18);
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
      return {
        living: ND.toWorld(lot,-lot.w*.27,-lot.d*.28),
        kitchen: ND.toWorld(lot,lot.w*.26,-2.1),
        rear: ND.toWorld(lot,-.30,lot.d*.34),
        roof: ND.toWorld(lot,-1.28,-lot.d/2-3.78),
      };
    }

    nearby() {
      if (this.driving) return { label:'Exit SUV',play:() => this.exitCar() };
      const g = this;
      const p = this.player;
      const c = this.career;
      const r = c.record;
      const s = this.world.features[c.file.id];
      const o = this.world.features.office;
      const [ox,oz] = ND.local(o,p.x,p.z);
      const inOffice = Math.abs(ox)<o.w/2 && Math.abs(oz)<o.d/2;
      const [sx,sz] = ND.local(s,p.x,p.z);
      const inListing = Math.abs(sx)<s.w/2 && Math.abs(sz)<s.d/2;
      const stage = r.stage;
      const picks = [];
      const add = (point,radius,label,play,priority=0) => {
        const d = distance(point,p);
        if (d <= radius) picks.push({label,play,score:d+priority});
      };
      if (inOffice) {
        const title = { lead:c.file.side==='seller'?'Review the listing file':'Review the buyer file',
          title:'Review title and financing',sign:'Sign at the closing table' }[stage];
        if (title) {
          add(o.deskApproach,4.4,title,() => this.ui.desk(),-2.2);
        }
        if (p.agent==='brother-malcolm') {
          add(o.expenseFloat,1.9,'Check the expense envelope',() => this.ui.brotherCash());
        }
        add(o.threshold,1.75,'Exit North Desk',() => {
          const outside = ND.toWorld(o,0,-o.d/2-3.44);
          this.transitionDoor(outside,o.yaw);
        });
      } else {
        add(o.entry,4.7,'Enter North Desk',() => this.enterBuilding(o),-.6);
      }
      if (stage === 'booked' || (stage === 'schedule' && !r.unlocked)) {
        add(s.entry,4.8,'Check property lockbox',() => this.ui.lockbox(),-2.3);
      }
      if (stage === 'tour') {
        const points = this.walkPoints(s);
        const remaining=c.file.notes.filter((note)=>!r.notes.includes(note[0]));
        if (!inListing && remaining.some((note)=>note[0]!=='roof')) {
          add(s.entry,5,'Enter '+s.name,() => this.enterBuilding(s),-2);
        }
        if (inListing) {
          add(s.threshold,1.5,'Step outside',() => this.transitionDoor(ND.toWorld(s,0,-s.d/2-2.62),s.yaw));
        }
        for (const note of remaining) {
          if (inListing===(note[0]!=='roof')) {
            add(points[note[0]],note[0]==='roof'?3.25:2.9,'Inspect '+note[1].toLowerCase(),() => this.ui.observation(note),-2.6);
          }
        }
      }
      if (stage === 'inspection') add(s.entry,5.2,'Meet the inspector',() => this.ui.inspection(),-3);
      if (this.nearCar(4.5)) add(this.car,4.5,'Enter SUV',() => this.enterCar(),-.1);
      for (const person of this.world.people) {
        if (person.id === p.agent) continue;
        add(person,2.3,'Talk to '+person.short,() => g.ui.person(person.id,false),.6);
      }
      picks.sort((a,b)=>a.score-b.score);
      return picks[0] || null;
    }

    interact() {
      if (!this.playing()) return;
      this.nearby()?.play();
    }

    goal() {
      const p = this.player;
      const goal = this.career.goal(this.world);
      const site = this.world.features[this.career.file.id];
      const office = this.world.features.office;
      const [x,z] = ND.local(office,p.x,p.z);
      const stage = this.career.record.stage;
      if (['lead','title','sign'].includes(stage) && Math.abs(x)<office.w/2 && Math.abs(z)<office.d/2) {
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
        if (note) return {...goal,point:{...points[note[0]],y:site.y,label:note[1],markerHeight:1.58}};
        if (indoors && remaining.some((n)=>n[0]==='roof')) {
          return {...goal,point:{...site.threshold,y:site.y,label:'Exit for the roof view',markerHeight:1.78}};
        }
      }
      return goal;
    }

    book(tomorrow) {
      const id = this.career.file.id;
      const site = this.world.features[id];
      const road = this.geo.route(this.car,site.parking);
      this.career.book(this.career.driveMinutes((road?.meters||0)*ND.MILES),tomorrow);
      this.setGPS(id);
      this.changed('Showing booked for '+time(this.career.record.showAt,true)+'.','booking');
      this.ui.phone('deal');
    }

    setGPS(id, openMap = false) {
      const site = this.world.features[id];
      const target = site ? site.parking : this.world.townStops[id];
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
      const { id,target } = this.gps;
      const route = this.geo.route(this.car,target);
      if (!route) { this.ui.notice('The GPS could not find a route from your SUV.'); return; }
      const miles = route.meters * ND.MILES;
      if (miles*.36 >= this.career.state.tank) {
        this.ui.notice('There isn’t enough fuel for this drive. Arrange fuel from your phone ledger.');
        return;
      }
      this.transit = true;
      this.ui.close(false);
      this.keys.clear();
      byId('transit-destination').textContent = target.label;
      byId('transit-miles').textContent = miles.toFixed(1)+' mi · '+Math.round(this.career.driveMinutes(miles))+' min';
      byId('transit').hidden = false;
      setTimeout(() => {
        this.career.drive(route.meters,true);
        this.world.warm(target.x,target.z);
        let position = target;
        if (!this.world.allowed(target.x,target.z,.85,true)) {
          position = { ...target,x:route.end.x,z:route.end.z,yaw:route.end.heading };
        }
        this.car={ ...position,speed:0 };
        this.enterCar();
        this.clearRoute();
        this.transit = false;
        byId('transit').hidden = true;
        this.exitCar();
        this.changed('Arrived · '+target.label+'.');
        if (this.world.features[id]) {
          const entry = this.world.features[id].entry;
          this.player.yaw = direction(this.player,entry);
        }
        this.canvas.focus({preventScroll:true});
      },1750);
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
      if (this.driving && this.driveCamera === 0) {
        const back = this.world.cameraDistance(p.x,p.z,-fx,-fz,7.65+Math.min(2.4,Math.abs(this.car.speed)*.083));
        const x = p.x-fx*back;
        const z = p.z-fz*back;
        const y = Math.max(this.world.height(x,z)+1.6,ground+3.62);
        return ND.frame([x,y,z],yaw,-.22+pitch*.49,aspect,Math.PI/3.0);
      }
      if (this.driving) {
        return ND.frame([p.x+fx*.54,ground+1.76,p.z+fz*.54],yaw,pitch-.073,aspect,Math.PI/3.09);
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
      return ND.frame([p.x,ground+1.66+p.bob,p.z],yaw,pitch,aspect,Math.PI/3.04);
    }

    updateHUD(quick = false) {
      if (!this.started || this.transit) return;
      if (!quick && this.seconds < this.hudAt) return;
      this.hudAt = this.seconds+.16;
      const c = this.career;
      const p = this.player;
      const active = this.nearby();
      const el = byId('interact');
      el.hidden = !active;
      if (active) el.querySelector('span').textContent = active.label;
      const goal = this.goal();
      byId('objective-title').textContent = goal.title;
      byId('objective-detail').textContent = goal.detail;
      byId('speedometer').hidden = !this.driving;
      byId('speed').textContent = String(Math.round(Math.abs(this.car.speed)*2.23694));
      byId('fuel').textContent = 'Fuel '+Math.round(c.state.tank)+'%';
      byId('fuel').classList.toggle('low-fuel',c.state.tank<18);
      const town = this.geo.townFor(p.x,p.z);
      byId('hud-town').textContent = town.name;
      byId('hud-street').textContent = this.labelForRoad;
      byId('hud-clock').textContent = time(c.state.minute,true)+' · '+this.weather.label;
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
      const alert=this.driving && (this.world.roadWarning(this.car) || (this.weather.snow?'Snow on the road':''));
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

    weatherOverlay() {
      const canvas = byId('rain');
      const snow=this.weather.snow;
      if (this.rain < .28 || (!snow && this.weather.label!=='Rain') || (!this.driving && this.world.inside(this.player.x,this.player.z))) {
        canvas.hidden = true;
        return;
      }
      canvas.hidden = false;
      const ratio = this.renderer.low ? .64 : Math.min(devicePixelRatio||1,1.45);
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

    loop(timestamp) {
      const dt = Math.min(.15,Math.max(.001,(timestamp-(this.last || timestamp))/1000));
      this.last=timestamp;
      if (document.hidden) { requestAnimationFrame((t) => this.loop(t)); return; }
      this.seconds+=dt;
      const draw = this.frameDirty || (!this.ui.panel && timestamp>=this.nextDraw);
      const frameDt = Math.min(.15,(timestamp-(this.lastDraw||timestamp))/1000);
      if (draw && !this.transit) {
        const rate = this.renderer.low ? (this.started?30:16) : (this.started?60:30);
        this.frameDirty = false;
        this.lastDraw = timestamp;
        this.nextDraw = timestamp+(1000/rate-1.5);
      }
      if (this.tag) {
        if (!this.ui.panel) this.tag.tick(dt,this.keys);
        if (draw) this.tag.draw();
        if (this.tag.finished && !this.ui.panel) this.endTag(true);
        requestAnimationFrame((t) => this.loop(t));
        return;
      }
      const active = this.playing();
      if (active) {
        const steps = Math.ceil(dt/.038);
        for (let i=0;i<steps;i++) {
          if (this.driving) this.moveCar(dt/steps);
          else this.moveFoot(dt/steps);
        }
        this.career.addTime(dt*(this.driving ? .21 : .37));
        this.world.updateTraffic(this.player,dt);
        this.world.updatePeople(this.player,dt);
        this.world.updateWildlife(this.car,dt,this.driving);
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
        const nearSuperior = p.x>97000 && p.z>42500;
        if (this.started) this.weather=this.career.weather(nearSuperior);
        this.rain = mix(this.rain,this.weather.intensity,Math.min(1,frameDt*.85));
        const camera = this.camera(frameDt);
        this.renderer.begin(camera,this.seconds,minutes,this.rain);
        const shown = this.started && !this.driving && this.walkCamera && distance(p,{x:camera.eye[0],z:camera.eye[2]})>1;
        this.world.draw(camera,p,this.car,this.seconds,shown,this.driving && this.driveCamera===1);
        this.weatherOverlay();
        if (this.started && !this.ui.panel) this.updateHUD();
        this.pin(camera);
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
