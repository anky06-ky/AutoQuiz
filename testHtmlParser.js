import mammoth from 'mammoth';
import fs from 'fs';

async function parseDocxHtml(buffer) {
  const options = {
    styleMap: [
      "highlight => mark",
      "r[style-name='Highlight'] => mark",
      "b => strong",
      "u => u"
    ]
  };

  const result = await mammoth.convertToHtml({ buffer }, options);
  const html = result.value;

  // Sử dụng parser nhẹ bóc tách DOM/HTML string
  const questions = [];

  // Tách theo các thẻ H1, H2, H3, H4, hoặc P chứa "Câu X."
  // Hoặc tách theo chuỗi HTML
  const blocks = html.split(/(?=(?:<h[1-6]>|<p>)(?:<strong>)?\s*(?:câu|question|bài)\s*\d+[.:/)-])/gi);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Lấy tên câu hỏi từ thẻ đầu tiên
    const qMatch = block.match(/^(?:<h[1-6]>|<p>)\s*(?:<strong>)?\s*(?:câu|question|bài)?\s*\d*[.:/)-]?\s*([\s\S]*?)(?:<\/strong>)?(?:<\/h[1-6]>|<\/p>)/i);
    if (!qMatch) continue;

    // Clean html tags in question title
    const questionTitle = qMatch[1].replace(/<[^>]+>/g, '').trim();
    if (!questionTitle) continue;

    // Tìm các thẻ <li> hoặc các đoạn văn bản lựa chọn
    const options = [];
    let correctAnswer = 0;

    // Trường hợp 1: Có danh sách <ol><li>...</li></ol> hoặc <ul><li>...</li></ul>
    const liMatches = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];

    if (liMatches.length >= 2) {
      liMatches.forEach((liMatch, idx) => {
        const liContent = liMatch[1];
        const isHighlighted = /<mark/i.test(liContent) || /<strong>/i.test(liContent) || /<u>/i.test(liContent);
        if (isHighlighted) {
          correctAnswer = idx;
        }
        // Clean HTML tags for option text
        const cleanText = liContent.replace(/<[^>]+>/g, '').trim();
        options.push(cleanText);
      });
    } else {
      // Trường hợp 2: Các lựa chọn nằm trong các thẻ <p>
      const pMatches = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
      // Bỏ qua thẻ <p> đầu tiên vì là tiêu đề câu hỏi
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

async function testDocxParser() {
  const buffer = fs.readFileSync('D:/THI-LSĐ.docx');
  const questions = await parseDocxHtml(buffer);

  console.log('====================================');
  console.log('TOTAL QUESTIONS EXTRACTED:', questions.length);
  console.log('====================================');

  if (questions.length > 0) {
    console.log('Câu 1:', questions[0]);
    console.log('Câu 2:', questions[1]);
    console.log('Câu 3:', questions[2]);
    console.log('Câu 4:', questions[3]);
    console.log('Câu 5:', questions[4]);
    console.log('Câu 120:', questions[questions.length - 1]);
  }
}

testDocxParser();
