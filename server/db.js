import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'autoquiz_db';

let pool = null;
let isDbConnected = false;

export async function initDatabase() {
  try {
    const rootConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
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
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    isDbConnected = true;
    console.log(`✅ Kết nối thành công MySQL Database '${DB_NAME}' tại ${DB_HOST}:${DB_PORT}`);
    return pool;
  } catch (err) {
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
