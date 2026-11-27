'use strict';

(() => {
  const ND = globalThis.ND;
  const { Mesh, color, SURFACE: M, toWorld, visibleFrom } = ND;
  const destinations = ['Hibbing', 'Virginia', 'Canal Park'];
  const shortcutMinutes = 4;
  const roads = [
    { id:'coin-run-169', label:'US 169 coin run', town:'Grand Rapids', name:'US Hwy 169',
      anchor:[1.25,332.5], coinStart:24, extras:[['coffee',12]] },
    { id:'coin-run-53', label:'US 53 coin run', town:'Virginia', name:'US Hwy 53',
      anchor:[74455.5,-31572.5], coinStart:20, extras:[['star',96],['snow',130]] },
  ];
  const cream = color('#fff0c9');
  const gold = color('#ffca59');
  const mint = color('#a3f8d5');
  const teal = color('#195859');

  function outline(count, radius, inner = radius) {
    return Array.from({length:count}, (_,i) => {
      const a = Math.PI/2 + Math.PI*2*i/count;
      const r = i%2 ? inner : radius;
      return [r*Math.cos(a),r*Math.sin(a)];
    });
  }

  function token(mesh, points, depth, face, edge, material = -1) {
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i+1)%points.length];
      mesh.triangle([0,0,-depth],[...b,-depth],[...a,-depth],face,material);
      mesh.triangle([0,0,depth],[...a,depth],[...b,depth],face,material);
      mesh.quad([...a,-depth],[...b,-depth],[...b,depth],[...a,depth],edge);
    }
    return mesh;
  }

  function mysteryBlock() {
    const mesh = new Mesh();
    const shape = [[.34,.55],[-.34,.55],[-.58,.31],[-.58,-.31],
      [-.34,-.55],[.34,-.55],[.58,-.31],[.58,.31]];
    token(mesh,shape,.18,mint,teal);
    token(mesh,shape.map((p) => p.map((v) => v*.83)),.20,teal,teal);
    const strokes = [[-.18,.21,.34,.07],[-.18,.10,.07,.13],[.10,.07,.07,.16],
      [-.04,.02,.18,.07],[-.04,-.12,.07,.18],[-.04,-.28,.07,.08]];
    for (const yaw of [0,Math.PI]) {
      mesh.at(0,0,0,yaw, (face) => {
        for (const [x,y,w,h] of strokes) face.box(x,y,-.228,w,h,.026,cream,M.lamp);
      });
    }
    return mesh;
  }

  function coin() {
    const mesh = new Mesh();
    const bronze = color('#a96e2c');
    token(mesh,outline(16,.36),.065,gold,bronze,M.lamp);
    token(mesh,outline(16,.265),.072,color('#f1a849'),bronze);
    token(mesh,outline(4,.146),.082,cream,gold,M.lamp);
    return mesh;
  }

  function fishingShack() {
    const mesh = new Mesh();
    const wood = color('#726552');
    const metal = color('#374143');
    mesh.box(-1.32,.04,-1.39,.16,.14,2.78,metal);
    mesh.box(1.16,.04,-1.39,.16,.14,2.78,metal);
    mesh.box(-1.24,.15,-1.3,2.48,2.28,2.6,wood,M.cedar);
    mesh.box(-1.38,2.43,-1.45,2.76,.15,2.9,metal,M.shingles);
    mesh.box(-.66,.15,-1.36,1.32,2.05,.14,teal);
    mesh.box(.47,1.17,-1.4,.10,.19,.055,cream);
    for (const side of [-1,1]) {
      mesh.box(side*.66-.035,.21,-1.405,.07,1.98,.06,mint,M.lamp);
    }
    mesh.box(-.69,2.17,-1.405,1.38,.07,.06,mint,M.lamp);
    mesh.box(.81,1.29,-1.355,.25,.43,.06,mint,M.lamp);
    mesh.box(-.77,.05,-1.83,1.54,.13,.51,wood,M.cedar);
    return mesh;
  }

  function snowbank() {
    const mesh = new Mesh();
    const snow = color('#ecf1ed');
    mesh.ellipsoid(0,.1,0,1.78,.48,1.15,snow,-1,10,4);
    mesh.ellipsoid(1.11,.05,.38,.86,.30,.73,snow,-1,8,4);
    return mesh;
  }

  function starLights() {
    const mesh = new Mesh();
    for (const side of [-1,1]) {
      mesh.box(side*1.04-.035,.61,-1.98,.07,.085,3.96,gold,M.lamp);
      mesh.box(side*.74-.05,1.77,-.72,.10,.06,2,gold,M.lamp);
    }
    mesh.box(-.84,.63,-2.33,1.68,.08,.09,gold,M.lamp);
    mesh.box(-.84,.63,2.26,1.68,.08,.09,gold,M.lamp);
    return mesh;
  }

  function lanePoint(segment, meters, offset) {
    const {a,dx,dz,heading,length} = segment;
    return {
      x:a.x+dx*meters/length+Math.cos(heading)*offset,
      z:a.z+dz*meters/length+Math.sin(heading)*offset,
      yaw:heading,
    };
  }

  class Arcade {
    constructor(world) {
      this.world = world;
      const renderer = world.renderer;
      const question = renderer.upload(mysteryBlock());
      this.meshes = {
        coffee:question, approval:question, septic:question,
        coin:renderer.upload(coin()),
        star:renderer.upload(token(new Mesh(),outline(10,.75,.36),.13,gold,color('#b67328'),M.lamp)),
        snow:renderer.upload(snowbank()),
        shack:renderer.upload(fishingShack()),
      };
      this.lights = renderer.upload(starLights());
      const office = world.features.office;
      const shack = { ...toWorld(office,-6.7,-8.9),yaw:office.yaw+Math.PI/2 };
      world.obstacle(shack,0,0,2.52,2.64);
      this.shackDoor = toWorld(shack,0,-1.92);
      this.shack = { ...shack,y:world.height(shack.x,shack.z),kind:'shack' };
      this.rooms = [['ramble','approval'],['cabin','septic']].map(([site,kind]) => {
        const lot = world.features[site];
        return { ...toWorld(lot,1.63,1.70),id:site+'-'+kind,site,kind,y:lot.y+1.37 };
      });
      this.road = [];
      this.stops = {};
      for (const road of roads) {
        const last = Math.max(road.coinStart+50,...road.extras.map(([,meters]) => meters));
        const hit = world.geo.nearest(...road.anchor,10, (s) => s.name===road.name && s.length>last+5);
        if (!hit) continue;
        const { segment } = hit;
        this.stops[road.id] = {
          ...lanePoint(segment,3,segment.width/2+.15), id:road.id,label:road.label,town:road.town,
        };
        const extras = road.extras.map(([kind,meters]) => [kind,meters,kind]);
        const coins = Array.from({length:6}, (_,i) => ['coin',road.coinStart+i*10,'coin-'+i]);
        for (const [kind,meters,key] of [...extras,...coins]) {
          const p = lanePoint(segment,meters,segment.width/4);
          const hover = { coin:1.24, coffee:1.64, star:1.62, snow:.06 }[kind];
          this.road.push({ ...p,kind,id:road.id+'-'+key,y:world.height(p.x,p.z)+hover });
        }
      }
      this.drift = this.road.find((item) => item.kind==='snow');
      this.items = [this.shack,...this.rooms,...this.road];
    }

    roomAt(player, career) {
      return this.rooms.find((item) => this.available(item,career) &&
        Math.hypot(player.x-item.x,player.z-item.z)<1.5);
    }

    roadAt(car, career) {
      return this.road.find((item) => Math.hypot(car.x-item.x,car.z-item.z)<2.55 && this.available(item,career));
    }

    available(item, career) {
      if (item.kind==='septic' && ['title','sign','closed'].includes(career.state.files.cabin.stage)) return false;
      return !career.hasPrize(item.id) && (!item.site || this.world.unlocked.has(item.site));
    }

    snowAhead(car, career) {
      const drift = this.drift;
      if (!drift || career.hasPrize(drift.id) || career.state.arcade.star>0) return false;
      const [x,z] = ND.local(car,drift.x,drift.z);
      return Math.abs(x)<5 && z<0 && z>-39;
    }

    draw(camera, career, car, seconds, carView) {
      const renderer = this.world.renderer;
      for (const item of this.items) {
        const fixed = item.kind==='shack' || item.kind==='snow';
        if (Math.hypot(item.x-camera.eye[0],item.z-camera.eye[2]) > 95 ||
            !visibleFrom(camera,item.x,item.z,fixed?2.3:1.1) ||
            (item.id && !this.available(item,career))) continue;
        const spin = item.kind==='coin' ? 3.7 : 1.35;
        const bob = fixed ? 0 : Math.sin(seconds*2.5+item.x*.12)*.11;
        const yaw = fixed ? item.yaw : seconds*spin+item.z*.13;
        renderer.draw(this.meshes[item.kind],item.x,item.y+bob,item.z,yaw);
      }
      if (!carView && career.state.arcade.star>0 &&
          Math.hypot(car.x-camera.eye[0],car.z-camera.eye[2])<100 && visibleFrom(camera,car.x,car.z,3)) {
        renderer.draw(this.lights,car.x,this.world.height(car.x,car.z)+.13,car.z,car.yaw);
      }
    }
  }

  Object.assign(ND,{ Arcade, arcadeDestinations:destinations, shortcutMinutes });
})();
