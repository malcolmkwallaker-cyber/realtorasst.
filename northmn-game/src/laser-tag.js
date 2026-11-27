'use strict';

(() => {
  const ND = globalThis.ND;
  const { Mesh, Models, color, SURFACE: M, angle, clamp, frame, project } = ND;
  const secondsPerRound = 45;
  const rivals = [
    { name:'Quinn', x:0, z:-2.5, pace:.74, phase:0, shirt:'#6641a6', hair:'#372d49', trim:'#d4a9ff', style:'short' },
    { name:'Rory', x:-3.45, z:-5.9, pace:1.24, phase:1.2, shirt:'#245f82', hair:'#544132', trim:'#7bdfff', style:'bob' },
    { name:'June', x:4, z:-5.4, pace:1.05, phase:2.3, shirt:'#9e4b74', hair:'#433d62', trim:'#ffb8df', style:'long' },
    { name:'Milo', x:-5.42, z:-10.8, pace:.87, phase:3.7, shirt:'#6a5399', hair:'#795043', trim:'#ffd08a', style:'short' },
    { name:'Frankie', x:5.6, z:-10.6, pace:1.13, phase:5.3, shirt:'#35647a', hair:'#664a61', trim:'#9bf5e4', style:'bob' },
  ];

  function arenaMesh() {
    const mesh = new Mesh();
    const mint = color('#68e3d5');
    const violet = color('#c88dff');
    const wall = color('#24223a');
    const dark = color('#181d2d');
    mesh.box(-10,-.15,-16,20,.15,25,color('#33394a'),M.concrete,3.2);
    mesh.box(-10,0,-16,.22,5,25,wall);
    mesh.box(9.78,0,-16,.22,5,25,wall);
    mesh.box(-10,0,-16,20,5,.22,wall);
    mesh.box(-10,0,8.78,20,5,.22,wall);
    mesh.box(-10,4.93,-16,20,.15,25,dark);
    mesh.box(-9.72,.13,-15.7,19.44,.19,.08,violet,M.lamp);
    mesh.box(-9.72,3.48,-15.7,19.44,.086,.08,mint,M.lamp);
    for (let i=-8; i<=8; i+=2) {
      mesh.box(i-.59,.42,-15.72,1.18,2.66,.13,dark);
      mesh.box(i-.39,.61,-15.54,.78,2.17,.030,color('#514568'),M.granite);
      mesh.box(i-.39,1.63,-15.50,.78,.055,.021,i % 4 ? violet : mint,M.lamp);
    }
    for (const side of [-1,1]) {
      const x = side * 9.70;
      mesh.box(x-.031,.20,-15.7,.062,.060,24.35,mint,M.lamp);
      mesh.box(x-.039,3.43,-15.7,.078,.059,24.35,violet,M.lamp);
      for (let z=-13.9; z<=6.2; z+=4) {
        mesh.box(x-.075,.42,z,.15,2.72,1.35,dark);
        mesh.box(x-.086,.64,z+.22,.17,2.26,.11,mint,M.lamp);
      }
      mesh.floor(side*7.8-.045,.005,-13.5,.09,19.25,color('#53466f'),-1);
    }
    for (let z=-13; z<=7; z+=4) {
      mesh.box(-8.8,4.74,z,17.6,.18,.28,wall);
      mesh.box(-5.92,4.722,z+.01,11.84,.017,.17,color('#d2cafd'),M.lamp);
      mesh.floor(-7.65,.003,z,15.30,.055,color('#483f65'),-1);
    }
    mesh.floor(-.92,.007,6.5,1.84,1.60,color('#54446b'),-1);
    return mesh;
  }

  function arcadeGun() {
    const mesh = new Mesh();
    const shell = color('#6554ed');
    const mint = color('#52dac9');
    const coral = color('#ffb39b');
    mesh.box(-.070,-.120,-.050,.135,.150,.135,shell);
    mesh.box(-.084,-.018,-.269,.168,.092,.370,shell);
    mesh.box(-.070,-.008,-.291,.140,.070,.065,mint,M.lamp);
    mesh.box(-.080,.069,-.176,.160,.030,.211,coral);
    mesh.box(-.063,.074,-.248,.126,.019,.057,mint,M.lamp);
    mesh.box(-.053,-.035,.055,.106,.094,.059,color('#2d2756'));
    return mesh;
  }

  function rivalMesh(rival) {
    const mesh = Models.person(rival);
    const accent = color(rival.trim);
    // Glowing team bands and a floor ring mark every arcade opponent.
    for (const side of [-1,1]) mesh.box(side*.24-.042,1.123,-.093,.084,.076,.173,accent,M.lamp);
    for (let i=0;i<16;i++) {
      const a = i*Math.PI/8;
      const b = (i+.58)*Math.PI/8;
      const point = (radius,rot) => [radius*Math.cos(rot),.014,radius*Math.sin(rot)];
      mesh.quad(point(.53,a),point(.53,b),point(.43,b),point(.43,a),accent,M.lamp);
    }
    return mesh;
  }

  class LaserTag {
    constructor(renderer,sound) {
      this.renderer = renderer;
      this.sound = sound;
      this.arena = renderer.upload(arenaMesh());
      this.gun = renderer.upload(arcadeGun());
      this.rivals = rivals.map((rival) => ({
        ...rival, startX:rival.x,startZ:rival.z,tagged:false,mesh:renderer.upload(rivalMesh(rival)),
      }));
      this.view = { x:0,z:7.2,yaw:0,pitch:-.024 };
      this.elapsed = 0;
      this.tagged = 0;
      this.readyAt = 0;
      this.pulseUntil = 0;
      this.hud = ND.byId('tag-hud');
      this.score = ND.byId('tag-score');
      this.timer = ND.byId('tag-timer');
      this.feedback = ND.byId('tag-feedback');
      this.hud.classList.remove('tag-pulse');
      this.feedback.textContent = 'Tag all five opponents.';
      this.updateHud();
    }

    get finished() {
      return this.tagged === this.rivals.length || this.elapsed >= secondsPerRound;
    }

    look(dx,dy) {
      this.view.yaw += dx*.0028;
      this.view.pitch = clamp(this.view.pitch - dy*.0026,-.59,.57);
    }

    camera() {
      const { x,z,yaw,pitch } = this.view;
      return frame([x,1.57,z],yaw,pitch,this.renderer.resize(),Math.PI/3.08);
    }

    tick(dt,keys) {
      if (this.finished) return;
      this.elapsed = Math.min(secondsPerRound,this.elapsed+dt);
      const view = this.view;
      const turn = Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
      const forward = Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
      const right = Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
      view.yaw += turn*dt*1.9;
      const step = 3.6*dt/(Math.hypot(forward,right)||1);
      const sin = Math.sin(view.yaw);
      const cos = Math.cos(view.yaw);
      view.x = clamp(view.x+(sin*forward+cos*right)*step,-8.8,8.8);
      view.z = clamp(view.z+(-cos*forward+sin*right)*step,-14.6,7.9);
      for (const rival of this.rivals) {
        rival.x = rival.startX + Math.sin(this.elapsed*rival.pace+rival.phase)*.88;
        rival.z = rival.startZ + (Math.cos(this.elapsed*.74+rival.phase)-.5)*.73;
      }
      this.updateHud();
    }

    updateHud() {
      const remaining = String(Math.max(0,Math.ceil(secondsPerRound-this.elapsed)));
      if (this.timer.textContent !== remaining) this.timer.textContent=remaining;
      const score = this.tagged+' / '+this.rivals.length+' tagged';
      if (this.score.textContent !== score) this.score.textContent=score;
      this.hud.classList.toggle('tag-pulse',this.elapsed<this.pulseUntil);
    }

    fire() {
      if (this.finished || this.elapsed < this.readyAt) return;
      this.readyAt = this.elapsed+.25;
      this.pulseUntil = this.elapsed+.11;
      const camera = this.camera();
      let nearest = null;
      let distance = Infinity;
      for (const rival of this.rivals) {
        if (rival.tagged) continue;
        const center = project(camera,[rival.x,1.12,rival.z]);
        const upper = project(camera,[rival.x+camera.right[0]*.43,1.83,rival.z+camera.right[2]*.43]);
        if (!center || !upper) continue;
        if (Math.abs(center[0]-.5) > Math.abs(upper[0]-center[0])+.009 ||
            Math.abs(center[1]-.5) > Math.abs(upper[1]-center[1])+.016) continue;
        const range = Math.hypot(this.view.x-rival.x,this.view.z-rival.z);
        if (range<distance) { nearest=rival; distance=range; }
      }
      if (nearest) {
        nearest.tagged=true;
        this.tagged++;
      }
      this.feedback.textContent = nearest ? nearest.name+' tagged' : 'Miss';
      this.sound.arcade(!!nearest);
      this.updateHud();
    }

    draw() {
      const render = this.renderer;
      const camera = this.camera();
      render.begin(camera,this.elapsed,20*60+29,0);
      render.draw(this.arena);
      for (const rival of this.rivals) {
        if (rival.tagged) continue;
        const facing = Math.atan2(this.view.x-rival.x,rival.z-this.view.z);
        render.draw(rival.mesh,rival.x,Math.sin(this.elapsed*4+rival.phase)*.009,rival.z,facing);
      }
      const front = angle(this.view.yaw,this.view.pitch);
      const rightOffset = Math.min(.33,camera.aspect*.20);
      const aim = camera.eye.map((coord,i) =>
        coord+front[i]*.81+camera.right[i]*rightOffset-camera.up[i]*.255);
      render.draw(this.gun,...aim,this.view.yaw);
    }

    dispose() {
      for (const item of [this.arena,this.gun,...this.rivals.map((rival)=>rival.mesh)]) {
        this.renderer.release(item);
      }
      this.hud.classList.remove('tag-pulse');
    }
  }

  ND.LaserTag = LaserTag;
})();
