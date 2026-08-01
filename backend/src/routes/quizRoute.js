import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { generateQuizForUnit, listQuizzesForUnit, getRandomQuestions, getQuizById, getRandomQuestionsFromAll, createQuizManual, updateQuiz, deleteQuiz, publishQuiz, unpublishQuiz } from '../controllers/quizController.js';
import { submitQuiz } from '../controllers/quizSubmissionController.js';

const router = express.Router();

router.use(protect);

// Generate and save quiz for a unit
router.post('/generate', restrictTo('teacher','admin'), generateQuizForUnit);

// Manually create a quiz (teacher)
router.post('/manual', restrictTo('teacher','admin'), createQuizManual);

// List quizzes for a unit
router.get('/unit/:unitId', listQuizzesForUnit);

// Get random N questions from latest quiz for a unit
router.get('/unit/:unitId/random', getRandomQuestions);

// Get random N questions across all quizzes for a unit
router.get('/unit/:unitId/random/all', getRandomQuestionsFromAll);

// Get a specific quiz by id (keep after /unit/* routes to avoid conflicts)
router.get('/:quizId', getQuizById);

// Update a quiz (teacher)
router.put('/:quizId', restrictTo('teacher','admin'), updateQuiz);

// Delete a quiz (teacher)
router.delete('/:quizId', restrictTo('teacher','admin'), deleteQuiz);

// Publish a quiz (teacher/admin)
router.post('/:quizId/publish', restrictTo('teacher','admin'), publishQuiz);

// Unpublish a quiz (teacher/admin)
router.post('/:quizId/unpublish', restrictTo('teacher','admin'), unpublishQuiz);

// Submit a quiz attempt (creates a submission doc)
router.post('/:quizId/submit', submitQuiz);

export default router;
