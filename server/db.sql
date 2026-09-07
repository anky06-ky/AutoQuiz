-- =============================================
-- AutoQuiz Database Schema - Updated for Custom Settings & Sharing
-- =============================================

CREATE DATABASE IF NOT EXISTS autoquiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE autoquiz_db;

-- 1. Bảng Người dùng (users)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  displayName VARCHAR(100) NOT NULL,
  avatar VARCHAR(10) DEFAULT '⚡',
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  passwordChangedAt DATETIME(3) NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Bộ đề thi (quizzes)
CREATE TABLE IF NOT EXISTS auth_sessions (
  tokenHash CHAR(64) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL,
  expiresAt DATETIME NOT NULL,
  INDEX idx_auth_sessions_user (userId),
  INDEX idx_auth_sessions_expiry (expiresAt),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(20) DEFAULT '📂',
  color VARCHAR(20) DEFAULT '#6c5ce7',
  questionCount INT DEFAULT 0,
  timeLimit INT DEFAULT 30, -- Thời gian làm bài (phút)
  maxAttempts INT DEFAULT 0, -- Số lượt thi tối đa (0 = không giới hạn)
  shareCode VARCHAR(50),
  authorId VARCHAR(50) DEFAULT 'system',
  authorName VARCHAR(100) DEFAULT 'Hệ thống',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX uq_quizzes_share_code (shareCode),
  INDEX idx_quizzes_author (authorId, updatedAt)
);

-- 3. Bảng Câu hỏi trắc nghiệm (questions)
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

-- 4. Bảng Lịch sử thi (quiz_history)
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
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_history_user (userId, timestamp)
);
