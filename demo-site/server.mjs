// Tiny zero-dependency static server for the offline demo shop.
// Usage: node demo-site/server.mjs   (PORT env var, default 4173)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const port = Number(process.env.PORT ?? 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? '/', 'http://x').pathname;
  const safe = normalize(urlPath === '/' ? '/index.html' : urlPath).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(root, safe));
    res.writeHead(200, { 'content-type': types[extname(safe)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}).listen(port, () => console.log(`demo-shop listening on http://localhost:${port}`));
