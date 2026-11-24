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
      this.features = Object.fromEntries(sites.map((site) => [site.id, this.makeSite(site)]));
      this.unlocked = new Set();
      this.doors = Object.values(this.features).filter((site) => site.type !== 'office').map((site) => ({
        site, mesh:renderer.upload(Models.lockedDoor(site)),
      }));
      this.people = this.makePeople();
      this.townStops = Object.fromEntries(geo.towns.map((town) => [town.name, this.makeStop(town)]));
      this.fixedMesh = this.makeFeatures();
      this.actorMeshes = new Map();
      this.suv = renderer.upload(Models.suv(color('#536c5d')));
      this.trafficModels = ['#838989','#794b3f','#b9b2a0','#3b4958','#6e705a'].map((paint) =>
        renderer.upload(Models.suv(color(paint), true)));
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
      let approach = toWorld(lot, 0, -lot.d / 2 - 1.6);
      lot.y = geo.height(approach.x, approach.z) + (site.type === 'office' ? .57 : .045);
      lot.entry = { ...approach, y: lot.y, yaw: lot.yaw + Math.PI, label: lot.name, id: lot.id };
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
      const desk = [[-3.7,-1.08],[2.7,-3.24],[-5.9,2.3],[-5.8,-2.6],[1.2,3.67],
        [-3.77,4.09],[4.8,2.48],[5.0,-2.72],[-1.52,-1.01],[5.9,-.54]];
      let i = 0;
      return ND.roster.map((agent) => {
        const lot = this.features[agent.base];
        if (agent.base === 'rapids') {
          const [x,z] = desk[i++];
          return { ...agent, ...toWorld(this.features.office, x, z), y:this.features.office.y,
            yaw:this.features.office.yaw + (z > 0 ? 0 : -.30), town:'Grand Rapids' };
        }
        if (lot) {
          const place = toWorld(lot, agent.id === 'matt' ? 4.2 : -2.65, -lot.d / 2 - 3.2);
          return { ...agent, ...place, y:this.geo.height(place.x,place.z), yaw:lot.yaw, town:lot.town };
        }
        const townName = { nashwauk:'Nashwauk', tower:'Tower' }[agent.base];
        const town = this.geo.towns.find((town) => town.name === townName);
        const stop = this.makeStop(town) || town;
        return { ...agent,x:stop.x,z:stop.z,y:this.geo.height(stop.x,stop.z),yaw:stop.yaw || 0,town:townName };
      });
    }

    makeFeatures() {
      const mesh = new Mesh();
      for (const lot of Object.values(this.features)) {
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
        this.obstacle(lot, nearDoor / 2 - .026, -lot.d / 2 + nearDoor * .46, .055, nearDoor * .92);
        if (lot.type === 'office') {
          this.obstacle(lot, 3.72, -1.93, 2.50, .93);
          this.obstacle(lot, -.1, 3.2, 3.34, 1.22);
          this.obstacle(lot, -3.6, -2.05, 2.1, .76);
        } else {
          this.obstacle(lot, -lot.w / 2 + 1.57, -lot.d / 2 + 1.18, 2.63, .82);
          this.obstacle(lot, lot.w / 2 - 1.49, -lot.d / 2 + .5, 2.61, .64);
          this.obstacle(lot, lot.w / 2 - 2.38, -1.11, 1.37, .84);
        }
        const asphalt = lot.type === 'cabin' ? M.gravel : M.asphalt;
        this.driveway(mesh, lot, asphalt);
      }
      this.bridge(mesh);
      return this.renderer.upload(mesh);
    }

    driveway(mesh, lot, material) {
      const park = lot.parking;
      const road = this.geo.nearest(park.x, park.z, 90, (s) => s.name === lot.road.segment.name) || lot.road;
      const [a,b] = [Math.cos(road.heading) * 2.7, Math.sin(road.heading) * 2.7];
      const p = (x,z) => [x, this.geo.height(x,z) + .086, z];
      mesh.quad(p(road.x-a,road.z-b),p(road.x+a,road.z+b),p(park.x+a,park.z+b),p(park.x-a,park.z-b),
        [.83,.84,.83],material,1.15,3.5);
      const facing = angle(park.yaw);
      const f = (across, along) => p(park.x+a*across+facing[0]*along,park.z+b*across+facing[2]*along);
      mesh.quad(f(-1,4),f(1,4),f(1,-4),f(-1,-4),[.80,.82,.81],material,1.5,2.8);
      if (lot.type === 'office') {
        for (const s of [-.59,.59]) {
          mesh.quad(f(s,-3.1),f(s+.037,-3.1),f(s+.037,3.15),f(s,3.15), white);
        }
      }
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

    inside(x,z) {
      return Object.values(this.features).some((lot) => contains(lot,x,z,-.06));
    }

    height(x, z) {
      if (this.bridgeDeck && contains(this.bridgeDeck,x,z,0)) {
        return Math.max(this.geo.height(x,z),this.bridgeDeck.y);
      }
      const office = this.features.office;
      const [side,front] = local(office,x,z);
      const distance = -office.d/2-front;
      if (Math.abs(side)<1.11 && distance > 0 && distance < 3.14) {
        return Math.max(this.geo.height(x,z),office.y-Math.max(0,distance-2.03)*.56);
      }
      for (const lot of Object.values(this.features)) {
        if (contains(lot, x, z, .5)) return lot.y;
      }
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
      for (const { site } of this.doors) {
        if (this.unlocked.has(site.id) || Math.hypot(site.x-x,site.z-z) > site.d) continue;
        const [px,pz] = local(site,x,z);
        if (Math.abs(px) < .54+radius && Math.abs(pz+site.d/2) < .11+radius) return false;
      }
      if (this.obstacles.at(x,z).some((box) => contains(box,x,z,radius))) return false;
      const tile = this.tiles.get(Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK));
      if (tile?.boxes.some((box) => contains(box,x,z,radius))) return false;
      if (driving) {
        if (Object.values(this.features).some((lot) => contains(lot,x,z,.5))) return false;
        if (this.traffic.some((car) => Math.hypot(x-car.x,z-car.z) < 2.25)) return false;
      }
      return true;
    }

    terrain(mesh, x0, z0, size, steps, background) {
      const n = size / steps;
      const r = rng(Math.floor(x0 * 1327 + z0 * 263));
      const heights = [];
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
          mesh.quad(d,c,b,a,background ? shades[0] : shades[Math.floor(r()*4)],
            rocky ? M.granite : M.grass, n / 4.8,n / 4.8);
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

    drawRoads(mesh, segments, x0, z0, urban) {
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
      this.terrain(mesh,x0,z0,CHUNK,16,false);
      const segments = this.geo.roads.area(x0-11,z0-11,x0+CHUNK+11,z0+CHUNK+11);
      this.drawRoads(mesh,segments,x0,z0,urban);
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
            mesh.at(x,this.geo.height(x,z),z,yaw,() => { shape = Models.house(mesh,random,dense); });
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
          mesh.at(x,y,z,random()*6.28,() => (birch ? Models.birch : Models.pine)(mesh,h,random));
          if (urban || dist < 4500) {
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
    }

    stream(x,z) {
      const at = regionView(x,z);
      const cx = Math.floor(x/BACKDROP);
      const cz = Math.floor(z/BACKDROP);
      const tileId = at.x0 + ',' + at.z0;
      if (tileId !== this.recent) {
        this.recent = tileId;
        const near = [];
        for (let i = -3; i <= 3; i++) {
          for (let j = -3; j <= 3; j++) {
            if (Math.hypot(i,j) > 3.65) continue;
            if (!this.tiles.has(ND.key(at.x0+i,at.z0+j))) near.push([at.x0+i,at.z0+j,i*i+j*j]);
          }
        }
        this.pending = near.sort((a,b) => a[2]-b[2]);
        for (const [id,tile] of this.tiles) {
          if (Math.abs(tile.ix-at.x0) <= 4 && Math.abs(tile.iz-at.z0) <= 4) continue;
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
          if (this.backdrops.has(ND.key(cx+i,cz+j))) continue;
          this.buildBackdrop(cx+i,cz+j);
          break;
        }
      }
    }

    actor(id) {
      if (!this.actorMeshes.has(id)) this.actorMeshes.set(id, this.renderer.upload(Models.person(ND.agents[id])));
      return this.actorMeshes.get(id);
    }

    updateTraffic(player, dt) {
      const s = this.trafficSeed;
      const m = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
      this.traffic = this.traffic.filter((car) => m(car,player)< 355);
      if (this.traffic.length < 7 && s() < dt * 3.5) {
        const roads = [...this.geo.roads.area(player.x-310,player.z-310,player.x+310,player.z+310)]
          .filter((road) => road.type <= 2 && road.length > 15);
        const road = roads[Math.floor(s()*roads.length)];
        if (road && m(player,road.a) > 37 && m(player,road.a) < 300 && !this.traffic.some((car) => m(car,road.a) < 15)) {
          const flip = s() < .5;
          const [from,to] = flip ? [road.b,road.a] : [road.a,road.b];
          this.traffic.push({ x:from.x,z:from.z,from,to,t:0,type:road.type,
            model:Math.floor(s()*this.trafficModels.length),yaw:road.heading+(flip?Math.PI:0),speed:0 });
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
        const target = gap ? [19,14,9.5][car.type] : 0;
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

    draw(camera, player, car, seconds, showPlayer, carView) {
      const render = this.renderer;
      for (const tile of this.backdrops.values()) render.draw(tile.mesh);
      for (const tile of this.tiles.values()) render.draw(tile.mesh);
      for (const tile of this.backdrops.values()) render.draw(tile.water);
      render.draw(this.fixedMesh);
      for (const { site,mesh } of this.doors) {
        if (!this.unlocked.has(site.id) && Math.hypot(site.x-player.x,site.z-player.z) < 240) render.draw(mesh);
      }
      for (const person of this.people) {
        if (person.id === player.agent || Math.hypot(person.x-player.x,person.z-player.z) > 105) continue;
        const d = Math.hypot(person.x-player.x,person.z-player.z);
        const facing = d < 4.5 ? Math.atan2(player.x-person.x,person.z-player.z) : person.yaw;
        render.draw(this.actor(person.id),person.x,person.y+Math.sin(seconds*1.9+person.x)*.007,person.z,facing);
      }
      for (const other of this.traffic) {
        render.draw(this.trafficModels[other.model],other.x,this.height(other.x,other.z)+.13,other.z,other.yaw);
      }
      if (!carView && Math.hypot(car.x-player.x,car.z-player.z) < 340) {
        render.draw(this.suv,car.x,this.height(car.x,car.z)+.13,car.z,car.yaw);
      }
      if (showPlayer) {
        render.draw(this.actor(player.agent),player.x,this.height(player.x,player.z)+player.bob,player.z,player.yaw);
      }
    }
  }

  Object.assign(ND, { World, toWorld, local, MILES, CHUNK });
})();
