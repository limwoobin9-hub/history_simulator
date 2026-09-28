import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(request.url, 'http://localhost').pathname));
  if (!(path === root || path.startsWith(root + sep)) || !['.html', '.css', '.js', '.svg'].includes(extname(path))) {
    response.writeHead(404); response.end('Not found'); return;
  }
  try { const content = await readFile(path); response.writeHead(200, { 'Content-Type': types[extname(path)], 'Cache-Control': 'no-store' }); response.end(content); }
  catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, () => console.log(`Game ready at http://localhost:${port}`));
