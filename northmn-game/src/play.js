// Side-scrolling trail, the lead hunt, and the icy highway.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  function drawTravel(ctx, w, h, miles, t, lead) {
    const biome = G.Trail.biome(miles);
    const sky = biome === 'superior' ? '#1a4f86' : biome === 'snow' ? '#8aa4b8' : biome === 'mine' ? '#6a5344' : '#4a7ea8';
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const groundY = 150;
    const scroll = Math.floor(t * 90);
    if (biome === 'lake' || biome === 'superior') {
      ctx.fillStyle = '#1d5c9a';
      ctx.fillRect(0, groundY - 28, w, 40);
      ctx.fillStyle = '#41a6f6';
      for (let i = 0; i < 8; i++) {
        const x = ((i * 70 - scroll) % (w + 70) + w) % (w + 70) - 20;
        ctx.fillRect(x, groundY - 18, 24, 3);
      }
    }
    ctx.fillStyle = biome === 'snow' ? '#e8eef2' : biome === 'mine' ? '#5a4638' : '#2f7d45';
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = biome === 'snow' ? '#c5d0d8' : '#245c38';
    ctx.fillRect(0, groundY, w, 4);
    if (biome === 'mine') {
      for (let i = 0; i < 4; i++) {
        const x = ((i * 140 - scroll * 0.6) % (w + 80) + w) % (w + 80) - 30;
        ctx.fillStyle = '#8a3b28';
        ctx.beginPath();
        ctx.ellipse(x, groundY - 8, 36, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c4553a';
        ctx.beginPath();
        ctx.ellipse(x, groundY - 6, 18, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (biome === 'superior' && miles > 250) {
      ctx.fillStyle = '#c4b49a';
      ctx.fillRect(300, groundY - 36, 70, 8);
      ctx.fillStyle = '#ef7d57';
      ctx.fillRect(300, groundY - 64, 8, 36);
      ctx.fillRect(362, groundY - 64, 8, 36);
    } else {
      for (let i = 0; i < 7; i++) {
        const x = ((i * 80 - scroll) % (w + 40) + w) % (w + 40) - 10;
        ctx.fillStyle = '#173828';
        ctx.fillRect(x + 6, groundY - 28, 4, 28);
        ctx.fillStyle = '#1e4d32';
        ctx.beginPath();
        ctx.moveTo(x, groundY - 26);
        ctx.lineTo(x + 8, groundY - 52);
        ctx.lineTo(x + 16, groundY - 26);
        ctx.fill();
      }
    }
    if (biome === 'snow' || miles > 140) {
      ctx.fillStyle = '#f4f4f4';
      for (let i = 0; i < 18; i++) {
        const x = (i * 47 + scroll * 2) % w;
        const y = (i * 29 + t * 40) % groundY;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.fillStyle = '#5c6370';
    ctx.fillRect(0, groundY + 8, w, 18);
    ctx.fillStyle = '#ffcd75';
    for (let i = 0; i < 8; i++) {
      const x = ((i * 36 - scroll) % (w + 36) + w) % w;
      ctx.fillRect(x, groundY + 15, 14, 3);
    }
    drawSuv(ctx, 78, groundY - 8, lead);
  }

  function drawSuv(ctx, x, y, lead) {
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(x, y - 16, 54, 20);
    ctx.fillStyle = '#29366f';
    ctx.fillRect(x + 2, y - 22, 36, 12);
    ctx.fillStyle = '#73eff7';
    ctx.fillRect(x + 8, y - 20, 12, 7);
    ctx.fillRect(x + 22, y - 20, 10, 7);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(x + 48, y - 12, 4, 3);
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 6, y + 1, 10, 10);
    ctx.fillRect(x + 34, y + 1, 10, 10);
    if (lead && lead.sprite) ctx.drawImage(lead.sprite, x + 10, y - 36);
  }

  function Hunt() {
    this.player = { x: 60, y: 180, dir: 1 };
    this.leads = [];
    this.shots = [];
    this.score = 0;
    this.time = 25;
    this.spawn = 0;
    this.over = false;
  }
  Hunt.prototype.update = function (dt, keys) {
    if (this.over) return;
    this.time -= dt;
    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) { dx += 1; this.player.dir = 1; }
    if (keys.left) this.player.dir = -1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    this.player.x = Math.max(16, Math.min(460, this.player.x + dx * 120 * dt));
    this.player.y = Math.max(40, Math.min(240, this.player.y + dy * 120 * dt));
    if (keys.throw) {
      keys.throw = false;
      this.shots.push({ x: this.player.x, y: this.player.y - 8, vx: this.player.dir * 180 });
    }
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = 0.7;
      const kinds = ['buyer', 'seller', 'fsbo', 'deer', 'neighbor'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      this.leads.push({
        x: 40 + Math.random() * 400,
        y: 50 + Math.random() * 160,
        kind: kind,
        ttl: 2.4 + Math.random(),
      });
    }
    this.shots.forEach(function (s) { s.x += s.vx * dt; });
    this.shots = this.shots.filter(function (s) { return s.x > -10 && s.x < 500; });
    const self = this;
    this.leads.forEach(function (lead) {
      lead.ttl -= dt;
      this.shots.forEach(function (shot) {
        if (lead.dead) return;
        if (Math.abs(shot.x - lead.x) < 12 && Math.abs(shot.y - lead.y) < 12) {
          lead.dead = true;
          shot.x = -99;
          if (lead.kind === 'deer' || lead.kind === 'neighbor') self.score = Math.max(0, self.score - 1);
          else self.score += 1;
        }
      });
    }, this);
    this.leads = this.leads.filter(function (l) { return l.ttl > 0 && !l.dead; });
    if (this.time <= 0) this.over = true;
  };
  Hunt.prototype.draw = function (ctx, w, h, sprite) {
    ctx.fillStyle = '#2f7d45';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d5c9a';
    ctx.fillRect(0, 0, w, 36);
    ctx.fillStyle = '#e8eef2';
    ctx.fillRect(0, h - 28, w, 28);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(300, 40, 50, 36);
    ctx.fillStyle = '#f4f4f4';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('LEADS ' + this.score + '   ' + Math.ceil(this.time) + 's', 8, 18);
    this.leads.forEach(function (lead) {
      const color = lead.kind === 'deer' ? '#8a5a3a' : lead.kind === 'neighbor' ? '#b13e53' : lead.kind === 'fsbo' ? '#ef7d57' : '#ffcd75';
      ctx.fillStyle = color;
      ctx.fillRect(lead.x - 6, lead.y - 8, 12, 14);
    });
    this.shots.forEach(function (s) {
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(s.x, s.y, 8, 5);
    });
    if (sprite) ctx.drawImage(sprite, this.player.x - 7, this.player.y - 16);
    else {
      ctx.fillStyle = '#29366f';
      ctx.fillRect(this.player.x - 6, this.player.y - 14, 12, 16);
    }
  };

  function Highway() {
    this.x = 240;
    this.dist = 0;
    this.goal = 1600;
    this.objs = [];
    this.spawn = 0;
    this.hits = 0;
    this.texts = 0;
    this.ticket = false;
    this.over = false;
    this.scroll = 0;
  }
  Highway.prototype.update = function (dt, keys) {
    if (this.over) return;
    if (keys.left) this.x -= 160 * dt;
    if (keys.right) this.x += 160 * dt;
    this.x = Math.max(70, Math.min(410, this.x));
    const rate = 180;
    this.dist += rate * dt;
    this.scroll += rate * dt;
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = 0.55;
      const kinds = ['drift', 'deer', 'hole', 'trooper', 'text', 'text'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      this.objs.push({ x: 80 + Math.random() * 320, y: -20, kind: kind });
    }
    const self = this;
    this.objs.forEach(function (o) {
      o.y += rate * dt;
      if (o.hit) return;
      if (o.y > 150 && o.y < 190 && Math.abs(o.x - self.x) < 18) {
        o.hit = true;
        if (o.kind === 'text') self.texts += 1;
        else {
          self.hits += 1;
          if (o.kind === 'trooper') self.ticket = true;
        }
      }
    });
    this.objs = this.objs.filter(function (o) { return o.y < 300 && !o.hit; });
    if (this.dist >= this.goal || this.hits >= 5) this.over = true;
  };
  Highway.prototype.draw = function (ctx, w, h) {
    ctx.fillStyle = '#8aa4b8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d5dde3';
    ctx.fillRect(50, 0, w - 100, h);
    ctx.fillStyle = '#ffcd75';
    for (let i = 0; i < 8; i++) {
      const y = (i * 36 + this.scroll) % h;
      ctx.fillRect(w / 2 - 2, y, 4, 16);
    }
    ctx.fillStyle = '#f4f4f4';
    for (let i = 0; i < 20; i++) ctx.fillRect((i * 53 + this.scroll) % w, (i * 17) % h, 2, 2);
    this.objs.forEach(function (o) {
      if (o.kind === 'text') ctx.fillStyle = '#ffcd75';
      else if (o.kind === 'trooper') ctx.fillStyle = '#1a1c2c';
      else if (o.kind === 'deer') ctx.fillStyle = '#8a5a3a';
      else if (o.kind === 'hole') ctx.fillStyle = '#333c57';
      else ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(o.x - 10, o.y - 8, 20, 14);
      if (o.kind === 'trooper') {
        ctx.fillStyle = '#b13e53';
        ctx.fillRect(o.x - 4, o.y - 4, 4, 4);
        ctx.fillStyle = '#3b5dc9';
        ctx.fillRect(o.x, o.y - 4, 4, 4);
      }
    });
    ctx.fillStyle = '#29366f';
    ctx.fillRect(this.x - 14, 168, 28, 18);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(this.x - 4, 172, 8, 6);
    ctx.fillStyle = '#1a1c2c';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ICE ' + Math.floor(this.dist) + ' / ' + this.goal + '   bumps ' + this.hits + '   texts ' + this.texts, 8, 18);
  };

  G.Play = {
    drawTravel: drawTravel,
    Hunt: Hunt,
    Highway: Highway,
  };
})();
