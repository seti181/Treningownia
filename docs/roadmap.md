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

## Next (proposed order; the owner picks)

### 1. Running: interval timer and paces (stage 1b, part 1)
- A run player: warm-up, intervals and rest with beeps and voice, for interval, tempo and stride runs. Useful because there's no watch.
- Training paces from the 5 km test (easy, tempo, interval), shown on run blocks and recalculated after each new test.
- New run blocks: tempo, intervals (e.g. 6 × 800 m), progression run.

### 2. Phases and automatic progression (stage 1b, part 2)
- **Etapy** (multi-week phases): e.g. Baza 4 tyg. → Budowa 3 tyg. → Odciążenie 1 tyg. A phase sets the weekly pattern and how loads grow inside it.
- **Progression rules** from the log, always confirmed by the owner: run volume +10% a week at most, long run +1 km; hangboard 20 → 15 mm or longer holds when effort is low; push-up and ring reps up when all sets were done at low effort; hold or step back on high effort or shoulder pain (rehab pain rules).
- Recovery weeks, and adjusting the week after missed days.

### 3. Charts and climbing details
- Weekly km chart, long-run progression, predicted half-marathon trend against 1:20.
- Climbing: grade pyramid, sessions per place (hall, wall, rock, TRS), hardest send per month.
- Loads relative to body weight (hangboard), using the weight log.

### 4. Quick wins (small, any time)
- Level-up celebration (full-screen moment with a sound).
- Streak protection (one rest day a week keeps the streak).
- Weight goal line at 56 kg and a rate-of-loss warning (about 0,5–0,7 kg a week).

### 5. When rehab ends (only when the owner says so)
- Unlock pulling: pull-ups, lock-offs, harder hangboard protocols, and drop the shoulder reminders.

### Later
- Cloud sync: switches on when the Firebase project exists (docs/sync.md).
- **Android app (Capacitor):** the same app as an APK, installed directly. Notifications, sturdier storage, watch data through Health Connect.
- Watch or Strava import.

## Open questions

- Running: a race (and date) for the 1:20; a first 5 km test to set training paces.
- Fingers: when to move from 20 mm to 15 mm, and whether to add weight later.
- Phases: how long the first build should be, and when the recovery weeks fall.

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
