import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { categories } from '../data/questions';
import './Leaderboard.css';

export default function Leaderboard() {
  const { user, getLeaderboard } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const leaderboard = useMemo(
    () => getLeaderboard(selectedCategory),
    [getLeaderboard, selectedCategory]
  );

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}p ${s}s` : `${s}s`;
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="page" id="leaderboard-page">
      <div className="container">
        {/* Header */}
        <div className="lb-header animate-fade-in-up">
          <h1 className="heading-2">
            🏆 Bảng xếp <span className="text-gradient">hạng</span>
          </h1>
          <p className="text-secondary">Top điểm cao nhất của tất cả người chơi</p>
        </div>

        {/* Category Filter */}
        <div className="lb-filters animate-fade-in-up stagger-1">
          <button
            className={`lb-filter-btn ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            🌟 Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`lb-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{ '--cat-color': cat.color }}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        {leaderboard.length === 0 ? (
          <div className="lb-empty glass-card animate-fade-in-up stagger-2">
            <span className="lb-empty-icon">🏆</span>
            <h3>Chưa có dữ liệu</h3>
            <p className="text-secondary">Hãy là người đầu tiên chinh phục bảng xếp hạng!</p>
          </div>
        ) : (
          <div className="lb-table-wrapper animate-fade-in-up stagger-2">
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="lb-podium">
                {[1, 0, 2].map((podiumIdx) => {
                  const entry = leaderboard[podiumIdx];
                  if (!entry) return null;
                  const isCurrentUser = entry.userId === user?.id;

                  return (
                    <div
                      key={podiumIdx}
                      className={`podium-item podium-${podiumIdx + 1} ${isCurrentUser ? 'podium-me' : ''}`}
                    >
                      <div className="podium-medal">{medals[podiumIdx]}</div>
                      <div className="podium-avatar">{entry.userName?.charAt(0).toUpperCase() || '?'}</div>
                      <span className="podium-name">{entry.userName}</span>
                      <span className="podium-score">{entry.score}%</span>
                      <div className={`podium-bar podium-bar-${podiumIdx + 1}`} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full List */}
            <div className="lb-list glass-card">
              <div className="lb-list-header">
                <span className="lb-col-rank">#</span>
                <span className="lb-col-name">Người chơi</span>
                <span className="lb-col-cat">Chủ đề</span>
                <span className="lb-col-score">Điểm</span>
                <span className="lb-col-detail">Chi tiết</span>
                <span className="lb-col-time">Thời gian</span>
              </div>

              {leaderboard.map((entry, idx) => {
                const cat = categories.find((c) => c.id === entry.categoryId);
                const isCurrentUser = entry.userId === user?.id;
                const scoreColor =
                  entry.score >= 80 ? 'var(--success)' :
                  entry.score >= 50 ? 'var(--warning)' : 'var(--error)';

                return (
                  <div
                    key={idx}
                    className={`lb-row ${isCurrentUser ? 'lb-row-me' : ''}`}
                    id={`lb-row-${idx}`}
                  >
                    <span className="lb-col-rank">
                      {idx < 3 ? medals[idx] : idx + 1}
                    </span>
                    <span className="lb-col-name">
                      <span className="lb-name-text">
                        {entry.userName}
                        {isCurrentUser && <span className="lb-me-badge">Bạn</span>}
                      </span>
                    </span>
                    <span className="lb-col-cat">
                      {cat?.icon} {cat?.name || '-'}
                    </span>
                    <span className="lb-col-score" style={{ color: scoreColor }}>
                      {entry.score}%
                    </span>
                    <span className="lb-col-detail">
                      {entry.correctCount}/{entry.totalQuestions}
                    </span>
                    <span className="lb-col-time">{formatTime(entry.timeSpent)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
