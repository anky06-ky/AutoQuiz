// =============================================
// AutoQuiz API Service - MySQL + LocalStorage Bridge
// Tự động kết nối với Express + MySQL Server
// Nếu Server MySQL offline -> Tự động Fallback sang LocalStorage
// =============================================

const API_BASE_URL = 'http://localhost:5000/api';

export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      return data.mysqlConnected;
    }
  } catch {
    // Backend server offline
  }
  return false;
}

// 1. Đăng ký
export async function apiRegister(username, password, displayName) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName }),
    });

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.error || 'Lỗi đăng ký MySQL');
  } catch (err) {
    throw err;
  }
}

// 2. Đăng nhập
export async function apiLogin(username, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json();
    throw new Error(err.error || 'Lỗi đăng nhập');
  } catch (err) {
    throw err;
  }
}

// 3. Lấy bộ đề thi từ MySQL
export async function apiGetQuizzes() {
  try {
    const res = await fetch(`${API_BASE_URL}/quizzes`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return null;
}

// 4. Lấy chi tiết câu hỏi từ MySQL
export async function apiGetQuizById(quizId) {
  try {
    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return null;
}

// 5. Lưu bộ đề thi mới vào MySQL
export async function apiSaveQuiz(quiz) {
  try {
    const res = await fetch(`${API_BASE_URL}/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quiz),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return null;
}

// 6. Xóa bộ đề thi khỏi MySQL
export async function apiDeleteQuiz(quizId) {
  try {
    await fetch(`${API_BASE_URL}/quizzes/${quizId}`, { method: 'DELETE' });
  } catch {
    // Fallback
  }
}

// 7. Lưu kết quả thi vào MySQL
export async function apiSaveResult(result) {
  try {
    await fetch(`${API_BASE_URL}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
  } catch {
    // Fallback
  }
}
