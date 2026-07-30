import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categories } from '../data/questions';
import './Dashboard.css';

export default function Dashboard() {
  const { user, getStats } = useAuth();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState('exam');
  const [selectedCount, setSelectedCount] = useState(10);
  const stats = getStats();

  function startQuiz(categoryId) {
    navigate(`/quiz/${categoryId}?mode=${selectedMode}&count=${selectedCount}`);
  }

  return (
    <div className="page" id="dashboard-page">
      <div className="container">
        {/* Welcome Section */}
        <div className="dashboard-welcome animate-fade-in-up">
          <div className="welcome-content">
            <span className="welcome-avatar">{user?.avatar}</span>
            <div>
              <h1 className="welcome-title">
                Xin chào, <span className="text-gradient">{user?.displayName}</span>! 👋
              </h1>
              <p className="welcome-subtitle">Hãy chọn chủ đề và bắt đầu làm bài</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">📝</span>
              <div className="stat-info">
                <span className="stat-value">{stats.totalQuizzes}</span>
                <span className="stat-label">Bài đã thi</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <div className="stat-info">
                <span className="stat-value">{stats.bestScore}%</span>
                <span className="stat-label">Điểm cao nhất</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <div className="stat-info">
                <span className="stat-value">{stats.avgScore}%</span>
                <span className="stat-label">Trung bình</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">❓</span>
              <div className="stat-info">
                <span className="stat-value">{stats.totalQuestions}</span>
                <span className="stat-label">Câu đã trả lời</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Settings */}
        <div className="quiz-settings glass-card animate-fade-in-up stagger-1">
          <h3 className="settings-title">⚙️ Cài đặt</h3>
          <div className="settings-row">
            {/* Mode Selection */}
            <div className="setting-group">
              <label className="setting-label">Chế độ</label>
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${selectedMode === 'practice' ? 'active' : ''}`}
                  onClick={() => setSelectedMode('practice')}
                  id="mode-practice"
                >
                  <span>📚</span> Luyện tập
                </button>
                <button
                  className={`mode-btn ${selectedMode === 'exam' ? 'active' : ''}`}
                  onClick={() => setSelectedMode('exam')}
                  id="mode-exam"
                >
                  <span>🎯</span> Thi thật
                </button>
              </div>
              <p className="setting-hint">
                {selectedMode === 'practice'
                  ? '💡 Xem đáp án đúng ngay sau mỗi câu'
                  : '⏱️ Có giới hạn thời gian, nộp bài mới chấm'}
              </p>
            </div>

            {/* Question Count */}
            <div className="setting-group">
              <label className="setting-label">Số câu hỏi</label>
              <div className="count-toggle">
                {[5, 10].map((count) => (
                  <button
                    key={count}
                    className={`count-btn ${selectedCount === count ? 'active' : ''}`}
                    onClick={() => setSelectedCount(count)}
                    id={`count-${count}`}
                  >
                    {count} câu
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="section-header animate-fade-in-up stagger-2">
          <h2 className="heading-3">📚 Chọn chủ đề</h2>
          <p className="text-secondary">Chọn một chủ đề để bắt đầu làm bài trắc nghiệm</p>
        </div>

        <div className="categories-grid">
          {categories.map((cat, index) => (
            <button
              key={cat.id}
              className={`category-card glass-card animate-fade-in-up stagger-${index + 1}`}
              onClick={() => startQuiz(cat.id)}
              id={`category-${cat.id}`}
              style={{ '--cat-color': cat.color }}
            >
              <div className="cat-glow" />
              <div className="cat-icon">{cat.icon}</div>
              <h3 className="cat-name">{cat.name}</h3>
              <p className="cat-desc">{cat.description}</p>
              <div className="cat-meta">
                <span className="cat-count">{cat.questionCount} câu hỏi</span>
                <span className="cat-arrow">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
