import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { listTutorialSubmissions, gradeTutorialSubmission, courseLeaderboard } from '../controllers/teacherController.js';

const router = express.Router();
router.use(protect, restrictTo('teacher','admin'));

// View tutorial submissions for a course (paginated)
router.get('/courses/:courseId/tutorial-submissions', listTutorialSubmissions);

// Grade a tutorial submission
router.put('/tutorial-submissions/:submissionId/grade', gradeTutorialSubmission);

// Course leaderboard
router.get('/courses/:courseId/leaderboard', courseLeaderboard);

export default router;
