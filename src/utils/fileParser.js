import mammoth from 'mammoth';

// =============================================
// AutoQuiz File Parser & Smart Quiz Generator
// Hỗ trợ: .docx (nhận diện tô vàng/highlight đáp án đúng),
// .txt, .md, .json, dán văn bản thô
// Hỗ trợ quy mô tới 500 câu hỏi
// =============================================

/**
 * Đọc nội dung từ File (.docx, .txt, .md, .json)
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
      // Fallback
    }
    return { type: 'text', content: text };
  }

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();

    // Cấu hình styleMap để chuyển đổi phần TÔ VÀNG (Highlight) trong Word thành thẻ <mark>
    const options = {
      styleMap: [
        "highlight => mark",
        "r[style-name='Highlight'] => mark",
        "b => strong",
        "u => u"
      ]
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    const html = result.value;

    // Phân tích trực tiếp từ HTML để giữ lại chính xác ĐÁP ÁN TÔ VÀNG
    const docxQuestions = parseDocxHtml(html);
    if (docxQuestions.length > 0) {
      return { type: 'parsed_quiz', questions: docxQuestions };
    }

    // Nếu không parse được từ HTML thì lấy raw text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    return { type: 'text', content: textResult.value };
  }

  // default .txt, .md, text files
  const text = await file.text();
  return { type: 'text', content: text };
}

/**
 * Phân tích HTML chuyển đổi từ file DOCX
 * Nhận diện chính xác 100% ĐÁP ÁN TÔ VÀNG (<mark>) hoặc in đậm (<strong>)
 */
export function parseDocxHtml(html) {
  if (!html || !html.trim()) return [];

  const questions = [];

  // Tách theo các thẻ tiêu đề H1-H6 hoặc P chứa "Câu X."
  const blocks = html.split(/(?=(?:<h[1-6]>|<p>)(?:<strong>)?\s*(?:câu|question|bài)\s*\d+[\.:\/\)-])/gi);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Lấy tiêu đề câu hỏi
    const qMatch = block.match(/^(?:<h[1-6]>|<p>)\s*(?:<strong>)?\s*(?:câu|question|bài)?\s*\d*[\.:\/\)-]?\s*([\s\S]*?)(?:<\/strong>)?(?:<\/h[1-6]>|<\/p>)/i);
    if (!qMatch) continue;

    const questionTitle = qMatch[1].replace(/<[^>]+>/g, '').trim();
    if (!questionTitle) continue;

    const options = [];
    let correctAnswer = 0;

    // 1. Kiểm tra danh sách <ol><li>...</li></ol> hoặc <ul><li>...</li></ul>
    const liMatches = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];

    if (liMatches.length >= 2) {
      liMatches.forEach((liMatch, idx) => {
        const liContent = liMatch[1];
        // Nhận diện đáp án tô vàng (<mark>)
        const isHighlighted = /<mark/i.test(liContent);
        if (isHighlighted) {
          correctAnswer = idx;
        }
        const cleanText = liContent.replace(/<[^>]+>/g, '').trim();
        options.push(cleanText);
      });
    } else {
      // 2. Các đáp án nằm trong các thẻ <p>
      const pMatches = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
      const optParagraphs = pMatches.slice(1);

      optParagraphs.forEach((pMatch) => {
        const pContent = pMatch[1];
        const isHighlighted = /<mark/i.test(pContent);
        if (isHighlighted) {
          correctAnswer = options.length;
        }
        const cleanText = pContent.replace(/<[^>]+>/g, '').trim();
        if (cleanText) {
          options.push(cleanText);
        }
      });
    }

    if (options.length >= 2) {
      while (options.length < 4) {
        options.push(`Phương án ${String.fromCharCode(65 + options.length)}`);
      }

      questions.push({
        id: `extracted-${questions.length + 1}`,
        question: questionTitle,
        options: options.slice(0, 4),
        correctAnswer: Math.min(Math.max(0, correctAnswer), 3),
        explanation: `Đáp án đúng (được tô vàng trong file): ${String.fromCharCode(65 + correctAnswer)}.`,
      });
    }
  }

  return questions;
}

/**
 * Phân tích văn bản thô (.txt, .md hoặc dán text)
 */
export function convertTextToQuiz(rawText, maxQuestions = 500) {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();

  // 1. Thử bóc tách theo dạng trắc nghiệm
  const existingQuestions = extractExistingQuestions(text);

  if (existingQuestions.length > 0) {
    return existingQuestions.slice(0, maxQuestions);
  }

  // 2. Dùng Smart NLP Generator cho văn bản chưa dạng A, B, C, D
  return generateQuestionsFromRawText(text, maxQuestions);
}

/**
 * Bóc tách trắc nghiệm văn bản thô
 */
export function extractExistingQuestions(rawText) {
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ');

  const answerKeyMap = extractAnswerKeyMap(text);
  const headerRegex = /(?:^|\n)\s*(?:(?:câu|question|bài|câu hỏi)\s*\d+|\d{1,3}\s*[\.:\/\)-])\s*/gi;

  const matches = [];
  let m;
  while ((m = headerRegex.exec(text)) !== null) {
    matches.push({
      index: m.index,
      length: m[0].length,
      text: m[0].trim(),
    });
  }

  const questions = [];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const startPos = matches[i].index + matches[i].length;
      const endPos = (i < matches.length - 1) ? matches[i + 1].index : text.length;

      const blockText = text.substring(startPos, endPos).trim();
      if (!blockText) continue;

      const lines = blockText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      let questionTitle = lines[0].replace(/^[\.\s:\/\)-]+/, '').trim();
      let options = [];

      const hasABCD = /(?:^|\s+)[A-D][\.:\)\s]/i.test(blockText);

      if (hasABCD) {
        const optRegex = /(?:^|\s+)([A-D])[\.:\)\s]\s*/gi;
        const optMatches = [];
        let om;
        while ((om = optRegex.exec(blockText)) !== null) {
          optMatches.push({ index: om.index, length: om[0].length, letter: om[1].toUpperCase() });
        }

        if (optMatches.length >= 2) {
          questionTitle = blockText.substring(0, optMatches[0].index)
            .replace(/^[\.\s:\/\)-]+/, '')
            .trim();

          for (let j = 0; j < optMatches.length; j++) {
            const current = optMatches[j];
            const nextIndex = (j < optMatches.length - 1) ? optMatches[j + 1].index : blockText.length;
            const optVal = blockText.substring(current.index + current.length, nextIndex).trim();
            options.push(optVal);
          }
        }
      }

      if (options.length < 2 && lines.length >= 2) {
        options = lines.slice(1);
      }

      const qNum = questions.length + 1;
      let correctAnswer = answerKeyMap[qNum] !== undefined ? answerKeyMap[qNum] : 0;
      let explanation = '';

      options.forEach((optStr, idx) => {
        if (optStr.includes('*') || optStr.includes('✓') || optStr.toLowerCase().includes('[x]')) {
          correctAnswer = idx;
        }
      });

      const cleanOpts = options.map((o) => {
        let cleaned = o.replace(/[\*✓]/g, '').replace(/\[x\]/gi, '').trim();
        cleaned = cleaned.split(/(?:đáp án|key|đáp án đúng|hướng dẫn|giải thích)/i)[0].trim();
        return cleaned;
      });

      const ansMatch = blockText.match(/(?:đáp án|key|đáp án đúng|câu trả lời đúng)[\s:\-=]*([A-D])/i);
      if (ansMatch) {
        correctAnswer = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
      }

      const expMatch = blockText.match(/(?:giải thích|lời giải|hướng dẫn|explanation)[\s:\-=]*([^\n]+)/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
      }

      while (cleanOpts.length < 4) {
        cleanOpts.push(`Phương án ${String.fromCharCode(65 + cleanOpts.length)}`);
      }

      if (questionTitle && cleanOpts.length >= 2) {
        questions.push({
          id: `extracted-${qNum}`,
          question: questionTitle,
          options: cleanOpts.slice(0, 4),
          correctAnswer: Math.min(Math.max(0, correctAnswer), 3),
          explanation: explanation || `Đáp án đúng là ${String.fromCharCode(65 + correctAnswer)}.`,
        });
      }
    }

    return questions;
  }

  return [];
}

function extractAnswerKeyMap(text) {
  const map = {};
  const sectionMatch = text.match(/(?:bảng đáp án|đáp án|danh sách đáp án)[\s\S]*$/i);
  const searchArea = sectionMatch ? sectionMatch[0] : text;

  const keyMatches = searchArea.matchAll(/(?:câu\s*)?(\d{1,3})[\s:\.\-]*([A-D])\b/gi);
  for (const m of keyMatches) {
    const qNum = parseInt(m[1]);
    const ansChar = m[2].toUpperCase();
    map[qNum] = ansChar.charCodeAt(0) - 65;
  }
  return map;
}

function generateQuestionsFromRawText(text, maxQuestions = 500) {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 250);

  if (sentences.length === 0) return [];

  const questions = [];
  const targetCount = Math.min(sentences.length, maxQuestions);

  for (let i = 0; i < targetCount; i++) {
    const sentence = sentences[i];
    const quizItem = createQuizFromSentence(sentence, i, sentences);
    if (quizItem) {
      questions.push(quizItem);
    }
  }

  return questions;
}

function createQuizFromSentence(sentence, index, allSentences) {
  const words = sentence.split(/\s+/);
  if (words.length < 5) return null;

  const isMatch = sentence.match(/^([^là]+)\s+là\s+(.+)$/i);
  if (isMatch) {
    const subject = isMatch[1].trim();
    const definition = isMatch[2].trim();
    const wrongDefs = getRandomDistractors(definition, allSentences, index);
    const options = [definition, ...wrongDefs];
    const shuffled = shuffleOptions(options, 0);

    return {
      id: `gen-${index + 1}`,
      question: `Theo tài liệu, "${subject}" có nghĩa là gì?`,
      options: shuffled.options,
      correctAnswer: shuffled.correctIndex,
      explanation: `Nội dung tài liệu nêu rõ: ${sentence}`,
    };
  }

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

export function shuffleOptions(options, correctIndex) {
  const items = options.map((opt, idx) => ({ text: opt, isCorrect: idx === correctIndex }));

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const newOptions = items.map((item) => item.text);
  const newCorrectIndex = items.findIndex((item) => item.isCorrect);

  return {
    options: newOptions,
    correctIndex: newCorrectIndex,
  };
}

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
  const filtered = distractors.filter((d) => d.toLowerCase() !== correctKey.toLowerCase());
  return filtered.slice(0, 3);
}
