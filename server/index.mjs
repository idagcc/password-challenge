import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname, join } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { createGame } from './game.mjs';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const config = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));
const game = createGame({ root, dataDir: process.env.PASSWORD_DATA_DIR || join(root, 'data'), config });
const dev = process.argv.includes('--dev');
const vite = dev ? await (await import('vite')).createServer({ root, server: { middlewareMode: true, fs: { deny: ['**/private/**', '**/data/**', '**/source-material/**', '**/design-reference/**', '**/server/**', '**/tests/**', '**/.git/**', '**/.env*'] } }, appType: 'spa' }) : null;
let port = Number(process.env.PORT || config.port);
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
async function body(req) {
  let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 4096) throw Object.assign(new Error('Request is too large.'), { status: 413 }); }
  try { return JSON.parse(data || '{}'); } catch { throw Object.assign(new Error('Invalid request.'), { status: 400 }); }
}
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
  try {
    if (!['127.0.0.1:'+port, 'localhost:'+port, '[::1]:'+port].includes(req.headers.host)) return json(res,403,{error:'Local access only.'});
    const url = new URL(req.url, 'http://127.0.0.1:' + port), path = decodeURIComponent(url.pathname);
    if (path.startsWith('/api/')) {
      if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(res, 403, { error: 'Request origin is not allowed.' });
      if (path === '/api/health') return json(res, 200, { ok: true });
      if (path === '/api/config' && req.method === 'GET') return json(res, 200, { idleTimeoutSeconds: config.idleTimeoutSeconds, resultTimeoutSeconds: config.resultTimeoutSeconds, maxGameSeconds: config.maxGameSeconds, scoringMode: config.scoring.mode });
      if (path === '/api/leaderboard' && req.method === 'GET') return json(res, 200, game.leaderboard());
      if (path === '/api/register' && req.method === 'POST') return json(res, 201, game.register(await body(req)));
      const match = path.match(/^\/api\/sessions\/([a-f0-9-]{36})(?:\/(start|answer))?$/);
      if (match) {
        if (req.method === 'GET' && !match[2]) return json(res, 200, game.state(match[1]));
        if (req.method === 'POST' && match[2] === 'start') return json(res, 200, game.start(match[1]));
        if (req.method === 'POST' && match[2] === 'answer') return json(res, 200, game.submit(match[1], await body(req)));
      }
      if (path === '/api/operator/export' && req.method === 'GET') {
        const supplied = Buffer.from(String(req.headers['x-operator-key'] || '')), expected = Buffer.from(game.operatorKey);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(res, 401, { error: 'Operator key required.' });
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="password-challenge-results.csv"', 'Cache-Control': 'no-store' }); return res.end(game.exportCsv());
      }
      return json(res, 404, { error: 'Not found.' });
    }
    if (/^\/(?:private|data|source-material|design-reference|server|tests)(?:\/|$)/.test(path)) return json(res,404,{error:'Not found.'});
    if (vite) return vite.middlewares(req, res);
    const base = join(root, 'dist'), file = resolve(base, '.' + path);
    if (!file.startsWith(base + '/') && file !== base) { res.writeHead(403); return res.end(); }
    const target = existsSync(file) && statSync(file).isFile() ? file : path === '/' || !extname(path) ? join(base, 'index.html') : null;
    if (!target || !existsSync(target)) { res.writeHead(404); return res.end('Not found'); }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' }[extname(target)] || 'application/octet-stream';
    const size = statSync(target).size;
    const headers = { 'Content-Type': mime, 'Cache-Control': extname(target) === '.html' ? 'no-store' : 'public, max-age=3600', 'Accept-Ranges': 'bytes' };
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      let start = 0, end = size - 1;
      if (!range || (!range[1] && !range[2])) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
      if (!range[1]) start = Math.max(0, size - Number(range[2]));
      else { start = Number(range[1]); if (range[2]) end = Math.min(size - 1, Number(range[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      return createReadStream(target, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': size });
    if (req.method === 'HEAD') return res.end();
    createReadStream(target).pipe(res);
  } catch (e) { if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : 'Could not save your answer. Please try again.' }); else res.end(); if (!e.status) console.error(e); }
});
server.listen(port, '127.0.0.1', () => { port = server.address().port; console.log(`Password Challenge ready at http://127.0.0.1:${port}`); });
const backupTimer = setInterval(() => { try { game.backup(); } catch (e) { console.error('Backup failed:', e.message); } }, 3600000).unref();
async function shutdown() { clearInterval(backupTimer); await vite?.close(); server.close(() => { game.close(); process.exit(); }); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
