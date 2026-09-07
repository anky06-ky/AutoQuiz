import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, getPool, isConnected } from './db.js';
import { normalizeQuiz } from '../src/utils/quizData.js';
import { replaceQuizQuestions } from './quizRepository.js';
import { createAccountRouter } from './accountRoutes.js';
import { createAccountRepository } from './accountRepository.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mysqlConnected: isConnected(),
    message: isConnected() ? 'Đã kết nối MySQL Database!' : 'Đang sử dụng LocalStorage fallback',
  });
});

app.use('/api', createAccountRouter(createAccountRepository(getPool), isConnected));

app.get('/api/quizzes', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [rows] = req.account.role === 'admin'
      ? await pool.query('SELECT * FROM quizzes ORDER BY createdAt DESC')
      : await pool.query('SELECT * FROM quizzes WHERE authorId = ? ORDER BY createdAt DESC', [req.account.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const formattedQuestions = qRows.map(q => ({
      id: q.id,
      question: q.question,
      options: [q.optionA, q.optionB, q.optionC, q.optionD].filter((option) => option !== ''),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));

    res.json({
      ...quiz,
      questions: formattedQuestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
       ON DUPLICATE KEY UPDATE title=?, description=?, questionCount=?, timeLimit=?, maxAttempts=?, shareCode=?`,
      [
        quizId, title, description || '', icon || '📂', color || '#6c5ce7', questions.length, timeLimit || 30, maxAttempts || 0, code, req.account.id, req.account.displayName,
        title, description || '', questions.length, timeLimit || 30, maxAttempts || 0, code
      ]
    );

    await replaceQuizQuestions(conn, quizId, questions);

    await conn.commit();
    res.json({ success: true, quizId, shareCode: code, count: questions.length });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/history', async (req, res) => {
  const { quizId, categoryId, categoryName, mode, totalQuestions, correctCount, score, timeSpent } = req.body;
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO quiz_history (userId, userName, quizId, categoryName, mode, totalQuestions, correctCount, score, timeSpent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.account.id, req.account.displayName, quizId || categoryId || 'general', categoryName || 'Chủ đề', mode || 'exam', totalQuestions, correctCount, score, timeSpent]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT userId, userName, categoryName, quizId, MAX(score) as score, totalQuestions, correctCount, MIN(timeSpent) as timeSpent
       FROM quiz_history
       GROUP BY userId, categoryName
       ORDER BY score DESC, timeSpent ASC
       LIMIT 20`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDatabase().then(() => {
  app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
    console.log(`🚀 AutoQuiz Backend Server đang chạy tại: http://localhost:${PORT}`);
  });
});
