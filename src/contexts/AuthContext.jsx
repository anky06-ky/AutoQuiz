import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Keys cho localStorage
const USERS_KEY = 'autoquiz_users';
const CURRENT_USER_KEY = 'autoquiz_current_user';
const HISTORY_KEY = 'autoquiz_history';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user khi mount
  useEffect(() => {
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Lấy danh sách users
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  // Đăng ký
  function register(username, password, displayName) {
    const users = getUsers();

    // Kiểm tra username đã tồn tại
    if (users.find((u) => u.username === username.toLowerCase())) {
      throw new Error('Tên đăng nhập đã tồn tại!');
    }

    if (username.length < 3) {
      throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự!');
    }

    if (password.length < 4) {
      throw new Error('Mật khẩu phải có ít nhất 4 ký tự!');
    }

    const newUser = {
      id: Date.now().toString(),
      username: username.toLowerCase(),
      password, // Trong thực tế nên hash password
      displayName: displayName || username,
      createdAt: new Date().toISOString(),
      avatar: getRandomAvatar(),
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // Tự động đăng nhập
    const userInfo = { ...newUser };
    delete userInfo.password;
    setUser(userInfo);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));

    return userInfo;
  }

  // Đăng nhập
  function login(username, password) {
    const users = getUsers();
    const found = users.find(
      (u) => u.username === username.toLowerCase() && u.password === password
    );

    if (!found) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không đúng!');
    }

    const userInfo = { ...found };
    delete userInfo.password;
    setUser(userInfo);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userInfo));

    return userInfo;
  }

  // Đăng xuất
  function logout() {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  // Lưu kết quả thi
  function saveQuizResult(result) {
    const history = getHistory();
    const entry = {
      ...result,
      userId: user.id,
      userName: user.displayName,
      timestamp: new Date().toISOString(),
    };
    history.push(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return entry;
  }

  // Lấy lịch sử thi
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

  // Lấy lịch sử của user hiện tại
  function getMyHistory() {
    if (!user) return [];
    return getHistory(user.id);
  }

  // Lấy leaderboard
  function getLeaderboard(categoryId = null) {
    const history = getHistory();
    const filtered = categoryId
      ? history.filter((h) => h.categoryId === categoryId)
      : history;

    // Nhóm theo user, lấy điểm cao nhất
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

  // Thống kê nhanh
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

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    saveQuizResult,
    getHistory,
    getMyHistory,
    getLeaderboard,
    getStats,
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

// Random avatar emoji
function getRandomAvatar() {
  const avatars = ['🦊', '🐱', '🐼', '🦁', '🐯', '🐻', '🦄', '🐲', '🦅', '🐬', '🦋', '🌟', '🚀', '💎', '🎯', '⚡'];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

export default AuthContext;
