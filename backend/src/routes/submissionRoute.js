// routes/submissionRoute.js
import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { submitAssessment, getSubmission } from '../controllers/submissionController.js';

const router = express.Router();

router.use(protect);

router.post('/:assessmentId/submit', submitAssessment); // student submits answers
router.get('/:id', restrictTo('teacher','admin'), getSubmission);

export default router;
