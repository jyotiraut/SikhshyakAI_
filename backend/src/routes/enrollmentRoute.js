// routes/enrollmentRoute.js
import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { enroll, getEnrollment, enrollByCode, markCourseCompleted } from '../controllers/enrollmentController.js';

const router = express.Router();
router.use(protect);

router.post('/', enroll); // student self enroll
router.post('/by-code', enrollByCode); // student enroll using code
router.get('/', restrictTo('teacher','admin'), getEnrollment);
router.patch('/:courseId/complete', restrictTo('student'), markCourseCompleted); // student marks course as completed

export default router;
