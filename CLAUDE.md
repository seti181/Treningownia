# Treningownia: personal training app

A phone-first web app with a Polish UI, built for one person: the owner. It started as a left-shoulder rehab trainer and is now the owner's whole training app: training blocks for running, climbing, fingers, strength and stretching, the shoulder rehab, body weight, and a points game with two levels (climbing and running). Live at https://seti181.github.io/Treningownia/. Grow it in small modules, following docs/roadmap.md, and check with the owner before committing to a big one.

Personal context (body, injury history, schedule, how the owner likes to work) is in `CLAUDE.local.md`. Claude Code loads it automatically. It is in .gitignore because this repository may be public: never copy its details into tracked files. If it is missing, ask instead of guessing.

## Owner and goals

- Talks to Claude in English, short and informal. Every word in the app is Polish.
- The left shoulder is in rehab (still on; the owner already climbs and runs, carefully). Until the owner says rehab is finished, nothing new may load the left shoulder beyond what the current rehab phase allows: no lock-offs with the left arm, and anything done hanging (hangboard included) must fit the rehab phase. Ask when in doubt.
- Logs body weight daily.
- Goals: a 1:20 half marathon (no race chosen yet) and climbing 7c. The app should become the owner's complete training app: log every session, show progress, suggest what to do today, and progress the training as the owner gets stronger, built from training blocks the owner can edit and move. The plan is in docs/roadmap.md.
- Equipment: gymnastic rings, resistance bands, dumbbells, a bathroom scale, a door-frame pull-up bar, a hangboard (20 mm and 15 mm crimps; added weight is a backpack weighed on the bathroom scale), a top-rope-solo kit, access to a training wall. No gym machines, no smartwatch (manual entry). Ask before assuming anything else.
- Before building a new module or anything big, sum up your understanding and the open questions, and wait for a go-ahead. Small fixes: just do them.

## Status (25 November 2026)

- Built and live: app shell and PWA; rehab with an end-of-rehab switch (off); weight with pace and goal date; training blocks with planner and editor; the run player with segments and the 5 km test; training paces; training cycle and progression proposals; animations for every exercise; the Atlas with search and 10 categories; points, badges, streaks with a weekly rest day; weekly challenges; personal records; climbing and running levels with real-form lines and a level-up celebration; charts; a route list per climbing session (OS, Flash, RP, Próba); hangboard loads in % of body weight; climbing projects (Więcej → Projekty); quality runs after the 5 km test (strides, then tempo, as proposals); hangboard added weight after rehab (backpack, +2 kg steps to +10 kg); a security pass (strict CSP, least-privilege CI, pinned actions). Details per area in docs/; the table is in docs/roadmap.md.
- **Now: the owner is using the app for a few weeks (from 25 November 2026).** Next session: ask how it went first (what felt wrong, too easy or too hard, bugs on the phone), then tune (docs/roadmap.md → Next 1). Don't start new modules before that talk.
- Cloud sync: skipped by the owner (25 November 2026). The code stays, switched off (empty src/config.js); data lives on the phone, and the backup file (Ustawienia) is the only copy elsewhere. Don't bring it up again unless the owner does.
- Waiting on the owner: Android app (Capacitor OK and Android Studio), Strava/GPX (a watch), ending rehab (only they decide).
- Next ideas, to agree with the owner first (docs/roadmap.md → Next): tune after real use, the 5 km test in mid-December, a half-marathon race plan (maybe Porto, September 2027).
- Before each new item: post a short summary of the concrete details (doses, paces, screens) and wait for "go".

## Commands

```sh
npm run build       # src/ → dist/web: index.html (the whole app), manifest.webmanifest, sw.js, icons/
npm test            # build, then every test; exits 1 on any FAIL line
npm run test:plan   # plan, state and blocks logic only, no browser, under a second
npm run preview     # serve dist/web on http://localhost:8080 (a phone on the same Wi-Fi can open it)
npm run shots       # screenshots of the weight screens → shots/
npm run sheet -- kolka-z-nogami,australijskie   # animation frames → shots/sheetN.svg
npm run icons       # redraw the app icons → src/icons/*.png (only when the logo changes)
```

Setup once: `npm install`, then `npx playwright install chromium`. Playwright is only for tests; the build needs nothing but Node 18+.

## Layout

```
src/          app code, inlined into one HTML file by the build
  core.js     animation engine + EX (33 rehab exercises) + MOVES (21 block exercises incl. running) → window.ATLAS
  ui.js       atlas card animation loop
  plan.js     rehab plan, training days, points, weight helpers      → window.PLAN
  blocks.js   training blocks: library, week pattern, day changes, block log, points, challenges, records, paces, cycle, proposals, chart data → window.BLOCKS
  store.js    storage key, sanitize, merge, canon, backup file       → window.STORE
  views.js    HTML builders for every panel, weight chart            → window.VIEWS
  blocks-views.js  block screens (Dziś cards, proposals, Tydzień planner, log form, library, cycle, editor, charts), added to VIEWS
  config.js   Firebase project (apiKey, projectId); empty = no sync  → window.CONFIG
  sync.js     Firebase Auth + Firestore over REST, no SDK            → window.CLOUD
  trainer.js  controller: navigation, events, player, forms, storage, sync, backup (IIFE, no globals)
  sw.js       service worker (offline), copied to dist/web with the version filled in
  icons/      app icons (PNG, drawn by tools/icons.js, kept in git)
  page.css, player.css
tools/        build.js, serve.js (preview), sheet.js (animation frames), icons.js
tests/        check.js (shared helpers), test-*.js, shots-weight.js
docs/         architecture.md, blocks.md, sync.md, rehab.md, weight.md, roadmap.md
dist/         build output, not in git
.github/workflows/pages.yml   on push to main: run the tests, then build and publish dist/web to GitHub Pages
```

## How it works

- One self-contained HTML file, plus a manifest, a service worker and icons so it installs on the phone and works offline. The build inlines the scripts in order core → ui → plan → blocks → store → views → blocks-views → config → sync → trainer. Each is plain browser JS; all but ui and trainer also `module.exports` their API, so Node can run them (tests, prerender).
- views.js returns HTML strings; trainer.js rebuilds a panel with `innerHTML`, then restores focus and caret. Form drafts live in the `ui` object, so a re-render never loses typing, and a panel never re-renders on its own while the owner types in it.
- State is one JSON object (shape in docs/architecture.md), always saved in localStorage (`treningownia-v1`). When the owner is signed in, it also syncs with one Firestore document through `sync.js`: read, `merge()`, write only if different, with a version condition (docs/sync.md). Points, grades and averages are computed from the log each time, never stored.
- Training is built from blocks (docs/blocks.md): a default week ("Mój tydzień") fills each day, any day can be changed, every completed block is logged and earns points. The shoulder rehab runs alongside, unchanged.
- Tabs: Dziś (today), Tydzień (week planner), Dziennik (journal), Postęp (progress), Więcej (more). Under Więcej: Bloki treningowe, Projekty wspinaczkowe, Waga, Atlas (search and category chips), Rehabilitacja barku, Ustawienia (account, backup, sound). Pages without a tab: Blok (editor) and Wpis (log form). Five tabs fill a 320px screen, so new things go under Więcej or into an existing tab.

## Rules

- UI text: Polish, short, imperative ("Zapisz", "Trzymaj"), no emojis, decimal comma (66,4). Code comments: match the surrounding code (mostly Polish).
- Keep it one self-contained HTML file (plus the PWA files): no frameworks, bundlers, SDKs or CDNs (Google Fonts is the one optional extra). Firebase is used through its REST APIs. Ask before adding any dependency.
- Sources must not contain `</script` (the build refuses).
- The page has a strict Content-Security-Policy (`CSP` in tools/build.js, docs/architecture.md → Security): no inline `on…=` handlers, no `eval`, and a new external address (an API, a font host) must be added there or the browser blocks it. Every string in HTML goes through `esc()`; everything loaded goes through `sanitize()`, which never accepts an `Object.prototype` name (`constructor`, `toString` …) as an id or key; look up state objects by own keys. A CSS selector built from data uses `CSS.escape`.
- Tests and docs use made-up body numbers (for example 70 kg), never the owner's real ones.
- A new state field goes into `defaults()` (plan.js), `sanitize()` and `merge()` (store.js) in the same change, with a merge test in tests/test-store.js. `sanitize()` keeps only known keys, so a field missing there is wiped on the next save.
- Deletions that must sync are markers (`{del: true, at}`), not removed keys.
- Dates are local `YYYY-MM-DD` strings: use the helpers in plan.js (`ymd`, `addDays`, `diff`, `dow`).
- Accessibility: real buttons, visible focus, `aria-live` on readouts that change, 44px touch targets, works at 320px width, light and dark themes, respects `prefers-reduced-motion`.
- No native form submit: buttons are `type="button"` and Enter is handled in JS.
- Colours come from the tokens in page.css. Traffic-light colours (`--ok`, `--warn`, `--bad`) mean good or bad, so never use them for weight going up or down.
- Not medical advice. Don't change rehab doses, gates or pain rules unless the owner asks; the rehab plan document is the source of truth. New training plans start conservative and the owner confirms them.
- While rehab is on: no added weight on the hangboard (the log form hides "Dociążenie", and `hangKg` turns a saved added weight into full weight; after rehab the proposals add +2 kg steps up to +10 kg), no pull-ups, ring rows or hanging pulls in any block (tests/test-blocks-logic.js checks the built-ins); climbing cards carry the shoulder reminder. Hanging on the hangboard with straight arms is allowed (owner, 24 November 2026). Pulling blocks are marked `afterRehab` and stay hidden until the owner uses "Koniec rehabilitacji" (`rehabDone`).
- Progression is never silent: the app proposes, the owner accepts (docs/blocks.md → proposals). Running stays easy-only until the 5 km test; after it, quality runs come only as proposals the owner accepts (strides, then tempo; one quality run a week; intervals wait for the race plan).
- Before you finish: `npm test` passes, and after UI changes you have looked at the screenshots in shots/ (390px and 320px, light and dark).
- Update the matching docs/ file, and this file if a command or rule changed, in the same change.

## Adding a module (fingers, running, climbing log …)

1. Agree the scope with the owner first; docs/roadmap.md lists the open questions for each idea.
2. Data: a new top-level state key (for example `fingers`, `runs`) with defaults, sanitize, merge and a sync test.
3. Logic in `src/<module>.js`, exposing `window.<NAME>` and `module.exports`. Add it to the script list in tools/build.js, before trainer.js.
4. Views: a builder in views.js or `src/<module>-views.js`, a place in the navigation (under Więcej, or inside Tydzień, Dziennik and Postęp), and a line on Dziś when there is something to do today.
5. Timed work reuses the player: a session is `{id, label, title, gap, blocks[]}` with `hold`, `reps` and `time` blocks (docs/rehab.md).
6. Points: decide with the owner whether the module earns any.
7. Tests: logic in Node like tests/test-blocks-logic.js, UI in Playwright like tests/test-blocks.js (`go(page, name)` opens any page), both using `check()` from tests/check.js.
8. Docs: write `docs/<module>.md` and add it to the list below.

## Deploy

- **GitHub Pages** is the app: every push to `main` runs .github/workflows/pages.yml, which runs `npm test` and, only if it passes, builds and publishes `dist/web`. The repository must be public (free Pages); personal details stay in CLAUDE.local.md. One-time setup on GitHub: Settings → Pages → Source: GitHub Actions.
- **Firebase** (sync, not in use: the owner skipped it): the project's `apiKey` and `projectId` live in src/config.js; setup and security rules in docs/sync.md. The API key is not a secret.
- The old claude.ai artifact (https://claude.ai/artifact/HtiHUjsonGRsj3sad5ZmNY) is retired: the build no longer makes it, and the new app started with fresh data.
- Rehab plan document (Polish, private Claude doc): https://claude.ai/artifact/1szy4nNPxGoVVRGnDQ9Mgd. Claude Code can't edit it: when a rehab number changes, tell the owner exactly what to change there.

## Gotchas

- Compare states with `canon()` (sorted-key JSON), never plain JSON, or sync writes when nothing changed.
- Playwright: control time with `page.clock`, and use `reducedMotion: 'reduce'` for full sessions (animation frames make fast-forwarding slow). Blocked font requests are not errors (`ignorable()` in tests/check.js).
- Test hooks: `window.__TRAINER_OFFSET` (ms) shifts the app's clock; `window.__TEST_FIREBASE = { apiKey, projectId }` points sync at a fake Firebase (tests/test-sync.js); `window.__NO_LEVELUP = true` keeps the level-up overlay from covering the page in flow tests.
- Global CSS class names: check for clashes before adding one (a chart's type class `cc-bar` once collided with the bar style).
- On GitHub Pages all of the account's repositories share one origin (`<user>.github.io`), so localStorage keys must stay app-specific (`treningownia-…`). Never rename them: the saved data would be lost.
- The service worker serves the cached page when the network is slow or gone. Test it with `npm run preview` (localhost); a page opened as a file never registers it.
- iPhone: a web app added to the home screen has its own storage, separate from Safari.

## Docs

- docs/architecture.md: build, runtime modules, navigation, state shape, storage, backup, offline, design system, tests.
- docs/blocks.md: training blocks: tracks, points, run player and paces, cycle and proposals, charts, after rehab, levels, challenges, records, kinds, the starter library and week, exercise animations, state, screens.
- docs/sync.md: account and cloud sync (Firebase), the sync loop, the one-time Firebase setup.
- docs/rehab.md: rehab plan logic, phases and doses, the player, the animation engine.
- docs/weight.md: weight tracking and its chart.
- docs/roadmap.md: next steps, module ideas, open questions, decision log.
