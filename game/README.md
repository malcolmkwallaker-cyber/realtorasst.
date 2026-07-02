# Bridger vs. Malcolm: Realtor Rivals

A 16-bit retro arcade game about two rival real estate agents battling to be
the #1 Realtor in Northern Minnesota. SNES/Genesis-inspired pixel art, chiptune
audio, mini-games, boss showdowns, upgrades, save/load, and a leaderboard.

## Play it (zero install)

Open `index.html` in any modern browser. That's it — no build step, no server.

### Share it as ONE file

```bash
node tools/bundle.js
```

This creates `dist/realtor-rivals.html` — a single self-contained HTML file
(~100 KB). Email it, text it, AirDrop it, or drop it on any static host
(GitHub Pages, Netlify, a USB stick). It runs offline in any browser on
web, Mac, and Windows.

### Play it online (GitHub Pages)

A workflow at `.github/workflows/deploy-game.yml` auto-deploys the game to
GitHub Pages on every push. Once deployed, share the link:

**https://malcolmkwallaker-cyber.github.io/realtorasst./**

(Requires the repository to be public, or a GitHub plan that allows Pages
on private repos. The single-file bundle at `/dist/realtor-rivals.html`
is also served from the same site.)

## Desktop apps (Mac / Windows)

```bash
cd game
npm install
npm run desktop     # run in an Electron window
npm run dist:mac    # build a .dmg
npm run dist:win    # build an installer .exe
```

## How to play

- **Goal:** sell more homes than your rival over a 3-month season (April–June).
- **Pick your agent:**
  - **Malcolm** — brown-haired social media wizard. Special: **Viral Video**
    (post a ridiculous video; leads and followers pour in).
  - **Bridger** — red-haired, red-bearded closer. Special: **Power Close**
    (win a tough appointment or negotiation instantly).
- **Each day** spend energy on actions: call/text leads, follow up, host open
  houses, film videos, pitch listings, show homes, write offers, negotiate,
  fix inspections, and close sales. Most actions launch a quick mini-game —
  play well and leads move down the pipeline:
  `NEW → WARM → APPT SET → CLIENT → OFFER IN → PENDING → SOLD`
- **Shop:** spend commission on 11 upgrades (drone, CRM, AI assistant,
  transaction coordinator, better vehicle...).
- **Month end:** boss showdown vs a top local agent. Final boss: **The Mega
  Agent** — beaten with prospecting, marketing, negotiation, client service,
  speed, and strategy.
- **Watch out for:** snowstorms, low appraisals, ghosting leads, greedy
  sellers, deal-sniping rivals... and the occasional deer at a showing.

**Controls:** Arrow keys / WASD + Enter/Space, or just click. `M` mutes.
`Esc` backs out. Progress autosaves each day; finish a season to enter the
Hall of Fame leaderboard.

## Code layout

```
index.html            entry point (loads scripts in order)
src/
  utils.js            palette, math helpers, particles
  audio.js            WebAudio chiptune SFX + music loop
  input.js            keyboard / mouse / touch
  sprites.js          pixel art generated from string maps
  data.js             characters, leads, upgrades, events, bosses, map
  save.js             localStorage save/load + leaderboard
  state.js            game state, pipeline logic, rival AI, day loop
  ui.js               text, panels, menus, popups
  engine.js           game loop + scene manager
  scenes/             title, select, howto, map hub, shop,
                      8 mini-games, boss battles, results
electron/main.js      desktop wrapper
tools/bundle.js       one-file HTML bundler for easy sharing
```

Systems are data-driven (add a lead type, upgrade, event, or boss by adding
an entry in `data.js`) with room for future expansion: multiplayer seasons,
more towns, more mini-games.
