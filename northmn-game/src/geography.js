'use strict';

(() => {
  const ND = globalThis.ND = globalThis.ND || {};
  const CELL = 256;
  const WATER_CELL = 1536;
  const widths = [13, 9, 7, 4.5];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const key = (x, z) => x + ',' + z;

  class Grid {
    constructor(size) {
      this.size = size;
      this.cells = new Map();
    }

    add(value, x0, z0, x1, z1) {
      const s = this.size;
      for (let x = Math.floor(x0 / s); x <= Math.floor(x1 / s); x++) {
        for (let z = Math.floor(z0 / s); z <= Math.floor(z1 / s); z++) {
          const id = key(x, z);
          if (!this.cells.has(id)) this.cells.set(id, []);
          this.cells.get(id).push(value);
        }
      }
    }

    at(x, z) {
      return this.cells.get(key(Math.floor(x / this.size), Math.floor(z / this.size))) || [];
    }

    area(x0, z0, x1, z1) {
      const values = new Set();
      for (let x = Math.floor(x0 / this.size); x <= Math.floor(x1 / this.size); x++) {
        for (let z = Math.floor(z0 / this.size); z <= Math.floor(z1 / this.size); z++) {
          for (const value of this.cells.get(key(x, z)) || []) values.add(value);
        }
      }
      return values;
    }
  }

  async function unpack(base64) {
    const input = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return new Response(new Blob([input]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }

  async function unpackJson(base64) {
    return JSON.parse(new TextDecoder().decode(await unpack(base64)));
  }

  async function elevation(data) {
    const [x, z, dx, dz, width, height, encoded] = await unpackJson(data);
    const buffer = new DataView(await unpack(encoded));
    const values = new Int16Array(width * height);
    for (let i = 0; i < values.length; i++) {
      values[i] = buffer.getInt16(i * 2, true) + (i % width ? values[i - 1] : 0);
    }
    return {
      sample(px, pz) {
        const tx = (px - x) / dx;
        const tz = (pz - z) / dz;
        const ix = clamp(Math.floor(tx), 0, width - 2);
        const iz = clamp(Math.floor(tz), 0, height - 2);
        const fx = clamp(tx - ix, 0, 1);
        const fz = clamp(tz - iz, 0, 1);
        const i = iz * width + ix;
        const a = values[i] + (values[i + 1] - values[i]) * fx;
        const b = values[i + width] + (values[i + width + 1] - values[i + width]) * fx;
        return (a + (b - a) * fz) / 10;
      },
      weight(px, pz) {
        const edge = Math.min(
          (px - x) / dx, (pz - z) / dz,
          width - 1 - (px - x) / dx, height - 1 - (pz - z) / dz
        );
        return clamp(edge / 24, 0, 1);
      },
    };
  }

  function insideRing(x, z, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const zi = ring[i + 1];
      const zj = ring[j + 1];
      if ((zi > z) !== (zj > z) && x < (ring[j] - ring[i]) * (z - zi) / (zj - zi) + ring[i]) {
        inside = !inside;
      }
    }
    return inside;
  }

  function boxOf(points) {
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < points.length; i += 2) {
      box[0] = Math.min(box[0], points[i]);
      box[1] = Math.min(box[1], points[i + 1]);
      box[2] = Math.max(box[2], points[i]);
      box[3] = Math.max(box[3], points[i + 1]);
    }
    return box;
  }

  class PriorityQueue {
    items = [];

    push(node, score) {
      const item = { node, score };
      let i = this.items.length;
      this.items.push(item);
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (this.items[parent].score <= score) break;
        this.items[i] = this.items[parent];
        i = parent;
      }
      this.items[i] = item;
    }

    pop() {
      const first = this.items[0];
      const last = this.items.pop();
      if (!this.items.length) return first;
      let i = 0;
      for (let child = i * 2 + 1; child < this.items.length; child = i * 2 + 1) {
        if (child + 1 < this.items.length && this.items[child + 1].score < this.items[child].score) child++;
        if (last.score <= this.items[child].score) break;
        this.items[i] = this.items[child];
        i = child;
      }
      this.items[i] = last;
      return first;
    }
  }

  class Geography {
    static async open() {
      const data = globalThis.ND_DATA;
      const [land, water, base, ...local] = await Promise.all([
        unpackJson(data.roads), unpackJson(data.water),
        ...['region', 'rapids', 'range', 'duluth', 'cabin'].map((name) => elevation(data[name])),
      ]);
      return new Geography(land, water, base, local);
    }

    constructor(land, water, base, local) {
      this.bounds = land.bounds;
      this.towns = land.towns.map(([name, x, z]) => ({ name, x, z }));
      this.base = base;
      this.local = local;
      this.roads = new Grid(CELL);
      this.water = new Grid(WATER_CELL);
      this.waterTriangles = new Grid(WATER_CELL);
      this.nodes = [];
      this.centerlines = [];
      this.bodies = [];
      this.buildNetwork(land.roads);
      for (const [name, packedRings, packedTriangles] of water) {
        const rings = packedRings.map((ring) => ring.map((coord) => coord / 2));
        const bounds = boxOf(rings[0]);
        const samples = [];
        const points = rings[0];
        const step = Math.max(2, Math.floor(points.length / 30) * 2);
        for (let i = 0; i < points.length; i += step) samples.push(this.height(points[i], points[i + 1]));
        samples.sort((a, b) => a - b);
        const level = name === 'Lake Superior' ? 183.3 : samples[Math.floor(samples.length * 0.24)] + 0.18;
        const moving = /river| creek| riv$/i.test(name);
        const body = { name, rings, bounds, level, moving };
        this.bodies.push(body);
        this.water.add(body, ...bounds);
        for (let i = 0; i < packedTriangles.length; i += 6) {
          const vertices = packedTriangles.slice(i, i + 6).map((coord) => coord / 2);
          this.waterTriangles.add({ vertices, body }, ...boxOf(vertices));
        }
      }
    }

    buildNetwork(lines) {
      const vertices = new Map();
      const getNode = (x, z) => {
        const id = key(x, z);
        if (!vertices.has(id)) {
          const node = { x, z, id: this.nodes.length, edges: [], component: -1 };
          vertices.set(id, node);
          this.nodes.push(node);
        }
        return vertices.get(id);
      };
      for (const [type, name, flat] of lines) {
        const points = flat.map((coord) => coord / 2);
        this.centerlines.push({ type, name, points });
        for (let i = 0; i + 3 < points.length; i += 2) {
          const a = getNode(points[i], points[i + 1]);
          const b = getNode(points[i + 2], points[i + 3]);
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const length = Math.hypot(dx, dz);
          if (length <= 0) continue;
          const width = widths[type];
          a.edges.push({ node: b, length, type });
          b.edges.push({ node: a, length, type });
          const segment = {
            a, b, dx, dz, length, type, width, name,
            heading: Math.atan2(dx, -dz),
          };
          this.roads.add(segment, Math.min(a.x, b.x) - width, Math.min(a.z, b.z) - width,
            Math.max(a.x, b.x) + width, Math.max(a.z, b.z) + width);
        }
      }
      // Join nearly coincident dead ends at source and county seams.
      const endpoints = new Grid(9);
      for (const node of this.nodes) {
        if (node.edges.length !== 1) continue;
        for (const other of endpoints.area(node.x - 8, node.z - 8, node.x + 8, node.z + 8)) {
          const length = Math.hypot(node.x - other.x, node.z - other.z);
          if (length > 8 || node.edges.some((edge) => edge.node === other)) continue;
          const type = Math.max(node.edges[0].type, other.edges[0].type);
          node.edges.push({ node: other, length, type });
          other.edges.push({ node, length, type });
        }
        endpoints.add(node, node.x, node.z, node.x, node.z);
      }
      let component = 0;
      let largest = 0;
      for (const node of this.nodes) {
        if (node.component !== -1) continue;
        const queue = [node];
        node.component = component;
        for (let i = 0; i < queue.length; i++) {
          for (const { node: neighbor } of queue[i].edges) {
            if (neighbor.component !== -1) continue;
            neighbor.component = component;
            queue.push(neighbor);
          }
        }
        if (queue.length > largest) {
          largest = queue.length;
          this.network = component;
        }
        component++;
      }
    }

    height(x, z) {
      let height = this.base.sample(x, z);
      for (const patch of this.local) {
        const weight = patch.weight(x, z);
        if (weight) height += (patch.sample(x, z) - height) * weight;
      }
      return height;
    }

    wet(x, z) {
      for (const body of this.water.at(x, z)) {
        const [x0, z0, x1, z1] = body.bounds;
        if (x < x0 || x > x1 || z < z0 || z > z1 || !insideRing(x, z, body.rings[0])) continue;
        if (body.rings.slice(1).some((ring) => insideRing(x, z, ring))) continue;
        return body;
      }
      return null;
    }

    waterHeight(body, x, z) {
      return body.moving ? Math.max(body.level, this.height(x, z) - 0.35) : body.level;
    }

    ground(x, z, bridge = false) {
      const y = this.height(x, z);
      if (!bridge) return y;
      const body = this.wet(x, z);
      return body ? Math.max(y, this.waterHeight(body, x, z) + 0.8) : y;
    }

    nearest(x, z, radius = 100, filter = null) {
      let min = radius * radius;
      let hit = null;
      const candidates = radius < 22
        ? this.roads.at(x, z)
        : this.roads.area(x - radius, z - radius, x + radius, z + radius);
      for (const segment of candidates) {
        if (filter && !filter(segment)) continue;
        const t = clamp(((x - segment.a.x) * segment.dx + (z - segment.a.z) * segment.dz)
          / (segment.length * segment.length), 0, 1);
        const px = segment.a.x + segment.dx * t;
        const pz = segment.a.z + segment.dz * t;
        const d = (x - px) ** 2 + (z - pz) ** 2;
        if (d >= min) continue;
        min = d;
        hit = { x: px, z: pz, t, heading: segment.heading, segment };
      }
      if (hit) hit.distance = Math.sqrt(min);
      return hit;
    }

    townFor(x, z) {
      let closest = this.towns[0];
      let distance = Infinity;
      for (const town of this.towns) {
        const d = (x - town.x) ** 2 + (z - town.z) ** 2;
        if (d < distance) {
          distance = d;
          closest = town;
        }
      }
      return closest;
    }

    route(from, to) {
      const connected = (segment) => segment.a.component === this.network;
      const start = this.nearest(from.x, from.z, 4900, connected);
      const end = this.nearest(to.x, to.z, 4900, connected);
      if (!start || !end) return null;
      const a = start.t < 0.5 ? start.segment.a : start.segment.b;
      const b = end.t < 0.5 ? end.segment.a : end.segment.b;
      const next = new PriorityQueue();
      const estimate = (node) => Math.hypot(node.x - b.x, node.z - b.z);
      const dist = new Float64Array(this.nodes.length).fill(Infinity);
      const parent = new Int32Array(this.nodes.length).fill(-1);
      dist[a.id] = 0;
      next.push(a, estimate(a));
      while (next.items.length) {
        const { node, score } = next.pop();
        if (node === b) break;
        if (score > dist[node.id] + estimate(node)) continue;
        for (const edge of node.edges) {
          const candidate = dist[node.id] + edge.length * [1, 1.15, 1.55, 2][edge.type];
          if (candidate >= dist[edge.node.id]) continue;
          dist[edge.node.id] = candidate;
          parent[edge.node.id] = node.id;
          next.push(edge.node, candidate + estimate(edge.node));
        }
      }
      if (!Number.isFinite(dist[b.id])) return null;
      const path = [end];
      for (let id = b.id; id !== -1; id = parent[id]) path.push(this.nodes[id]);
      path.push(start);
      path.reverse();
      let meters = 0;
      for (let i = 1; i < path.length; i++) {
        meters += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
      }
      return { path, meters, end };
    }
  }

  Object.assign(ND, { Geography, Grid, clamp, key, boxOf });
})();
