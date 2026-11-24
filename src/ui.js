(function () {
  'use strict';
  var A = window.ATLAS;
  var byId = {};
  A.EX.concat(A.MOVES || []).forEach(function (e) { byId[e.id] = e; });
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var paused = reduce, speed = 1;
  var cards = [];

  function draw(c, t) {
    var r = A.render(c.ex, t, c.ex.id, { full: true });
    c.svg.innerHTML = r.svg;
    if (r.badge) { c.badge.textContent = r.badge; c.badge.hidden = false; }
    else { c.badge.hidden = true; }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.card[data-id]'), function (el) {
    var ex = byId[el.getAttribute('data-id')];
    if (!ex) return;
    var c = {
      ex: ex, el: el,
      svg: el.querySelector('svg'),
      badge: el.querySelector('.badge'),
      tag: el.querySelector('.paused-tag'),
      btn: el.querySelector('.stage'),
      t: A.stillTime(ex), acc: 1, visible: false, paused: false
    };
    c.btn.addEventListener('click', function () {
      c.paused = !c.paused;
      c.tag.hidden = !c.paused;
      c.btn.setAttribute('aria-pressed', c.paused ? 'true' : 'false');
    });
    cards.push(c);
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var c = en.target._card;
        if (c) c.visible = en.isIntersecting;
      });
    }, { rootMargin: '120px 0px' });
    cards.forEach(function (c) { c.el._card = c; io.observe(c.el); });
  } else {
    cards.forEach(function (c) { c.visible = true; });
  }

  var playBtn = document.getElementById('play');
  var speedBtn = document.getElementById('speed');
  function syncPlay() {
    playBtn.textContent = paused ? 'Odtwórz animacje' : 'Zatrzymaj animacje';
    playBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
  }
  playBtn.addEventListener('click', function () { paused = !paused; syncPlay(); });
  speedBtn.addEventListener('click', function () {
    speed = speed === 1 ? 0.5 : 1;
    speedBtn.textContent = speed === 1 ? 'Tempo 1×' : 'Tempo ½×';
    speedBtn.setAttribute('aria-pressed', speed === 1 ? 'false' : 'true');
  });
  syncPlay();

  var prev = 0;
  function frame(now) {
    var dt = prev ? Math.min(0.1, (now - prev) / 1000) : 0;
    prev = now;
    if (!paused && !document.body.classList.contains('in-player')) {
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if (!c.visible || c.paused) continue;
        c.t += dt * speed;
        c.acc += dt;
        if (c.acc < 1 / 30) continue;
        c.acc = 0;
        draw(c, c.t);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
