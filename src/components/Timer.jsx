import { useState, useEffect, useRef } from 'react';
import './Timer.css';

export default function Timer({ totalSeconds, onTimeUp, isPaused = false }) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const intervalRef = useRef(null);
  const onTimeUpRef = useRef(onTimeUp);
  const expiredRef = useRef(false);

  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

  useEffect(() => {
    if (isPaused) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isPaused]);

  useEffect(() => {
    if (timeLeft === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onTimeUpRef.current?.();
    }
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const percentage = (timeLeft / totalSeconds) * 100;
  const isWarning = timeLeft <= 30;
  const isDanger = timeLeft <= 10;

  return (
    <div
      className={`timer ${isWarning ? 'timer-warning' : ''} ${isDanger ? 'timer-danger' : ''}`}
      id="quiz-timer"
    >
      <div className="timer-circle">
        <svg className="timer-svg" viewBox="0 0 100 100">
          <circle
            className="timer-bg-circle"
            cx="50"
            cy="50"
            r="45"
          />
          <circle
            className="timer-progress-circle"
            cx="50"
            cy="50"
            r="45"
            style={{
              strokeDashoffset: `${283 - (283 * percentage) / 100}`,
            }}
          />
        </svg>
        <div className="timer-display">
          <span className="timer-icon">⏱️</span>
          <span className="timer-text">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
