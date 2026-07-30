import { useState } from 'react';
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
  const [method, setMethod] = useState('file'); // 'file' | 'text'
  const [engine, setEngine] = useState('smart'); // 'smart' | 'ai'
  const [apiKey, setApiKey] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  // Xử lý khi chọn file
  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  }

  // Xử lý chuyển đổi file / text thành câu hỏi
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

        if (parsed.type === 'json_quiz') {
          // File JSON câu hỏi có sẵn
          setQuestions(parsed.questions);
          if (parsed.title && !title) setTitle(parsed.title);
          setStatusMessage(`✅ Đã đọc thành công ${parsed.questions.length} câu hỏi từ file JSON!`);
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

    const newQuiz = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || `Bộ đề tự tạo gồm ${questions.length} câu hỏi`,
      icon: '📂',
      color: '#6c5ce7',
      questions,
      questionCount: questions.length,
      createdAt: new Date().toISOString(),
    };

    saveCustomQuiz(newQuiz);
    navigate('/');
  }

  // Xóa 1 câu trong danh sách xem trước
  function handleDeleteQuestion(index) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
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
            ✨ Tạo Đề Thi Từ <span className="text-gradient">Tài Liệu / File</span>
          </h1>
          <p className="text-secondary">
            Tải file (.docx, .pdf, .txt, .json) hoặc dán văn bản bài học để tự động biến thành bộ câu hỏi trắc nghiệm (hỗ trợ tới 500 câu, tự động xáo trộn đáp án)
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
                placeholder="VD: Ôn tập Kiểm tra giữa kỳ..."
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

            {/* File Upload Box */}
            {method === 'file' ? (
              <div className="file-upload-box">
                <input
                  type="file"
                  id="quiz-file-input"
                  accept=".docx,.txt,.md,.json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="quiz-file-input" className="file-dropzone">
                  <span className="dropzone-icon">📄</span>
                  <span className="dropzone-text">
                    {selectedFile ? selectedFile.name : 'Nhấp để chọn file hoặc kéo thả file vào đây'}
                  </span>
                  <span className="dropzone-sub">Hỗ trợ .docx, .txt, .md, .json (lên tới 500 câu)</span>
                </label>
              </div>
            ) : (
              <div className="input-group">
                <label>Nội dung văn bản / Ghi chú bài học</label>
                <textarea
                  className="input textarea-input"
                  rows={8}
                  placeholder="Dán nội dung bài học, tài liệu ôn tập hoặc đề thi đã có sẵn dạng text..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>
            )}

            <h3 className="section-title" style={{ marginTop: '1.5rem' }}>
              2. Công cụ tạo câu hỏi
            </h3>

            {/* Engine Toggle */}
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
                  <p>Tự động tách câu hỏi sẵn có hoặc tạo từ văn bản thô trên trình duyệt (Miễn phí 100%)</p>
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
                  <p>Sử dụng AI tạo câu hỏi thông minh & sâu sắc từ văn bản phức tạp</p>
                </div>
              </label>
            </div>

            {engine === 'ai' && (
              <div className="input-group animate-fade-in-down" style={{ marginTop: '1rem' }}>
                <label>Gemini API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Nhập Gemini API Key của bạn..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <span className="setting-hint">Lấy API Key miễn phí tại Google AI Studio</span>
              </div>
            )}

            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label>Số lượng câu hỏi tối đa</label>
              <input
                type="number"
                className="input"
                min={1}
                max={500}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>

            {/* Status & Error */}
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

          {/* Question Preview Section */}
          <div className="create-preview-section glass-card animate-fade-in-up stagger-2">
            <div className="preview-header">
              <h3 className="section-title">
                3. Danh sách câu hỏi ({questions.length})
              </h3>
              {questions.length > 0 && (
                <button className="btn btn-success" onClick={handleSaveQuiz}>
                  💾 Lưu & Tạo Bộ Đề
                </button>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="preview-empty">
                <span className="empty-icon">🎯</span>
                <p>Danh sách câu hỏi sẽ xuất hiện ở đây sau khi tạo.</p>
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
                    <p className="preview-question-text">{q.question}</p>

                    <div className="preview-options">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`preview-option ${
                            optIdx === q.correctAnswer ? 'correct' : ''
                          }`}
                        >
                          <span className="opt-letter">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                          {optIdx === q.correctAnswer && <span className="correct-check">✓</span>}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className="preview-exp">💡 {q.explanation}</p>
                    )}
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
