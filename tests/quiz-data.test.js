import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuizStore, QUIZZES_KEY } from '../src/services/quizStore.js';
import { duplicateQuestionIds, normalizeQuiz, prepareQuizWithShuffledAnswers, questionErrors, resolveQuestionCount, selectQuestions } from '../src/utils/quizData.js';
import { settingsError } from '../src/utils/quizSettings.js';
import { replaceQuizQuestions } from '../server/quizRepository.js';

const question = (id = 'q-1') => ({ id, question: 'Thủ đô của Việt Nam là gì?', options: ['Hà Nội', 'Huế', 'Đà Nẵng', 'Cần Thơ'], correctAnswer: 0, explanation: 'Hà Nội là thủ đô.' });
const quiz = (extra = {}) => ({ id: 'custom-legacy', title: 'Địa lý', description: 'Ôn tập', questions: [question()], questionCount: 999, ...extra });
const author = { id: 'user-1', displayName: 'Người học' };

function memoryStorage(initial = []) {
  const values = new Map([[QUIZZES_KEY, JSON.stringify(initial)]]);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('legacy counts are derived without rewriting stored data; reads reuse the cached array', () => {
  const storage = memoryStorage([quiz()]);
  const before = storage.getItem(QUIZZES_KEY);
  const store = createQuizStore(storage);
  assert.equal(store.getSnapshot()[0].questionCount, 1);
  assert.equal(store.getSnapshot(), store.getSnapshot());
  assert.equal(storage.getItem(QUIZZES_KEY), before);
});

test('save edits in place, retains identity and author, removes deleted questions and publishes changes', () => {
  const old = quiz({ questions: [question(), question('q-2')], createdAt: '2026-01-01T00:00:00.000Z', authorId: 'owner', shareCode: 'AQ-KEEP' });
  const storage = memoryStorage([old]);
  const store = createQuizStore(storage);
  let updates = 0;
  store.subscribe(() => updates++);
  const changed = question(); changed.correctAnswer = 2; changed.explanation = 'Giải thích đã sửa';
  const saved = store.save({ ...old, title: 'Tên mới', questions: [changed] }, author).quiz;
  assert.equal(saved.id, old.id);
  assert.equal(saved.shareCode, old.shareCode);
  assert.equal(saved.authorId, 'owner');
  assert.equal(saved.createdAt, old.createdAt);
  assert.equal(saved.questionCount, 1);
  assert.equal(saved.questions[0].correctAnswer, 2);
  assert.equal(saved.questions[0].id, 'q-1');
  assert.equal(store.getSnapshot().length, 1);
  assert.equal(JSON.parse(storage.getItem(QUIZZES_KEY))[0].questions.length, 1);
  store.remove(saved.id);
  assert.equal(store.getSnapshot().length, 0);
  assert.equal(updates, 2);
});

test('repeated imports do not duplicate data; changed answer or explanation is kept as a separate quiz', () => {
  const store = createQuizStore(memoryStorage());
  const first = store.save(quiz(), author);
  const repeated = store.save(quiz({ id: 'different-id', questions: [question('different-question-id')] }), author);
  assert.equal(repeated.duplicate, true);
  assert.equal(repeated.quiz.id, first.quiz.id);
  assert.equal(store.getSnapshot().length, 1);
  const changed = question(); changed.explanation = 'Giải thích khác';
  store.save(quiz({ questions: [changed] }), author);
  assert.equal(store.getSnapshot().length, 2);
});

test('failed or malformed input leaves the previous storage untouched', () => {
  const storage = memoryStorage([quiz()]);
  const store = createQuizStore(storage);
  const original = storage.getItem(QUIZZES_KEY);
  for (const questions of [[], [{ ...question(), correctAnswer: -1 }], [{ ...question(), options: ['A', 'A'] }], [{ ...question(), question: '  ' }]]) {
    assert.throws(() => store.save(quiz({ questions }), author));
    assert.equal(storage.getItem(QUIZZES_KEY), original);
  }
  assert.throws(() => normalizeQuiz(quiz({ timeLimit: -1 })));
  assert.throws(() => normalizeQuiz(quiz({ maxAttempts: 0.5 })));
  assert.throws(() => normalizeQuiz(quiz({ questions: [{ ...question(), correctAnswer: null }] })));
});

test('corrupt storage is never overwritten, and quota failures retain the last good snapshot', () => {
  const storage = memoryStorage([quiz()]);
  const store = createQuizStore(storage);
  const snapshot = store.getSnapshot();
  storage.setItem(QUIZZES_KEY, '{broken');
  assert.throws(() => store.save(quiz(), author), /Không đọc được/);
  assert.throws(() => store.remove('custom-legacy'), /Không đọc được/);
  assert.equal(storage.getItem(QUIZZES_KEY), '{broken');
  storage.setItem(QUIZZES_KEY, JSON.stringify([quiz()]));
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => store.save(quiz({ title: 'New' }), author), /Không thể lưu/);
  assert.equal(store.getSnapshot(), snapshot);
});

test('external updates are read before writes; stale editor revisions cannot overwrite them', () => {
  const storage = memoryStorage([quiz({ createdAt: '2026-01-01T00:00:00.000Z' })]);
  const firstTab = createQuizStore(storage);
  const secondTab = createQuizStore(storage);
  const initial = firstTab.getSnapshot()[0];
  secondTab.save({ ...initial, title: 'Sửa ở tab khác' }, author);
  assert.equal(firstTab.getSnapshot()[0].title, 'Sửa ở tab khác');
  assert.throws(() => firstTab.save(initial, author, { expectedUpdatedAt: initial.createdAt }), /cửa sổ khác/);
  assert.equal(firstTab.getSnapshot()[0].title, 'Sửa ở tab khác');
});

test('IDs are unique and imports preserve share codes across devices', () => {
  const first = createQuizStore(memoryStorage()).save(quiz({ questions: [question(), question()], shareCode: 'AQ-PORTABLE' }), author).quiz;
  assert.notEqual(first.questions[0].id, first.questions[1].id);
  const imported = createQuizStore(memoryStorage()).save(first, author).quiz;
  assert.notEqual(imported.id, first.id);
  assert.equal(imported.shareCode, first.shareCode);
});

test('server refresh replaces old server data while preserving browser-only quizzes', () => {
  const browserQuiz = quiz({ id: 'browser-only', authorId: 'local-user' });
  const oldServerQuiz = quiz({ id: 'server-old', authorId: 'server-user', storageSource: 'server' });
  const store = createQuizStore(memoryStorage([browserQuiz, oldServerQuiz]));
  const freshServerQuiz = quiz({ id: 'server-new', authorId: 'server-user', title: 'Bản trên máy chủ' });
  store.replaceServer([freshServerQuiz]);
  assert.deepEqual(store.getSnapshot().map((item) => item.id), ['server-new', 'browser-only']);
  assert.equal(store.getSnapshot()[0].storageSource, 'server');
  const snapshot = store.getSnapshot();
  store.remove('server-new');
  store.replaceAll(snapshot);
  assert.deepEqual(store.getSnapshot(), snapshot);
});

test('duplicate question detection keeps different answer keys and explanations', () => {
  const questions = [question(), question('q-2'), { ...question('q-3'), correctAnswer: 2 }, { ...question('q-4'), explanation: 'Khác' }];
  assert.deepEqual(duplicateQuestionIds(questions), ['q-2']);
  assert.equal(questionErrors(question()).length, 0);
});

test('question counts respect custom values, all, and the available question limit', () => {
  const bank = Array.from({ length: 120 }, (_, index) => question(`q-${index}`));
  assert.equal(selectQuestions(bank, 10).length, 10);
  assert.equal(selectQuestions(bank, 35).length, 35);
  assert.equal(selectQuestions(bank, 'all').length, 120);
  assert.equal(selectQuestions(bank, 500).length, 120);
  assert.deepEqual(selectQuestions(bank, 5, false), bank.slice(0, 5));
  for (const invalid of [-3, NaN, 2.5, 'bad']) assert.equal(resolveQuestionCount(invalid, 120), 10);
  assert.equal(selectQuestions([], 'all').length, 0);
});

test('shuffling preserves all questions, the correct answer text and the original bank', () => {
  const bank = Array.from({ length: 120 }, (_, index) => question(`q-${index}`));
  const original = JSON.stringify(bank);
  const shuffled = prepareQuizWithShuffledAnswers(selectQuestions(bank, 'all', true, () => 0), () => 0);
  assert.equal(new Set(shuffled.map((item) => item.id)).size, bank.length);
  assert.ok(shuffled.every((item) => item.options[item.correctAnswer] === 'Hà Nội'));
  assert.notEqual(shuffled[0].id, bank[0].id);
  assert.notEqual(shuffled[0].correctAnswer, bank[0].correctAnswer);
  assert.equal(JSON.stringify(bank), original);
});

test('settings reject empty, fractional or excessive counts and respect practice mode', () => {
  const settings = { mode: 'exam', count: 10, timeLimit: '' };
  assert.equal(settingsError(settings), '');
  for (const count of ['', 0, -1, 2.5, 5001]) assert.ok(settingsError({ ...settings, count }));
  assert.equal(settingsError({ ...settings, count: 'all', timeLimit: 35 }), '');
  assert.ok(settingsError({ ...settings, timeLimit: 601 }));
  assert.equal(settingsError({ ...settings, mode: 'practice', timeLimit: 601 }), '');
});

test('database writes replace stale questions in batches and keep namespaces and display order', async () => {
  const calls = [];
  const connection = { query: async (...args) => { calls.push(args); } };
  const questions = Array.from({ length: 500 }, () => question('reused-id'));
  await replaceQuizQuestions(connection, 'custom-one', questions);
  assert.match(calls[0][0], /^DELETE/);
  assert.deepEqual(calls[0][1], ['custom-one']);
  assert.equal(calls.length, 3);
  const rows = calls.slice(1).flatMap((call) => call[1][0]);
  assert.equal(rows.length, 500);
  assert.equal(new Set(rows.map((row) => row[0])).size, 500);
  assert.deepEqual(rows.map((row) => row[0]).sort(), rows.map((row) => row[0]));
  assert.ok(rows.every((row) => row[0].length <= 50 && row[1] === 'custom-one'));
  calls.length = 0;
  await replaceQuizQuestions(connection, 'custom-two', [question()]);
  assert.notEqual(calls[1][1][0][0][0], rows[0][0]);
});
