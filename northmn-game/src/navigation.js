'use strict';

(() => {
  const ND=globalThis.ND;
  const heading=(a,b)=>Math.atan2(b.x-a.x,a.z-b.z);
  const relative=(yaw)=>Math.atan2(Math.sin(yaw),Math.cos(yaw));
  const distance=(dist)=>dist>250 ? (dist*ND.MILES).toFixed(1)+' mi' : Math.max(20,Math.round(dist*3.28084/10)*10)+' ft';

  function pointAlong(path,distances,from,at) {
    let index=from;
    while (index<path.length-2 && distances[index+1]<at) index++;
    const length=distances[index+1]-distances[index];
    const t=length ? ND.clamp((at-distances[index])/length,0,1) : 0;
    return { x:path[index].x+(path[index+1].x-path[index].x)*t,
      z:path[index].z+(path[index+1].z-path[index].z)*t };
  }

  function guidance(route,car,target) {
    const {path}=route;
    if (path.length<2 || Math.hypot(target.x-car.x,target.z-car.z)<16) {
      return { arrow:'◆',instruction:'Arrive at '+target.label };
    }
    const positions=[0];
    let closest={index:0,along:0,gap:Infinity};
    for (let i=0;i<path.length-1;i++) {
      const a=path[i];
      const dx=path[i+1].x-a.x;
      const dz=path[i+1].z-a.z;
      const length=Math.hypot(dx,dz);
      positions.push(positions[i]+length);
      if (!length) continue;
      const t=ND.clamp(((car.x-a.x)*dx+(car.z-a.z)*dz)/(length*length),0,1);
      const gap=(car.x-a.x-dx*t)**2+(car.z-a.z-dz*t)**2;
      if (gap<closest.gap) closest={index:i,along:positions[i]+length*t,gap};
    }
    const at=(offset)=>pointAlong(path,positions,closest.index,closest.along+offset);
    const here=at(0);
    const forward=at(24);
    const bearing=relative(heading(car,forward)-car.yaw);
    const octant=Math.round(bearing/(Math.PI/4));
    const arrow=['↑','↗','→','↘','↓','↙','←','↖'][(octant+8)%8];
    if (closest.gap>38**2) return {arrow,instruction:'Rejoin the marked route'};
    let previous=heading(here,forward);
    for (let d=24;d<120 && closest.along+d+18<positions.at(-1);d+=17) {
      const ahead=heading(at(d),at(d+18));
      const change=relative(ahead-previous);
      if (Math.abs(change)>.59) {
        const turn=Math.abs(bearing)<.68 ? (change>0?'→':'←') : arrow;
        return {arrow:turn,instruction:(change>0?'Right':'Left')+' in '+distance(d)};
      }
      previous=ahead;
    }
    return {arrow,instruction:'Continue · '+distance(Math.max(0,positions.at(-1)-closest.along))};
  }

  ND.guidance=guidance;
})();
