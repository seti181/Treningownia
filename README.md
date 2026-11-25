# Treningownia

My training app, in Polish and made for the phone. It installs from the browser and works without a network. It plans the week from training blocks (running, climbing, fingers, strength, stretching) that you can move, skip, edit and log, with points, badges and a weekly goal. It tracks climbing projects, proposes the next step in running and finger training (you accept or decline), runs a shoulder rehab plan (timed sessions, 33 animated exercises) and keeps a body-weight log with a trend chart. Next steps are in `docs/roadmap.md`.

It's one HTML file plus a manifest, a service worker and icons, with no dependencies. The code lives in `src/`, and the build puts it together.

## Use it

- **The app:** `https://<your-github-name>.github.io/<repository>/`, once it's on GitHub (see below).
- **Install on Android (Chrome):** open the address, then menu (three dots) → **Install app** (or **Add to Home screen**). It then opens from its icon, full screen, and works offline.
- **Your data** is saved on the phone only (cloud sync is switched off). Save a backup file now and then: Więcej → Ustawienia → Kopia zapasowa → "Zapisz kopię", and keep it somewhere safe (for example Google Drive). "Wczytaj kopię" brings it back on any phone.

## Develop

You need [Node.js](https://nodejs.org) 18 or newer (the LTS version is fine). The tests also need Playwright:

```sh
npm install
npx playwright install chromium
```

| Command | What it does |
|---|---|
| `npm run build` | builds `dist/web/` (the app, manifest, service worker, icons) |
| `npm test` | builds, then runs every test; fails if anything broke |
| `npm run test:plan` | the quick logic tests only, no browser |
| `npm run preview` | serves the build at http://localhost:8080; your phone on the same Wi-Fi can open the "Network" address it prints |
| `npm run shots` | screenshots of the weight screens into `shots/` |
| `npm run sheet` | animation frames of the exercises into `shots/` |
| `npm run icons` | redraws the app icons into `src/icons/` |

In VS Code: Ctrl+Shift+B builds; Terminal → Run Task → test runs the tests.

**Working with Claude Code:** open this folder in VS Code and use the Claude Code extension. It reads `CLAUDE.md` (project rules) and `CLAUDE.local.md` (personal context, which never goes to GitHub). Longer notes are in `docs/`.

## Put it on GitHub

1. On github.com: **New repository**, **public** (GitHub Pages on a free account needs a public repository), with no README, .gitignore or license. Personal notes (`CLAUDE.local.md`) are in `.gitignore`, and training data is never in the repository.
2. Push this folder to it (VS Code: Source Control → Publish, or `git remote add origin …` and `git push -u origin main`).
3. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Every push to `main` then runs the tests and, if they pass, publishes a new version. Actions shows each run; Settings → Pages shows the address.

## Sync (Firebase, not in use)

Sync is built but switched off: `src/config.js` is empty, so the app never contacts Firebase. To turn it on later, follow `docs/sync.md` step by step: create a Firebase project, switch on e-mail sign-in and add your user, create a Firestore database with the rules from that file, then put the project's `apiKey` and `projectId` into `src/config.js` and push. The API key isn't a secret; the rules are what protect the data.

## Folder

```
src/        app code: animation engine and exercises, plan logic, state, views, sync, controller, service worker, icons, styles
tools/      build.js, serve.js (preview), sheet.js (animation frames), icons.js
tests/      automated tests (Node and Playwright) and the screenshot script
docs/       architecture, blocks, sync, rehab, weight, roadmap
dist/       build output (not in git)
.github/    the test-and-deploy workflow
.vscode/    editor settings, recommended extensions, build/test tasks
```

The animations show position and direction of movement; they don't replace a physiotherapist's assessment.
