import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { bootstrapAdmin } from './bootstrapAdmin.js';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'autoquiz_db';
const DB_SSL = process.env.DB_SSL === 'true';

if (!/^[a-zA-Z0-9_]+$/.test(DB_NAME)) throw new Error('DB_NAME chỉ được chứa chữ, số và dấu gạch dưới.');

const connectionOptions = (database) => ({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  ...(database ? { database } : {}),
  ...(DB_SSL ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false', ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}) } } : {}),
  connectTimeout: 10000,
});

let pool = null;
let isDbConnected = false;

export async function initDatabase() {
  try {
    // Hosted database users often cannot CREATE DATABASE. Connect directly
    // first and only create the local development database when it is missing.
    let probe;
    try {
      probe = await mysql.createConnection(connectionOptions(DB_NAME));
      await probe.query('SELECT 1');
    } catch (err) {
      if (err.code !== 'ER_BAD_DB_ERROR') throw err;
      const rootConn = await mysql.createConnection(connectionOptions());
      try {
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      } finally {
        await rootConn.end();
      }
    } finally {
      await probe?.end();
    }

    pool = mysql.createPool({
      ...connectionOptions(DB_NAME),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        displayName VARCHAR(100) NOT NULL,
        avatar VARCHAR(10) DEFAULT '⚡',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Upgrade existing installations without replacing user records.
    const [userColumns] = await pool.query('SHOW COLUMNS FROM users');
    const columnNames = new Set(userColumns.map((column) => column.Field));
    for (const [name, definition] of [
      ['role', "VARCHAR(20) NOT NULL DEFAULT 'user'"],
      ['status', "VARCHAR(20) NOT NULL DEFAULT 'active'"],
      ['passwordChangedAt', 'DATETIME(3) NULL'],
    ]) {
      if (!columnNames.has(name)) await pool.query(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
      tokenHash CHAR(64) PRIMARY KEY,
      userId VARCHAR(50) NOT NULL,
      expiresAt DATETIME NOT NULL,
      INDEX idx_auth_sessions_user (userId),
      INDEX idx_auth_sessions_expiry (expiresAt),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(20) DEFAULT '📂',
        color VARCHAR(20) DEFAULT '#6c5ce7',
        questionCount INT DEFAULT 0,
        timeLimit INT DEFAULT 30,
        maxAttempts INT DEFAULT 0,
        shareCode VARCHAR(50),
        authorId VARCHAR(50) DEFAULT 'system',
        authorName VARCHAR(100) DEFAULT 'Hệ thống',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      );
    `);

    const [quizColumns] = await pool.query('SHOW COLUMNS FROM quizzes');
    if (!quizColumns.some((column) => column.Field === 'updatedAt')) {
      await pool.query('ALTER TABLE quizzes ADD COLUMN updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(50) PRIMARY KEY,
        quizId VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        optionA TEXT NOT NULL,
        optionB TEXT NOT NULL,
        optionC TEXT NOT NULL,
        optionD TEXT NOT NULL,
        correctAnswer INT NOT NULL DEFAULT 0,
        explanation TEXT,
        FOREIGN KEY (quizId) REFERENCES quizzes(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        userName VARCHAR(100) NOT NULL,
        quizId VARCHAR(50) NOT NULL,
        categoryName VARCHAR(255) NOT NULL,
        mode VARCHAR(20) DEFAULT 'exam',
        totalQuestions INT NOT NULL,
        correctCount INT NOT NULL,
        score INT NOT NULL,
        timeSpent INT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const [quizIndexes] = await pool.query('SHOW INDEX FROM quizzes');
    if (!quizIndexes.some((index) => index.Key_name === 'uq_quizzes_share_code')) {
      const [duplicates] = await pool.query('SELECT shareCode FROM quizzes WHERE shareCode IS NOT NULL GROUP BY shareCode HAVING COUNT(*) > 1');
      for (const duplicate of duplicates) {
        const [items] = await pool.query('SELECT id FROM quizzes WHERE shareCode = ? ORDER BY createdAt, id', [duplicate.shareCode]);
        for (const item of items.slice(1)) await pool.query("UPDATE quizzes SET shareCode = CONCAT('AQ-', LEFT(REPLACE(UUID(), '-', ''), 12)) WHERE id = ?", [item.id]);
      }
      await pool.query('CREATE UNIQUE INDEX uq_quizzes_share_code ON quizzes(shareCode)');
    }
    if (!quizIndexes.some((index) => index.Key_name === 'idx_quizzes_author')) await pool.query('CREATE INDEX idx_quizzes_author ON quizzes(authorId, updatedAt)');
    const [historyIndexes] = await pool.query('SHOW INDEX FROM quiz_history');
    if (!historyIndexes.some((index) => index.Key_name === 'idx_history_user')) await pool.query('CREATE INDEX idx_history_user ON quiz_history(userId, timestamp)');

    const adminCreated = await bootstrapAdmin(pool, {
      username: process.env.BOOTSTRAP_ADMIN_USERNAME,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    });
    if (adminCreated) console.log(`✅ Đã khởi tạo quản trị viên '${process.env.BOOTSTRAP_ADMIN_USERNAME}'. Hãy xóa biến BOOTSTRAP_ADMIN_PASSWORD trên hosting.`);

    isDbConnected = true;
    console.log(`✅ Kết nối thành công MySQL Database '${DB_NAME}' tại ${DB_HOST}:${DB_PORT}`);
    return pool;
  } catch (err) {
    await pool?.end().catch(() => {});
    pool = null;
    console.warn(`⚠️ Chưa thể kết nối MySQL (${err.message}). Hệ thống vẫn hoạt động mượt mà với LocalStorage!`);
    isDbConnected = false;
    return null;
  }
}

export function getPool() {
  return pool;
}

export function isConnected() {
  return isDbConnected;
}
