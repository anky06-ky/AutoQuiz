import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createId, duplicateQuestionIds, MAX_QUESTIONS, questionErrors } from '../utils/quizData';
import './EditQuiz.css';

const PAGE_SIZE = 10;

export default function EditQuiz() {
  const { quizId } = useParams();
  const { customQuizzes } = useAuth();
  const quiz = customQuizzes.find((item) => item.id === quizId);
  const navigate = useNavigate();
  if (!quiz) return <div className="page"><div className="container glass-card"><h1>Không tìm thấy bộ đề</h1><button className="btn btn-secondary" onClick={() => navigate('/')}>Về trang chủ</button></div></div>;
  return <QuizEditor key={quizId} quiz={quiz} />;
}

function QuizEditor({ quiz }) {
  const { saveCustomQuiz } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => {
    const usedIds = new Set();
    const questions = quiz.questions.map((question) => {
      const id = typeof question?.id === 'string' && !usedIds.has(question.id) ? question.id : createId('q');
      usedIds.add(id);
      return { ...question, id, options: Array.isArray(question?.options) ? [...question.options] : ['', '', '', ''] };
    });
    return { ...quiz, timeLimit: quiz.timeLimit ?? 30, maxAttempts: quiz.maxAttempts ?? 0, questions };
  });
  const [revision, setRevision] = useState(quiz.updatedAt || quiz.createdAt || '');
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event) => { event.preventDefault(); event.returnValue = ''; };
    const checkLink = (event) => {
      const link = event.target.closest('a[href]');
      if (link && !window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', checkLink, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', checkLink, true); };
  }, [dirty]);

  const duplicates = useMemo(() => new Set(duplicateQuestionIds(draft.questions)), [draft.questions]);
  const invalid = useMemo(() => new Map(draft.questions.map((question) => [question.id, questionErrors(question)])), [draft.questions]);
  const invalidCount = [...invalid.values()].filter((errors) => errors.length).length;
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi');
    return draft.questions.map((question, index) => ({ question, index })).filter(({ question, index }) =>
      (filter !== 'invalid' || invalid.get(question.id).length > 0) &&
      (filter !== 'duplicates' || duplicates.has(question.id)) &&
      (!term || `${index + 1} ${question.question} ${question.options.join(' ')} ${question.explanation || ''}`.toLocaleLowerCase('vi').includes(term)));
  }, [draft.questions, search, filter, invalid, duplicates]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleQuestions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateDraft(update) {
    setDraft((previous) => ({ ...previous, ...update }));
    setDirty(true);
    setMessage('');
    setError('');
  }

  function updateQuestion(id, update) {
    updateDraft({ questions: draft.questions.map((question) => question.id === id ? { ...question, ...update } : question) });
  }

  function addQuestion() {
    if (draft.questions.length >= MAX_QUESTIONS) return;
    updateDraft({ questions: [...draft.questions, { id: createId('q'), question: '', options: ['', '', '', ''], correctAnswer: -1, explanation: '' }] });
    setSearch(''); setFilter('all'); setPage(Math.ceil((draft.questions.length + 1) / PAGE_SIZE));
  }

  function removeDuplicates() {
    if (!window.confirm(`Bỏ ${duplicates.size} câu trùng hoàn toàn, giữ câu xuất hiện đầu tiên? Thay đổi chỉ áp dụng khi bạn lưu.`)) return;
    updateDraft({ questions: draft.questions.filter((question) => !duplicates.has(question.id)) });
  }

  async function save(event) {
    event.preventDefault();
    if (invalidCount) {
      setFilter('invalid'); setSearch(''); setPage(1);
      setError(`Có ${invalidCount} câu cần kiểm tra. Hãy sửa các lỗi được đánh dấu trước khi lưu.`);
      return;
    }
    try {
      const result = await saveCustomQuiz(draft, { expectedUpdatedAt: revision });
      setDraft(result.quiz); setRevision(result.quiz.updatedAt); setDirty(false); setError('');
      setMessage('Đã lưu thay đổi. Bộ đề đã sẵn sàng để làm bài.');
    } catch (err) { setError(err.message); }
  }

  function leave() {
    if (!dirty || window.confirm('Bỏ các thay đổi chưa lưu và về trang chủ?')) navigate('/');
  }

  return (
    <div className="page" id="edit-quiz-page"><div className="container">
      <form onSubmit={save} noValidate>
        <header className="editor-heading">
          <div><button type="button" className="btn btn-ghost" onClick={leave}>← Bộ đề của bạn</button><h1>Chỉnh sửa bộ đề</h1><p className="text-secondary">Sửa nội dung, chọn đáp án đúng và kiểm tra trước khi lưu.</p></div>
          <div className="editor-save"><span className={dirty ? 'editor-unsaved' : 'text-secondary'}>{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span><button type="submit" className="btn btn-primary" disabled={!dirty}>Lưu thay đổi</button></div>
        </header>
        {error && <p className="editor-alert editor-alert-error" role="alert">{error}</p>}
        {message && <p className="editor-alert editor-alert-success" role="status">{message}</p>}
        <div className="editor-layout">
          <aside className="glass-card editor-details">
            <h2>Thông tin bộ đề</h2>
            <label className="editor-field">Tên bộ đề<input className="input" value={draft.title} maxLength={255} onChange={(event) => updateDraft({ title: event.target.value })} /></label>
            <label className="editor-field">Mô tả<textarea className="input" rows={3} value={draft.description || ''} onChange={(event) => updateDraft({ description: event.target.value })} /></label>
            <label className="editor-field">Thời gian thi (phút)<input className="input" type="number" min="1" max="600" value={draft.timeLimit} onChange={(event) => updateDraft({ timeLimit: event.target.value })} /></label>
            <label className="editor-field">Số lượt làm tối đa<input className="input" type="number" min="0" max="1000" value={draft.maxAttempts} onChange={(event) => updateDraft({ maxAttempts: event.target.value })} /><span className="text-secondary">Nhập 0 để không giới hạn lượt.</span></label>
            <div className="editor-summary"><span>Tổng câu hỏi <strong>{draft.questions.length}</strong></span><span>Cần kiểm tra <strong>{invalidCount}</strong></span><span>Câu trùng hoàn toàn <strong>{duplicates.size}</strong></span></div>
            {duplicates.size > 0 && <button type="button" className="btn btn-secondary" onClick={removeDuplicates}>Bỏ {duplicates.size} câu trùng</button>}
          </aside>
          <section className="editor-questions" aria-label="Danh sách câu hỏi">
            <div className="editor-toolbar"><label className="editor-search"><span className="sr-only">Tìm câu hỏi</span><input className="input" type="search" placeholder="Tìm nội dung, đáp án hoặc số câu…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><button type="button" className="btn btn-secondary" onClick={addQuestion} disabled={draft.questions.length >= MAX_QUESTIONS}>+ Thêm câu hỏi</button></div>
            <div className="editor-filters" role="group" aria-label="Lọc câu hỏi">{[['all', `Tất cả (${draft.questions.length})`], ['invalid', `Cần kiểm tra (${invalidCount})`], ['duplicates', `Câu trùng (${duplicates.size})`]].map(([value, label]) => <button type="button" key={value} className={`count-btn ${filter === value ? 'active' : ''}`} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1); }}>{label}</button>)}</div>
            {visibleQuestions.map(({ question, index }) => (
              <article key={question.id} className={`glass-card editor-question ${invalid.get(question.id).length ? 'needs-review' : ''}`}>
                <div className="editor-question-heading"><h2>Câu {index + 1}</h2><button type="button" className="btn editor-delete" aria-label={`Xóa câu ${index + 1}`} onClick={() => { if (window.confirm(`Xóa câu ${index + 1}? Thay đổi chỉ áp dụng khi bạn lưu.`)) updateDraft({ questions: draft.questions.filter((item) => item.id !== question.id) }); }}>Xóa câu</button></div>
                <label className="editor-field">Nội dung câu hỏi<textarea className="input" rows={3} value={question.question || ''} onChange={(event) => updateQuestion(question.id, { question: event.target.value })} /></label>
                <fieldset className="editor-options"><legend>Chọn đáp án đúng ở ô tròn</legend>{question.options.map((option, optionIndex) => (
                  <div className={`editor-option ${question.correctAnswer === optionIndex ? 'is-correct' : ''}`} key={optionIndex}>
                    <input type="radio" name={`answer-${question.id}`} aria-label={`Đáp án đúng câu ${index + 1}: ${String.fromCharCode(65 + optionIndex)}`} checked={question.correctAnswer === optionIndex} onChange={() => updateQuestion(question.id, { correctAnswer: optionIndex })} />
                    <label><span>{String.fromCharCode(65 + optionIndex)}</span><textarea className="input" rows={2} aria-label={`Lựa chọn ${String.fromCharCode(65 + optionIndex)} câu ${index + 1}`} value={option} onChange={(event) => updateQuestion(question.id, { options: question.options.map((text, position) => position === optionIndex ? event.target.value : text) })} /></label>
                  </div>
                ))}</fieldset>
                <label className="editor-field">Giải thích đáp án (không bắt buộc)<textarea className="input" rows={2} value={question.explanation || ''} onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })} /></label>
                {invalid.get(question.id).length > 0 && <p className="editor-validation">{invalid.get(question.id).join(' ')}</p>}
              </article>
            ))}
            {!filtered.length && <div className="glass-card editor-empty">{draft.questions.length ? 'Không có câu hỏi phù hợp với bộ lọc.' : 'Bộ đề chưa có câu hỏi. Bấm “Thêm câu hỏi” để bắt đầu.'}</div>}
            <nav className="editor-pagination" aria-label="Phân trang câu hỏi"><button className="btn btn-secondary" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Trước</button><span>Trang {currentPage}/{pageCount} · {filtered.length} câu</span><button className="btn btn-secondary" type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Sau →</button></nav>
          </section>
        </div>
        <div className="editor-savebar"><span>{dirty ? 'Có thay đổi chưa lưu' : `${draft.questions.length} câu hỏi đã lưu`}</span><button type="submit" className="btn btn-primary" disabled={!dirty}>Lưu thay đổi</button></div>
      </form>
    </div></div>
  );
}
