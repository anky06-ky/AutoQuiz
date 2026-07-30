import mammoth from 'mammoth';

// =============================================
// AutoQuiz File Parser & Smart Quiz Generator
// Hỗ trợ: .docx, .txt, .md, .json, dán văn bản thô
// Hỗ trợ tối đa < 500 câu hỏi
// =============================================

/**
 * Đọc nội dung từ File (txt, md, json, docx)
 */
export async function parseFileContent(file) {
  const extension = file.name.split('.').pop().toLowerCase();

  if (extension === 'json') {
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) return { type: 'json_quiz', questions: data };
      if (data.questions && Array.isArray(data.questions)) return { type: 'json_quiz', questions: data.questions, title: data.title };
    } catch {
      // Nếu không parse được JSON chuẩn thì dùng text parser
    }
    return { type: 'text', content: text };
  }

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { type: 'text', content: result.value };
  }

  // default .txt, .md, text files
  const text = await file.text();
  return { type: 'text', content: text };
}

/**
 * Phân tích văn bản thành bộ câu hỏi
 * 1. Nếu văn bản ĐÃ CÓ sẵn các câu hỏi & đáp án (Ví dụ: Câu 1: ... A. ... B. ... Đáp án: A) -> Bóc tách tự động.
 * 2. Nếu là văn bản THÔ liên tục (ghi chú, sách, bài giảng) -> Dùng Smart NLP Generator tự tạo câu hỏi & 4 đáp án.
 */
export function convertTextToQuiz(rawText, maxQuestions = 500) {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();

  // Thử bóc tách theo định dạng câu hỏi có sẵn trước
  const existingQuestions = extractExistingQuestions(text);

  if (existingQuestions.length > 0) {
    return existingQuestions.slice(0, maxQuestions);
  }

  // Nếu là văn bản thô -> Dùng Smart NLP Generator tự động tạo câu hỏi
  return generateQuestionsFromRawText(text, maxQuestions);
}

/**
 * 1. Bóc tách văn bản ĐÃ CÓ sẵn định dạng trắc nghiệm
 * Nhận diện linh hoạt: "Câu 1:", "Question 1:", "1.", "1/", "Bài 1:"
 * Nhận diện đáp án: "A.", "A)", "a.", "[A]"
 * Nhận diện đáp án đúng: "Đáp án: A", "Key: B", "*A. ", "[x] A"
 */
function extractExistingQuestions(text) {
  const questions = [];

  // Tách văn bản thành từng khối câu hỏi
  // Regex khớp với các mẫu "Câu X:", "Question X:", "1.", "1/" ở đầu dòng
  const blocks = text.split(/(?=(?:^|\n)(?:câu|question|bài|câu hỏi)?\s*\d+[\.:\/\)-])/gi);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Tách dòng
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    // Dòng đầu tiên thường là tên câu hỏi
    const questionLine = lines[0].replace(/^(?:câu|question|bài|câu hỏi)?\s*\d+[\.:\/\)-]\s*/i, '').trim();
    if (!questionLine) continue;

    const options = [];
    let correctAnswer = 0;
    let explanation = '';

    // Tìm các lựa chọn A, B, C, D
    const optionMatches = trimmed.match(/(?:^|\n)\s*([A-D]|a-d)[\.:\)\s]\s*([^\n]+)/g);

    if (optionMatches && optionMatches.length >= 2) {
      optionMatches.forEach((optStr, idx) => {
        // Tách nhãn A/B/C/D và nội dung
        const match = optStr.trim().match(/^([A-D]|a-d)[\.:\)\s]\s*(.+)/i);
        if (match) {
          const isMarkedCorrect = optStr.includes('*') || optStr.toLowerCase().includes('[x]');
          const optText = match[2].replace(/^[\*✓\s]+/, '').trim();
          options.push(optText);
          if (isMarkedCorrect) {
            correctAnswer = idx;
          }
        }
      });
    }

    // Tìm dòng "Đáp án: A" hoặc "Key: B" hoặc "Đáp án đúng: C"
    const keyMatch = trimmed.match(/(?:đáp án|key|đáp án đúng|câu trả lời đúng)[\s:\-=]*([A-D1-4])/i);
    if (keyMatch) {
      const keyChar = keyMatch[1].toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(keyChar)) {
        correctAnswer = keyChar.charCodeAt(0) - 65;
      } else if (['1', '2', '3', '4'].includes(keyChar)) {
        correctAnswer = parseInt(keyChar) - 1;
      }
    }

    // Tìm phần giải thích / Hướng dẫn giải nếu có
    const expMatch = trimmed.match(/(?:giải thích|lời giải|hướng dẫn|explanation)[\s:\-=]*([^\n]+)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
    }

    if (options.length >= 2) {
      // Đảm bảo đủ 4 đáp án nếu thiếu
      while (options.length < 4) {
        options.push(`Phương án ${String.fromCharCode(65 + options.length)} (Không bắt buộc)`);
      }

      questions.push({
        id: `extracted-${questions.length + 1}`,
        question: questionLine,
        options: options.slice(0, 4),
        correctAnswer: Math.min(correctAnswer, 3),
        explanation: explanation || `Đáp án đúng là ${String.fromCharCode(65 + correctAnswer)}.`,
      });
    }
  }

  return questions;
}

/**
 * 2. Smart NLP Generator: Biến văn bản THÔ liên tục thành các câu hỏi trắc nghiệm
 * Tách từng câu/đoạn, phân tích các mệnh đề thực thể, định nghĩa, số liệu, tính chất
 */
function generateQuestionsFromRawText(text, maxQuestions = 500) {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 250);

  if (sentences.length === 0) return [];

  const questions = [];
  const targetCount = Math.min(sentences.length, maxQuestions);

  for (let i = 0; i < targetCount; i++) {
    const sentence = sentences[i];

    // Tạo các dạng câu hỏi khác nhau từ câu văn
    const quizItem = createQuizFromSentence(sentence, i, sentences);
    if (quizItem) {
      questions.push(quizItem);
    }
  }

  return questions;
}

/**
 * Tạo 1 câu hỏi từ 1 câu văn thô
 */
function createQuizFromSentence(sentence, index, allSentences) {
  // Tìm cụm từ quan trọng hoặc số/tên riêng
  const words = sentence.split(/\s+/);
  if (words.length < 5) return null;

  // Dạng 1: Định nghĩa "X là Y" -> Hỏi "X là gì?"
  const isMatch = sentence.match(/^([^là]+)\s+là\s+(.+)$/i);
  if (isMatch) {
    const subject = isMatch[1].trim();
    const definition = isMatch[2].trim();

    const wrongDefs = getRandomDistractors(definition, allSentences, index);

    const options = [definition, ...wrongDefs];
    // Trộn ngẫu nhiên
    const shuffled = shuffleOptions(options, 0);

    return {
      id: `gen-${index + 1}`,
      question: `Theo tài liệu, "${subject}" có nghĩa là gì?`,
      options: shuffled.options,
      correctAnswer: shuffled.correctIndex,
      explanation: `Nội dung tài liệu nêu rõ: ${sentence}`,
    };
  }

  // Dạng 2: Điền vào chỗ trống (Blank fill)
  // Chọn 1 cụm từ quan trọng ở giữa câu để che lại
  const midIndex = Math.floor(words.length / 2);
  const keyword = words.slice(midIndex, midIndex + 2).join(' ').replace(/[.,!?]/g, '');

  if (keyword.length > 2) {
    const maskedSentence = sentence.replace(keyword, '_______');
    const wrongKeywords = getDistractorKeywords(keyword, allSentences);

    const options = [keyword, ...wrongKeywords];
    const shuffled = shuffleOptions(options, 0);

    return {
      id: `gen-${index + 1}`,
      question: `Điền từ còn thiếu vào khoảng trống: "${maskedSentence}"`,
      options: shuffled.options,
      correctAnswer: shuffled.correctIndex,
      explanation: `Câu hoàn chỉnh trong tài liệu: "${sentence}"`,
    };
  }

  // Dạng 3: Xác định thông tin đúng theo tài liệu
  const wrongOptions = [
    `Thông tin này không được đề cập trong văn bản.`,
    `Nội dung trái ngược hoàn toàn với tài liệu ban đầu.`,
    `Thông tin chỉ đúng một phần trong điều kiện đặc biệt.`,
  ];
  const options = [sentence, ...wrongOptions];
  const shuffled = shuffleOptions(options, 0);

  return {
    id: `gen-${index + 1}`,
    question: `Nội dung nào sau đây ĐÚNG theo tài liệu đã cung cấp?`,
    options: shuffled.options,
    correctAnswer: shuffled.correctIndex,
    explanation: `Trích dẫn từ tài liệu: "${sentence}"`,
  };
}

/**
 * Xáo trộn đáp án & giữ vết chỉ số đáp án đúng
 */
export function shuffleOptions(options, correctIndex) {
  const correctOptionText = options[correctIndex];
  const items = options.map((opt, idx) => ({ text: opt, isCorrect: idx === correctIndex }));

  // Fisher-Yates shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const newOptions = items.map(item => item.text);
  const newCorrectIndex = items.findIndex(item => item.isCorrect);

  return {
    options: newOptions,
    correctIndex: newCorrectIndex,
  };
}

/**
 * Tùy chọn xáo trộn toàn bộ bộ câu hỏi & các đáp án mỗi lần bắt đầu bài thi
 */
export function prepareQuizWithShuffledAnswers(questionsList) {
  return questionsList.map((q) => {
    const shuffled = shuffleOptions(q.options, q.correctAnswer);
    return {
      ...q,
      options: shuffled.options,
      correctAnswer: shuffled.correctIndex,
    };
  });
}

function getRandomDistractors(correctText, allSentences, currentIndex) {
  const distractors = [];
  for (let i = 0; i < allSentences.length; i++) {
    if (i !== currentIndex && distractors.length < 3) {
      distractors.push(allSentences[i].substring(0, 80) + '...');
    }
  }

  while (distractors.length < 3) {
    distractors.push(`Phương án gây nhiễu ${distractors.length + 1}`);
  }

  return distractors;
}

function getDistractorKeywords(correctKey, allSentences) {
  const distractors = ['tính chất', 'yếu tố', 'phương pháp', 'khái niệm', 'kết quả', 'đặc điểm'];
  const filtered = distractors.filter(d => d.toLowerCase() !== correctKey.toLowerCase());
  return filtered.slice(0, 3);
}
