// Plik otwarty bez sieci (żądania wiszą): render, zapis lokalny, cała sesja przez „Dalej”, ponowne otwarcie.
const { chromium } = require('playwright');
const { check, finish, built, OUT, WEB, KEY } = require('./check');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const external = [];
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith('file:')) return route.continue(); external.push(u); /* bez odpowiedzi: jak zawieszona sieć */ });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date(2026, 10, 1, 7, 15) });
  const t0 = Date.now();
  await p.goto(built(WEB), { waitUntil: 'domcontentloaded', timeout: 8000 });
  const rendered = await p.isVisible('[data-act="start"][data-s="rano"]');
  check('renders with a hanging network', rendered, (Date.now() - t0) + ' ms');
  await p.clock.runFor(300);
  const syncText = await p.textContent('.sync');
  check('save status says: this device only', /na tym urządzeniu/.test(syncText), syncText);
  await p.screenshot({ path: OUT + '70-offline-today.png' });
  await p.click('[data-act="start"][data-s="rano"]');
  await p.clock.runFor(2000);
  await p.screenshot({ path: OUT + '71-offline-player.png' });
  let n = 0; while (!(await p.isVisible('#pl-done')) && n++ < 200) await p.click('[data-pl="next"]');
  await p.click('[data-pain="2"]');
  await p.click('[data-pl="close"]');
  await p.clock.runFor(1000);
  const st = await p.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
  check('session saved in localStorage', !!(st && st.log['2026-11-01'] && st.log['2026-11-01'].rano && st.log['2026-11-01'].rano.done && st.log['2026-11-01'].rano.pain === 2), JSON.stringify(st && st.log));
  // ponowne otwarcie pliku: postęp nadal jest
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.clock.runFor(300);
  check('after reopening, the session is still done', await p.isVisible('.sess.is-done'));
  check('only font requests leave the page', external.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u)), external.map(u => u.split('?')[0]).join(', '));
  finish(errs);
  await b.close();
})();
