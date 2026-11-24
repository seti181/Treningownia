// Zrzuty zakładki Waga i wiersza wagi na Dziś (do oceny wyglądu).
// Użycie: npm run shots [-- empty|data|dark|small|desk|states|long]   Pliki: shots/w-*.png
const { chromium } = require('playwright');
const { OUT, built, ignorable, WEB, KEY, go } = require('./check');
const URL = built(WEB);
const errors = [];
const T = (m, d, h, mi) => new Date(2026, m - 1, d, h || 12, mi || 0);
const pad = n => (n < 10 ? '0' : '') + n;
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
function seedWeights(n, start, goal) {
  const w = {};
  let kg = start;
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(2026, 10, 12 - i, 12);
    if (i % 6 !== 4) w[ymd(d)] = { kg: Math.round((kg + Math.sin(i * 1.7) * 0.45 + Math.cos(i * 0.9) * 0.2) * 10) / 10, at: d.getTime() };
    kg -= 0.055;
  }
  return { v: 2, epoch: 0, start: '2026-11-11', phase: 1, phaseStart: '2026-11-11', dayOffset: 0, rung: 1, rungGreen: 0, snooze: null, breakAck: null, gates: {}, log: {}, morning: {}, events: [], weight: w, weightGoal: goal == null ? null : goal, weightGoalAt: goal == null ? 0 : 5, updated: 10 };
}
const seedInit = st => 'localStorage.setItem(' + JSON.stringify(KEY) + ', ' + JSON.stringify(JSON.stringify(st)) + ')';
async function open(browser, o) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: !!o.touch }, o.ctx || {}));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: o.time || T(11, 12, 7, 40) });
  if (o.seed) await page.addInitScript(seedInit(o.seed));
  await page.goto(URL + (o.hash || ''));
  await page.clock.runFor(400);
  return { ctx, page };
}
(async () => {
  const which = process.argv[2] || 'all';
  const b = await chromium.launch();
  if (which === 'all' || which === 'empty') {
    const { ctx, page } = await open(b, {});
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-01-dzis-empty.png' });
    await go(page, 'waga');
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-02-waga-empty.png', fullPage: true });
    await ctx.close();
  }
  if (which === 'all' || which === 'data') {
    const { ctx, page } = await open(b, { seed: seedWeights(43, 68.6, 64) });
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-03-dzis-data.png' });
    await go(page, 'waga');
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-04-waga-data.png', fullPage: true });
    const box = await page.locator('#wchart').boundingBox();
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5); await page.clock.runFor(100);
    await page.waitForTimeout(120); await page.locator('.wcard').screenshot({ path: OUT + 'w-05-hover.png' });
    await page.click('[data-act="w-range"][data-v="90"]'); await page.clock.runFor(200);
    await page.waitForTimeout(120); await page.locator('.wcard').screenshot({ path: OUT + 'w-06-90.png' });
    await page.click('[data-act="w-range"][data-v="0"]'); await page.clock.runFor(200);
    await page.waitForTimeout(120); await page.locator('.wcard').screenshot({ path: OUT + 'w-07-all.png' });
    await ctx.close();
  }
  if (which === 'all' || which === 'dark') {
    const { ctx, page } = await open(b, { seed: seedWeights(43, 68.6, 64), hash: '#waga', ctx: { colorScheme: 'dark', viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 } });
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-10-dark-desktop.png', fullPage: true });
    await ctx.close();
    const m = await open(b, { seed: seedWeights(43, 68.6, 64), hash: '#waga', ctx: { colorScheme: 'dark' } });
    await m.page.waitForTimeout(260); await m.page.screenshot({ path: OUT + 'w-11-dark-phone.png', fullPage: true });
    await m.ctx.close();
  }
  if (which === 'all' || which === 'small') {
    const { ctx, page } = await open(b, { seed: seedWeights(43, 68.6, 64), ctx: { viewport: { width: 320, height: 640 } } });
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-20-small-dzis.png' });
    await go(page, 'waga');
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-21-small-waga.png', fullPage: true });
    for (const t of ['dzis', 'tydzien', 'dziennik', 'postep', 'wiecej', 'waga', 'atlas', 'plan', 'ustawienia']) { await go(page, t); const ov = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); if (ov) console.log('OVERFLOW on', t); }
    await ctx.close();
  }
  if (which === 'all' || which === 'desk') {
    const { ctx, page } = await open(b, { seed: seedWeights(120, 71.5, 64), hash: '#waga', ctx: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 } });
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-30-desktop.png', fullPage: true });
    await ctx.close();
  }
  if (which === 'all' || which === 'states') {
    const { ctx, page } = await open(b, { seed: seedWeights(20, 67.6, null) });
    await page.click('[data-act="w-edit"]'); await page.fill('#wq-kg', '6,64'); await page.press('#wq-kg', 'Enter'); await page.clock.runFor(100);
    await page.waitForTimeout(260); await page.screenshot({ path: OUT + 'w-40-dzis-error.png', clip: { x: 0, y: 240, width: 390, height: 240 } });
    await page.click('[data-act="w-cancel"]'); await page.clock.runFor(100);
    await go(page, 'waga');
    await page.click('.wtab [data-act="w-del"] >> nth=2'); await page.clock.runFor(100);
    await page.fill('#w-add-kg', 'abc'); await page.press('#w-add-kg', 'Enter'); await page.clock.runFor(100);
    await page.waitForTimeout(260); await page.locator('.wlist').screenshot({ path: OUT + 'w-41-lista-stany.png' });
    await page.locator('.wcard').screenshot({ path: OUT + 'w-42-bez-celu.png' });
    await ctx.close();
  }
  if (which === 'all' || which === 'long') {
    for (const [n, tag] of [[120, 'a'], [420, 'b']]) {
      const { ctx, page } = await open(b, { seed: seedWeights(n, 66 + n * 0.055, 64), hash: '#waga' });
      for (const r of ['90', '0']) {
        await page.click('[data-act="w-range"][data-v="' + r + '"]'); await page.clock.runFor(200);
        await page.waitForTimeout(150);
        await page.locator('#wchart').screenshot({ path: OUT + 'w-50-long-' + tag + '-' + r + '.png' });
      }
      console.log('long', n, 'deltas:', ((await page.textContent('.w-deltas')) || '').replace(/\s+/g, ' '), '| dots', await page.locator('#wchart .wc-dot').count());
      await ctx.close();
    }
  }
  await b.close();
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
})();
