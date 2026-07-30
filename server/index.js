import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, getPool, isConnected } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. Kiểm tra trạng thái Backend & MySQL
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mysqlConnected: isConnected(),
    message: isConnected() ? 'Đã kết nối MySQL Database!' : 'Đang sử dụng LocalStorage fallback',
  });
});

// 2. Đăng ký tài khoản
app.post('/api/auth/register', async (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu không được để trống!' });
  }

  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại!' });
    }

    const userId = Date.now().toString();
    const avatar = ['🦊', '🐱', '🐼', '🦁', '🐯', '🐻', '🦄', '🐲', '⚡'][Math.floor(Math.random() * 9)];

    await pool.query(
      'INSERT INTO users (id, username, password, displayName, avatar) VALUES (?, ?, ?, ?, ?)',
      [userId, username.toLowerCase(), password, displayName || username, avatar]
    );

    res.json({ id: userId, username: username.toLowerCase(), displayName: displayName || username, avatar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, username, displayName, avatar FROM users WHERE username = ? AND password = ?',
      [username.toLowerCase(), password]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng!' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Lấy tất cả bộ đề thi
app.get('/api/quizzes', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM quizzes ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Lấy chi tiết bộ đề thi + danh sách câu hỏi
app.get('/api/quizzes/:id', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [quizRows] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (quizRows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bộ đề' });
    }

    const [qRows] = await pool.query('SELECT * FROM questions WHERE quizId = ? ORDER BY id ASC', [req.params.id]);

    const formattedQuestions = qRows.map(q => ({
      id: q.id,
      question: q.question,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));

    res.json({
      ...quizRows[0],
      questions: formattedQuestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Tạo/Lưu bộ đề thi mới từ file
app.post('/api/quizzes', async (req, res) => {
  const { id, title, description, icon, color, questions, authorId, authorName } = req.body;
  if (!title || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Dữ liệu bộ đề thi không hợp lệ!' });
  }

  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  const quizId = id || `custom-${Date.now()}`;
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Chèn bộ đề vào bảng quizzes
    await conn.query(
      `INSERT INTO quizzes (id, title, description, icon, color, questionCount, authorId, authorName)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=?, description=?, questionCount=?`,
      [
        quizId, title, description || '', icon || '📂', color || '#6c5ce7', questions.length, authorId || 'guest', authorName || 'Guest',
        title, description || '', questions.length
      ]
    );

    // Chèn từng câu hỏi vào bảng questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = q.id || `q-${quizId}-${i + 1}`;
      const optA = q.options[0] || '';
      const optB = q.options[1] || '';
      const optC = q.options[2] || '';
      const optD = q.options[3] || '';

      await conn.query(
        `INSERT INTO questions (id, quizId, question, optionA, optionB, optionC, optionD, correctAnswer, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE question=?, optionA=?, optionB=?, optionC=?, optionD=?, correctAnswer=?, explanation=?`,
        [
          qId, quizId, q.question, optA, optB, optC, optD, q.correctAnswer || 0, q.explanation || '',
          q.question, optA, optB, optC, optD, q.correctAnswer || 0, q.explanation || ''
        ]
      );
    }

    await conn.commit();
    res.json({ success: true, quizId, count: questions.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 7. Xóa bộ đề
app.delete('/api/quizzes/:id', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    await pool.query('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Lưu kết quả thi
app.post('/api/history', async (req, res) => {
  const { userId, userName, quizId, categoryName, mode, totalQuestions, correctCount, score, timeSpent } = req.body;
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO quiz_history (userId, userName, quizId, categoryName, mode, totalQuestions, correctCount, score, timeSpent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId || 'guest', userName || 'Guest', quizId || 'general', categoryName || 'Chủ đề', mode || 'exam', totalQuestions, correctCount, score, timeSpent]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Lấy lịch sử thi của User
app.get('/api/history/user/:userId', async (req, res) => {
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

// 10. Lấy bảng xếp hạng
app.get('/api/leaderboard', async (req, res) => {
  if (!isConnected()) {
    return res.status(503).json({ error: 'MySQL server chưa sẵn sàng' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT userId, userName, categoryName, categoryId, MAX(score) as score, totalQuestions, correctCount, MIN(timeSpent) as timeSpent
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

// Khởi động server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 AutoQuiz Backend Server đang chạy tại: http://localhost:${PORT}`);
  });
});
