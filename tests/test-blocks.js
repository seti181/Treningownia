// Playwright: bloki treningowe na telefonie. Wtorek 24.11: zwisy z zegarem, zapis wspinania, planer tygodnia (przeniesienie,
// zapis biegu z wczoraj, dodanie, kolejny tydzień), biblioteka (edycja, Mój tydzień, kopia, nowy blok), dziennik, postęp.
// Ekrany: shots/b-*.png
const { chromium } = require('playwright');
const { check, finish, built, ignorable, OUT, WEB, KEY, go } = require('./check');
const APP = built(WEB);
const errors = [];

async function open(b, o) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' }, o.ctx || {}));
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !ignorable(m.text())) errors.push(m.text()); });
  await page.clock.install({ time: new Date(2026, 10, 24, 8, 0) });
  if (o.seed) await page.addInitScript(s => localStorage.setItem('treningownia-v1', s), JSON.stringify(o.seed));
  await page.goto(APP + (o.hash || ''));
  await page.clock.runFor(300);
  return { ctx, page };
}
(async () => {
  const b = await chromium.launch();
  const { ctx, page } = await open(b, {});
  const ok = (n, c, x) => check(n, c, x);
  const txt = async q => ((await page.textContent(q)) || '').replace(/\s+/g, ' ').trim();
  const st = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
  const pts = async () => +((await txt('#hdr-prog .hp-pts b')) || 0);

  // 1) Dziś: bloki dnia
  await page.screenshot({ path: OUT + 'b-01-dzis.png', fullPage: true });
  const cards = await page.locator('#dzis-in .blk .sess-title').allTextContents();
  ok('1 Tuesday shows the fingers and climbing blocks', cards.join('|') === 'Zwisy na palcach 20 mm|Wspinanie', cards.join('|'));
  ok('1 climbing card reminds about the shoulder', /Bez blokowania/.test(await txt('#dzis-in .blk-warn')));
  ok('1 rehab is still there, under its own heading', /Rehabilitacja barku/.test(await txt('#dzis-in')) && (await page.isVisible('[data-act="start"][data-s="rano"]')));

  // 2) zwisy z zegarem: ćwiczenia bez animacji w odtwarzaczu
  const p0 = await pts();
  await page.click('#dzis-in .blk [data-act="b-start"]'); await page.clock.runFor(500);
  ok('2 player opens the block, first exercise has no animation but a stage', (await txt('#pl-name')) === 'Rozgrzewka palców' && (await page.locator('#pl-svg .halo').count()) === 1, await txt('#pl-name'));
  await page.screenshot({ path: OUT + 'b-02-player.png' });
  let n = 0; while (!(await page.isVisible('#pl-done')) && n++ < 60) await page.click('[data-pl="next"]');
  await page.click('[data-pain="1"]'); await page.clock.runFor(200);
  const why = await txt('#dn-why');
  await page.screenshot({ path: OUT + 'b-03-done.png', fullPage: true });
  await page.click('[data-pl="close"]'); await page.clock.runFor(300);
  let s = await st();
  const e1 = s.blog['2026-11-24'] && s.blog['2026-11-24']['p0-palce-20'];
  ok('2 block logged with pain, +14 points (12 + 2), first-fingers badge', e1 && e1.done && e1.pain === 1 && (await pts()) - p0 === 14 && /Zwisy na palcach/.test(why), why + ' | ' + p0 + ' → ' + (await pts()));

  // 3) wspinanie: formularz wpisu
  await page.click('#dzis-in .blk .go[data-act="b-log"]'); await page.clock.runFor(200);
  ok('3 log form opens, Dziś stays selected', (await page.isVisible('#tab-wpis')) && (await page.getAttribute('#tb-dzis', 'aria-selected')) === 'true');
  await page.click('[data-act="lg-set"][data-v="place:Hala"]');
  await page.fill('#lg-min', '90'); await page.selectOption('#lg-grade', '6a+'); await page.fill('#lg-routes', '8');
  await page.click('[data-act="lg-set"][data-v="rpe:6"]'); await page.click('[data-act="lg-set"][data-v="pain:1"]');
  await page.screenshot({ path: OUT + 'b-04-wpis.png', fullPage: true });
  await page.click('[data-act="lg-save"]'); await page.clock.runFor(200);
  ok('3 saved: back on Dziś, details on the card, toast with points', (await page.isVisible('#tab-dzis')) && /Hala · max 6a\+ · 8 dróg/.test(await txt('#dzis-in .blk.is-done >> nth=1')) && /\+17 pkt/.test(await txt('#toast')), await txt('#toast'));

  // 4) tydzień: zapis wczorajszego biegu, tempo
  await go(page, 'tydzien');
  ok('4 planner: Monday to Sunday, today marked', (await page.locator('.wk-day').count()) === 7 && /23–29 lis/.test(await txt('.wk-range')) && /Dziś/.test(await txt('.wk-day.is-today .wk-h')));
  await page.click('[data-act="wk-open"][data-d="2026-11-23"][data-k="p0-bieg-spokojny"]');
  await page.click('.wk-acts [data-act="b-log"]'); await page.clock.runFor(200);
  await page.fill('#lg-km', '6,5'); await page.fill('#lg-time', '35:00');
  ok('4 pace appears while typing', /5:23\/km/.test(await txt('#lg-pace')), await txt('#lg-pace'));
  await page.fill('#lg-time', '35;00'); await page.click('[data-act="lg-save"]'); await page.clock.runFor(100);
  ok('4 bad time: error, nothing saved', (await page.isVisible('#lg-h.is-err')) && !((await st()).blog['2026-11-23']));
  await page.fill('#lg-time', '35:00'); await page.press('#lg-time', 'Enter'); await page.clock.runFor(200);
  ok('4 Enter saves; back on Tydzień, Monday done', (await page.isVisible('#tab-tydzien')) && /6,5 km · 35:00 · 5:23\/km/.test(await txt('#wk-2026-11-23')), await txt('#wk-2026-11-23'));
  ok('4 week summary: 1 run, 1 climb, 6,5 km', /Biegi 1\/3/.test(await txt('.wk-sum')) && /Wspinanie 1\/3/.test(await txt('.wk-sum')) && /6,5 km/.test(await txt('.wk-sum')), await txt('.wk-sum'));

  // 5) przeniesienie środowego biegu na czwartek, dodanie bloku w sobotę, pominięcie
  await page.click('[data-act="wk-open"][data-d="2026-11-25"][data-k="p0-bieg-przebiezki"]');
  await page.click('.wk-acts [data-act="wk-move"]');
  await page.screenshot({ path: OUT + 'b-05-move.png', fullPage: true });
  await page.click('.wk-days [data-act="b-move"][data-v="2026-11-26"]'); await page.clock.runFor(200);
  ok('5 moved: Wednesday without the run, Thursday with it', !/Bieg z przebieżkami/.test(await txt('#wk-2026-11-25')) && /Bieg z przebieżkami/.test(await txt('#wk-2026-11-26')), await txt('#toast'));
  await page.click('.wk-plus[data-d="2026-11-28"]');
  await page.click('[data-act="b-add"][data-d="2026-11-28"][data-s="sila-core"]'); await page.clock.runFor(200);
  ok('5 added Core on Saturday', /Core/.test(await txt('#wk-2026-11-28')));
  await page.click('[data-act="wk-open"][data-d="2026-11-29"][data-k="p0-wspinanie"]');
  await page.click('.wk-acts [data-act="b-skip"]'); await page.clock.runFor(200);
  ok('5 skipped Sunday climb', /pominięte/.test(await txt('#wk-2026-11-29')));
  await page.click('[data-act="wk-next"]'); await page.clock.runFor(100);
  ok('5 next week follows the default plan', /30 lis – 6 gru/.test(await txt('.wk-range')) && /Bieg z przebieżkami/.test(await txt('#wk-2026-12-02')), await txt('.wk-range'));
  await page.click('[data-act="wk-prev"]'); await page.clock.runFor(100);
  await page.screenshot({ path: OUT + 'b-06-tydzien.png', fullPage: true });

  // 6) biblioteka: Mój tydzień, edycja, kopia, nowy blok
  await go(page, 'bloki');
  await page.screenshot({ path: OUT + 'b-07-bloki.png', fullPage: true });
  await page.click('[data-act="pat-del"][data-v="5"][data-i="1"]'); await page.clock.runFor(100);
  await page.click('[data-act="pat-open"][data-v="5"]'); await page.click('[data-act="pat-add"][data-v="5"][data-s="sila-core"]'); await page.clock.runFor(100);
  s = await st();
  ok('6 my week: Friday is now long run + core', s.week[5].join() === 'bieg-dlugi,sila-core', JSON.stringify(s.week && s.week[5]));
  await page.click('[data-act="bl-edit"][data-v="bieg-spokojny"]'); await page.clock.runFor(100);
  await page.fill('#ed-name', 'Bieg spokojny 45'); await page.fill('#ed-min', '45');
  await page.click('[data-act="ed-save"]'); await page.clock.runFor(200);
  ok('6 edited a built-in block, marked as changed', /Bieg spokojny 45/.test(await txt('#bloki-in')) && /zmieniony/.test(await txt('#bloki-in')));
  await page.click('[data-act="bl-new"]'); await page.click('[data-act="bl-new-t"][data-v="sila"]'); await page.clock.runFor(100);
  await page.click('[data-act="ed-save"]'); await page.clock.runFor(100);
  ok('6 new block without a name: error', await page.isVisible('#ed-h.is-err'));
  await page.fill('#ed-name', 'Moje kółka');
  await page.click('[data-act="ed-save"]'); await page.clock.runFor(100);
  ok('6 new timed block without exercises: error', /co najmniej jedno/.test(await txt('#ed-h')));
  await page.click('[data-act="ed-add-open"]'); await page.selectOption('#ed-add-ex', 'kolka-podpor'); await page.click('[data-act="ed-add"]');
  await page.click('[data-act="ed-add-open"]'); await page.selectOption('#ed-add-ex', 'kolka-pompka'); await page.click('[data-act="ed-add"]');
  await page.selectOption('.ed-f[data-i="1"][data-f="kind"]', 'reps'); await page.clock.runFor(100);
  await page.fill('.ed-f[data-i="1"][data-f="reps"]', '6');
  await page.click('[data-act="ed-up"][data-i="1"]');
  await page.screenshot({ path: OUT + 'b-08-editor.png', fullPage: true });
  await page.click('[data-act="ed-save"]'); await page.clock.runFor(200);
  s = await st();
  const own = Object.values(s.blocks).find(x => x.name === 'Moje kółka');
  ok('6 new block saved with two exercises in the new order', own && own.items.map(i => i.ex).join() === 'kolka-pompka,kolka-podpor' && own.items[0].reps === '6', JSON.stringify(own && own.items));
  await page.click('[data-act="bl-copy"][data-v="sila-pompki"]'); await page.clock.runFor(100);
  ok('6 copy appears as an own block', /Pompki \(kopia\)/.test(await txt('#bloki-in')));

  // 7) dziennik: wpis spoza planu
  await go(page, 'dziennik');
  await page.click('[data-act="lg-new"]'); await page.clock.runFor(100);
  await page.selectOption('#lg-b', 'rozc-pelne'); await page.clock.runFor(100);
  await page.fill('#lg-min', '20'); await page.click('[data-act="lg-save"]'); await page.clock.runFor(200);
  const jr = await txt('#dziennik-in .jr-day >> nth=0');
  ok('7 extra entry from the journal, listed under today', (await page.isVisible('#tab-dziennik')) && /Rozciąganie pełne/.test(jr) && /Wspinanie/.test(jr) && /Zwisy na palcach/.test(jr), jr.slice(0, 160));
  await page.screenshot({ path: OUT + 'b-09-dziennik.png', fullPage: true });

  // 8) postęp
  await go(page, 'postep');
  ok('8 progress: road to 7c, this week card', /Droga do 7c/.test(await txt('#postep-in .t-title')) && /Biegi ?1\/3/.test(await txt('#postep-in .wsum')), await txt('#postep-in .wsum'));
  await page.screenshot({ path: OUT + 'b-10-postep.png', fullPage: true });
  await page.reload(); await page.clock.runFor(300);
  ok('8 after reload everything is still there', (await page.locator('#dzis-in .blk.is-done').count()) === 3);
  await ctx.close();

  // 9) 320 px i ciemny motyw: bez przewijania w bok
  for (const [name, c] of [['small', { viewport: { width: 320, height: 640 } }], ['dark', { colorScheme: 'dark' }]]) {
    const o = await open(b, { ctx: c });
    for (const pg of ['dzis', 'tydzien', 'bloki']) {
      await go(o.page, pg);
      if (pg === 'tydzien') { await o.page.click('[data-act="wk-open"][data-d="2026-11-25"][data-k="p0-bieg-przebiezki"]'); await o.page.click('.wk-acts [data-act="wk-move"]'); }
      const ov = await o.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      check('9 ' + name + ': no horizontal overflow on ' + pg, !ov);
      await o.page.screenshot({ path: OUT + 'b-2x-' + name + '-' + pg + '.png', fullPage: true });
    }
    await go(o.page, 'dzis');
    await o.page.click('#dzis-in .blk .go[data-act="b-log"]'); await o.page.clock.runFor(100);
    check('9 ' + name + ': log form fits', !(await o.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    await o.page.screenshot({ path: OUT + 'b-2x-' + name + '-wpis.png', fullPage: true });
    await go(o.page, 'bloki');
    await o.page.click('[data-act="bl-edit"][data-v="sila-kolka"]'); await o.page.clock.runFor(100);
    check('9 ' + name + ': editor fits', !(await o.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    await o.page.screenshot({ path: OUT + 'b-2x-' + name + '-editor.png', fullPage: true });
    await o.ctx.close();
  }
  await b.close();
  finish(errors);
})();
