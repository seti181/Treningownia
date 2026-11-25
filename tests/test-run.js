// Playwright: bieg z zegarem (odcinki, głos, „Dopisz dystans”), test 5 km mierzony do „Mety”, tempa treningowe z testu.
// Ekrany: shots/r-*.png
const { chromium } = require('playwright');
const { check, finish, built, ignorable, OUT, WEB, KEY, go } = require('./check');
const APP = built(WEB);
const errors = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(2026, 10, 30, 7, 0) }); // poniedziałek
  await page.addInitScript(() => { window.__NO_LEVELUP = true; });
  await page.goto(APP);
  await page.clock.runFor(300);
  const txt = async q => ((await page.textContent(q)) || '').replace(/\s+/g, ' ').trim();
  const st = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
  const toDone = async () => { let n = 0; while (!(await page.isVisible('#pl-done')) && n++ < 80) await page.click('[data-pl="next"]'); };

  // 1) spokojny bieg z zegarem
  const card = '#dzis-in .blk >> nth=0';
  ok('1 Monday: easy run with a timer and the talk-pace hint', /Bieg spokojny/.test(await txt(card)) && /na rozmowę/.test(await txt(card)) && (await page.isVisible('#dzis-in .blk [data-act="b-start"]')), await txt(card));
  await page.click('#dzis-in .blk [data-act="b-start"] >> nth=0'); await page.clock.runFor(300);
  await page.click('[data-pl="next"]'); await page.clock.runFor(300);
  ok('1 run segment: label Trucht, jogging figure', (await txt('#pl-state')) === 'Trucht' && (await txt('#pl-name')) === 'Trucht' && (await page.locator('#pl-svg .bd.torso').count()) === 1, await txt('#pl-state'));
  await page.screenshot({ path: OUT + 'r-01-player.png' });
  await toDone();
  ok('1 done screen offers to add the distance', await page.isVisible('#dn-runlog'));
  await page.click('#dn-runlog'); await page.clock.runFor(200);
  ok('1 log form opens for this run', (await page.isVisible('#tab-wpis')) && (await page.isVisible('#lg-km')));
  await page.fill('#lg-km', '6'); await page.fill('#lg-time', '40:00'); await page.click('[data-act="lg-set"][data-v="rpe:3"]');
  await page.click('[data-act="lg-save"]'); await page.clock.runFor(200);
  let s = await st();
  const e1 = s.blog['2026-11-30']['p0-bieg-spokojny'];
  ok('1 saved: 6 km in 40:00 with effort', e1 && e1.km === 6 && e1.sec === 2400 && e1.rpe === 3, JSON.stringify(e1));
  function ok(n, c, x) { return check(n, c, x); }

  // 2) test 5 km: dodany w Tygodniu na dziś, mierzony do „Mety”
  await go(page, 'tydzien');
  await page.click('.wk-plus[data-d="2026-11-30"]');
  await page.click('[data-act="b-add"][data-d="2026-11-30"][data-s="bieg-test5"]'); await page.clock.runFor(200);
  await go(page, 'dzis');
  const testCard = '#dzis-in .blk:has-text("Test 5 km")';
  ok('2 test card says it will set the paces', /ustawi Twoje tempa/.test(await txt(testCard)), await txt(testCard));
  await page.click(testCard + ' [data-act="b-start"]'); await page.clock.runFor(300);
  await page.click('[data-pl="next"]'); await page.clock.runFor(200); // przygotowanie -> rozgrzewka
  await page.click('[data-pl="next"]'); await page.clock.runFor(200); // rozgrzewka -> przygotuj się do testu
  await page.click('[data-pl="next"]'); await page.clock.runFor(200); // -> test
  ok('2 test leg: Test label and a Meta button', (await txt('#pl-state')) === 'Test' && (await txt('#pl-main')) === 'Meta', await txt('#pl-state') + ' | ' + await txt('#pl-main'));
  await page.screenshot({ path: OUT + 'r-02-test.png' });
  await page.clock.fastForward(1500 * 1000); await page.clock.runFor(100);
  await page.click('#pl-main'); await page.clock.runFor(200); // meta
  await toDone();
  s = await st();
  const te = Object.values(s.blog['2026-11-30']).find(x => x.b === 'bieg-test5');
  ok('2 only the test leg is timed (about 25:00)', te && Math.abs(te.sec - 1500) <= 3, te && te.sec);
  await page.click('#dn-runlog'); await page.clock.runFor(200);
  ok('2 log form shows the measured time', /^25:0\d$/.test(await page.inputValue('#lg-time')), await page.inputValue('#lg-time'));
  await page.fill('#lg-km', '5'); await page.click('[data-act="lg-save"]'); await page.clock.runFor(200);

  // 3) tempa z testu
  await go(page, 'postep');
  const pcs = await txt('#postep-in .paces');
  ok('3 training paces from the test (5:00/km -> easy 6:06–6:36)', /Spokojne ?6:06–6:36\/km/.test(pcs) && /Interwałowe ?4:51–5:03\/km/.test(pcs), pcs);
  await page.locator('#postep-in .paces').screenshot({ path: OUT + 'r-03-paces.png' });
  ok('3 charts: 12 weeks of km, readout shows this week', (await page.locator('#cc-km .cc-col').count()) === 12 && /Tydzień od 30 lis/.test(await txt('#cc-km .cc-read')) && /11 km/.test(await txt('#cc-km .cc-read')), await txt('#cc-km .cc-read'));
  await page.locator('#cc-km .cc-col >> nth=10').dispatchEvent('click');
  ok('3 tapping a week shows its value', /Tydzień od 23 lis/.test(await txt('#cc-km .cc-read')) && /0 km/.test(await txt('#cc-km .cc-read')), await txt('#cc-km .cc-read'));
  ok('3 half-marathon trend has a 1:20 line', /cel 1:20/.test(await txt('#cc-hm')));
  await page.locator('#postep-in .charts >> nth=0').screenshot({ path: OUT + 'r-07-charts.png' });
  await go(page, 'bloki');
  ok('3 library: interval block shows its pace now', /Tempo interwałowe: 4:51–5:03\/km/.test(await txt('#bloki-in')));
  await page.screenshot({ path: OUT + 'r-04-bloki.png', fullPage: true });
  await ctx.close();

  // 4) propozycje i cykl: dwa lekkie treningi palców -> karta na Dziś, przyjęcie zmienia blok
  {
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const p = await c2.newPage();
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await p.clock.install({ time: new Date(2026, 10, 27, 8, 0) });
    await p.addInitScript(k => {
      const e = (b, at, x) => Object.assign({ b, t: 'palce', kind: 'timed', name: 'Zwisy na palcach 20 mm', done: true, at, dur: 900 }, x);
      localStorage.setItem(k, JSON.stringify({ start: '2026-11-23', updated: 5, cycle: { start: '2026-11-23', build: 3, recover: 1 },
        blog: { '2026-11-24': { 'p0-palce-20': e('palce-20', 1, { rpe: 5, pain: 0 }) }, '2026-11-26': { x1: e('palce-20', 2, { rpe: 6 }) } } }));
    }, KEY);
    await p.goto(APP); await p.clock.runFor(300);
    const t2 = async q => ((await p.textContent(q)) || '').replace(/\s+/g, ' ').trim();
    check('4 Dziś shows the phase and a proposal', /Budowanie · tydzień 1 z 3/.test(await t2('#dzis-in .phase-line')) && /Zwisy 12 s zamiast 10 s/.test(await t2('#dzis-in .props')), await t2('#dzis-in .props'));
    await p.screenshot({ path: OUT + 'r-05-proposal.png' });
    await p.click('[data-act="pr-ok"]'); await p.clock.runFor(200);
    const s2 = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    check('4 accepted: the hang is 12 s, the card is gone', s2.blocks['palce-20'].items[1].hold === 12 && !(await p.isVisible('#dzis-in .props')));
    await go(p, 'dziennik');
    check('4 the change is in the journal', /Zmiana planu/.test(await t2('#dziennik-in .jr-day >> nth=0')));
    await go(p, 'bloki');
    await p.selectOption('#cy-build', '4'); await p.clock.runFor(200);
    const s3 = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    check('4 cycle changed to 4 weeks of build', s3.cycle.build === 4 && /tydzień 1 z 4/.test(await t2('#cykl')));
    await p.locator('#cykl').screenshot({ path: OUT + 'r-06-cycle.png' });
    await c2.close();
  }
  // 5) awans: okno z nowym poziomem, zamykane przyciskiem; Escape też zamyka
  {
    const c3 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const p = await c3.newPage();
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await p.clock.install({ time: new Date(2026, 10, 30, 8, 0) });
    await p.addInitScript(k => {
      localStorage.setItem(k, JSON.stringify({ start: '2026-11-30', updated: 5, blog: { '2026-11-29': { a: { b: 'bieg-spokojny', t: 'bieg', kind: 'run', name: 'Bieg spokojny', done: true, at: 1, km: 4 } } } }));
    }, KEY);
    await p.goto(APP); await p.clock.runFor(300);
    check('5 no celebration on opening the app', !(await p.isVisible('#lvup')));
    await p.click('#dzis-in .blk [data-act="b-log"] >> nth=0'); await p.clock.runFor(100);
    await p.fill('#lg-km', '6'); await p.fill('#lg-time', '38:00'); await p.click('[data-act="lg-set"][data-v="rpe:3"]');
    await p.click('[data-act="lg-save"]'); await p.clock.runFor(200);
    const t3 = ((await p.textContent('#lvup')) || '').replace(/\s+/g, ' ');
    check('5 level up: running, new level Truchtacz, focus on the button', (await p.isVisible('#lvup')) && /Bieganie/.test(t3) && /Trucht/.test(t3) && (await p.evaluate(() => document.activeElement && document.activeElement.dataset.act === 'lvup-close')), t3);
    await p.screenshot({ path: OUT + 'r-08-levelup.png' });
    await p.keyboard.press('Escape'); await p.clock.runFor(100);
    check('5 Escape closes it', !(await p.isVisible('#lvup')));
    await c3.close();
  }
  // 6) koniec rehabilitacji: potwierdzenie, podciąganie w bibliotece, bez przypomnienia przy wspinaniu, cofnięcie
  {
    const c4 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const p = await c4.newPage();
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await p.clock.install({ time: new Date(2026, 11, 1, 8, 0) }); // wtorek: palce i wspinanie
    await p.addInitScript(() => { window.__NO_LEVELUP = true; });
    await p.goto(APP); await p.clock.runFor(300);
    const t4 = async q => ((await p.textContent(q)) || '').replace(/\s+/g, ' ').trim();
    check('6 before: shoulder note on climbing, no pull-ups in the library', (await p.isVisible('#dzis-in .blk-warn')) && !(await (async () => { await go(p, 'bloki'); return /Podciąganie/.test(await t4('#bloki-in .lib-i >> nth=0') + await t4('#bloki-in')); })()));
    await go(p, 'plan');
    await p.click('[data-act="rehab-ask"]'); await p.clock.runFor(100);
    await p.screenshot({ path: OUT + 'r-09-rehab-end.png', fullPage: true });
    await p.click('[data-act="rehab-done"]'); await p.clock.runFor(200);
    const s4 = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    check('6 confirmed: rehab done, maintenance phase', s4.rehabDone === '2026-12-01' && s4.phase === 5);
    await go(p, 'bloki');
    check('6 pull-ups unlocked in the library', /Podciąganie/.test(await t4('#bloki-in')));
    await go(p, 'dzis');
    check('6 Dziś: no shoulder note on climbing, no rehab light day', !(await p.isVisible('#dzis-in .blk-warn')) && !/Rehabilitacja barku/.test(await t4('#dzis-in')));
    await go(p, 'plan');
    await p.click('[data-act="rehab-undo"]'); await p.clock.runFor(200);
    check('6 undo: rehab on again', (await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY)).rehabDone === null);
    await c4.close();
  }
  // 7) po teście 5 km: propozycja przebieżek w środę, przyjęcie zmienia Mój tydzień
  {
    const c5 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const p = await c5.newPage();
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await p.clock.install({ time: new Date(2026, 11, 1, 8, 0) }); // wtorek
    await p.addInitScript(k => {
      window.__NO_LEVELUP = true;
      localStorage.setItem(k, JSON.stringify({ start: '2026-11-23', updated: 5, cycle: { start: '2026-11-23', build: 3, recover: 1 },
        blog: { '2026-11-30': { 'p0-bieg-spokojny': { b: 'bieg-test5', t: 'bieg', kind: 'run', name: 'Test 5 km', done: true, at: 1, km: 5, sec: 1500, rpe: 9 } } } }));
    }, KEY);
    await p.goto(APP); await p.clock.runFor(300);
    const t5 = async q => ((await p.textContent(q)) || '').replace(/\s+/g, ' ').trim();
    check('7 after the 5 km test: strides proposed for Wednesday', /Przebieżki po teście/.test(await t5('#dzis-in .props')) && /W środę bieg z przebieżkami/.test(await t5('#dzis-in .props')), await t5('#dzis-in .props'));
    await p.screenshot({ path: OUT + 'r-10-strides-proposal.png' });
    await p.click('[data-act="pr-ok"][data-v="bieg:q1"]'); await p.clock.runFor(200);
    const s5 = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    check('7 accepted: Mój tydzień has strides on Wednesday', s5.week && s5.week[3].indexOf('bieg-przebiezki') >= 0 && s5.week[3].indexOf('bieg-spokojny') < 0, JSON.stringify(s5.week));
    await go(p, 'tydzien');
    check('7 Tydzień: Wednesday shows the strides run with its pace', /Bieg z przebieżkami/.test(await t5('#wk-2026-12-02')), await t5('#wk-2026-12-02'));
    await c5.close();
  }
  await b.close();
  finish(errors);
})();
