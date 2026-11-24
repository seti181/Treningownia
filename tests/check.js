// Shared test helpers.
// check() prints "ok" or "FAIL" and sets exit code 1 on failure, so `npm test` (and Claude Code) can tell
// a broken change from a working one. Paths go through pathToFileURL so the tests also run on Windows.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'shots') + path.sep;
fs.mkdirSync(OUT, { recursive: true });

let fails = 0;
function check(name, cond, extra) {
  if (!cond) { fails++; process.exitCode = 1; }
  console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra != null && extra !== '' ? ' | ' + extra : ''));
  return !!cond;
}
// Call once at the end with the collected page errors.
function finish(errors) {
  check('no page errors', !errors || !errors.length, errors && errors.length ? errors.join(' | ') : '');
  console.log(fails ? fails + ' check(s) failed' : 'all checks passed');
}
// Font requests fail in sandboxes without network; they are not app errors.
const ignorable = text => /ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|fonts\.g/.test(text);

// Built page. built() stops the test early with a clear message when the build is missing.
const WEB = 'dist/web/index.html';
const KEY = 'treningownia-v1'; // localStorage key of the state
// Open a page: a tab from the tab bar, or a page under Więcej (waga, atlas, plan, ustawienia) through its menu.
const TABS = ['dzis', 'tydzien', 'dziennik', 'postep', 'wiecej'];
async function go(page, name) {
  if (TABS.indexOf(name) >= 0) await page.click('#tb-' + name);
  else { await page.click('#tb-wiecej'); await page.clock.runFor(100); await page.click('#wiecej-in [data-act="tab"][data-v="' + name + '"]'); }
  await page.clock.runFor(200);
}
function built(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.error('Missing ' + rel + '. Run: npm run build'); process.exit(1); }
  return pathToFileURL(file).href;
}

module.exports = { ROOT, OUT, check, finish, ignorable, built, WEB, KEY, TABS, go };
