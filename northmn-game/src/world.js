// Corridor geography: US-2, US-169, US-53, lakes, and mine pits.
// Towns stay inside Grand Rapids, the Iron Range, and Duluth.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  const W = 3200;
  const H = 2300;

  const TOWNS = [
    { id: 'cohasset', name: 'Cohasset', x: 380, y: 500, region: 'home' },
    { id: 'grandrapids', name: 'Grand Rapids', x: 640, y: 500, region: 'home' },
    { id: 'coleraine', name: 'Coleraine', x: 860, y: 430, region: 'home' },
    { id: 'bovey', name: 'Bovey', x: 960, y: 470, region: 'home' },
    { id: 'nashwauk', name: 'Nashwauk', x: 1140, y: 390, region: 'range' },
    { id: 'keewatin', name: 'Keewatin', x: 1260, y: 360, region: 'range' },
    { id: 'hibbing', name: 'Hibbing', x: 1460, y: 340, region: 'range' },
    { id: 'chisholm', name: 'Chisholm', x: 1620, y: 330, region: 'range' },
    { id: 'buhl', name: 'Buhl', x: 1740, y: 350, region: 'range' },
    { id: 'mtiron', name: 'Mountain Iron', x: 1860, y: 390, region: 'range' },
    { id: 'virginia', name: 'Virginia', x: 2020, y: 430, region: 'range' },
    { id: 'eveleth', name: 'Eveleth', x: 1980, y: 560, region: 'range' },
    { id: 'gilbert', name: 'Gilbert', x: 2160, y: 470, region: 'range' },
    { id: 'biwabik', name: 'Biwabik', x: 2300, y: 500, region: 'range' },
    { id: 'aurora', name: 'Aurora', x: 2440, y: 470, region: 'range' },
    { id: 'hoytlakes', name: 'Hoyt Lakes', x: 2580, y: 430, region: 'range' },
    { id: 'hermantown', name: 'Hermantown', x: 1960, y: 980, region: 'duluth' },
    { id: 'proctor', name: 'Proctor', x: 2060, y: 1180, region: 'duluth' },
    { id: 'duluth', name: 'Duluth', x: 2200, y: 1420, region: 'duluth' },
  ];

  const ROADS = [
    { name: 'US-2', limit: 100, pts: [[180, 510], [380, 500], [640, 500], [900, 480]] },
    { name: 'US-169', limit: 110, pts: [[640, 500], [860, 440], [1140, 400], [1460, 350], [1740, 360], [2020, 430]] },
    { name: 'US-53', limit: 110, pts: [[2020, 430], [1980, 560], [1960, 980], [2060, 1180], [2200, 1420], [2260, 1560]] },
    { name: 'Range spur', limit: 80, pts: [[2020, 430], [2160, 470], [2300, 500], [2440, 470], [2580, 430]] },
  ];

  const BUILDINGS = [
    { id: 'office', name: 'Pemberton Office', kind: 'office', x: 600, y: 420, w: 86, h: 52, doorX: 643, doorY: 476 },
    { id: 'cabin', name: 'Pokegama Cabin', kind: 'house', region: 'home', x: 700, y: 640, w: 64, h: 48, doorX: 732, doorY: 692, deck: 'lake deck' },
    { id: 'hibbing', name: 'Hibbing Rambler', kind: 'house', region: 'range', x: 1500, y: 420, w: 64, h: 46, doorX: 1532, doorY: 470, deck: 'garage' },
    { id: 'canal', name: 'Canal Park Condo', kind: 'house', region: 'duluth', x: 2140, y: 1500, w: 60, h: 46, doorX: 2170, doorY: 1550, deck: 'bridge view' },
  ];

  function rand(seed) {
    let s = seed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function strokePoly(ctx, pts, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function bake() {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#1e4d32';
    g.fillRect(0, 0, W, H);
    const r = rand(7);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = r() > 0.5 ? '#173828' : '#2a6a3c';
      g.fillRect(r() * W, r() * H, 3 + r() * 5, 4 + r() * 6);
    }

    ellipse(g, 520, 820, 210, 130, '#1d5c9a');
    ellipse(g, 900, 330, 80, 52, '#2470b0');
    ellipse(g, 1860, 300, 54, 36, '#2470b0');
    ellipse(g, 1960, 300, 40, 28, '#2a7ec4');
    strokePoly(g, [[760, 40], [700, 220], [660, 400], [620, 520], [560, 680], [520, 760]], 26, '#1d5c9a');

    ellipse(g, 1460, 180, 150, 70, '#8a3b28');
    ellipse(g, 1400, 200, 70, 36, '#c4553a');
    ellipse(g, 1540, 160, 60, 30, '#6b2a22');
    ellipse(g, 2100, 250, 80, 36, '#8a3b28');

    g.fillStyle = '#1a4f86';
    g.beginPath();
    g.moveTo(2280, 1480);
    g.lineTo(W, 1320);
    g.lineTo(W, H);
    g.lineTo(2360, H);
    g.lineTo(2320, 1900);
    g.lineTo(2140, 1680);
    g.closePath();
    g.fill();
    g.fillStyle = '#e0c48a';
    g.beginPath();
    g.moveTo(2260, 1580);
    g.lineTo(2360, 1620);
    g.lineTo(2480, 2100);
    g.lineTo(2420, 2140);
    g.lineTo(2280, 1640);
    g.closePath();
    g.fill();

    ROADS.forEach(function (road) {
      strokePoly(g, road.pts, 22, '#5c6370');
      g.setLineDash([16, 18]);
      strokePoly(g, road.pts, 2, '#ffcd75');
      g.setLineDash([]);
    });

    g.fillStyle = '#c4b49a';
    g.fillRect(2248, 1548, 36, 10);
    g.fillStyle = '#ef7d57';
    g.fillRect(2248, 1528, 6, 28);
    g.fillRect(2278, 1528, 6, 28);

    TOWNS.forEach(function (t) {
      g.fillStyle = '#b13e53';
      g.fillRect(t.x - 8, t.y - 34, 16, 12);
      g.fillStyle = '#ffcd75';
      g.fillRect(t.x - 6, t.y - 40, 12, 6);
      g.font = 'bold 14px monospace';
      g.textAlign = 'center';
      g.fillStyle = '#1a1c2c';
      g.fillText(t.name, t.x + 1, t.y - 46);
      g.fillStyle = '#f4f4f4';
      g.fillText(t.name, t.x, t.y - 47);
    });

    g.font = 'bold 13px monospace';
    g.fillStyle = '#73eff7';
    g.textAlign = 'left';
    g.fillText('US-2', 240, 480);
    g.fillText('US-169', 1000, 370);
    g.fillText('US-53', 1880, 800);
    g.fillText('Mississippi', 700, 300);
    g.fillText('Pokegama Lake', 400, 780);
    g.fillText('Trout Lake', 820, 300);
    g.fillText('Hull-Rust Mine', 1320, 140);
    g.fillText('Lake Superior', 2700, 1600);
    g.fillText('Park Point', 2360, 1860);
    g.fillText('Canal Park', 2000, 1500);
    g.fillText('Lift Bridge', 2140, 1520);

    BUILDINGS.forEach(function (b) {
      g.fillStyle = b.kind === 'office' ? '#29366f' : '#6b4226';
      g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = b.kind === 'office' ? '#ffcd75' : '#8d1d2c';
      g.fillRect(b.x, b.y, b.w, 8);
      g.fillStyle = '#245c38';
      g.fillRect(b.doorX - 6, b.doorY - 8, 12, 10);
    });

    const cell = 16;
    const cols = Math.ceil(W / cell);
    const rows = Math.ceil(H / cell);
    const road = new Uint8Array(cols * rows);
    const water = new Uint8Array(cols * rows);
    const img = g.getImageData(0, 0, W, H).data;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = Math.min(W - 1, x * cell + 8);
        const py = Math.min(H - 1, y * cell + 8);
        const i = (py * W + px) * 4;
        const red = img[i];
        const green = img[i + 1];
        const blue = img[i + 2];
        if (blue > red + 30 && blue > green && blue > 80) water[y * cols + x] = 1;
        if (Math.abs(red - 92) < 30 && Math.abs(green - 99) < 30 && blue > 90 && blue < 140) road[y * cols + x] = 1;
      }
    }
    // Yellow dashes sit on the road; treat nearby gray as road via the polyline too.
    ROADS.forEach(function (roadLine) {
      markPoly(road, cols, cell, roadLine.pts, 14);
    });

    return { canvas: c, road: road, water: water, cols: cols, cell: cell };
  }

  function markPoly(road, cols, cell, pts, radius) {
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0];
      const ay = pts[i - 1][1];
      const bx = pts[i][0];
      const by = pts[i][1];
      const dist = Math.hypot(bx - ax, by - ay);
      const steps = Math.ceil(dist / 8);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        const cx = Math.floor(x / cell);
        const cy = Math.floor(y / cell);
        const rad = Math.ceil(radius / cell);
        for (let oy = -rad; oy <= rad; oy++) {
          for (let ox = -rad; ox <= rad; ox++) {
            const xx = cx + ox;
            const yy = cy + oy;
            if (xx < 0 || yy < 0 || xx >= cols) continue;
            if (ox * ox + oy * oy <= rad * rad) road[yy * cols + xx] = 1;
          }
        }
      }
    }
  }

  let baked = null;
  function map() {
    if (!baked) baked = bake();
    return baked;
  }

  function blocked(x, y) {
    const m = map();
    const cx = Math.floor(x / m.cell);
    const cy = Math.floor(y / m.cell);
    if (cx < 0 || cy < 0 || cx >= m.cols) return true;
    const i = cy * m.cols + cx;
    if (m.water[i]) return true;
    for (let b = 0; b < BUILDINGS.length; b++) {
      const box = BUILDINGS[b];
      if (x > box.x && y > box.y && x < box.x + box.w && y < box.y + box.h) return true;
    }
    return false;
  }

  function onRoad(x, y) {
    const m = map();
    const cx = Math.floor(x / m.cell);
    const cy = Math.floor(y / m.cell);
    if (cx < 0 || cy < 0 || cx >= m.cols) return false;
    return !!m.road[cy * m.cols + cx];
  }

  G.Geo = {
    W: W,
    H: H,
    TOWNS: TOWNS,
    ROADS: ROADS,
    BUILDINGS: BUILDINGS,
    map: map,
    blocked: blocked,
    onRoad: onRoad,
    roadLimit: function (x, y) {
      let best = 90;
      let dist = 80;
      ROADS.forEach(function (road) {
        for (let i = 1; i < road.pts.length; i++) {
          const ax = road.pts[i - 1][0];
          const ay = road.pts[i - 1][1];
          const bx = road.pts[i][0];
          const by = road.pts[i][1];
          const dx = bx - ax;
          const dy = by - ay;
          const len2 = dx * dx + dy * dy || 1;
          let t = ((x - ax) * dx + (y - ay) * dy) / len2;
          t = Math.max(0, Math.min(1, t));
          const px = ax + dx * t;
          const py = ay + dy * t;
          const d = Math.hypot(x - px, y - py);
          if (d < dist) { dist = d; best = road.limit; }
        }
      });
      return best;
    },
  };
})();
