# Architecture

## Build (`tools/build.js`)

- Inlines the scripts in this order, each in its own `<script>`: `core.js`, `ui.js`, `plan.js`, `blocks.js`, `store.js`, `views.js`, `blocks-views.js`, `config.js`, `sync.js`, `trainer.js`; plus `page.css` and `player.css`. It refuses to build if any source (or `sw.js`) contains `</script`.
- Prerenders the first frame of every atlas card and the Dziś panel for `BUILD_DAY`. The date is fixed so builds are reproducible; the app re-renders for the real date as soon as it loads.
- Writes `dist/web/` (GitHub Pages publishes this folder):
  - `index.html`: the whole app in one file (`lang="pl"`, charset, viewport, `theme-color` for light and dark, manifest and icon links). Google Fonts load without blocking (`media="print" onload=…`), so a hanging network doesn't delay the page.
  - `manifest.webmanifest`: name and short name "Treningownia", `start_url`, `scope` and `id` "./", `display: standalone`, icons 192 and 512 plus a maskable 512.
  - `sw.js`: `src/sw.js` with the version (a hash of the page, manifest and icons) and the file list filled in.
  - `icons/`: copied from `src/icons/`. The PNGs are drawn once by `npm run icons` (tools/icons.js, Playwright) and kept in git.
- Also in build.js: the atlas phase sections (`PH`), the tab and player icons (`ICO`), the player markup, and the rehab plan document URL in the footer.
- If you only have a built `index.html`: its ten inline `<script>` blocks are the ten source files, in order.

## Runtime modules

| File | Exposes | Role |
|---|---|---|
| `core.js` | `window.ATLAS = { EX, MOVES, render, view, evalAt, stillTime, prep }` | animation engine, the 33 rehab exercises (`EX`, docs/rehab.md) and the 18 block exercises (`MOVES`, docs/blocks.md) |
| `ui.js` | nothing | atlas cards: about 30 fps, only visible cards, tap a card to pause it, global pause and ½× speed; skips drawing while `body.in-player` is set |
| `plan.js` | `window.PLAN` | date helpers, rehab sessions and calendar, plan actions, points engine, weight helpers, `defaults()` |
| `blocks.js` | `window.BLOCKS` | training blocks: tracks, catalogue, built-in blocks and week, day plan and changes, block log, points per entry, weekly challenges, personal records, time and pace (docs/blocks.md) |
| `store.js` | `window.STORE` | the storage key, `sanitize`, `merge`, `canon`, backup file (`backup`, `readBackup`) |
| `views.js` | `window.VIEWS` | pure HTML builders: header chip, Dziś, Dziennik, Postęp, Więcej, Waga (with the chart SVG), Rehabilitacja, Ustawienia |
| `blocks-views.js` | adds to `window.VIEWS` | block cards on Dziś, the Tydzień planner, the log form, the library with Mój tydzień, the block editor |
| `config.js` | `window.CONFIG` | deployment settings: the Firebase project (`apiKey`, `projectId`); empty = no sync |
| `sync.js` | `window.CLOUD = { create }` | Firebase Auth and Firestore over REST (docs/sync.md) |
| `trainer.js` | nothing (IIFE) | navigation, event handling, the session player, forms, sounds and voice, wake lock, storage, sync, backup, service worker registration |
| `sw.js` | (service worker) | offline cache (below) |

core, plan, blocks, store, views, blocks-views, config and sync end with `if (typeof module !== 'undefined' && module.exports) module.exports = API;`, so tests and the build can `require()` them.

## Navigation

- Tab bar (`TABS`): Dziś, Tydzień, Dziennik, Postęp, Więcej. Five tabs fill a 320px screen; anything new goes under Więcej or into an existing tab.
- Pages under Więcej (`SUB`): `bloki`, `blok` (editor), `waga`, `atlas`, `plan` (Rehabilitacja barku), `ustawienia`. While one is open, the Więcej tab stays selected, and the page has a back button. `wpis` (the block log form) belongs to the page it was opened from (`topOf()`), and its back button returns there.
- Every page is a `<section id="tab-<name>" role="tabpanel">`; rendered ones have a `<div id="<name>-in">`. The Atlas is static markup from the build.
- A `#hash` opens any page (`#waga`, `#ustawienia`); `#faza-2`, `#rozgrzewka` or `#ruchy-core` (and the other `ruchy-` categories) opens the Atlas at that section.
- Atlas: a sticky bar with the search box (`#atlas-q`) and one scrolling row of 10 category chips (rehab phases plus Palce, Siła, Core, Rozciąganie, Bieganie); the animation buttons sit under the intro. Search (`filterAtlas` in trainer.js) matches every word against each card's `data-q` (name, internal id, dose, load, tips, category), without case or Polish letters, and by stem for words of 5+ letters (`łydki` finds `łydek`); it hides empty sections and their chips, says the count in an `aria-live` line, and Escape or × clears it. Arrow keys move along the tab bar (from a sub page they start at Więcej). Any element with `data-act="tab" data-v="<page>"` opens a page.

## Controller (`trainer.js`)

- `renderPanel(name)` rebuilds one panel and restores focus (by id, by `data-act` plus `data-i/v/s/d`, or by name and value) and the text caret. `stale` marks panels to rebuild when shown; `renderAll()` runs after every commit.
- One delegated click handler switches on `data-act`. `change`, `input` and `keydown` handlers cover the form fields. Drafts live in `ui`: the restart and stage forms, the sound mode, the weight forms, the login e-mail, the backup being imported.
- `typing()`: while an input in the current panel has focus, automatic re-renders (the minute tick, data from the cloud) wait until focus leaves (`pendingRender`).
- `commit()` sets `updated`, saves locally, schedules a sync and re-renders. `toast(text)` shows a short status line.
- The session player is described in docs/rehab.md.

## State

```
{ v: 3, epoch: ms | 0, start: 'YYYY-MM-DD', phase: 1..5, phaseStart: 'YYYY-MM-DD', dayOffset: 0..60, rung: 1..5, rungGreen: 0..2,
  snooze: null | 'YYYY-MM-DD', breakAck: null | 'YYYY-MM-DD',
  gates: { '1': [bool, …] }, morning: { 'YYYY-MM-DD': 'green' | 'yellow' | 'red' },
  log: { 'YYYY-MM-DD': { <sessionId>: { done: true, at: ms, dur: s, pain: 0..10 | null, label, partial?, note? } } },
  events: [ { k: 'phase', p, d, via: 'gate' | 'manual' | 'back' } | { k: 'rung', r, d, s } | { k: 'restart', d } ],
  weight: { 'YYYY-MM-DD': { kg, at } | { del: true, at } }, weightGoal: null | kg, weightGoalAt: ms | 0,
  blocks: { id: block | { del, at } }, week: null | { 0..6: [blockId] }, weekAt: ms | 0,
  days: { 'YYYY-MM-DD': { items: [ { k, b, skip? } ], at } }, blog: { 'YYYY-MM-DD': { k: entry | { del, at } } },
  climbBase: grade (default '6a'), runBase: 0..15, levelsAt: ms | 0,
  cycle: null | { start: Monday, build: 1..8, recover: 0..3 }, cycleAt: ms | 0, props: { id: { s: 'ok' | 'no', d, at, text } },
  rehabDone: null | 'YYYY-MM-DD', rehabDoneAt: ms | 0,
  updated: ms }
```

- `defaults(day)` in plan.js creates it. `STORE.sanitize(o, fallbackDay)` validates everything read from storage, the cloud or a backup file, and builds a fresh object with the known keys only.
- Nothing derived is stored: `progress(state, today)` computes points, grade, streak and badges; `weightStats()` and `weightWindow()` compute the averages.
- The block keys are described in docs/blocks.md. Each new key goes into `defaults()`, `sanitize()` and `merge()` with a test (tests/test-store.js or tests/test-blocks-logic.js).

## Storage, sync and backup

- localStorage keys: `treningownia-v1` (the state), `treningownia-dzwiek` (sound mode), `treningownia-konto` (the signed-in account and its tokens). Every read and write is wrapped in try/catch. The app started fresh under these keys in November 2026; never rename them, or the saved data is lost.
- After the first saved change, the app asks the browser to keep its storage (`navigator.storage.persist()`), so it isn't cleared when the phone runs low on space.
- On GitHub Pages all of the account's repositories share one origin (`<user>.github.io`), which is why every key starts with `treningownia-`.
- The device copy is always the working copy. When signed in, the trainer syncs it with one cloud document per user (docs/sync.md): read, `merge`, write the merged state if it differs, with a version condition so two devices can't overwrite each other.
- `merge(a, b)`:
  - If `epoch` differs (history was wiped somewhere), the newer epoch wins outright for the plan.
  - Otherwise the newer `updated` wins, and logs, morning answers and events are combined from both sides (events de-duplicated, sorted, last 300 kept).
  - Weight is merged in both cases: for each day the later `at` wins, deletion markers included, and the goal follows the later `weightGoalAt`.
  - Blocks, days and the block log are merged in both cases too (per item, later `at` wins); the week pattern follows the later `weekAt`.
- Compare states with `canon()` (sorted-key JSON), never with plain `JSON.stringify`.
- Backup: Więcej → Ustawienia → Kopia zapasowa. "Zapisz kopię" downloads `treningownia-kopia-YYYY-MM-DD.json` = `{ app: 'treningownia', format: 1, exported, state }`; "Wyślij kopię" uses the share sheet where the phone supports sharing files. "Wczytaj kopię" reads a file, shows a summary and, after a confirmation, merges it with `merge()`; it never deletes anything.
- Size: everything lives in one document (Firestore allows 1 MiB). Years of daily entries stay far below that; keep bulky data (GPS tracks, photos) out of the state.

## Offline (`sw.js`)

- Registered from trainer.js on https and on localhost only (never from a `file:` page).
- The page: network first with a 4 s limit, so a new deploy arrives as soon as there's a connection; without a network, the cached copy.
- The manifest and icons: from the cache. Google Fonts: cached on first use in `treningownia-fonty`, kept across versions.
- The cache name carries the build hash; `activate` deletes old versions. Firebase requests are never cached.

## Design system

- Fonts: Barlow Condensed (display), Barlow (body), IBM Plex Mono (numbers and timers), with system fallbacks when Google Fonts can't load.
- Colour tokens on `:root` in page.css, with a dark set under `prefers-color-scheme: dark` and `data-theme`:
  - `--bg --surface --surface-2 --stage --ink --muted --line --ring --elev --radius`
  - `--accent`: the red of the left arm.
  - `--p0` … `--p4`: phase colours.
  - `--ok --warn --bad --info`: traffic lights, only for good/bad states.
  - `--wt --wt-dot`: the weight chart's line and dots.
- The app icon: the ring logo (left ring in the accent red) on the ink colour; light and dark `theme-color` follow `--bg`.
- Motif: skewed climbing-tape labels (`.tape`) for phases and the player state; grade tags (`.gtag`) coloured by grade band (4 green, 5 blue, 6 amber, 7 red, 8 purple).
- Cards: 16px radius, soft shadow in light mode. Sticky segmented tab bar; the Atlas adds its own sticky chip bar. Menu rows (`.menu-i`) for the Więcej page; `.back-btn` on sub pages.
- Layout: mobile first, 16px side margins, no horizontal scroll down to 320px; breakpoints at 640, 560 and 380px. The player's controls sit in a fixed bottom bar; on a wide landscape screen the player uses two columns.
- Class names are global: `.badge` is used by the progress badges and by the atlas card's animation label (`.stage .badge` overrides it). Scope new styles.
- Charts: at most one coloured mark, thin lines, gray context, text in ink colours, a readout row that doubles as the legend, every value also in a table, drawn in real pixels for the measured width (docs/weight.md).

## Tests

| File | Covers |
|---|---|
| `tests/check.js` | `check(name, cond, extra)` prints ok/FAIL and sets exit code 1; `finish(errors)`; `built()`; `ignorable()` for blocked-font errors; `KEY`; `go(page, name)` opens a tab or a page under Więcej |
| `tests/test-plan.js` | Node only: weekly pattern and session lengths per phase, yellow and red mornings, the Today panel HTML |
| `tests/test-store.js` | Node only: sanitize, merge between two devices, deletion markers, history wipe, the backup file round trip |
| `tests/test-blocks-logic.js` | Node only: default week, no pulling in built-ins, move/skip/add/remove, pattern changes, logging, points and the full-week bonus, challenge targets and rotation, records, time and km parsing, editing/copying/resetting blocks, sanitize and merge of the block keys |
| `tests/test-sync.js` | a fake Firebase (Auth and Firestore REST) and two devices: login errors, first write, reading on a second device, a write conflict, an expired token, offline and back, no write loops, logout, a revoked session, backup to file and import on a third device |
| `tests/test-offline.js` | the page opened as a file with a hanging network: renders, a full session, saves, reopens |
| `tests/test-pwa.js` | served on localhost: manifest and icons, the service worker takes control, then with the server stopped and the browser offline the app still loads and saves |
| `tests/test-app.js` | every tab and page, the back button, arrow keys, break alert, restart, manual stage, a full session with points, the journal, a single atlas exercise, dark desktop, 320px, the weight flows (scenarios 7 and 8) |
| `tests/test-blocks.js` | a Tuesday on the phone: block cards, a timed block in the player, logging a climb and yesterday's run (pace, errors, Enter), hangboard load from the done screen (% of body weight, errors), a climb with a route list (add, remove, styles), the finger chart and new records, moving, adding, skipping, other weeks, Mój tydzień, editing and creating blocks, the journal entry outside the plan, Postęp; 320px and dark |
| `tests/test-run.js` | the run player (segments, "Dopisz dystans"), the 5 km test timed to "Meta", training paces, the charts' readout, a progression proposal accepted on Dziś, the cycle setting, the level-up celebration, ending and undoing rehab |
| `tests/shots-weight.js` | screenshots only, for looking at |

- Seed a state with `page.addInitScript` writing `localStorage[KEY]`. Control time with `page.clock.install({ time })` and `page.clock.runFor(ms)`.
- Sync tests set `window.__TEST_FIREBASE = { apiKey, projectId }` before the page loads, and answer the Google endpoints with `context.route`. The page clock doesn't move network replies, so they advance the clock in small steps with short real pauses (`settle()`).
- Use `reducedMotion: 'reduce'` for full sessions; animation frames make fast-forwarding slow.
- Screenshots go to `shots/` (not in git). After a UI change, open them and look for label collisions, overflow and dark-mode problems. Tab highlights caught half-faded are the CSS transition, not a bug.
- CI: .github/workflows/pages.yml runs `npm ci`, installs Chromium and runs `npm test` on every push; then a build job uploads `dist/web` and a separate deploy job publishes it (deploying in the same job as the upload sometimes failed with "No artifacts named github-pages").
- Not covered by automated tests: real phones (beeps, Polish voice, vibration, wake lock, installing), iPhone Safari, and the real Firebase project.
