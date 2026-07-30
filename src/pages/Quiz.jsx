import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categories, getRandomQuestions, getQuizTime } from '../data/questions';
import QuestionCard from '../components/QuestionCard';
import Timer from '../components/Timer';
import './Quiz.css';

export default function Quiz() {
  const { topic } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveQuizResult } = useAuth();

  const mode = searchParams.get('mode') || 'exam';
  const count = parseInt(searchParams.get('count')) || 10;

  const category = categories.find((c) => c.id === topic);

  // Sử dụng useMemo để câu hỏi không thay đổi khi re-render
  const quizQuestions = useMemo(
    () => getRandomQuestions(topic, count),
    [topic, count]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [startTime] = useState(Date.now());

  const totalTime = getQuizTime(quizQuestions.length);

  // Xử lý chọn đáp án
  function handleSelectAnswer(questionIndex, answerIndex) {
    if (isFinished) return;

    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }));

    // Chế độ luyện tập: hiện kết quả ngay
    if (mode === 'practice') {
      setShowResults((prev) => ({
        ...prev,
        [questionIndex]: true,
      }));
    }
  }

  // Nộp bài
  const handleSubmit = useCallback(() => {
    if (isFinished) return;

    setIsFinished(true);

    // Hiện tất cả kết quả
    const allResults = {};
    quizQuestions.forEach((_, idx) => {
      allResults[idx] = true;
    });
    setShowResults(allResults);

    // Tính điểm
    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / quizQuestions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    // Lưu kết quả
    const result = {
      categoryId: topic,
      categoryName: category?.name,
      mode,
      totalQuestions: quizQuestions.length,
      correctCount,
      score,
      timeSpent,
      answers: { ...answers },
      questions: quizQuestions.map((q) => q.id),
    };

    const saved = saveQuizResult(result);

    // Chuyển sang trang kết quả
    setTimeout(() => {
      navigate('/result', { state: { result: saved, questions: quizQuestions, answers } });
    }, 500);
  }, [isFinished, quizQuestions, answers, startTime, topic, category, mode, saveQuizResult, navigate]);

  // Hết giờ
  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  // Navigation
  function goToQuestion(index) {
    setCurrentIndex(index);
  }

  function goNext() {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  // Scroll to top when question changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  if (!category || quizQuestions.length === 0) {
    return (
      <div className="page-center">
        <div className="glass-card text-center" style={{ maxWidth: '400px' }}>
          <h2>❌ Không tìm thấy đề thi</h2>
          <p className="text-secondary" style={{ margin: '1rem 0' }}>
            Chủ đề không tồn tại hoặc không có câu hỏi.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            ← Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / quizQuestions.length) * 100;
  const currentQuestion = quizQuestions[currentIndex];

  return (
    <div className="page" id="quiz-page">
      <div className="container">
        {/* Quiz Header */}
        <div className="quiz-header glass animate-fade-in-down">
          <div className="quiz-header-left">
            <button className="btn btn-ghost" onClick={() => navigate('/')} id="quiz-back-btn">
              ← Quay lại
            </button>
            <div className="quiz-info">
              <span className="quiz-category-icon">{category.icon}</span>
              <div>
                <h2 className="quiz-title">{category.name}</h2>
                <span className={`badge ${mode === 'practice' ? 'badge-info' : 'badge-warning'}`}>
                  {mode === 'practice' ? '📚 Luyện tập' : '🎯 Thi thật'}
                </span>
              </div>
            </div>
          </div>

          <div className="quiz-header-right">
            {mode === 'exam' && !isFinished && (
              <Timer
                totalSeconds={totalTime}
                onTimeUp={handleTimeUp}
              />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="quiz-progress animate-fade-in">
          <div className="progress-info">
            <span>Tiến độ: {answeredCount}/{quizQuestions.length} câu</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question Navigation Pills */}
        <div className="question-nav animate-fade-in">
          {quizQuestions.map((_, idx) => (
            <button
              key={idx}
              className={`question-pill ${
                currentIndex === idx ? 'current' : ''
              } ${
                answers[idx] !== undefined ? 'answered' : ''
              } ${
                showResults[idx]
                  ? answers[idx] === quizQuestions[idx].correctAnswer
                    ? 'correct'
                    : 'incorrect'
                  : ''
              }`}
              onClick={() => goToQuestion(idx)}
              id={`pill-${idx}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Current Question */}
        <div className="quiz-content">
          <QuestionCard
            key={currentIndex}
            question={currentQuestion}
            questionIndex={currentIndex}
            totalQuestions={quizQuestions.length}
            selectedAnswer={answers[currentIndex]}
            onSelectAnswer={(answerIdx) => handleSelectAnswer(currentIndex, answerIdx)}
            showResult={showResults[currentIndex] || false}
            mode={mode}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="quiz-nav">
          <button
            className="btn btn-secondary"
            onClick={goPrev}
            disabled={currentIndex === 0}
            id="prev-btn"
          >
            ← Câu trước
          </button>

          <div className="quiz-nav-center">
            {mode === 'exam' && !isFinished && (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                id="submit-btn"
              >
                📋 Nộp bài ({answeredCount}/{quizQuestions.length})
              </button>
            )}
            {mode === 'practice' && answeredCount === quizQuestions.length && !isFinished && (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                id="submit-btn"
              >
                📋 Xem kết quả
              </button>
            )}
          </div>

          <button
            className="btn btn-secondary"
            onClick={goNext}
            disabled={currentIndex === quizQuestions.length - 1}
            id="next-btn"
          >
            Câu sau →
          </button>
        </div>
      </div>
    </div>
  );
}
