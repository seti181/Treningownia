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

## Where things stand (24 November 2026)

Live at https://seti181.github.io/Treningownia/ (public repository github.com/seti181/Treningownia). Every push to `main` runs the tests and publishes only if they pass.

| Area | State | Docs |
|---|---|---|
| App shell: Treningownia, tabs Dziś / Tydzień / Dziennik / Postęp / Więcej, installable and offline (PWA), backup file | done | architecture.md |
| Shoulder rehab: 5 phases, timed player with voice, morning check, pain rules, gates, breaks and restarts, 33 animated exercises | done (unchanged) | rehab.md |
| Body weight: daily entry, 7-day average, chart, goal | done | weight.md |
| Training blocks: library (runs, climbing, hangboard, push-ups, rings, core, stretching), default week, planner (move, skip, add, other weeks), log form, block editor | done | blocks.md |
| Animations for all 18 block exercises, in the player and the Atlas | done | blocks.md |
| Points per block, badges, day streaks | done | blocks.md |
| Weekly challenges (4 a week) and personal records | done | blocks.md |
| Separate levels: climbing (grades from 6a) and running (named steps to 1:20), with real-form lines | done | blocks.md |
| Cloud sync (Firebase over REST) | built and tested against a fake; on hold until the owner creates the Firebase project | sync.md |

## Next: approved plan (owner, 24 November 2026: "implement all 5")

The owner approved all five items below, in this order. Build one item per session (or per part), and before each one still post a short summary of the concrete details (doses, paces, screens) and wait for "go": the rule in CLAUDE.md stands. Each item ends with `npm test` passing, screenshots checked, docs updated, a commit and a push.

### 1. Run player and training paces (next)
Why first: the owner has no watch, so a timer that guides intervals is the biggest daily gain.
- **Run blocks with segments.** A run block can hold segments: `{ kind: 'warm' | 'run' | 'rest' | 'cool', dur (s) or km, pace zone, reps }`. Old run blocks without segments keep working (log only).
- **Run player.** Reuses the player shell (timer, voice, beeps, wake lock, pause, back/next): counts down each segment, announces the next one ("Szybko 3 minuty", "Trucht 2 minuty"), shows the target pace, beeps 3-2-1. No GPS: distance segments are shown as "about X min at your pace". Ends on the log form (km, time, effort), prefilled with the planned time.
- **Training paces** from the best 5 km test (block `bieg-test5`, or any run of 5+ km logged as a test): easy, steady, tempo, interval (standard percentages of 5 km pace; agree the table with the owner). Shown on run blocks and in Postęp; recalculated after each new test. Without a test: easy runs by feel (talk test), and a prompt to do the test.
- **New built-in run blocks** (conservative, owner confirms): tempo (10 min warm-up, 15–20 min tempo, 10 min cool-down), intervals 6 × 800 m (or 6 × 3 min) with 2 min jog, progression run, strides (existing block gets segments).
- Tests: segment timing in Node, the player through a whole interval run in Playwright (with `page.clock`), paces from a test.
- Open: the pace table; first 5 km test date.

### 2. Phases (etapy) and automatic progression
- **Phases:** `phases` state key: a list of `{ name, start, weeks, kind: 'baza' | 'budowa' | 'szczyt' | 'odciazenie' | 'start', pattern? }`. A phase can override the default week; the planner shows the current phase and week number ("Budowa, tydzień 2 z 3"). Start with a simple template: 3 weeks build + 1 week recovery, repeated; recovery week = about 60% volume, no hard sessions.
- **Progression proposals** (never silent; a card on Dziś/Tydzień: "Propozycja: …" with "Przyjmij" / "Nie teraz"):
  - Running: weekly km +10% at most, long run +1 km a week, back down in a recovery week.
  - Fingers: if the last 2 sessions were rated effort ≤ 6 and shoulder pain ≤ 2: +2 s per hang (up to 10 s → 12 s → 15 s), then 20 mm → 15 mm (reset to 7–10 s).
  - Push-ups and rings: all sets done at effort ≤ 6 → +1–2 reps per set; effort ≥ 9 or pain ≥ 4 → hold or step back.
  - Shoulder pain ≥ 4 on any block, or a red morning check → no increases that week (rehab pain rules).
- Accepting a proposal edits the block (a changed built-in, like the editor) and logs the change in Dziennik.
- Tests: rules in Node with seeded logs; accept/decline in Playwright.
- Open: phase lengths; when the first recovery week falls; finger progression steps.

### 3. Charts and climbing details
- Running: weekly km bars (12 weeks), long-run line, predicted half-marathon trend against a 1:20 line (from `runForm` per week).
- Climbing: grade pyramid (routes per grade, last 90 days), sessions by place (hall, wall, rock, TRS), hardest grade per month.
- Hangboard: load relative to body weight once added weight or feet-assisted kg are logged (uses the weight log).
- Follow the chart rules in docs/architecture.md (one coloured mark, readout row, values also in a table, real pixel width). Place: Postęp, in sections per sport.

### 4. Quick wins
- **Level-up celebration:** a short full-screen moment (new grade tag, sound, vibration) when the climbing or running level goes up; respects reduced motion and sound settings.
- **Streak protection:** one rest day per Monday–Sunday week doesn't break the day streak (shown as a shield on the day).
- **Weight goal line and rate check:** the goal (56 kg, owner) is already settable on the Waga page; add a "losing too fast" note when the 7-day average drops more than about 1% of body weight a week for two weeks, and a projected date for the goal at the current rate. Traffic-light colours stay off weight (CLAUDE.md).

### 5. Later and conditional
- **When the owner says rehab is done:** unlock pulling blocks (pull-ups, lock-offs, harder hangboard protocols), drop the shoulder reminders, keep a maintenance rehab block.
- **Cloud sync:** switch on when the owner creates the Firebase project and sends `apiKey` and `projectId` (docs/sync.md); then a real sign-in check on the phone.
- **Android app (Capacitor):** the same app as an APK installed directly; notifications (training reminders), sturdier storage, Health Connect for watch data later. Needs the owner's OK for the Capacitor dependency and Android Studio on the laptop.
- **Strava or GPX import** of runs, if the owner gets a watch.

## Open questions

- Running: a race (and date) for the 1:20; the first 5 km test; the training-pace table.
- Fingers: when to move from 20 mm to 15 mm; added weight later.
- Phases: length of the first build; when the recovery weeks fall.

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
