// routes/tutorialAssignmentRoute.js
import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { assignTutorial, completeTutorial } from '../controllers/tutorialAssignmentController.js';

const router = express.Router();
router.use(protect);

router.post('/assign', restrictTo('teacher','admin'), assignTutorial);
router.post('/:id/complete', completeTutorial); // student posts completion

export default router;
