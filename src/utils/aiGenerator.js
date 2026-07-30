// =============================================
// AutoQuiz - Gemini AI Quiz Generator
// Hỗ trợ tự động tạo câu hỏi từ bất kỳ đoạn văn bản nào
// =============================================

export async function generateQuizWithGemini(text, apiKey, questionCount = 10) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Vui lòng nhập Gemini API Key!');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const prompt = `
Bạn là một chuyên gia tạo đề thi trắc nghiệm. Hãy phân tích đoạn văn bản dưới đây và tạo ra chính xác ${questionCount} câu hỏi trắc nghiệm tiếng Việt.

YÊU CẦU ĐỊNH DẠNG:
Trả về KẾT QUẢ DƯỚI DẠNG MỘT MẢNG JSON CHUẨN (không kèm bất kỳ văn bản giải thích nào khác ngoài JSON, không bọc trong markdown codeblock nếu không cần thiết):

[
  {
    "id": "ai-1",
    "question": "Nội dung câu hỏi?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correctAnswer": 0,
    "explanation": "Giải thích chi tiết vì sao đáp án 0 đúng dựa theo văn bản."
  }
]

Lưu ý:
- "correctAnswer" là chỉ số số nguyên từ 0 đến 3 tương ứng với đáp án đúng trong mảng "options".
- Các lựa chọn sai phải có vẻ hợp lý nhưng không đúng với nội dung văn bản.
- Đảm bảo đủ 4 đáp án cho mỗi câu.

VĂN BẢN ĐẦU VÀO:
"""
${text.substring(0, 15000)}
"""
`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Không thể kết nối tới Gemini AI API');
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean JSON response string
    const jsonMatch = candidateText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('AI không trả về định dạng JSON hợp lệ.');
    }

    const questions = JSON.parse(jsonMatch[0]);
    return questions.map((q, idx) => ({
      ...q,
      id: `ai-${Date.now()}-${idx + 1}`,
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
    }));
  } catch (err) {
    throw new Error(`Lỗi tạo câu hỏi từ Gemini AI: ${err.message}`);
  }
}
