import Quiz from '../models/quizModel.js';
import QuizSubmission from '../models/quizSubmissionModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create a submission document for a quiz attempt
export const submitQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { answers = [] } = req.body; // [{ questionIndex, answerIndex, textAnswer }]

  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ status: 'error', message: 'Quiz not found' });

  const total = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
  const details = [];
  let score = 0;

  if (total > 0 && Array.isArray(answers)) {
    for (const a of answers) {
      const qi = a.questionIndex;
      if (qi == null || qi < 0 || qi >= total) continue;
      const q = quiz.questions[qi];
      const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : undefined;
      const isCorrect = typeof a.answerIndex === 'number' && typeof correctIdx === 'number' && a.answerIndex === correctIdx;
      if (isCorrect) score += 1;
      details.push({ questionIndex: qi, correct: !!isCorrect, correctAnswer: correctIdx });
    }
  }

  const submission = await QuizSubmission.create({
    quiz: quiz._id,
    course: quiz.course,
    unit: quiz.unit,
    submittedBy: req.user?.id,
    answers,
    score,
    total,
    details
  });

  res.status(201).json({ status: 'success', data: { submission } });
});
