import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { categories, questions } from '../data/questions';
import { prepareQuizWithShuffledAnswers, selectQuestions, questionErrors } from '../utils/quizData';
import QuestionCard from '../components/QuestionCard';
import Timer from '../components/Timer';
import './Quiz.css';

export default function Quiz() {
  const { topic } = useParams();
  const [searchParams] = useSearchParams();
  return <QuizSession key={`${topic}?${searchParams}`} topic={topic} searchParams={searchParams} />;
}

function QuizSession({ topic, searchParams }) {
  const navigate = useNavigate();
  const { saveQuizResult, customQuizzes, getMyHistory } = useAuth();

  const mode = searchParams.get('mode') === 'practice' ? 'practice' : 'exam';
  // Capture a single immutable attempt. Editing a quiz in another tab must not
  // reshuffle questions or change the answer key in an ongoing attempt.
  const [session] = useState(() => {
    const customQuiz = customQuizzes.find((quiz) => quiz.id === topic || quiz.shareCode === topic);
    const category = customQuiz
    ? {
        id: customQuiz.id,
        name: customQuiz.title,
        icon: customQuiz.icon || '📂',
        color: customQuiz.color,
        timeLimit: customQuiz.timeLimit || 30,
        maxAttempts: customQuiz.maxAttempts || 0,
      }
      : categories.find((item) => item.id === topic);
    const sourceQuestions = customQuiz?.questions || questions[topic] || [];
    const hasInvalidQuestions = sourceQuestions.some((question) => questionErrors(question).length > 0);
    const rawQuestions = hasInvalidQuestions ? [] : selectQuestions(sourceQuestions, searchParams.get('count'), searchParams.get('shuffleQuestions') !== '0');
    const quizQuestions = searchParams.get('shuffleAnswers') === '0' ? rawQuestions : prepareQuizWithShuffledAnswers(rawQuestions);
    const attemptsCount = getMyHistory().filter((entry) => entry.categoryId === category?.id || entry.quizId === category?.id).length;
    const requestedTime = Number(searchParams.get('time'));
    const minutes = Number.isInteger(requestedTime) && requestedTime >= 1 && requestedTime <= 600 ? requestedTime : category?.timeLimit || quizQuestions.length;
    return { category, quizQuestions, attemptsCount, totalTime: minutes * 60, hasInvalidQuestions };
  });
  const { category, quizQuestions, attemptsCount, totalTime, hasInvalidQuestions } = session;
  const isAttemptLimitExceeded = category?.maxAttempts > 0 && attemptsCount >= category.maxAttempts;
  const submitted = useRef(false);
  const [saveError, setSaveError] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [startTime] = useState(Date.now());

  // Chọn đáp án
  function handleSelectAnswer(questionIndex, answerIndex) {
    if (isFinished || isAttemptLimitExceeded || (mode === 'practice' && showResults[questionIndex])) return;

    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }));

    if (mode === 'practice') {
      setShowResults((prev) => ({
        ...prev,
        [questionIndex]: true,
      }));
    }
  }

  // Nộp bài
  const handleSubmit = useCallback(() => {
    if (submitted.current || isAttemptLimitExceeded || !quizQuestions.length) return;
    submitted.current = true;

    const allResults = {};
    quizQuestions.forEach((_, idx) => {
      allResults[idx] = true;
    });
    setShowResults(allResults);

    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / quizQuestions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    const result = {
      categoryId: category?.id || topic,
      categoryName: category?.name,
      mode,
      totalQuestions: quizQuestions.length,
      correctCount,
      score,
      timeSpent,
      answers: { ...answers },
      questions: quizQuestions.map((q) => q.id),
      settingsQuery: searchParams.toString(),
    };

    try {
      const saved = saveQuizResult(result);
      setIsFinished(true);
      navigate('/result', { state: { result: saved, questions: quizQuestions, answers } });
    } catch {
      submitted.current = false;
      setSaveError('Không lưu được kết quả vì bộ nhớ đầy hoặc bị chặn. Hãy giải phóng bộ nhớ rồi nộp lại.');
    }
  }, [isAttemptLimitExceeded, quizQuestions, answers, startTime, topic, category, mode, searchParams, saveQuizResult, navigate]);

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  if (!category || quizQuestions.length === 0) {
    return (
      <div className="page-center">
        <div className="glass-card text-center" style={{ maxWidth: '400px' }}>
          <h2>{hasInvalidQuestions ? 'Bộ đề có câu hỏi cần kiểm tra' : '❌ Không tìm thấy bộ đề thi'}</h2>
          <p className="text-secondary" style={{ margin: '1rem 0' }}>
            {hasInvalidQuestions ? 'Hãy mở Chỉnh sửa để điền đủ lựa chọn và chọn đáp án đúng trước khi làm bài.' : 'Bộ đề thi không tồn tại hoặc chưa có câu hỏi.'}
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            ← Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Cảnh báo vượt quá lượt thi
  if (isAttemptLimitExceeded) {
    return (
      <div className="page-center">
        <div className="glass-card text-center" style={{ maxWidth: '450px' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>🛑</span>
          <h2 style={{ color: 'var(--error)' }}>Đã hết lượt thi cho phép!</h2>
          <p className="text-secondary" style={{ margin: '1rem 0' }}>
            Bộ đề <strong>"{category.name}"</strong> quy định tối đa <strong>{category.maxAttempts} lượt thi</strong>.<br/>
            Bạn đã hoàn thành {attemptsCount}/{category.maxAttempts} lượt.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            ← Quay lại Trang chủ
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
        {saveError && <p className="dashboard-feedback is-error" role="alert">{saveError}</p>}
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
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                  <span className={`badge ${mode === 'practice' ? 'badge-info' : 'badge-warning'}`}>
                    {mode === 'practice' ? '📚 Luyện tập' : '🎯 Thi thật'}
                  </span>
                  {category.maxAttempts > 0 && (
                    <span className="badge badge-error">
                      Lượt {attemptsCount + 1}/{category.maxAttempts}
                    </span>
                  )}
                </div>
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
