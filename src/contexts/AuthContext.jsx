import { createContext, useContext, useState, useEffect } from 'react';
import {
  apiRegister,
  apiLogin,
  apiSaveQuiz,
  apiDeleteQuiz,
  apiSaveResult,
  checkServerHealth
} from '../services/api';

const AuthContext = createContext(null);

const USERS_KEY = 'autoquiz_users';
const CURRENT_USER_KEY = 'autoquiz_current_user';
const HISTORY_KEY = 'autoquiz_history';
const CUSTOM_QUIZZES_KEY = 'autoquiz_custom_quizzes';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useMysql, setUseMysql] = useState(false);

  // Load user & check MySQL Server
  useEffect(() => {
    async function init() {
      const isConnected = await checkServerHealth();
      setUseMysql(isConnected);

      const savedUser = localStorage.getItem(CURRENT_USER_KEY);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem(CURRENT_USER_KEY);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  // Đăng ký
  async function register(username, password, displayName) {
    let userInfo = null;

    if (useMysql) {
      try {
        userInfo = await apiRegister(username, password, displayName);
      } catch (err) {
        throw new Error(err.message);
      }
    } else {
      const users = getUsers();
      if (users.find((u) => u.username === username.toLowerCase())) {
        throw new Error('Tên đăng nhập đã tồn tại!');
      }

      userInfo = {
        id: Date.now().toString(),
        username: username.toLowerCase(),
        password,
        displayName: displayName || username,
        createdAt: new Date().toISOString(),
        avatar: getRandomAvatar(),
      };

      users.push(userInfo);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      delete userInfo.password;
    }

    setUser(userInfo);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
    return userInfo;
  }

  // Đăng nhập
  async function login(username, password) {
    let userInfo = null;

    if (useMysql) {
      try {
        userInfo = await apiLogin(username, password);
      } catch (err) {
        throw new Error(err.message);
      }
    } else {
      const users = getUsers();
      const found = users.find(
        (u) => u.username === username.toLowerCase() && u.password === password
      );

      if (!found) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không đúng!');
      }

      userInfo = { ...found };
      delete userInfo.password;
    }

    setUser(userInfo);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));
    return userInfo;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
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

    if (useMysql) {
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
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_QUIZZES_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCustomQuiz(quiz) {
    const customQuizzes = getCustomQuizzes();
    const existingIndex = customQuizzes.findIndex((q) => q.id === quiz.id);

    const quizItem = {
      ...quiz,
      authorId: user ? user.id : 'guest',
      authorName: user ? user.displayName : 'Guest',
    };

    if (existingIndex >= 0) {
      customQuizzes[existingIndex] = quizItem;
    } else {
      customQuizzes.unshift(quizItem);
    }

    localStorage.setItem(CUSTOM_QUIZZES_KEY, JSON.stringify(customQuizzes));

    if (useMysql) {
      apiSaveQuiz(quizItem);
    }
  }

  function deleteCustomQuiz(quizId) {
    const customQuizzes = getCustomQuizzes();
    const filtered = customQuizzes.filter((q) => q.id !== quizId);
    localStorage.setItem(CUSTOM_QUIZZES_KEY, JSON.stringify(filtered));

    if (useMysql) {
      apiDeleteQuiz(quizId);
    }
  }

  const value = {
    user,
    loading,
    useMysql,
    register,
    login,
    logout,
    saveQuizResult,
    getHistory,
    getMyHistory,
    getLeaderboard,
    getStats,
    getCustomQuizzes,
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

function getRandomAvatar() {
  const avatars = ['🦊', '🐱', '🐼', '🦁', '🐯', '🐻', '🦄', '🐲', '🦅', '🐬', '🦋', '🌟', '🚀', '💎', '🎯', '⚡'];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

export default AuthContext;
