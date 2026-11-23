# North Season

A 16-bit arcade season for Pemberton Real Estate's Grand Rapids office.
Sell more homes than a fictional highway rival, April through June, with
pixel agents, chiptune audio, mini-games, streaks, and a roster you unlock.

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

- **Goal:** sell more homes than the Billboard Broker over a 3-month season (April–June).
- **Pick your agent** on the roster screen. Malcolm Wallaker (Office Leader) is the default.
  Parker Pemberton (owner) and Liz Rein are also ready to play. The rest of the
  Grand Rapids office starts locked. A silhouette shows the milestone that unlocks them.
  Unlocks stay in localStorage on this device.
- **Daily goal:** two solid tasks. Hit it and the streak climbs. Streaks pay a little
  cash and, at five days, an extra energy. The map HUD shows the race, the streak,
  the goal, and a hint for the next useful action.
- **Season length:** Quick is 5 days a month. Full is the old 8-day month.
- **Each day** spend energy on actions: call/text leads, follow up, host open
  houses, film videos, pitch listings, show homes, write offers, negotiate,
  fix inspections, and close sales. Most actions launch a quick mini-game —
  play well and leads move down the pipeline:
  `NEW → WARM → APPT SET → CLIENT → OFFER IN → PENDING → SOLD`
- **Shop:** spend commission on 11 upgrades (drone, CRM, AI assistant,
  transaction coordinator, better vehicle...).
- **Legendary power-ups:** visit **Brad Nolan, The Mortgage Wizard** at the
  bank (Clear to Close — and the rare *Weekend Underwriting* closes every
  pending deal at once) and **Jeff Nobleza, The Commercial King** at the
  plaza (Commercial Takeover unlocks apartments, retail, warehouses,
  portfolios & 1031 exchanges paying 5–20x commissions).
- **Office roster:** fourteen Grand Rapids agents, each with a different perk.
  Edit them in `src/characters.js`. See below.
- **Daily weather** (blizzards, fog, heat waves, northern lights...) changes
  what works each day. Snowmobile owners fear nothing.
- **Month end:** boss showdowns drawn from a pool — The Zillow Monster, The
  Luxury King, The Investor, The FSBO Master, plus Dale and Cindy — with
  **The Mega Team** always waiting as the final boss.
- **Dynamic rivalry:** trash talk escalates, and head-to-head **Listing
  Battles** pit both agents pitching the same seller across dialogue,
  market knowledge, presentation, and negotiation.
- **16 achievements** (Coffee Addict, Phone Warrior, Million Dollar
  Monday...) persist across seasons, plus easter eggs: Bigfoot hides in the
  woods, Paul Bunyan sends referrals, trophy walleye grant +20 charisma.
- **Watch out for:** snowstorms, raccoons in the attic, failed septics,
  low appraisals, ghosting leads, greedy sellers, deal-sniping rivals...
  and the occasional deer, bear, or moose at a showing.

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
  data.js             leads, upgrades, events, bosses, map, balance
  data2.js            extra leads, weather, bosses, shops
  characters.js       THE roster: names, perks, unlocks, pixel colors
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
an entry in `data.js`).

## Editing the office roster

All playable people live in `src/characters.js`. Malcolm Wallaker, Parker Pemberton,
and Liz Rein are the starters. The `office` list is the Grand Rapids desk.

To change a perk, catchphrase, color, or unlock, edit that person's entry.
Each entry has `name`, `title`, `strengths`, `ability`, stat modifiers (`videoBonus`,
`negotiateBonus`, `energyMod`, and so on), and `unlock.hint` plus `unlock.met`.

`unlock.met` is a function `(seasonState, profile) => true/false`.
The hint is the sentence shown on the locked silhouette.
When it becomes true, the unlock is saved in localStorage (`realtorRivals.profile.v1`).

To add a future teammate, copy an `office` entry, give it a new `id`, and fill in
the real name. Do not invent people. Bios are playful game traits, not biographies.
Pixel avatars are generated from `hair`, `shirt`, and `trim` colors. No photos.

Headless seasons: `node tools/playtest.js 100` from the `game` folder.
