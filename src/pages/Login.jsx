import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        login(username, password);
      } else {
        register(username, password, displayName);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleMode() {
    setIsLogin(!isLogin);
    setError('');
    setUsername('');
    setPassword('');
    setDisplayName('');
  }

  return (
    <div className="login-page page-center" id="login-page">
      {/* Background decorations */}
      <div className="login-bg-decor">
        <div className="decor-circle decor-1"></div>
        <div className="decor-circle decor-2"></div>
        <div className="decor-circle decor-3"></div>
      </div>

      <div className="login-container animate-scale-in">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo animate-float">⚡</div>
          <h1 className="login-title">
            Auto<span className="text-gradient">Quiz</span>
          </h1>
          <p className="login-subtitle">
            {isLogin
              ? 'Đăng nhập để bắt đầu làm bài'
              : 'Tạo tài khoản mới để tham gia'}
          </p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          {/* Tab Toggle */}
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${isLogin ? 'active' : ''}`}
              onClick={() => toggleMode()}
              id="login-tab"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`login-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => toggleMode()}
              id="register-tab"
            >
              Đăng ký
            </button>
            <div
              className="login-tab-indicator"
              style={{ transform: `translateX(${isLogin ? '0' : '100%'})` }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error animate-fade-in-down" id="login-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Fields */}
          <div className="login-fields">
            {!isLogin && (
              <div className="input-group animate-fade-in-up">
                <label htmlFor="displayName">Tên hiển thị</label>
                <input
                  type="text"
                  id="displayName"
                  className="input"
                  placeholder="Nhập tên hiển thị..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="username">Tên đăng nhập</label>
              <input
                type="text"
                id="username"
                className="input"
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Mật khẩu</label>
              <input
                type="password"
                id="password"
                className="input"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg login-submit"
            disabled={isLoading}
            id="login-submit-btn"
          >
            {isLoading ? (
              <span className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            ) : isLogin ? (
              <>🚀 Đăng nhập</>
            ) : (
              <>✨ Tạo tài khoản</>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer">
          {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
          <button className="login-switch" onClick={toggleMode}>
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
}
