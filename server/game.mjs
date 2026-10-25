import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, randomInt } from 'node:crypto';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const roundCategories = [
  'picture_password', 'picture_password', 'security_count',
  'picture_password', 'picture_password', 'security_count',
  'picture_password', 'picture_password', 'security_count', 'vault_maze',
];
export const TOTAL_ROUNDS = roundCategories.length;

function shuffle(items, randomIndex) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function normalizeAnswer(value) { return String(value ?? '').normalize('NFKC').replace(/\s/g, '').toUpperCase(); }
export function validatePlayer(name, email) {
  name = String(name ?? '').trim().replace(/\s+/g, ' ');
  email = String(email ?? '').trim();
  if (name.length < 2 || name.length > 60 || /[\x00-\x1f<>]/.test(name)) throw Object.assign(new Error('Enter your name (2–60 characters).'), { status: 400 });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
  return { name, email };
}
export function calculateScore(correct, elapsedMs, scoring, totalRounds = TOTAL_ROUNDS) {
  return correct * scoring.correctWeight + Math.round(scoring.speedWeight * Math.max(0, 1 - elapsedMs / (scoring.speedWindowSeconds * 1000)) * correct / totalRounds);
}
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
export function createGame({ root, dataDir = join(root, 'data'), now = Date.now, randomIndex = randomInt, config }) {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(join(dataDir, 'password-challenge.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, created_at INTEGER NOT NULL, started_at INTEGER, round_started_at INTEGER, completed_at INTEGER, puzzle_ids TEXT NOT NULL, scoring_config TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'registered');
    CREATE TABLE IF NOT EXISTS answers (session_id TEXT NOT NULL REFERENCES sessions(id), round INTEGER NOT NULL, puzzle_id TEXT NOT NULL, submitted_answer TEXT NOT NULL, correct INTEGER NOT NULL, response_ms INTEGER NOT NULL, submitted_at INTEGER NOT NULL, request_id TEXT NOT NULL, PRIMARY KEY(session_id, round), UNIQUE(session_id, request_id));`);
  const keyPath = join(dataDir, 'operator-key.txt');
  if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(24).toString('hex'), { mode: 0o600 });
  const operatorKey = readFileSync(keyPath, 'utf8').trim();
  const manifest = JSON.parse(readFileSync(join(root, 'public/puzzles.json'), 'utf8'));
  const key = JSON.parse(readFileSync(join(root, 'private/answers.json'), 'utf8'));
  const answerMap = new Map(key.puzzles.map(p => [p.id, p.acceptedAnswers.map(normalizeAnswer)]));
  answerMap.set('approved-count', ['423#']); answerMap.set('vault-maze', ['CODE5!']);
  const puzzleMap = new Map(manifest.puzzles.map(p => [p.id, p]));
  puzzleMap.set('approved-count', { id: 'approved-count', category: 'security_count', title: 'Count the security symbols' });
  puzzleMap.set('vault-maze', { id: 'vault-maze', category: 'vault_maze', title: 'Find the route to the vault' });
  const pictures = manifest.puzzles.filter(p => p.category === 'picture_password');
  const counts = manifest.puzzles.filter(p => p.category === 'security_count');
  const session = id => { const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id); if (!s) fail('Your session has ended. Please start again.', 404); return s; };
  const answers = id => db.prepare('SELECT round, puzzle_id, correct, response_ms, submitted_at FROM answers WHERE session_id = ? ORDER BY round').all(id);
  const state = id => {
    const s = session(id), a = answers(id), ids = JSON.parse(s.puzzle_ids);
    const elapsedMs = s.started_at ? Math.max(0, (s.completed_at ?? now()) - s.started_at) : 0;
    return { id, name: s.name, status: s.status, round: a.length, correct: a.reduce((n, x) => n + x.correct, 0), elapsedMs,
      puzzle: s.status === 'completed' ? null : puzzleMap.get(ids[a.length]), totalRounds: ids.length, answers: a,
      score: calculateScore(a.reduce((n, x) => n + x.correct, 0), elapsedMs, JSON.parse(s.scoring_config), ids.length) };
  };
  const register = (input) => {
    const { name, email } = validatePlayer(input.name, input.email);
    const pools = {
      picture_password: shuffle(pictures, randomIndex),
      security_count: shuffle(counts, randomIndex),
    };
    const ids = roundCategories.map(category => category === 'vault_maze' ? 'vault-maze' : pools[category].pop().id);
    const id = randomUUID();
    db.prepare('INSERT INTO sessions (id,name,email,created_at,puzzle_ids,scoring_config) VALUES (?,?,?,?,?,?)').run(id, name, email, now(), JSON.stringify(ids), JSON.stringify(config.scoring));
    return state(id);
  };
  const start = id => {
    const s = session(id);
    if (s.status === 'registered') db.prepare("UPDATE sessions SET status='playing',started_at=?,round_started_at=? WHERE id=?").run(now(), now(), id);
    return state(id);
  };
  const submit = (id, input) => {
    const s = session(id);
    if (typeof input.requestId !== 'string' || input.requestId.length > 100 || !input.requestId) fail('Invalid submission.');
    if (db.prepare('SELECT 1 FROM answers WHERE session_id=? AND request_id=?').get(id, input.requestId)) return state(id);
    if (s.status !== 'playing') fail('This game is not active.', 409);
    if (now() - s.started_at > config.maxGameSeconds * 1000) { db.prepare("UPDATE sessions SET status='expired' WHERE id=?").run(id); fail('Time is up. Please start a new game.', 410); }
    const a = answers(id), round = a.length;
    if (input.round !== round) fail('This round has already been submitted.', 409);
    if (typeof input.answer !== 'string' || input.answer.length > 80) fail('Please enter a shorter answer.');
    const answer = normalizeAnswer(input.answer);
    if (!answer) fail('Your answer is empty.');
    const ids = JSON.parse(s.puzzle_ids), puzzleId = ids[round], correct = Number(answerMap.get(puzzleId).includes(answer));
    const lastRound = round === ids.length - 1;
    const time = now();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT INTO answers VALUES (?,?,?,?,?,?,?,?)').run(id, round, puzzleId, answer, correct, Math.max(0, time - s.round_started_at), time, input.requestId);
      db.prepare('UPDATE sessions SET round_started_at=?, completed_at=?, status=? WHERE id=?').run(time, lastRound ? time : null, lastRound ? 'completed' : 'playing', id);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    return state(id);
  };
  const leaderboard = () => {
    const rows = db.prepare(`SELECT s.id,s.name,s.started_at,s.completed_at,s.puzzle_ids,SUM(a.correct) correct FROM sessions s JOIN answers a ON a.session_id=s.id WHERE s.status='completed' GROUP BY s.id`).all();
    return rows.map(r => ({ id: r.id, name: r.name, correct: r.correct, elapsedMs: r.completed_at - r.started_at, score: calculateScore(r.correct, r.completed_at - r.started_at, config.scoring, JSON.parse(r.puzzle_ids).length), completedAt: r.completed_at }))
      .sort((a, b) => (config.scoring.mode === 'weighted' ? b.score - a.score : b.correct - a.correct) || a.elapsedMs - b.elapsedMs || a.completedAt - b.completedAt)
      .slice(0, 5).map((r, i) => ({ ...r, rank: i + 1 }));
  };
  const exportCsv = () => {
    const cols = ['session_id','name','email','status','created_at','started_at','completed_at','correct','elapsed_ms','correct_response_ms','round','puzzle_id','submitted_answer','is_correct','response_ms','scoring_config'];
    const rows = db.prepare(`SELECT s.id session_id,s.name,s.email,s.status,s.created_at,s.started_at,s.completed_at,
      (SELECT SUM(correct) FROM answers WHERE session_id=s.id) correct,
      s.completed_at-s.started_at elapsed_ms,
      (SELECT SUM(response_ms) FROM answers WHERE session_id=s.id AND correct=1) correct_response_ms,
      a.round+1 round,a.puzzle_id,a.submitted_answer,a.correct is_correct,a.response_ms,s.scoring_config
      FROM sessions s LEFT JOIN answers a ON s.id=a.session_id ORDER BY s.created_at,a.round`).all();
    const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    return '\ufeff' + [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\r\n');
  };
  const backup = () => {
    const folder = join(dataDir, 'backups'); mkdirSync(folder, { recursive: true });
    const file = join(folder, new Date(now()).toISOString().slice(0, 10) + '.sqlite');
    if (!existsSync(file)) db.exec("VACUUM INTO '" + file.replaceAll("'", "''") + "'");
  };
  backup();
  return { register, start, submit, state, leaderboard, exportCsv, backup, operatorKey, close: () => db.close() };
}
