// Serves dist/web (the GitHub Pages build) for a local preview, with no dependencies.
// Usage: npm run preview            → http://localhost:8080
//        npm run preview -- 9000    → another port
// A phone on the same Wi-Fi can open the "network" address it prints (Windows may ask to allow Node through the firewall).
// Service workers only run on https or localhost, so test those on localhost or after deploying.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', 'dist', 'web');
const port = Number(process.argv[2]) || Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('dist/web/index.html is missing. Run: npm run build');
  process.exit(1);
}

http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (e) { res.writeHead(400); res.end('Bad request'); return; }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, path.normalize(rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found: ' + rel); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, () => {
  console.log('Preview: http://localhost:' + port + '/');
  Object.values(os.networkInterfaces()).flat()
    .filter(i => i && (i.family === 'IPv4' || i.family === 4) && !i.internal)
    .forEach(i => console.log('Network: http://' + i.address + ':' + port + '/'));
  console.log('Stop with Ctrl+C.');
});
