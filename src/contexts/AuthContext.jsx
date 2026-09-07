import { createContext, useContext, useState, useEffect, useSyncExternalStore } from 'react';
import { quizStore } from '../services/quizStore';
import { localAccounts, USERS_KEY } from '../services/localAccounts';
import { accountRequest, clearAccessToken, hasAccessToken, hasConfiguredServer } from '../services/api';
import {
  apiRegister,
  apiLogin,
  apiSaveQuiz,
  apiDeleteQuiz,
  apiSaveResult,
  checkServerHealth
} from '../services/api';

const AuthContext = createContext(null);

const CURRENT_USER_KEY = 'autoquiz_current_user';
const HISTORY_KEY = 'autoquiz_history';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useMysql, setUseMysql] = useState(false);
  const [authError, setAuthError] = useState('');
  const customQuizzes = useSyncExternalStore(quizStore.subscribe, quizStore.getSnapshot);

  function persistUser(account) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(account));
    setUser(account);
    setAuthError('');
    return account;
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const connected = await checkServerHealth();
        if (cancelled) return;
        setUseMysql(connected);
        const saved = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
        if (hasAccessToken()) {
          const account = await accountRequest('/auth/me');
          if (!cancelled) persistUser({ ...account, authSource: 'server' });
        } else if (saved && saved.authSource !== 'server') {
          const account = localAccounts.get(saved.id);
          if (account.passwordChangedAt !== (saved.passwordChangedAt || null)) throw new Error('Mật khẩu đã thay đổi. Hãy đăng nhập lại.');
          if (!cancelled) persistUser(account);
        }
      } catch (err) {
        if (!cancelled) { setUser(null); setAuthError(err.message); }
      } finally { if (!cancelled) setLoading(false); }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    function expireServerSession() {
      if (user.authSource !== 'server') return;
      setUser(null);
      localStorage.removeItem(CURRENT_USER_KEY);
      setAuthError('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    }
    function refreshLocal(event) {
      if (user.authSource === 'server' || (event.key !== USERS_KEY && event.key !== CURRENT_USER_KEY && event.key !== null)) return;
      try {
        const saved = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
        if (!saved || saved.id !== user.id) { setUser(null); return; }
        const account = localAccounts.get(user.id);
        if (account.passwordChangedAt !== user.passwordChangedAt) { setUser(null); return; }
        setUser(account);
      } catch { setUser(null); }
    }
    window.addEventListener('storage', refreshLocal);
    window.addEventListener('autoquiz-session-expired', expireServerSession);
    return () => {
      window.removeEventListener('storage', refreshLocal);
      window.removeEventListener('autoquiz-session-expired', expireServerSession);
    };
  }, [user]);

  async function register(username, password, displayName, source = useMysql ? 'server' : 'local') {
    const account = source === 'server' ? await apiRegister(username, password, displayName) : await localAccounts.register(username, password, displayName);
    if (account.authSource === 'local') clearAccessToken();
    return persistUser(account);
  }

  async function login(username, password, source = useMysql ? 'server' : 'local') {
    const account = source === 'server' ? await apiLogin(username, password) : await localAccounts.login(username, password);
    if (account.authSource === 'local') clearAccessToken();
    return persistUser(account);
  }

  function logout() {
    if (user?.authSource === 'server') accountRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    clearAccessToken();
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }

  async function updateProfile(profile) {
    if (!user) throw new Error('Hãy đăng nhập lại.');
    const updated = user.authSource === 'server'
      ? { ...await accountRequest('/account/me', { method: 'PUT', body: JSON.stringify(profile) }), authSource: 'server' }
      : localAccounts.updateProfile(user.id, profile);
    return persistUser(updated);
  }

  async function changePassword(currentPassword, newPassword) {
    if (!user) throw new Error('Hãy đăng nhập lại.');
    if (user.authSource === 'server') await accountRequest('/account/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
    else await localAccounts.changePassword(user.id, currentPassword, newPassword);
    clearAccessToken();
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }

  // Lưu kết quả thi
  function saveQuizResult(result) {
    const history = getHistory();
    const entry = {
      ...result,
      userId: user ? user.id : 'guest',
      userName: user ? user.displayName : 'Guest',
      timestamp: new Date().toISOString(),
    };
    history.push(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    if (user?.authSource === 'server') {
      apiSaveResult(entry);
    }
    return entry;
  }

  function getHistory(userId = null) {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
      if (userId) {
        return history.filter((h) => h.userId === userId);
      }
      return history;
    } catch {
      return [];
    }
  }

  function getMyHistory() {
    if (!user) return [];
    return getHistory(user.id);
  }

  function getLeaderboard(categoryId = null) {
    const history = getHistory();
    const filtered = categoryId
      ? history.filter((h) => h.categoryId === categoryId)
      : history;

    const userBest = {};
    filtered.forEach((entry) => {
      const key = categoryId
        ? `${entry.userId}-${entry.categoryId}`
        : entry.userId;
      if (!userBest[key] || entry.score > userBest[key].score) {
        userBest[key] = entry;
      }
    });

    return Object.values(userBest)
      .sort((a, b) => b.score - a.score || a.timeSpent - b.timeSpent)
      .slice(0, 20);
  }

  function getStats() {
    const myHistory = getMyHistory();
    if (myHistory.length === 0) {
      return { totalQuizzes: 0, avgScore: 0, bestScore: 0, totalQuestions: 0 };
    }

    const totalQuizzes = myHistory.length;
    const avgScore = Math.round(
      myHistory.reduce((sum, h) => sum + h.score, 0) / totalQuizzes
    );
    const bestScore = Math.max(...myHistory.map((h) => h.score));
    const totalQuestions = myHistory.reduce(
      (sum, h) => sum + h.totalQuestions,
      0
    );

    return { totalQuizzes, avgScore, bestScore, totalQuestions };
  }

  // Quản lý bộ đề thi tự tạo
  function getCustomQuizzes() {
    return customQuizzes;
  }

  function saveCustomQuiz(quiz, options) {
    const result = quizStore.save(quiz, user, options);
    if (user?.authSource === 'server' && !result.duplicate) apiSaveQuiz(result.quiz);
    return result;
  }

  function deleteCustomQuiz(quizId) {
    quizStore.remove(quizId);

    if (user?.authSource === 'server') {
      apiDeleteQuiz(quizId);
    }
  }

  const value = {
    user,
    loading,
    useMysql,
    serverAvailable: useMysql || hasConfiguredServer,
    authError,
    updateProfile,
    changePassword,
    register,
    login,
    logout,
    saveQuizResult,
    getHistory,
    getMyHistory,
    getLeaderboard,
    getStats,
    getCustomQuizzes,
    customQuizzes,
    quizStorageError: quizStore.getError(),
    saveCustomQuiz,
    deleteCustomQuiz,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
