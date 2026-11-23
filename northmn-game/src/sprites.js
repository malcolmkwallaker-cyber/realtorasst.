// Pixel people. Same string-map sprites as the office art.
'use strict';

(function () {
  const G = globalThis.G = globalThis.G || {};

  G.makeSprite = function (rows, colors) {
    const h = rows.length;
    const w = rows[0].length;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.' || ch === ' ' || !colors[ch]) continue;
        c.fillStyle = colors[ch];
        c.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  };

  function paint(canvas, sprite, scale) {
    canvas.width = sprite.width * scale;
    canvas.height = sprite.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  }

  G.paintSprite = paint;

  function agentSprite(look) {
    const C = G.C;
    const hair = look.hair;
    const shirt = look.shirt;
    const trim = look.trim || C.yellow;
    const skin = C.skin;
    const style = look.style;

    if (style === 'tiny') {
      return G.makeSprite([
        '..............',
        '....HHHHHH....',
        '...HHHHHHHH...',
        '..HHHSSSSHHH..',
        '..HHSKSKSHHH..',
        '..HHSSWWSSHH..',
        '.FHHSSSSSSHF..',
        '..F.BBBBBB.F..',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, F: trim, D: C.dusk });
    }
    if (style === 'female') {
      return G.makeSprite([
        '...HHHHHHHH...',
        '..HHHHHHHHHH..',
        '.HHHSSSSSSHHH.',
        '.HHSKSSKSSHHH.',
        '.HHSSWWSSSHHH.',
        '.HHSSSSSSSHH..',
        '..H.BBBBB.HH..',
        '...BBBBBBB.H..',
        '..BBBBBOBBBH..',
        '..S.BBOBBB.S..',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
        '..............',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, O: trim, D: C.dusk });
    }
    if (style === 'bald') {
      return G.makeSprite([
        '......SS......',
        '.....SSSS.....',
        '....SSSSSS....',
        '...HSSSSSSH...',
        '..HHSKSSKSHH..',
        '..HHSSWWSSHH..',
        '..H.SSSSSS.H..',
        '....BBBBBB....',
        '...BBBBBBBB...',
        '..BBBBOBBBB...',
        '..S.BBOBBB.S..',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, O: trim, D: C.dusk });
    }
    if (style === 'shortbeard') {
      return G.makeSprite([
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HSSSSSSH...',
        '...HSKSSKSH...',
        '..THSSWWSSHT..',
        '..T.RRRRRR.T..',
        '..T.RRRRRR....',
        '..TRBBBBBBR...',
        '..TBBBBBBBB...',
        '..BBBBOBBBB...',
        '..S.BBOBBB.S..',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, O: trim, D: C.dusk, T: trim, R: look.beard || '#8a5a32' });
    }
    if (style === 'broccoli') {
      return G.makeSprite([
        'GGGGGGGGGGGGGG',
        '.GGGgGGGgGGGg.',
        'GGGgGGGgGGGgGG',
        '.GGgGGGgGGGgG.',
        '..GSSSSSSSG...',
        '..GSSKSSKSG.E.',
        '...GSSWWSS..E.',
        '....SSSSSS....',
        '...BBBBBBB....',
        '..BBBBBBBBB...',
        '..S.BBBBBB.S..',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
        '..............',
      ], { G: '#3f8f3a', g: '#7dce55', S: skin, K: C.ink, W: C.white, E: '#ffd24a', B: shirt, D: C.dusk });
    }
    if (style === 'beard') {
      return G.makeSprite([
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HSSSSSSH...',
        '...HSKSSKSH...',
        '..THSSWWSSHT..',
        '..T.RRRRRR.T..',
        '...RRRRRRRR...',
        '..RRRRRRRRRR..',
        '..RRRrRRRrRR..',
        '...RRBBBBBR...',
        '..S.BBBBBB.S..',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, T: trim, R: look.beard || '#4a3424', r: look.beardHi || '#7a5a3a', D: C.dusk });
    }
    if (style === 'bird') {
      return G.makeSprite([
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HSSSSSSH...',
        '...HSKSSKSH...',
        '..THSSSSSSHT..',
        '..T.SSWWSS.T..',
        '..T.SSSSSS.VV.',
        '..T.BBBBBB.VYv',
        '..TBBBBBBBB...',
        '..BBBBOBBBB...',
        '..S.BBOBBB.S..',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, O: trim, D: C.dusk, T: trim, V: '#5b6ea8', Y: C.yellow, v: C.orange });
    }
    if (style === 'folder') {
      return G.makeSprite([
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HSSSSSSH...',
        '...HSKSSKSH...',
        '..THSSSSSSHT..',
        '..T.SSWWSS.T..',
        '..T.SSSSSS....',
        '..T.BBBBBB.FF.',
        '..TBBBBBBBFFF.',
        '..BBBBOBBB.FF.',
        '..S.BBOBBB....',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, O: trim, D: C.dusk, T: trim, F: '#e6d2a2' });
    }
    if (style === 'default') {
      return G.makeSprite([
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HSSSSSSH...',
        '...HSKSSKSH...',
        '..THSSSSSSHT..',
        '..T.SSWWSS.T..',
        '..T.SSSSSS....',
        '..T.BBBBBB....',
        '..TBBBBBBBB...',
        '..BBBBOBBBB...',
        '..S.BBOBBB.S..',
        '....BBBBBB....',
        '....BBBBBB....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...KK....KK...',
      ], { H: hair, S: skin, K: C.ink, W: C.white, B: shirt, O: trim, D: C.dusk, T: trim });
    }
    const never = style;
    throw new Error('Unknown look ' + never);
  }

  G.buildSprites = function () {
    G.ROSTER.forEach(function (a) {
      a.sprite = agentSprite(a.look);
    });
  };

  G.drawBanner = function (canvas) {
    const w = 180;
    const h = 52;
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#243056';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1c2c';
    c.fillRect(0, 36, w, 16);
    c.fillStyle = '#38b764';
    for (let i = 0; i < 8; i++) {
      const x = 8 + i * 22;
      c.fillRect(x, 28, 3, 8);
      c.fillStyle = '#257179';
      c.fillRect(x - 3, 22, 9, 6);
      c.fillStyle = '#38b764';
      c.fillRect(x - 1, 18, 5, 5);
    }
    c.fillStyle = '#566c86';
    c.fillRect(70, 20, 16, 16);
    c.fillStyle = '#b13e53';
    c.fillRect(74, 12, 4, 8);
    c.fillStyle = '#94b0c2';
    c.fillRect(118, 30, 50, 6);
    c.fillStyle = '#41a6f6';
    c.fillRect(130, 24, 4, 10);
    c.fillRect(148, 24, 4, 10);
    c.fillStyle = '#ffcd75';
    c.fillRect(136, 26, 10, 2);
    c.fillStyle = '#333c57';
    c.fillRect(0, 40, w, 4);
  };
})();
