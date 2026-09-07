export const DEFAULT_SETTINGS = { mode: 'exam', count: 10, timeLimit: '', shuffleQuestions: true, shuffleAnswers: true };

export function readSettings(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`autoquiz_settings_${userId}`));
    if (!saved || typeof saved !== 'object') return DEFAULT_SETTINGS;
    return { mode: saved.mode === 'practice' ? 'practice' : 'exam', count: saved.count === 'all' ? 'all' : (Number.isInteger(Number(saved.count)) && Number(saved.count) > 0 ? Number(saved.count) : 10), timeLimit: Number.isInteger(Number(saved.timeLimit)) && Number(saved.timeLimit) >= 1 && Number(saved.timeLimit) <= 600 ? saved.timeLimit : '', shuffleQuestions: saved.shuffleQuestions !== false, shuffleAnswers: saved.shuffleAnswers !== false };
  } catch { return DEFAULT_SETTINGS; }
}

export function settingsError(settings) {
  if (settings.count !== 'all' && (!Number.isInteger(Number(settings.count)) || Number(settings.count) < 1 || Number(settings.count) > 5000)) return 'Số câu hỏi cần là số nguyên từ 1 đến 5000.';
  if (settings.mode === 'exam' && settings.timeLimit !== '' && (!Number.isInteger(Number(settings.timeLimit)) || Number(settings.timeLimit) < 1 || Number(settings.timeLimit) > 600)) return 'Thời gian thi cần là số nguyên từ 1 đến 600 phút.';
  return '';
}
