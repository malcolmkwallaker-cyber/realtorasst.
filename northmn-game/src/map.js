'use strict';

(() => {
  const ND = globalThis.ND;
  const palette = {
    land: '#182a26', hills: '#263b32', water: '#365d62', shore: '#52777a',
    local: '#64756a', secondary: '#939d84', highway: '#ccbd94', route: '#f3cc86', label: '#efe8d6',
  };

  class MapPainter {
    constructor(geo) {
      this.geo = geo;
      this.roads = geo.centerlines.map((line) => ({ ...line, bounds:ND.boxOf(line.points) }));
    }

    draw(canvas, view) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (!w || !h) return;
      const scale = Math.min(devicePixelRatio || 1, 1.6);
      const px = Math.round(w * scale);
      const py = Math.round(h * scale);
      if (canvas.width !== px || canvas.height !== py) {
        canvas.width = px;
        canvas.height = py;
      }
      ctx.setTransform(scale,0,0,scale,0,0);
      ctx.fillStyle = palette.land;
      ctx.fillRect(0,0,w,h);
      const x = (px) => (px-view.x)/view.zoom+w/2;
      const z = (pz) => (pz-view.z)/view.zoom+h/2;
      const worldX = (px) => view.x+(px-w/2)*view.zoom;
      const worldZ = (pz) => view.z+(pz-h/2)*view.zoom;
      const box = [worldX(-20),worldZ(-20),worldX(w+20),worldZ(h+20)];
      const visible = (b) => b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1];
      const onScreen = (p,pad=16) => x(p.x) > -pad && x(p.x) < w+pad && z(p.z) > -pad && z(p.z) < h+pad;
      const mini = view.mini;
      const trace = (points, close = false) => {
        ctx.moveTo(x(points[0]),z(points[1]));
        for (let i=2;i<points.length;i+=2) ctx.lineTo(x(points[i]),z(points[i+1]));
        if (close) ctx.closePath();
      };
      if (!mini) {
        for (let i=0;i<w;i+=18) {
          for (let j=0;j<h;j+=18) {
            const height = this.geo.height(worldX(i+9),worldZ(j+9));
            const alpha = Math.max(.025,Math.min(.47,(height-170)/980));
            ctx.fillStyle = 'rgba(133,146,105,'+alpha+')';
            ctx.fillRect(i,j,18,18);
          }
        }
        const kilometer = view.zoom > 150 ? 12000 : view.zoom > 50 ? 5000 : view.zoom > 7 ? 1000 : 100;
        ctx.beginPath();
        for (let i=Math.ceil(box[0]/kilometer)*kilometer;i<box[2];i+=kilometer) {
          ctx.moveTo(x(i),0); ctx.lineTo(x(i),h);
        }
        for (let j=Math.ceil(box[1]/kilometer)*kilometer;j<box[3];j+=kilometer) {
          ctx.moveTo(0,z(j)); ctx.lineTo(w,z(j));
        }
        ctx.strokeStyle='rgba(187,201,170,.09)';
        ctx.lineWidth=1;
        ctx.stroke();
      }
      const waterLabels=[];
      ctx.fillStyle=palette.water;
      ctx.strokeStyle=palette.shore;
      ctx.lineWidth=.55;
      for (const body of this.geo.bodies) {
        if (!visible(body.bounds) || ((body.bounds[2]-body.bounds[0])*(body.bounds[3]-body.bounds[1])) < view.zoom**2*4) continue;
        ctx.beginPath();
        for (const ring of body.rings) trace(ring,true);
        ctx.fill('evenodd');
        if (!mini) ctx.stroke();
        if (!mini && body.name && body.bounds[2]-body.bounds[0] > view.zoom * 56) waterLabels.push(body);
      }
      ctx.lineJoin='round';
      ctx.lineCap='round';
      for (const type of [3,2,1,0]) {
        if (view.zoom > (type === 3 ? 12 : type === 2 ? 95 : type === 1 ? 700 : Infinity)) continue;
        ctx.beginPath();
        for (const road of this.roads) if (road.type === type && visible(road.bounds)) trace(road.points);
        ctx.lineWidth=[2.55,1.35,.85,.55][type];
        ctx.strokeStyle=[palette.highway,palette.secondary,palette.local,palette.local][type];
        ctx.stroke();
      }
      if (view.route?.path.length) {
        ctx.beginPath();
        for (const [i,p] of view.route.path.entries()) {
          if (i) ctx.lineTo(x(p.x),z(p.z));
          else ctx.moveTo(x(p.x),z(p.z));
        }
        ctx.strokeStyle='#283029';
        ctx.lineWidth=mini?5:6;
        ctx.stroke();
        ctx.strokeStyle=palette.route;
        ctx.lineWidth=mini?2.7:3.1;
        ctx.stroke();
      }
      const avoid = [];
      const label = (text, px, py, fill, weight='500',size=11) => {
        ctx.font = weight+' '+size+'px system-ui';
        const len = ctx.measureText(text).width;
        const bounds=[px-2,py-size,px+len+2,py+3];
        if (bounds[0]<0 || bounds[2]>w || bounds[1]<0 || bounds[3]>h ||
          avoid.some((b) => b[0]<bounds[2]&&b[2]>bounds[0]&&b[1]<bounds[3]&&b[3]>bounds[1])) return;
        avoid.push(bounds);
        ctx.strokeStyle='#172823';
        ctx.fillStyle=fill;
        ctx.lineWidth=2.8;
        ctx.strokeText(text,px,py);
        ctx.fillText(text,px,py);
      };
      if (!mini) {
        const towns = this.geo.towns.slice().sort((a,b) => {
          const rank=(town)=>['Grand Rapids','Duluth','Hibbing','Virginia','Tower'].includes(town.name)?0:1;
          return rank(a)-rank(b);
        });
        for (const t of towns) {
          if (!onScreen(t)) continue;
          ctx.fillStyle='#e1d5b6';
          ctx.beginPath();
          ctx.arc(x(t.x),z(t.z),2.2,0,2*Math.PI);
          ctx.fill();
          label(t.name,x(t.x)+6,z(t.z)+4,palette.label,'650',11);
        }
        for (const b of waterLabels) {
          label(b.name, x((b.bounds[0]+b.bounds[2])/2), z((b.bounds[1]+b.bounds[3])/2),'#b0ced0','500',10);
        }
        if (view.zoom < 22) {
          const named = new Set();
          for (const road of this.roads) {
            if (!road.name || named.has(road.name) || !visible(road.bounds) || (view.zoom > 9 && road.type > 1)) continue;
            named.add(road.name);
            label(road.name,x((road.bounds[0]+road.bounds[2])/2)+4,z((road.bounds[1]+road.bounds[3])/2)-3,'#c1cbbd','500',10);
          }
        }
        const miles = view.zoom > 85 ? 10 : view.zoom > 20 ? 2 : view.zoom > 6 ? .5 : .1;
        const line = miles / ND.MILES / view.zoom;
        ctx.strokeStyle = '#eee4cb';
        ctx.fillStyle = '#eee4cb';
        ctx.font = '10px system-ui';
        ctx.beginPath();
        ctx.moveTo(17,h-24); ctx.lineTo(17,h-19); ctx.lineTo(17+line,h-19); ctx.lineTo(17+line,h-24);
        ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillText(miles+' mi',17,h-27);
      }
      for (const p of view.stops || []) {
        if (!onScreen(p)) continue;
        ctx.save();
        ctx.translate(x(p.x),z(p.z));
        ctx.rotate(Math.PI/4);
        ctx.fillStyle=p.active? palette.route:'#83ac9c';
        ctx.strokeStyle='#1a2d26';
        ctx.lineWidth=1.7;
        const size=p.active?9:6;
        ctx.fillRect(-size/2,-size/2,size,size);
        ctx.strokeRect(-size/2,-size/2,size,size);
        ctx.restore();
        if (!mini && p.active) label(p.label,x(p.x)+8,z(p.z)-2,palette.route,'700',11);
      }
      if (view.car && !view.driving && onScreen(view.car)) {
        ctx.fillStyle='#d6dfd6';
        ctx.strokeStyle='#142826';
        ctx.lineWidth=1.6;
        ctx.fillRect(x(view.car.x)-3,z(view.car.z)-4,6,8);
        ctx.strokeRect(x(view.car.x)-3,z(view.car.z)-4,6,8);
      }
      if (view.player && onScreen(view.player)) {
        ctx.save();
        ctx.translate(x(view.player.x),z(view.player.z));
        ctx.rotate(view.player.yaw);
        ctx.beginPath();
        ctx.moveTo(0,-9);ctx.lineTo(6,6);ctx.lineTo(0,3.5);ctx.lineTo(-6,6);ctx.closePath();
        ctx.fillStyle='#f6f1e3';
        ctx.strokeStyle='#20362e';
        ctx.lineWidth=2;
        ctx.stroke();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle='#e3ecdf';
      ctx.textAlign='right';
      ctx.font='650 10px system-ui';
      ctx.fillText('N',w-12,16);
      ctx.textAlign='left';
    }
  }

  ND.MapPainter = MapPainter;
})();
