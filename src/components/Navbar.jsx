import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Trang chủ', icon: '🏠' },
    { path: '/create-quiz', label: 'Tạo đề từ file', icon: '✨' },
    { path: '/history', label: 'Lịch sử', icon: '📊' },
    { path: '/leaderboard', label: 'Xếp hạng', icon: '🏆' },
  ];

  function handleLogout() {
    logout();
    navigate('/login');
    setMenuOpen(false);
  }

  return (
    <nav className="navbar glass" id="main-navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" id="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">
            Auto<span className="text-gradient">Quiz</span>
          </span>
        </Link>

        {/* Nav Links - Desktop */}
        <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
              id={`nav-link-${link.path.replace('/', '') || 'home'}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}

          {/* Mobile user info */}
          {user && (
            <div className="navbar-user-mobile">
              <div className="user-info-mobile">
                <span className="user-avatar">{user.avatar}</span>
                <span>{user.displayName}</span>
              </div>
              <button className="btn btn-ghost" onClick={handleLogout} id="mobile-logout-btn">
                🚪 Đăng xuất
              </button>
            </div>
          )}
        </div>

        {/* User Section - Desktop */}
        {user && (
          <div className="navbar-user" id="navbar-user-section">
            <div className="user-info">
              <span className="user-avatar">{user.avatar}</span>
              <span className="user-name">{user.displayName}</span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              id="logout-btn"
              title="Đăng xuất"
            >
              🚪
            </button>
          </div>
        )}

        {/* Hamburger - Mobile */}
        <button
          className={`hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          id="hamburger-btn"
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div className="navbar-overlay" onClick={() => setMenuOpen(false)} />
      )}
    </nav>
  );
}
