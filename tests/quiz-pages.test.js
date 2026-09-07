import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

let server;
let AuthContext;
let Dashboard;
let EditQuiz;
let Quiz;
let Account;
let AdminAccounts;
let Navbar;

before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  AuthContext = (await server.ssrLoadModule('/src/contexts/AuthContext.jsx')).default;
  Dashboard = (await server.ssrLoadModule('/src/pages/Dashboard.jsx')).default;
  EditQuiz = (await server.ssrLoadModule('/src/pages/EditQuiz.jsx')).default;
  Quiz = (await server.ssrLoadModule('/src/pages/Quiz.jsx')).default;
  Account = (await server.ssrLoadModule('/src/pages/Account.jsx')).default;
  AdminAccounts = (await server.ssrLoadModule('/src/pages/AdminAccounts.jsx')).default;
  Navbar = (await server.ssrLoadModule('/src/components/Navbar.jsx')).default;
});

after(async () => { await server?.close(); });

const questions = Array.from({ length: 120 }, (_, index) => ({
  id: `q-${index + 1}`, question: `Nội dung câu mẫu số ${index + 1}`,
  options: ['Đáp án một', 'Đáp án hai', 'Đáp án ba', 'Đáp án bốn'], correctAnswer: 1, explanation: 'Giải thích mẫu',
}));
const quiz = { id: 'custom-test', title: 'Bộ đề 120 câu', description: '', questions, questionCount: 120, timeLimit: 30 };

function render(Component, path, url, overrides = {}) {
  const value = {
    user: { id: 'test', displayName: 'Người học' }, customQuizzes: [quiz],
    getStats: () => ({ totalQuizzes: 0, bestScore: 0, avgScore: 0 }), getMyHistory: () => [], ...overrides,
  };
  return renderToStaticMarkup(createElement(AuthContext.Provider, { value },
    createElement(MemoryRouter, { initialEntries: [url] },
      createElement(Routes, null, createElement(Route, { path, element: createElement(Component) })))));
}

test('dashboard exposes editing and displays the actual selected count for a 120-question quiz', () => {
  const html = render(Dashboard, '/', '/');
  assert.match(html, /Chỉnh sửa/);
  assert.match(html, /Sẽ làm 10 câu/);
  assert.match(html, /Tất cả/);
  assert.match(html, /Xáo trộn câu hỏi/);
  assert.match(html, /Xáo trộn đáp án/);
});

test('editor renders only ten question forms from a 120-question bank', () => {
  const html = render(EditQuiz, '/edit-quiz/:quizId', '/edit-quiz/custom-test');
  assert.equal((html.match(/<article/g) || []).length, 10);
  assert.match(html, /Trang 1\/12/);
  assert.match(html, /Nội dung câu mẫu số 10</);
  assert.doesNotMatch(html, /Nội dung câu mẫu số 11</);
  assert.match(html, /Giải thích đáp án/);
  assert.match(html, /Lưu thay đổi/);
});

test('quiz route applies count, order, answer shuffle and time settings from dashboard query', () => {
  const html = render(Quiz, '/quiz/:topic', '/quiz/custom-test?mode=exam&count=35&time=15&shuffleQuestions=0&shuffleAnswers=0');
  assert.equal((html.match(/id="pill-/g) || []).length, 35);
  assert.match(html, /Nội dung câu mẫu số 1</);
  assert.match(html, /15:00/);
  assert.ok(html.indexOf('Đáp án một') < html.indexOf('Đáp án hai'));
});

test('an invalid legacy quiz opens a repair message instead of a broken question card', () => {
  const html = render(Quiz, '/quiz/:topic', '/quiz/custom-test?count=10', {
    customQuizzes: [{ ...quiz, questions: [{ ...questions[0], correctAnswer: -1 }] }],
  });
  assert.match(html, /Bộ đề có câu hỏi cần kiểm tra/);
  assert.doesNotMatch(html, /id="pill-/);
});

test('account page exposes profile and password forms and clearly labels device-local accounts', () => {
  const html = render(Account, '/account', '/account', { user: { id: 'local', username: 'learner', displayName: 'Người học', avatar: '🐼', authSource: 'local' } });
  assert.match(html, /Thông tin cá nhân/);
  assert.match(html, /Mật khẩu hiện tại/);
  assert.match(html, /Nhập lại mật khẩu mới/);
  assert.match(html, /Trên trình duyệt này/);
});

test('admin page rejects a client-only admin flag and ordinary server users', () => {
  const local = render(AdminAccounts, '/admin/accounts', '/admin/accounts', { user: { id: 'local', role: 'admin', authSource: 'local' } });
  assert.match(local, /cần tài khoản admin trên máy chủ/);
  assert.doesNotMatch(local, /Tạo tài khoản<\/summary>/);
  const ordinary = render(AdminAccounts, '/admin/accounts', '/admin/accounts', { user: { id: 'user', role: 'user', authSource: 'server' } });
  assert.match(ordinary, /chưa có quyền quản trị/);
});

test('authenticated server admin sees management controls and account navigation', () => {
  const user = { id: 'admin', username: 'admin06', displayName: 'Admin', role: 'admin', authSource: 'server' };
  const html = render(AdminAccounts, '/admin/accounts', '/admin/accounts', { user });
  assert.match(html, /QUẢN TRỊ HỆ THỐNG/);
  assert.match(html, /Lọc vai trò/);
  assert.match(html, /Tạo tài khoản/);
  const navbar = render(Navbar, '/', '/', { user });
  assert.match(navbar, /href="\/account"/);
  assert.match(navbar, /href="\/admin\/accounts"/);
});
