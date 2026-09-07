import { createId, normalizeQuiz, quizSignature } from '../utils/quizData.js';

export const QUIZZES_KEY = 'autoquiz_custom_quizzes';

export function createQuizStore(storage) {
  let cachedRaw;
  let cachedQuizzes = [];
  let readError = '';
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener());

  function getSnapshot() {
    try {
      const raw = storage.getItem(QUIZZES_KEY);
      if (raw === cachedRaw) { readError = ''; return cachedQuizzes; }
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed) || parsed.some((quiz) => !quiz || typeof quiz.id !== 'string' || !Array.isArray(quiz.questions))) {
        throw new Error('Invalid quiz collection');
      }
      cachedQuizzes = parsed.map((quiz) => ({ ...quiz, questionCount: quiz.questions.length }));
      cachedRaw = raw;
      readError = '';
    } catch {
      readError = 'Không đọc được dữ liệu bộ đề. Dữ liệu hiện tại được giữ nguyên để có thể khôi phục; việc lưu và xóa đang tạm dừng.';
    }
    return cachedQuizzes;
  }

  function readForWrite() {
    const quizzes = getSnapshot();
    if (readError) throw new Error(readError);
    return quizzes;
  }

  function write(quizzes) {
    const raw = JSON.stringify(quizzes);
    try {
      storage.setItem(QUIZZES_KEY, raw);
    } catch {
      throw new Error('Không thể lưu: bộ nhớ trình duyệt đã đầy hoặc bị chặn. Hãy xuất bộ đề để sao lưu.');
    }
    cachedRaw = raw;
    cachedQuizzes = quizzes;
    emit();
  }

  return {
    getSnapshot,
    getError: () => readError,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    refresh: emit,
    save(input, author, { expectedUpdatedAt } = {}) {
      const quizzes = readForWrite();
      const normalized = normalizeQuiz(input);
      const index = quizzes.findIndex((quiz) => quiz.id === normalized.id);
      const existing = quizzes[index];
      if (expectedUpdatedAt !== undefined && (!existing || (existing.updatedAt || existing.createdAt || '') !== expectedUpdatedAt)) {
        throw new Error('Bộ đề đã thay đổi ở cửa sổ khác. Hãy tải lại trước khi sửa để tránh ghi đè.');
      }
      if (!existing) {
        const signature = quizSignature(normalized);
        const duplicate = quizzes.find((quiz) => quizSignature(quiz) === signature);
        if (duplicate) return { quiz: duplicate, duplicate: true };
      }
      const now = new Date(Math.max(Date.now(), (Date.parse(existing?.updatedAt || existing?.createdAt) || 0) + 1)).toISOString();
      const importedCode = typeof normalized.shareCode === 'string' && /^[\w-]{1,50}$/.test(normalized.shareCode) && !quizzes.some((item) => item.shareCode === normalized.shareCode) ? normalized.shareCode : createId('AQ');
      const quiz = { ...normalized, id: existing?.id || createId(), authorId: existing?.authorId || author?.id || 'guest', authorName: existing?.authorName || author?.displayName || 'Guest', shareCode: existing?.shareCode || importedCode, createdAt: existing?.createdAt || now, updatedAt: now };
      const next = [...quizzes];
      if (index < 0) next.unshift(quiz);
      else next[index] = quiz;
      write(next);
      return { quiz, duplicate: false };
    },
    remove(id) { write(readForWrite().filter((quiz) => quiz.id !== id)); },
  };
}

export const quizStore = createQuizStore({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === QUIZZES_KEY || event.key === null) quizStore.refresh();
  });
}
