'use strict';

(() => {
  const ND = globalThis.ND;
  const F32 = Float32Array;
  const TAU = 2 * Math.PI;
  const white = [1, 1, 1];
  const graphicsKey = 'north-desk-graphics';
  const lightingKey = 'north-desk-lighting';

  function preferredGraphics() {
    try {
      const saved = localStorage.getItem(graphicsKey);
      if (saved === 'low' || saved === 'high') return saved;
    } catch {}
    return 'high';
  }

  function softwareRenderer(gl) {
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : '';
    return /swiftshader|llvmpipe|softpipe|software|warp/i.test(renderer);
  }

  const SURFACE = Object.freeze({
    asphalt: 0, grass: 1, concrete: 2, siding: 3, shingles: 4, brick: 5,
    oak: 6, bark: 7, gravel: 8, water: 9, needles: 10, cedar: 11, drywall: 12,
    granite: 13, boards: 14, cloth: 15, glass: -2, lamp: -3, sign: -4, shade: -5, paint: -6, plate: -7,
  });

  function color(hex) {
    const rgb = Number.parseInt(hex.slice(1), 16);
    return [(rgb >> 16) / 255, ((rgb >> 8) & 255) / 255, (rgb & 255) / 255];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  function unit(v) {
    const len = Math.hypot(...v) || 1;
    return v.map((n) => n / len);
  }

  function angle(yaw, pitch = 0) {
    return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  }

  function frame(eye, yaw, pitch, aspect, fov) {
    const forward = angle(yaw, pitch);
    const right = [Math.cos(yaw), 0, Math.sin(yaw)];
    return { eye, forward, right, up: cross(right, forward), aspect, zoom: 1 / Math.tan(fov * 0.5) };
  }

  function project(camera, point) {
    const d = point.map((n, i) => n - camera.eye[i]);
    const depth = dot(d, camera.forward);
    if (depth < 0.09) return null;
    return [0.5 + dot(d, camera.right) * camera.zoom / (depth * camera.aspect * 2),
      0.5 - dot(d, camera.up) * camera.zoom / (depth * 2)];
  }

  function rng(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  class Mesh {
    constructor() {
      this.data = [];
      this.poses = [[0, 0, 0, 1, 0]];
    }

    // Geometry is authored with the front at negative Z.
    position(point) {
      const [x, y, z, c, s] = this.poses[this.poses.length - 1];
      return [x + c * point[0] - s * point[2], y + point[1], z + s * point[0] + c * point[2]];
    }

    at(x, y, z, yaw, draw) {
      const [px, py, pz] = this.position([x, y, z]);
      const [, , , c, s] = this.poses[this.poses.length - 1];
      this.poses.push([px, py, pz, c * Math.cos(yaw) - s * Math.sin(yaw),
        s * Math.cos(yaw) + c * Math.sin(yaw)]);
      draw(this);
      this.poses.pop();
    }

    triangle(a, b, c, tint = white, material = -1, coords = [[0, 0], [1, 0], [0, 1]], normals) {
      const p = this.position(a);
      const q = this.position(b);
      const r = this.position(c);
      const face = normals ? null : unit(cross(q.map((n, i) => n - p[i]), r.map((n, i) => n - p[i])));
      const [,,,cos,sin] = this.poses[this.poses.length-1];
      for (const [index, point] of [p, q, r].entries()) {
        const n = normals?.[index];
        const normal = n ? [n[0]*cos-n[2]*sin,n[1],n[0]*sin+n[2]*cos] : face;
        this.data.push(...point, ...normal, ...tint, ...coords[index], material);
      }
    }

    quad(a, b, c, d, tint = white, material = -1, u = 1, v = 1, normals) {
      this.triangle(a, b, c, tint, material, [[0, 0], [u, 0], [u, v]], normals);
      this.triangle(a, c, d, tint, material, [[0, 0], [u, v], [0, v]],
        normals && [normals[0],normals[2],normals[3]]);
    }

    floor(x, y, z, w, d, tint, material, tile = 2) {
      this.quad([x, y, z + d], [x + w, y, z + d], [x + w, y, z], [x, y, z],
        tint, material, w / tile, d / tile);
    }

    box(x, y, z, w, h, d, tint, material = -1, tile = 1.7) {
      const a = [x, y, z];
      const b = [x + w, y, z];
      const c = [x + w, y + h, z];
      const e = [x, y + h, z];
      const f = [x, y, z + d];
      const g = [x + w, y, z + d];
      const k = [x + w, y + h, z + d];
      const l = [x, y + h, z + d];
      this.quad(b, a, e, c, tint, material, w / tile, h / tile);
      this.quad(f, g, k, l, tint, material, w / tile, h / tile);
      this.quad(a, f, l, e, tint, material, d / tile, h / tile);
      this.quad(g, b, c, k, tint, material, d / tile, h / tile);
      this.quad(e, l, k, c, tint, material, d / tile, w / tile);
      this.quad(f, a, b, g, tint, material, d / tile, w / tile);
    }

    round(x, y, z, bottom, top, height, tint, material = -1, sides = 10) {
      for (let i = 0; i < sides; i++) {
        const a = i * TAU / sides;
        const b = (i + 1) * TAU / sides;
        const [ax, az, bx, bz] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)];
        this.quad([x + bx * bottom, y, z + bz * bottom], [x + ax * bottom, y, z + az * bottom],
          [x + ax * top, y + height, z + az * top], [x + bx * top, y + height, z + bz * top],
          tint, material, 1 / sides, height);
        if (top > 0) {
          this.triangle([x, y + height, z], [x + bx * top, y + height, z + bz * top],
            [x + ax * top, y + height, z + az * top], tint, material);
        }
      }
    }

    ellipsoid(x, y, z, rx, ry, rz, tint, material = -1, slices = 10, rows = 5) {
      const ring = (j) => {
        const b = j*Math.PI/rows;
        const sin = Math.sin(b);
        const cos = Math.cos(b);
        return Array.from({length:slices+1},(_,i) => {
          const a = i*TAU/slices;
          const px = Math.cos(a)*sin;
          const pz = Math.sin(a)*sin;
          return { point:[x+rx*px,y+ry*cos,z+rz*pz],normal:unit([px/rx,cos/ry,pz/rz]) };
        });
      };
      let upper = ring(0);
      for (let j = 0; j < rows; j++) {
        const lower = ring(j+1);
        for (let i = 0; i < slices; i++) {
          const [a,b,c,d] = [upper[i],upper[i+1],lower[i+1],lower[i]];
          this.quad(a.point,b.point,c.point,d.point,tint,material,1/slices,1/rows,
            [a.normal,b.normal,c.normal,d.normal]);
        }
        upper = lower;
      }
    }
  }

  const vertex = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPosition;
    layout(location=1) in vec3 aNormal;
    layout(location=2) in vec3 aColor;
    layout(location=3) in vec2 aUV;
    layout(location=4) in float aMaterial;
    uniform vec3 uEye, uRight, uUp, uForward, uOffset;
    uniform vec2 uLens, uYaw;
    out vec3 vPosition, vNormal, vColor;
    out vec2 vUV;
    flat out int vMaterial;
    void main() {
      mat2 r = mat2(uYaw.x, uYaw.y, -uYaw.y, uYaw.x);
      vec3 p = aPosition;
      p.xz = r * p.xz;
      p += uOffset;
      vec3 n = aNormal;
      n.xz = r * n.xz;
      vec3 d = p - uEye;
      float depth = dot(d, uForward);
      gl_Position = vec4(dot(d, uRight) * uLens.x, dot(d, uUp) * uLens.y,
        depth * 1.000045 - 0.18, depth);
      vPosition = p;
      vNormal = n;
      vColor = aColor;
      vUV = aUV;
      vMaterial = int(aMaterial);
    }
  `;

  const atmosphere = `
    uniform vec3 uSun, uHaze, uZenith, uSunTint;
    uniform float uDay, uRain, uTime;
    uniform bool uLow;
    float hash(vec2 p) {
      p = fract(p * vec2(.1031,.11369));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),
        mix(hash(i+vec2(0.,1.)),hash(i+1.),u.x),u.y);
    }
    vec3 skyColor(vec3 ray) {
      float up = max(0., ray.y);
      vec3 sky = mix(uHaze, uZenith, pow(up, .52));
      float radial = max(0., dot(ray,uSun));
      sky += uSunTint*.41 * pow(radial, 22.) * uDay * (1. - uRain*.81);
      return sky;
    }
  `;

  const fragment = `#version 300 es
    precision highp float;
    precision highp sampler2D;
    precision highp sampler2DArray;
    in vec3 vPosition, vNormal, vColor;
    in vec2 vUV;
    flat in int vMaterial;
    uniform sampler2DArray uMaterials;
    uniform sampler2D uSign;
    uniform sampler2D uPlate;
    uniform sampler2D uShadow;
    uniform vec3 uEye, uShadowCenter;
    uniform vec3 uHeadlight, uBeam;
    uniform float uSnow, uMist;
    uniform mat3 uShadowBasis;
    uniform bool uShadows, uHeadlights;
    ${atmosphere}
    out vec4 oColor;
    float sunlight(float facing) {
      if (!uShadows || facing < .01) return 1.;
      vec3 q = uShadowBasis * (vPosition-uShadowCenter);
      float edge = max(abs(q.x),abs(q.y));
      if (edge >= .99 || abs(q.z) >= 1.) return 1.;
      vec2 uv = q.xy*.5+.5;
      vec2 texel = 1. / vec2(textureSize(uShadow,0));
      float depth = q.z*.5+.5 - (.00084 + (1.-facing)*.00103);
      float seen = 0.;
      for (int y=0;y<2;y++) {
        for (int x=0;x<2;x++) {
          vec2 offset = (vec2(x,y)-.5)*texel*1.65;
          seen += step(depth,texture(uShadow,uv+offset).r);
        }
      }
      return mix(mix(.11,1.,seen*.25),1.,smoothstep(.77,.99,edge));
    }

    void main() {
      vec3 view = vPosition - uEye;
      float dist = length(view);
      vec3 dir = normalize(view);
      vec3 n = normalize(vNormal);
      if (!gl_FrontFacing) n *= -1.;
      vec3 paint = vColor;
      if (vMaterial >= 0) {
        vec2 uv = vUV;
        if (vMaterial == 9) uv += vec2(uTime * .027, uTime * .013);
        vec3 tex = texture(uMaterials, vec3(uv, float(vMaterial))).rgb;
        paint *= tex;
      }
      if (vMaterial == -4) paint = texture(uSign,vUV).rgb;
      if (vMaterial == -7) paint = texture(uPlate,vUV).rgb;
      if (uSnow>.02 && (vMaterial==1 || vMaterial==4 || vMaterial==10)) {
        float cover = uSnow*(.31+.69*noise(vPosition.xz*.42))*smoothstep(.12,.66,n.y);
        paint = mix(paint,vec3(.81,.87,.89),cover*(vMaterial==10?.43:.88));
      }
      float bounce = .07 + .17 * max(n.y, 0.);
      float shadow = max(dot(n,uSun), 0.);
      float sun = sunlight(shadow);
      vec3 light = mix(vec3(.24,.31,.44), vec3(.42,.47,.54), uDay) + bounce;
      light += uSunTint * (shadow * sun * uDay * (1. - uRain * .68));
      vec3 lit = paint * light;
      if (uHeadlights && dist<73.) {
        vec3 beamRay = vPosition-uHeadlight;
        float travel = length(beamRay);
        float cone = smoothstep(.91,.989,dot(beamRay/max(travel,.01),uBeam));
        float glow = cone*(1.-smoothstep(4.,58.,travel))*(.59+.41*max(n.y,0.));
        lit += paint*vec3(.77,.67,.49)*glow;
      }
      if (vMaterial == 0) lit *= (1. - uRain * .28);
      if (!uLow && vMaterial == 1) {
        float ground = noise(vPosition.xz*.066);
        float detail = noise(vPosition.xz*1.5);
        lit *= mix(vec3(.66,.72,.60),vec3(1.23,1.16,.96),ground)*mix(.88,1.12,detail);
      }
      if (!uLow && (vMaterial == 0 || vMaterial == 2)) {
        float grain = noise(vPosition.xz * .31);
        float damp = uRain * smoothstep(.24,.72,grain);
        float fresnel = pow(1.-max(0.,dot(n,-dir)),3.);
        lit *= .88 + grain*.19;
        lit = mix(lit,skyColor(reflect(dir,n)),damp*(.07+.43*fresnel));
      }
      if (vMaterial == 9) {
        float reflectivity = .23;
        if (!uLow) {
          vec2 wave = vPosition.xz;
          n = normalize(n+vec3(sin(dot(wave,vec2(.74,.43))+uTime*1.6),0.,
            cos(dot(wave,vec2(.32,-.96))+uTime*1.27))*.055);
          reflectivity = .24+.55*pow(1.-max(0.,dot(n,-dir)),4.);
        }
        float glint = uLow ? 0. : pow(max(0., dot(reflect(dir,n),uSun)), 116.);
        lit = mix(lit, skyColor(reflect(dir,n)), reflectivity) + glint * .78 * uDay * sun;
      }
      if (vMaterial == -2) {
        float reflectivity = .26 + .46 * pow(1. - max(0.,dot(n,-dir)),3.);
        lit = mix(lit, skyColor(reflect(dir,n)), reflectivity);
      }
      if (!uLow && vMaterial == -6) {
        float angle = max(0.,dot(n,-dir));
        float shine = pow(max(0.,dot(reflect(dir,n),uSun)),64.);
        lit = mix(lit,skyColor(reflect(dir,n)),.08+.24*pow(1.-angle,3.)) +
          vec3(.95,.78,.56)*(shine * sun * uDay * (1.-uRain*.58)*.55);
      }
      if (vMaterial == -3) lit = paint * 1.09;
      float groundHaze = exp(-max(0.,vPosition.y-uEye.y)*.065);
      float dust = (uLow ? 0. : .00014*groundHaze)+uMist*groundHaze*.00146;
      float fogWeight = 1. - exp(-dist * (.00037 + uRain * .0017 + dust));
      lit = mix(lit, skyColor(dir), fogWeight);
      oColor = vec4(lit, vMaterial == -5 ? .24 : 1.);
    }
  `;

  const shadowVertex = `#version 300 es
    layout(location=0) in vec3 aPosition;
    layout(location=4) in float aMaterial;
    uniform vec3 uOffset, uShadowCenter;
    uniform vec2 uYaw;
    uniform mat3 uShadowBasis;
    flat out int vMaterial;
    void main() {
      mat2 r = mat2(uYaw.x,uYaw.y,-uYaw.y,uYaw.x);
      vec3 p = aPosition;
      p.xz = r*p.xz;
      gl_Position = vec4(uShadowBasis*(p+uOffset-uShadowCenter),1.);
      vMaterial = int(aMaterial);
    }
  `;

  const shadowFragment = `#version 300 es
    precision highp float;
    flat in int vMaterial;
    void main() {
      if (vMaterial == -5 || vMaterial == 9) discard;
    }
  `;

  const skyVertex = `#version 300 es
    out vec2 vScreen;
    void main() {
      vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2. - 1.;
      vScreen = p;
      gl_Position = vec4(p, .99999, 1.);
    }
  `;

  const skyFragment = `#version 300 es
    precision highp float;
    in vec2 vScreen;
    uniform vec3 uRight, uUp, uForward;
    uniform vec2 uLens;
    ${atmosphere}
    out vec4 oColor;
    void main() {
      vec3 ray = normalize(uForward + uRight * vScreen.x / uLens.x + uUp * vScreen.y / uLens.y);
      vec3 sky = skyColor(ray);
      float h = max(.028, ray.y);
      vec2 p = ray.xz / (h+.12) * 2.6 + vec2(uTime*.013, uTime*.006);
      float c = uLow ? noise(p)*.66 + .16 :
        noise(p)*.57 + noise(p*2.09)*.25 + noise(p*4.13)*.13 + noise(p*8.41)*.05;
      float density = smoothstep(.49-uRain*.31, .77-uRain*.23, c)
        * smoothstep(.017,.13,ray.y);
      vec3 cloud = mix(vec3(.33,.39,.48), vec3(.93,.91,.83), uDay);
      cloud = mix(cloud, uHaze * .89, uRain * .52);
      if (!uLow && density > .01) {
        float shade = noise(p+.36*uSun.xz) - noise(p-.29*uSun.xz);
        cloud *= .86 + .30*smoothstep(-.28,.28,shade);
        cloud += vec3(.14,.08,.03)*uDay*pow(max(0.,dot(ray,uSun)),12.)*(1.-uRain);
      }
      float sun = smoothstep(.99953, .99988, dot(ray, uSun)) * uDay * (1.-uRain*.85);
      sky = mix(sky, cloud, density * .76) + sun * (.43+uSunTint);
      oColor = vec4(sky,1.);
    }
  `;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl2', {
        alpha: false, antialias: false, powerPreference: 'high-performance',
      });
      if (!this.gl) throw new Error('WebGL 2 is required to render North Desk.');
      const gl = this.gl;
      this.quality = preferredGraphics();
      this.software = softwareRenderer(gl);
      this.lighting = 'natural';
      try { if (localStorage.getItem(lightingKey)==='golden') this.lighting='golden'; } catch {}
      this.land = this.program(vertex, fragment);
      this.sky = this.program(skyVertex, skyFragment);
      this.skyVao = gl.createVertexArray();
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.createSign();
      this.createPlate();
    }

    get low() {
      return this.quality === 'low';
    }

    setQuality(mode) {
      if ((mode !== 'high' && mode !== 'low') || this.quality === mode) return false;
      this.quality = mode;
      try { localStorage.setItem(graphicsKey,mode); } catch {}
      return true;
    }

    setLighting(mode) {
      this.lighting = mode==='golden' ? 'golden' : 'natural';
      try { localStorage.setItem(lightingKey,this.lighting); } catch {}
    }

    program(vs, fs) {
      const gl = this.gl;
      const shaders = [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].map(([type, source]) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      });
      const program = gl.createProgram();
      for (const shader of shaders) gl.attachShader(program, shader);
      gl.linkProgram(program);
      for (const shader of shaders) gl.deleteShader(shader);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      const uniforms = {};
      for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
        const { name } = gl.getActiveUniform(program, i);
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      return { program, uniforms };
    }

    createSign() {
      const gl = this.gl;
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#203630';
      ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = '#86998a';
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, 994, 226);
      ctx.fillStyle = '#f1ecda';
      ctx.textAlign = 'center';
      ctx.font = 'bold 80px Georgia';
      ctx.fillText('PEMBERTON', 512, 119);
      ctx.font = '31px system-ui';
      ctx.fillText('REAL ESTATE  /  NORTH DESK', 512, 180);
      this.sign = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.sign);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    createPlate() {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 112;
      const ink = canvas.getContext('2d');
      ink.fillStyle = '#e3e9de';
      ink.fillRect(0,0,256,112);
      ink.strokeStyle = '#456a80';
      ink.lineWidth = 8;
      ink.strokeRect(8,8,240,96);
      ink.textAlign = 'center';
      ink.fillStyle = '#35566a';
      ink.font = 'bold 20px system-ui';
      ink.fillText('MINNESOTA',128,32);
      ink.fillStyle = '#233744';
      ink.font = 'bold 49px monospace';
      ink.fillText('ND-169',128,81);
      const gl = this.gl;
      this.plate = gl.createTexture();
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D,this.plate);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    async loadMaterials() {
      const gl = this.gl;
      const image = new Image();
      image.src = globalThis.ND_MATERIALS;
      await image.decode();
      const canvas = document.createElement('canvas');
      const size = image.width / 4;
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      this.materials = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.materials);
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1 + Math.floor(Math.log2(size)), gl.RGBA8, size, size, 16);
      for (let i = 0; i < 16; i++) {
        ctx.drawImage(image, i % 4 * size, Math.floor(i / 4) * size, size, size, 0, 0, size, size);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      }
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const filter = gl.getExtension('EXT_texture_filter_anisotropic');
      if (filter) gl.texParameterf(gl.TEXTURE_2D_ARRAY, filter.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    }

    upload(mesh) {
      const gl = this.gl;
      const vao = gl.createVertexArray();
      const buffer = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new F32(mesh.data), gl.STATIC_DRAW);
      for (const [id, size, offset] of [[0, 3, 0], [1, 3, 3], [2, 3, 6], [3, 2, 9], [4, 1, 11]]) {
        gl.enableVertexAttribArray(id);
        gl.vertexAttribPointer(id, size, gl.FLOAT, false, 48, offset * 4);
      }
      return { vao, buffer, count: mesh.data.length / 12 };
    }

    release(mesh) {
      this.gl.deleteBuffer(mesh.buffer);
      this.gl.deleteVertexArray(mesh.vao);
    }

    resize() {
      const canvas = this.canvas;
      const scale = this.low ? Math.min(.72,800/(canvas.clientWidth||1),500/(canvas.clientHeight||1)) :
        this.software ? Math.min(1,1080/(canvas.clientWidth||1),675/(canvas.clientHeight||1)) :
          Math.min(devicePixelRatio||1,1.5,1920/(canvas.clientWidth||1));
      const width = Math.max(1, Math.round(canvas.clientWidth * scale));
      const height = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        this.gl.viewport(0, 0, width, height);
      }
      return width / height;
    }

    cameraUniforms(current, camera, time, atmosphere) {
      const gl = this.gl;
      const u = current.uniforms;
      gl.useProgram(current.program);
      if (u.uEye) gl.uniform3fv(u.uEye, camera.eye);
      gl.uniform3fv(u.uRight, camera.right);
      gl.uniform3fv(u.uUp, camera.up);
      gl.uniform3fv(u.uForward, camera.forward);
      gl.uniform2f(u.uLens, camera.zoom / camera.aspect, camera.zoom);
      gl.uniform3fv(u.uSun, atmosphere.sun);
      gl.uniform3fv(u.uSunTint, atmosphere.sunTint);
      gl.uniform3fv(u.uHaze, atmosphere.haze);
      gl.uniform3fv(u.uZenith, atmosphere.zenith);
      gl.uniform1f(u.uDay, atmosphere.day);
      gl.uniform1f(u.uRain, atmosphere.rain);
      gl.uniform1f(u.uTime, time);
      gl.uniform1i(u.uLow, this.low ? 1 : 0);
    }

    createShadowMap() {
      const gl = this.gl;
      const size = this.software ? 1024 : 1536;
      const texture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,size,size);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,texture,0);
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
      const valid = gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      if (!valid) {
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(framebuffer);
        return false;
      }
      return { texture,framebuffer,size,shader:this.program(shadowVertex,shadowFragment),at:-Infinity };
    }

    renderShadows(camera, seconds, sun, cast) {
      if (this.shadowMap===undefined) this.shadowMap = this.createShadowMap();
      const map = this.shadowMap;
      if (!map) return null;
      const center = camera.eye.map((v,i) => v + (i===1?-1.6:camera.forward[i]*23));
      if (seconds-map.at<(this.software?.139:.075) && Math.hypot(...center.map((v,i)=>v-map.center[i]))<4 &&
          dot(sun,map.sun)>.9999) return map;

      const span = 82;
      const depth = 110;
      const right = unit(cross([0,1,0],sun));
      const up = unit(cross(sun,right));
      const texel = 2*span/map.size;
      for (const axis of [right,up]) {
        const along = dot(center,axis);
        const drift = Math.round(along/texel)*texel-along;
        for (let i=0;i<3;i++) center[i]+=drift*axis[i];
      }
      const basis = new F32([0,1,2].flatMap((i) => [right[i]/span,up[i]/span,-sun[i]/depth]));
      const gl = this.gl;
      const shader = map.shader;
      gl.bindFramebuffer(gl.FRAMEBUFFER,map.framebuffer);
      gl.viewport(0,0,map.size,map.size);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.2,2);
      gl.useProgram(shader.program);
      gl.uniform3fv(shader.uniforms.uShadowCenter,center);
      gl.uniformMatrix3fv(shader.uniforms.uShadowBasis,false,basis);
      this.current = shader;
      cast(center);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.viewport(0,0,this.canvas.width,this.canvas.height);
      Object.assign(map,{center,basis,sun,at:seconds});
      return map;
    }

    begin(camera, seconds, minutes, rain, castShadows, { world=false,snow=0,mist=0,headlights } = {}) {
      const gl = this.gl;
      const naturally = minutes % 1440 / 60;
      const hour = world && this.lighting==='golden' ? 18.95 : naturally;
      const solar = Math.sin((hour - 5.9) / 14.8 * Math.PI);
      const day = ND.clamp(solar * 2.6 + .15, .18, 1);
      const blend = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
      const dawn = Math.max(0, 1 - Math.abs(hour - 6.8) / 3, 1 - Math.abs(hour - 20) / 3);
      const warm = ND.clamp(dawn+(world && this.lighting==='golden'?.30:0),0,1);
      const color = {
        sun: angle((hour - 6) * .23 + .98, Math.max(.04, solar * .98)),
        sunTint:blend([.86,.78,.64],[1.08,.68,.39],warm),
        haze: blend(blend([.17,.22,.31], [.67,.77,.79], day), [.94,.66,.48], warm * .64),
        zenith: blend([.035,.057,.117], [.21,.47,.72], day),
        day, rain,
      };
      color.haze = blend(color.haze, [.54,.62,.67], rain * .64);
      color.zenith = blend(color.zenith, [.38,.47,.55], rain * .66);
      const shadow = !this.low && castShadows && solar>.08 ?
        this.renderShadows(camera,seconds,color.sun,castShadows) : null;
      if (this.low) gl.disable(gl.BLEND);
      else gl.enable(gl.BLEND);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.bindVertexArray(this.skyVao);
      this.cameraUniforms(this.sky, camera, seconds, color);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST);
      this.cameraUniforms(this.land, camera, seconds, color);
      this.current = this.land;
      const u = this.land.uniforms;
      gl.uniform1i(u.uMaterials,0);
      gl.uniform1i(u.uSign,1);
      gl.uniform1i(u.uPlate,3);
      gl.uniform1f(u.uSnow,snow);
      gl.uniform1f(u.uMist,mist);
      gl.uniform1i(u.uHeadlights,Number(Boolean(headlights)));
      if (headlights) {
        gl.uniform3fv(u.uHeadlight,headlights.position);
        gl.uniform3fv(u.uBeam,headlights.forward);
      }
      gl.uniform1i(u.uShadow,shadow?2:1);
      gl.uniform1i(u.uShadows,Number(Boolean(shadow)));
      if (shadow) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D,shadow.texture);
        gl.uniform3fv(u.uShadowCenter,shadow.center);
        gl.uniformMatrix3fv(u.uShadowBasis,false,shadow.basis);
      }
    }

    drawDistantTerrain(tiles) {
      // Give the detailed terrain and its connected surfaces priority over coarse hills.
      this.gl.depthRange(.76,1);
      for (const {mesh} of tiles) this.draw(mesh);
      this.gl.depthRange(0,1);
    }

    draw(mesh, x = 0, y = 0, z = 0, yaw = 0) {
      if (!mesh.count) return;
      const gl = this.gl;
      gl.uniform3f(this.current.uniforms.uOffset, x, y, z);
      gl.uniform2f(this.current.uniforms.uYaw, Math.cos(yaw), Math.sin(yaw));
      gl.bindVertexArray(mesh.vao);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }
  }

  Object.assign(ND, { Renderer, Mesh, SURFACE, color, frame, angle, project, rng });
})();
