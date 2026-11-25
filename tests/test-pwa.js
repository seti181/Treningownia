// Instalacja i praca bez sieci: strona z localhost (service worker wymaga http(s)), manifest, ikony,
// rejestracja service workera, potem bez sieci: odświeżenie nadal pokazuje aplikację i zapisuje dane.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const { check, finish, ignorable, built, OUT, WEB, KEY, ROOT } = require('./check');
built(WEB);
const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = 'http://localhost:' + PORT + '/';

function serve() {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(ROOT, 'tools', 'serve.js'), String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
    const t = setTimeout(() => reject(new Error('server did not start')), 8000);
    p.stdout.on('data', d => { if (/Preview:/.test(String(d))) { clearTimeout(t); resolve(p); } });
    p.on('exit', c => reject(new Error('server exited ' + c)));
  });
}
(async () => {
  const server = await serve();
  const b = await chromium.launch();
  const errors = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'allow' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    let cspProbe = false; // w czasie próby CSP blokada jest oczekiwana, więc jej komunikat nie jest błędem
    page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text()) && !/Failed to load resource/.test(m.text()) && !(cspProbe && /Content Security Policy/.test(m.text()))) errors.push(m.text()); });
    await page.goto(BASE);
    // CSP: wstrzyknięty skrypt się nie wykona, a dane nie wyjdą pod obcy adres
    cspProbe = true;
    const csp = await page.evaluate(() => new Promise(res => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      const seen = [];
      document.addEventListener('securitypolicyviolation', e => seen.push(e.violatedDirective));
      const s = document.createElement('script'); s.textContent = 'window.__inj = 1'; document.body.appendChild(s);
      fetch('https://example.com/x', { method: 'POST', body: 'dane' }).catch(() => {});
      setTimeout(() => res({ meta: meta ? meta.content : '', ran: !!window.__inj, seen }), 500);
    }));
    cspProbe = false;
    check('CSP: in the page, injected script blocked, no sending to other hosts', /script-src 'sha256-/.test(csp.meta) && !csp.ran && csp.seen.some(d => /^script-src/.test(d)) && csp.seen.some(d => /^connect-src/.test(d)), JSON.stringify(csp));
    // manifest i ikony
    const man = await page.evaluate(async () => {
      const href = document.querySelector('link[rel="manifest"]').href;
      const m = await (await fetch(href)).json();
      const icons = await Promise.all(m.icons.map(async i => { const r = await fetch(new URL(i.src, href)); return r.ok && /image\/png/.test(r.headers.get('content-type')) ? i.sizes + ' ' + i.purpose : 'BAD ' + i.src; }));
      return { name: m.name, display: m.display, start: m.start_url, icons };
    });
    check('manifest: name, standalone, icons 192 and 512 plus maskable', man.name === 'Treningownia' && man.display === 'standalone' && man.start === './' && man.icons.join() === '192x192 any,512x512 any,512x512 maskable', JSON.stringify(man));
    // service worker przejmuje stronę
    const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.active && r.active.state; });
    await page.reload();
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    check('service worker active and controls the page', /^activat/.test(sw) && controlled, sw);
    // bez sieci: serwer zatrzymany, przeglądarka offline
    server.kill();
    await new Promise(r => setTimeout(r, 300));
    await ctx.setOffline(true);
    await page.reload();
    const shown = await page.isVisible('#dzis-in .sess');
    check('offline: reload still shows the app', shown);
    await page.fill('#wq-kg', '72,0'); await page.press('#wq-kg', 'Enter');
    const st = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
    const today = await page.evaluate(() => window.PLAN.ymd(new Date()));
    check('offline: weight saves on the device', !!(st && st.weight[today] && st.weight[today].kg === 72));
    await page.screenshot({ path: OUT + 'p-01-offline.png' });
    const cached = await page.evaluate(async () => (await caches.keys()).filter(k => /^treningownia-/.test(k)).length);
    check('one versioned cache for the app', cached >= 1, cached + ' caches');
    await ctx.close();
  } finally {
    try { server.kill(); } catch (e) { /* już zatrzymany */ }
    await b.close();
  }
  finish(errors);
})().catch(e => { console.log('FAIL test crashed | ' + e.message); process.exitCode = 1; });
