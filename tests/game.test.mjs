import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createGame, normalizeAnswer, validatePlayer, calculateScore, TOTAL_ROUNDS } from '../server/game.mjs';

const root = resolve('.'), config = JSON.parse(readFileSync('config.json'));
const key = JSON.parse(readFileSync('private/answers.json'));
const canonicalAnswers = new Map(key.puzzles.map(p => [p.id, p.answer]));
canonicalAnswers.set('approved-count', '423#');
canonicalAnswers.set('vault-maze', 'CODE5!');
const expectedCategories = [
  'picture_password', 'picture_password', 'security_count',
  'picture_password', 'picture_password', 'security_count',
  'picture_password', 'picture_password', 'security_count', 'vault_maze',
];

function fixture(t, overrides = {}, dependencies = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'password-game-'));
  let time = 1000000;
  const game = createGame({ root, dataDir: dir, config: { ...config, ...overrides }, now: () => time, ...dependencies });
  t.after(() => { game.close(); rmSync(dir, { recursive: true, force: true }); });
  return { game, advance: n => { time += n; }, now: () => time, dir };
}

function play(game, advance, session, answerFor = s => canonicalAnswers.get(s.puzzle.id), perRound = 1000) {
  let s = game.start(session.id);
  const puzzles = [];
  for (let round = s.round; round < s.totalRounds; round++) {
    puzzles.push(s.puzzle);
    advance(perRound);
    s = game.submit(s.id, { answer: answerFor(s), round, requestId: `round-${round}` });
    assert.equal(s.status, round === s.totalRounds - 1 ? 'completed' : 'playing');
  }
  return { session: s, puzzles };
}

function complete(game, advance, name, answerFor, perRound) {
  return play(game, advance, game.register({ name, email: 'player@example.com' }), answerFor, perRound).session;
}

test('normalization retains punctuation and accepts spaces/case', () => {
  assert.equal(normalizeAnswer(' sun flower 7! '), 'SUNFLOWER7!');
  assert.equal(normalizeAnswer('code5!'), 'CODE5!');
  assert.equal(normalizeAnswer('423#'), '423#');
  assert.throws(() => validatePlayer('A', 'bad'));
  assert.throws(() => validatePlayer('Valid', 'bad'));
  assert.equal(validatePlayer('  Jane   Doe  ', 'jane@example.com').name, 'Jane Doe');
});

test('ten rounds, correct timing and scores survive reopening', t => {
  const { game, advance, dir } = fixture(t);
  const s = complete(game, advance, 'Jane Doe');
  assert.equal(TOTAL_ROUNDS, 10);
  assert.equal(s.totalRounds, 10);
  assert.equal(s.round, 10);
  assert.equal(s.correct, 10);
  assert.equal(s.status, 'completed');
  assert.equal(s.elapsedMs, 10000);
  assert.equal(s.puzzle, null);
  assert.equal(s.answers.length, 10);
  assert.equal(game.leaderboard()[0].name, 'Jane Doe');
  const csv = game.exportCsv();
  assert.match(csv, /Jane Doe/);
  assert.match(csv, /"10","vault-maze"/);
  const second = createGame({ root, dataDir: dir, config });
  try {
    assert.equal(second.leaderboard()[0].correct, 10);
    assert.equal(second.state(s.id).totalRounds, 10);
    assert.equal(second.state(s.id).score, s.score);
  } finally { second.close(); }
});

test('first player gets the fixed ten-round order with no repeated puzzles', t => {
  const { game, advance } = fixture(t);
  const { session, puzzles } = play(game, advance, game.register({ name: 'First Player', email: 'x@example.com' }));
  assert.deepEqual(puzzles.map(p => p.category), expectedCategories);
  assert.equal(new Set(puzzles.map(p => p.id)).size, 10);
  assert.equal(puzzles.at(-1).id, 'vault-maze');
  assert.equal(session.correct, 10);
});

test('each registration draws fresh random questions even before another player starts', t => {
  let pickLast = true, draws = 0;
  const { game, advance } = fixture(t, {}, { randomIndex: max => { draws++; return pickLast ? max - 1 : 0; } });
  const first = game.register({ name: 'Player One', email: 'one@example.com' });
  const firstDraws = draws;
  assert.ok(firstDraws > 0);
  pickLast = false;
  const second = game.register({ name: 'Player Two', email: 'two@example.com' });
  assert.ok(draws > firstDraws);
  assert.notEqual(first.puzzle.id, second.puzzle.id);
  const firstPuzzles = play(game, advance, first).puzzles;
  const secondPuzzles = play(game, advance, second).puzzles;
  assert.notDeepEqual(firstPuzzles.map(p => p.id), secondPuzzles.map(p => p.id));
  for (const puzzles of [firstPuzzles, secondPuzzles]) {
    assert.deepEqual(puzzles.map(p => p.category), expectedCategories);
    assert.equal(new Set(puzzles.map(p => p.id)).size, 10);
  }
});

test('selected questions stay unchanged when read, started, or reopened', t => {
  const { game, advance, now, dir } = fixture(t, {}, { randomIndex: max => max - 1 });
  let s = game.register({ name: 'Saved Player', email: 'saved@example.com' });
  const db = new DatabaseSync(join(dir, 'password-challenge.sqlite'));
  const ids = JSON.parse(db.prepare('SELECT puzzle_ids FROM sessions WHERE id=?').get(s.id).puzzle_ids);
  db.close();
  assert.equal(game.state(s.id).puzzle.id, ids[0]);
  s = game.start(s.id);
  advance(100);
  s = game.submit(s.id, { answer: canonicalAnswers.get(s.puzzle.id), round: 0, requestId: 'saved-first' });
  const reopened = createGame({ root, dataDir: dir, config, now, randomIndex: () => { throw new Error('Must not redraw saved questions'); } });
  try {
    assert.equal(reopened.state(s.id).puzzle.id, ids[1]);
    const result = play(reopened, advance, reopened.state(s.id));
    assert.deepEqual(result.puzzles.map(p => p.id), ids.slice(1));
    assert.equal(result.session.correct, 10);
  } finally { reopened.close(); }
});

test('empty and repeated taps never advance or score twice, including the final round', t => {
  const { game, advance } = fixture(t);
  let s = game.register({ name: 'Agent One', email: 'agent@example.com' });
  game.start(s.id);
  advance(500);
  assert.throws(() => game.submit(s.id, { answer: ' ', round: 0, requestId: 'blank' }), /empty/);
  assert.equal(game.state(s.id).round, 0);
  const input = { answer: canonicalAnswers.get(s.puzzle.id), round: 0, requestId: 'first' };
  assert.equal(game.submit(s.id, input).correct, 1);
  assert.equal(game.submit(s.id, input).round, 1);
  assert.throws(() => game.submit(s.id, { ...input, requestId: 'second' }), /already/);
  s = play(game, advance, game.state(s.id)).session;
  assert.equal(s.correct, 10);
  const final = { answer: 'CODE5!', round: 9, requestId: 'round-9' };
  assert.equal(game.submit(s.id, final).correct, 10);
  assert.equal(game.submit(s.id, final).answers.length, 10);
  assert.throws(() => game.submit(s.id, { ...final, requestId: 'extra' }), /not active/);
});

test('accuracy ranks ahead of speed, time resolves tied accuracy; incomplete games excluded', t => {
  const { game, advance } = fixture(t);
  complete(game, advance, 'Fast Wrong', () => 'bad', 500);
  complete(game, advance, 'Slow Correct', undefined, 2000);
  complete(game, advance, 'Fast Correct', undefined, 1000);
  game.register({ name: 'Incomplete', email: 'x@example.com' });
  assert.deepEqual(game.leaderboard().map(x => x.name), ['Fast Correct', 'Slow Correct', 'Fast Wrong']);
});

test('all 50 bank puzzles can be selected and their canonical answers pass the ten-round flow', t => {
  let playerIndex = 0;
  const { game, advance } = fixture(t, {}, { randomIndex: max => max === 25 ? playerIndex : max - 1 });
  const seen = new Set();
  for (; playerIndex < 25; playerIndex++) {
    const { session, puzzles } = play(game, advance,
      game.register({ name: `Correct Player ${playerIndex}`, email: 'x@example.com' }),
      s => canonicalAnswers.get(s.puzzle.id).toLowerCase(), 100);
    puzzles.forEach(p => seen.add(p.id));
    assert.deepEqual(puzzles.map(p => p.category), expectedCategories);
    assert.equal(session.correct, 10);
  }
  for (let i = 1; i <= 50; i++) assert.ok(seen.has(`puzzle-${String(i).padStart(3, '0')}`));
});

test('existing four-round sessions can still finish after the ten-round update', t => {
  const { game, advance, dir } = fixture(t);
  const s = game.register({ name: 'Existing Player', email: 'existing@example.com' });
  const db = new DatabaseSync(join(dir, 'password-challenge.sqlite'));
  db.prepare('UPDATE sessions SET puzzle_ids=? WHERE id=?').run(JSON.stringify(['puzzle-001', 'puzzle-002', 'approved-count', 'vault-maze']), s.id);
  db.close();
  const result = play(game, advance, game.state(s.id)).session;
  assert.equal(result.totalRounds, 4);
  assert.equal(result.correct, 4);
  assert.equal(result.status, 'completed');
  assert.equal(result.score, calculateScore(4, 4000, config.scoring, 4));
  assert.equal(game.leaderboard()[0].score, result.score);
});

test('server rejects late answers and CSV neutralizes spreadsheet formulas', t => {
  const { game, advance } = fixture(t, { maxGameSeconds: 1 });
  const s = game.register({ name: '=HYPERLINK("bad")', email: 'x@example.com' });
  game.start(s.id);
  advance(1001);
  assert.throws(() => game.submit(s.id, { answer: 'bad', round: 0, requestId: 'late' }), /Time is up/);
  assert.equal(game.leaderboard().length, 0);
  assert.match(game.exportCsv(), /'=HYPERLINK/);
});

test('weighted speed bonus uses each game length and does not exceed its configured maximum', () => {
  assert.ok(calculateScore(10, 1000, config.scoring) > calculateScore(10, 5000, config.scoring));
  assert.equal(calculateScore(0, 1000, config.scoring), 0);
  assert.equal(calculateScore(10, 0, config.scoring), 10 * config.scoring.correctWeight + config.scoring.speedWeight);
  assert.equal(calculateScore(5, 0, config.scoring), 5 * config.scoring.correctWeight + config.scoring.speedWeight / 2);
  assert.equal(calculateScore(4, 0, config.scoring, 4), 4 * config.scoring.correctWeight + config.scoring.speedWeight);
});
