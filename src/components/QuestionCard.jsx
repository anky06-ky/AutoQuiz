import './QuestionCard.css';

export default function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  showResult,
  mode,
}) {
  const isCorrect = selectedAnswer === question.correctAnswer;
  const hasAnswered = selectedAnswer !== null && selectedAnswer !== undefined;

  function getOptionClass(optionIndex) {
    let cls = 'option';

    if (hasAnswered && selectedAnswer === optionIndex) {
      cls += ' selected';
    }

    if (showResult && hasAnswered) {
      if (optionIndex === question.correctAnswer) {
        cls += ' correct';
      } else if (selectedAnswer === optionIndex && !isCorrect) {
        cls += ' incorrect';
      }
    }

    return cls;
  }

  return (
    <div className="question-card animate-fade-in-up" id={`question-${questionIndex}`}>
      {/* Question Header */}
      <div className="question-header">
        <span className="question-number">
          Câu {questionIndex + 1}/{totalQuestions}
        </span>
        {showResult && hasAnswered && (
          <span className={`badge ${isCorrect ? 'badge-success' : 'badge-error'}`}>
            {isCorrect ? '✅ Đúng' : '❌ Sai'}
          </span>
        )}
      </div>

      {/* Question Text */}
      <h3 className="question-text">{question.question}</h3>

      {/* Options */}
      <div className="options-grid">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            className={getOptionClass(idx)}
            onClick={() => !showResult && onSelectAnswer(idx)}
            disabled={showResult && mode === 'practice'}
            id={`option-${questionIndex}-${idx}`}
          >
            <span className="option-letter">
              {String.fromCharCode(65 + idx)}
            </span>
            <span className="option-text">{option}</span>
            {showResult && idx === question.correctAnswer && (
              <span className="option-check">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Explanation */}
      {showResult && hasAnswered && (
        <div className={`explanation animate-fade-in-up ${isCorrect ? 'explanation-correct' : 'explanation-incorrect'}`}>
          <div className="explanation-icon">
            {isCorrect ? '💡' : '📖'}
          </div>
          <div className="explanation-content">
            <span className="explanation-label">Giải thích:</span>
            <p>{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
