import { createHash } from 'node:crypto';

// Called inside the metadata transaction. Replacing the question set also
// removes deleted questions; batches avoid one network round trip per question.
export async function replaceQuizQuestions(connection, quizId, questions) {
  await connection.query('DELETE FROM questions WHERE quizId = ?', [quizId]);
  const namespace = createHash('sha256').update(quizId).digest('hex').slice(0, 32);
  const rows = questions.map((question, index) => [
    `q-${namespace}-${String(index + 1).padStart(6, '0')}`,
    quizId, question.question, ...Array.from({ length: 4 }, (_, position) => question.options[position] || ''), question.correctAnswer, question.explanation || '',
  ]);
  for (let offset = 0; offset < rows.length; offset += 250) {
    await connection.query('INSERT INTO questions (id, quizId, question, optionA, optionB, optionC, optionD, correctAnswer, explanation) VALUES ?', [rows.slice(offset, offset + 250)]);
  }
}
