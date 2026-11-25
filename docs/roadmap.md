# Roadmap and open questions

The owner wants this to be their complete training app on the phone. Keep this file current: move items when they're done, and add decisions to the log at the bottom with a date. Agree each stage with the owner before building it (summary first, then "let's go").

## The goal

One app that:

1. **Logs** every session: rehab, running, climbing, finger strength, strength, body weight.
2. **Shows progress**: levels, charts, records, test results.
3. **Suggests** what to do today.
4. **Progresses** the training as the owner gets stronger, based on what was logged, and asks before it changes anything.
5. Is built from **training blocks** the owner can edit and move around, and is fun: a game from the start.

Targets: a **1:20 half marathon** (3:47 min/km) by late 2028 and **7c** in climbing by May 2027. Running and climbing are separate tracks in one week: about 3 runs and 3 climbs a week, Sunday always a climb, 6–7 training days with easier periods. The shoulder rehab is still on and keeps its rules (CLAUDE.md): no pull-ups or pulling blocks; straight-arm hangboard hangs are allowed.

## Where things stand (25 November 2026)

Live at https://seti181.github.io/Treningownia/ (public repository github.com/seti181/Treningownia). Every push to `main` runs the tests and publishes only if they pass.

**Now:** the owner uses the app for a few weeks from 25 November 2026, then we tune it together (Next 1). The 5 km test falls in that time (mid-December), so the first strides proposal will show up on its own.

| Area | State | Docs |
|---|---|---|
| App shell: Treningownia, tabs Dziś / Tydzień / Dziennik / Postęp / Więcej, installable and offline (PWA), backup file | done | architecture.md |
| Shoulder rehab: 5 phases, timed player with voice, morning check, pain rules, gates, breaks and restarts, 33 animated exercises; "Koniec rehabilitacji" switch (off until the owner flips it) | done | rehab.md |
| Body weight: daily entry, 7-day average, chart, goal, pace per week, goal date, "losing too fast" note | done | weight.md |
| Training blocks: library, default week (easy runs only until the 5 km test), planner (move, skip, add, other weeks), log form, block editor | done | blocks.md |
| Animations for every exercise, including running and walking, in the player and the Atlas | done | blocks.md |
| Atlas: search (no Polish letters needed, word stems) and 10 category chips (5 rehab phases; Palce, Siła, Core, Rozciąganie, Bieganie) | done | architecture.md, blocks.md |
| Run player: timed segments with voice, 5 km test timed to "Meta", "Dopisz dystans"; training paces from the test | done | blocks.md |
| Training cycle (3 weeks build + 1 recovery) and progression proposals the owner accepts or declines | done | blocks.md |
| Points, badges, day streaks with one rest day a week, weekly challenges, personal records | done | blocks.md |
| Two levels (climbing from 6a, running to 1:20) with real-form lines and a level-up celebration | done | blocks.md |
| Charts: km per week, longest run, half-marathon trend; grade pyramid, places, hardest grade per month | done | blocks.md |
| Route list per climbing session (grade and style: OS, Flash, RP, Próba), pyramid by style, OS/flash record | done | blocks.md |
| Climbing projects: Więcej → Projekty, tries and sends from the route list, +20 per send, badge, Postęp card | done | blocks.md |
| Quality runs after the 5 km test: strides, then tempo (20 → 30 min), one a week, easy in recovery weeks; all as proposals | done | blocks.md |
| Hangboard added weight after rehab: +2 kg steps (backpack), back to 10 s, up to +10 kg; hidden while rehab is on | done | blocks.md |
| Hangboard loads: weight off or added, % of body weight, finger chart, hang records, proposals take 2 kg less off first | done | blocks.md |
| Cloud sync (Firebase over REST) | built and tested against a fake; skipped by the owner (2026-11-25), switched off | sync.md |

## The approved plan of 24 November 2026

Items 1 to 4 are built and live (see the decision log). Item 5 was the "later and conditional" group:

- Done: the "Koniec rehabilitacji" switch (unlocks pulling, maintenance rehab, no shoulder note on climbing). It stays off until the owner says rehab is finished.
- Skipped: **cloud sync** (the owner's choice, 2026-11-25; data stays on the phone, backup file for safety). Waiting on the owner: **Android app** (Capacitor: needs the owner's OK for the dependency and Android Studio on the laptop); **Strava/GPX import** (only once there's a watch).

## Next (to agree with the owner)

1. **Use it for a couple of weeks**, then tune: points per block, challenge targets, proposal steps. Real phones may show things tests can't (voice, vibration, wake lock, installing).
2. **The 5 km test (mid-December 2026):** the app proposes it after 6 logged runs. After it, strides and then tempo come as proposals (built 25 November 2026, docs/blocks.md); check the first steps with the owner once they appear.
3. **Race plan for the half marathon** (possibly Porto, September 2027): phases counted back from race day (base, build, peak, taper), weekly long-run and volume targets, race-pace sessions.

## Open questions

- Running: is Porto (September 2027) the race? The pace table was agreed as standard multiples of the 5 km pace; check it after the first test.
- Cycle: is 3 + 1 right for the owner's weeks, and should recovery weeks also cut climbing?

## Decision log

- 2026-10-31: one self-contained HTML file, no frameworks; animations are a custom SVG figure engine.
- 2026-11-01: equipment is rings only (no bar, no machines); every hanging and pulling exercise is on rings.
- 2026-11-11: progression counts training days, not calendar days; points are computed from the log, never stored; restart can keep or wipe history (`epoch`).
- 2026-11-12: weight tracking added; it earns no points, deletions sync as markers, and a history wipe keeps it.
- 2026-11-23: moved to a VS Code and GitHub layout (`src/`, `tools/`, `tests/`, `docs/`); the GitHub Pages workflow was added; tests now fail loudly (exit code 1).
- 2026-11-23: the goal is a complete training app: 1:20 half marathon and 7c. Two levels of blocks (a session block and a multi-week phase) laid out in a week planner the owner can change. Running and climbing are separate tracks. Points for every track. Manual entry, no watch.
- 2026-11-23: correction to 2026-11-01: the owner has a door-frame pull-up bar and a hangboard (20 and 15 mm). The rehab exercises stay on rings unless the owner asks to change them.
- 2026-11-24: stage 0 built: Treningownia, five tabs plus pages under Więcej, new storage keys (`treningownia-*`), state v3, `store.js`, Firebase over REST with a version condition on every write, backup file, PWA, tests before deploy.
- 2026-11-24: the main app is the GitHub Pages version on the owner's Android phone, installable and offline. Public repository (free Pages). An Android app (Capacitor) goes on the roadmap. Fresh data; the claude.ai version is retired. Kept: the player, the animation engine and exercises, the rehab logic.
- 2026-11-24: CI: build and deploy in separate jobs (deploying in the upload job failed with "No artifacts named github-pages"); Actions on current versions.
- 2026-11-24: sync on hold; focus on building the app. The owner already climbs and runs, carefully; rehab is still on.
- 2026-11-24: stage 1a built: blocks with four kinds (timed, run, climb, simple); starter library and week confirmed by the owner (3 runs, 3 climbs, Sunday a climb; hangboard with straight arms allowed; push-ups, rings, core, stretching; no pull-ups). Moving is a button, not drag and drop. Points per block from the start (15/15/12/12/6, +2 for a rating).
- 2026-11-24: weekly challenges (4 a week: full week +25, km target = 4-week average + 10%, two rotating) and personal records (+10 per record beaten), at the owner's request.
- 2026-11-24: animations for all 18 block exercises (`ATLAS.MOVES`), in the player and a new Atlas section.
- 2026-11-24: separate levels for climbing (grades from 6a, the owner's current level) and running (named steps to 1:20), each with a real-form line (hardest grade in 30 days; predicted half marathon by Riegel). Rehab, stretching and streaks count only to the total.
- 2026-11-24: the owner approved all five next items, in order: run player and paces, phases and automatic progression, charts, quick wins, then the later/conditional items. Details are confirmed per item before building.
- 2026-11-24: race idea: maybe the Porto half marathon in September 2027; first 5 km test around mid-December; easy runs only until then (the default Wednesday run changed from strides to easy).
- 2026-11-24: item 1 built: run blocks with timed segments, the run player (jogging, fast running and walking animations), the 5 km test timed to "Meta", training paces from the test (standard multiples of 5 km pace), tempo, interval and progression blocks marked "after the test".
- 2026-11-24: item 2 built: training cycle (3 + 1 by default) and progression proposals (hangboard time then 15 mm, reps, run minutes, the 5 km test), never silent, paused by shoulder pain or a red morning.
- 2026-11-24: item 3 built: charts in HTML/CSS (one colour, readout row, table view) for running and climbing.
- 2026-11-24: item 4 built: level-up celebration, one rest day a week keeps the streak, weight pace and goal date, a note when losing more than 1% a week for two weeks.
- 2026-11-24: item 5, partly: the "Koniec rehabilitacji" switch and the locked pull-up block; sync, the Android app and Strava wait on the owner.
- 2026-11-24: Atlas search and categories, at the owner's request: a search box in the sticky bar (name, dose, tips, category; ignores case and Polish letters, matches word stems), the block exercises split into five categories, the animation buttons moved under the intro.
- 2026-11-24: items 4 and 5 of Next built, with the owner's go: a route list per climbing session (OS, Flash, RP, Próba; grade and count come from the list; points per session unchanged; projects later) and hangboard loads (weight off with feet on the bathroom scale, % of body weight from the nearest weight entry, no added weight while rehab is on, proposals take off 2 kg less first). Fixed: a session under 30 s opened its log form with "0" minutes, which the form then refused.
- 2026-11-25: security review and fixes: a strict CSP in the page (only the build's scripts run, data only to Firebase), `esc()` also escapes `'`, `sanitize()` drops a `__proto__` proposal id, CI deploy rights only in the deploy job and actions pinned to SHAs, made-up body weights in tests and docs. Firebase setup hardened before it starts: sign-ups and deletion off, rules pinned to the owner's UID with a size limit, the key restricted to the app's address (docs/sync.md).
- 2026-11-25: cloud sync skipped: losing the phone's data is acceptable to the owner. The sync code stays, switched off (empty `src/config.js`); docs/sync.md keeps the hardened setup in case that changes. The backup file in Ustawienia is the way to keep a copy.
- 2026-11-25: climbing projects built, with the owner's go: Więcej → Projekty (name, grade, start, place, note), tries picked in the route list, the first OS/Flash/RP sends it (+20 on that day, toward the climbing level, badge "Pierwszy projekt"); everything computed from the log.
- 2026-11-25: quality runs after the 5 km test, with the owner's go: proposals change Mój tydzień step by step (an easy run, Wednesday first, → strides; 3 light strides runs → tempo; 2 tempo runs at effort ≤ 7 → +5 min threshold up to 30). One quality run a week; in a recovery week it shows as an easy run. Intervals wait for the race plan.
- 2026-11-25: hangboard added weight after rehab, with the owner's go: a backpack weighed on the bathroom scale (weights and dumbbells later); on 15 mm at 15 s → +2 kg and 10 s, then time to 15 s, up to +10 kg. Nothing of it shows while rehab is on.
- 2026-11-25: second security review. Fixed: `Object.prototype` names (`constructor`, `toString`) passed `sanitize()` as ids, tracks and keys, so a crafted backup broke points and crashed Dziś and Tydzień; a quote in reps text broke the focus restore when accepting a proposal (invalid CSS selector); a backup import can delete (deletion markers, a newer history wipe), which the app and docs denied: the confirmation now counts what would be removed. No HTML injection found in the new screens.
