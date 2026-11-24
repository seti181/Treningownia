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

A timed block's items have the rehab session shape (`hold`, `reps`, `time`; docs/rehab.md), so the player runs them unchanged. Exercises come from the rehab atlas (animated) or from `BLOCKS.CAT` (no animation yet: the player shows a simple stage with the track's icon, the name, the dose and three cues).

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

Multi-week phases (etapy) and automatic progression, built on the logged blocks: training paces from the 5 km test, finger loads, push-up reps. Animations for the main new exercises.
