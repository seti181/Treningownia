// Renders contact sheets of exercise frames for visual checking.
// Użycie: npm run sheet -- id1,id2   (bez listy: wszystkie ćwiczenia, z rehabilitacji i z bloków). Pliki: shots/sheetN.svg
const path = require('path');
const fs = require('fs');
const A = require(path.join(__dirname, '..', 'src', 'core.js'));
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const css = `
.floor{fill:#eef2f0}
.shadow{fill:#17201c;fill-opacity:.09}
.fig{stroke:#2a3530;fill:#2a3530;stroke-linecap:round;stroke-linejoin:round}
.fig.far{stroke:#a5afaa;fill:#a5afaa}
.L{stroke:#e2503a;fill:#e2503a;stroke-linecap:round}
.L.far{stroke:#f0a497;fill:#f0a497}
.torso{stroke-linejoin:round}
.hand{stroke:none}
.eye{fill:#ffffff}
.prop.pt{fill:#e7ece9;stroke:#9aa6a0;stroke-width:.8}
.prop.ps{fill:#d3dad6;stroke:#9aa6a0;stroke-width:.8}
.prop.pf{fill:#c3cbc7;stroke:#9aa6a0;stroke-width:.8}
.wall.pf,.wall.ps,.wall.pt{fill:#e4e9e6;stroke:#c3cbc7;stroke-width:.6}
.mat{fill:#cfe0d8;stroke:#9fc0b2;stroke-width:.6}
.scale{fill:#dfe5e2;stroke:#8f9b95;stroke-width:.8}
.disp{fill:#2a3530}
.bar{stroke:#5c6863;stroke-linecap:round}
.band{stroke:#e3a008;stroke-linecap:round}
.cable{stroke:#5c6863}
.strap{stroke:#5c6863;stroke-linecap:round}
.ring{stroke:#b9853f;fill:none;stroke-linejoin:round}
.metal{fill:#5c6863}
.db{stroke:#2a3530;fill:#2a3530;stroke-linecap:round}
.towel{stroke:#8fb8d8;stroke-linecap:round}
.arrow line{stroke:#e2503a;stroke-linecap:round}
.arrow polygon{fill:#e2503a}
.gs0{stop-color:#e2503a;stop-opacity:.55}
.gs1{stop-color:#e2503a;stop-opacity:0}
.scapL{fill:#e2503a;fill-opacity:.85}
.scapR{fill:#a5afaa}
.bd{fill:#26302c}
.bd.far{fill:#a3ada8}
.bd.L{fill:#dd4630}
.bd.L.far{fill:#ef9f90}
.bd.torso{stroke:#26302c;stroke-linejoin:round}
.halo{fill:#f7f9f8;stroke:#f7f9f8;stroke-linejoin:round}
.trail{fill:none;stroke:#dd4630;stroke-width:1.4;stroke-dasharray:2 3.2;stroke-linecap:round;opacity:.55}
.fs0{stop-color:#e2e8e5;stop-opacity:1}
.fs1{stop-color:#e2e8e5;stop-opacity:.7}
.fs2{stop-color:#e2e8e5;stop-opacity:0}
.ss0{stop-color:#17201c;stop-opacity:.2}
.ss1{stop-color:#17201c;stop-opacity:0}
.badge rect{fill:#17201c}
.badge text{fill:#ffffff;font-family:sans-serif;font-weight:700}
`;
const which = process.argv[2] ? process.argv[2].split(',') : null;
const list = A.EX.concat(A.MOVES).filter(e => !which || which.includes(e.id));
const per = 12, cw = 240, ch = 180, lw = 150;
for (let s = 0; s * per < list.length; s++) {
  const chunk = list.slice(s * per, s * per + per);
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + cw * 3}" height="${ch * chunk.length}"><style>${css}</style><rect width="100%" height="100%" fill="#f4f6f5"/>`;
  chunk.forEach((ex, r) => {
    const tl = A.prep(ex);
    const times = [0.01, tl.total * 0.38, A.stillTime(ex)];
    out += `<text x="6" y="${r * ch + 20}" font-family="sans-serif" font-size="12" fill="#17201c">${ex.id}</text>`;
    times.forEach((t, c) => {
      const vb = A.view(ex);
      out += `<svg x="${lw + c * cw}" y="${r * ch}" width="${cw}" height="${ch}" viewBox="${vb.map(v => v.toFixed(1)).join(' ')}"><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="#f7f9f8" stroke="#ccc"/>${A.render(ex, t, ex.id + c, { svgBadge: true })}</svg>`;
    });
  });
  out += '</svg>';
  fs.writeFileSync(path.join(OUT, `sheet${s}.svg`), out);
  console.log('shots/sheet' + s + '.svg');
}
console.log('sheets:', Math.ceil(list.length / per));
