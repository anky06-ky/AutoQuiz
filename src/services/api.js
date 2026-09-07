// =============================================
// AutoQuiz API Service - MySQL + LocalStorage Bridge
// Tự động kết nối với Express + MySQL Server
// Nếu Server MySQL offline -> Tự động Fallback sang LocalStorage
// =============================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
export const hasConfiguredServer = Boolean(import.meta.env.VITE_API_BASE_URL || !import.meta.env.DEV);
const TOKEN_KEY = 'autoquiz_access_token';
const REQUEST_TIMEOUT = import.meta.env.DEV ? 15000 : 65000;

export function clearAccessToken() { sessionStorage.removeItem(TOKEN_KEY); }
export function hasAccessToken() { return Boolean(sessionStorage.getItem(TOKEN_KEY)); }

export async function accountRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error('Chưa cấu hình máy chủ quản lý tài khoản.');
  const token = sessionStorage.getItem(TOKEN_KEY);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
  } catch { throw new Error('Không kết nối được máy chủ. Hãy thử lại, dữ liệu chưa được thay đổi trên trình duyệt.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token && !['/auth/login', '/auth/register'].includes(path)) {
      clearAccessToken();
      window.dispatchEvent(new Event('autoquiz-session-expired'));
    }
    const error = new Error(data.error || 'Không thực hiện được thao tác.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function authenticate(path, body) {
  const data = await accountRequest(path, { method: 'POST', body: JSON.stringify(body) });
  if (!data.token || !data.user) throw new Error('Máy chủ cần được cập nhật để hỗ trợ quản lý tài khoản.');
  sessionStorage.setItem(TOKEN_KEY, data.token);
  return { ...data.user, authSource: 'server' };
}

export async function checkServerHealth() {
  if (!API_BASE_URL) return false;
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
  return authenticate('/auth/register', { username, password, displayName });
}

// 2. Đăng nhập
export async function apiLogin(username, password) {
  return authenticate('/auth/login', { username, password });
}

// 3. Lấy bộ đề thi từ MySQL
export async function apiGetQuizzes() {
  return accountRequest('/quizzes');
}

// 4. Lấy chi tiết câu hỏi từ MySQL
export async function apiGetQuizById(quizId) {
  return accountRequest(`/quizzes/${encodeURIComponent(quizId)}`);
}

// 5. Lưu bộ đề thi mới vào MySQL
export async function apiSaveQuiz(quiz) {
  return accountRequest('/quizzes', {
    method: 'POST',
    body: JSON.stringify(quiz),
  });
}

// 6. Xóa bộ đề thi khỏi MySQL
export async function apiDeleteQuiz(quizId) {
  return accountRequest(`/quizzes/${encodeURIComponent(quizId)}`, { method: 'DELETE' });
}

// 7. Lưu kết quả thi vào MySQL
export async function apiSaveResult(result) {
  return accountRequest('/history', {
    method: 'POST',
    body: JSON.stringify(result),
  });
}

export async function apiGetMyHistory(userId) {
  return accountRequest(`/history/user/${encodeURIComponent(userId)}`);
}

export async function apiGetLeaderboard() {
  return accountRequest('/leaderboard');
}
