import mammoth from 'mammoth';

// =============================================
// AutoQuiz File Parser & Smart Quiz Generator
// Hỗ trợ: .docx, .txt, .md, .json, dán văn bản thô
// Hỗ trợ tới 500 câu hỏi
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
      // Fallback
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
 * Phân tích văn bản thành bộ câu hỏi (Lên tới 500 câu)
 */
export function convertTextToQuiz(rawText, maxQuestions = 500) {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();

  // 1. Thử bóc tách theo định dạng câu hỏi trắc nghiệm sẵn có
  const existingQuestions = extractExistingQuestions(text);

  if (existingQuestions.length > 0) {
    return existingQuestions.slice(0, maxQuestions);
  }

  // 2. Nếu là văn bản thô liên tục -> Dùng Smart NLP Generator
  return generateQuestionsFromRawText(text, maxQuestions);
}

/**
 * Bóc tách siêu chính xác các tài liệu thi có sẵn (Word/DOCX/TXT)
 * Xử lý: "Câu 1:", "Question 1:", "1.", "1/", "1)", năm 1978/1979 không bị ngắt nhầm,
 * tùy chọn đáp án nằm trên cùng 1 dòng hoặc nhiều dòng, bảng đáp án ở cuối bài.
 */
function extractExistingQuestions(rawText) {
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ');

  // Bảng đáp án ở cuối tài liệu (ví dụ: "ĐÁP ÁN: 1.A 2.B 3.C...")
  const answerKeyMap = extractAnswerKeyMap(text);

  // Regex nhận diện đầu câu hỏi:
  // Khớp: "Câu 1:", "Câu 1.", "Câu 1 -", "Question 1", "Bài 1", "1.", "1)", "1/"
  // Giới hạn số câu 1-3 chữ số (\d{1,3}) để không khớp nhầm với năm như 1978. hay 1979.
  const questionHeaderRegex = /(?:^|\n)\s*(?:(?:câu|question|bài|câu hỏi)\s*\d+|\d{1,3}\s*[\.:\/\)-])\s*/gi;

  const matches = [];
  let match;
  while ((match = questionHeaderRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      headerText: match[0].trim(),
    });
  }

  // Nếu không tìm thấy bằng regex có tiền tố, thử tìm theo chỉ số dòng có dạng "1. ", "2. "
  if (matches.length === 0) {
    const lineMatches = [];
    const lines = text.split('\n');
    let currPos = 0;
    lines.forEach((line) => {
      const lineTrim = line.trim();
      if (/^(?:\d{1,3})[\.:\/\)-]\s+/.test(lineTrim)) {
        lineMatches.push({
          index: currPos,
          length: lineTrim.length,
          headerText: lineTrim,
        });
      }
      currPos += line.length + 1;
    });

    if (lineMatches.length > 0) {
      matches.push(...lineMatches);
    }
  }

  if (matches.length === 0) return [];

  const questions = [];

  for (let i = 0; i < matches.length; i++) {
    const startPos = matches[i].index;
    const endPos = (i < matches.length - 1) ? matches[i + 1].index : text.length;

    const blockText = text.substring(startPos, endPos).trim();
    if (!blockText) continue;

    // Trích xuất số câu hỏi để đối chiếu bảng đáp án nếu có
    const qNumMatch = blockText.match(/^(?:câu|question|bài|câu hỏi)?\s*(\d{1,3})/i);
    const qNum = qNumMatch ? parseInt(qNumMatch[1]) : i + 1;

    // Tách phần tên câu hỏi và phần các lựa chọn A, B, C, D
    // Tìm các vị trí xuất hiện của A., B., C., D. hoặc A), B), C), D)
    const optionRegex = /(?:^|\s+)([A-D])[\.:\)\s]\s*/g;
    const optMatches = [];
    let optMatch;
    while ((optMatch = optionRegex.exec(blockText)) !== null) {
      optMatches.push({
        index: optMatch.index,
        length: optMatch[0].length,
        char: optMatch[1].toUpperCase(),
      });
    }

    let questionTitle = blockText;
    const options = [];
    let correctAnswer = answerKeyMap[qNum] !== undefined ? answerKeyMap[qNum] : 0;
    let explanation = '';

    if (optMatches.length >= 2) {
      // Tên câu hỏi là từ đầu khối đến vị trí đáp án A đầu tiên
      questionTitle = blockText.substring(0, optMatches[0].index)
        .replace(/^(?:câu|question|bài|câu hỏi)?\s*\d+[\.:\/\)-]\s*/i, '')
        .trim();

      // Cắt từng lựa chọn
      for (let j = 0; j < optMatches.length; j++) {
        const currentOpt = optMatches[j];
        const nextOptIndex = (j < optMatches.length - 1) ? optMatches[j + 1].index : blockText.length;

        let optContent = blockText.substring(currentOpt.index + currentOpt.length, nextOptIndex).trim();

        // Kiểm tra xem lựa chọn có chứa ký hiệu đáp án đúng không (* hoặc ✓ hoặc [x])
        if (optContent.includes('*') || optContent.includes('✓') || optContent.toLowerCase().includes('[x]')) {
          correctAnswer = options.length;
          optContent = optContent.replace(/[\*✓]/g, '').replace(/\[x\]/gi, '').trim();
        }

        // Kiểm tra nếu có ghi "Đáp án: A" cuối dòng
        const ansMatch = optContent.match(/(?:đáp án|key|đáp án đúng|câu trả lời đúng)[\s:\-=]*([A-D1-4])/i);
        if (ansMatch) {
          const keyChar = ansMatch[1].toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(keyChar)) {
            correctAnswer = keyChar.charCodeAt(0) - 65;
          }
          optContent = optContent.split(/(?:đáp án|key|đáp án đúng)/i)[0].trim();
        }

        const expMatch = optContent.match(/(?:giải thích|lời giải|hướng dẫn|explanation)[\s:\-=]*([^\n]+)/i);
        if (expMatch) {
          explanation = expMatch[1].trim();
          optContent = optContent.split(/(?:giải thích|lời giải|hướng dẫn|explanation)/i)[0].trim();
        }

        options.push(optContent);
      }
    } else {
      // Nếu không tìm thấy A, B, C, D bằng regex chuẩn, thử tìm theo dòng
      const lines = blockText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 3) {
        questionTitle = lines[0].replace(/^(?:câu|question|bài|câu hỏi)?\s*\d+[\.:\/\)-]\s*/i, '').trim();
        for (let l = 1; l < lines.length; l++) {
          const line = lines[l];
          if (/^[A-D][\.:\)\s]/i.test(line)) {
            options.push(line.replace(/^[A-D][\.:\)\s]\s*/i, '').trim());
          }
        }
      }
    }

    // Kiểm tra trong cả khối có "Đáp án: A"
    const blockAnsMatch = blockText.match(/(?:đáp án|key|đáp án đúng)[\s:\-=]*([A-D])/i);
    if (blockAnsMatch) {
      correctAnswer = blockAnsMatch[1].toUpperCase().charCodeAt(0) - 65;
    }

    if (questionTitle && options.length >= 2) {
      // Đảm bảo đủ 4 đáp án
      while (options.length < 4) {
        options.push(`Phương án ${String.fromCharCode(65 + options.length)}`);
      }

      questions.push({
        id: `extracted-${questions.length + 1}`,
        question: questionTitle,
        options: options.slice(0, 4),
        correctAnswer: Math.min(Math.max(0, correctAnswer), 3),
        explanation: explanation || `Đáp án đúng là ${String.fromCharCode(65 + correctAnswer)}.`,
      });
    }
  }

  return questions;
}

/**
 * Trích xuất bảng đáp án ở cuối bài (nếu có): e.g. "1.A 2.B 3.C 4.D" hoặc "1-A 2-B"
 */
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

/**
 * Smart NLP Generator cho văn bản thô
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

  const newOptions = items.map(item => item.text);
  const newCorrectIndex = items.findIndex(item => item.isCorrect);

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
  const filtered = distractors.filter(d => d.toLowerCase() !== correctKey.toLowerCase());
  return filtered.slice(0, 3);
}
