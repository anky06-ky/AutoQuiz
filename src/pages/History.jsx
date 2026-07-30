import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { categories } from '../data/questions';
import './History.css';

export default function History() {
  const { getMyHistory } = useAuth();
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMode, setFilterMode] = useState('all');

  const history = useMemo(() => getMyHistory(), [getMyHistory]);

  const filtered = useMemo(() => {
    let result = [...history];

    if (filterCategory !== 'all') {
      result = result.filter((h) => h.categoryId === filterCategory);
    }

    if (filterMode !== 'all') {
      result = result.filter((h) => h.mode === filterMode);
    }

    // Sắp xếp mới nhất trước
    result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return result;
  }, [history, filterCategory, filterMode]);

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}p ${s}s` : `${s}s`;
  }

  return (
    <div className="page" id="history-page">
      <div className="container">
        {/* Header */}
        <div className="history-header animate-fade-in-up">
          <h1 className="heading-2">
            📊 Lịch sử <span className="text-gradient">thi</span>
          </h1>
          <p className="text-secondary">Xem lại kết quả các lần thi trước</p>
        </div>

        {/* Filters */}
        <div className="history-filters glass-card animate-fade-in-up stagger-1">
          <div className="filter-group">
            <label className="filter-label">Chủ đề</label>
            <div className="filter-options">
              <button
                className={`filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
                onClick={() => setFilterCategory('all')}
              >
                Tất cả
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`filter-btn ${filterCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setFilterCategory(cat.id)}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Chế độ</label>
            <div className="filter-options">
              <button
                className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                Tất cả
              </button>
              <button
                className={`filter-btn ${filterMode === 'practice' ? 'active' : ''}`}
                onClick={() => setFilterMode('practice')}
              >
                📚 Luyện tập
              </button>
              <button
                className={`filter-btn ${filterMode === 'exam' ? 'active' : ''}`}
                onClick={() => setFilterMode('exam')}
              >
                🎯 Thi thật
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="history-empty glass-card animate-fade-in-up stagger-2">
            <span className="empty-icon">📭</span>
            <h3>Chưa có lịch sử thi</h3>
            <p className="text-secondary">
              {history.length === 0
                ? 'Hãy làm bài thi đầu tiên để xem kết quả tại đây.'
                : 'Không tìm thấy kết quả với bộ lọc hiện tại.'}
            </p>
          </div>
        ) : (
          <div className="history-list animate-fade-in-up stagger-2">
            <div className="history-count">
              Tìm thấy <strong>{filtered.length}</strong> kết quả
            </div>

            {filtered.map((entry, idx) => {
              const cat = categories.find((c) => c.id === entry.categoryId);
              const scoreColor =
                entry.score >= 80 ? 'var(--success)' :
                entry.score >= 50 ? 'var(--warning)' : 'var(--error)';

              return (
                <div key={idx} className="history-item glass-card" id={`history-item-${idx}`}>
                  <div className="history-item-left">
                    <span className="history-cat-icon">{cat?.icon || '📝'}</span>
                    <div className="history-item-info">
                      <h4 className="history-item-title">
                        {entry.categoryName || cat?.name || 'Unknown'}
                      </h4>
                      <div className="history-item-meta">
                        <span className={`badge ${entry.mode === 'practice' ? 'badge-info' : 'badge-warning'}`}>
                          {entry.mode === 'practice' ? '📚 Luyện tập' : '🎯 Thi thật'}
                        </span>
                        <span className="history-date">{formatDate(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="history-item-right">
                    <div className="history-item-stats">
                      <div className="history-stat">
                        <span className="history-stat-label">Điểm</span>
                        <span className="history-stat-value" style={{ color: scoreColor }}>
                          {entry.score}%
                        </span>
                      </div>
                      <div className="history-stat">
                        <span className="history-stat-label">Đúng</span>
                        <span className="history-stat-value">
                          {entry.correctCount}/{entry.totalQuestions}
                        </span>
                      </div>
                      <div className="history-stat">
                        <span className="history-stat-label">Thời gian</span>
                        <span className="history-stat-value">{formatTime(entry.timeSpent)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
