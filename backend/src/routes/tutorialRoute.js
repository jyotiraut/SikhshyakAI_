import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { generateTutorialForUnit, listTutorialsForUnit, getTutorialById, createTutorialManual, updateTutorial, deleteTutorial, getRandomTutorialQuestions, getRandomTutorialQuestionsFromAll, publishTutorial, getStudentTutorialSubmissions, getStudentSubmissionDetail } from '../controllers/tutorialController.js';

const router = express.Router();

router.use(protect);

// Student tutorial submissions
router.get('/submissions/my', restrictTo('student'), getStudentTutorialSubmissions);
router.get('/submissions/:submissionId', restrictTo('student'), getStudentSubmissionDetail);

// Generate and save tutorial for a unit (auto content)
router.post('/generate', restrictTo('teacher','admin'), generateTutorialForUnit);

// Manually create a tutorial (teacher)
router.post('/manual', restrictTo('teacher','admin'), createTutorialManual);

// List tutorials for a unit
router.get('/unit/:unitId', listTutorialsForUnit);

// Get random N questions from latest tutorial
router.get('/unit/:unitId/random', getRandomTutorialQuestions);

// Get random N questions across all tutorials for a unit
router.get('/unit/:unitId/random/all', getRandomTutorialQuestionsFromAll);

// Get a specific tutorial by id
router.get('/:tutorialId', getTutorialById);

// Update a tutorial (teacher)
router.put('/:tutorialId', restrictTo('teacher','admin'), updateTutorial);

// Delete a tutorial (teacher)
router.delete('/:tutorialId', restrictTo('teacher','admin'), deleteTutorial);

// Publish a tutorial (teacher/admin)
router.post('/:tutorialId/publish', restrictTo('teacher','admin'), publishTutorial);
// Allow PUT as well (some clients prefer idempotent publish)
router.put('/:tutorialId/publish', restrictTo('teacher','admin'), publishTutorial);

export default router;
