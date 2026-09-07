import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categories } from '../data/questions';
import { quizSignature, resolveQuestionCount } from '../utils/quizData';
import { readSettings, settingsError } from '../utils/quizSettings';
import './Dashboard.css';

export default function Dashboard() {
  const { user, getStats, customQuizzes, quizStorageError, deleteCustomQuiz, saveCustomQuiz } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => readSettings(user?.id));
  const selectedMode = settings.mode;
  const selectedCount = settings.count;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('updated');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [shareModalQuiz, setShareModalQuiz] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const stats = getStats();
  const configError = settingsError(settings);
  useEffect(() => {
    if (!settingsError(settings)) {
      try { localStorage.setItem(`autoquiz_settings_${user?.id}`, JSON.stringify(settings)); } catch { /* Preferences may remain session-only when storage is full. */ }
    }
  }, [settings, user?.id]);
  const duplicateIds = useMemo(() => {
    const seen = new Set();
    return new Set(customQuizzes.flatMap((quiz) => {
      const key = quizSignature(quiz);
      if (seen.has(key)) return [quiz.id];
      seen.add(key); return [];
    }));
  }, [customQuizzes]);
  const filteredQuizzes = useMemo(() => customQuizzes.filter((quiz) => `${quiz.title} ${quiz.description || ''}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))).sort((left, right) => {
    if (sort === 'name') return left.title.localeCompare(right.title, 'vi');
    if (sort === 'count') return right.questionCount - left.questionCount;
    return (Date.parse(right.updatedAt || right.createdAt) || 0) - (Date.parse(left.updatedAt || left.createdAt) || 0);
  }), [customQuizzes, search, sort]);
  const setSetting = (name, value) => setSettings((previous) => ({ ...previous, [name]: value }));

  function startQuiz(categoryId, availableCount) {
    if (configError) { setError(configError); return; }
    if (!availableCount) { setError('Bộ đề chưa có câu hỏi. Hãy chỉnh sửa và thêm câu hỏi trước.'); return; }
    const params = new URLSearchParams({ mode: selectedMode, count: resolveQuestionCount(selectedCount, availableCount), shuffleQuestions: settings.shuffleQuestions ? '1' : '0', shuffleAnswers: settings.shuffleAnswers ? '1' : '0' });
    if (settings.timeLimit !== '' && selectedMode === 'exam') params.set('time', settings.timeLimit);
    navigate(`/quiz/${categoryId}?${params}`);
  }

  async function handleDeleteQuiz(e, quizId) {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa bộ đề thi này?')) {
      try { await deleteCustomQuiz(quizId); setNotice('Đã xóa bộ đề.'); setError(''); } catch (err) { setError(err.message); }
    }
  }

  function handleOpenShare(e, quiz) {
    e.stopPropagation();
    setNotice('');
    setError('');
    setShareModalQuiz(quiz);
  }

  async function copyShareLink(quiz) {
    const link = `${window.location.origin}/quiz/${encodeURIComponent(quiz.shareCode || quiz.id)}?mode=exam&count=${quiz.questionCount}`;
    try { await navigator.clipboard.writeText(link); setNotice('Đã sao chép đường dẫn. Người nhận cần nhập file JSON của bộ đề trước khi sử dụng.'); } catch { setError('Không sao chép được đường dẫn. Bạn có thể xuất file JSON để chia sẻ.'); }
  }

  function exportJson(quiz) {
    const { authorId: _authorId, authorName: _authorName, ...portableQuiz } = quiz;
    const dataStr = URL.createObjectURL(new Blob([JSON.stringify({ ...portableQuiz, shareCode: quiz.shareCode || quiz.id }, null, 2)], { type: 'application/json' }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${quiz.title || 'quiz'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(dataStr), 1000);
  }

  // Import bộ đề từ JSON file hoặc mã
  async function handleImportFile(e) {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { setError('File JSON tối đa 10 MB.'); input.value = ''; return; }
    try {
        const quizData = JSON.parse(await file.text());
        if (!Array.isArray(quizData?.questions)) {
          throw new Error('File JSON thiếu danh sách câu hỏi hợp lệ.');
        }

        const newQuiz = {
          ...quizData,
          id: undefined,
          title: quizData.title || 'Bộ đề thi chia sẻ',
          createdAt: new Date().toISOString(),
        };

        const result = await saveCustomQuiz(newQuiz);
        setNotice(result.duplicate ? `Bộ đề “${result.quiz.title}” đã có trong thư viện. Không tạo thêm bản trùng.` : `Đã nhập “${result.quiz.title}” · ${result.quiz.questionCount} câu hỏi.`);
        setError('');
        setShowImportModal(false);
    } catch (err) {
      setError(err instanceof SyntaxError ? 'File JSON bị lỗi định dạng.' : err.message);
    }
    input.value = '';
  }

  return (
    <div className="page" id="dashboard-page">
      <div className="container">
        {/* Welcome Section */}
        <div className="dashboard-welcome animate-fade-in-up">
          <div className="welcome-header">
            <div className="welcome-content">
              <span className="welcome-avatar" role="img" aria-label="Linh vật gấu trúc">🐼</span>
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
                  onClick={() => setSetting('mode', 'practice')}
                  aria-pressed={selectedMode === 'practice'}
                  id="mode-practice"
                >
                  <span>📚</span> Luyện tập
                </button>
                <button
                  className={`mode-btn ${selectedMode === 'exam' ? 'active' : ''}`}
                  onClick={() => setSetting('mode', 'exam')}
                  aria-pressed={selectedMode === 'exam'}
                  id="mode-exam"
                >
                  <span>🎯</span> Thi thật
                </button>
              </div>
              <p className="setting-hint">
                {selectedMode === 'practice'
                  ? '💡 Xem đáp án đúng ngay sau mỗi câu'
                  : '⏱️ Làm bài có giới hạn thời gian, xem đáp án sau khi nộp'}
              </p>
            </div>

            <div className="setting-group">
              <label className="setting-label">Số câu hỏi</label>
              <div className="count-toggle">
                {[5, 10, 20, 50, 100, 500].map((count) => (
                  <button
                    key={count}
                    className={`count-btn ${Number(selectedCount) === count ? 'active' : ''}`}
                    onClick={() => setSetting('count', count)}
                    aria-pressed={Number(selectedCount) === count}
                    id={`count-${count}`}
                  >
                    {count} câu
                  </button>
                ))}
                <button className={`count-btn ${selectedCount === 'all' ? 'active' : ''}`} aria-pressed={selectedCount === 'all'} onClick={() => setSetting('count', 'all')}>Tất cả</button>
              </div>
              <label className="custom-count-label">Số câu tùy chọn<input className="input" type="number" min="1" max="5000" placeholder="Ví dụ: 35" value={selectedCount === 'all' ? '' : selectedCount} onChange={(event) => setSetting('count', event.target.value)} /></label>
              <p className="setting-hint">Áp dụng cho mọi bộ đề. Nếu đề có ít câu hơn, lấy toàn bộ câu hiện có.</p>
            </div>
          </div>
          <div className="settings-advanced">
            <label className="setting-duration">Thời gian thi (phút)<input className="input" type="number" min="1" max="600" placeholder="Theo bộ đề" disabled={selectedMode === 'practice'} value={settings.timeLimit} onChange={(event) => setSetting('timeLimit', event.target.value)} /><span className="setting-hint">Để trống: theo bộ đề, hoặc 1 phút/câu với chủ đề mặc định.</span></label>
            <div className="setting-checks"><label><input type="checkbox" checked={settings.shuffleQuestions} onChange={(event) => setSetting('shuffleQuestions', event.target.checked)} /> Xáo trộn câu hỏi</label><label><input type="checkbox" checked={settings.shuffleAnswers} onChange={(event) => setSetting('shuffleAnswers', event.target.checked)} /> Xáo trộn đáp án</label></div>
          </div>
          {configError && <p className="dashboard-feedback is-error" role="alert">{configError}</p>}
        </div>
        {(error || quizStorageError) && <p className="dashboard-feedback is-error" role="alert">{error || quizStorageError}</p>}
        {notice && <p className="dashboard-feedback" role="status">{notice}</p>}

        {/* Custom Quizzes Section */}
          <div className="section-block animate-fade-in-up stagger-2">
            <div className="section-header">
              <h2 className="heading-3">📁 Bộ Đề Thi Của Bạn ({customQuizzes.length})</h2>
              <p className="text-secondary">{customQuizzes.reduce((sum, quiz) => sum + quiz.questionCount, 0)} câu hỏi · Chỉnh sửa bộ đề hoặc bắt đầu với cài đặt bên trên.</p>
            </div>
            <div className="library-toolbar"><label className="library-search"><span className="sr-only">Tìm bộ đề</span><input className="input" type="search" placeholder="Tìm theo tên hoặc mô tả bộ đề…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="library-sort">Sắp xếp<select className="input" value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Cập nhật gần nhất</option><option value="name">Tên A → Z</option><option value="count">Nhiều câu nhất</option></select></label></div>
            {!filteredQuizzes.length && <div className="glass-card library-empty"><p>{customQuizzes.length ? 'Không tìm thấy bộ đề phù hợp.' : 'Chưa có bộ đề. Tạo đề từ tài liệu hoặc nhập file JSON để bắt đầu.'}</p><button className="btn btn-secondary" onClick={() => customQuizzes.length ? setSearch('') : navigate('/create-quiz')}>{customQuizzes.length ? 'Xóa tìm kiếm' : '+ Tạo bộ đề'}</button></div>}
            <div className="categories-grid">
              {filteredQuizzes.map((quiz) => (
                <article
                  key={quiz.id}
                  className="category-card glass-card custom-quiz-card"
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
                        aria-label={`Chia sẻ ${quiz.title}`}
                      >
                        🔗
                      </button>
                      <button
                        className="btn-action-icon"
                        onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                        title="Xóa bộ đề"
                        aria-label={`Xóa ${quiz.title}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <h3 className="cat-name">{quiz.title}</h3>
                  <p className="cat-desc">{quiz.description}</p>
                  {duplicateIds.has(quiz.id) && <span className="badge badge-warning">Có bản trùng nội dung</span>}
                  <div className="custom-card-tags">
                    <span className="badge badge-info">⏱️ {quiz.timeLimit || 30} phút</span>
                    <span className="badge badge-warning">
                      {quiz.maxAttempts ? `🔄 Hạn ${quiz.maxAttempts} lần` : '🔄 Tự do'}
                    </span>
                  </div>
                  <div className="cat-meta" style={{ marginTop: '1rem' }}>
                    <span className="cat-count">{quiz.questionCount} câu hỏi</span>
                    <span className="cat-count">Sẽ làm {resolveQuestionCount(selectedCount, quiz.questionCount)} câu</span>
                  </div>
                  <div className="quiz-card-buttons"><button className="btn btn-secondary" onClick={() => navigate(`/edit-quiz/${quiz.id}`)}>Chỉnh sửa</button><button className="btn btn-primary" disabled={Boolean(configError) || !quiz.questionCount} onClick={() => startQuiz(quiz.id, quiz.questionCount)}>Bắt đầu →</button></div>
                </article>
              ))}
            </div>
          </div>

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

            <p className="text-secondary" style={{ marginBottom: '1rem' }}>Xuất file JSON và gửi cho bạn bè để nhập bộ đề. Bộ đề đang được lưu trong trình duyệt này; đường dẫn riêng không mang theo câu hỏi.</p>
            {notice && <p className="dashboard-feedback" role="status">{notice}</p>}
            {error && <p className="dashboard-feedback is-error" role="alert">{error}</p>}

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
            {error && <p className="dashboard-feedback is-error" role="alert">{error}</p>}
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
