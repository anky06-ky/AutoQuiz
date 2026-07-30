import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categories } from '../data/questions';
import './Dashboard.css';

export default function Dashboard() {
  const { user, getStats, getCustomQuizzes, deleteCustomQuiz, saveCustomQuiz } = useAuth();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState('exam');
  const [selectedCount, setSelectedCount] = useState(10);
  const [shareModalQuiz, setShareModalQuiz] = useState(null);
  const [importCode, setImportCode] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
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

  function handleOpenShare(e, quiz) {
    e.stopPropagation();
    setShareModalQuiz(quiz);
  }

  function copyShareLink(quiz) {
    const link = `${window.location.origin}/quiz/${quiz.id}?mode=exam&count=${quiz.questionCount}`;
    navigator.clipboard.writeText(link);
    alert(`📋 Đã sao chép đường dẫn chia sẻ:\n${link}`);
  }

  function exportJson(quiz) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(quiz, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${quiz.title || 'quiz'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // Import bộ đề từ JSON file hoặc mã
  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const quizData = JSON.parse(event.target.result);
        if (!quizData.questions || !Array.isArray(quizData.questions)) {
          alert('⚠️ File JSON không hợp lệ hoặc thiếu danh sách câu hỏi!');
          return;
        }

        const newQuiz = {
          ...quizData,
          id: `custom-${Date.now()}`,
          title: quizData.title || 'Bộ đề thi chia sẻ',
          createdAt: new Date().toISOString(),
        };

        saveCustomQuiz(newQuiz);
        alert(`🎉 Đã nhập thành công bộ đề: "${newQuiz.title}" (${newQuiz.questions.length} câu)`);
        setShowImportModal(false);
      } catch {
        alert('⚠️ File JSON bị lỗi định dạng!');
      }
    };
    reader.readAsText(file);
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
                <p className="welcome-subtitle">Chọn bộ đề thi sẵn có hoặc tự tạo đề mới & chia sẻ cho mọi người</p>
              </div>
            </div>

            <div className="welcome-actions">
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => setShowImportModal(true)}
              >
                📥 Nhập Đề Thi Chia Sẻ
              </button>
              <button
                className="btn btn-primary btn-lg create-quiz-btn animate-float"
                onClick={() => navigate('/create-quiz')}
                id="create-quiz-dashboard-btn"
              >
                ✨ Tạo Đề Thi Từ Tài Liệu
              </button>
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
                {[5, 10, 20, 50, 100, 500].map((count) => (
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
              <h2 className="heading-3">📁 Bộ Đề Thi Của Bạn ({customQuizzes.length})</h2>
              <p className="text-secondary">Các bộ đề tự tạo từ file .docx hoặc dán bài học (Hỗ trợ chia sẻ, tùy chỉnh thời gian & lượt thi)</p>
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
                    <div className="custom-card-actions">
                      <button
                        className="btn-action-icon"
                        onClick={(e) => handleOpenShare(e, quiz)}
                        title="Chia sẻ bộ đề thi"
                      >
                        🔗
                      </button>
                      <button
                        className="btn-action-icon"
                        onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                        title="Xóa bộ đề"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <h3 className="cat-name">{quiz.title}</h3>
                  <p className="cat-desc">{quiz.description}</p>
                  <div className="custom-card-tags">
                    <span className="badge badge-info">⏱️ {quiz.timeLimit || 30} phút</span>
                    <span className="badge badge-warning">
                      {quiz.maxAttempts ? `🔄 Hạn ${quiz.maxAttempts} lần` : '🔄 Tự do'}
                    </span>
                  </div>
                  <div className="cat-meta" style={{ marginTop: '1rem' }}>
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
          <h2 className="heading-3">📚 Chủ Đề Kiến Thức Mặc Định</h2>
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

      {/* Share Modal */}
      {shareModalQuiz && (
        <div className="modal-overlay" onClick={() => setShareModalQuiz(null)}>
          <div className="modal-card glass-card animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-3">🔗 Chia Sẻ Bộ Đề Thi</h3>
            <p className="text-secondary" style={{ margin: '0.5rem 0 1.5rem' }}>
              Bộ đề: <strong>{shareModalQuiz.title}</strong> ({shareModalQuiz.questionCount} câu)
            </p>

            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label>Mã bộ đề (Share Code)</label>
              <input
                type="text"
                className="input"
                readOnly
                value={shareModalQuiz.shareCode || shareModalQuiz.id}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-primary" onClick={() => copyShareLink(shareModalQuiz)}>
                📋 Sao chép Link Chia Sẻ
              </button>
              <button className="btn btn-secondary" onClick={() => exportJson(shareModalQuiz)}>
                📥 Xuất File .JSON
              </button>
            </div>

            <button className="btn btn-ghost full-width" style={{ marginTop: '1rem' }} onClick={() => setShareModalQuiz(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-card glass-card animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-3">📥 Nhập Đề Thi Chia Sẻ</h3>
            <p className="text-secondary" style={{ margin: '0.5rem 0 1.5rem' }}>
              Tải lên file đề thi dạng .JSON được chia sẻ từ bạn bè
            </p>

            <div className="file-upload-box" style={{ marginBottom: '1rem' }}>
              <input
                type="file"
                id="import-file"
                accept=".json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
              <label htmlFor="import-file" className="file-dropzone" style={{ padding: '1.5rem' }}>
                <span className="dropzone-icon">📥</span>
                <span className="dropzone-text">Chọn File .JSON để nhập đề thi</span>
              </label>
            </div>

            <button className="btn btn-ghost full-width" onClick={() => setShowImportModal(false)}>
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
