# Playtest report: North Season

Headless seasons drive the real game state (`G.State`) through a fake browser.
Script: `game/tools/playtest.js`. One hundred seasons before the changes, one
hundred after. Each sample mixes difficulty, character, and policy (push the
pipeline, only prospect, random, or do nothing). A smoke check then calls every
character's daily ability and confirms office agents start locked.

No season threw. The calendar always finished. Cash and energy stayed finite.

## Before

The build was Bridger vs. Malcolm, eight playable agents, eight-day months
(24 working days), and a rival who closed almost every day.

| Difficulty | Seasons (not idle) | Win rate | Homes | Rival homes |
| --- | --- | --- | --- | --- |
| Casual | 19 | 0% | 2.3 | 16.0 |
| Standard | 47 | 2% | 8.4 | 17.8 |
| Hard | 25 | 0% | 4.2 | 21.8 |

Malcolm on Standard, playing the pipeline at a strong minigame score, closed
about 9 homes and still lost to a rival in the high teens. Bridger, the closer,
managed about 14 and still lost. One win in that whole skilled Malcolm set.
Doing nothing sold 0 homes while the rival sold about 18. Sitting out never
soft-locked the day, which is good. It also never mattered, which is not.

What felt bad:

- The race was not a race. A careful month still lost. Hard and casual were
  the same story with worse numbers.
- A prospect-only month could take 70 actions and close zero homes. Nothing
  on the map said "write the offer."
- Twenty-four days of the same menu, with the score saved for the ending.
  No streak, no daily goal, no mid-season celebration.
- Spending the last energy forced the day to end, so the shop was easy to miss.
- The desktop action list was one long column of disabled rows.
- Mini-games ran 15 to 20 seconds. A full month was a lot of the same timers.
- Two lines talked about emoji replies. The rest of the copy was already
  plain and northern. Those lines did not match.
- Character select was Bridger plus Malcolm, then secret silhouettes labeled
  "?????." Office mates were not on the roster. Trash talk aimed Malcolm and
  Bridger at each other.
- Blake Suddath and Tyler Lewis were both a mentor visit and an unlockable
  agent. They are removed.

What held up: the day loop, saves, boss handoff, and pipeline did not crash
across the hundred runs. Weather, shops, and referrals resolved. The problem
was the feel of the month, not a broken clock.

## What changed

- Rival closings were turned down so a solid Standard month can win. Hard is
  still the hungrier market. Quick season is 5 days a month (the default).
  Full season is the old 8.
- Daily goal of two solid tasks, a streak, streak cash at three days, extra
  energy from five days on, and milestone lines (first keys, five homes,
  taking the lead).
- Map HUD: season bar, you vs. the rival, streak, goal, score, and a one-line
  coach ("an offer wants a yes").
- Out of energy no longer ends the day for you. Shop is still there.
- Action list is three tabs (Prospect, Clients, Mentors) on phone and desktop.
  Q / E or left / right switch tabs.
- Mini-game timers are shorter (about 11 to 13 seconds).
- The rival is a fictional Billboard Broker. Coworkers are not the antagonists.
- Roster is `game/src/characters.js`. Malcolm Wallaker starts selected.
  Parker Pemberton (owner, more energy, a hotter rival) and Liz Rein
  (follow-up) are unlocked. Fourteen Grand Rapids agents start as locked
  silhouettes with the unlock line. Unlocks save in localStorage.
- Blake and Tyler Lewis are gone from play, mentors, sprites, and achievements.

## After

Same harness, quick months (15 working days), new roster.

| Difficulty | Seasons (not idle) | Win rate | Homes | Rival homes |
| --- | --- | --- | --- | --- |
| Casual | 14 | 7% | 1.3 | 5.6 |
| Standard | 51 | 57% | 7.0 | 6.8 |
| Hard | 30 | 17% | 3.2 | 7.8 |

Malcolm, Standard, pipeline policy: 11 wins in 18 seasons, usually 6 to 8
homes against a rival around 5 to 7. That is a month you can win by playing
the board, and still drop if you only dial. Casual's low win rate in this
table is mostly the weak "only prospect" sample. The coach line is there so
a person is not left guessing. Hard pipeline play in this run went 5 for 8.
Hard overall stays under 20% once random and idle policies are included.

Smoke check after the hundred seasons, on a fresh profile:

- All 17 abilities returned lines. None threw.
- Malcolm, Parker, and Liz started unlocked. All 14 office agents started locked.
- Setting two open houses and running the unlock check unlocked Rebekkah Anderson
  and saved it.
- No roster record contained Blake or Tyler.

Across the long profile, every office unlock fired at least once (open houses,
followers, a won season, a 4-day streak, pendings, commission, buyers, referrals,
an April closing, listings, a lake sale, cleared inspections, two finished
seasons, and happiness). So the locks are reachable, not decorative.

## Two office personalities

Kaila Wass plays as a Bigfork original: camo, a blaze-orange cap, woods and lake leads, and a truck that ignores blizzards. Her daily ability is Ice House Tour. Scotty Puglisi plays as a pastor's wife: hospitality, a hotdish, and a prayer chain that brings warm referrals. The chain is written as a kindness, not a joke. Jillian Bilden is drawn short on purpose and plays as a scrappy negotiator: plus 30 percent on hard talks, and Stand Your Ground sends the best offer to pending. Rebekkah Anderson goes by Bekkah. She talks side hustles all day, closings pay 18 percent more, and Twelve Businesses drops cash plus a lead. Jordan Hess is the buyer agent: easier showings, faster buyer signings, and two offers at once. They still start locked. Kaila unlocks by selling a lake, cabin, hunting, or farm place. Scotty unlocks with two referrals in a season. Jillian unlocks by winning two negotiations. Bekkah unlocks at $8,000 commission. Jordan unlocks by writing three offers. Parker Pemberton is the rare CEO: beat the final boss and win the season, then CEO Mode lifts the whole book and opens bigger deals. Liz Rein is the rare operator: win a season with 8 homes, then Makes It Happen clears blockers and pushes a stalled deal across the line. Tania Suonvieri is the Iron Range insider for Hibbing, Virginia, Eveleth, and Chisholm. Gaige Waldvogel has the broccoli top and a sparking earring. Matt Huebscher's beard rescues sick deals. Emily Lutz flips Zillow pings into appointments. Bethany Leadley restores trust. Adam Marks knows the answer. Deb Danley still steadies the file and now flies the out-of-town buyers in. Stephanie Mascarenas can sell the tough listing.

## Malcolm vs Bridger

The season scoreboard is that rivalry. Play Malcolm and the rival is Bridger. Play Bridger and the rival is Malcolm. Anyone else is still chasing Bridger.

Malcolm's perk is Office Leader. Once a day he recruits a teammate. The desk warms the whole book and, about half the time, the new agent brings a lead. The boost stacks, and it caps, so a big office helps without running away.

Bridger's perk is Price Is Right. Pricing calls land a fair number and the listing draws buyers. If Malcolm overprices, Bridger can take that listing. If you are Bridger, Malcolm overprices one out in the market now and then, and you price it instead. Recruiting is Malcolm's volume. Pricing is Bridger's answer.

Head to head, Standard market, quick season, pipeline play, minigame skill 0.72, 100 seasons each way:

| Matchup | Wins | Ties | Homes | Rival homes |
| --- | --- | --- | --- | --- |
| Malcolm (Office Leader) vs Bridger | 50% | 11% | 8.63 | 8.18 |
| Bridger (Price Is Right) vs Malcolm | 51% | 14% | 8.17 | 7.70 |

Neither perk ran off with the month.

## Still true

A perfect bot that always pushes the pipeline wins Standard more often than
a person will. That is the point of the coach and the streak: the fun is in
the month, not in grinding a rival who cannot be caught. Quick season is the
default because 24 menu-days was the repetitive part. Full season is one
button away for anyone who wants the long haul.
