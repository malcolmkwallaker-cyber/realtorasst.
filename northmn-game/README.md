# North Desk

A season with the whole Pemberton Real Estate office. Grand Rapids is home. The work runs the Iron Range and down to Duluth. You can play as anyone. The rest of the desk keeps working.

No build. Open `index.html` in a browser.

## How to play

Twelve weeks: fall, winter, thaw, summer. Each week, pick one of two cards, then make the call. Your perk helps when the card is your kind of work. It is not a bigger season than anyone else's.

The Grand Rapids desk wins by closing more homes than the Range desk and the Duluth desk. Your closings and your teammates' closings count together. Finish your four story beats and the desk gets one more closing. Same reward for every agent.

## Towns

Grand Rapids side: Cohasset, Grand Rapids, Coleraine, Bovey.

Iron Range: Nashwauk, Keewatin, Hibbing, Chisholm, Buhl, Mountain Iron, Virginia, Eveleth, Gilbert, Biwabik, Aurora, Hoyt Lakes.

Duluth side: Hermantown, Proctor, Duluth.

## Edit a person

Bios, catchphrases, perk names, stories, and pixel colors are in `src/roster.js`. That is the file to swap when new notes come in. Leave `id` and `perkId` alone unless you also change `src/perks.js`.

Shirt and hair colors are there so the cards are easy to tell apart. They are not claims about anyone, except the looks called out in that file: Joel is blond, Gaige has broccoli hair (not a perm) and an earring, Matt has the beard, Jillian is the small mighty one.

Tyler Lewis, Blake, and Brad are not on this desk.

## Balance check

```bash
node tools/balance.js
```

The sim plays every agent for 1000 seasons with the same call skill (0.72) and the same desk around them. A win is finishing strictly ahead of both other desks.
