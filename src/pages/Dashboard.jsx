import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categories } from '../data/questions';
import './Dashboard.css';

export default function Dashboard() {
  const { user, getStats, getCustomQuizzes, deleteCustomQuiz } = useAuth();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState('exam');
  const [selectedCount, setSelectedCount] = useState(10);
  const stats = getStats();
  const customQuizzes = getCustomQuizzes();

  function startQuiz(categoryId, availableCount) {
    const finalCount = availableCount ? Math.min(selectedCount, availableCount) : selectedCount;
    navigate(`/quiz/${categoryId}?mode=${selectedMode}&count=${finalCount}`);
  }

  function handleDeleteQuiz(e, quizId) {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa bộ đề thi này?')) {
      deleteCustomQuiz(quizId);
    }
  }

  return (
    <div className="page" id="dashboard-page">
      <div className="container">
        {/* Welcome Section */}
        <div className="dashboard-welcome animate-fade-in-up">
          <div className="welcome-header">
            <div className="welcome-content">
              <span className="welcome-avatar">{user?.avatar}</span>
              <div>
                <h1 className="welcome-title">
                  Xin chào, <span className="text-gradient">{user?.displayName}</span>! 👋
                </h1>
                <p className="welcome-subtitle">Hãy chọn bộ đề sẵn có hoặc tạo bộ đề mới từ tài liệu của bạn</p>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg create-quiz-btn animate-float"
              onClick={() => navigate('/create-quiz')}
              id="create-quiz-dashboard-btn"
            >
              ✨ Tạo Đề Thi Từ Tài Liệu
            </button>
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
              <span className="stat-icon">📂</span>
              <div className="stat-info">
                <span className="stat-value">{customQuizzes.length}</span>
                <span className="stat-label">Đề tự tạo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Settings */}
        <div className="quiz-settings glass-card animate-fade-in-up stagger-1">
          <h3 className="settings-title">⚙️ Cài đặt bài thi</h3>
          <div className="settings-row">
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
                  : '⏱️ Có giới hạn thời gian, tự động xáo trộn đáp án khi làm bài'}
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">Số câu hỏi</label>
              <div className="count-toggle">
                {[5, 10, 20, 50, 100].map((count) => (
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

        {/* Custom Quizzes Section */}
        {customQuizzes.length > 0 && (
          <div className="section-block animate-fade-in-up stagger-2">
            <div className="section-header">
              <h2 className="heading-3">📁 Bộ Đề Thi Của Bạn</h2>
              <p className="text-secondary">Các bộ đề được tự động bóc tách từ file .docx, .txt hoặc dán văn bản bài học</p>
            </div>

            <div className="categories-grid">
              {customQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="category-card glass-card custom-quiz-card"
                  onClick={() => startQuiz(quiz.id, quiz.questionCount)}
                  style={{ '--cat-color': quiz.color || '#6c5ce7' }}
                >
                  <div className="cat-glow" />
                  <div className="custom-card-header">
                    <span className="cat-icon">{quiz.icon || '📂'}</span>
                    <button
                      className="btn-delete-quiz"
                      onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                      title="Xóa bộ đề thi này"
                    >
                      🗑️
                    </button>
                  </div>
                  <h3 className="cat-name">{quiz.title}</h3>
                  <p className="cat-desc">{quiz.description}</p>
                  <div className="cat-meta">
                    <span className="cat-count">{quiz.questionCount} câu hỏi</span>
                    <span className="cat-arrow">Bắt đầu →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories Grid - Default */}
        <div className="section-header animate-fade-in-up stagger-3" style={{ marginTop: '2.5rem' }}>
          <h2 className="heading-3">📚 Chủ Đề Kiến Thức Tổng Hợp</h2>
          <p className="text-secondary">Chọn một chủ đề mặc định để rèn luyện kiến thức</p>
        </div>

        <div className="categories-grid">
          {categories.map((cat, index) => (
            <button
              key={cat.id}
              className={`category-card glass-card animate-fade-in-up stagger-${index + 1}`}
              onClick={() => startQuiz(cat.id, cat.questionCount)}
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
