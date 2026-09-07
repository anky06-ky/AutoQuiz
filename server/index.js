import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase, getPool, isConnected } from './db.js';
import { normalizeQuiz } from '../src/utils/quizData.js';
import { replaceQuizQuestions } from './quizRepository.js';
import { createAccountRouter } from './accountRoutes.js';
import { createAccountRepository } from './accountRepository.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : process.env.NODE_ENV !== 'production' }));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
});
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (req, res) => {
  res.status(isConnected() ? 200 : 503).json({
    status: 'ok',
    mysqlConnected: isConnected(),
    message: isConnected() ? 'Đã kết nối MySQL Database!' : 'Đang sử dụng LocalStorage fallback',
  });
});

app.use('/api', createAccountRouter(createAccountRepository(getPool), isConnected));

const formatQuestion = (question) => ({
  id: question.id,
  question: question.question,
  options: [question.optionA, question.optionB, question.optionC, question.optionD].filter((option) => option !== ''),
  correctAnswer: question.correctAnswer,
  explanation: question.explanation,
});
const sendServerError = (res, err, action) => {
  console.error(`${action}:`, err);
  res.status(500).json({ error: `${action}. Hãy thử lại.` });
};

app.get('/api/quizzes', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [rows] = req.account.role === 'admin'
      ? await pool.query('SELECT * FROM quizzes ORDER BY updatedAt DESC')
      : await pool.query('SELECT * FROM quizzes WHERE authorId = ? ORDER BY updatedAt DESC', [req.account.id]);
    if (!rows.length) return res.json([]);
    const [questionRows] = await pool.query('SELECT * FROM questions WHERE quizId IN (?) ORDER BY quizId, id', [rows.map((quiz) => quiz.id)]);
    const questionsByQuiz = new Map();
    for (const question of questionRows) {
      const questions = questionsByQuiz.get(question.quizId) || [];
      questions.push(question);
      questionsByQuiz.set(question.quizId, questions);
    }
    res.json(rows.map((quiz) => ({ ...quiz, questions: (questionsByQuiz.get(quiz.id) || []).map(formatQuestion) })));
  } catch (err) {
    sendServerError(res, err, 'Không tải được danh sách bộ đề');
  }
});

app.get('/api/quizzes/:id', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [quizRows] = await pool.query('SELECT * FROM quizzes WHERE id = ? OR shareCode = ?', [req.params.id, req.params.id]);
    if (quizRows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bộ đề' });
    }

    const quiz = quizRows[0];
    if (quiz.authorId !== req.account.id && req.account.role !== 'admin') return res.status(403).json({ error: 'Bạn không có quyền truy cập bộ đề này.' });
    const [qRows] = await pool.query('SELECT * FROM questions WHERE quizId = ? ORDER BY id ASC', [quiz.id]);

    res.json({
      ...quiz,
      questions: qRows.map(formatQuestion),
    });
  } catch (err) {
    sendServerError(res, err, 'Không tải được bộ đề');
  }
});

app.post('/api/quizzes', async (req, res) => {
  let quiz;
  try {
    quiz = normalizeQuiz(req.body);
    if (quiz.id && (typeof quiz.id !== 'string' || quiz.id.length > 50)) throw new Error('Mã bộ đề không hợp lệ.');
    if (quiz.shareCode && (typeof quiz.shareCode !== 'string' || quiz.shareCode.length > 50)) throw new Error('Mã chia sẻ không hợp lệ.');
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const { id, title, description, icon, color, questions, timeLimit, maxAttempts, shareCode } = quiz;

  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  const quizId = id || `custom-${Date.now()}`;
  const code = shareCode || Math.random().toString(36).substring(2, 8).toUpperCase();
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id, authorId FROM quizzes WHERE id = ? OR shareCode = ? FOR UPDATE', [quizId, code]);
    if (existing.some((item) => item.id !== quizId || (item.authorId !== req.account.id && req.account.role !== 'admin'))) {
      await conn.rollback();
      return res.status(403).json({ error: 'Bộ đề hoặc mã chia sẻ này không thuộc quyền quản lý của bạn.' });
    }

    await conn.query(
      `INSERT INTO quizzes (id, title, description, icon, color, questionCount, timeLimit, maxAttempts, shareCode, authorId, authorName)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=?, description=?, icon=?, color=?, questionCount=?, timeLimit=?, maxAttempts=?, shareCode=?, updatedAt=NOW(3)`,
      [
        quizId, title, description || '', icon || '📂', color || '#6c5ce7', questions.length, timeLimit || 30, maxAttempts || 0, code, req.account.id, req.account.displayName,
        title, description || '', icon || '📂', color || '#6c5ce7', questions.length, timeLimit || 30, maxAttempts || 0, code
      ]
    );

    await replaceQuizQuestions(conn, quizId, questions);

    await conn.commit();
    res.json({ success: true, quizId, shareCode: code, count: questions.length });
  } catch (err) {
    if (conn) await conn.rollback();
    sendServerError(res, err, 'Không lưu được bộ đề');
  } finally {
    conn?.release();
  }
});

app.delete('/api/quizzes/:id', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [result] = req.account.role === 'admin'
      ? await pool.query('DELETE FROM quizzes WHERE id = ?', [req.params.id])
      : await pool.query('DELETE FROM quizzes WHERE id = ? AND authorId = ?', [req.params.id, req.account.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Không tìm thấy bộ đề thuộc quyền quản lý của bạn.' });
    res.json({ success: true });
  } catch (err) {
    sendServerError(res, err, 'Không xóa được bộ đề');
  }
});

app.post('/api/history', async (req, res) => {
  const { quizId, categoryId, categoryName, mode, totalQuestions, correctCount, score, timeSpent } = req.body;
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  const resolvedQuizId = quizId || categoryId || 'general';
  const validResult = typeof resolvedQuizId === 'string' && resolvedQuizId.length <= 50
    && typeof categoryName === 'string' && categoryName.trim().length > 0 && categoryName.trim().length <= 255
    && ['practice', 'exam'].includes(mode)
    && Number.isInteger(totalQuestions) && totalQuestions >= 1 && totalQuestions <= 5000
    && Number.isInteger(correctCount) && correctCount >= 0 && correctCount <= totalQuestions
    && Number.isInteger(score) && score === Math.round((correctCount / totalQuestions) * 100)
    && Number.isInteger(timeSpent) && timeSpent >= 0 && timeSpent <= 24 * 60 * 60;
  if (!validResult) return res.status(400).json({ error: 'Kết quả bài thi không hợp lệ.' });

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO quiz_history (userId, userName, quizId, categoryName, mode, totalQuestions, correctCount, score, timeSpent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.account.id, req.account.displayName, resolvedQuizId, categoryName.trim(), mode, totalQuestions, correctCount, score, timeSpent]
    );

    res.status(201).json({ success: true, result: { id: result.insertId, userId: req.account.id, userName: req.account.displayName, quizId: resolvedQuizId, categoryId: resolvedQuizId, categoryName: categoryName.trim(), mode, totalQuestions, correctCount, score, timeSpent, timestamp: new Date().toISOString() } });
  } catch (err) {
    sendServerError(res, err, 'Không lưu được kết quả');
  }
});

app.get('/api/history/user/:userId', async (req, res) => {
  if (req.params.userId !== req.account.id && req.account.role !== 'admin') return res.status(403).json({ error: 'Bạn không có quyền xem lịch sử tài khoản này.' });
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM quiz_history WHERE userId = ? ORDER BY timestamp DESC', [req.params.userId]);
    res.json(rows);
  } catch (err) {
    sendServerError(res, err, 'Không tải được lịch sử');
  }
});

app.get('/api/leaderboard', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT userId, userName, categoryName, quizId, score, totalQuestions, correctCount, timeSpent, timestamp
       FROM (
         SELECT quiz_history.*, ROW_NUMBER() OVER (PARTITION BY userId, quizId ORDER BY score DESC, timeSpent ASC, timestamp ASC) AS position
         FROM quiz_history
       ) ranked
       WHERE position = 1
       ORDER BY score DESC, timeSpent ASC, timestamp ASC
       LIMIT 20`
    );
    res.json(rows);
  } catch (err) {
    sendServerError(res, err, 'Không tải được bảng xếp hạng');
  }
});

const distPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
  app.use((req, res, next) => req.method !== 'GET' || req.path.startsWith('/api/') ? next() : res.sendFile(join(distPath, 'index.html')));
}

app.use('/api', (req, res) => res.status(404).json({ error: 'API không tồn tại.' }));
app.use((err, req, res, _next) => {
  console.error('Lỗi máy chủ:', err);
  if (res.headersSent) return;
  const status = err.type === 'entity.too.large' ? 413 : 500;
  res.status(status).json({ error: status === 413 ? 'Dữ liệu gửi lên vượt quá 12 MB.' : 'Máy chủ gặp lỗi. Hãy thử lại.' });
});

initDatabase().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`🚀 AutoQuiz đang chạy tại http://${HOST}:${PORT}`);
  });
});
