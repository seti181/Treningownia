# Roadmap and open questions

The owner wants this to become their complete training app on the phone. Keep this file current: move items when they're done, and add decisions to the log at the bottom with a date. Agree each stage with the owner before building it (summary first, then "let's go").

## The goal

One app that:

1. **Logs** every session: rehab, running, climbing, finger strength, pulling strength, body weight.
2. **Shows progress**: charts, test results, personal bests, grades.
3. **Suggests** what to do today.
4. **Progresses** the training as the owner gets stronger, based on what was logged, and asks before it changes anything.
5. Is built from **training blocks** the owner can edit and move around.

Targets: a **1:20 half marathon** (3:47 min/km on average) by late 2028 and **7c** in climbing by May 2027. The new app starts with fresh data: nothing has to be carried over from the claude.ai version. Running and climbing are two separate tracks that share one week. The owner trains 6–7 days a week, often morning and evening, with easier recovery periods. Body weight is tracked closely, because it matters for both goals.

The shoulder rehab stays in the app and keeps its rules (CLAUDE.md): nothing new loads the left shoulder beyond the current rehab phase, and that includes the pull-up bar and the hangboard.

## Where things stand (November 2026)

- Done: rehab trainer (5 phases, timed player, morning check, pain rules, points and grades, restart and break handling), 33 animated exercises, body-weight log with a trend chart.
- Done (24 November 2026, stage 0 code): the new shell "Treningownia": navigation Dziś / Tydzień / Dziennik / Postęp / Więcej, installable and offline (PWA), account sync through Firebase (docs/sync.md), backup to a file, tests in CI before every deploy. Fresh data under new storage keys.
- Waiting on the owner: create the Firebase project and send `apiKey` and `projectId` (docs/sync.md), create the GitHub repository and switch Pages on, and a commit e-mail for the public repository. Then: first push, sign in on the phone, install.

## Two levels of blocks

The owner wants both:

- **Blok** (one session): a reusable template, for example "Interwały 6×800 m", "Zwisy max 20 mm", "Rehab barku – rano", "Podciąganie", "Wspinanie – ściana". It holds its exercises or run segments, target loads and timings, and it can run in the player. The owner can edit it, copy it, and create new ones.
- **Etap** (several weeks): a phase with a purpose and a length, for example "Baza 4 tyg.", "Budowa 3 tyg.", "Odciążenie 1 tyg.", "Szczyt", "Tapering". It sets the weekly pattern of blocks and how loads progress inside it.
- **Tydzień** (the week planner): the phases lay out each week's blocks; the owner can then drag a block to another day, swap it, skip it or add one. Dziś shows today's blocks from every track.

Rules the planner checks (to agree with the owner): hard days spaced out (for example, no hard finger session the day before intervals), a recovery week every few weeks, warnings when weekly running distance or climbing load jumps.

## Stages

### 0. Foundations: the new app shell (built; waiting for Firebase and GitHub)

A rebuild around what already works: the player, the animation engine and its exercises, and the rehab logic stay; the rest (navigation, state, screens) is new. Data starts fresh. Status per item in brackets.

1. **Git and GitHub** (local repository created; waiting for the owner's GitHub repository). The folder was not a git repository. Create it, push to a public GitHub repository (GitHub Pages is free only for public ones, which is why personal details stay in CLAUDE.local.md), and switch Pages on.
2. **New state (format 3)** (done). Version 3 under the new key `treningownia-v1`; sanitize and merge moved to `src/store.js` and tested in Node. The rehab and weight keys stay as they were; stage 1 adds blocks, phases, the week and one log as new top-level keys, so no migration is needed.
3. **Navigation** (done). Dziś / Tydzień / Dziennik / Postęp / Więcej; Waga, Atlas, Rehabilitacja barku and Ustawienia are pages under Więcej. Tydzień shows the next 7 days; Dziennik has the calendar and every entry by day (sessions, morning checks, weight); Postęp keeps points, badges, the pain chart, gates and a weight card.
4. **Rename** (done): Treningownia.
5. **Installable and offline (PWA)** (done; tests/test-pwa.js).
   - `manifest.webmanifest`: name and short name, `start_url` and `scope` "./", `display: standalone`, colours from the tokens, icons 192 and 512 px plus a maskable one. Add `<link rel="manifest">` and `theme-color`.
   - Icons: draw them from the ring logo in tools/build.js (`ICO.ring`), render PNGs once (for example with Playwright) and keep them in `src/icons/`.
   - `sw.js`: network first for the page, falling back to the cache when offline, so a new deploy arrives as soon as there's a connection. Put a build hash in the cache name; delete old caches on activate. Register it only on https or localhost.
   - Call `navigator.storage.persist()` after the first saved entry (done, in `commit()`).
   - Test with `npm run preview` (service workers work on localhost).
   - The app stays one HTML file plus these few PWA files.
6. **Cloud sync and backup** (done against a fake Firebase; needs the real project). Login with e-mail and password; one Firestore document per user, merged with `merge()`, written with a version condition. Offline first. Plain `fetch`, no SDK. Backup file export and import in Ustawienia. Details: docs/sync.md.
7. **Tests in CI** (done): .github/workflows/pages.yml runs the tests first and deploys only when they pass.
8. **Retire the claude.ai artifact** (done in the code: the build no longer makes it). The published artifact stays online with its old data, but gets no more updates.

### 1. Training blocks (the core)

- Data: `blocks` (templates), `phases` (etapy), `week` (the planned days, with the owner's moves) as new top-level state keys, with defaults, sanitize, merge and sync tests. Deletions as markers.
- A block library with built-in blocks for each track plus the owner's own.
- The week planner: move, swap, skip, add. Dziś lists today's blocks across tracks.
- Rehab becomes blocks too, generated from the existing rehab plan, so everything lives in one system. The rehab logic (phases, gates, pain rules) does not change.

### 2. One log and progress

- One log for all blocks: what was done versus planned, effort (RPE 1–10), notes, how the shoulder felt.
- Progress: charts per track, test history, personal bests. Loads relative to body weight, using the weight log.
- Weight: weekly average and change, a goal line, and a rate-of-loss check (warn when it drops too fast, which hurts training).

### 3. Running

- No watch for now: manual entry (distance, time, pace computed, effort, notes). A watch or Strava/GPX import maybe later.
- A baseline test (for example a 5 km time trial), then training paces calculated from it and recalculated after each new test.
- A plan counted back from race day (or a chosen target date): base, build, peak, taper. Easy, long, tempo and interval blocks. Weekly distance grows with a cap.
- Charts: weekly distance, long-run progression, test results, predicted half-marathon time against the 1:20 goal.

### 4. Climbing

Three parts, each gated by the rehab while it runs:

- **Fingers (hangboard, 20 and 15 mm).** Max hangs, repeaters, and similar protocols through the player. Hanging loads the shoulder, so agree with the owner which protocols fit the current rehab phase. Options that don't hang from the arms (lifting an edge from the floor) may fit earlier.
- **Pulling strength (pull-up bar, rings).** Pull-ups, lock-offs, and so on, unlocked only when the rehab allows. Until then the rehab's ring progressions cover pulling.
- **Climbing log.** Sessions (gym, rock, top rope solo, home wall), routes and grades, a grade pyramid, the hardest send, how the shoulder felt.

### 5. Smart progression

- Rules that raise or lower loads from the log (all reps done at a low RPE → up; missed or high RPE → hold or down; a bad shoulder check → follow the rehab's pain rules).
- Recovery weeks, and adjusting the week after missed days.
- The owner confirms every change. Nothing changes silently.

### 6. Points and grades for everything

The owner wants points across all tracks, with new goalposts. Today points reward rehab consistency. Design a new scheme with the owner: what earns points in each track (completed blocks, tests, personal bests, consistency), how grades are set, and how rehab points carry over.

### Later

- **Android app (Capacitor).** Pack the same app as an APK, installed directly (no Play Store, free). Adds notifications, sturdier storage, and a way to read watch data through Health Connect later.
- Watch or Strava import.

## Open questions

- Body weight: the goal line and the safe rate of loss (around 0,5–0,7 kg a week).
- Running: a race for the 1:20; current weekly distance and a recent time, to set the baseline.
- Climbing: which finger protocols fit the rehab phase.
- The weekly pattern: which days and times are for running, climbing and rehab; how many recovery days.
- Points and grades: the new scheme (stage 6).

## Decision log

- 2026-10-31: one self-contained HTML file, no frameworks; animations are a custom SVG figure engine.
- 2026-11-01: equipment is rings only (no bar, no machines); every hanging and pulling exercise is on rings.
- 2026-11-11: progression counts training days, not calendar days; points are computed from the log, never stored; restart can keep or wipe history (`epoch`).
- 2026-11-12: weight tracking added; it earns no points, deletions sync as markers, and a history wipe keeps it.
- 2026-11-23: moved to a VS Code and GitHub layout (`src/`, `tools/`, `tests/`, `docs/`); the GitHub Pages workflow was added; tests now fail loudly (exit code 1).
- 2026-11-23: the goal is a complete training app: 1:20 half marathon and 7c. Two levels of blocks (a session block and a multi-week phase) laid out in a week planner the owner can change. Running and climbing are separate tracks. Points for every track, with a new scheme. Manual entry, no watch.
- 2026-11-23: correction to 2026-11-01: the owner has a door-frame pull-up bar and a hangboard (20 and 15 mm). The rehab exercises stay on rings unless the owner asks to change them.
- 2026-11-24: stage 0 built: Treningownia, five tabs plus pages under Więcej, new storage keys (`treningownia-*`), state v3, `store.js`, Firebase over REST with a version condition on every write, backup file, PWA, tests before deploy.
- 2026-11-24: the main app is the GitHub Pages version on the owner's Android phone, installable and offline (PWA), with free cloud sync (Firebase proposed). An Android app (Capacitor) goes on the roadmap. The new app starts with fresh data; the claude.ai version is retired. Kept: the player, the animation engine and exercises, the rehab logic; everything around them is rebuilt.
