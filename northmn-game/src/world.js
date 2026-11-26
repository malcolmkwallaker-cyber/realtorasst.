'use strict';

(() => {
  const ND = globalThis.ND;
  const { Mesh, Models, color, SURFACE: M, clamp, Grid, rng, angle } = ND;
  const CHUNK = 192;
  const BACKDROP = 768;
  const MILES = 1 / 1609.344;
  const stone = color('#d4d0bc');
  const white = color('#e1ddca');
  const yellow = color('#d3b75c');
  const shades = [[.83,.86,.79], [.89,.91,.83], [.86,.90,.78], [.84,.88,.81]];

  const sites = [
    { id:'office', name:'Pemberton North Desk', town:'Grand Rapids', type:'office',
      anchor:[0,0], street:'S Pokegama Ave', side:1, w:15.6, d:10.1, setback:7.8 },
    { id:'ramble', name:'The SW Third rambler', town:'Grand Rapids', type:'home',
      anchor:[-401,346], street:'SW 3rd Ave', side:-1, w:9.3, d:8.1, setback:7 },
    { id:'cabin', name:'White Spruce cabin', town:'Coleraine', type:'cabin',
      anchor:[7507,-4944], street:'White Spruce Ln', side:-1, w:9.9, d:9.2, setback:9 },
    { id:'range', name:'The West Howard fixer', town:'Hibbing', type:'home',
      anchor:[44428,-22461], street:'Howard St', side:-1, w:10.8, d:8.6, setback:8 },
    { id:'hoyt', name:'The Kennedy Drive listing', town:'Hoyt Lakes', type:'home',
      anchor:[104498,-32587], street:'Kennedy Memorial', side:-1, w:10.2, d:8.3, setback:8 },
    { id:'duluth', name:'The Hillside brick home', town:'Duluth', type:'brick',
      anchor:[106797,48179], street:'W 13th St', side:1, w:9.2, d:9.2, setback:6.2 },
  ];

  const toWorld = (lot, x, z) => ({
    x: lot.x + x * Math.cos(lot.yaw) - z * Math.sin(lot.yaw),
    z: lot.z + x * Math.sin(lot.yaw) + z * Math.cos(lot.yaw),
  });

  function local(lot, x, z) {
    const dx = x - lot.x;
    const dz = z - lot.z;
    return [dx * Math.cos(lot.yaw) + dz * Math.sin(lot.yaw), -dx * Math.sin(lot.yaw) + dz * Math.cos(lot.yaw)];
  }

  function contains(b, x, z, radius) {
    const [dx, dz] = local(b, x, z);
    return Math.abs(dx) < b.w / 2 + radius && Math.abs(dz) < b.d / 2 + radius;
  }

  function regionView(x, z) {
    return { x, z, x0: Math.floor(x / CHUNK), z0: Math.floor(z / CHUNK) };
  }

  function inTile(x, z, x0, z0, size) {
    return x >= x0 && x < x0 + size && z >= z0 && z < z0 + size;
  }

  function visibleFrom(camera,x,z,radius) {
    const dx = x-camera.eye[0];
    const dz = z-camera.eye[2];
    const depth = dx*camera.forward[0]+dz*camera.forward[2];
    const side = dx*camera.right[0]+dz*camera.right[2];
    const halfWidth = camera.aspect/camera.zoom;
    return depth >= -radius &&
      Math.abs(side) <= Math.max(0,depth)*halfWidth+radius*(1+halfWidth);
  }

  function clip(ax, az, bx, bz, minX, minZ, maxX, maxZ) {
    const dx = bx - ax;
    const dz = bz - az;
    let lo = 0;
    let hi = 1;
    for (const [p, q] of [[-dx,ax-minX],[dx,maxX-ax],[-dz,az-minZ],[dz,maxZ-az]]) {
      if (!p) {
        if (q < 0) return null;
        continue;
      }
      const t = q / p;
      if (p < 0) lo = Math.max(lo, t);
      else hi = Math.min(hi, t);
      if (lo >= hi) return null;
    }
    return [lo, hi];
  }

  function clipWater(points,x,z,size) {
    let polygon = points;
    for (const [axis,limit,sign] of [[0,x,1],[1,z,1],[0,x+size,-1],[1,z+size,-1]]) {
      if (!polygon.length) break;
      const previous = polygon;
      polygon = [];
      for (let i = 0; i < previous.length; i++) {
        const a = previous[(i+previous.length-1)%previous.length];
        const b = previous[i];
        const from = (a[axis]-limit)*sign >= 0;
        const to = (b[axis]-limit)*sign >= 0;
        if (from !== to) {
          const t = (limit-a[axis])/(b[axis]-a[axis]);
          polygon.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
        }
        if (to) polygon.push(b);
      }
    }
    return polygon;
  }

  function cutFoundation(polygon, lot) {
    const cos = Math.cos(lot.yaw);
    const sin = Math.sin(lot.yaw);
    const w = lot.w/2-.06;
    const d = lot.d/2-.06;
    const corners = [];
    for (const [nx,nz,limit] of [[cos,sin,w],[-cos,-sin,w],[-sin,cos,d],[sin,-cos,d]]) {
      if (!polygon.length) break;
      const inside = [];
      const outside = [];
      const distance = (p) => (p[0]-lot.x)*nx+(p[2]-lot.z)*nz-limit;
      for (let i=0;i<polygon.length;i++) {
        const a = polygon[(i+polygon.length-1)%polygon.length];
        const b = polygon[i];
        const from = distance(a);
        const to = distance(b);
        if ((from>0)!==(to>0)) {
          const t = from/(from-to);
          const edge = a.map((v,j) => v+(b[j]-v)*t);
          inside.push(edge);
          outside.push(edge);
        }
        (to>0 ? outside : inside).push(b);
      }
      if (outside.length>2) corners.push(outside);
      polygon = inside;
    }
    return corners;
  }

  function softShadow(mesh, x, z, rx, rz, height) {
    const p = [x, height(x, z), z];
    for (let i = 0; i < 11; i++) {
      const point = (j) => {
        const a = j / 11 * Math.PI * 2;
        const px = x + Math.cos(a) * rx;
        const pz = z + Math.sin(a) * rz;
        return [px, height(px,pz), pz];
      };
      mesh.triangle(p, point(i + 1), point(i), [.12,.16,.13], M.shade);
    }
  }

  class World {
    constructor(geo, renderer) {
      this.geo = geo;
      this.renderer = renderer;
      this.tiles = new Map();
      this.backdrops = new Map();
      this.obstacles = new Grid(CHUNK);
      this.paving = new Grid(CHUNK);
      this.features = Object.fromEntries(sites.map((site) => [site.id, this.makeSite(site)]));
      this.unlocked = new Set();
      this.doors = Object.values(this.features).filter((site) => site.type !== 'office').map((site) => ({
        site, mesh:renderer.upload(Models.lockedDoor(site)),
      }));
      this.sold = new Set();
      this.soldSigns = Object.values(this.features).filter((site) => site.type !== 'office').map((site) => {
        const depth = -site.d/2-Math.max(2.6,Math.min(4.4,site.setback-2.2));
        const side = site.parking && local(site,site.parking.x,site.parking.z)[0]>0 ? -1 : 1;
        const at = toWorld(site,side*site.w*.34,depth);
        const mesh = new Mesh();
        mesh.at(at.x,this.grade(at.x,at.z),at.z,site.yaw,() => Models.yardSign(mesh));
        return { site, mesh:renderer.upload(mesh) };
      });
      this.people = this.makePeople();
      this.bridger = this.people.find((person) => person.id==='bridger');
      this.bridgerDesk = {x:this.bridger.x,z:this.bridger.z,yaw:this.bridger.yaw};
      this.townStops = Object.fromEntries(geo.towns.map((town) => [town.name, this.makeStop(town)]));
      this.fixedMeshes = this.makeFeatures();
      this.actorMeshes = new Map();
      this.suv = renderer.upload(Models.suv(color('#536c5d')));
      this.cockpit = renderer.upload(Models.cockpit());
      this.trafficModels = ['#838989','#794b3f','#b9b2a0','#3b4958','#6e705a'].map((paint) =>
        renderer.upload(Models.suv(color(paint), true)));
      this.truckMesh=renderer.upload(Models.loggingTruck());
      this.deerMesh=renderer.upload(Models.deer());
      this.deer=null;
      this.wildlifeTimer=6.5;
      this.traffic = [];
      this.trafficSeed = rng(591);
      this.recent = null;
    }

    makeSite(site) {
      const { geo } = this;
      const match = (s) => s.name.includes(site.street);
      const road = geo.nearest(...site.anchor, 380, match) || geo.nearest(...site.anchor, 900);
      if (!road) throw new Error('Missing road near ' + site.name);
      const dist = road.segment.width / 2 + site.d / 2 + site.setback;
      const trySide = (side) => {
        const x = road.x + Math.cos(road.heading) * side * dist;
        const z = road.z + Math.sin(road.heading) * side * dist;
        const yaw = road.heading - side * Math.PI / 2;
        return { ...site, x, z, yaw, road, y: geo.height(x, z) + .11, side };
      };
      let lot = trySide(site.side);
      if (geo.wet(lot.x, lot.z) || geo.nearest(lot.x, lot.z, 9)) lot = trySide(-site.side);
      const approach = toWorld(lot,0,-lot.d/2-1.6);
      const threshold = toWorld(lot,0,-lot.d/2+.42);
      lot.y = site.type==='office' ? geo.height(approach.x,approach.z)+.57 :
        Math.max(this.grade(approach.x,approach.z),this.grade(threshold.x,threshold.z))+.045;
      lot.entry = { ...approach, y: lot.y, yaw: lot.yaw + Math.PI, label: lot.name, id: lot.id,markerHeight:1.65 };
      lot.threshold = threshold;
      if (lot.type === 'office') {
        lot.porch = Models.officePorchLayout(lot.w,lot.d);
        lot.lobby = toWorld(lot,0,-lot.d/2+2.45);
        lot.deskApproach = toWorld(lot,3.69,-2.88);
        lot.desk = { ...toWorld(lot,3.41,-2.17),y:lot.y,label:'Liz’s desk',markerHeight:1.56 };
        lot.expenseFloat = toWorld(lot,-3.34,-1.36);
      }
      let park = toWorld(lot, site.w * .5 + 2.7, -site.d / 2 - 4.4);
      if (geo.nearest(park.x, park.z, 8)?.distance < 3.4 || geo.wet(park.x,park.z)) {
        park = toWorld(lot, -site.w * .5 - 2.7, -site.d / 2 - 3.7);
      }
      lot.parking = { ...park, yaw: road.heading, label: lot.name, id: lot.id };
      return lot;
    }

    makeStop(town) {
      const road = this.geo.nearest(town.x, town.z, 5000, (segment) => segment.a.component === this.geo.network);
      if (!road) return null;
      const right = road.segment.width / 2 + 2.0;
      for (const side of [1, -1, 0]) {
        const x = road.x + Math.cos(road.heading) * right * side;
        const z = road.z + Math.sin(road.heading) * right * side;
        if (!this.geo.wet(x, z)) return { ...town, x, z, yaw: road.heading, label: town.name };
      }
      return { ...town, x:road.x, z:road.z, yaw:road.heading, label:town.name };
    }

    makePeople() {
      const desk = [[-3.7,-1.08],[2.7,-3.24],[-5.9,2.3],[-5.8,-2.6],[2.05,3.2],
        [-3.77,4.09],[4.19,-.75],[5.0,-2.72],[-1.52,-1.01],[5.9,-.54],[-2.92,.18],[-6.32,-3.67]];
      const walking = {
        liz:[[5.74,-.75],[5.74,-3.16],[5.74,-.75],[4.19,-.75]],
        scotty:[[-1.53,.34],[-.78,.26],[-.92,-1.72],[-1.52,-1.01]],
        gene:[[-7.31,-3.67],[-6.07,-3.67]],
      };
      let i = 0;
      return ND.roster.map((agent) => {
        const lot = this.features[agent.base];
        if (agent.base === 'rapids') {
          const [x,z] = desk[i++];
          const office=this.features.office;
          return { ...agent, ...toWorld(office,x,z),y:office.y,
            yaw:office.yaw+(z>0?0:-.30),town:'Grand Rapids',
            path:walking[agent.id]?.map(([x,z])=>toWorld(office,x,z)),leg:0,dwell:agent.id==='liz'?7:3.5,steps:0 };
        }
        if (lot) {
          const place = toWorld(lot, agent.id === 'matt' ? 4.2 : -2.65, -lot.d / 2 - 3.2);
          const end=toWorld(lot,agent.id==='matt'?2.1:-4.25,-lot.d/2-3.44);
          return { ...agent, ...place, y:this.geo.height(place.x,place.z), yaw:lot.yaw, town:lot.town,
            path:[end,place],leg:0,steps:0,dwell:6 };
        }
        const townName = { nashwauk:'Nashwauk', tower:'Tower' }[agent.base];
        const town = this.geo.towns.find((town) => town.name === townName);
        const stop = this.makeStop(town) || town;
        return { ...agent,x:stop.x,z:stop.z,y:this.geo.height(stop.x,stop.z),yaw:stop.yaw || 0,town:townName };
      });
    }

    makeFeatures() {
      const meshes = [];
      for (const lot of Object.values(this.features)) {
        const mesh = new Mesh();
        mesh.at(lot.x, lot.y, lot.z, lot.yaw, () => Models.featured(mesh, lot));
        const nearDoor = lot.type === 'office' ? 1.62 : 1.04;
        const wallSize = (lot.w - nearDoor) / 2;
        for (const side of [-1, 1]) {
          this.obstacle(lot, side * (lot.w / 2 - .11), 0, .22, lot.d);
          this.obstacle(lot, side * (nearDoor / 2 + wallSize / 2), -lot.d / 2 + .09, wallSize, .21);
          const partition = lot.type === 'office' ? 4.6 : lot.w / 2 - 1.04;
          this.obstacle(lot, side * (lot.w / 2 - partition / 2 - .14), lot.type === 'office' ? 1.26 : .63,
            partition, .17);
        }
        this.obstacle(lot, 0, lot.d / 2 - .1, lot.w, .21);
        if (lot.type === 'office') this.obstacle(lot,1.57,-lot.d/2-.08,1.49,.13);
        else this.obstacle(lot, nearDoor / 2 - .026, -lot.d / 2 + nearDoor * .46, .055, nearDoor * .92);
        if (lot.type === 'office') {
          this.obstacle(lot, 3.72, -1.93, 2.50, .93);
          this.obstacle(lot, -.1, 3.2, 3.34, 1.22);
          this.obstacle(lot, -3.6, -2.05, 2.1, .76);
          const {z,end} = lot.porch;
          for (const x of [-2.1,2.1]) this.obstacle(lot,x,z+.18,2.10,.17);
          for (const side of [z+.29,z+1.72]) {
            this.obstacle(lot,(3.35+end)/2,side,end-3.35,.13);
          }
          this.obstacle(lot,-5.70,-lot.d/2-1.0,3.20,1.40);
        } else {
          this.obstacle(lot, -lot.w / 2 + 1.57, -lot.d / 2 + 1.18, 2.63, .82);
          this.obstacle(lot,-lot.w/2+.43,-lot.d/2+1.89,.32,.32);
          this.obstacle(lot, lot.w / 2 - 1.49, -lot.d / 2 + .5, 2.61, .64);
          this.obstacle(lot, lot.w / 2 - 2.38, -1.11, 1.37, .84);
          this.obstacle(lot,lot.w/2-.63,-lot.d/2+1.58,.54,.54);
          const bathX=lot.w/2-2.38, bathZ=lot.d/2-2.32;
          this.obstacle(lot,bathX+.05,bathZ+1.035,.10,2.07);
          this.obstacle(lot,bathX+1.67,bathZ+.05,.96,.10);
          this.obstacle(lot,bathX+.65,bathZ+1.77,.91,.51);
          this.obstacle(lot,bathX+1.60,bathZ+1.66,.53,.71);
        }
        const asphalt = lot.type === 'cabin' ? M.gravel : M.asphalt;
        this.driveway(mesh, lot, asphalt);
        this.yard(mesh,lot);
        meshes.push({x:lot.x,z:lot.z,radius:25,mesh:this.renderer.upload(mesh)});
      }
      const bridge = new Mesh();
      this.bridge(bridge);
      if (this.bridgeDeck) meshes.push({...this.bridgeDeck,radius:60,mesh:this.renderer.upload(bridge)});
      return meshes;
    }

    driveway(mesh, lot, material) {
      const park = lot.parking;
      const road = this.geo.nearest(park.x, park.z, 90, (s) => s.name === lot.road.segment.name) || lot.road;
      const offset = Math.hypot(park.x-road.x,park.z-road.z) || 1;
      const shoulder = Math.max(0,road.segment.width/2-.8)/offset;
      const start = { x:road.x+(park.x-road.x)*shoulder,z:road.z+(park.z-road.z)*shoulder };
      this.pavedStrip(mesh,start,park,4.3,material,.09);
      this.pavedStrip(mesh,toWorld(park,0,3.7),toWorld(park,0,-3.7),6.3,material,.115);
      if (lot.type === 'office') {
        for (const s of [-.59,.59]) {
          const f = (x,z) => {
            const point = toWorld(park,x*2.7,z);
            return [point.x,this.pavingHeight(point.x,point.z)+.012,point.z];
          };
          mesh.quad(f(s,-3.1),f(s+.037,-3.1),f(s+.037,3.15),f(s,3.15), white);
        }
        return;
      }
      const front = toWorld(lot,0,-lot.d/2-2.25);
      const door = { ...toWorld(lot,0,-lot.d/2-.035),height:lot.y };
      const street = toWorld(lot,0,-lot.d/2-lot.setback+1.5);
      const walk = lot.type==='cabin' ? M.gravel : M.concrete;
      this.pavedStrip(mesh,park,front,1.75,walk,.145);
      this.pavedStrip(mesh,street,front,1.75,walk,.13);
      this.pavedStrip(mesh,front,door,1.75,walk,.13);
    }

    yard(mesh,lot) {
      const roadside = -lot.d/2-lot.setback+1.86;
      const post = toWorld(lot,lot.type==='office'?-3.75:-2.22,roadside);
      if (!this.geo.wet(post.x,post.z)) {
        mesh.at(post.x,this.grade(post.x,post.z),post.z,lot.yaw,()=>{
          if (lot.type==='office' || lot.type==='brick') Models.streetMarker(mesh);
          else Models.mailbox(mesh);
        });
        this.obstacle(lot,lot.type==='office'?-3.75:-2.22,roadside,.20,.20);
      }
      if (lot.type==='office') return;
      for (const side of [-1,1]) {
        const plant = toWorld(lot,side*(lot.w/2+.46),lot.d/2-.47);
        mesh.at(plant.x,this.grade(plant.x,plant.z),plant.z,lot.yaw,()=>Models.shrub(mesh));
      }
      if (lot.type==='cabin') return;
      const side = -lot.w/2-.82;
      const ends = [-.52,1.13,2.78].map((z)=>{
        const point = toWorld(lot,side,z);
        return [point.x,this.grade(point.x,point.z),point.z];
      });
      const wood = color('#928773');
      for (const [x,y,z] of ends) mesh.box(x-.053,y-.06,z-.053,.106,1.02,.106,wood,M.oak);
      for (let i=1;i<ends.length;i++) {
        for (const y of [.32,.73]) {
          Models.beam(mesh,ends[i-1].map((v,j)=>v+(j===1?y:0)),ends[i].map((v,j)=>v+(j===1?y:0)),.085,wood);
        }
      }
      this.obstacle(lot,side,1.12,.115,3.38);
    }

    grade(x,z) {
      const geo = this.geo;
      let y = geo.height(x,z);
      for (const step of [CHUNK/12,CHUNK/16]) {
        const left = Math.floor(x/step)*step;
        const top = Math.floor(z/step)*step;
        const u = (x-left)/step;
        const v = (z-top)/step;
        const b = geo.height(left+step,top);
        const d = geo.height(left,top+step);
        const cell = u+v<=1 ? (1-u-v)*geo.height(left,top)+u*b+v*d :
          (u+v-1)*geo.height(left+step,top+step)+(1-v)*b+(1-u)*d;
        y = Math.max(y,cell);
      }
      return y;
    }

    pavedStrip(mesh,start,end,width,material,lift) {
      const dx = end.x-start.x;
      const dz = end.z-start.z;
      const length = Math.hypot(dx,dz);
      if (length<.08) return;
      const yaw = Math.atan2(dx,-dz);
      const strip = { x:(start.x+end.x)/2,z:(start.z+end.z)/2,yaw,w:width,d:length,rows:[] };
      const sections = Math.ceil(length/.68);
      const sideX = Math.cos(yaw)*width/2;
      const sideZ = Math.sin(yaw)*width/2;
      const tint = material===M.concrete ? [.88,.86,.81] : [.83,.84,.83];
      for (let i=0;i<=sections;i++) {
        const t = i/sections;
        const row = [-1,1].map((side) => {
          const x = start.x+t*dx+side*sideX;
          const z = start.z+t*dz+side*sideZ;
          const y = this.grade(x,z)+lift;
          const blend = end.height===undefined ? 0 : clamp((t-.65)/.35,0,1);
          return [x,blend ? Math.max(y-lift+.025,y+(end.height-y)*blend) : y,z];
        });
        if (i) {
          const [a,b] = strip.rows[i-1];
          mesh.quad(a,b,row[1],row[0],tint,material,width/1.9,length/sections/1.9);
        }
        strip.rows.push(row);
      }
      const radius = Math.hypot(width,length)/2+.02;
      this.paving.add(strip,strip.x-radius,strip.z-radius,strip.x+radius,strip.z+radius);
    }

    pavingHeight(x,z) {
      let y = -Infinity;
      for (const strip of this.paving.at(x,z)) {
        const [px,pz] = local(strip,x,z);
        if (Math.abs(px)>strip.w/2 || Math.abs(pz)>strip.d/2) continue;
        const s = (strip.d/2-pz)/strip.d*(strip.rows.length-1);
        const i = Math.min(strip.rows.length-2,Math.floor(s));
        const u = px/strip.w+.5;
        const v = s-i;
        const [[,a],[,b]] = strip.rows[i];
        const [[,d],[,c]] = strip.rows[i+1];
        const height = u>=v ? (1-u)*a+(u-v)*b+v*c : (1-v)*a+u*c+(v-u)*d;
        y = Math.max(y,height);
      }
      return y;
    }

    bridge(mesh) {
      const town = this.geo.towns.find((item) => item.name === 'Aerial Lift Bridge');
      const road = this.geo.nearest(town.x, town.z, 43, (s) => s.name === 'S Lake Ave');
      if (!road) return;
      const metal = color('#566568');
      const deck = this.geo.ground(road.x,road.z,true) + .37;
      this.bridgeDeck = { x:road.x,z:road.z,y:deck,yaw:road.heading,w:14.4,d:102 };
      mesh.at(road.x, deck, road.z, road.heading, () => {
        const drawBeam = (a,b,w) => Models.beam(mesh,a,b,w,metal);
        for (const x of [-7.25,7.25]) {
          for (const z of [-47,47]) {
            mesh.box(x-1.15,-1.5,z-2.25,2.3,2.62,4.5,stone,M.concrete);
            for (const s of [-1,1]) mesh.box(x-.3,0,z+s*1.17-.28,.60,30.5,.58,metal);
            for (let y = 2.6; y < 30; y += 4.3) {
              drawBeam([x,y,z-1.31],[x,y,z+1.31],.27);
              drawBeam([x,y,z-1.28],[x,y+4.22,z+1.28],.21);
              drawBeam([x,y,z+1.28],[x,y+4.22,z-1.28],.21);
            }
          }
          drawBeam([x,2.6,-46],[x,2.6,46],.38);
          drawBeam([x,0,-49],[x,0,49],.40);
          for (let z = -46; z < 46; z += 6.5) {
            drawBeam([x,.19,z],[x,2.57,z+6.5],.21);
            drawBeam([x,2.6,z],[x,.19,z+6.5],.21);
          }
        }
        for (const z of [-47,47]) {
          drawBeam([-7.6,29.7,z],[7.6,29.7,z],.99);
          drawBeam([-7.6,25.0,z],[7.6,29.7,z],.46);
          drawBeam([7.6,25.0,z],[-7.6,29.7,z],.46);
        }
        mesh.floor(-7.2,0,-51,14.4,102,[.78,.82,.82],M.asphalt,2.3);
        for (const side of [-1,1]) {
          mesh.box(side*6.29-.75,-.14,-51,1.50,.23,102,[.82,.83,.81],M.concrete);
          mesh.floor(side*4.92-.04,.022,-50,.08,100,white,-1);
        }
        for (let z=-49; z<49; z+=11) mesh.floor(-.05,.025,z,.10,4.2,yellow,-1);
      });
    }

    obstacle(lot, dx, dz, w, d, bucket = this.obstacles) {
      const p = toWorld(lot, dx, dz);
      const box = { ...p, w, d, yaw: lot.yaw };
      const r = Math.hypot(w, d) / 2 + 2;
      bucket.add(box, p.x - r, p.z - r, p.x + r, p.z + r);
      return box;
    }

    interiorAt(x,z) {
      return Object.values(this.features).find((lot) => contains(lot,x,z,-.06));
    }

    inside(x,z) {
      return Boolean(this.interiorAt(x,z));
    }

    officeDeck(x,z) {
      const office = this.features.office;
      const [px,pz] = local(office,x,z);
      const {z:front,end,steps} = office.porch;
      if (Math.abs(px)<=3.36 && pz>=front && pz<=front+2.24) return office.y;
      if (px>=3.32 && px<=end && pz>=front+.28 && pz<=front+1.73) {
        return office.y-.58*(px-3.32)/(end-3.32);
      }
      for (const [sx,sy,sz,w,h,d] of steps) {
        if (px>=sx && px<=sx+w && pz>=sz && pz<=sz+d) return office.y+sy+h;
      }
      return null;
    }

    height(x, z) {
      if (this.bridgeDeck && contains(this.bridgeDeck,x,z,0)) {
        return Math.max(this.geo.height(x,z),this.bridgeDeck.y);
      }
      const deck = this.officeDeck(x,z);
      if (deck!==null) return deck;
      for (const lot of Object.values(this.features)) {
        if (contains(lot, x, z, .5)) return lot.y;
      }
      const paving = this.pavingHeight(x,z);
      if (Number.isFinite(paving)) return paving;
      return this.geo.ground(x,z,!!this.geo.nearest(x,z,8,(s) => s.width >= 6));
    }

    allowed(x, z, radius, driving) {
      const [x0,z0,x1,z1] = this.geo.bounds;
      if (x < x0 || z < z0 || x > x1 || z > z1) return false;
      const onBridge = this.bridgeDeck && contains(this.bridgeDeck,x,z,-radius);
      if (!onBridge && this.geo.wet(x,z)) {
        const road = this.geo.nearest(x,z,13);
        if (!road || road.distance + radius > road.segment.width / 2 + .55) return false;
      }
      if (this.collides(x,z,radius)) return false;
      if (driving) {
        if (this.officeDeck(x,z)!==null) return false;
        if (Object.values(this.features).some((lot) => contains(lot,x,z,.5))) return false;
        if (this.roadBlocker(x,z)) return false;
      }
      return true;
    }

    collides(x,z,radius) {
      for (const { site } of this.doors) {
        if (this.unlocked.has(site.id) || Math.hypot(site.x-x,site.z-z) > site.d) continue;
        const [px,pz] = local(site,x,z);
        if (Math.abs(px) < .54+radius && Math.abs(pz+site.d/2) < .11+radius) return true;
      }
      if (this.obstacles.at(x,z).some((box) => contains(box,x,z,radius))) return true;
      const margin = radius+10;
      for (let i=Math.floor((x-margin)/CHUNK);i<=Math.floor((x+margin)/CHUNK);i++) {
        for (let j=Math.floor((z-margin)/CHUNK);j<=Math.floor((z+margin)/CHUNK);j++) {
          const tile = this.tiles.get(ND.key(i,j));
          if (tile?.boxes.some((box) => contains(box,x,z,radius))) return true;
        }
      }
      return false;
    }

    cameraDistance(x,z,dx,dz,distance) {
      const steps = Math.ceil(distance/.13);
      for (let i=1;i<=steps;i++) {
        const at = i/steps*distance;
        if (this.collides(x+dx*at,z+dz*at,.23)) return Math.max(0,at-.28);
      }
      return distance;
    }

    clearPath(from,to,radius=.18) {
      const dx=to.x-from.x,dz=to.z-from.z;
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.16));
      for (let i=1;i<=steps;i++) {
        if (this.collides(from.x+dx*i/steps,from.z+dz*i/steps,radius)) return false;
      }
      return true;
    }

    canSee(from,to) {
      const d = Math.hypot(to.x-from.x,to.z-from.z);
      if (d<=.58) return true;
      const limit = d-.48;
      return this.cameraDistance(from.x,from.z,(to.x-from.x)/d,(to.z-from.z)/d,limit)>=limit;
    }

    terrain(mesh, x0, z0, size, steps, background) {
      const n = size / steps;
      const r = rng(Math.floor(x0 * 1327 + z0 * 263));
      const heights = [];
      const nearby = Object.values(this.features).map(lot=>({lot,r:Math.hypot(lot.w,lot.d)/2}))
        .filter(({lot,r})=>lot.x+r>x0 && lot.z+r>z0 && lot.x-r<x0+size && lot.z-r<z0+size);
      for (let j = 0; j <= steps; j++) {
        for (let i = 0; i <= steps; i++) {
          const x = x0 + i * n;
          const z = z0 + j * n;
          const y = this.geo.height(x,z);
          const lake = this.geo.wet(x,z);
          const floor = lake && !background ? Math.min(y, this.geo.waterHeight(lake,x,z) - 1.3) : y;
          heights.push([x, floor - (background ? .45 : .0), z]);
        }
      }
      for (let j = 0; j < steps; j++) {
        for (let i = 0; i < steps; i++) {
          const k = j * (steps + 1) + i;
          const [a,b,c,d] = [heights[k],heights[k+1],heights[k+steps+2],heights[k+steps+1]];
          const rocky = Math.abs(c[1]-a[1]) > n * .44;
          const tint = background ? shades[0] : shades[Math.floor(r()*4)];
          const material = rocky ? M.granite : M.grass;
          const foundations = nearby.filter(({lot,r})=>
            lot.x+r>a[0] && lot.z+r>a[2] && lot.x-r<c[0] && lot.z-r<c[2]);
          if (!foundations.length) {
            mesh.quad(d,c,b,a,tint,material,n/4.8,n/4.8);
            continue;
          }
          for (const face of [[d,c,b],[d,b,a]]) {
            let ground = [face];
            for (const {lot} of foundations) ground = ground.flatMap((part)=>cutFoundation(part,lot));
            for (const part of ground) {
              for (let k=1;k<part.length-1;k++) {
                const corners = [part[0],part[k],part[k+1]];
                mesh.triangle(...corners,tint,material,corners.map(([x,,z])=>[x/4.8,z/4.8]));
              }
            }
          }
        }
      }
    }

    wetland(mesh, x0, z0, size) {
      for (const { vertices:v, body } of this.geo.waterTriangles.area(x0,z0,x0+size,z0+size)) {
        const outline = clipWater([[v[0],v[1]],[v[2],v[3]],[v[4],v[5]]],x0,z0,size);
        for (let i=1;i<outline.length-1;i++) {
          const points = [outline[0],outline[i],outline[i+1]];
          const coords = points.map(([x,z]) => [x/6.7,z/6.7]);
          const [a,b,c] = points.map(([x,z]) => [x,this.geo.waterHeight(body,x,z),z]);
          mesh.triangle(a,b,c,[.93,1.04,1.10],M.water,coords);
        }
      }
    }

    roadStrip(mesh, s, start, end, l, r, tint, material, lift) {
      const tx = s.dx / s.length;
      const tz = s.dz / s.length;
      const pave = (v,w) => {
        const x = s.a.x + tx*v - tz*w;
        const z = s.a.z + tz*v + tx*w;
        return [x,this.geo.ground(x,z,true)+lift,z];
      };
      mesh.quad(pave(start,l),pave(end,l),pave(end,r),pave(start,r), tint,material,
        (end-start)/2.65,(r-l)/2.65);
    }

    drawRoads(mesh, segments, x0, z0, urban, boxes) {
      const poleSlots = new Set();
      for (const s of segments) {
        const range = clip(s.a.x,s.a.z,s.b.x,s.b.z,x0,z0,x0+CHUNK,z0+CHUNK);
        if (!range) continue;
        const [start,end] = range.map((fraction) => fraction * s.length);
        const width = s.width / 2;
        const avenue = s.type < 2;
        const asphalt = s.type === 3 ? M.gravel : M.asphalt;
        for (let p = start; p < end; p += 7) {
          const q = Math.min(p+7, end);
          const y = .118 + (3-s.type) * .013;
          this.roadStrip(mesh,s,p,q,-width,width,avenue ? [.85,.87,.86] : [.93,.93,.89],asphalt,y);
          if (avenue) {
            for (const side of [-1, 1]) {
              this.roadStrip(mesh,s,p,q,side*(width-.41)-.045,side*(width-.41)+.045,white,-1,y+.032);
              this.roadStrip(mesh,s,p,q,side*(width+.73)-.71,side*(width+.73)+.71,[.88,.87,.83],M.gravel,y-.039);
            }
          }
          if (urban && s.type <= 2 && s.name) {
            const t = (p + q) / 2 / s.length;
            const x = s.a.x + s.dx*t;
            const z = s.a.z + s.dz*t;
            for (const side of [-1,1]) {
              const off = side*(width+1.83);
              const hit = this.geo.nearest(x-s.dz/s.length*off,z+s.dx/s.length*off,5,
                (candidate) => candidate !== s && candidate.name !== s.name);
              if (!hit) this.roadStrip(mesh,s,p,q,off-.69,off+.69,[.90,.88,.83],M.concrete,y-.038);
            }
          }
        }
        if (avenue) {
          for (let p = Math.floor(start / 13) * 13; p < end; p += 13) {
            if (p+5 < start) continue;
            this.roadStrip(mesh,s,Math.max(p,start),Math.min(p+4.5,end),-.067,.067,yellow,-1,.212);
          }
        }
        if ((urban || avenue) && end-start > 11) {
          const t = (start+end) / (2*s.length);
          const offset = width + 1.8;
          const x = s.a.x + s.dx*t + s.dz/s.length*offset;
          const z = s.a.z + s.dz*t - s.dx/s.length*offset;
          const slot = Math.floor(x/53) + ',' + Math.floor(z/53);
          if (!poleSlots.has(slot) && !this.geo.wet(x,z) && !this.exclusion(x,z,2)) {
            poleSlots.add(slot);
            boxes.push({x,z,yaw:0,w:.30,d:.30,kind:'utility pole'});
            mesh.at(x,this.geo.height(x,z),z,s.heading-Math.PI/2,() => Models.pole(mesh,urban ? 6.7 : 8.6, !urban));
          }
        }
      }
    }

    exclusion(x,z,pad) {
      return Object.values(this.features).some((lot) =>
        contains(lot,x,z,pad) || Math.hypot(x-lot.parking.x,z-lot.parking.z) < pad + 3.4);
    }

    buildTile(ix, iz) {
      const id = ix + ',' + iz;
      if (this.tiles.has(id)) return this.tiles.get(id);
      const x0 = ix * CHUNK;
      const z0 = iz * CHUNK;
      const center = this.geo.townFor(x0+CHUNK/2,z0+CHUNK/2);
      const dist = Math.hypot(center.x-x0-CHUNK/2,center.z-z0-CHUNK/2);
      const urban = dist < (center.name === 'Duluth' ? 6100 : center.name === 'Grand Rapids' ? 2450 : 1440);
      const dense = urban && (center.name === 'Duluth' || center.name === 'Hibbing') && dist < 2600;
      const mesh = new Mesh();
      const boxes = [];
      const random = rng(ix * 84479 + iz * 58169 + 17);
      const low = this.renderer.low;
      this.terrain(mesh,x0,z0,CHUNK,low?12:16,false);
      const segments = this.geo.roads.area(x0-11,z0-11,x0+CHUNK+11,z0+CHUNK+11);
      this.drawRoads(mesh,segments,x0,z0,urban,boxes);
      if (urban) {
        for (let i = 9; i < CHUNK; i += 22) {
          for (let j = 9; j < CHUNK; j += 23) {
            const x = x0 + i + (random()-.5)*9;
            const z = z0 + j + (random()-.5)*9;
            if (this.exclusion(x,z,9) || this.geo.wet(x,z) || random() < (dense ? .12 : .33)) continue;
            const road = this.geo.nearest(x,z,dense ? 34 : 46);
            if (!road || road.segment.type === 3 || road.distance < road.segment.width/2+8) continue;
            const yaw = Math.atan2(road.x-x, z-road.z);
            let shape;
            mesh.at(x,this.geo.height(x,z),z,yaw,() => { shape = Models.house(mesh,random,dense,low); });
            boxes.push({ x,z,yaw,...shape });
          }
        }
      }
      for (let i = 5; i < CHUNK; i += urban ? 15 : 12) {
        for (let j = 6; j < CHUNK; j += urban ? 15 : 12) {
          const x = x0+i+(random()-.5)*9;
          const z = z0+j+(random()-.5)*9;
          if (random() < (urban ? .62 : .22) || this.exclusion(x,z,3) || this.geo.wet(x,z)) continue;
          const road = this.geo.nearest(x,z,12);
          if (road && road.distance < road.segment.width/2+(urban ? 3.2 : 5)) continue;
          if (boxes.some((box) => contains(box,x,z,.7))) continue;
          const h = (urban ? 4.7 : 5.6) + random()*(urban ? 9 : 12);
          const y = this.geo.height(x,z);
          const birch = random() < (urban ? .36 : .17);
          mesh.at(x,y,z,random()*6.28,() => (birch ? Models.birch : Models.pine)(mesh,h,random,low));
          if (!low && (urban || dist < 4500)) {
            softShadow(mesh,x-h*.22,z+h*.28,h*.16,h*.13,(a,b) => this.geo.height(a,b)+.031);
          }
          boxes.push({ x,z,yaw:0,w:Math.max(.34,h*.055),d:Math.max(.34,h*.055) });
        }
      }
      const tile = { ix,iz,boxes,mesh:this.renderer.upload(mesh) };
      this.tiles.set(id,tile);
      return tile;
    }

    buildBackdrop(ix, iz) {
      const id = ix + ',' + iz;
      if (this.backdrops.has(id)) return;
      const mesh = new Mesh();
      this.terrain(mesh,ix*BACKDROP,iz*BACKDROP,BACKDROP,12,true);
      const first = this.renderer.upload(mesh);
      const water = new Mesh();
      this.wetland(water,ix*BACKDROP,iz*BACKDROP,BACKDROP);
      this.backdrops.set(id,{ ix,iz,mesh:first,water:this.renderer.upload(water) });
    }

    warm(x,z) {
      const at = regionView(x,z);
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) this.buildTile(at.x0+i,at.z0+j);
      }
      const bx = Math.floor(x/BACKDROP);
      const bz = Math.floor(z/BACKDROP);
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) this.buildBackdrop(bx+i,bz+j);
      }
      this.traffic = [];
      this.deer=null;
      this.wildlifeTimer=6.5;
    }

    refreshQuality(x,z) {
      const {traffic,deer,wildlifeTimer}=this;
      for (const tile of this.tiles.values()) this.renderer.release(tile.mesh);
      this.tiles.clear();
      this.recent = null;
      this.warm(x,z);
      Object.assign(this,{traffic,deer,wildlifeTimer});
    }

    stream(x,z) {
      const at = regionView(x,z);
      const cx = Math.floor(x/BACKDROP);
      const cz = Math.floor(z/BACKDROP);
      const tileId = at.x0 + ',' + at.z0;
      if (tileId !== this.recent) {
        this.recent = tileId;
        const reach = this.renderer.low ? 1 : 3;
        const near = [];
        for (let i = -reach; i <= reach; i++) {
          for (let j = -reach; j <= reach; j++) {
            if (Math.hypot(i,j) > 3.65) continue;
            if (!this.tiles.has(ND.key(at.x0+i,at.z0+j))) near.push([at.x0+i,at.z0+j,i*i+j*j]);
          }
        }
        this.pending = near.sort((a,b) => a[2]-b[2]);
        for (const [id,tile] of this.tiles) {
          if (Math.abs(tile.ix-at.x0) <= reach+1 && Math.abs(tile.iz-at.z0) <= reach+1) continue;
          this.renderer.release(tile.mesh);
          this.tiles.delete(id);
        }
        for (const [id,tile] of this.backdrops) {
          if (Math.abs(tile.ix-cx) <= 2 && Math.abs(tile.iz-cz) <= 2) continue;
          this.renderer.release(tile.mesh);
          this.renderer.release(tile.water);
          this.backdrops.delete(id);
        }
      }
      if (this.pending.length) {
        const [i,j] = this.pending.shift();
        this.buildTile(i,j);
      } else {
        for (const [i,j] of [[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1],[-2,0],[2,0],[0,-2],[0,2]]) {
          if (this.renderer.low && (Math.abs(i)>1 || Math.abs(j)>1)) break;
          if (this.backdrops.has(ND.key(cx+i,cz+j))) continue;
          this.buildBackdrop(cx+i,cz+j);
          break;
        }
      }
    }

    actor(id,pose = 0,profile = ND.agents[id]) {
      const key=id+':'+pose;
      if (!this.actorMeshes.has(key)) this.actorMeshes.set(key,this.renderer.upload(Models.person(profile,pose)));
      return this.actorMeshes.get(key);
    }

    walkPoints(lot) {
      return {
        living: ND.toWorld(lot,-lot.w*.27,-lot.d/2+2.03),
        kitchen: ND.toWorld(lot,lot.w*.26,-2.1),
        rear: ND.toWorld(lot,-.30,lot.d/2-1.72),
        roof: ND.toWorld(lot,-1.28,-lot.d/2-3.78),
      };
    }

    walkingRoute(lot,from,target,reach) {
      const step = .40;
      const start = local(lot,from.x,from.z);
      const queue = [{point:from,i:0,j:0,parent:null}];
      const seen = new Set(['0,0']);
      for (let at=0;at<queue.length;at++) {
        const node = queue[at];
        if (Math.hypot(node.point.x-target.x,node.point.z-target.z)<=reach && this.canSee(node.point,target)) {
          const path = [];
          for (let leg=node;leg.parent;leg=leg.parent) path.push(leg.point);
          return path.reverse();
        }
        for (const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const i=node.i+di,j=node.j+dj,key=i+','+j;
          if (seen.has(key)) continue;
          seen.add(key);
          const x=start[0]+i*step,z=start[1]+j*step;
          if (Math.abs(x)>lot.w/2+2 || z < -lot.d/2-4.8 || z>lot.d/2+1) continue;
          const point=toWorld(lot,x,z);
          if (this.collides(point.x,point.z,.24)) continue;
          queue.push({point,i,j,parent:node});
        }
      }
      return [];
    }

    updateVisitor(career, player, driving, dt = 0) {
      const file = career.file;
      const lot = this.features[file.id];
      const { stage } = career.record;
      const showing = ['booked','tour','offer','inspection'].includes(stage);
      if (!showing || driving || Math.hypot(player.x-lot.x,player.z-lot.z)>45) {
        this.visitor = null;
        return;
      }
      const type = stage==='inspection' ? 'inspector' : file.id;
      const profile = ND.visitors[type];
      const indoor = stage!=='booked' && contains(lot,player.x,player.z,-.10);
      if (this.visitor?.id!==profile.id || this.visitor.site!==lot.id || this.visitor.indoor!==indoor) {
        const z = indoor ? -lot.d/2+1.35 : -lot.d/2-1.62;
        const farSide = local(lot,lot.parking.x,lot.parking.z)[0]>0 ? -1 : 1;
        const clear = (p) => this.allowed(p.x,p.z,.23,false) && Math.hypot(player.x-p.x,player.z-p.z)>.58;
        const options = (indoor ? [.91,-.91,.37,-.37] : [2.06,2.46,-2.06,-2.46].map((x)=>x*farSide))
          .map((x)=>toWorld(lot,x,z));
        const position = options.find(clear) || options.find((p)=>this.allowed(p.x,p.z,.23,false));
        if (!position) { this.visitor = null; return; }
        this.visitor = {...profile,...position,site:lot.id,indoor,y:this.height(position.x,position.z),yaw:lot.yaw,
          steps:0,walking:false,trail:[]};
      }
      const visitor = this.visitor;
      visitor.walking = false;
      if (!dt) return;
      if (stage==='tour') {
        const next = file.notes.find((note)=>!career.record.notes.includes(note[0]));
        if (!next) return;
        if (visitor.station!==next[0]) {
          visitor.station = next[0];
          visitor.route = this.walkingRoute(lot,visitor,this.walkPoints(lot)[next[0]],1.05);
        }
        const point = visitor.route[0];
        if (!point) return;
        const dx=point.x-visitor.x,dz=point.z-visitor.z;
        const distance=Math.hypot(dx,dz);
        const step=Math.min(dt*1.9,distance);
        if (distance>.001) {
          visitor.x+=dx*step/distance;
          visitor.z+=dz*step/distance;
          visitor.yaw=Math.atan2(dx,-dz);
          visitor.steps+=step*4.7;
          visitor.y=this.height(visitor.x,visitor.z);
          visitor.walking=true;
        }
        if (step>=distance) visitor.route.shift();
        return;
      }
      if (!visitor.indoor) return;
      const trail = visitor.trail;
      const latest = trail.at(-1);
      if (!latest || Math.hypot(player.x-latest.x,player.z-latest.z)>.48) {
        trail.push({x:player.x,z:player.z});
        if (trail.length>30) trail.shift();
      }
      while (trail.length>1 && Math.hypot(visitor.x-trail[0].x,visitor.z-trail[0].z)<.23) trail.shift();
      if (Math.hypot(player.x-visitor.x,player.z-visitor.z)<1.39) return;
      const target = trail[0];
      const dx = target.x-visitor.x;
      const dz = target.z-visitor.z;
      const span = Math.hypot(dx,dz);
      if (span<.08) return;
      const step = Math.min(span,dt*1.9);
      const x = visitor.x+dx/span*step;
      const z = visitor.z+dz/span*step;
      for (const [px,pz] of [[x,z],[x,visitor.z],[visitor.x,z]]) {
        if (!contains(lot,px,pz,-.14) || !this.allowed(px,pz,.20,false)) continue;
        const moved = Math.hypot(px-visitor.x,pz-visitor.z);
        if (moved<.001) continue;
        visitor.yaw = Math.atan2(px-visitor.x,visitor.z-pz);
        Object.assign(visitor,{x:px,z:pz,y:lot.y,walking:true,steps:visitor.steps+moved*4.7});
        break;
      }
    }

    placeBridger(visit) {
      const bridger = this.bridger;
      if (bridger.site!==visit.site) {
        const lot = this.features[visit.site];
        const point = visit.site==='office' ? this.bridgerDesk :
          { ...toWorld(lot,3.25,-lot.d/2-2.4), yaw:lot.yaw };
        Object.assign(bridger,point,{
          site:visit.site,town:lot.town,y:this.height(point.x,point.z),
        });
      }
      bridger.late = visit.late;
    }

    updatePeople(player,dt) {
      let wallBump;
      for (const person of this.people) {
        person.walking=false;
        const separation=Math.hypot(player.x-person.x,player.z-person.z);
        const gene=person.id==='gene';
        if (!person.path || player.agent===person.id || (!gene && separation<2.65) || separation>38) continue;
        person.dwell-=dt;
        if (person.dwell>0) continue;
        const point=person.path[person.leg];
        const dx=point.x-person.x;
        const dz=point.z-person.z;
        const distance=Math.hypot(dx,dz);
        if (distance<.075) {
          const atWall = gene && person.leg===0;
          person.leg=(person.leg+1)%person.path.length;
          person.dwell=gene ? (atWall?.35:3.6) : 5+person.leg*1.4;
          if (atWall && separation<5.5) wallBump=person;
          continue;
        }
        const pace=Math.min(1,dt*(gene?(person.leg===0?2.65:1.18):.84)/distance);
        if (this.collides(person.x+dx*pace,person.z+dz*pace,.23)) {
          person.leg=(person.leg+1)%person.path.length;
          person.dwell=3;
          continue;
        }
        person.x+=dx*pace;
        person.z+=dz*pace;
        person.yaw=Math.atan2(dx,-dz);
        if (person.base!=='rapids') person.y=this.height(person.x,person.z);
        person.steps+=dt*(gene?10:5.6);
        person.walking=true;
      }
      return wallBump;
    }

    updateTraffic(player, dt) {
      const s = this.trafficSeed;
      const m = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
      this.traffic = this.traffic.filter((car) => m(car,player)< 355);
      if (this.traffic.length < (this.renderer.low?5:7) && s() < dt * 3.5) {
        const roads = [...this.geo.roads.area(player.x-310,player.z-310,player.x+310,player.z+310)]
          .filter((road) => road.type <= 2 && road.length > 15);
        const road = roads[Math.floor(s()*roads.length)];
        if (road && m(player,road.a) > 37 && m(player,road.a) < 300 && !this.traffic.some((car) => m(car,road.a) < 15)) {
          const flip = s() < .5;
          const [from,to] = flip ? [road.b,road.a] : [road.a,road.b];
          const truck=road.type<2 && s()<.30;
          this.traffic.push({ x:from.x,z:from.z,from,to,t:0,type:road.type,
            model:Math.floor(s()*this.trafficModels.length),yaw:road.heading+(flip?Math.PI:0),speed:0,
            truck,kind:truck?'logging truck':'traffic',w:truck?2.6:1.9,d:truck?10.8:4.06 });
        }
      }
      for (const car of this.traffic) {
        const length = Math.hypot(car.to.x-car.from.x,car.to.z-car.from.z);
        const hx = (car.to.x-car.from.x)/length;
        const hz = (car.to.z-car.from.z)/length;
        const ahead = (p) => {
          const dx = p.x-car.x;
          const dz = p.z-car.z;
          const fwd = dx*hx+dz*hz;
          return fwd > 0 && fwd < 12 && Math.abs(dx*hz-dz*hx) < 2.3;
        };
        const gap = !ahead(player) && !this.traffic.some((other) => car !== other && ahead(other));
        const target = gap ? (car.truck?[14,10.5,7]:[19,14,9.5])[car.type] : 0;
        car.speed += (target-car.speed)*Math.min(1,dt*(gap ? 1.5 : 4.5));
        car.t += car.speed*dt;
        const along = Math.min(length,car.t);
        const offset = [3.5,2.3,1.75][car.type];
        car.x = car.from.x + hx*along - hz*offset;
        car.z = car.from.z + hz*along + hx*offset;
        car.yaw = Math.atan2(hx,-hz);
        if (car.t >= length) {
          const edges = car.to.edges.filter((edge) => edge.type < 3 && edge.node !== car.from);
          const next = edges.sort((a,b) => {
            const score = (e) => ((e.node.x-car.to.x)*hx+(e.node.z-car.to.z)*hz)/e.length - e.type*.18;
            return score(b)-score(a);
          })[0];
          car.from = car.to;
          car.to = next?.node || (car.from.edges[0]?.node ?? car.from);
          car.type = Math.min(2,next?.type ?? car.type);
          car.t = 0;
        }
      }
    }

    updateWildlife(car,dt,driving) {
      const deer=this.deer;
      if (deer) {
        deer.age+=dt;
        const progress=clamp((deer.age-1.05)/4.8,0,1);
        deer.x=deer.startX+deer.dx*progress;
        deer.z=deer.startZ+deer.dz*progress;
        if (deer.age>6.2) this.deer=null;
        return;
      }
      if (!driving || car.speed<4.8) return;
      this.wildlifeTimer-=dt;
      if (this.wildlifeTimer>0) return;
      const [dx,,dz]=angle(car.yaw);
      const reach=Math.max(43,car.speed*2.8);
      const road=this.geo.nearest(car.x+dx*reach,car.z+dz*reach,24,(s)=>s.type<2);
      this.wildlifeTimer=road ? 18+this.trafficSeed()*12 : 3;
      if (!road) return;
      const side=this.trafficSeed()<.5?-1:1;
      const width=road.segment.width/2+3.0;
      const nx=Math.cos(road.heading)*side*width;
      const nz=Math.sin(road.heading)*side*width;
      const startX=road.x+nx;
      const startZ=road.z+nz;
      this.deer={x:startX,z:startZ,startX,startZ,dx:-2*nx,dz:-2*nz,
        yaw:Math.atan2(-nx,nz),age:0,kind:'deer crossing'};
    }

    roadBlocker(x,z) {
      if (this.deer && Math.hypot(x-this.deer.x,z-this.deer.z)<1.40) return this.deer;
      return this.traffic.find((car)=>contains(car,x,z,.86));
    }

    roadWarning(car) {
      const [dx,,dz]=angle(car.yaw);
      const ahead=(point)=>{
        const x=point.x-car.x,z=point.z-car.z;
        return x*dx+z*dz>0 && Math.hypot(x,z)<Math.max(52,car.speed*4) && Math.abs(x*dz-z*dx)<12;
      };
      if (this.deer && ahead(this.deer)) return 'Deer crossing ahead';
      if (this.traffic.some((other)=>other.truck && ahead(other))) return 'Logging truck ahead';
      return '';
    }

    draw(camera, player, car, seconds, showPlayer, carView) {
      const render = this.renderer;
      const tileVisible = (tile,size) => visibleFrom(camera,(tile.ix+.5)*size,(tile.iz+.5)*size,size*.72);
      const backdrops = [...this.backdrops.values()].filter((tile) => tileVisible(tile,BACKDROP));
      render.drawDistantTerrain(backdrops);
      for (const tile of this.tiles.values()) if (tileVisible(tile,CHUNK)) render.draw(tile.mesh);
      for (const tile of backdrops) render.draw(tile.water);
      for (const lot of this.fixedMeshes) {
        if (Math.hypot(lot.x-camera.eye[0],lot.z-camera.eye[2]) < 830 &&
            visibleFrom(camera,lot.x,lot.z,lot.radius)) render.draw(lot.mesh);
      }
      for (const { site,mesh } of this.doors) {
        if (!this.unlocked.has(site.id) && Math.hypot(site.x-player.x,site.z-player.z) < 240) render.draw(mesh);
      }
      for (const { site,mesh } of this.soldSigns) {
        if (this.sold.has(site.id) && Math.hypot(site.x-player.x,site.z-player.z) < 320) render.draw(mesh);
      }
      this.drawPeopleAndVehicles(player,car,seconds,showPlayer,carView,
        (x,z,radius) => visibleFrom(camera,x,z,radius));
    }

    drawShadows(center, player, car, seconds, showPlayer) {
      const render = this.renderer;
      const near = (x,z,radius) => Math.hypot(x-center[0],z-center[2])<123+radius;
      for (const tile of this.tiles.values()) {
        if (near((tile.ix+.5)*CHUNK,(tile.iz+.5)*CHUNK,CHUNK*.71)) render.draw(tile.mesh);
      }
      for (const lot of this.fixedMeshes) if (near(lot.x,lot.z,lot.radius)) render.draw(lot.mesh);
      for (const { site,mesh } of this.doors) {
        if (!this.unlocked.has(site.id) && near(site.x,site.z,9)) render.draw(mesh);
      }
      for (const { site,mesh } of this.soldSigns) {
        if (this.sold.has(site.id) && near(site.x,site.z,12)) render.draw(mesh);
      }
      this.drawPeopleAndVehicles(player,car,seconds,showPlayer,false,near);
    }

    drawPeopleAndVehicles(player, car, seconds, showPlayer, carView, visible) {
      const render = this.renderer;
      const people = this.visitor ? [...this.people,this.visitor] : this.people;
      for (const person of people) {
        if (person.late || person.id === player.agent || Math.hypot(person.x-player.x,person.z-player.z) > 105 ||
            !visible(person.x,person.z,1.6)) continue;
        const d = Math.hypot(person.x-player.x,person.z-player.z);
        const facing = !person.walking && d<4.5 && !(person.id==='gene' && person.leg===1) ?
          Math.atan2(player.x-person.x,person.z-player.z) : person.yaw;
        const pose=person.walking ? [0,1,0,-1][Math.floor(person.steps)%4] : 0;
        const lift=person.walking ? .024*Math.abs(Math.sin(person.steps*Math.PI/2)) : Math.sin(seconds*1.9+person.x)*.007;
        render.draw(this.actor(person.id,pose,person),person.x,person.y+lift,person.z,facing);
      }
      for (const other of this.traffic) {
        if (!visible(other.x,other.z,other.truck?7:3)) continue;
        render.draw(other.truck?this.truckMesh:this.trafficModels[other.model],
          other.x,this.height(other.x,other.z)+.13,other.z,other.yaw);
      }
      if (this.deer && visible(this.deer.x,this.deer.z,1.2)) {
        const d=this.deer;
        render.draw(this.deerMesh,d.x,this.height(d.x,d.z)+Math.sin(d.age*14)*.036,d.z,d.yaw);
      }
      if (!carView && Math.hypot(car.x-player.x,car.z-player.z)<340 && visible(car.x,car.z,3)) {
        render.draw(this.suv,car.x,this.height(car.x,car.z)+.13,car.z,car.yaw);
      }
      if (carView) render.draw(this.cockpit,car.x,this.height(car.x,car.z)+.13,car.z,car.yaw);
      if (showPlayer) {
        const pose = player.walking ? [0,1,0,-1][Math.floor(player.stride/1.55)%4] : 0;
        render.draw(this.actor(player.agent,pose),player.x,this.height(player.x,player.z)+player.bob,player.z,player.yaw);
      }
    }
  }

  Object.assign(ND, { World, toWorld, local, visibleFrom, MILES, CHUNK });
})();
