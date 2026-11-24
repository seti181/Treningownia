# Training blocks (stage 1a)

A block is a reusable training unit: a run, a climbing session, a finger session, a strength session, a stretch. Blocks fill the week from a default pattern ("Mój tydzień"); any single day can then be changed (move, skip, add, remove). Every completed block goes into the log and earns points. The shoulder rehab stays as it was and runs alongside (docs/rehab.md).

Code: `src/blocks.js` (logic, `window.BLOCKS`), `src/blocks-views.js` (screens, added to `window.VIEWS`), the block actions in trainer.js (`blockAction`, `openLog`, `saveLog`, `openEditor`, `saveEditor`, `startBlock`).

## Tracks and points

| Track (`t`) | Name | Tape | Colour | Points |
|---|---|---|---|---|
| `bieg` | Bieg | B | `--p2` | 15 |
| `wspin` | Wspinanie | W | `--p4` | 15 |
| `palce` | Palce | P | `--p3` | 12 |
| `sila` | Siła | S | `--accent` | 12 |
| `rozc` | Rozciąganie | R | `--p1` | 6 |

- +2 for rating effort (1–10) or shoulder pain (0–10) on the entry. An interrupted timed block earns half.
- Weekly challenges and personal records (below).
- The day streak and its bonuses count every training day: rehab sessions and blocks.
- Badges: first run, first climb, first finger session, full week, 50 km, 100 km, 10 climbs, first challenge, 10 challenges, first record, 10 records.
- Points are computed from the log in `PLAN.progress()` (which reads `BLOCKS.entries()`), never stored. The grade path on Postęp goes to 7c.

## Runs: segments, the run player and training paces

- A run block can hold timed segments (`items`, same shape as timed blocks) with extra fields: `lbl` (the state label and voice instead of "Ćwicz"/"Trzymaj", e.g. "Trucht", "Szybko", "Tempo"), `restLbl` (instead of "Przerwa", e.g. "Marsz"), `doneLbl` (button text for an open-ended leg, e.g. "Meta"), `measure` (this leg's time goes to the log), `est` (seconds, for the time estimate of an open-ended leg). Run blocks also have `zone` (`easy`, `steady`, `tempo`, `interval`, `test`) and `after: 'test'` (makes sense only after a 5 km test).
- "Zacznij z zegarem" runs the segments in the player with the jogging, fast-running or walking animation (`trucht`, `bieg-szybko`, `marsz` in `ATLAS.MOVES`). At the end the run is logged with its time (or the measured leg), and "Dopisz dystans" opens the log form to add km and effort.
- The 5 km test (`bieg-test5`): 10 min warm-up, then an open-ended test leg that ends on "Meta" (only this leg is timed), then a walk.
- **Training paces** (`BLOCKS.paces`): from the latest believable 5 km test (4,9+ km, 2:30–15:00 per km, last 120 days). Zones as multiples of the test pace: easy 1,22–1,32, steady 1,12–1,18, tempo 1,04–1,08, interval 0,97–1,01, strides 0,88–0,94. Shown on run cards (`paceText`), in the library and on Postęp ("Tempa treningowe"). Without a test, easy runs say "na rozmowę" and the after-test blocks carry a note.
- Built-in runs: easy run 40 min, long run 55 min, strides, 5 km test; after the test: tempo (10 + 20 + 10 min), intervals 6 × 3 min with 2 min jog, progression run. The default week has easy runs only until the test (owner, 24 November 2026).

## Training cycle and progression proposals

- `cycle = { start (Monday), build, recover }`, default 3 weeks build + 1 week recovery from the first Monday (`phaseOf`). Shown on Dziś and Tydzień ("Budowanie · tydzień 2 z 3"), changed on the Bloki page ("Cykl treningowy"; "bez cyklu" turns it off).
- A recovery week: the km challenge target drops to 60% of the 4-week average, the long-run challenge is swapped out, and no increases are proposed.
- **Proposals** (`proposals`, card "Propozycje" on Dziś, "Przyjmij" / "Nie teraz"). Nothing changes on its own; a declined proposal comes back after 7 days (`props[id] = { s, d, at, text }`); accepted ones change the block (like the editor) or the day plan and show in Dziennik as "Zmiana planu".
  - Hangboard: last 2 sessions of the block (since its last change) rated effort ≤ 6 and pain ≤ 2 → +2 s per hang up to 15 s, then 20 mm → 15 mm at 10 s.
  - Strength blocks: last 2 sessions effort ≤ 6, pain ≤ 2 → +1 rep in every reps item, +5 s on holds (max 60 s).
  - Easy runs: last 2 runs effort ≤ 4 → +5 min (max 60). Long run: last run effort ≤ 5 → +5 min (max 120).
  - 5 km test: after 6 logged runs, no test in 8 weeks → replace the next easy run from next Monday with the test.
  - Paused when any block in the last 7 days had shoulder pain ≥ 4 or a morning check was red (`shoulderAlarm`).

## Charts (Postęp: "Bieganie w liczbach", "Wspinanie w liczbach")

- HTML/CSS columns (`colChart`) and horizontal bars (`hBars`) in blocks-views.js: one colour per chart (running `--p2`, climbing `--p4`), bars from zero, a readout row above the plot (tap a column; data-act `cc`, no re-render), axis labels every few columns, and a table under each chart.
- Running (`runWeeks`, 12 weeks): km per week, longest run per week, predicted half marathon per week (dots, faster is higher, dashed 1:20 line).
- Climbing (`climbStats`): hardest grade per session over 90 days (pyramid), sessions by place over 90 days, hardest grade per month over 6 months (dots, dashed 7c line).
- Careful with class names: the plot type class is `cc-k-bar` / `cc-k-dot`, because `cc-bar` is the bar itself.

## After rehab (`rehabDone`)

- Rehabilitacja barku page → "Koniec rehabilitacji" (with a confirmation; can be undone). Sets `rehabDone` (date, synced by `rehabDoneAt`) and moves the rehab to phase 5 (maintenance).
- Effects: blocks with `afterRehab` appear (the built-in "Podciąganie": active hang 3 × 10 s, pull-ups 4 × 3–5, ring rows 3 × 8–10, doses from the rehab plan's last phase); the climbing card loses the shoulder reminder (`climbNote`); Dziś and Tydzień show only the maintenance sessions, not the light days.
- While rehab is on, `afterRehab` blocks are hidden everywhere (library, pickers, pattern editor).

## Levels: climbing and running (`progress().climb`, `progress().run`)

Two separate level paths, plus the total points.

- **Climbing** (`PLAN.climbLevel`): route grades from the starting grade (`climbBase`, default 6a) upwards; each step costs a bit more (`CLIMB_STEP`, 6a → 7c is 2340 points, about 23 full weeks). Points: climbing, finger and strength blocks, the challenges `drogi`, `palce2`, `sila2`, and the records for grade and routes.
- **Running** (`PLAN.runLevel`): named steps from Start to 1:20 (`RUN_LEVELS`, short names for tags; `RUN_STEP`, 6990 points, about 2 years). Points: runs, the challenges `km` and `dlugi`, and the running records. The names are game steps, not measured times.
- **Total:** everything, including rehab, stretching, the mixed challenges (`pelny`, `dni5`, `plan`, `rozc3`) and the day streak.
- **Real form**, next to each level on Postęp: climbing = hardest logged grade in the last 30 days (`BLOCKS.climbForm`); running = predicted half marathon from the best run of 3+ km with a time in the last 60 days, by Riegel's formula T2 = T1 · (D2/D1)^1.06, with the gap to 1:20 (`BLOCKS.runForm`).
- Starting levels are set in Ustawienia → Poziomy startowe (`climbBase`, `runBase`, synced by the later `levelsAt`). Changing them doesn't remove points.
- Shown in the header (climbing tag, running tag, total points from 560px up, streak), on Dziś (small card with both bars), on Postęp (two level cards, the climbing path and the running path), in toasts ("wspinanie: nowy poziom 6a+") and on the player's done screen (the level of the block's track).
- **Level-up celebration:** when either level goes up, a full-screen moment (`#lvup`: new tag, sound and vibration, "Dalej" or Escape closes it; reduced motion skips the animation). It waits until the player closes, and changing a starting level doesn't trigger it. Tests that aren't about it set `window.__NO_LEVELUP = true`.
- **Day streak protection:** one rest day per Monday–Sunday week doesn't break the streak (`progress().shields` lists those days); the streak stays alive the day after a rest day if that week still has its rest day.

## Weekly challenges (`BLOCKS.challenges(st, monday)`)

Four per Monday–Sunday week, shown on Dziś (compact), Tydzień (for the week on screen) and Postęp; completed ones earn points on the day they're reached (`progress().chDone`), and appear in Dziennik.

| Id | Challenge | Target | Points |
|---|---|---|---|
| `pelny` | Pełny tydzień (always) | 3 runs and 3 climbs | 25 |
| `km` | Kilometry tygodnia (always) | average of the 4 weeks before + 10%, at least 10 km | 20 |
| `dlugi` | Długi bieg | one run of the longest of the 4 weeks before + 1 km (8 to 21 km) | 15 |
| `palce2` | Palce dwa razy | 2 finger sessions | 15 |
| `sila2` | Siła dwa razy | 2 strength blocks | 15 |
| `rozc3` | Rozciąganie trzy razy | 3 stretching blocks | 10 |
| `dni5` | Pięć dni | 5 days with blocks | 15 |
| `drogi` | Drogi | routes of the 4 weeks before + 10%, at least 15 | 15 |
| `plan` | Plan bez pomijania | every planned block of the week done | 20 |

- The two rotating ones come from `CH_POOL` by the week number counted from Monday 5 January 2026 (`i % 7` and `(i + 3) % 7`), so they change every week.
- Targets come only from the 4 weeks before the week, so they don't move while the week runs. The +10% keeps the running volume growing at a safe rate.

## Personal records (`BLOCKS.records(entries)`)

Longest run, best pace on runs of 5+ km and of 10+ km, most km in a week, hardest grade, most routes in one session. The first value only sets the bar; each later improvement is an event worth +10 (`REC_PTS`) on its day (`progress().recordEvents`). A week-km record counts once per week. Postęp lists the current records; Dziennik shows each record on its day; the toast after saving and the player's done screen name new records and challenges.

## Kinds

| Kind | Logged as | Example |
|---|---|---|
| `timed` | runs in the player (voice, timer, rests); or "Zapisz bez zegara" | fingers, push-ups, rings, core, stretching |
| `run` | distance (km), time (`34:10`, `1:05:30` or minutes), pace computed | easy run, strides, long run, 5 km test |
| `climb` | where (Hala, Ściana, Skała, TRS), minutes, hardest grade, routes | Wspinanie |
| `simple` | minutes | anything else |

All kinds take effort, a note and (except runs) shoulder pain.

A timed block's items have the rehab session shape (`hold`, `reps`, `time`; docs/rehab.md), so the player runs them unchanged. Exercises come from the rehab atlas (`ATLAS.EX`) or from `BLOCKS.CAT`.

### Block exercises and their animations

`BLOCKS.CAT` holds the block exercises (name, track, three cues). Each has an animation in the engine, `ATLAS.MOVES` in core.js (dose and load for the atlas card, camera, props, key poses); `CAT[id]` is that same object with the name, cues and track added, so the player, the atlas cards and "Ćwicz z zegarem" all use it. An exercise without an entry in `MOVES` falls back to `plain` (the player draws a simple stage with the track's icon). tests/test-blocks-logic.js checks that every block exercise has an animation and renders with a finite frame.

- Moves: finger warm-up; hangboard hang (20 and 15 mm, feet on a chair, shoulders active); push-up; ring support hold; ring push-up; ring plank; knee tucks with feet in rings; plank; side plank (right forearm, left hand on the hip); hollow hold; dead bug; calf, hamstring, quad, hip-flexor and glute stretches; child's pose.
- New engine pieces: the `footrings` prop (rings around the ankles, straps up to an anchor), and the anchor points `lFt`, `rFt` (ankles) and `core` (mid-torso, for the glow).
- Helpers next to the moves: `HG` (hangboard pose), `RS` (ring support), `fplank` (forearm plank), `BACK` (lying on the back, head towards −z).
- The Atlas has a section "Bloki treningowe" (`#bloki-ruchy`) with these cards.
- To tune a pose: `npm run sheet -- kolka-kolana,deska-bok` renders three frames (start, middle, hold) of any rehab or block exercise to shots/sheetN.svg.

## Starter library (`BUILTIN`, conservative, confirmed by the owner on 24 November 2026)

- Bieg spokojny 30–40 min (effort 3–4); Bieg z przebieżkami (30 min + 6 × 20 s); Długi spokojny bieg 50–60 min; Test 5 km.
- Wspinanie, with a fixed reminder on the card: no left-arm lock-offs or long reaches, no pulling, shoulder pain above 3/10 means off the route.
- Zwisy na palcach 20 mm: warm-up 3 min, then 6 × 10 s, 2 min rest, about 7/10, feet on a chair if needed. Both hands, straight arms, no pulling.
- Pompki: push-ups 4 × 10–12, push-up plus 2 × 12.
- Kółka: barki i core: ring support hold 3 × 15 s, ring push-ups 3 × 8, ring plank 3 × 30 s, knee tucks 3 × 10.
- Core: plank, side plank, hollow hold, dead bug.
- Rozciąganie po biegu (about 7 min) and Rozciąganie pełne (about 13 min, with the armpit stretch from the rehab).

No pull-ups, ring rows or hanging pulls in any block: those stay inside the rehab plan until the owner says rehab is done. tests/test-blocks-logic.js checks this.

Default week (`DEFAULT_WEEK`, 0 = Sunday): Pn bieg spokojny + rozciąganie, Wt palce + wspinanie, Śr przebieżki + rozciąganie, Cz wspinanie, Pt długi bieg + rozciąganie, So pompki + kółka + rozciąganie pełne, Nd wspinanie.

## State

```
blocks: { <id>: block | { del: true, at } }     // own blocks ('u…') and changed built-ins (same id as the built-in)
week:   null | { 0..6: [blockId, …] }, weekAt   // null = DEFAULT_WEEK
days:   { 'YYYY-MM-DD': { items: [ { k, b, skip? } ], at } }   // a changed day replaces the pattern for that date
blog:   { 'YYYY-MM-DD': { <k>: entry | { del: true, at } } }
block = { id, name, kind, t, min, km?, note, gap?, items?, at }
entry = { b, t, kind, name, done: true, at, dur?, km?, sec?, rpe?, pain?, grade?, routes?, place?, note?, partial? }
```

- Item keys `k`: `p<i>-<blockId>` for items from the pattern, `a<time>` for added ones. A moved item keeps its key (with a suffix if the target day already has it). An entry logged outside the plan gets an added item, so it shows on its day.
- A deletion marker on a built-in id means "back to the start version"; on an own block it means deleted (it's also removed from the pattern).
- Merge (store.js `mergeBlocks`): per block, per day and per entry the later `at` wins, markers included; the pattern follows the later `weekAt`. These keys merge in both branches of `merge()`, so a rehab history wipe (new epoch) keeps them, and so does "Zacznij od nowa" with "Wyczyść też historię".
- The rehab plan's "easy climbing" notes are no longer shown on Dziś: climbing is a block now, and its card carries the shoulder reminder.

## Screens

- **Dziś:** "Trening" with today's blocks (start, log, move, skip; done ones show their details and "Popraw wpis"), then "Rehabilitacja barku" as before. The 7-day strip shows the block tracks.
- **Tydzień:** the planner, Monday to Sunday with ‹ › for other weeks; the week's runs, climbs, km and the full-week bonus. Each day: the rehab line (automatic), the blocks with a "⋯" menu (start or log, move to another day of that week or a week later, skip or restore, remove), "Dodaj blok".
- **Wpis** (page, opened from Dziś, Tydzień or Dziennik; the tab it came from stays selected): the form for one block entry. "Dodaj trening spoza planu" in Dziennik opens it with a day and a block to choose.
- **Więcej → Bloki treningowe:** "Mój tydzień" (remove and add blocks per weekday, back to the start week) and the library by track (edit, copy, delete own, back to the start version, new block).
- **Blok** (editor page): name, track, how it's logged, description; minutes and target km for untimed blocks; for timed blocks the gap between exercises and the exercises (type, sets, seconds or reps, rest, notes; reorder, remove, add from the catalogue).
- **Dziennik:** block entries with their details and points, the full-week bonus, a link back into each entry.
- **Postęp:** "Droga do 7c", this week's runs, climbs, km and the bonus, total km, climbs and full weeks; the points table lists the blocks.

## Next (stage 1b)

Multi-week phases (etapy) and automatic progression, built on the logged blocks: training paces from the 5 km test, finger loads, push-up reps.
