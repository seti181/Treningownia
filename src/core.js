/* Atlas ćwiczeń — silnik animacji (figura 3D, rzut prostokątny) */
(function (G) {
'use strict';

// ---------- wymiary ciała (cm) i grubości linii ----------
const L = { torso: 50, neck: 10, headR: 11, shW: 18, hipW: 9, ua: 29, fa: 26, hand: 4.5, th: 44, sh: 42, foot: 17, heel: 4 };
const W = { torso: 17, neck: 8, ua: 10, fa: 8.5, th: 13, sh: 11, foot: 6, hand: 5.2 };

// ---------- wektory ----------
const rad = d => d * Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lerpN = (a, b, t) => a + (b - a) * t;
function rotAxis(v, k, th) {
  const c = Math.cos(th), s = Math.sin(th);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}
function perp(a) { const p = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; return norm(cross(a, p)); }
function slerp(a, b, t) {
  a = norm(a); b = norm(b);
  const d = Math.max(-1, Math.min(1, dot(a, b)));
  if (d > 0.9995) return norm(lerp(a, b, t));
  if (d < -0.9995) return rotAxis(a, perp(a), t * Math.PI);
  const th = Math.acos(d), s = Math.sin(th);
  return add(mul(a, Math.sin((1 - t) * th) / s), mul(b, Math.sin(t * th) / s));
}
function rX(v, d) { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; }
function rY(v, d) { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; }
function rZ(v, d) { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; }

// Układ świata = układ osoby: x = LEWA strona osoby, y = góra, z = przód.
// ---------- poza ----------
const STAND = {
  root: [0, 90, 0], pitch: 0, roll: 0, yaw: 0, head: [0, 1, 0],
  scap: { l: [0, 0], r: [0, 0] },
  lA: { a: [0.14, -1, 0.02], b: [0.1, -1, 0.12] },
  rA: { a: [-0.14, -1, 0.02], b: [-0.1, -1, 0.12] },
  lL: { a: [0.03, -1, 0], b: [0.01, -1, -0.03] },
  rL: { a: [-0.03, -1, 0], b: [-0.01, -1, -0.03] },
  lF: [0.15, -0.05, 1], rF: [-0.15, -0.05, 1]
};
const clone = o => JSON.parse(JSON.stringify(o));
function P(over) {
  const p = clone(STAND);
  if (over) for (const k in over) {
    if (k === 'scap') p.scap = Object.assign(p.scap, clone(over.scap));
    else p[k] = clone(over[k]);
  }
  return p;
}
function mixLimb(A, B, t) {
  if (A.ik && B.ik) return { ik: lerp(A.ik, B.ik, t), pole: slerp(A.pole, B.pole, t) };
  if (A.a && B.a) return { a: slerp(A.a, B.a, t), b: slerp(A.b, B.b, t) };
  return t < 0.5 ? A : B;
}
function mix(A, B, t) {
  return {
    root: lerp(A.root, B.root, t),
    pitch: lerpN(A.pitch, B.pitch, t), roll: lerpN(A.roll, B.roll, t), yaw: lerpN(A.yaw, B.yaw, t),
    head: slerp(A.head, B.head, t),
    scap: {
      l: [lerpN(A.scap.l[0], B.scap.l[0], t), lerpN(A.scap.l[1], B.scap.l[1], t)],
      r: [lerpN(A.scap.r[0], B.scap.r[0], t), lerpN(A.scap.r[1], B.scap.r[1], t)]
    },
    lA: mixLimb(A.lA, B.lA, t), rA: mixLimb(A.rA, B.rA, t),
    lL: mixLimb(A.lL, B.lL, t), rL: mixLimb(A.rL, B.rL, t),
    lF: slerp(A.lF, B.lF, t), rF: slerp(A.rF, B.rF, t)
  };
}

// ---------- kinematyka ----------
function ik2(S, T, a, b, pole) {
  const d = sub(T, S); let dist = len(d);
  const dn = dist > 1e-6 ? mul(d, 1 / dist) : [0, -1, 0];
  dist = Math.min(a + b - 0.05, Math.max(Math.abs(a - b) + 0.05, dist));
  const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const pn = norm(pole);
  let pp = sub(pn, mul(dn, dot(pn, dn)));
  pp = len(pp) < 1e-6 ? perp(dn) : norm(pp);
  return { E: add(S, add(mul(dn, a * cosA), mul(pp, a * sinA))), W: add(S, mul(dn, dist)) };
}
function solve(p) {
  const T = v => rY(rX(rZ(v, p.roll), p.pitch), p.yaw);
  const up = T([0, 1, 0]), fwd = T([0, 0, 1]), left = T([1, 0, 0]);
  const root = p.root;
  const neck = add(root, mul(up, L.torso));
  const sl = p.scap.l, sr = p.scap.r;
  const lS = add(neck, T([L.shW + 0.3 * sl[1], sl[0], sl[1]]));
  const rS = add(neck, T([-L.shW - 0.3 * sr[1], sr[0], sr[1]]));
  const lHip = add(root, T([L.hipW, 0, 0])), rHip = add(root, T([-L.hipW, 0, 0]));
  const hd = norm(p.head);
  const headC = add(neck, mul(T(hd), L.neck + L.headR));
  let faceB = [0, 0, 1];
  const ax = cross([0, 1, 0], hd), sa = len(ax);
  if (sa > 1e-6) faceB = rotAxis([0, 0, 1], mul(ax, 1 / sa), Math.acos(Math.max(-1, Math.min(1, hd[1]))));
  const face = T(faceB);
  function arm(S, spec) {
    let E, H;
    if (spec.ik) { const r = ik2(S, spec.ik, L.ua, L.fa + L.hand, spec.pole); E = r.E; H = r.W; }
    else { E = add(S, mul(norm(spec.a), L.ua)); H = add(E, mul(norm(spec.b), L.fa + L.hand)); }
    const fd = norm(sub(H, E));
    return { S, E, W: add(E, mul(fd, L.fa)), H, fd };
  }
  function leg(Hp, spec, fdir) {
    let K, A;
    if (spec.ik) { const r = ik2(Hp, spec.ik, L.th, L.sh, spec.pole); K = r.E; A = r.W; }
    else { K = add(Hp, mul(norm(spec.a), L.th)); A = add(K, mul(norm(spec.b), L.sh)); }
    const f = norm(fdir);
    return { Hp, K, A, toe: add(A, mul(f, L.foot)), heel: add(A, mul(f, -L.heel)) };
  }
  return {
    T, up, fwd, left, root, neck, lS, rS, lHip, rHip, headC, face,
    la: arm(lS, p.lA), ra: arm(rS, p.rA), ll: leg(lHip, p.lL, p.lF), rl: leg(rHip, p.rL, p.rF)
  };
}
function pt(s, n) {
  if (Array.isArray(n)) return n;
  switch (n) {
    case 'lS': return s.lS; case 'rS': return s.rS;
    case 'lE': return s.la.E; case 'rE': return s.ra.E;
    case 'lH': return s.la.H; case 'rH': return s.ra.H;
    case 'lK': return s.ll.K; case 'rK': return s.rl.K;
    case 'neck': return s.neck; case 'root': return s.root; case 'head': return s.headC;
    case 'lArm': return add(s.lS, add(mul(s.up, -9), add(mul(s.left, -4), mul(s.fwd, -1))));
    case 'lLat': return add(s.root, add(mul(s.up, 30), add(mul(s.left, 13), mul(s.fwd, -7))));
    case 'lScap': return add(s.lS, s.T([-9, -12, -10]));
    case 'lTrap': return add(s.neck, s.T([7, -18, -10]));
    case 'handsMid': return lerp(s.la.H, s.ra.H, 0.5);
  }
  return [0, 0, 0];
}

// ---------- kamera ----------
function makeCam(c) {
  const th = (c.az == null ? 35 : c.az) - 90, el = c.el == null ? 12 : c.el;
  const f = v => { const q = rX(rY(v, th), el); return [q[0], -q[1], q[2]]; };
  f.hz = v => rY(v, th)[2];
  return f;
}

// ---------- oś czasu ----------
const ease = u => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u)));
function prep(ex) {
  if (ex._tl) return ex._tl;
  let t = 0; const segs = [];
  ex.seq.forEach((s, i) => { segs.push({ i, t0: t, m: s.m || 0, h: s.h || 0 }); t += (s.m || 0) + (s.h || 0); });
  ex._tl = { segs, total: t };
  return ex._tl;
}
function evalAt(ex, time) {
  const tl = prep(ex), n = ex.seq.length;
  const tt = ((time % tl.total) + tl.total) % tl.total;
  let g = tl.segs[n - 1];
  for (const sg of tl.segs) { if (tt < sg.t0 + sg.m + sg.h) { g = sg; break; } }
  const s = ex.seq[g.i], pr = ex.seq[(g.i - 1 + n) % n];
  const loc = tt - g.t0;
  if (loc < g.m) {
    const u = loc / g.m;
    if (s.cut) return { pose: u < 0.5 ? pr.p : s.p, eff: 0, glow: 0, badge: null, op: Math.abs(u - 0.5) * 2 };
    const e = ease(u);
    return { pose: mix(pr.p, s.p, e), eff: lerpN(pr.eff || 0, s.eff || 0, e), glow: lerpN(pr.glow || 0, s.glow || 0, e), badge: s.mbadge || null, op: 1 };
  }
  return { pose: s.p, eff: s.eff || 0, glow: s.glow || 0, badge: s.badge || null, op: 1 };
}
function stillTime(ex) {
  const tl = prep(ex);
  let k = ex.rep;
  if (k == null) { k = 0; ex.seq.forEach((s, i) => { if ((s.h || 0) > (ex.seq[k].h || 0)) k = i; }); }
  const g = tl.segs[k];
  return g.t0 + g.m + Math.max(0.05, g.h * 0.5);
}

// ---------- kadr ----------
function boxCorners(c, h) {
  const o = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) o.push([c[0] + sx * h[0], c[1] + sy * h[1], c[2] + sz * h[2]]);
  return o;
}
function view(ex) {
  if (ex._vb) return ex._vb;
  const pj = cam(ex), tl = prep(ex);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const acc = (v, r) => { const q = pj(v); x0 = Math.min(x0, q[0] - r); x1 = Math.max(x1, q[0] + r); y0 = Math.min(y0, q[1] - r); y1 = Math.max(y1, q[1] + r); };
  for (let k = 0; k < 48; k++) {
    const s = solve(evalAt(ex, tl.total * k / 48).pose);
    [s.lS, s.rS, s.lHip, s.rHip, s.neck, s.la.E, s.la.H, s.ra.E, s.ra.H, s.ll.K, s.ll.A, s.rl.K, s.rl.A, s.ll.toe, s.rl.toe].forEach(v => acc(v, 7));
    acc(s.headC, L.headR + 2);
  }
  for (const pr of ex.props || []) {
    if (pr.t === 'box' || pr.t === 'scale') boxCorners(pr.c, pr.h).forEach(v => acc(v, 1));
    else if (pr.t === 'bar') { acc(pr.a, 3); acc(pr.b, 3); }
    else if (pr.t === 'band' || pr.t === 'cable') { if (Array.isArray(pr.a)) acc(pr.a, 3); }
    else if (pr.t === 'pulley') acc(pr.at, 7);
    else if (pr.t === 'rings') { const top = pr.y + (pr.vis || 40); acc([pr.x, top, pr.z || 0], 3); acc([-pr.x, top, pr.z || 0], 3); }
  }
  let w = x1 - x0, h = y1 - y0;
  const pad = 8 + 0.05 * Math.max(w, h);
  x0 -= pad; y0 -= pad; w += 2 * pad; h += 2 * pad;
  const R = 4 / 3;
  if (w / h < R) { const nw = h * R; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / R; y0 -= (nh - h) / 2; h = nh; }
  ex._vb = [x0, y0, w, h];
  return ex._vb;
}
function cam(ex) { return ex._pj || (ex._pj = makeCam(ex.cam || {})); }

// ---------- rysowanie ----------
const F = n => Math.round(n * 10) / 10;
// Promienie (cm) przy bliższym i dalszym końcu: kończyny zwężają się jak w ilustracji.
const RAD = { ua: [5.5, 4.4], fa: [4.4, 3.4], th: [7.4, 5.5], sh: [5.4, 3.9], foot: [3.2, 2.5], hand: 4.7, neck: 4.4, torso: 7.6 };
const HALO = 1.8;
// Obrys kapsuły o różnych promieniach końców (punkty w układzie ekranu).
function capsule(A, B, r1, r2) {
  const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy);
  const pts = [];
  if (d < 0.6) {
    const r = Math.max(r1, r2);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pts.push([A[0] + r * Math.cos(a), A[1] + r * Math.sin(a)]); }
    return pts;
  }
  const a0 = Math.atan2(dy, dx);
  const th = Math.acos(Math.max(-0.95, Math.min(0.95, (r1 - r2) / d)));
  const nb = 7, na = 9, span = 2 * Math.PI - 2 * th;
  for (let i = 0; i <= nb; i++) { const a = a0 + th - 2 * th * i / nb; pts.push([B[0] + r2 * Math.cos(a), B[1] + r2 * Math.sin(a)]); }
  for (let i = 0; i <= na; i++) { const a = a0 - th - span * i / na; pts.push([A[0] + r1 * Math.cos(a), A[1] + r1 * Math.sin(a)]); }
  return pts;
}
const ptsAttr = pts => pts.map(q => F(q[0]) + ',' + F(q[1])).join(' ');
// Ślad lewej dłoni w pętli ruchu (liczony raz na ćwiczenie).
function handPath(ex) {
  if (ex._hp !== undefined) return ex._hp;
  const tl = prep(ex), pj = cam(ex), pts = [];
  for (let k = 0; k <= 72; k++) { const q = pj(solve(evalAt(ex, tl.total * k / 72).pose).la.H); pts.push(q); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  pts.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  ex._hp = ex.path === false || Math.hypot(x1 - x0, y1 - y0) < 14 ? null : 'M' + pts.map(q => F(q[0]) + ' ' + F(q[1])).join(' L');
  return ex._hp;
}
function render(ex, time, uid, opts) {
  const st = evalAt(ex, time);
  const br = Math.sin(time * 2 * Math.PI / 3.8);
  const bp = Object.assign({}, st.pose, {
    root: [st.pose.root[0], st.pose.root[1] + 0.35 * br, st.pose.root[2]],
    scap: { l: [st.pose.scap.l[0] + 0.5 * br, st.pose.scap.l[1]], r: [st.pose.scap.r[0] + 0.5 * br, st.pose.scap.r[1]] }
  });
  const s = solve(bp);
  const pj = cam(ex);
  const vb = view(ex);
  const back = [], mid = [], top = [];
  const line = (A, B, w, cls) => `<line x1="${F(A[0])}" y1="${F(A[1])}" x2="${F(B[0])}" y2="${F(B[1])}" stroke-width="${w}" class="${cls}"/>`;
  const seg = (a, b, w, cls, arr, dOff) => { const A = pj(a), B = pj(b); (arr || mid).push({ d: (A[2] + B[2]) / 2 + (dOff || 0), s: line(A, B, w, cls) }); };
  const segN = (a, b, w, cls, n) => { for (let i = 0; i < n; i++) seg(lerp(a, b, i / n), lerp(a, b, (i + 1) / n), w, cls); };
  const poly = (pts, cls, extra) => `<polygon points="${pts.map(v => { const q = pj(v); return F(q[0]) + ',' + F(q[1]); }).join(' ')}" class="${cls}"${extra || ''}/>`;
  const circ = (v, r, cls) => { const q = pj(v); return `<circle cx="${F(q[0])}" cy="${F(q[1])}" r="${r}" class="${cls}"/>`; };
  const pulse = 0.8 + 0.2 * Math.sin(time * 2 * Math.PI * 1.1);

  // podłoga i cień: miękka plama światła, bez twardych krawędzi
  if (ex.floor !== false) {
    const c = [s.root[0], 0, s.root[2]], pts = [];
    for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; pts.push([c[0] + Math.cos(a) * 125, 0, c[2] + Math.sin(a) * 100]); }
    back.push({ d: -1e6, s: poly(pts, 'floor', ` style="fill:url(#fl-${uid})"`) });
  }
  if (ex.shadow !== false) {
    const c = [s.root[0], 0.2, s.root[2]], pts = [];
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; pts.push([c[0] + Math.cos(a) * 36, 0.2, c[2] + Math.sin(a) * 28]); }
    back.push({ d: -9e5, s: poly(pts, 'shadow', ` style="fill:url(#sh-${uid})"`) });
  }
  const hp = handPath(ex);
  if (hp) back.push({ d: -8e5, s: `<path d="${hp}" class="trail"/>` });

  // rekwizyty
  const boxSvg = (pr, arr) => {
    const c = pr.c, h = pr.h, cs = boxCorners(c, h);
    const I = (x, y, z) => (x > 0 ? 4 : 0) + (y > 0 ? 2 : 0) + (z > 0 ? 1 : 0);
    const faces = [
      { n: [1, 0, 0], v: [I(1, -1, -1), I(1, 1, -1), I(1, 1, 1), I(1, -1, 1)], k: 'ps' },
      { n: [-1, 0, 0], v: [I(-1, -1, -1), I(-1, -1, 1), I(-1, 1, 1), I(-1, 1, -1)], k: 'ps' },
      { n: [0, 1, 0], v: [I(-1, 1, -1), I(-1, 1, 1), I(1, 1, 1), I(1, 1, -1)], k: 'pt' },
      { n: [0, 0, 1], v: [I(-1, -1, 1), I(1, -1, 1), I(1, 1, 1), I(-1, 1, 1)], k: 'pf' },
      { n: [0, 0, -1], v: [I(-1, -1, -1), I(-1, 1, -1), I(1, 1, -1), I(1, -1, -1)], k: 'pf' }
    ];
    const pc = pj(c);
    const kind = pr.k || 'prop';
    let out = '';
    for (const f of faces) {
      const pn = pj(add(c, f.n));
      if (pn[2] - pc[2] > 0.002) out += poly(f.v.map(i => cs[i]), kind + ' ' + f.k);
    }
    arr.push({ d: pr.layer === 'mid' ? pc[2] : -5e5 + pc[2], s: out });
  };

  for (const pr of ex.props || []) {
    switch (pr.t) {
      case 'box': boxSvg(pr, pr.layer === 'mid' ? mid : back); break;
      case 'scale': {
        boxSvg({ c: pr.c, h: pr.h, k: 'scale' }, back);
        boxSvg({ c: [pr.c[0], pr.c[1] + pr.h[1] + 0.2, pr.c[2] + pr.h[2] * 0.55], h: [pr.h[0] * 0.45, 0.2, pr.h[2] * 0.25], k: 'disp' }, back);
        break;
      }
      case 'bar': segN(pr.a, pr.b, pr.w || 4.5, 'bar', 10); break;
      case 'band': segN(pt(s, pr.a), pt(s, pr.b), 3, 'band', 6); break;
      case 'cable': segN(pt(s, pr.a), pt(s, pr.b), 1.6, 'cable', 4); break;
      case 'pulley': { const q = pj(pr.at); back.push({ d: q[2], s: `<circle cx="${F(q[0])}" cy="${F(q[1])}" r="6" class="metal"/>` }); break; }
      case 'rings': {
        // Kółka gimnastyczne: pas z góry (poza kadrem) do kółka, kółko trzymane w dłoni.
        for (const side of [1, -1]) {
          const H = side > 0 ? s.la.H : s.ra.H;
          const anchor = [side * pr.x, pr.y + 320, pr.z || 0];
          const u = norm(sub(anchor, H));
          let v = sub(s.fwd, mul(u, dot(s.fwd, u)));
          v = len(v) < 1e-3 ? perp(u) : norm(v);
          const r = 6.5, C = add(H, mul(u, 3.5));
          const pts = [];
          for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; pts.push(add(C, add(mul(u, Math.cos(a) * r), mul(v, Math.sin(a) * r)))); }
          const qc = pj(C);
          mid.push({ d: qc[2] + 0.6, s: `<polygon points="${pts.map(w => { const q = pj(w); return F(q[0]) + ',' + F(q[1]); }).join(' ')}" stroke-width="2.6" class="ring"/>` });
          const t0 = add(C, mul(u, r));
          for (let i = 0; i < 8; i++) seg(lerp(t0, anchor, i / 8), lerp(t0, anchor, (i + 1) / 8), 2.2, 'strap');
        }
        break;
      }
      case 'hbar': { const c = pt(s, 'handsMid'); segN(add(c, mul(s.left, -pr.half)), add(c, mul(s.left, pr.half)), 4.5, 'bar', 10); break; }
      case 'towel': {
        const arm = pr.side === 'r' ? s.ra : s.la, sign = pr.side === 'r' ? 1 : -1;
        const c = add(add(arm.E, mul(s.left, sign * 6.5)), mul(s.up, 3));
        seg(add(c, mul(s.fwd, -6)), add(c, mul(s.fwd, 6)), 7, 'towel', mid, 0.5);
        break;
      }
      case 'db': {
        const arm = pr.hand === 'r' ? s.ra : s.la;
        const c = arm.H, ax = norm(pr.ax);
        const a = add(c, mul(ax, -7)), b = add(c, mul(ax, 7));
        seg(a, b, 3.4, 'db', mid, 0.6);
        const qa = pj(a), qb = pj(b);
        mid.push({ d: qa[2] + 0.7, s: `<circle cx="${F(qa[0])}" cy="${F(qa[1])}" r="5.6" class="db"/>` });
        mid.push({ d: qb[2] + 0.7, s: `<circle cx="${F(qb[0])}" cy="${F(qb[1])}" r="5.6" class="db"/>` });
        break;
      }
      case 'scap': {
        const back2 = pj(add(s.neck, s.T([0, 0, -1])))[2] - pj(s.neck)[2];
        if (back2 > 0) {
          const tri = (side) => {
            const sc = side > 0 ? st.pose.scap.l : st.pose.scap.r;
            const o = (v) => add(s.neck, s.T([side * (v[0] + 0.6 * sc[1]), v[1] + sc[0], v[2]]));
            return [o([6, -2, -9.5]), o([8, -21, -9.5]), o([17, -4, -9.5])];
          };
          const tz = (pj(s.lS)[2] + pj(s.rS)[2]) / 2 + 9;
          mid.push({ d: tz, s: poly(tri(1), 'scapL') + poly(tri(-1), 'scapR') });
        }
        break;
      }
      case 'arrow': {
        const e = st.eff;
        if (e > 0.02) {
          const a0 = add(pt(s, pr.at), pr.off || [0, 0, 0]);
          const a1 = add(a0, mul(norm(pr.dir), pr.len * (0.35 + 0.65 * e)));
          const A = pj(a0), B = pj(a1);
          const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
          const k = vb[2] / 260, hl = Math.min(8 * k, l * 0.7), hw = 5 * k, bx = B[0] - ux * hl, by = B[1] - uy * hl;
          top.push({ d: 0, s: `<g class="arrow" opacity="${F(e * pulse * 100) / 100}"><line x1="${F(A[0])}" y1="${F(A[1])}" x2="${F(bx)}" y2="${F(by)}" stroke-width="${F(3.4 * k)}"/><polygon points="${F(B[0])},${F(B[1])} ${F(bx - uy * hw)},${F(by + ux * hw)} ${F(bx + uy * hw)},${F(by - ux * hw)}"/></g>` });
        }
        break;
      }
      case 'glow': {
        const g = st.glow;
        if (g > 0.02) {
          const q = pj(add(pt(s, pr.at), pr.off || [0, 0, 0]));
          const ph = 0.7 + 0.3 * Math.sin(time * 2 * Math.PI * 0.9);
          top.push({ d: 0, s: `<circle cx="${F(q[0])}" cy="${F(q[1])}" r="${pr.r || 15}" fill="url(#gl-${uid})" opacity="${F(g * ph * 100) / 100}"/>` });
        }
        break;
      }
    }
  }

  // sylwetka: kapsuły z obwódką w kolorze tła, żeby części ciała się nie zlewały
  const waist = (S, Hp) => add(lerp(S, Hp, 0.62), mul(sub(s.root, Hp), 0.18));
  const tq = [s.lS, s.rS, waist(s.rS, s.rHip), s.rHip, s.lHip, waist(s.lS, s.lHip)].map(pj);
  const tD = tq.reduce((a, q) => a + q[2], 0) / tq.length;
  const tH = [s.lS, s.rS, s.rHip, s.lHip].reduce((a, v) => a + pj.hz(v), 0) / 4;
  const farOf = (a, b) => (pj.hz(a) + pj.hz(b)) / 2 < tH - 6;
  // tułów: obwódka tylko w górnej części, żeby nie przecinać bioder
  const hipUp = v => add(v, mul(sub(s.neck, s.root), 0.32));
  const th2 = [s.lS, s.rS, hipUp(s.rHip), hipUp(s.lHip)].map(pj);
  const tw = RAD.torso * 2;
  mid.push({ d: tD, s:
    `<polygon points="${ptsAttr(th2)}" stroke-width="${F(tw + 2 * HALO)}" class="halo"/>` +
    `<polygon points="${ptsAttr(tq)}" stroke-width="${tw}" class="bd torso"/>` });
  // głowa i szyja
  const hq = pj(s.headC);
  const nk0 = pj(add(s.neck, mul(norm(sub(s.headC, s.neck)), 2))), nk1 = pj(add(s.neck, mul(norm(sub(s.headC, s.neck)), L.neck + 4)));
  let headSvg = `<circle cx="${F(hq[0])}" cy="${F(hq[1])}" r="${F(L.headR + HALO)}" class="halo"/>` +
    `<polygon points="${ptsAttr(capsule(nk0, nk1, RAD.neck, RAD.neck * 0.9))}" class="bd"/>` +
    `<circle cx="${F(hq[0])}" cy="${F(hq[1])}" r="${L.headR}" class="bd"/>`;
  const eye = add(add(s.headC, mul(s.face, 7.5)), mul(s.up, 2));
  const eq = pj(eye);
  if (eq[2] > hq[2] + 2) headSvg += `<circle cx="${F(eq[0])}" cy="${F(eq[1])}" r="2.2" class="eye"/>`;
  mid.push({ d: hq[2], s: headSvg });

  // kończyna jako łańcuch odcinków: najpierw obwódki (bez okolicy stawu przy tułowiu), potem wypełnienia
  const chain = (segs, side, handAt) => {
    let halo = '', body = '', dsum = 0;
    segs.forEach((g, i) => {
      const A = pj(g.a), B = pj(g.b);
      dsum += (A[2] + B[2]) / 2;
      const cls = 'bd' + (side === 'L' ? ' L' : '') + (farOf(g.a, g.b) ? ' far' : '');
      let hA = A, rA = g.r[0];
      if (i === 0) { hA = lerp(A, B, 0.42); rA = lerpN(g.r[0], g.r[1], 0.42); }
      if (Math.hypot(B[0] - hA[0], B[1] - hA[1]) > 1) halo += `<polygon points="${ptsAttr(capsule(hA, B, rA + HALO, g.r[1] + HALO))}" class="halo"/>`;
      body += `<polygon points="${ptsAttr(capsule(A, B, g.r[0], g.r[1]))}" class="${cls}"/>`;
    });
    if (handAt) {
      const H = pj(handAt.p), far = farOf(handAt.from, handAt.p);
      halo += `<circle cx="${F(H[0])}" cy="${F(H[1])}" r="${F(RAD.hand + HALO)}" class="halo"/>`;
      body += `<circle cx="${F(H[0])}" cy="${F(H[1])}" r="${RAD.hand}" class="bd${side === 'L' ? ' L' : ''}${far ? ' far' : ''}"/>`;
    }
    mid.push({ d: dsum / segs.length, s: halo + body });
  };
  chain([{ a: s.la.S, b: s.la.E, r: RAD.ua }, { a: s.la.E, b: s.la.W, r: RAD.fa }], 'L', { p: s.la.H, from: s.la.E });
  chain([{ a: s.ra.S, b: s.ra.E, r: RAD.ua }, { a: s.ra.E, b: s.ra.W, r: RAD.fa }], 'R', { p: s.ra.H, from: s.ra.E });
  for (const lg of [s.ll, s.rl]) {
    chain([{ a: lg.Hp, b: lg.K, r: RAD.th }, { a: lg.K, b: lg.A, r: RAD.sh }, { a: lg.heel, b: lg.toe, r: RAD.foot }], 'R');
  }

  // etykieta
  if (st.badge && opts && opts.svgBadge) {
    const fs = F(vb[2] * 0.052), x = F(vb[0] + vb[2] * 0.035), y = F(vb[1] + vb[2] * 0.035);
    const tw = F(st.badge.length * vb[2] * 0.052 * 0.56 + vb[2] * 0.04);
    top.push({ d: 0, s: `<g class="badge"><rect x="${x}" y="${y}" width="${tw}" height="${F(vb[2] * 0.085)}" rx="${F(vb[2] * 0.02)}"/><text x="${F(+x + vb[2] * 0.02)}" y="${F(+y + vb[2] * 0.06)}" font-size="${fs}">${st.badge}</text></g>` });
  }

  back.sort((a, b) => a.d - b.d);
  mid.sort((a, b) => a.d - b.d);
  const defs = `<defs><radialGradient id="gl-${uid}"><stop offset="0" class="gs0"/><stop offset="1" class="gs1"/></radialGradient>` +
    `<radialGradient id="fl-${uid}"><stop offset="0" class="fs0"/><stop offset=".62" class="fs1"/><stop offset="1" class="fs2"/></radialGradient>` +
    `<radialGradient id="sh-${uid}"><stop offset="0" class="ss0"/><stop offset="1" class="ss1"/></radialGradient></defs>`;
  const fig = mid.map(i => i.s).join('');
  const svg = defs + back.map(i => i.s).join('') + (st.op < 1 ? `<g opacity="${F(st.op * 100) / 100}">${fig}</g>` : fig) + top.map(i => i.s).join('');
  return opts && opts.full ? { svg, badge: st.badge } : svg;
}

// =====================================================================
// ĆWICZENIA
// =====================================================================
const SIDE90 = { a: [0.04, -1, 0], b: [0, 0, 1] };
const ISO = P({ lA: SIDE90 });
const holdSeq = (pose) => [
  { p: pose, h: 0.8, eff: 0 },
  { p: pose, m: 0.5, h: 2.6, eff: 1, badge: 'TRZYMAJ' },
  { p: pose, m: 0.5, h: 0.4, eff: 0 }
];

// zwis z podparciem nóg (kółka nisko, waga pod stopami)
const HS = (rootY, sc) => P({
  root: [0, rootY, 0], scap: { l: sc, r: sc },
  lA: { ik: [27, 175, 0], pole: [1, 0, 0.2] }, rA: { ik: [-27, 175, 0], pole: [-1, 0, 0.2] },
  lL: { ik: [11, 9, 8], pole: [0.15, 0, 1] }, rL: { ik: [-11, 9, 8], pole: [-0.15, 0, 1] },
  lF: [0.15, 0, 1], rF: [-0.15, 0, 1]
});
const HS_P = HS(60, [6, 1]), HS_A = HS(70, [-4, -1]);
const wallBar = (y) => [
  { t: 'box', c: [0, y / 2 + 25, -50], h: [62, y / 2 + 25, 2], k: 'wall' },
  { t: 'bar', a: [-48, y, 0], b: [48, y, 0] },
  { t: 'bar', a: [44, y, 0], b: [44, y, -48], w: 3.6 }, { t: 'bar', a: [-44, y, 0], b: [-44, y, -48], w: 3.6 }
];
const HS_PROPS = [{ t: 'rings', x: 27, y: 175, z: 0, vis: 34 }, { t: 'scale', c: [0, 2.5, 6], h: [17, 2.5, 14] }];

// kółka wysoko (pełny zwis)
const HB = (rootY, sc, lT, pole, armPole, lF) => P({
  root: [0, rootY, lT && lT.rz != null ? lT.rz : 0], scap: { l: sc, r: sc },
  lA: { ik: [28, 230, 0], pole: armPole || [1, 0, 0.2] }, rA: { ik: [-28, 230, 0], pole: armPole ? [-armPole[0], armPole[1], armPole[2]] : [-1, 0, 0.2] },
  lL: { ik: [lT.x, lT.y, lT.z], pole: pole || [0.1, 0, 1] }, rL: { ik: [-lT.x, lT.y, lT.z], pole: pole ? [-pole[0], pole[1], pole[2]] : [-0.1, 0, 1] },
  lF: lF || [0.1, -0.5, 0.85], rF: lF ? [-lF[0], lF[1], lF[2]] : [-0.1, -0.5, 0.85]
});
const HB_PROPS = (box) => {
  const a = [{ t: 'rings', x: 28, y: 230, z: 0, vis: 26 }];
  if (box) a.push({ t: 'box', c: [0, 20, -30], h: [22, 20, 17] });
  return a;
};
const ONBOX = HB(121, [0, 0], { x: 10, y: 44, z: -28, rz: -8 }, [0.1, 0, 1], null, [0.15, 0, 1]);

// pompki
function plank(neckY, prot) {
  const si = (neckY - 9) / 136, i = Math.asin(si), ci = Math.cos(i);
  const neck = [0, neckY, -87 + 136 * ci], up = [0, si, ci];
  const root = sub(neck, mul(up, 50));
  return P({
    root, pitch: 90 - i * 180 / Math.PI, scap: { l: [0, prot || 0], r: [0, prot || 0] },
    lA: { ik: [25, 4.5, 44], pole: [0.55, 0.15, -1] }, rA: { ik: [-25, 4.5, 44], pole: [-0.55, 0.15, -1] },
    lL: { a: [0.03, -si, -ci], b: [0.03, -si, -ci] }, rL: { a: [-0.03, -si, -ci], b: [-0.03, -si, -ci] },
    lF: [0.05, -ci, si], rF: [-0.05, -ci, si]
  });
}
const PU_TOP = plank(62), PU_HALF = plank(40), PU_BOT = plank(23), PU_PLUS = plank(65, 6);
const MAT_PU = { t: 'box', c: [0, 0.8, -20], h: [32, 0.8, 82], k: 'mat' };

// chód w miejscu
const GAIT = {
  A: { lL: { a: [0.03, -0.94, 0.34], b: [0.02, -0.99, 0.12] }, rL: { a: [-0.03, -0.96, -0.28], b: [-0.02, -0.82, -0.57] }, lF: [0.1, 0.3, 1], rF: [-0.1, -0.6, 0.8], y: 87.5 },
  M1: { lL: { a: [0.03, -1, 0], b: [0.02, -1, -0.02] }, rL: { a: [-0.03, -0.97, 0.22], b: [-0.02, -0.9, -0.42] }, lF: [0.1, 0, 1], rF: [-0.1, -0.3, 1], y: 90 },
  B: { lL: { a: [0.03, -0.96, -0.28], b: [0.02, -0.82, -0.57] }, rL: { a: [-0.03, -0.94, 0.34], b: [-0.02, -0.99, 0.12] }, lF: [0.1, -0.6, 0.8], rF: [-0.1, 0.3, 1], y: 87.5 },
  M2: { lL: { a: [0.03, -0.97, 0.22], b: [0.02, -0.9, -0.42] }, rL: { a: [-0.03, -1, 0], b: [-0.02, -1, -0.02] }, lF: [0.1, -0.3, 1], rF: [-0.1, 0, 1], y: 90 }
};
const walk = (arms) => ['A', 'M1', 'B', 'M2'].map(k => {
  const g = GAIT[k];
  return { p: P(Object.assign({ root: [0, g.y, 0], lL: g.lL, rL: g.rL, lF: g.lF, rF: g.rF }, arms)), m: 0.42 };
});

// pozycja dziecka
const child = (yaw, lH, rH) => P({
  root: [0, 24, -14], pitch: 95, yaw,
  lA: { ik: lH, pole: [0.2, 1, 0] }, rA: { ik: rH, pole: [-0.2, 1, 0] },
  lL: { ik: [9, 8, -17], pole: [0, -0.25, 1] }, rL: { ik: [-9, 8, -17], pole: [0, -0.25, 1] },
  lF: [0.05, 0.15, -1], rF: [-0.05, 0.15, -1]
});

// wiosłowanie
const ROW = (lA, sc) => P({
  root: [-2, 91, -15], pitch: 80, scap: { l: sc, r: [0, 0] },
  lA, rA: { ik: [-20, 49, 38], pole: [-0.3, 0, -1] },
  lL: { ik: [24, 8, -34], pole: [0.2, 0, 1] }, rL: { a: [0, -1, 0], b: [0, 0.04, -1] },
  lF: [0.15, 0, 1], rF: [0, -0.3, -1]
});

// leżenie bokiem
const SIDE = (lb) => P({
  root: [30, 20, 0], roll: 90,
  lA: { a: [1, -0.12, 0.05], b: lb }, rA: { a: [-1, -0.05, 0.1], b: [-0.3, 0.1, 0.95] },
  lL: { a: [1, -0.32, 0.35], b: [1, -0.05, -0.3] }, rL: { a: [1, -0.04, 0.4], b: [1, -0.04, -0.28] },
  lF: [1, 0, 0.25], rF: [1, 0, 0.25]
});

// australijskie podciąganie
const IR = (neck, iDeg, sc, hx) => {
  hx = hx || 30;
  const i = rad(iDeg), up = [0, Math.sin(i), -Math.cos(i)], root = sub(neck, mul(up, 50)), ld = [0, -Math.sin(i), Math.cos(i)];
  return P({
    root, pitch: -(90 - iDeg), scap: { l: sc, r: sc },
    lA: { ik: [hx, 95, 0], pole: [0.6, -0.2, 1] }, rA: { ik: [-hx, 95, 0], pole: [-0.6, -0.2, 1] },
    lL: { a: [0.03, ld[1], ld[2]], b: [0.03, ld[1], ld[2]] }, rL: { a: [-0.03, ld[1], ld[2]], b: [-0.03, ld[1], ld[2]] },
    lF: [0.08, 0.95, 0.3], rF: [-0.08, 0.95, 0.3]
  });
};

// podciąganie na kółkach z pomocą nóg (kółka na wysokości brody, stopy na wadze)
const RG_H = [21, 150, 4];
const RP = (rootY, rootZ, sc, armPole, kneeZ) => P({
  root: [0, rootY, rootZ], scap: { l: sc, r: sc }, head: [0, 1, 0.12],
  lA: { ik: RG_H, pole: armPole }, rA: { ik: [-RG_H[0], RG_H[1], RG_H[2]], pole: [-armPole[0], armPole[1], armPole[2]] },
  lL: { ik: [11, 9, 10], pole: [0.15, 0, kneeZ || 1] }, rL: { ik: [-11, 9, 10], pole: [-0.15, 0, kneeZ || 1] },
  lF: [0.15, 0, 1], rF: [-0.15, 0, 1]
});
const RP_B = RP(43, -9, [6, 1], [1, 0, 0.25]), RP_S = RP(48, -9, [-3, -1], [1, -0.1, 0.2]), RP_T = RP(91, -5, [-4, -2], [0.9, -1, -0.25]);

// półklęk
const HK = (lA, sc) => P({
  root: [0, 48, -10], scap: { l: sc, r: [0, 0] }, lA, rA: { a: [-0.2, -1, 0.1], b: [-0.1, -1, 0.3] },
  lL: { ik: [9, 7, -52], pole: [0, -1, 0.3] }, rL: { ik: [-10, 8, 36], pole: [0, 0.6, 1] },
  lF: [0.05, 0.3, -1], rF: [-0.08, 0, 1]
});

// leżenie przodem na ławce
const PY = (lA, sc) => P({
  root: [0, 72, -25], pitch: 90, scap: { l: sc, r: [0, 0] }, lA, rA: { a: [-0.08, -1, 0.12], b: [-0.08, -1, 0.12] },
  lL: { a: [0.04, 0, -1], b: [0.02, 0, -1] }, rL: { a: [-0.04, 0, -1], b: [-0.02, 0, -1] },
  lF: [0.05, -0.7, -0.7], rF: [-0.05, -0.7, -0.7]
});

const straight = d => ({ a: d, b: d });
const mirror = d => [-d[0], d[1], d[2]];
const WU = d => P({ lA: straight(d), rA: straight(mirror(d)) });

const EX = [
  // ---------------- ROZGRZEWKA ----------------
  {
    id: 'rozgrzewka', ph: 0, name: 'Krążenia ramion', dose: '3–5 min', load: 'Przed każdym treningiem',
    cues: ['Ręce w bok, spokojne koła', 'Tylko w zakresie bez bólu'],
    cam: { az: 62, el: 14 },
    seq: [{ p: WU([1, 0.45, 0]), m: 0.5 }, { p: WU([1, 0, 0.45]), m: 0.5 }, { p: WU([1, -0.45, 0]), m: 0.5 }, { p: WU([1, 0, -0.45]), m: 0.5 }],
    rep: 1
  },
  // ---------------- FAZA 1 ----------------
  {
    id: 'izo-rot-zew', ph: 1, name: 'Rotacja zewnętrzna — izometria', dose: '6 × 10 s → 3 × 30 s', load: '30% → 50–70% siły', view: 'Widok zza lewego barku',
    cues: ['Łokieć zgięty 90° przy boku, ręcznik pod łokciem', 'Grzbiet nadgarstka naciska na framugę na zewnątrz', 'Ręka się nie rusza'],
    cam: { az: -38, el: 36 },
    props: [{ t: 'box', c: [29, 112, 30], h: [5, 38, 6], layer: 'mid' }, { t: 'towel', side: 'l' }, { t: 'arrow', at: 'lH', off: [-9, 11, 0], dir: [1, 0, 0], len: 22 }],
    seq: holdSeq(ISO)
  },
  {
    id: 'izo-rot-wew', ph: 1, name: 'Rotacja wewnętrzna — izometria', dose: '6 × 10 s → 3 × 30 s', load: '30% → 50–70% siły', view: 'Widok z przodu, z góry',
    cues: ['Łokieć zgięty 90° przy boku', 'Dłoń naciska do środka na framugę'],
    cam: { az: 35, el: 48 },
    props: [{ t: 'box', c: [9.5, 112, 30], h: [5, 38, 6], layer: 'mid' }, { t: 'towel', side: 'l' }, { t: 'arrow', at: 'lH', off: [10, 11, 0], dir: [-1, 0, 0], len: 22 }],
    seq: holdSeq(ISO)
  },
  {
    id: 'izo-odwodzenie', ph: 1, name: 'Odwodzenie — izometria', dose: '6 × 10 s → 3 × 30 s', load: '30% → 50–70% siły', view: 'Widok z przodu',
    cues: ['Bokiem do ściany, łokieć zgięty 90°', 'Zewnętrzna strona łokcia naciska w bok na ścianę'],
    cam: { az: 118, el: 14 },
    props: [{ t: 'box', c: [27.5, 90, 5], h: [2.5, 90, 40] }, { t: 'arrow', at: 'lE', off: [-12, 12, 0], dir: [1, 0, 0], len: 16 }],
    seq: holdSeq(ISO)
  },
  {
    id: 'izo-wyprost', ph: 1, name: 'Wyprost — izometria', dose: '6 × 10 s → 3 × 30 s', load: '30% → 50–70% siły', view: 'Widok z boku',
    cues: ['Plecami do ściany, łokieć zgięty 90°', 'Łokieć naciska do tyłu na ścianę'],
    cam: { az: 12, el: 10 },
    props: [{ t: 'box', c: [0, 90, -14], h: [40, 90, 3] }, { t: 'arrow', at: 'lE', off: [8, 12, 10], dir: [0, 0, -1], len: 17 }],
    seq: holdSeq(P({ lA: { a: [0.04, -1, -0.2], b: [0, 0, 1] } }))
  },
  {
    id: 'izo-przywodzenie', ph: 1, name: 'Przywodzenie — izometria', dose: '6 × 10 s → 3 × 30 s', load: '30% → 50–70% siły', view: 'Widok z przodu',
    cues: ['Zwinięty ręcznik między łokciem a żebrami', 'Ściskasz go łokciem do boku'],
    cam: { az: 112, el: 14 },
    props: [{ t: 'towel', side: 'l' }, { t: 'arrow', at: 'lE', off: [22, 6, 0], dir: [-1, 0, 0], len: 14 }],
    seq: holdSeq(ISO)
  },
  {
    id: 'ustawienie-lopatki', ph: 1, name: 'Ustawienie łopatki', dose: '6 × 10 s', load: 'Bez ciężaru', view: 'Widok z tyłu',
    cues: ['Łopatki delikatnie w tył i w dół', 'Barki nie idą do uszu'],
    cam: { az: -90, el: 10 },
    props: [{ t: 'scap' }, { t: 'arrow', at: 'lScap', off: [3, 7, -3], dir: [-0.45, -1, 0], len: 11 }],
    seq: [{ p: P({}), h: 0.8 }, { p: P({ scap: { l: [-3, -4], r: [-3, -4] } }), m: 0.8, h: 2.4, eff: 1, badge: 'TRZYMAJ' }, { p: P({}), m: 0.8, h: 0.3 }]
  },
  {
    id: 'zwis-podparty', ph: 1, name: 'Aktywny zwis z podparciem nóg', dose: '5 × 10–20 s', load: 'Waga pod stopami: 45–50 → 33 kg',
    cues: ['Stopy na wadze, dłonie na kółkach', 'Ściągnij łopatki w dół i trzymaj', 'Ból najwyżej 3/10'],
    cam: { az: 25, el: 8 },
    props: [...HS_PROPS, { t: 'arrow', at: 'lS', off: [0, 6, -9], dir: [0, -1, 0], len: 12 }, { t: 'glow', at: 'lArm' }],
    seq: [{ p: HS_P, h: 0.8 }, { p: HS_A, m: 0.9, h: 2.4, eff: 1, glow: 1, badge: 'TRZYMAJ' }, { p: HS_P, m: 0.9, h: 0.4 }]
  },
  {
    id: 'pompka-blok', ph: 1, name: 'Pompka z blokiem w połowie', dose: '3–5 × 20–30 s', load: 'Masa ciała',
    cues: ['Zejdź do połowy i trzymaj', 'Łokcie ok. 45° od tułowia', 'Ciało proste jak deska'],
    cam: { az: 15, el: 14 }, shadow: false,
    props: [MAT_PU],
    seq: [{ p: PU_TOP, h: 0.8 }, { p: PU_HALF, m: 1.4, h: 3, badge: 'TRZYMAJ' }, { p: PU_TOP, m: 1.2, h: 0.4 }]
  },
  {
    id: 'zwis-pasywny', ph: 1, name: 'Zwis pasywny', dose: '10–20 s', load: 'Masa ciała, tylko bez bólu',
    cues: ['Wejdź w zwis ze skrzynki, nie skacz', 'Barki luźno', 'Zejdź na skrzynkę'],
    cam: { az: 25, el: 8 },
    props: HB_PROPS(true),
    seq: [{ p: ONBOX, h: 0.8 }, { p: HB(115, [6, 1], { x: 9, y: 31, z: 5 }), m: 0.9, h: 2.6, badge: 'TRZYMAJ' }, { p: ONBOX, m: 0.9, h: 0.5 }]
  },
  {
    id: 'rozciaganie-pacha', ph: 1, name: 'Rozciąganie pod pachą', dose: '3 × 20–30 s', load: 'Do lekkiego ciągnięcia', view: 'Widok z góry',
    cues: ['Usiądź na piętach, ręce daleko przed siebie', 'Przesuń ręce w prawo', 'Ciągnie pod lewą pachą'],
    cam: { az: 28, el: 36 }, shadow: false,
    props: [{ t: 'box', c: [-5, 0.8, 30], h: [50, 0.8, 78], k: 'mat' }, { t: 'glow', at: 'lArm' }],
    seq: [{ p: child(0, [20, 4.5, 100], [-20, 4.5, 100]), h: 1 }, { p: child(-16, [-14, 4.5, 96], [-50, 4.5, 80]), m: 1.5, h: 3, glow: 1, badge: 'TRZYMAJ' }, { p: child(0, [20, 4.5, 100], [-20, 4.5, 100]), m: 1.2, h: 0.4 }]
  },
  // ---------------- FAZA 2 ----------------
  {
    id: 'lopatkowe-podparte', ph: 2, name: 'Podciąganie łopatkowe z podparciem nóg', dose: '3 × 8–10', load: 'Waga pod stopami: 33 → 20 kg',
    cues: ['Łokcie proste przez cały ruch', 'Łopatki w dół, potem powoli w górę'],
    cam: { az: 25, el: 8 },
    props: [...HS_PROPS, { t: 'arrow', at: 'lS', off: [0, 6, -9], dir: [0, -1, 0], len: 12 }, { t: 'glow', at: 'lArm' }],
    seq: [{ p: HS_P, h: 0.4 }, { p: HS_A, m: 0.8, h: 0.5, eff: 1, glow: 1 }, { p: HS_P, m: 1.0, h: 0.3 }]
  },
  {
    id: 'guma-proste-rece', ph: 2, name: 'Ściąganie gumy prostymi rękami', dose: '3 × 12–15', load: 'Średnia guma',
    cues: ['Guma zaczepiona wysoko', 'Najpierw łopatki w dół', 'Proste ręce do ud'],
    cam: { az: 18, el: 10 },
    props: [{ t: 'box', c: [0, 205, 99], h: [12, 3, 3] }, { t: 'band', a: [6, 205, 96], b: 'lH' }, { t: 'band', a: [-6, 205, 96], b: 'rH' }, { t: 'glow', at: 'lLat' }],
    seq: [
      { p: P({ root: [0, 90, -3], pitch: 12, scap: { l: [3, 2], r: [3, 2] }, lA: straight([0.06, 0.72, 0.69]), rA: straight([-0.06, 0.72, 0.69]), lL: { a: [0.03, -1, 0.1], b: [0.01, -1, -0.1] }, rL: { a: [-0.03, -1, 0.1], b: [-0.01, -1, -0.1] } }), h: 0.5 },
      { p: P({ root: [0, 90, -3], pitch: 12, scap: { l: [-3, -2], r: [-3, -2] }, lA: straight([0.07, -1, 0.12]), rA: straight([-0.07, -1, 0.12]), lL: { a: [0.03, -1, 0.1], b: [0.01, -1, -0.1] }, rL: { a: [-0.03, -1, 0.1], b: [-0.01, -1, -0.1] } }), m: 1.1, h: 0.6, glow: 1 },
      { p: P({ root: [0, 90, -3], pitch: 12, scap: { l: [3, 2], r: [3, 2] }, lA: straight([0.06, 0.72, 0.69]), rA: straight([-0.06, 0.72, 0.69]), lL: { a: [0.03, -1, 0.1], b: [0.01, -1, -0.1] }, rL: { a: [-0.03, -1, 0.1], b: [-0.01, -1, -0.1] } }), m: 1.6, h: 0.2 }
    ]
  },
  {
    id: 'guma-do-klatki', ph: 2, name: 'Ściąganie gumy do klatki', dose: '3 × 12', load: 'Średnia guma',
    cues: ['Najpierw łopatki w dół', 'Potem łokcie do żeber, jak w podciąganiu'],
    cam: { az: 38, el: 10 },
    props: [{ t: 'box', c: [0, 222, 75], h: [14, 3, 3] }, { t: 'band', a: [8, 222, 72], b: 'lH' }, { t: 'band', a: [-8, 222, 72], b: 'rH' }, { t: 'glow', at: 'lLat' }],
    seq: [
      { p: P({ pitch: -4, scap: { l: [4, 1], r: [4, 1] }, lA: straight([0.45, 1, 0.3]), rA: straight(mirror([0.45, 1, 0.3])) }), h: 0.4 },
      { p: P({ pitch: -4, scap: { l: [-2, 0], r: [-2, 0] }, lA: straight([0.45, 1, 0.3]), rA: straight(mirror([0.45, 1, 0.3])) }), m: 0.45, h: 0.15 },
      { p: P({ pitch: -4, scap: { l: [-3, -3], r: [-3, -3] }, lA: { a: [0.32, -0.92, -0.2], b: [0.02, 0.62, 0.78] }, rA: { a: mirror([0.32, -0.92, -0.2]), b: mirror([0.02, 0.62, 0.78]) } }), m: 0.8, h: 0.5, glow: 1 },
      { p: P({ pitch: -4, scap: { l: [4, 1], r: [4, 1] }, lA: straight([0.45, 1, 0.3]), rA: straight(mirror([0.45, 1, 0.3])) }), m: 1.4, h: 0.1 }
    ]
  },
  {
    id: 'wioslowanie', ph: 2, name: 'Wiosłowanie jednorącz', dose: '3 × 12', load: '8 → 16 kg',
    cues: ['Prawa ręka i prawe kolano na ławce', 'Hantel do biodra, łokieć blisko ciała'],
    cam: { az: 6, el: 18 },
    props: [{ t: 'box', c: [-14, 22.5, -6], h: [18, 22.5, 56] }, { t: 'db', hand: 'l', ax: [0, 0, 1] }, { t: 'glow', at: 'lLat' }],
    seq: [
      { p: ROW(straight([0.02, -1, 0.06]), [0, 3]), h: 0.4 },
      { p: ROW({ a: [0.12, 0.35, -0.93], b: [0.02, -1, 0.1] }, [1, -5]), m: 0.9, h: 0.5, glow: 1 },
      { p: ROW(straight([0.02, -1, 0.06]), [0, 3]), m: 1.4, h: 0.2 }
    ]
  },
  {
    id: 'rot-zew-lezenie', ph: 2, name: 'Rotacja zewnętrzna w leżeniu bokiem', dose: '3 × 12–15', load: '1,5 → 4 kg', view: 'Widok od strony stóp',
    cues: ['Leżysz na prawym boku, ręcznik pod łokciem', 'Obracaj od brzucha w górę', 'Łokieć zostaje przy boku'],
    cam: { az: 82, el: 34 }, shadow: false,
    props: [{ t: 'box', c: [5, 0.8, 0], h: [80, 0.8, 34], k: 'mat' }, { t: 'towel', side: 'l' }, { t: 'db', hand: 'l', ax: [1, 0, 0] }],
    seq: [{ p: SIDE([0, -0.55, 0.83]), h: 0.4 }, { p: SIDE([0, 1, 0.12]), m: 1.2, h: 0.6 }, { p: SIDE([0, -0.55, 0.83]), m: 1.8, h: 0.2 }]
  },
  {
    id: 'rot-wew-guma', ph: 2, name: 'Rotacja wewnętrzna z gumą', dose: '3 × 12–15', load: 'Lekka guma', view: 'Widok z przodu, z góry',
    cues: ['Guma zaczepiona z lewej strony', 'Łokieć przy boku zgięty 90°', 'Przyciągaj w poprzek brzucha'],
    cam: { az: 35, el: 48 },
    props: [{ t: 'box', c: [80, 111, 25], h: [3, 6, 4], layer: 'mid' }, { t: 'band', a: [77, 111, 25], b: 'lH' }, { t: 'towel', side: 'l' }],
    seq: [{ p: P({ lA: { a: [0.04, -1, 0], b: [0.6, 0, 0.8] } }), h: 0.3 }, { p: P({ lA: { a: [0.04, -1, 0], b: [-0.72, 0, 0.69] } }), m: 1.0, h: 0.4 }, { p: P({ lA: { a: [0.04, -1, 0], b: [0.6, 0, 0.8] } }), m: 1.5, h: 0.2 }]
  },
  {
    id: 'pompki-blok', ph: 2, name: 'Pompki z blokiem w połowie', dose: '3 × 12–15', load: 'Masa ciała',
    cues: ['2 s w dół', 'W drodze w górę 2 s zatrzymania w połowie', 'Potem dokończ ruch'],
    cam: { az: 15, el: 14 }, shadow: false,
    props: [MAT_PU],
    seq: [{ p: PU_TOP, h: 0.5 }, { p: PU_BOT, m: 2.0, h: 0.15 }, { p: PU_HALF, m: 0.8, h: 2, badge: 'BLOK 2 s' }, { p: PU_TOP, m: 0.7, h: 0.4 }],
    rep: 2
  },
  {
    id: 'pompka-plus', ph: 2, name: 'Pompka z wypchnięciem łopatek', dose: '3 × 12', load: 'Masa ciała',
    cues: ['Normalna pompka', 'Na górze odepchnij się mocniej', 'Łopatki rozsuwają się na boki'],
    cam: { az: 15, el: 14 }, shadow: false,
    props: [MAT_PU, { t: 'arrow', at: 'lScap', off: [0, 8, 0], dir: [0, 1, 0], len: 11 }],
    seq: [{ p: PU_TOP, h: 0.3 }, { p: PU_HALF, m: 1.0, h: 0.1 }, { p: PU_TOP, m: 0.9, h: 0.1 }, { p: PU_PLUS, m: 0.5, h: 0.6, eff: 1 }, { p: PU_TOP, m: 0.5, h: 0.2 }],
    rep: 3
  },
  // ---------------- FAZA 3 ----------------
  {
    id: 'kolka-z-nogami', ph: 3, name: 'Podciąganie na kółkach z pomocą nóg', dose: '3 × 8–10', load: 'Waga pod stopami: 35 → 15 kg',
    cues: ['Kółka na wysokości brody, stopy na wadze pod nimi', 'Najpierw łopatki w dół, potem łokcie do żeber', 'Nogi tylko pomagają; w dół powoli, ok. 3 s'],
    cam: { az: 30, el: 8 },
    props: [{ t: 'scale', c: [0, 2.5, 8], h: [17, 2.5, 14] }, { t: 'rings', x: 21, y: 150, z: 4, vis: 45 }, { t: 'arrow', at: 'lE', off: [7, -3, 0], dir: [0, -1, 0], len: 14 }, { t: 'glow', at: 'lLat' }],
    seq: [
      { p: RP_B, h: 0.45 },
      { p: RP_S, m: 0.45, h: 0.15 },
      { p: RP_T, m: 1.0, h: 0.4, eff: 1, glow: 1 },
      { p: RP_B, m: 1.7, h: 0.2 }
    ],
    rep: 2
  },
  {
    id: 'australijskie', ph: 3, name: 'Australijskie podciąganie na kółkach', dose: '3 × 8–12', load: 'Masa ciała · trudniej: stopy dalej w przód',
    cues: ['Kółka na wysokości bioder, pięty na ziemi', 'Ciało proste jak deska', 'Klatka do kółek, łokcie blisko ciała'],
    cam: { az: 12, el: 12 },
    props: [{ t: 'rings', x: 22, y: 95, z: 0, vis: 45 }, { t: 'glow', at: 'lLat' }],
    seq: [{ p: IR([0, 48, -28.6], 18, [0, 3], 22), h: 0.4 }, { p: IR([0, 82, -12], 34, [0, -5], 22), m: 1.0, h: 0.5, glow: 1 }, { p: IR([0, 48, -28.6], 18, [0, 3], 22), m: 1.5, h: 0.2 }]
  },
  {
    id: 'rotacja-9090', ph: 3, name: 'Rotacja zewnętrzna 90/90', dose: '3 × 12', load: 'Lekka guma',
    cues: ['Łokieć w bok, zgięty 90°', 'Obracaj przedramię do pionu', 'Zacznij z łokciem trochę niżej'],
    cam: { az: 30, el: 12 },
    props: [{ t: 'box', c: [47, 137, 104], h: [4, 6, 3], layer: 'mid' }, { t: 'band', a: [47, 137, 101], b: 'lH' }],
    seq: [{ p: P({ lA: { a: [1, -0.12, 0.08], b: [0, 0, 1] } }), h: 0.3 }, { p: P({ lA: { a: [1, -0.12, 0.08], b: [0, 1, 0.05] } }), m: 1.0, h: 0.4 }, { p: P({ lA: { a: [1, -0.12, 0.08], b: [0, 0, 1] } }), m: 1.5, h: 0.2 }]
  },
  {
    id: 'wyciskanie-polklek', ph: 3, name: 'Wyciskanie jednorącz w półklęku', dose: '3 × 8–10', load: '6 → 12 kg',
    cues: ['Lewe kolano na ziemi', 'Żebra w dół, brzuch napięty', 'Hantel prosto nad głowę'],
    cam: { az: 45, el: 10 },
    props: [{ t: 'box', c: [0, 0.8, -8], h: [32, 0.8, 58], k: 'mat' }, { t: 'db', hand: 'l', ax: [0, 0, 1] }],
    seq: [{ p: HK({ a: [0.35, -0.85, 0.4], b: [0, 1, 0] }, [0, 0]), h: 0.4 }, { p: HK(straight([0.12, 1, 0.08]), [2, 1]), m: 1.0, h: 0.4 }, { p: HK({ a: [0.35, -0.85, 0.4], b: [0, 1, 0] }, [0, 0]), m: 1.5, h: 0.2 }]
  },
  {
    id: 'unoszenie-y', ph: 3, name: 'Unoszenie w literę Y w leżeniu przodem', dose: '3 × 10', load: '0 → 2 kg',
    cues: ['Leżysz przodem na ławce lub łóżku', 'Kciuk w górę', 'Ręka w linii litery Y'],
    cam: { az: 6, el: 22 },
    props: [{ t: 'box', c: [0, 30, -40], h: [22, 30, 72] }, { t: 'glow', at: 'lTrap' }],
    seq: [{ p: PY(straight([0.08, -1, 0.12]), [0, 1]), h: 0.4 }, { p: PY(straight([0.62, 0.05, 0.78]), [-2, -3]), m: 1.2, h: 0.6, glow: 1 }, { p: PY(straight([0.08, -1, 0.12]), [0, 1]), m: 1.6, h: 0.2 }]
  },
  {
    id: 'pompki-blok-plus', ph: 3, name: 'Pompki z blokiem i wypchnięciem łopatek', dose: '3 × 15–20', load: 'Masa ciała',
    cues: ['2 s w dół', '2 s blok w połowie drogi w górę', 'Na górze rozsuń łopatki'],
    cam: { az: 15, el: 14 }, shadow: false,
    props: [MAT_PU, { t: 'arrow', at: 'lScap', off: [0, 8, 0], dir: [0, 1, 0], len: 11 }],
    seq: [{ p: PU_TOP, h: 0.3 }, { p: PU_BOT, m: 2.0, h: 0.15 }, { p: PU_HALF, m: 0.8, h: 2, badge: 'BLOK 2 s' }, { p: PU_TOP, m: 0.7, h: 0.1 }, { p: PU_PLUS, m: 0.5, h: 0.5, eff: 1 }, { p: PU_TOP, m: 0.4, h: 0.2 }],
    rep: 2
  },
  {
    id: 'face-pull', ph: 3, path: false, name: 'Face pull', dose: '3 × 12–15', load: 'Średnia guma',
    cues: ['Guma na wysokości głowy', 'Przyciągaj do czoła', 'Dłonie obracają się do tyłu'],
    cam: { az: 55, el: 14 },
    props: [{ t: 'box', c: [0, 85, 124], h: [4, 85, 4] }, { t: 'band', a: [0, 162, 120], b: 'lH' }, { t: 'band', a: [0, 162, 120], b: 'rH' }],
    seq: [
      { p: P({ scap: { l: [0, 2], r: [0, 2] }, lA: straight([-0.1, 0.25, 1]), rA: straight([0.1, 0.25, 1]) }), h: 0.4 },
      { p: P({ scap: { l: [-1, -5], r: [-1, -5] }, lA: { a: [1, 0.08, -0.25], b: [0.05, 1, 0.15] }, rA: { a: [-1, 0.08, -0.25], b: [-0.05, 1, 0.15] } }), m: 1.0, h: 0.5 },
      { p: P({ scap: { l: [0, 2], r: [0, 2] }, lA: straight([-0.1, 0.25, 1]), rA: straight([0.1, 0.25, 1]) }), m: 1.4, h: 0.2 }
    ]
  },
  {
    id: 'spacer-farmera', ph: 3, name: 'Spacer farmera', dose: '3 × 30 m', load: '2 × 16 → 24 kg',
    cues: ['Ciężar w każdej ręce', 'Barki w dół i w tył', 'Spokojny krok'],
    cam: { az: 30, el: 8 },
    props: [{ t: 'db', hand: 'l', ax: [0, 0, 1] }, { t: 'db', hand: 'r', ax: [0, 0, 1] }],
    seq: walk({ scap: { l: [-2, -2], r: [-2, -2] }, lA: straight([0.17, -1, 0]), rA: straight([-0.17, -1, 0]) })
  },
  {
    id: 'spacer-kelnera', ph: 3, name: 'Spacer kelnera', dose: '3 × 20 m na rękę', load: '6 → 10 kg',
    cues: ['Ręka prosto nad głową', 'Najpierw lewa, potem prawa', 'Żebra w dół'],
    cam: { az: 30, el: 8 },
    props: [{ t: 'db', hand: 'l', ax: [0, 0, 1] }],
    seq: walk({ scap: { l: [1, 0], r: [0, 0] }, lA: straight([0.06, 1, 0.03]), rA: { a: [-0.16, -1, 0.04], b: [-0.12, -1, 0.12] } })
  },
  // ---------------- FAZA 4 ----------------
  {
    id: 'zwis-aktywny', ph: 4, name: 'Pełny aktywny zwis', dose: '5 × 10 → 30 s', load: 'Masa ciała',
    cues: ['Wejdź ze skrzynki, nie skacz', 'Łopatki w dół przez cały zwis', 'Coś przeskoczy? Przerwij.'],
    cam: { az: 25, el: 8 },
    props: [...HB_PROPS(true), { t: 'arrow', at: 'lS', off: [0, 6, -9], dir: [0, -1, 0], len: 11 }, { t: 'glow', at: 'lArm' }],
    seq: [{ p: ONBOX, h: 0.8 }, { p: HB(124, [-3, -1], { x: 9, y: 39, z: 3 }), m: 0.9, h: 2.5, eff: 1, glow: 1, badge: 'TRZYMAJ' }, { p: ONBOX, m: 0.9, h: 0.5 }]
  },
  {
    id: 'lopatkowe-pelne', ph: 4, name: 'Pełne podciąganie łopatkowe', dose: '3 × 6–8', load: 'Masa ciała',
    cues: ['Łokcie proste', 'Ciało idzie w górę tylko dzięki łopatkom', 'Powoli w dół'],
    cam: { az: 25, el: 8 },
    props: [...HB_PROPS(false), { t: 'arrow', at: 'lS', off: [0, 6, -9], dir: [0, -1, 0], len: 11 }, { t: 'glow', at: 'lArm' }],
    seq: [{ p: HB(115, [6, 1], { x: 9, y: 31, z: 5 }), h: 0.4 }, { p: HB(124, [-3, -1], { x: 9, y: 40, z: 4 }), m: 0.8, h: 0.5, eff: 1, glow: 1 }, { p: HB(115, [6, 1], { x: 9, y: 31, z: 5 }), m: 1.0, h: 0.3 }]
  },
  {
    id: 'negatywy', ph: 4, name: 'Negatywy', dose: '3 × 3–5', load: 'Opuszczanie 3–5 s',
    cues: ['Wejdź na górę ze skrzynki', 'Opuszczaj się powoli do zwisu', 'Wróć na skrzynkę, nie podciągaj się'],
    cam: { az: 25, el: 8 },
    props: [{ t: 'rings', x: 28, y: 230, z: 0, vis: 26 }, { t: 'box', c: [0, 20, -34], h: [22, 20, 13] }],
    seq: [
      { p: HB(170, [-2, -2], { x: 9, y: 100, z: -22 }, [0, -0.2, 1], [0.6, -0.6, 0.5], [0.1, -0.6, -0.8]), h: 0.6 },
      { p: HB(124, [-3, -1], { x: 9, y: 50, z: -12 }, [0, -0.2, 1], [0.6, -0.6, 0.5], [0.1, -0.6, -0.8]), m: 4.0, h: 0.6, mbadge: 'OPUSZCZAJ 3–5 s', glow: 1 },
      { p: HB(170, [-2, -2], { x: 9, y: 100, z: -22 }, [0, -0.2, 1], [0.6, -0.6, 0.5], [0.1, -0.6, -0.8]), m: 0.7, h: 0.1, cut: true }
    ],
    props2: null, rep: 1
  },
  {
    id: 'podciaganie-guma', ph: 4, name: 'Podciąganie z pomocą gumy', dose: '3 × 5', load: 'Guma, z którą 5 powt. przy bólu 0–2',
    cues: ['Guma zaczepiona o pasy kółek, kolano w pętli', 'Najpierw łopatki w dół', 'Broda nad kółka'],
    cam: { az: 25, el: 8 },
    props: [{ t: 'rings', x: 28, y: 230, z: 0, vis: 26 }, { t: 'band', a: [-28, 242, 0], b: 'rK' }, { t: 'band', a: [28, 242, 0], b: 'rK' }, { t: 'glow', at: 'lLat' }],
    seq: [
      { p: HB(124, [-3, -1], { x: 9, y: 64, z: -30 }, [0, -0.3, 1], [0.6, -0.6, 0.5], [0.1, -0.6, -0.8]), h: 0.4 },
      { p: HB(170, [-2, -2], { x: 9, y: 110, z: -30 }, [0, -0.3, 1], [0.6, -0.6, 0.5], [0.1, -0.6, -0.8]), m: 1.1, h: 0.3, glow: 1 },
      { p: HB(124, [-3, -1], { x: 9, y: 64, z: -30 }, [0, -0.3, 1], [0.6, -0.6, 0.5], [0.1, -0.6, -0.8]), m: 1.4, h: 0.3 }
    ]
  },
  {
    id: 'podciaganie', ph: 4, name: 'Pełne podciąganie', dose: '3 × 3–5 → więcej', load: '+1–2 powt. na serię tygodniowo',
    cues: ['Najpierw łopatki w dół', 'Broda nad kółka', 'Daleko od upadku mięśniowego'],
    cam: { az: 25, el: 8 },
    props: [{ t: 'rings', x: 28, y: 230, z: 0, vis: 26 }, { t: 'glow', at: 'lLat' }],
    seq: [
      { p: HB(124, [-3, -1], { x: 9, y: 40, z: 6 }, [0, 0, 1], [0.6, -0.6, 0.5]), h: 0.4 },
      { p: HB(170, [-2, -2], { x: 9, y: 86, z: 6 }, [0, 0, 1], [0.6, -0.6, 0.5]), m: 1.1, h: 0.3, glow: 1 },
      { p: HB(124, [-3, -1], { x: 9, y: 40, z: 6 }, [0, 0, 1], [0.6, -0.6, 0.5]), m: 1.4, h: 0.3 }
    ]
  }
];

const API = { EX, render, view, evalAt, stillTime, prep };
G.ATLAS = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
