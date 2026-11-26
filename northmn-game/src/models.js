'use strict';

(() => {
  const ND = globalThis.ND;
  const { Mesh, color, SURFACE: M } = ND;
  const c = color;
  const ivory = c('#e2dccc');
  const wood = c('#be9a6e');
  const charcoal = c('#222a29');
  const steel = c('#626d69');
  const glass = c('#273f42');

  function beam(mesh, a, b, width, tint, material = -1) {
    const along = b.map((n, i) => n - a[i]);
    const len = Math.hypot(...along) || 1;
    const side = Math.abs(along[1] / len) > .9 ? [1, 0, 0] : [-along[2], 0, along[0]];
    const sideLength = Math.hypot(...side) || 1;
    const [i, j, k] = side.map((n) => n / sideLength * width / 2);
    const [u, v, w] = [
      (along[1] * k - along[2] * j) / len,
      (along[2] * i - along[0] * k) / len,
      (along[0] * j - along[1] * i) / len,
    ];
    const corner = (p, s, t) => [p[0] + i * s + u * t, p[1] + j * s + v * t, p[2] + k * s + w * t];
    for (const [s, t, s2, t2] of [[1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1]]) {
      mesh.quad(corner(a, s, t), corner(a, s2, t2), corner(b, s2, t2), corner(b, s, t), tint, material, 1, len);
    }
  }

  function roof(mesh, w, d, h, rise, tint = [.84, .88, .89]) {
    const x = w / 2 + .32;
    const z = d / 2 + .42;
    mesh.quad([-x, h, z], [-x, h, -z], [0, h + rise, -z], [0, h + rise, z],
      tint, M.shingles, d / 1.35, w / 3);
    mesh.quad([0, h + rise, z], [0, h + rise, -z], [x, h, -z], [x, h, z],
      tint, M.shingles, d / 1.35, w / 3);
    for (const s of [-1, 1]) {
      mesh.box(s * x - .07, h - .105, -z, .14, .13, z * 2, ivory);
      mesh.triangle([-x, h, z * s], [x, h, z * s], [0, h + rise, z * s], tint, M.siding,
        [[0, 0], [w / 1.8, 0], [w / 3.6, rise / .9]]);
    }
  }

  function window(mesh, x, y, z, w, h, lit = false) {
    mesh.box(x - .045, y - .06, z - .023, w + .09, h + .12, .09, ivory);
    mesh.box(x + .045, y + .045, z - .032, w - .09, h - .09, .02,
      lit ? c('#71664a') : glass, lit ? -1 : M.glass);
    mesh.box(x + w / 2 - .023, y, z - .05, .046, h, .039, ivory);
    mesh.box(x, y + h / 2 - .018, z - .05, w, .036, .037, ivory);
    mesh.box(x - .10, y - .08, z - .09, w + .20, .07, .14, ivory);
  }

  function landing(mesh, w, z, height = .32, deep = 1.22) {
    mesh.box(-w / 2, -.52, z - deep, w, height + .52, deep, [.80, .80, .77], M.concrete);
    mesh.box(-w / 2 - .035, -.16, z - deep - .38, w + .07, height / 2 + .16, .43,
      [.79, .79, .76], M.concrete);
  }

  function door(mesh, x, z, w, tint, open = false, height = 2.14) {
    for (const side of [x - .06, x + w]) mesh.box(side, 0, z - .02, .06, height + .06, .10, ivory);
    mesh.box(x - .06, height, z - .02, w + .12, .075, .10, ivory);
    if (open === 'outside') {
      const edge = x+w+.045;
      mesh.box(edge,.015,z-.14,w*.92,height-.01,.065,tint,M.oak);
      mesh.box(edge+.15,1.22,z-.156,w*.92-.30,.64,.020,glass,M.glass);
      mesh.box(edge+w*.81,.97,z-.18,.085,.062,.052,steel);
    } else if (open) {
      mesh.box(x + w - .04, .015, z, .049, height - .01, w * .92, tint, M.oak);
      mesh.box(x + w - .071, .97, z + w * .81, .065, .06, .15, steel);
    } else {
      mesh.box(x, 0, z + .007, w, height, .06, tint, M.oak);
      mesh.box(x + .13, 1.29, z - .015, w - .26, .60, .025, glass, M.glass);
      mesh.box(x + w - .17, .93, z - .027, .09, .065, .07, steel);
    }
  }

  function table(mesh, x, y, z, w, d, tall = .75, tint = wood) {
    mesh.box(x - w / 2, y + tall, z - d / 2, w, .07, d, tint, M.oak);
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        mesh.box(x + (w / 2 - .085) * a - .027, y, z + (d / 2 - .085) * b - .027,
          .055, tall, .055, steel);
      }
    }
  }

  function chair(mesh, x, y, z, yaw, tint) {
    mesh.at(x, y, z, yaw, () => {
      for (const a of [-1, 1]) {
        for (const b of [-1, 1]) mesh.box(a * .20 - .024, 0, b * .18 - .024, .048, .48, .048, steel);
      }
      mesh.box(-.25, .46, -.24, .50, .085, .48, tint, M.cloth);
      mesh.box(-.25, .54, .17, .50, .43, .081, tint, M.cloth);
    });
  }

  function plant(mesh, x, y, z, scale = 1) {
    mesh.round(x, y, z, .17 * scale, .21 * scale, .27 * scale, c('#877d64'), M.concrete, 9);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.3999;
      const point = [x + Math.cos(a) * .29 * scale, y + (.59 + i % 4 * .11) * scale, z + Math.sin(a) * .29 * scale];
      beam(mesh, [x, y + .25 * scale, z], point, .024 * scale, c('#4c6749'));
      mesh.ellipsoid(...point, .19 * scale, .11 * scale, .17 * scale, [.7, .94, .63], M.needles, 6, 3);
    }
  }

  function papers(mesh, x, y, z) {
    mesh.box(x, y, z, .30, .012, .23, ivory);
    for (let i = 0; i < 4; i++) mesh.box(x + .035, y + .013, z + .047 + i * .034, .19, .002, .004, steel);
  }

  function officeInterior(mesh) {
    const w = c('#9e9b8b');
    mesh.box(-7.1, 0, 1.2, 4.7, 2.95, .12, w, M.drywall);
    mesh.box(2.45, 0, 1.2, 4.65, 2.95, .12, w, M.drywall);
    for (const x of [-5.1, .3, 5.1]) {
      mesh.box(x - .70, 2.81, -3.44, 1.4, .033, .34, c('#f5ebce'), M.lamp);
      mesh.box(x - .70, 2.81, 2.56, 1.4, .033, .34, c('#f5ebce'), M.lamp);
    }
    table(mesh, 3.72, 0, -1.93, 2.50, .93, .91);
    mesh.box(3.25, .98, -1.72, .59, .37, .052, charcoal);
    mesh.box(3.30, 1.02, -1.781, .47, .28, .018, c('#44665f'), M.lamp);
    mesh.box(3.51, .92, -1.72, .078, .12, .09, steel);
    papers(mesh, 4.1, .985, -2.22);
    mesh.box(3.03,.983,-2.38,.41,.038,.28,c('#e7c17e'));
    mesh.box(3.09,1.022,-2.34,.29,.005,.178,ivory);
    chair(mesh, 3.75, 0, -1.15, Math.PI, [.85, .87, .85]);
    table(mesh, -3.6, 0, -2.05, 2.1, .76, .72);
    papers(mesh, -3.95, .8, -2.26);
    mesh.box(-3.35,.793,-2.13,.27,.027,.19,c('#ad723f'));
    chair(mesh, -3.62, 0, -1.31, Math.PI, [.77, .76, .71]);
    table(mesh, -.1, 0, 3.2, 3.34, 1.22, .74);
    for (const x of [-1.15, .12, 1.23]) {
      chair(mesh, x, 0, 2.29, Math.PI, [.80, .78, .71]);
      chair(mesh, x, 0, 4.11, 0, [.80, .78, .71]);
    }
    papers(mesh, -.52, .814, 2.90);
    for (const x of [-6.64, 6.66]) {
      plant(mesh, x, 0, -4.35, 1.5);
      mesh.box(x - .57, 0, 3.80, 1.1, .96, .59, wood, M.oak);
      mesh.box(x - .55, .35, 3.766, 1.06, .04, .045, charcoal);
      mesh.box(x - .55, .66, 3.766, 1.06, .04, .045, charcoal);
    }
  }

  function kitchen(mesh,w,d) {
    const x = w/2-2.8;
    const z = -d/2+.20;
    const oak = c('#bdab91');
    const counter = c('#b9b6a8');
    mesh.floor(.72,.014,z,w/2-.96,2.91,c('#a1a69e'),M.concrete,1.46);
    for (let dx=.87;dx<w/2-.3;dx+=.49) {
      mesh.floor(dx,.017,z,.012,2.91,c('#747973'),-1);
    }
    for (let dz=z+.42;dz<z+2.9;dz+=.47) {
      mesh.floor(.72,.017,dz,w/2-.96,.011,c('#747973'),-1);
    }
    mesh.box(x,.07,z,2.59,.82,.61,oak,M.oak);
    mesh.box(x,.026,z+.025,2.59,.063,.55,c('#676052'),M.oak);
    for (const i of [0,1,2,3]) {
      const face = x+.033+i*.646;
      mesh.box(face,.18,z+.613,.581,.62,.040,oak,M.oak);
      mesh.box(face+.133,.716,z+.657,.28,.033,.035,steel);
      if (i<3) {
        mesh.box(face,1.995,z+.015,.61,.425,.32,oak,M.oak);
        mesh.box(face+.477,2.049,z+.338,.036,.13,.032,steel);
      }
    }
    for (const [start,width] of [[0,1.045],[1.78,.84]]) {
      mesh.box(x+start,.891,z-.018,width,.065,.66,counter,M.granite);
    }
    for (const rim of [-.018,.52]) {
      mesh.box(x+1.012,.891,z+rim,.78,.065,.124,counter,M.granite);
    }
    mesh.box(x+1.044,.899,z+.104,.736,.024,.42,c('#555c5a'));
    for (const side of [1.044,1.754]) {
      mesh.box(x+side,.911,z+.102,.029,.044,.423,steel);
    }
    mesh.box(x+1.042,.911,z+.101,.738,.044,.032,steel);
    mesh.box(x+1.042,.911,z+.499,.738,.044,.030,steel);
    mesh.round(x+1.413,.927,z+.295,.032,.032,.006,c('#414948'),-1,8);
    beam(mesh,[x+1.46,.955,z+.078],[x+1.46,1.186,z+.078],.044,steel);
    beam(mesh,[x+1.46,1.175,z+.078],[x+1.46,1.164,z+.263],.036,steel);
  }

  function waterHeater(mesh,x,z) {
    const casing = c('#b5b8b0');
    mesh.round(x,.025,z,.277,.269,1.10,casing,M.paint,12);
    mesh.round(x,1.112,z,.268,.21,.082,casing,-1,12);
    mesh.box(x-.273,.055,z-.21,.067,.10,.42,c('#635e56'));
    mesh.box(x-.17,.46,z+.263,.34,.29,.032,c('#727c70'),M.concrete);
    mesh.box(x-.118,.64,z+.299,.236,.044,.012,c('#ddd7b4'));
    mesh.box(x-.081,.553,z+.298,.163,.028,.012,c('#505854'));
    beam(mesh,[x+.08,1.17,z],[x+.08,1.51,z],.033,steel);
    beam(mesh,[x-.09,1.17,z],[x-.09,1.43,z],.031,c('#9d6a48'));
  }

  function waterMark(mesh,z) {
    const patches = [
      [c('#9c917b'),[[-.89,.17],[-.89,.47],[-.79,.82],[-.69,.95],[-.58,.83],[-.44,.92],[-.29,.78],[-.08,.87],
        [.17,.72],[.31,.62],[.41,.39],[.30,.17]]],
      [c('#79715f'),[[-.79,.22],[-.77,.57],[-.68,.78],[-.58,.61],[-.43,.73],[-.27,.51],[-.08,.61],[.13,.43],[.25,.23]]],
      [c('#857a67'),[[-.54,.54],[-.48,.88],[-.38,.86],[-.34,.70],[-.43,.49]]],
    ];
    for (const [index,[tint,outline]] of patches.entries()) {
      const face = outline.map(([x,y])=>[x,y,z-index*.005]);
      for (let i=1;i<face.length-1;i++) mesh.triangle(face[0],face[i],face[i+1],tint,M.drywall);
    }
  }

  function bathroom(mesh,w,d,trim) {
    const x=w/2-2.38, z=d/2-2.32;
    const tile=c('#b7c5c0'), porcelain=c('#f5f2e4'), wall=c('#c8d3c9');
    mesh.floor(x,.019,z,2.15,2.06,tile,M.concrete);
    for (let i=1;i<=5;i++) mesh.floor(x+i*.38,.023,z,.014,2.06,c('#86938d'));
    for (let i=1;i<=5;i++) mesh.floor(x,.023,z+i*.38,2.15,.014,c('#86938d'));
    mesh.box(x,0,z,.10,2.48,2.07,wall,M.drywall);
    mesh.box(x+.10,.02,z,.05,.11,2.07,trim,M.oak);
    mesh.box(x+1.19,0,z,.96,2.48,.10,wall,M.drywall);
    for (const post of [.09,1.15]) mesh.box(x+post,0,z-.03,.075,2.08,.17,trim,M.oak);
    mesh.box(x+.09,2.06,z-.03,1.14,.09,.17,trim,M.oak);
    mesh.box(x+.10,2.15,z,1.09,.33,.10,wall,M.drywall);
    mesh.box(x+.23,.05,z+1.56,.83,.75,.46,c('#858f80'),M.oak);
    mesh.box(x+.19,.80,z+1.51,.91,.07,.51,porcelain);
    mesh.round(x+.65,.865,z+1.76,.205,.165,.018,c('#b2c5bd'),-1,14);
    mesh.box(x+.62,.87,z+1.94,.045,.13,.05,steel);
    mesh.box(x+.62,.986,z+1.85,.045,.026,.14,steel);
    mesh.box(x+.25,1.09,z+2.00,.77,.81,.04,trim);
    mesh.box(x+.29,1.13,z+1.982,.69,.73,.025,c('#94a9ab'),M.glass);
    mesh.box(x+.34,2.02,z+1.93,.59,.09,.12,c('#ffebc4'),M.lamp);
    mesh.round(x+1.60,.045,z+1.48,.14,.23,.33,porcelain,-1,14);
    mesh.round(x+1.60,.35,z+1.45,.235,.257,.09,porcelain,-1,16);
    mesh.round(x+1.60,.44,z+1.45,.17,.17,.009,c('#b4c3bc'),-1,16);
    mesh.box(x+1.35,.40,z+1.75,.49,.41,.25,porcelain);
    mesh.box(x+1.32,.81,z+1.72,.55,.045,.30,porcelain);
  }

  function homeInterior(mesh, lot) {
    const { w,d } = lot;
    const cabin = lot.type === 'cabin';
    const paint = cabin ? wood : c('#ddd4c4');
    const mat = cabin ? M.cedar : M.drywall;
    const trim = cabin ? c('#9f8568') : c('#eee4cc');
    const rear = d/2-.247;
    mesh.box(-w/2+.224,0,rear,w-.448,2.49,.036,paint,mat);
    mesh.box(-w/2+.224,.012,rear-.047,w-.448,.115,.048,trim,M.oak);
    for (const x of [-w/2+.217,w/2-.257]) {
      mesh.box(x,0,-d/2+.213,.041,2.49,d-.428,paint,mat);
      mesh.box(x-.015,.012,-d/2+.215,.075,.115,d-.43,trim,M.oak);
    }
    mesh.at(0,0,-d/2+.267,Math.PI,()=>{
      for (const side of [-1,1]) window(mesh,side*w*.27-1.01,.92,0,2.02,1.02);
      if (lot.id==='ramble') {
        mesh.box(w*.27-.52,.913,-.068,.71,.052,.013,c('#a2a899'));
        mesh.box(w*.27-.48,.932,-.074,.18,.025,.012,c('#7f8e80'));
      }
    });
    mesh.box(-w / 2 + .24, 0, .6, w / 2 - .98, 2.47, .12, paint, mat);
    mesh.box(.84, 0, .6, w / 2 - 1.08, 2.47, .12, paint, mat);
    mesh.box(-w / 2 + .25, .01, -d / 2 + .76, 2.63, .61, .81, [.78, .82, .76], M.cloth);
    mesh.box(-w / 2 + .25, .53, -d / 2 + .76, 2.63, .42, .27, [.78, .82, .76], M.cloth);
    mesh.box(-w / 2 + .25, .55, -d / 2 + 1.01, .23, .23, .55, [.80, .85, .81], M.cloth);
    mesh.box(-w / 2 + 2.65, .55, -d / 2 + 1.01, .23, .23, .55, [.80, .85, .81], M.cloth);
    for (const [offset,tint] of [[.62,'#a77853'],[1.38,'#667d72'],[2.04,'#cab29b']]) {
      mesh.box(-w/2+offset,.61,-d/2+1.01,.36,.28,.17,c(tint),M.cloth);
    }
    const lampX = -w/2+.43;
    const lampZ = -d/2+1.89;
    mesh.round(lampX,.014,lampZ,.17,.15,.03,steel,-1,10);
    mesh.round(lampX,.041,lampZ,.024,.024,1.42,steel,-1,8);
    mesh.round(lampX,1.43,lampZ,.195,.122,.25,c('#ecd7b2'),M.cloth,12);
    mesh.round(lampX,1.447,lampZ,.155,.155,.025,c('#ffecd0'),M.lamp,12);
    table(mesh, -w / 2 + 2.3, 0, -.88, 1.28, .62, .44);
    mesh.box(-w/2+2.05,.444,-1.04,.29,.039,.19,c('#6e7e75'),M.cloth);
    mesh.box(-w/2+2.055,.453,-1.03,.277,.021,.176,c('#e1d5ba'));
    mesh.floor(-w / 2 + .55, .021, -2.12, 3.12, 1.85, c('#b79574'), M.cloth);
    kitchen(mesh,w,d);
    table(mesh, w / 2 - 2.38, 0, -1.11, 1.37, .84);
    chair(mesh, w / 2 - 2.4, 0, -.39, 0, [.94, .86, .76]);
    papers(mesh, w / 2 - 2.69, .826, -1.13);
    mesh.round(w/2-2.38,2.26,-1.11,.021,.024,.231,steel,-1,8);
    mesh.round(w/2-2.38,2.099,-1.11,.28,.09,.182,c('#c5ac8d'),M.oak,12);
    mesh.round(w/2-2.38,2.105,-1.11,.238,.239,.015,c('#f9e9c7'),M.lamp,12);
    bathroom(mesh,w,d,trim);
    mesh.box(-w / 2 + .41, .05, d / 2 - 2.20, 1.62, .37, 1.87, wood, M.oak);
    mesh.box(-w / 2 + .42, .41, d / 2 - 2.19, 1.60, .20, 1.84, c('#b3b7a8'), M.cloth);
    mesh.box(-w / 2 + .51, .61, d / 2 - 2.03, .62, .12, .37, ivory, M.drywall);
    waterHeater(mesh,w/2-.63,-d/2+1.58);
    if (lot.id === 'ramble') {
      window(mesh,-.64,1.06,rear-.045,1.28,.64);
      waterMark(mesh,rear-.049);
      mesh.floor(-1.20,.009,d/2-2.05,2.33,1.79,c('#b8b0a0'),M.concrete);
      mesh.box(-.64,.012,d/2-1.61,1.34,.039,1.28,c('#635746'),M.oak);
      mesh.box(.37,.094,d/2-1.45,.18,.039,.11,steel);
      const damp = [[-.68,-.32],[-.72,-.67],[-.81,-.94],[-.77,-1.18],[-.92,-1.30],[-1.09,-1.02],[-1.12,-.68],[-1.01,-.38]];
      for (let i=0;i<damp.length;i++) {
        const [x,z]=damp[i], [nx,nz]=damp[(i+1)%damp.length];
        mesh.triangle([-.89,.018,d/2-.79],[x,.018,d/2+z],[nx,.018,d/2+nz],c('#736b59'),M.concrete);
      }
      const pipe = c('#9aa49d');
      mesh.box(-w/2+.54,.48,d/2+.02,.097,2.21,.12,pipe);
      mesh.box(-w/2+.52,1.04,d/2+.136,.136,.047,.026,steel);
      beam(mesh,[-w/2+.59,.19,d/2+.06],[-w/2+.74,.05,d/2+.79],.095,pipe);
      mesh.floor(-w/2+.28,-.047,d/2+.09,.76,1.13,c('#78664d'),M.gravel);
    } else if (lot.id==='range') {
      mesh.box(w/2-.309,1.06,-d/2+1.46,.093,.44,.39,c('#797d76'));
      mesh.box(w/2-.318,1.14,-d/2+1.54,.035,.25,.19,c('#555956'));
      mesh.box(w/2-1.81,.016,d/2-.73,1.21,.021,.52,c('#706252'),M.oak);
    }
    if (cabin) {
      mesh.round(w/2-.58,.02,-2.03,.23,.22,.79,c('#497682'),-1,10);
      mesh.round(w/2-.58,.81,-2.03,.055,.048,.14,steel,-1,8);
      mesh.box(w/2-.64,.938,-2.07,.118,.070,.077,c('#b09265'));
    }
  }


  function officePorchLayout(w,d) {
    const front = -d/2;
    const z = front-2.16;
    const end = w/2+1.9;
    return { z,end,
      steps:[[-1.04,-.55,z-.52,2.08,.32,.55],[-1.11,-.62,z-.92,2.22,.24,.43],[-1.24,-.71,z-2.50,2.48,.15,1.68]],
    };
  }

  function officePorch(mesh, front, { z,end,steps }) {
    const planks = [.71,.63,.52];
    const painted = c('#83928b');
    const fascia = c('#c3cab9');
    mesh.box(-3.36,-.29,z,6.72,.29,2.24,planks,M.cedar);
    for (const step of steps) mesh.box(...step,[.88,.85,.79],M.concrete);
    for (const side of [-1,1]) {
      mesh.box(side*3.10-.10,0,z+.09,.20,2.27,.20,painted,M.siding);
      mesh.box(side*2.1-1.05,.86,z+.13,2.1,.095,.102,painted,M.siding);
      for (let i=0;i<6;i++) {
        mesh.box(side*(1.17+i*.35)-.029,.10,z+.155,.058,.78,.06,painted,M.siding);
      }
    }
    // A gabled shelter and a side ramp are characteristic of the Pokegama storefront.
    mesh.quad([-3.6,2.26,z-.15],[-3.6,2.26,front+.25],[0,3.55,front+.25],[0,3.55,z-.15],
      [.80,.84,.82],M.shingles,2.15,2.8);
    mesh.quad([0,3.55,z-.15],[0,3.55,front+.25],[3.6,2.26,front+.25],[3.6,2.26,z-.15],
      [.80,.84,.82],M.shingles,2.15,2.8);
    const signZ = z-.18;
    mesh.triangle([-3.54,2.26,z-.13],[3.54,2.26,z-.13],[0,3.55,z-.13],painted,M.siding,
      [[0,0],[4.4,0],[2.2,1.8]]);
    beam(mesh,[-3.62,2.24,signZ],[0,3.57,signZ],.14,fascia);
    beam(mesh,[3.62,2.24,signZ],[0,3.57,signZ],.14,fascia);
    mesh.quad([2.03,2.30,signZ],[-2.03,2.30,signZ],[-2.03,2.96,signZ],[2.03,2.96,signZ],
      ivory,M.sign,1,.5);
    mesh.quad([3.32,0,z+.28],[end,-.58,z+.28],[end,-.58,z+1.73],[3.32,0,z+1.73],planks,M.cedar,3,1);
    for (const k of [z+.29,z+1.72]) {
      beam(mesh,[3.35,.93,k],[end,.35,k],.105,painted);
      for (let x = 3.55; x < end; x += .67) {
        const y = -.58*(x-3.32)/(end-3.32);
        mesh.box(x,y+.019,k-.043,.08,.92,.08,painted,M.siding);
      }
    }
    mesh.box(-7.30,-.60,front-1.7,3.20,.55,1.40,[.83,.84,.80],M.granite);
    mesh.box(-7.24,-.084,front-1.62,3.08,.046,1.22,[.51,.49,.42],M.gravel);
    for (let i=0;i<3;i++) plant(mesh,-6.7+i*.93,-.12,front-.91,.66);
  }

  function featured(mesh, lot) {
    const { w, d, type } = lot;
    const office = type === 'office';
    const cabin = type === 'cabin';
    const brick = type === 'brick';
    const h = office ? 3.11 : type === 'brick' ? 5.60 : 2.74;
    const wall = lot.id === 'range' ? [.94,.88,.78] : lot.id === 'hoyt' ? [.51,.63,.66] : office ? [.58,.64,.64] : brick ? [.97,.90,.85] : cabin ? [.86,.68,.48] : [.80,.88,.76];
    const material = brick ? M.brick : cabin ? M.cedar : M.siding;
    const width = office ? 1.62 : 1.04;
    const wallDepth = .21;
    const front = -d / 2;
    mesh.box(-w / 2, -1.55, front, w, 1.55, d, [.78,.77,.73], M.concrete);
    mesh.floor(-w / 2 + .14, .003, front + .16, w - .28, d - .32,
      office ? [.82,.73,.61] : [.92,.83,.70], M.oak, 1.55);
    mesh.box(-w / 2, 0, d / 2 - wallDepth, w, h, wallDepth, wall, material, 1.25);
    for (const x of [-w / 2, w / 2 - wallDepth]) {
      mesh.box(x, 0, front, wallDepth, h, d, wall, material, 1.25);
    }
    for (const x of [-w / 2, width / 2]) {
      mesh.box(x, 0, front, (w - width) / 2, h, wallDepth, wall, material, 1.25);
    }
    mesh.box(-width / 2, 2.16, front, width, h - 2.16, wallDepth, wall, material, 1.25);
    mesh.box(-w / 2 + .18, .08, front + .221, (w - width) / 2 - .18, h - .2, .027,
      [.88,.84,.76], M.drywall);
    mesh.box(width / 2, .08, front + .221, (w - width) / 2 - .18, h - .2, .027,
      [.88,.84,.76], M.drywall);
    door(mesh, -width / 2, front + .038, width, cabin ? c('#715c46') : c('#556058'), office?'outside':true);
    if (!office) landing(mesh, width + .77, front, 0, 1.38);
    for (const s of [-1, 1]) {
      const windowWidth = office ? 3.88 : 2.02;
      window(mesh, s * w * .27 - windowWidth / 2, office ? .83 : .92, front, windowWidth, office ? 1.39 : 1.02);
      if (type === 'brick') window(mesh, s * w * .27 - 1.0, 3.43, front, 2, 1.25);
      mesh.at(s * (w / 2 + .01), 0, .14, -s * Math.PI / 2, () => {
        window(mesh, -1.32, 1.06, 0, 2.64, 1.1);
      });
    }
    if (office) {
      roof(mesh, w, d, h, 2.0, [.74,.80,.82]);
      officePorch(mesh,front,lot.porch);
      mesh.box(-w / 2 + .23, 2.89, front + .19, w - .46, .062, d - .42, [.84,.83,.78], M.drywall);
      mesh.box(-w / 2 + .23, .075, d / 2 - .28, w - .46, 2.78, .065, [.87,.85,.79], M.drywall);
      for (const x of [-w/2+.239,w/2-.283]) {
        mesh.box(x,.075,front+.239,.045,2.78,d-.48,[.86,.84,.78],M.drywall);
      }
      officeInterior(mesh);
    } else {
      const rise = cabin ? 2.5 : 1.68;
      roof(mesh, w, d, h, rise);
      mesh.box(2.19, h + .29, 1.9, .55, 1.80, .52, [.80,.83,.79], M.brick, .84);
      mesh.box(-w / 2 + .14, 2.49, front + .18, w - .28, .06, d - .29, [.76,.77,.73], M.drywall);
      homeInterior(mesh,lot);
      if (lot.id === 'range') {
        const pitch = (x) => h+rise*(1-x/(w/2+.32))+.022;
        mesh.quad([2.29,pitch(2.29),.94],[2.86,pitch(2.86),.94],[2.86,pitch(2.86),1.61],
          [2.29,pitch(2.29),1.61],[.68,.61,.54],M.cedar);
        mesh.quad([2.48,pitch(2.48),1.65],[2.83,pitch(2.83)+.10,1.65],[2.83,pitch(2.83)+.10,2.11],
          [2.48,pitch(2.48),2.11],steel);
      }
      if (cabin) {
        mesh.box(-w / 2 + .16, -.27, front - 2.5, w - .32, .27, 2.64, wood, M.cedar);
        for (const x of [-w / 2 + .42, w / 2 - .42]) mesh.box(x, 0, front - 2.21, .16, 2.37, .16, wood, M.oak);
        mesh.quad([-w / 2, 2.22, front - 2.55], [w / 2, 2.22, front - 2.55],
          [w / 2, 2.59, front + .03], [-w / 2, 2.59, front + .03], [.87,.88,.83], M.shingles, w, 2);
      }
    }
    if (!office) {
      mesh.box(-1.25,-.18,front-3.76,2.5,.15,2.45,[.88,.88,.83],M.concrete);
      const x = w / 2 + 1.3;
      mesh.box(x, -.06, front - 4.12, .085, 1.48, .085, ivory);
      mesh.box(x - .49, 1.21, front - 4.13, 1.0, .07, .08, ivory);
      mesh.box(x - .37, .80, front - 4.15, .74, .38, .065, c('#587d70'));
    }
  }

  const houseTints = ['#d5cbb5','#b4c3be','#d4d6ce','#b5a696','#d9dac3','#92a4a1'].map(c);

  function house(mesh, r, dense, low = false) {
    const w = 6.9 + r() * 5.0;
    const d = 6.8 + r() * 3.4;
    const h = r() < .24 ? (dense ? 6.05 : 4.65) : 2.67 + r() * .63;
    const brick = dense && r() < .48;
    const tint = houseTints[Math.floor(r() * houseTints.length)];
    const mat = brick ? M.brick : M.siding;
    mesh.box(-w / 2, -1.17, -d / 2, w, 1.52, d, [.81,.79,.73], M.concrete);
    mesh.box(-w / 2, .35, -d / 2, w, h - .35, d, tint, mat, 1.37);
    roof(mesh, w, d, h, 1.37 + r() * 1.13, [.78 + r() * .19,.88,.86]);
    const z = -d / 2;
    const leftWindow=1.21+r()*.5;
    const rightWindow=1.23+r()*.54;
    const chimney=r()<.4;
    if (low) {
      mesh.box(-.46,.35,z-.037,.92,2.1,.05,c('#54615b'));
      mesh.box(-w*.34,1.03,z-.041,1.52,.96,.04,glass,M.glass);
      mesh.box(w*.23,1.03,z-.041,1.50,.96,.04,glass,M.glass);
      return { w,d };
    }
    door(mesh, -.46, z - .03, .92, c('#68726a'));
    landing(mesh, 1.49, z);
    window(mesh, -w * .34, 1.03, z - .025, leftWindow, .93);
    window(mesh, w * .23, 1.03, z - .025, rightWindow, .93);
    if (h > 4) {
      window(mesh, -w * .34, 3.35, z - .03, 1.21, .96);
      window(mesh, w * .23, 3.35, z - .03, 1.23, .96);
    }
    if (chimney) {
      mesh.box(w * .26, h - .10, d * .19, .54, 1.84, .47, [.90,.84,.77], M.brick, .86);
    }
    return { w, d };
  }

  function pine(mesh, h, r, low = false) {
    const width = h * (.17 + r() * .059);
    const spreading = width/h>.205;
    mesh.round(0, -.21, 0, h * .034, h * .009, h * .91, [.80,.80,.72], M.bark, 6);
    const shades = [[.87,1.10,.80], [.93,1.20,.89], [.94,1.13,.80]];
    const offset = r() * 6.28;
    const tiers = low ? [0,2,4] : [0,1,2,3,4];
    for (const tier of tiers) {
      const y = h * ((spreading?.26:.40) + tier * (spreading?.124:.097));
      const rad = width * (1 - tier * (spreading?.136:.167));
      const top = h * ((spreading?.62:.73) + tier * (spreading?.093:.068));
      const n = low ? 6 : 8;
      for (let i = 0; i < n; i++) {
        const a = offset + (i + tier / 3) * Math.PI * 2 / n;
        const b = a + Math.PI * 2 / n;
        const t = [.88,.58,1,.71][i % 4];
        const u = [.88,.58,1,.71][(i + 1) % 4];
        mesh.triangle([Math.cos(b) * rad * u, y + h * (.03 + .035 * u), Math.sin(b) * rad * u],
          [Math.cos(a) * rad * t, y + h * (.03 + .035 * t), Math.sin(a) * rad * t],
          [0, top, 0], shades[tier % 3], M.needles, [[0,0],[.91,0],[.54,1.17]]);
      }
    }
  }

  function birch(mesh, h, r, low = false) {
    mesh.round(0, -.15, 0, .17, .07, h * .87, [.85,.82,.74], M.drywall, 5);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.399;
      const end = [Math.cos(a) * h * .126, h * (.58 + r() * .32), Math.sin(a) * h * .126];
      if (low && i>=3) continue;
      beam(mesh, [0,h * (.34 + i * .07),0], end, .08, [.72,.70,.62]);
      mesh.ellipsoid(...end, h*.17, h*.17, h*.16, [.98,1.30,.79], M.needles, 6, 3);
    }
  }

  function pole(mesh, tall = 7.0, power = false) {
    mesh.round(0, -.15, 0, .13, .068, tall, power ? [.67,.68,.58] : steel, power ? M.bark : -1, 7);
    if (power) {
      mesh.box(-.99, tall - .54, -.049, 1.98, .10, .10, steel);
      for (const s of [-1, 1]) mesh.round(s * .86, tall - .44, 0, .085, .06, .18, steel, -1, 5);
    } else {
      beam(mesh, [0,tall-.43,0], [0,tall-.12,-1.28], .073, steel);
      mesh.box(-.11, tall - .187, -1.52, .22, .086, .47, steel);
      mesh.box(-.079, tall - .202, -1.47, .158, .016, .36, c('#e0cf9c'), M.lamp);
    }
  }

  function suv(tint, compact = false) {
    const mesh = new Mesh();
    const width = compact ? .87 : .98;
    const long = compact ? 1.93 : 2.26;
    const base = compact ? .68 : .91;
    const top = compact ? 1.39 : 1.74;
    const hood = long * .59;
    const darkTrim = c('#303432');
    mesh.box(-width, .34, -long, width * 2, base - .34, long * 2, tint,M.paint);
    mesh.box(-width * .97, .30, -long - .079, width * 1.94, .16, .17, darkTrim);
    mesh.box(-width * .96, .29, long - .068, width * 1.92, .16, .17, darkTrim);
    mesh.box(-width * .94, base - .12, -long - .014, width * 1.88, .12, .068, darkTrim);
    mesh.box(-.33, base - .10, -long - .054, .66, .093, .067, steel);
    mesh.box(-.152, .44, -long - .052, .304, .10, .016, ivory);
    mesh.box(-.152, .49, long + .012, .304, .10, .016, ivory);
    if (!compact) {
      mesh.quad([-.148,.448,-long-.071],[.148,.448,-long-.071],[.148,.55,-long-.071],[-.148,.55,-long-.071],ivory,M.plate);
      mesh.quad([.148,.497,long+.031],[-.148,.497,long+.031],[-.148,.604,long+.031],[.148,.604,long+.031],ivory,M.plate);
    }
    mesh.quad([-width*.93,base,-hood], [width*.93,base,-hood], [width*.73,top,-hood+.57],
      [-width*.73,top,-hood+.57], glass, M.glass);
    mesh.quad([width*.93,base,long-.15], [-width*.93,base,long-.15], [-width*.73,top,long-.49],
      [width*.73,top,long-.49], glass, M.glass);
    mesh.box(-width*.74, top - .02, -hood+.55, width*1.48, .081, long+hood-.97, tint,M.paint);
    for (const side of [-1,1]) {
      const x = side * width;
      mesh.quad([x*.93,base,-hood],[x*.73,top,-hood+.57],[x*.73,top,long-.49],[x*.93,base,long-.15],
        glass, M.glass);
      beam(mesh, [x*.94,base,.19],[x*.735,top,.25],.079,tint);
      mesh.box(x - .065, .35, -long+.3, .13, .14, long * 2 - .6, darkTrim);
      mesh.box(side * (width - .19) - .13, base-.075, -long-.06, .26, .11, .045, c('#f2efdd'), M.lamp);
      mesh.box(side * (width - .135) - .10, base-.05, long-.03, .20, .145, .085, c('#902e23'), M.lamp);
      mesh.box(x * 1.05 - .08, base+.20, -hood+.44, .16, .10, .20, tint);
      for (const t of [-1,1]) {
        const z = t * long * .632;
        mesh.ellipsoid(x * .91, .365, z, .169,.368,.368, c('#242726'), M.cloth, 12, 6);
        mesh.ellipsoid(x * 1.047, .365, z, .035,.207,.207, steel, -1, 12, 6);
        mesh.ellipsoid(x * 1.074, .365, z, .017,.077,.077, darkTrim, -1, 8, 4);
      }
    }
    return mesh;
  }

  function cockpit() {
    const mesh = new Mesh();
    const dash = c('#30373a');
    const cloth = c('#525651');
    const trim = c('#7a847c');
    mesh.box(-.948,.65,-1.45,1.896,.42,.55,dash,M.cloth);
    mesh.box(-.938,1.07,-1.42,1.876,.057,.51,dash,M.cloth);
    mesh.box(-.698,1.13,-1.31,.60,.16,.23,dash);
    mesh.box(-.666,1.155,-1.075,.536,.105,.021,c('#182528'),M.glass);
    mesh.box(.028,1.173,-1.295,.216,.113,.105,dash);
    mesh.box(.033,1.179,-1.188,.206,.099,.007,c('#1c2a29'));
    mesh.box(-.380,1.201,-1.050,.132,.012,.012,c('#cdb47c'),M.lamp);
    mesh.box(-.145,.908,-1.031,.305,.194,.124,c('#182120'));
    mesh.box(-.123,.939,-.904,.254,.127,.026,c('#456b65'),M.glass);
    mesh.box(-.092,1.016,-.875,.173,.009,.007,c('#a3cfab'),M.lamp);
    mesh.box(-.167,.35,-.94,.334,.60,1.39,dash,M.cloth);
    mesh.box(-.105,.95,-.55,.21,.024,.34,trim);
    mesh.round(0,.975,-.39,.043,.041,.06,trim,-1,8);
    for (const side of [-1,1]) {
      const x = side*.86;
      mesh.box(x-.07,.47,-.94,.14,.56,1.62,cloth,M.cloth);
      mesh.box(x-.099,1.03,-.90,.197,.054,1.48,dash);
      beam(mesh,[x,1.059,-1.39],[side*.725,1.78,-.72],.084,dash);
      mesh.box(side*.553-.14,1.085,-1.307,.28,.009,.099,c('#252c2b'));
      for (let i=0;i<6;i++) {
        mesh.box(side*.553-.133+i*.043,1.097,-1.286,.015,.008,.057,trim);
      }
    }
    const wheel = (angle) => [-.426+Math.cos(angle)*.179,1.239+Math.sin(angle)*.179,-.767-Math.sin(angle)*.06];
    for (let i=0;i<16;i++) beam(mesh,wheel(i*Math.PI/8),wheel((i+1)*Math.PI/8),.039,c('#222526'));
    for (const spokes of [.42,2.70,4.72]) {
      beam(mesh,[-.426,1.239,-.778],wheel(spokes),.051,dash);
    }
    mesh.ellipsoid(-.426,1.24,-.763,.073,.062,.035,dash,-1,10,6);
    mesh.box(-.155,1.643,-1.161,.31,.086,.026,c('#464b48'),M.glass);
    return mesh;
  }

  function dashboardDigit(value) {
    const mesh=new Mesh(), lit=c('#baeace');
    const strokes=[[0,.069,.036,.008],[.031,.036,.007,.035],[.031,.004,.007,.033],
      [0,0,.036,.008],[-.002,.004,.007,.033],[-.002,.036,.007,.035],[0,.034,.036,.008]];
    const digits=['012345','12','01643','01623','5612','05623','056432','012','0123456','012356'];
    for (const index of digits[value]) {
      const [x,y,w,h]=strokes[Number(index)];
      mesh.box(x,y,0,w,h,.003,lit,M.lamp);
    }
    return mesh;
  }

  function mailbox(mesh) {
    mesh.box(-.069,-.064,-.056,.138,1.12,.112,wood,M.oak);
    mesh.box(-.202,.89,-.171,.404,.203,.386,c('#586764'),M.paint);
    mesh.box(-.177,1.09,-.171,.354,.072,.386,c('#586764'),M.paint);
    mesh.box(-.181,.908,-.193,.362,.176,.027,c('#6f8074'),M.paint);
    mesh.box(.205,1.004,-.038,.033,.16,.041,c('#974a34'));
    mesh.box(.209,1.149,-.106,.028,.057,.101,c('#974a34'));
  }

  function streetMarker(mesh) {
    mesh.round(0,-.045,0,.041,.037,2.45,steel,-1,7);
    mesh.box(-.51,2.14,-.051,1.02,.24,.076,c('#386253'));
    mesh.box(-.45,2.217,-.055,.89,.023,.006,c('#a2baa0'));
    mesh.box(-.052,2.375,-.34,.082,.23,.69,c('#406b59'));
  }

  function shrub(mesh) {
    for (const [x,y,z,w] of [[0,.21,0,.27],[-.21,.26,.08,.21],[.23,.28,-.06,.24],[.03,.41,.07,.23]]) {
      mesh.ellipsoid(x,y,z,w,w*.77,w*.90,c('#758767'),M.needles,7,4);
    }
  }

  function person(agent,step = 0) {
    const mesh = new Mesh();
    const short = agent.style === 'small';
    const longBeard = agent.style === 'bald-long-beard';
    const heavy = agent.style === 'heavy';
    const carryingTV = agent.id === 'brother-malcolm';
    const h = short ? .78 : heavy ? 1.065 : agent.id === 'gaige' ? 1.045 : 1;
    const jacket = c(agent.shirt);
    const hair = c(agent.hair);
    const skin = c(agent.skin || '#c69173');
    const denim = c('#384653');
    const shoe = c('#3a3532');
    const torso = heavy ? .363 : agent.style === 'long' || agent.style === 'bob' || short ? .195 : .215;
    for (const side of [-1, 1]) {
      const x = side * (heavy ? .137 : .10);
      const stride = step*side*.15;
      mesh.ellipsoid(x,.076+Math.max(0,stride)*.28,-.044+stride,heavy?.113:.087,.071,.153,shoe,-1,8,4);
      const leg = heavy ? .133 : .091;
      mesh.ellipsoid(x,.47*h,stride*.47,leg,.37*h,leg,denim,-1,8,4);
      if (carryingTV) {
        mesh.ellipsoid(side*.239,1.12,-.018,.070,.178,.077,jacket,-1,10,6);
        beam(mesh,[side*.253,1.002,-.026],[side*.302,1.133,-.269],.095,jacket);
        mesh.ellipsoid(side*.302,1.147,-.290,.043,.050,.055,skin,-1,8,5);
      } else {
        mesh.ellipsoid(side*torso*.91,1.201*h,-.008,.071,.092*h,.077,jacket,M.cloth,9,5);
        mesh.ellipsoid(side*(torso+.034),1.04*h,-.015-stride*.40,heavy?.105:.064,.27*h,heavy?.11:.068,jacket,-1,8,5);
        mesh.ellipsoid(side*(torso+.038),.795*h,-.026-stride*.67,heavy?.060:.048,.078*h,.041,skin,-1,8,5);
      }
    }
    mesh.ellipsoid(0,1.067*h,heavy?-.016:0,torso,.313*h,heavy?.246:.131,jacket,-1,12,7);
    if (!carryingTV) {
      const collar = c(agent.id==='mara'?'#d0b8a1':'#b1ac97');
      mesh.triangle([-.067,1.32*h,-.070],[.068,1.32*h,-.070],[.009,1.194*h,-.129],collar,M.cloth);
      const depth=heavy?.246:.131;
      const seam=jacket.map(v=>v*.68);
      const flap=jacket.map(v=>Math.min(1,v*1.14));
      for (const side of [-1,1]) {
        mesh.triangle([side*.054,1.313*h,-depth*.58],[side*.121,1.258*h,-depth*.70],
          [side*.028,1.13*h,-depth*1.02],flap,M.cloth);
      }
      mesh.box(-.005,.915*h,-depth-.006,.011,.256*h,.012,seam);
      mesh.box(torso*.32,1.057*h,-depth*.92,torso*.38,.056*h,.013,seam,M.cloth);
      mesh.box(torso*.31,1.103*h,-depth*.94,torso*.40,.019*h,.017,flap,M.cloth);
      if (agent.id==='mara') {
        mesh.ellipsoid(0,1.294*h,-.043,.092,.063,.089,c('#c98654'),M.cloth,10,5);
        beam(mesh,[.032,1.284*h,-.116],[.063,1.151*h,-.139],.053,c('#c98654'),M.cloth);
      }
    }
    if (carryingTV) {
      mesh.box(-.305,1.029,-.325,.610,.346,.088,charcoal);
      mesh.box(-.290,1.051,-.333,.580,.305,.009,c('#2b3b44'),M.glass);
      mesh.box(-.168,1.108,-.243,.336,.171,.029,c('#45484b'));
      mesh.box(.260,1.038,-.334,.014,.007,.008,c('#73c4a7'),M.lamp);
    }
    if (agent.id === 'tanya') {
      const scarf = c('#f1d9b7');
      mesh.ellipsoid(0,1.302,-.036,.083,.067,.089,scarf,-1,10,5);
      beam(mesh,[-.039,1.284,-.108],[.032,1.106,-.124],.042,scarf);
    }
    mesh.round(0, 1.268 * h, -.008, .066, .059, .236 * h, skin, -1, 8);
    mesh.ellipsoid(0, 1.55 * h, -.005, .101, .139 * h, .112, skin, -1, 14, 8);
    mesh.ellipsoid(0, 1.555*h, -.112, .027, .037, .037, skin, -1, 8, 5);
    for (const side of [-1, 1]) {
      mesh.ellipsoid(side * .102, 1.55*h, -.004, .024, .043, .025, skin, -1, 6, 4);
      mesh.ellipsoid(side*.040,1.574*h,-.103,.019,.009,.009,c('#dcd6bf'),-1,8,5);
      mesh.ellipsoid(side*.039,1.573*h,-.111,.008,.008,.004,c('#413f38'),-1,8,5);
      mesh.box(side*.041-.017,1.592*h,-.111,.036,.008,.012,hair);
    }
    mesh.ellipsoid(.003,1.505*h,-.109,.026,.006,.008,c('#895e52'),-1,8,4);
    if (agent.style === 'bald' || longBeard) {
      for (const side of [-1,1]) mesh.ellipsoid(side * .087, 1.583*h, .033, .027,.076,.079,hair,-1,8,5);
      if (longBeard) mesh.ellipsoid(0,1.534*h,.063,.096,.073*h,.063,hair,-1,12,5);
    } else {
      mesh.ellipsoid(0, 1.648*h, .015, .107,.067,.110,hair,-1,12,6);
      if (['long','bob','small'].includes(agent.style)) {
        mesh.ellipsoid(0, 1.498*h, .066, .103, agent.style === 'long' ? .218 : .127, .067, hair,-1,12,6);
        for (const side of [-1,1]) mesh.ellipsoid(side*.083,1.522*h,.024,.039,.132,.091,hair,-1,8,5);
      }
    }
    if (agent.style === 'broccoli') {
      for (const [x, y, z] of [[-.063,.011,-.045],[.048,.032,-.047],[-.006,.059,.006],[.068,-.01,.004],[-.067,.019,.048]]) {
        mesh.ellipsoid(x, 1.677*h+y,z,.065,.063,.069,hair,-1,8,5);
      }
      mesh.ellipsoid(-.118,1.516*h,-.005,.009,.011,.010,ivory,-1,6,4);
    }
    if (longBeard) {
      const beard = c('#392921');
      const highlights = c('#46352c');
      mesh.ellipsoid(0,1.395*h,-.093,.128,.166*h,.109,beard,-1,14,8);
      mesh.ellipsoid(0,1.276*h,-.141,.101,.145*h,.086,beard,-1,14,7);
      for (const side of [-1,1]) {
        mesh.ellipsoid(side*.077,1.446*h,-.066,.052,.103*h,.087,beard,-1,10,6);
        mesh.ellipsoid(side*.048,1.32*h,-.169,.052,.127*h,.064,highlights,-1,10,6);
        mesh.ellipsoid(side*.027,1.522*h,-.145,.049,.018*h,.036,highlights,-1,8,4);
      }
    } else if (agent.style === 'beard' || agent.style === 'shortbeard') {
      mesh.ellipsoid(0,1.475*h,-.052,.090,.073,.082,
        agent.style === 'beard' ? c('#261f1c') : c('#9b795c'), -1,12,6);
    } else if (heavy) {
      mesh.ellipsoid(0,1.454*h,-.062,.108,.096,.091,c('#8e8e88'),-1,12,7);
      mesh.ellipsoid(0,1.521*h,-.127,.067,.027,.034,hair,-1,10,5);
    }
    return mesh;
  }

  function yardSign(mesh) {
    const post = c('#efece2');
    mesh.box(-.62,0,-.05,.09,1.62,.09,post,M.oak);
    mesh.box(-.62,1.53,-.05,1.36,.08,.09,post,M.oak);
    for (const x of [-.44,.56]) mesh.box(x,1.25,-.02,.025,.29,.025,steel);
    mesh.box(-.5,.66,-.02,1.18,.6,.05,c('#8f1f19'));
    const z = -.035, x0 = -.47, x1 = .65, y0 = .69, y1 = 1.23;
    mesh.triangle([x1,y0,z],[x0,y0,z],[x0,y1,z],ivory,M.sign,[[0,.5],[1,.5],[1,1]]);
    mesh.triangle([x1,y0,z],[x0,y1,z],[x1,y1,z],ivory,M.sign,[[0,.5],[1,1],[0,1]]);
    return mesh;
  }

  function lockedDoor(lot) {
    const mesh = new Mesh();
    mesh.at(lot.x,lot.y,lot.z,lot.yaw,() => {
      const z = -lot.d / 2 + .035;
      mesh.box(-.52, .012, z, 1.04, 2.15, .063, lot.type === 'cabin' ? c('#6e5136') : c('#58635b'), M.oak);
      mesh.box(-.37, 1.23, z-.025, .74, .68, .027, glass, M.glass);
      mesh.box(.34, .96, z-.035, .085, .068, .068, steel);
      mesh.box(.37, .82, z-.053, .075, .083, .056, charcoal);
    });
    return mesh;
  }

  function loggingTruck() {
    const mesh=new Mesh();
    const paint=c('#84917e');
    mesh.box(-1.17,.55,-5.4,2.34,.45,10.8,charcoal);
    mesh.box(-1.17,.93,-5.35,2.34,1.12,2.96,paint);
    mesh.box(-1.12,1.98,-3.86,2.24,1.24,1.70,paint);
    mesh.box(-.99,2.13,-3.878,1.98,.79,.026,glass,M.glass);
    mesh.box(-1.23,.70,-5.54,2.46,.25,.21,steel);
    mesh.box(-.73,1.18,-5.37,1.46,.69,.043,charcoal);
    mesh.box(-1.14,.95,-.91,2.28,.21,6.18,steel);
    for (const side of [-1,1]) {
      mesh.box(side*.94-.12,1.38,-5.406,.24,.19,.056,c('#fff3cf'),M.lamp);
      mesh.box(side*.94-.13,.79,5.40,.26,.17,.053,c('#a22822'),M.lamp);
      for (const z of [-4.43,-2.18,3.2,4.45]) {
        mesh.ellipsoid(side*1.05,.52,z,.205,.51,.51,charcoal,-1,8,4);
        mesh.ellipsoid(side*1.244,.52,z,.048,.26,.26,steel,-1,8,4);
      }
      for (const z of [-.69,1.8,4.7]) mesh.box(side*1.07-.061,1.1,z,.122,1.35,.12,steel);
    }
    for (let row=0;row<3;row++) {
      for (let i=0;i<5-row;i++) {
        const x=(i-(4-row)/2)*.39;
        const y=1.35+row*.284;
        const rear=4.77+i*.071;
        beam(mesh,[x,y,-.74+row*.15],[x+.018,y,rear],.30,[.82,.75,.64],M.bark);
        mesh.ellipsoid(x+.018,y,rear,.163,.163,.078,wood,M.oak,7,3);
      }
    }
    return mesh;
  }

  function deer() {
    const mesh=new Mesh();
    const coat=c('#9b7550');
    const hoof=c('#3d332b');
    mesh.ellipsoid(0,.94,.09,.29,.31,.67,coat,-1,9,4);
    beam(mesh,[0,.98,-.37],[0,1.44,-.60],.26,coat);
    mesh.ellipsoid(0,1.47,-.70,.174,.181,.295,coat,-1,9,4);
    mesh.ellipsoid(0,1.39,-.94,.104,.079,.092,hoof,-1,7,4);
    mesh.ellipsoid(0,1.04,.65,.094,.13,.145,ivory,-1,6,4);
    for (const side of [-1,1]) {
      mesh.ellipsoid(side*.145,1.63,-.59,.079,.12,.066,coat,-1,7,4);
      for (const z of [-.32,.40]) {
        beam(mesh,[side*.16,.87,z],[side*.19,.095,z+side*.062],.074,coat);
        mesh.box(side*.19-.046,.074,z+side*.062-.039,.091,.089,.10,hoof);
      }
    }
    return mesh;
  }

  Object.assign(ND, { Models: { beam, featured, house, pine, birch, pole, suv, person, lockedDoor, yardSign, loggingTruck, deer,
    officePorchLayout,cockpit,dashboardDigit,mailbox,streetMarker,shrub } });
})();
