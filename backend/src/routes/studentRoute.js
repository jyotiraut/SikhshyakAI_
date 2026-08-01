import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import {
  listPublishedCourses,
  listEnrolledCourses,
  listQuizzesForUnitStudent,
  submitQuizStudent,
  listTutorialsForUnitStudent,
  submitTutorialStudent,
  studentDashboard,
  initializeAdaptiveLearning,
  generateAdaptiveQuizStudent,
  submitAdaptiveQuizStudent,
  getAdaptiveProgress,
  getAdaptiveCourseProgress,
  getAdaptiveUnitProgress,
  getCourseInfo,
  getUnitInfo
} from '../controllers/studentController.js';
import upload from '../middlewares/multerMiddleware.js';

const router = express.Router();

// ================== PUBLIC ROUTES (NO AUTHENTICATION) ==================

// Get basic course information
router.get('/course/:courseId', getCourseInfo);

// Get basic unit information
router.get('/unit/:unitId', getUnitInfo);

// ================== PROTECTED ROUTES (REQUIRE AUTHENTICATION) ==================

router.use(protect);

// Published courses for students
router.get('/courses', listPublishedCourses);

// Courses the student is enrolled in
router.get('/my/courses', listEnrolledCourses);

// Quizzes (published courses only)
router.get('/units/:unitId/quizzes', listQuizzesForUnitStudent);
router.post('/quizzes/:quizId/submit', submitQuizStudent);

// Tutorials (published courses only)
router.get('/units/:unitId/tutorials', listTutorialsForUnitStudent);
router.post('/tutorials/:tutorialId/submit', upload.single('file'), submitTutorialStudent);

// Dashboard metrics
router.get('/dashboard', studentDashboard);

// ================== ADAPTIVE LEARNING ROUTES ==================

// 1. Initialize adaptive learning for a course
router.post('/adaptive/initialize', initializeAdaptiveLearning);

// 2. Generate adaptive quiz for a course + unit
router.post('/adaptive/generate-quiz', generateAdaptiveQuizStudent);

// 3. Submit adaptive quiz answer & get next question
router.post('/adaptive/submit-quiz', submitAdaptiveQuizStudent);

// 4. Get adaptive progress (all courses, or filtered by courseId query)
router.get('/adaptive/progress', getAdaptiveProgress);

// 5. Get adaptive progress for a specific course
router.get('/adaptive/progress/course/:courseId', getAdaptiveCourseProgress);

// 6. Get adaptive progress for a specific unit in a course
router.get('/adaptive/progress/course/:courseId/unit/:unitId', getAdaptiveUnitProgress);

export default router;
