export const MAX_QUESTIONS = 5000;

export function createId(prefix = 'custom') {
  return `${prefix}-${crypto.randomUUID()}`;
}

const cleanText = (value) => typeof value === 'string' ? value.trim().normalize('NFC') : '';

export function questionErrors(question) {
  const errors = [];
  if (!cleanText(question?.question)) errors.push('Nhập nội dung câu hỏi.');
  if (!Array.isArray(question?.options) || question.options.length < 2 || question.options.length > 4) {
    errors.push('Mỗi câu cần từ 2 đến 4 lựa chọn.');
  } else {
    const options = question.options.map(cleanText);
    if (options.some((option) => !option)) errors.push('Điền đầy đủ các lựa chọn.');
    if (new Set(options).size !== options.length) errors.push('Các lựa chọn phải khác nhau.');
  }
  if (!Number.isInteger(question?.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer >= (question?.options?.length || 0)) {
    errors.push('Chọn một đáp án đúng.');
  }
  return errors;
}

export function normalizeQuiz(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Dữ liệu bộ đề không hợp lệ.');
  const title = cleanText(input.title);
  if (!title || title.length > 255) throw new Error('Tên bộ đề cần từ 1 đến 255 ký tự.');
  if (!Array.isArray(input.questions) || !input.questions.length || input.questions.length > MAX_QUESTIONS) {
    throw new Error(`Bộ đề cần từ 1 đến ${MAX_QUESTIONS} câu hỏi.`);
  }
  const timeLimit = Number(input.timeLimit ?? 30);
  const maxAttempts = Number(input.maxAttempts ?? 0);
  if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 600) throw new Error('Thời gian cần từ 1 đến 600 phút.');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 0 || maxAttempts > 1000) throw new Error('Số lượt làm bài cần từ 0 đến 1000.');
  const ids = new Set();
  const questions = input.questions.map((question, index) => {
    const errors = questionErrors(question);
    if (errors.length) throw new Error(`Câu ${index + 1}: ${errors.join(' ')}`);
    let id = typeof question.id === 'string' ? question.id : '';
    if (!id || ids.has(id)) id = createId('q');
    ids.add(id);
    return { id, question: cleanText(question.question), options: question.options.map(cleanText), correctAnswer: question.correctAnswer, explanation: cleanText(question.explanation) };
  });
  return { ...input, title, description: cleanText(input.description), questions, questionCount: questions.length, timeLimit, maxAttempts };
}

// Include the answer and explanation: similar questions with different teaching
// content must never be silently merged.
export function questionSignature(question) {
  return JSON.stringify([cleanText(question?.question), Array.isArray(question?.options) ? question.options.map(cleanText) : [], question?.correctAnswer, cleanText(question?.explanation)]);
}

export function quizSignature(quiz) {
  return JSON.stringify([cleanText(quiz.title), cleanText(quiz.description), Number(quiz.timeLimit ?? 30), Number(quiz.maxAttempts ?? 0), quiz.questions.map(questionSignature)]);
}

export function duplicateQuestionIds(questions) {
  const seen = new Set();
  return questions.flatMap((question) => {
    const key = questionSignature(question);
    if (seen.has(key)) return [question.id];
    seen.add(key);
    return [];
  });
}

export function resolveQuestionCount(value, availableCount) {
  if (value === 'all') return availableCount;
  const count = Number(value);
  return Math.min(availableCount, Number.isInteger(count) && count > 0 ? count : 10);
}

export function selectQuestions(questions, count, shuffle = true, random = Math.random) {
  const selected = [...questions];
  if (shuffle) {
    for (let index = selected.length - 1; index > 0; index--) {
      const next = Math.floor(random() * (index + 1));
      [selected[index], selected[next]] = [selected[next], selected[index]];
    }
  }
  return selected.slice(0, resolveQuestionCount(count, selected.length));
}

export function shuffleOptions(options, correctIndex, random = Math.random) {
  const indexes = selectQuestions(options.map((_, index) => index), 'all', true, random);
  return { options: indexes.map((index) => options[index]), correctIndex: indexes.indexOf(correctIndex) };
}

export function prepareQuizWithShuffledAnswers(questions, random = Math.random) {
  return questions.map((question) => {
    const shuffled = shuffleOptions(question.options, question.correctAnswer, random);
    return { ...question, options: shuffled.options, correctAnswer: shuffled.correctIndex };
  });
}
