// routes/assessmentRoute.js
import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import {
  generateAssessment,
  publishAssessment,
  getAssessmentForClient,
  listAssessmentsForUnit
} from '../controllers/assessmentController.js';

const router = express.Router();

router.use(protect);

router.post('/generate', restrictTo('teacher','admin'), generateAssessment);
router.post('/:id/publish', restrictTo('teacher','admin'), publishAssessment);

// serve masked assessment to students
router.get('/:id', protect, getAssessmentForClient);

router.get('/', listAssessmentsForUnit);

export default router;
