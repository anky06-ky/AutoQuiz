import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Result.css';

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result, questions, answers } = location.state || {};
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score count up
  useEffect(() => {
    if (!result) return;
    const target = result.score;
    const duration = 1500;
    const startTime = Date.now();

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setAnimatedScore(Math.round(target * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [result]);

  if (!result) {
    return (
      <div className="page-center">
        <div className="glass-card text-center" style={{ maxWidth: '400px' }}>
          <h2>📋 Không có kết quả</h2>
          <p className="text-secondary" style={{ margin: '1rem 0' }}>
            Hãy làm bài thi trước để xem kết quả.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            ← Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const scoreColor =
    result.score >= 80 ? 'var(--success)' :
    result.score >= 50 ? 'var(--warning)' : 'var(--error)';

  const scoreEmoji =
    result.score >= 90 ? '🏆' :
    result.score >= 80 ? '🌟' :
    result.score >= 60 ? '👍' :
    result.score >= 40 ? '😊' : '💪';

  const scoreMessage =
    result.score >= 90 ? 'Xuất sắc!' :
    result.score >= 80 ? 'Rất giỏi!' :
    result.score >= 60 ? 'Khá tốt!' :
    result.score >= 40 ? 'Cần cải thiện' : 'Cố gắng hơn nhé!';

  const minutes = Math.floor(result.timeSpent / 60);
  const seconds = result.timeSpent % 60;

  return (
    <div className="page" id="result-page">
      <div className="container">
        {/* Score Card */}
        <div className="result-score-card glass-card animate-scale-in">
          <div className="score-emoji animate-float">{scoreEmoji}</div>

          {/* Donut Chart */}
          <div className="score-donut">
            <svg viewBox="0 0 120 120" className="donut-svg">
              <circle
                cx="60" cy="60" r="52"
                className="donut-bg"
              />
              <circle
                cx="60" cy="60" r="52"
                className="donut-fill"
                style={{
                  strokeDasharray: `${(result.score / 100) * 327} 327`,
                  stroke: scoreColor,
                }}
              />
            </svg>
            <div className="score-value">
              <span className="score-number" style={{ color: scoreColor }}>
                {animatedScore}
              </span>
              <span className="score-percent">%</span>
            </div>
          </div>

          <h2 className="score-message" style={{ color: scoreColor }}>
            {scoreMessage}
          </h2>
          <p className="score-detail">
            {result.correctCount}/{result.totalQuestions} câu đúng
          </p>

          {/* Stats Row */}
          <div className="result-stats">
            <div className="result-stat">
              <span className="result-stat-icon">📚</span>
              <div>
                <span className="result-stat-value">{result.categoryName}</span>
                <span className="result-stat-label">Chủ đề</span>
              </div>
            </div>
            <div className="result-stat">
              <span className="result-stat-icon">⏱️</span>
              <div>
                <span className="result-stat-value">
                  {minutes > 0 ? `${minutes}p ${seconds}s` : `${seconds}s`}
                </span>
                <span className="result-stat-label">Thời gian</span>
              </div>
            </div>
            <div className="result-stat">
              <span className="result-stat-icon">🎯</span>
              <div>
                <span className="result-stat-value">
                  {result.mode === 'practice' ? 'Luyện tập' : 'Thi thật'}
                </span>
                <span className="result-stat-label">Chế độ</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="result-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate(`/quiz/${result.categoryId}?${result.settingsQuery || `mode=${result.mode}&count=${result.totalQuestions}`}`)}
              id="retry-btn"
            >
              🔄 Làm lại
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/')}
              id="home-btn"
            >
              🏠 Trang chủ
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/history')}
              id="history-btn"
            >
              📊 Lịch sử
            </button>
          </div>
        </div>

        {/* Answer Review */}
        {questions && (
          <div className="result-review animate-fade-in-up">
            <h3 className="review-title">📋 Chi tiết đáp án</h3>
            <div className="review-list">
              {questions.map((q, idx) => {
                const userAnswer = answers[idx];
                const isCorrect = userAnswer === q.correctAnswer;
                const hasAnswered = userAnswer !== undefined;

                return (
                  <div
                    key={idx}
                    className={`review-item ${isCorrect ? 'review-correct' : 'review-incorrect'}`}
                    id={`review-${idx}`}
                  >
                    <div className="review-header">
                      <span className="review-number">Câu {idx + 1}</span>
                      <span className={`badge ${isCorrect ? 'badge-success' : 'badge-error'}`}>
                        {isCorrect ? '✅ Đúng' : '❌ Sai'}
                      </span>
                    </div>
                    <p className="review-question">{q.question}</p>
                    <div className="review-answers">
                      {hasAnswered && !isCorrect && (
                        <div className="review-answer wrong">
                          <span>❌ Bạn chọn:</span> {q.options[userAnswer]}
                        </div>
                      )}
                      <div className="review-answer right">
                        <span>✅ Đáp án:</span> {q.options[q.correctAnswer]}
                      </div>
                    </div>
                    {q.explanation && (
                      <p className="review-explanation">💡 {q.explanation}</p>
                    )}
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
