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
  await page.addInitScript(() => { window.__NO_LEVELUP = true; });
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
  ok('1 weekly challenges on Dziś: 4, full week and km first', (await page.locator('#dzis-in .ch .ch-i').count()) === 4 && /Pełny tydzień/.test(await txt('#dzis-in .ch .ch-i >> nth=0')) && /Kilometry tygodnia/.test(await txt('#dzis-in .ch .ch-i >> nth=1')), await txt('#dzis-in .ch'));
  ok('1 rehab is still there, under its own heading', /Rehabilitacja barku/.test(await txt('#dzis-in')) && (await page.isVisible('[data-act="start"][data-s="rano"]')));

  // 2) zwisy z zegarem: ćwiczenia bez animacji w odtwarzaczu
  const p0 = await pts();
  await page.click('#dzis-in .blk [data-act="b-start"]'); await page.clock.runFor(500);
  ok('2 player opens the block with an animated figure', (await txt('#pl-name')) === 'Rozgrzewka palców' && (await page.locator('#pl-svg .bd.torso').count()) === 1, await txt('#pl-name'));
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
  ok('4 week planner shows the challenges', (await page.locator('#tydzien-in .ch .ch-i').count()) === 4);
  ok('4 week summary: 1 run, 1 climb, 6,5 km', /Biegi 1\/3/.test(await txt('.wk-sum')) && /Wspinanie 1\/3/.test(await txt('.wk-sum')) && /6,5 km/.test(await txt('.wk-sum')), await txt('.wk-sum'));

  // 5) przeniesienie środowego biegu na czwartek, dodanie bloku w sobotę, pominięcie
  await page.click('[data-act="wk-open"][data-d="2026-11-25"][data-k="p0-bieg-spokojny"]');
  await page.click('.wk-acts [data-act="wk-move"]');
  await page.screenshot({ path: OUT + 'b-05-move.png', fullPage: true });
  await page.click('.wk-days [data-act="b-move"][data-v="2026-11-26"]'); await page.clock.runFor(200);
  ok('5 moved: Wednesday without the run, Thursday with it', !/Bieg spokojny/.test(await txt("#wk-2026-11-25")) && /Bieg spokojny/.test(await txt("#wk-2026-11-26")), await txt('#toast'));
  await page.click('.wk-plus[data-d="2026-11-28"]');
  await page.click('[data-act="b-add"][data-d="2026-11-28"][data-s="sila-core"]'); await page.clock.runFor(200);
  ok('5 added Core on Saturday', /Core/.test(await txt('#wk-2026-11-28')));
  await page.click('[data-act="wk-open"][data-d="2026-11-29"][data-k="p0-wspinanie"]');
  await page.click('.wk-acts [data-act="b-skip"]'); await page.clock.runFor(200);
  ok('5 skipped Sunday climb', /pominięte/.test(await txt('#wk-2026-11-29')));
  await page.click('[data-act="wk-next"]'); await page.clock.runFor(100);
  ok('5 next week follows the default plan', /30 lis – 6 gru/.test(await txt('.wk-range')) && /Bieg spokojny/.test(await txt("#wk-2026-12-02")), await txt('.wk-range'));
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
  await page.click('[data-act="lg-new"]'); await page.clock.runFor(100);
  await page.selectOption('#lg-b', 'bieg-dlugi'); await page.clock.runFor(100);
  await page.fill('#lg-km', '8'); await page.fill('#lg-time', '46:00'); await page.click('[data-act="lg-save"]'); await page.clock.runFor(200);
  ok('7 a longer run: toast with the record and two challenges', /rekord: najdłuższy bieg 8 km/.test(await txt('#toast')) && /wyzwanie: Kilometry tygodnia/.test(await txt('#toast')) && /wyzwanie: Długi bieg/.test(await txt('#toast')), await txt('#toast'));
  ok('7 record listed in the journal', /Rekord: Najdłuższy bieg/.test(await txt('#dziennik-in .jr-day >> nth=0')));
  await page.screenshot({ path: OUT + 'b-09-dziennik.png', fullPage: true });

  // 8) postęp
  await go(page, 'postep');
  ok('8 progress: challenges and records', (await page.locator('#postep-in .ch .ch-i').count()) === 4 && /Najdłuższy bieg\s*8 km/.test(await txt('#postep-in .recs')) && /Najlepsze tempo od 5 km/.test(await txt('#postep-in .recs')), await txt('#postep-in .recs'));
  ok('8 progress: road to 7c, this week card', /Droga do 7c/.test(await txt('#postep-in .t-title')) && /Biegi ?2\/3/.test(await txt('#postep-in .wsum')), await txt('#postep-in .wsum'));
  await page.screenshot({ path: OUT + 'b-10-postep.png', fullPage: true });
  await page.reload(); await page.clock.runFor(300);
  ok('8 after reload everything is still there', (await page.locator('#dzis-in .blk.is-done').count()) === 4);
  await ctx.close();

  // 10) palce z obciążeniem i wspinanie z listą dróg (waga 70 kg)
  {
    const seed = { v: 3, epoch: 0, start: '2026-11-01', phase: 1, phaseStart: '2026-11-01', updated: 10, weight: { '2026-11-23': { kg: 70, at: 5 } } };
    const o = await open(b, { seed });
    const pg = o.page, t = async q => ((await pg.textContent(q)) || '').replace(/\s+/g, ' ').trim();
    const sv = () => pg.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
    ok('10 fingers card: no load yet, asks to log it', /Obciążenie: zapisz po treningu/.test(await t('#dzis-in .blk >> nth=0')));
    await pg.click('#dzis-in .blk [data-act="b-start"]'); await pg.clock.runFor(500);
    let k = 0; while (!(await pg.isVisible('#pl-done')) && k++ < 60) await pg.click('[data-pl="next"]');
    ok('10 done screen: "Dopisz obciążenie"', (await pg.isVisible('#dn-runlog')) && (await t('#dn-runlog')) === 'Dopisz obciążenie' && /Dopisz obciążenie/.test(await t('#dn-saved')));
    await pg.click('#dn-runlog'); await pg.clock.runFor(300);
    ok('10 log form opens on the load field', (await pg.isVisible('#lg-kg')) && (await pg.evaluate(() => document.activeElement && document.activeElement.id)) === 'lg-kg' && !(await pg.isVisible('[data-v="dir:add"]')));
    await pg.fill('#lg-kg', '10'); await pg.clock.runFor(50);
    ok('10 live readout: 60 kg of 70 kg, 86%', /60 kg.*70 kg.*86% wagi/.test(await t('#lg-kgp')), await t('#lg-kgp'));
    await pg.fill('#lg-kg', 'abc'); await pg.click('[data-act="lg-save"]'); await pg.clock.runFor(100);
    ok('10 bad load: error, focus on the field', (await pg.isVisible('#lg-h.is-err')) && (await pg.evaluate(() => document.activeElement.id)) === 'lg-kg');
    await pg.fill('#lg-kg', '10'); await pg.click('[data-act="lg-set"][data-v="rpe:5"]');
    await pg.screenshot({ path: OUT + 'b-11-palce-wpis.png', fullPage: true });
    await pg.click('[data-act="lg-save"]'); await pg.clock.runFor(200);
    let s2 = await sv(), z = s2.blog['2026-11-24']['p0-palce-20'];
    ok('10 load saved: -10 kg on 20 mm', z.kg === -10 && z.mm === 20 && z.rpe === 5, JSON.stringify(z));
    ok('10 card shows the load and % of body weight', /20 mm · odciążenie 10 kg · 86% wagi/.test(await t('#dzis-in .blk.is-done >> nth=0')), await t('#dzis-in .blk.is-done >> nth=0'));
    // wspinanie: trzy drogi, jedna usunięta i dodana ponownie
    await pg.click('#dzis-in .blk .go[data-act="b-log"]'); await pg.clock.runFor(200);
    ok('10 climbing form: route list empty, old fields still there', (await pg.isVisible('#lg-rg')) && (await pg.isVisible('#lg-grade')) && !(await pg.isVisible('.rl-list')));
    const addRoute = async (g, st) => { await pg.selectOption('#lg-rg', g); await pg.click(`[data-act="lg-set"][data-v="rs:${st}"]`); await pg.click('[data-act="lg-radd"]'); await pg.clock.runFor(50); };
    await addRoute('6a', 'os'); await addRoute('6a+', 'rp'); await addRoute('7a', 'fl');
    ok('10 three routes listed, hardest sent 7a, manual fields gone', (await pg.locator('.rl-list li').count()) === 3 && /Najtrudniejsza przejdzona: 7a · 3 drogi/.test(await t('#lg-rl-sum')) && !(await pg.isVisible('#lg-grade')), await t('#lg-rl-sum'));
    await pg.click('.rl-list li:nth-child(3) [data-act="lg-rdel"]'); await pg.clock.runFor(50);
    await addRoute('6b', 'pr');
    ok('10 removed a route, added an attempt: hardest sent 6a+', (await pg.locator('.rl-list li').count()) === 3 && /6a\+ · 3 drogi/.test(await t('#lg-rl-sum')) && (await pg.locator('.rl-list li.rl-pr').count()) === 1);
    await pg.click('[data-act="lg-set"][data-v="place:Hala"]');
    await pg.screenshot({ path: OUT + 'b-12-drogi.png', fullPage: true });
    await pg.click('[data-act="lg-save"]'); await pg.clock.runFor(200);
    s2 = await sv(); const c = s2.blog['2026-11-24']['p1-wspinanie'];
    ok('10 climb saved with routes, grade and count from the list', c && c.rl.length === 3 && c.grade === '6a+' && c.routes === 3, JSON.stringify(c));
    ok('10 climb card: styles counted', /max 6a\+ · 3 drogi · 1 OS, 1 RP, 1 próba/.test(await t('#dzis-in .blk.is-done >> nth=1')), await t('#dzis-in .blk.is-done >> nth=1'));
    await pg.click('#dzis-in .blk.is-done >> nth=1 >> [data-act="b-log"]'); await pg.clock.runFor(200);
    ok('10 editing the climb keeps the route list', (await pg.locator('.rl-list li').count()) === 3);
    await pg.click('[data-act="lg-cancel"]'); await pg.clock.runFor(100);
    await go(pg, 'postep');
    ok('10 Postęp: fingers chart, pyramid by style, new records', /Palce w liczbach/.test(await t('#postep-in')) && (await pg.isVisible('#cc-z20')) && /Przejścia według wyceny/.test(await t('#postep-in')) && /1 OS/.test(await t('#postep-in .hb')) && /Najmocniejszy zwis 20 mm ?86% wagi/.test(await t('#postep-in .recs')) && /Najtrudniejszy OS albo flash ?6a/.test(await t('#postep-in .recs')), await t('#postep-in .recs'));
    await pg.screenshot({ path: OUT + 'b-13-postep-palce.png', fullPage: true });
    await o.ctx.close();
  }

  // 9) 320 px i ciemny motyw: bez przewijania w bok
  for (const [name, c] of [['small', { viewport: { width: 320, height: 640 } }], ['dark', { colorScheme: 'dark' }]]) {
    const o = await open(b, { ctx: c });
    for (const pg of ['dzis', 'tydzien', 'bloki']) {
      await go(o.page, pg);
      if (pg === 'tydzien') { await o.page.click('[data-act="wk-open"][data-d="2026-11-25"][data-k="p0-bieg-spokojny"]'); await o.page.click('.wk-acts [data-act="wk-move"]'); }
      const ov = await o.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      check('9 ' + name + ': no horizontal overflow on ' + pg, !ov);
      await o.page.screenshot({ path: OUT + 'b-2x-' + name + '-' + pg + '.png', fullPage: true });
    }
    await go(o.page, 'dzis');
    await o.page.click('#dzis-in .blk .go[data-act="b-log"]'); await o.page.clock.runFor(100);
    check('9 ' + name + ': log form fits', !(await o.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    await o.page.screenshot({ path: OUT + 'b-2x-' + name + '-wpis.png', fullPage: true });
    await o.page.selectOption('#lg-rg', '6c+'); await o.page.click('[data-act="lg-radd"]'); await o.page.click('[data-act="lg-set"][data-v="rs:pr"]'); await o.page.click('[data-act="lg-radd"]'); await o.page.clock.runFor(50);
    check('9 ' + name + ': route list fits', !(await o.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    await o.page.screenshot({ path: OUT + 'b-2x-' + name + '-drogi.png', fullPage: true });
    await o.page.click('[data-act="lg-cancel"]'); await o.page.clock.runFor(100);
    await o.page.click('#dzis-in .blk [data-act="b-log"] >> nth=0'); await o.page.clock.runFor(100);
    check('9 ' + name + ': fingers form with the load fits', (await o.page.isVisible('#lg-kg')) && !(await o.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    await o.page.screenshot({ path: OUT + 'b-2x-' + name + '-palce.png', fullPage: true });
    await go(o.page, 'bloki');
    await o.page.click('[data-act="bl-edit"][data-v="sila-kolka"]'); await o.page.clock.runFor(100);
    check('9 ' + name + ': editor fits', !(await o.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    await o.page.screenshot({ path: OUT + 'b-2x-' + name + '-editor.png', fullPage: true });
    await o.ctx.close();
  }
  await b.close();
  finish(errors);
})();
