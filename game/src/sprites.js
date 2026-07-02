// ============================================================
// sprites.js - programmatic pixel art from string maps
// Each sprite: rows of chars; '.' = transparent, letters map to palette
// ============================================================
'use strict';

G.Sprites = {};

G.makeSprite = (rows, colors) => {
  const h = rows.length;
  const w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
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

(function buildSprites() {
  const C = G.C;
  const S = G.Sprites;

  // ---- MALCOLM: brown hair, clean-shaven, green hoodie, phone up ----
  S.malcolm = G.makeSprite([
    '....HHHHHH....',
    '...HHHHHHHH...',
    '...HSSSSSSH...',
    '...HSKSSKSH...',
    '..PHSSSSSSH...',
    '..P.SSWWSS....',
    '..P.SSSSSS....',
    '..P.BBBBBB....',
    '..PBBBBBBBB...',
    '..BBBBOBBBB...',
    '..S.BBOBBB.S..',
    '....BBBBBB....',
    '....BBBBBB....',
    '....DD..DD....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { H: '#6b4226', S: '#e8b796', K: C.ink, W: C.white, B: C.green, O: C.yellow, D: C.dusk, P: C.sky });

  // ---- BRIDGER: red hair, red beard, sharp navy suit, briefcase ----
  S.bridger = G.makeSprite([
    '....RRRRRR....',
    '...RRRRRRRR...',
    '...RSSSSSSR...',
    '...RSKSSKSR...',
    '....SSSSSS....',
    '...ESSWWSSE...',
    '...EESSSSEE...',
    '....EEEEEE....',
    '....NNNNNN....',
    '...NNWTWNNN...',
    '..S.NWTWNN.S..',
    '....NNNNNN....',
    '....NNNNNN....',
    '....DD..DD..GG',
    '....DD..DD..GG',
    '....DD..DD..GG',
    '...KK....KK...',
  ], { R: '#c0562f', E: '#a34524', S: '#f0c9a0', K: C.ink, W: C.white, N: C.navy, T: C.red, D: C.dusk, G: '#8a5a2b' });

  // ---- Rival boss sprites ----
  S.bossShark = G.makeSprite([
    '....GGGGGG....',
    '...GGGGGGGG...',
    '...GSSSSSSG...',
    '...GSKSSKSG...',
    '....SSSSSS....',
    '....SKKKKS....',
    '....SSSSSS....',
    '....LLLLLL....',
    '...LLWWWWLL...',
    '...LLWYYWLL...',
    '..S.LWYYWL.S..',
    '....LLLLLL....',
    '....LLLLLL....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { G: C.gray, S: '#e8b796', K: C.ink, L: C.slate, W: C.white, Y: C.yellow, D: C.dusk });

  S.bossLakes = G.makeSprite([
    '....YYYYYY....',
    '...YYYYYYYY...',
    '...YSSSSSSY...',
    '...YSKSSKSY...',
    '...YSSSSSSY...',
    '....SSWWSS....',
    '....SSSSSS....',
    '....PPPPPP....',
    '...PPPPPPPP...',
    '...PPWWWWPP...',
    '..S.PPPPPP.S..',
    '....PPPPPP....',
    '....PPPPPP....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { Y: C.yellow, S: '#f0c9a0', K: C.ink, W: C.white, P: C.purple, D: C.dusk });

  S.megaAgent = G.makeSprite([
    '..RRRRRRRRRR..',
    '..R.RRRRRR.R..',
    '....KKKKKK....',
    '...KSSSSSSK...',
    '...KSRSSRSK...',
    '....SSSSSS....',
    '....SKKKKS....',
    '....SSSSSS....',
    '...KKKKKKKK...',
    '..KKKWWWWKKK..',
    '..KKKWRRWKKK..',
    '.S.KKWRRWKK.S.',
    '...KKKKKKKK...',
    '...KKKKKKKK...',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { R: C.red, K: C.ink, S: '#e8b796', W: C.white, D: C.dusk });

  // ---- Houses / buildings ----
  S.houseStarter = G.makeSprite([
    '....RRRRRR....',
    '...RRRRRRRR...',
    '..RRRRRRRRRR..',
    '.RRRRRRRRRRRR.',
    '..WWWWWWWWWW..',
    '..WBBWWWWBBW..',
    '..WBBWWDDBBW..',
    '..WWWWWDDWWW..',
    '..WWWWWDDWWW..',
  ], { R: C.red, W: C.white, B: C.sky, D: '#6b4226' });

  S.houseLake = G.makeSprite([
    '......YYYY......',
    '....YYYYYYYY....',
    '..YYYYYYYYYYYY..',
    '.YYYYYYYYYYYYYY.',
    '..NNNNNNNNNNNN..',
    '..NBBNNBBNNBBN..',
    '..NBBNNBBNNBBN..',
    '..NNNNNNNNNNNN..',
    '..NNNDDDDNNNNN..',
    '..NNNDDDDNNNNN..',
    'WWWWWWWWWWWWWWWW',
  ], { Y: C.yellow, N: C.navy, B: C.cyan, D: '#6b4226', W: '#8a5a2b' });

  S.cabin = G.makeSprite([
    '....GGGGGG....',
    '...GGGGGGGG...',
    '..GGGGGGGGGG..',
    '..LLLLLLLLLL..',
    '..LLBBLLLLLL..',
    '..LLBBLLDDLL..',
    '..LLLLLLDDLL..',
    '..LLLLLLDDLL..',
  ], { G: C.green, L: '#8a5a2b', B: C.yellow, D: '#5a3a1b' });

  S.office = G.makeSprite([
    '.WWWWWWWWWWWW.',
    '.WSSSSSSSSSSW.',
    '.WWWWWWWWWWWW.',
    '.WBBWBBWBBWBW.',
    '.WBBWBBWBBWBW.',
    '.WWWWWWWWWWWW.',
    '.WBBWDDDWBBWW.',
    '.WBBWDDDWBBWW.',
    '.WWWWDDDWWWWW.',
  ], { W: C.gray, S: C.sky, B: C.yellow, D: '#6b4226' });

  S.coffee = G.makeSprite([
    '..MMMMMMMMMM..',
    '.MMMMMMMMMMMM.',
    '..BBBBBBBBBB..',
    '..BWWBCCBWWB..',
    '..BWWBCCBWWB..',
    '..BBBBDDBBBB..',
    '..BBBBDDBBBB..',
  ], { M: C.orange, B: '#6b4226', W: C.yellow, C: C.white, D: '#4a2a15' });

  S.studio = G.makeSprite([
    '..PPPPPPPPPP..',
    '.PPPPPPPPPPPP.',
    '..KKKKKKKKKK..',
    '..KWWKRRKWWK..',
    '..KWWKRRKWWK..',
    '..KKKKDDKKKK..',
    '..KKKKDDKKKK..',
  ], { P: C.purple, K: C.dusk, W: C.cyan, R: C.red, D: C.ink });

  // ---- Map decorations ----
  S.pine = G.makeSprite([
    '...G...',
    '..GGG..',
    '.GGGGG.',
    '..GGG..',
    '.GGGGG.',
    'GGGGGGG',
    '...B...',
    '...B...',
  ], { G: C.teal, B: '#5a3a1b' });

  S.pine2 = G.makeSprite([
    '...G...',
    '..GGG..',
    '.GGGGG.',
    'GGGGGGG',
    '...B...',
  ], { G: C.green, B: '#5a3a1b' });

  S.car = G.makeSprite([
    '..RRRR....',
    '.RRWWRR...',
    'RRRRRRRRRR',
    'RKKRRRRKKR',
    '.KK....KK.',
  ], { R: C.red, W: C.cyan, K: C.ink });

  S.carFancy = G.makeSprite([
    '..YYYY....',
    '.YYWWYY...',
    'YYYYYYYYYY',
    'YKKYYYYKKY',
    '.KK....KK.',
  ], { Y: C.yellow, W: C.cyan, K: C.ink });

  S.deer = G.makeSprite([
    'V..V....',
    '.VV.....',
    '.BBB....',
    '.KBB....',
    '..BBBBB.',
    '..BBBBBB',
    '..B..B.B',
    '..B..B.B',
  ], { V: '#8a5a2b', B: '#b5793a', K: C.ink });

  S.fish = G.makeSprite([
    '...OOO..',
    '..OOOOO.',
    'O.OKOOO.',
    'OOOOOOO.',
    'O..OOO..',
  ], { O: C.orange, K: C.ink });

  S.soldSign = G.makeSprite([
    'WWWWWWWW',
    'WRRRRRRW',
    'WRWWWWRW',
    'WRRRRRRW',
    'WWWWWWWW',
    '...BB...',
    '...BB...',
  ], { W: C.white, R: C.red, B: '#6b4226' });

  S.phone = G.makeSprite([
    'KKKK',
    'KCCK',
    'KCCK',
    'KCCK',
    'KKKK',
  ], { K: C.ink, C: C.cyan });

  S.star = G.makeSprite([
    '..Y..',
    '.YYY.',
    'YYYYY',
    '.YYY.',
    '.Y.Y.',
  ], { Y: C.yellow });

  S.heart = G.makeSprite([
    '.R.R.',
    'RRRRR',
    'RRRRR',
    '.RRR.',
    '..R..',
  ], { R: C.red });

  S.snowflake = G.makeSprite([
    'W.W.W',
    '.WWW.',
    'WWWWW',
    '.WWW.',
    'W.W.W',
  ], { W: C.white });

  S.dollar = G.makeSprite([
    '.GGG.',
    'G.Y.G',
    'G.Y.G',
    'G.Y.G',
    '.GGG.',
  ], { G: C.green, Y: C.yellow });

  S.trophy = G.makeSprite([
    'YYYYYYY',
    'Y.YYY.Y',
    'YYYYYYY',
    '.YYYYY.',
    '..YYY..',
    '...Y...',
    '..YYY..',
  ], { Y: C.yellow });

  // ============ EXPANSION SPRITES ============

  // BRAD NOLAN: blond lending legend, gray suit, gold tie, golden folder
  S.bradNolan = G.makeSprite([
    '....YYYYYY....',
    '...YYYYYYYY...',
    '...YSSSSSSY...',
    '...YSKSSKSY...',
    '....SSSSSS....',
    '....SSWWSS....',
    '....SSSSSS....',
    '....GGGGGG....',
    '...GGWTWGGG...',
    '...GGWTWGGG...',
    '..S.GWTWGG.FF.',
    '....GGGGGG.FF.',
    '....GGGGGG....',
    '....DD..DD....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { Y: '#232433', S: '#f0c9a0', K: C.ink, W: C.white, G: C.gray, T: C.yellow, D: C.dusk, F: C.yellow });

  // JEFF NOBLEZA: sharp charcoal blazer, glasses, blueprints in hand
  S.jeffNobleza = G.makeSprite([
    '....KKKKKK....',
    '...KKKKKKKK...',
    '...KSSSSSSK...',
    '...KCCSSCCK...',
    '....SSSSSS....',
    '....SSWWSS....',
    '....SSSSSS....',
    '....BBBBBB....',
    '...BBWWWWBB...',
    '...BBWWWWBB...',
    '..S.BWWWWB.PP.',
    '....BBBBBB.PP.',
    '....BBBBBB....',
    '....DD..DD....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { K: C.ink, S: '#d4a06a', C: C.cyan, W: C.white, B: C.dusk, D: '#3a3f52', P: C.sky });

  // GRANDPA REALTOR: white hair, red suspenders, cardigan
  S.grandpa = G.makeSprite([
    '....WWWWWW....',
    '...W.WWWW.W...',
    '...WSSSSSSW...',
    '...WSKSSKSW...',
    '....SSSSSS....',
    '....SWWWWS....',
    '....SSSSSS....',
    '....EEEEEE....',
    '...EEBWWBEE...',
    '...EEBWWBEE...',
    '..S.EBWWBE.S..',
    '....EEEEEE....',
    '....EEEEEE....',
    '....DD..DD....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { W: C.white, S: '#f0c9a0', K: C.ink, E: '#7a5c3e', B: C.red, D: C.slate });

  // THE INFLUENCER: bright hair, ring light glow, phone always out
  S.influencer = G.makeSprite([
    '....PPPPPP....',
    '...PPPPPPPP...',
    '...PSSSSSSP...',
    '...PSKSSKSP...',
    '..RPSSSSSSP...',
    '..R.SSWWSS....',
    '..R.SSSSSS....',
    '..R.MMMMMM....',
    '..RMMMMMMMM...',
    '..MMMWWMMMM...',
    '..S.MMWWMM.S..',
    '....MMMMMM....',
    '....MMMMMM....',
    '....DD..DD....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { P: '#c2478f', S: '#e8b796', K: C.ink, W: C.cyan, M: C.purple, R: C.cyan, D: C.dusk });

  // THE VETERAN: silver hair, tan blazer, gold watch
  S.veteran = G.makeSprite([
    '....GGGGGG....',
    '...GGGGGGGG...',
    '...GSSSSSSG...',
    '...GSKSSKSG...',
    '....SSSSSS....',
    '....SSWWSS....',
    '....SSSSSS....',
    '....TTTTTT....',
    '...TTWNWTTT...',
    '...TTWNWTTT...',
    '..Y.TWNWTT.S..',
    '....TTTTTT....',
    '....TTTTTT....',
    '....DD..DD....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { G: C.gray, S: '#e8b796', K: C.ink, W: C.white, N: C.teal, T: '#a08858', Y: C.yellow, D: C.dusk });

  // THE ROOKIE: backwards cap, lime polo, big dreams
  S.rookie = G.makeSprite([
    '....OOOOOO.O..',
    '...OOOOOOOOO..',
    '...OSSSSSSO...',
    '...OSKSSKSO...',
    '....SSSSSS....',
    '....SSWWSS....',
    '....SSSSSS....',
    '....LLLLLL....',
    '...LLLWLLLL...',
    '...LLLWLLLL...',
    '..S.LLWLLL.S..',
    '....LLLLLL....',
    '....LLLLLL....',
    '....DD..DD....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { O: C.orange, S: '#e8b796', K: C.ink, W: C.white, L: C.lime, D: C.dusk });

  // BOSS: THE ZILLOW MONSTER - a blob of internet leads
  S.bossZillow = G.makeSprite([
    '....BBBBBB....',
    '..BBBBBBBBBB..',
    '.BBBWWBBWWBB..',
    '.BBBWKBBWKBB..',
    'BBBBBBBBBBBBB.',
    'BBKKKKKKKKKBB.',
    'BBBBBBBBBBBBB.',
    '.BBCBBCBBCBB..',
    '.BBBBBBBBBBB..',
    'BBBBBBBBBBBBB.',
    'BB.BBBBBBB.BB.',
    '.B..BBBBB..B..',
    '....BB.BB.....',
    '...BBB.BBB....',
  ], { B: C.blue, W: C.white, K: C.ink, C: C.cyan });

  // BOSS: THE LUXURY KING - crown, velvet, disdain
  S.bossLux = G.makeSprite([
    '..Y.YY.YY.Y...',
    '..YYYYYYYYY...',
    '...KSSSSSSK...',
    '...KSKSSKSK...',
    '....SSSSSS....',
    '....SKKKKS....',
    '....SSSSSS....',
    '....PPPPPP....',
    '...PPWYWPPP...',
    '...PPWYWPPP...',
    '..S.PWYWPP.S..',
    '....PPPPPP....',
    '....PPPPPP....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { Y: C.yellow, K: '#3a2a1a', S: '#f0c9a0', P: C.purple, W: C.white, D: C.dusk });

  // BOSS: THE INVESTOR - all cash, sunglasses, no soul
  S.bossInvestor = G.makeSprite([
    '....GGGGGG....',
    '...GGGGGGGG...',
    '...GSSSSSSG...',
    '...GKKSSKKG...',
    '....SSSSSS....',
    '....SSKKSS....',
    '....SSSSSS....',
    '....NNNNNN....',
    '...NNWMWNNN...',
    '...NNWMWNNN...',
    '..M.NWMWNN.M..',
    '....NNNNNN....',
    '....NNNNNN....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { G: '#3a3f52', S: '#e8b796', K: C.ink, W: C.white, M: C.green, N: C.ink, D: C.dusk });

  // BOSS: THE FSBO MASTER - flannel, hand-painted sign energy
  S.bossFsbo = G.makeSprite([
    '....HHHHHH....',
    '...HHHHHHHH...',
    '...HSSSSSSH...',
    '...HSKSSKSH...',
    '....SSSSSS....',
    '....SSWWSS....',
    '....SSSSSS....',
    '....RFRFRF....',
    '...RFRFRFRF...',
    '...FRFRFRFR...',
    '..S.RFRFRF.WW.',
    '....FRFRFR.WW.',
    '....RFRFRF....',
    '....DD..DD....',
    '....DD..DD....',
    '...KK....KK...',
  ], { H: '#6b4226', S: '#e8b796', K: C.ink, W: C.white, R: C.red, F: '#7a2020', D: C.dusk });

  // BIGFOOT: blurry, of course
  S.bigfoot = G.makeSprite([
    '..EEEE..',
    '.EEEEEE.',
    '.EKEEKE.',
    '.EEEEEE.',
    'EEEEEEEE',
    'EEEEEEEE',
    'E.EEEE.E',
    '..EE.EE.',
    '..EE.EE.',
    '.EE...EE',
  ], { E: '#5a4632', K: C.ink });

  // Bank: columns + gold trim
  S.bank = G.makeSprite([
    '..YYYYYYYYYY..',
    '.YYYYYYYYYYYY.',
    '..WWWWWWWWWW..',
    '..W.WW.WW.WW..',
    '..W.WW.WW.WW..',
    '..W.WW.WW.WW..',
    '..WWWWDDWWWW..',
    '..WWWWDDWWWW..',
  ], { Y: C.yellow, W: C.gray, D: '#6b4226' });

  // BLAKE SUDDATH: The Growth Guru - quarter-zip, earbuds, laptop, coffee, phone
  S.blakeSuddath = G.makeSprite([
    '....HHHHHH....',
    '...HHHHHHHH...',
    '...HSSSSSSH...',
    '...HSKSSKSH...',
    '..B.SSSSSS.B..',
    '....XWWWWX....',
    '....SXXXXS....',
    '....QQQQQQ....',
    '...QQQZZQQQ...',
    '..L.QQZZQQ.C..',
    '..L.QQQQQQ.P..',
    '....QQQQQQ....',
    '....JJJJJJ....',
    '....JJ..JJ....',
    '....JJ..JJ....',
    '....JJ..JJ....',
    '...NN....NN...',
  ], { H: '#232433', X: '#232433', S: '#e8b796', K: C.ink, W: C.white, B: C.cyan, Q: C.teal, Z: C.sky, L: C.gray, C: C.orange, P: C.sky, J: '#3a3f52', N: C.white });

  // Growth Lab: modern glass building with a holo chart
  S.growthlab = G.makeSprite([
    '...G..G..G....',
    '...G.GG.GG....',
    '..CCCCCCCCCC..',
    '.CCCCCCCCCCCC.',
    '..TWWTWWTWWT..',
    '..TWWTWWTWWT..',
    '..TTTTDDTTTT..',
    '..TTTTDDTTTT..',
  ], { G: C.lime, C: C.cyan, T: C.teal, W: C.sky, D: C.ink });

  // AI drone: tiny hovering helper (for particles / flair)
  S.aidrone = G.makeSprite([
    'C.C',
    'WWW',
    'CKC',
  ], { C: C.cyan, W: C.white, K: C.ink });

  // Commercial plaza: wide storefront, big windows
  S.plaza = G.makeSprite([
    'PPPPPPPPPPPPPPPP',
    'PWWWWWWWWWWWWWWP',
    'PPPPPPPPPPPPPPPP',
    'PBBBPBBBPBBBPBBP',
    'PBBBPBBBPBBBPBBP',
    'PPPPPDDPPPPPPPPP',
    'PPPPPDDPPPPPPPPP',
  ], { P: C.slate, W: C.cyan, B: C.sky, D: C.ink });
})();

// Draw a sprite scaled (integer scale keeps it crisp)
G.drawSprite = (ctx, sprite, x, y, scale = 1, flip = false) => {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.translate(Math.round(x) + sprite.width * scale, Math.round(y));
    ctx.scale(-scale, scale);
  } else {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
  }
  ctx.drawImage(sprite, 0, 0);
  ctx.restore();
};
