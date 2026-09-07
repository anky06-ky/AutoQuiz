import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { parseFileContent, convertTextToQuiz } from '../utils/fileParser';
import { generateQuizWithGemini } from '../utils/aiGenerator';
import './CreateQuiz.css';

export default function CreateQuiz() {
  const { saveCustomQuiz } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [method, setMethod] = useState('file');
  const [engine, setEngine] = useState('smart');
  const [apiKey, setApiKey] = useState('');
  const [questionCount, setQuestionCount] = useState(500);

  // Quiz Configurations
  const [timeLimit, setTimeLimit] = useState(30); // Phút
  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = Không giới hạn

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Xử lý chọn file
  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  }

  // Drag & Drop handlers
  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validExts = ['.docx', '.txt', '.md', '.json'];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!validExts.includes(ext)) {
        setError(`Định dạng file "${ext}" không được hỗ trợ! Hãy dùng .docx, .txt, .md hoặc .json`);
        return;
      }
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setError('');
    }
  }

  // Tự động tạo câu hỏi từ file/text
  async function handleGenerate(e) {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setIsLoading(true);

    try {
      let rawText = inputText;

      if (method === 'file') {
        if (!selectedFile) {
          throw new Error('Vui lòng chọn file tài liệu (.docx, .txt, .md, .json)!');
        }
        setStatusMessage('📄 Đang đọc dữ liệu từ file...');
        const parsed = await parseFileContent(selectedFile);

        if (parsed.type === 'json_quiz' || parsed.type === 'parsed_quiz') {
          setQuestions(parsed.questions);
          if (parsed.title && !title) setTitle(parsed.title);
          setStatusMessage(`✅ Đã nhận diện & đọc thành công ${parsed.questions.length} câu hỏi (kèm đáp án tô vàng) từ file!`);
          setIsLoading(false);
          return;
        }
        rawText = parsed.content;
      }

      if (!rawText || !rawText.trim()) {
        throw new Error('Nội dung văn bản không được để trống!');
      }

      if (engine === 'ai') {
        setStatusMessage('🤖 Gemini AI đang phân tích tài liệu & tạo câu hỏi...');
        const generated = await generateQuizWithGemini(rawText, apiKey, questionCount);
        setQuestions(generated);
        setStatusMessage(`✨ Gemini AI đã tạo thành công ${generated.length} câu hỏi!`);
      } else {
        setStatusMessage('⚡ Smart Generator đang bóc tách & tạo bộ câu hỏi...');
        const generated = convertTextToQuiz(rawText, questionCount);
        if (generated.length === 0) {
          throw new Error('Không thể tự động trích xuất câu hỏi. Hãy thử dán văn bản có cấu trúc hơn hoặc dùng Gemini AI!');
        }
        setQuestions(generated);
        setStatusMessage(`⚡ Đã phân tích & tạo thành công ${generated.length} câu hỏi trắc nghiệm!`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Đổi đáp án đúng cho câu hỏi trong danh sách preview
  function handleSelectCorrectAnswer(questionIdx, optionIdx) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === questionIdx ? { ...q, correctAnswer: optionIdx } : q
      )
    );
  }

  // Sửa nội dung câu hỏi
  function handleUpdateQuestionText(questionIdx, text) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === questionIdx ? { ...q, question: text } : q))
    );
  }

  // Sửa nội dung lựa chọn đáp án
  function handleUpdateOptionText(questionIdx, optionIdx, text) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== questionIdx) return q;
        const newOpts = [...q.options];
        newOpts[optionIdx] = text;
        return { ...q, options: newOpts };
      })
    );
  }

  // Thêm 1 câu hỏi thủ công
  function handleAddQuestion() {
    const newQ = {
      id: `manual-${Date.now()}`,
      question: 'Nhập nội dung câu hỏi mới...',
      options: ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'],
      correctAnswer: 0,
      explanation: 'Đáp án đúng là A.',
    };
    setQuestions((prev) => [...prev, newQ]);
  }

  // Xóa 1 câu trong danh sách
  function handleDeleteQuestion(index) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Lưu bộ đề
  function handleSaveQuiz() {
    if (!title.trim()) {
      setError('Vui lòng nhập tên bộ đề thi!');
      return;
    }
    if (questions.length === 0) {
      setError('Bộ đề thi phải có ít nhất 1 câu hỏi!');
      return;
    }

    const shareCode = `AQ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newQuiz = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || `Bộ đề tự tạo gồm ${questions.length} câu hỏi`,
      icon: '📂',
      color: '#6c5ce7',
      questions,
      questionCount: questions.length,
      timeLimit: parseInt(timeLimit) || 30,
      maxAttempts: parseInt(maxAttempts) || 0,
      shareCode,
      createdAt: new Date().toISOString(),
    };

    try {
      const result = saveCustomQuiz(newQuiz);
      alert(result.duplicate ? `Bộ đề “${result.quiz.title}” đã tồn tại. Mở bộ đề để chỉnh sửa, không tạo thêm bản trùng.` : 'Đã lưu bộ đề. Bạn có thể tiếp tục tinh chỉnh câu hỏi.');
      navigate(`/edit-quiz/${result.quiz.id}`);
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="page" id="create-quiz-page">
      <div className="container">
        {/* Header */}
        <div className="create-header animate-fade-in-up">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            ← Quay lại Trang chủ
          </button>
          <h1 className="heading-2">
            ✨ Tạo Đề Thi & <span className="text-gradient">Tùy Chỉnh Cấu Hình</span>
          </h1>
          <p className="text-secondary">
            Tải file (.docx, .txt, .json) hoặc dán văn bản bài học để tự động tạo bộ đề, chỉnh sửa đáp án, thiết lập thời gian & số lượt làm bài
          </p>
        </div>

        <div className="create-grid">
          {/* Settings Form */}
          <div className="create-form-section glass-card animate-fade-in-up stagger-1">
            <h3 className="section-title">1. Nhập tài liệu đầu vào</h3>

            <div className="input-group">
              <label>Tên bộ đề thi</label>
              <input
                type="text"
                className="input"
                placeholder="VD: Ôn tập Kiểm tra Lịch Sử..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Input Method Toggle */}
            <div className="method-toggle">
              <button
                type="button"
                className={`method-btn ${method === 'file' ? 'active' : ''}`}
                onClick={() => setMethod('file')}
              >
                📁 Tải File lên (.docx, .txt, .json)
              </button>
              <button
                type="button"
                className={`method-btn ${method === 'text' ? 'active' : ''}`}
                onClick={() => setMethod('text')}
              >
                📝 Dán Văn Bản Thô
              </button>
            </div>

            {method === 'file' ? (
              <div
                className={`file-upload-box ${isDragging ? 'is-dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="quiz-file-input"
                  accept=".docx,.txt,.md,.json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="quiz-file-input" className={`file-dropzone ${isDragging ? 'dragging' : ''}`}>
                  <span className="dropzone-icon">{isDragging ? '📥' : (selectedFile ? '📄' : '📄')}</span>
                  <span className="dropzone-text">
                    {isDragging
                      ? 'Thả file vào đây!'
                      : selectedFile
                        ? selectedFile.name
                        : 'Nhấp để chọn file hoặc kéo thả file vào đây'}
                  </span>
                  <span className="dropzone-sub">Hỗ trợ .docx, .txt, .md, .json (lên tới 500 câu)</span>
                </label>
              </div>
            ) : (
              <div className="input-group">
                <label>Nội dung văn bản / Ghi chú bài học</label>
                <textarea
                  className="input textarea-input"
                  rows={6}
                  placeholder="Dán nội dung bài học, tài liệu ôn tập hoặc đề thi đã có sẵn dạng text..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>
            )}

            <h3 className="section-title" style={{ marginTop: '1.5rem' }}>
              2. Thiết lập thời gian & lượt thi
            </h3>

            <div className="config-grid">
              <div className="input-group">
                <label>⏱️ Thời gian làm bài (phút)</label>
                <select
                  className="input"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                >
                  <option value={15}>15 phút</option>
                  <option value={30}>30 phút (Mặc định)</option>
                  <option value={45}>45 phút</option>
                  <option value={60}>60 phút</option>
                  <option value={90}>90 phút</option>
                  <option value={120}>120 phút</option>
                </select>
              </div>

              <div className="input-group">
                <label>🔄 Số lượt thi tối đa</label>
                <select
                  className="input"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                >
                  <option value={0}>∞ Không giới hạn</option>
                  <option value={1}>1 lần thi duy nhất</option>
                  <option value={2}>2 lần thi</option>
                  <option value={3}>3 lần thi</option>
                  <option value={5}>5 lần thi</option>
                </select>
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: '1.5rem' }}>
              3. Công cụ tạo câu hỏi
            </h3>

            <div className="engine-toggle">
              <label className={`engine-option ${engine === 'smart' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="engine"
                  value="smart"
                  checked={engine === 'smart'}
                  onChange={() => setEngine('smart')}
                />
                <div>
                  <strong>⚡ Smart Generator (Khuyên dùng)</strong>
                  <p>Tự động đọc đáp án tô vàng & tạo câu hỏi từ file/text (Miễn phí 100%)</p>
                </div>
              </label>

              <label className={`engine-option ${engine === 'ai' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="engine"
                  value="ai"
                  checked={engine === 'ai'}
                  onChange={() => setEngine('ai')}
                />
                <div>
                  <strong>🤖 Gemini AI Engine</strong>
                  <p>Sử dụng AI tạo câu hỏi thông minh từ văn bản phức tạp</p>
                </div>
              </label>
            </div>

            {engine === 'ai' && (
              <div className="input-group animate-fade-in-down" style={{ marginTop: '1rem' }}>
                <label>Gemini API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Nhập Gemini API Key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            )}

            {statusMessage && <div className="status-box info-box animate-fade-in">{statusMessage}</div>}
            {error && <div className="status-box error-box animate-fade-in">⚠️ {error}</div>}

            <button
              type="button"
              className="btn btn-primary btn-lg full-width"
              onClick={handleGenerate}
              disabled={isLoading}
              style={{ marginTop: '1.5rem' }}
            >
              {isLoading ? '⏳ Đang xử lý...' : '✨ Tự Động Tạo Bộ Câu Hỏi'}
            </button>
          </div>

          {/* Question Preview & Interactive Editor Section */}
          <div className="create-preview-section glass-card animate-fade-in-up stagger-2">
            <div className="preview-header">
              <div>
                <h3 className="section-title" style={{ marginBottom: '2px' }}>
                  4. Chỉnh sửa danh sách câu hỏi ({questions.length})
                </h3>
                <span className="preview-hint">💡 Nhấp vào đáp án A/B/C/D để chọn làm ĐÁP ÁN ĐÚNG. Bạn cũng có thể sửa nội dung câu hỏi.</span>
              </div>
              <div className="preview-actions">
                <button className="btn btn-secondary btn-sm" onClick={handleAddQuestion}>
                  ➕ Thêm câu
                </button>
                {questions.length > 0 && (
                  <button className="btn btn-success" onClick={handleSaveQuiz}>
                    💾 Lưu & Tạo Bộ Đề
                  </button>
                )}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="preview-empty">
                <span className="empty-icon">🎯</span>
                <p>Danh sách câu hỏi sẽ xuất hiện ở đây để bạn xem & chọn đáp án đúng.</p>
              </div>
            ) : (
              <div className="preview-list">
                {questions.map((q, idx) => (
                  <div key={idx} className="preview-item">
                    <div className="preview-item-header">
                      <span className="preview-num">Câu {idx + 1}</span>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteQuestion(idx)}
                        title="Xóa câu này"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Question text editor */}
                    <textarea
                      className="input preview-question-input"
                      rows={2}
                      value={q.question}
                      onChange={(e) => handleUpdateQuestionText(idx, e.target.value)}
                    />

                    {/* Interactive Options Editor & Selection */}
                    <div className="preview-options-editor">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`preview-option-edit ${
                            optIdx === q.correctAnswer ? 'is-correct' : ''
                          }`}
                          onClick={() => handleSelectCorrectAnswer(idx, optIdx)}
                          title="Nhấp để chọn đáp án này là ĐÁP ÁN ĐÚNG"
                        >
                          <span className="opt-letter-btn">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <input
                            type="text"
                            className="input opt-input"
                            value={opt}
                            onChange={(e) => handleUpdateOptionText(idx, optIdx, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {optIdx === q.correctAnswer && (
                            <span className="correct-badge">✅ Đúng</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
