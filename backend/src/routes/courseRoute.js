// routes/courseRoute.js
import express from 'express';
import upload from '../middlewares/multerMiddleware.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import {
  createCourse,
  getCourse,
  updateCourse,
  publishCourse,
  enrollStudent,
  listCourses,
  deleteCourse,
  getTeacherCourses
} from '../controllers/courseController.js';

const router = express.Router();

router.use(protect);

// create course (accepts outlineText or outlinePdf file)
router.post('/', restrictTo('teacher','admin'), upload.single('outlinePdf'), createCourse);

router.get('/', listCourses);
router.get('/my-courses', restrictTo('teacher','admin'), getTeacherCourses);
router.get('/:id', getCourse);
// update course (accepts JSON or form-data with outlinePdf)
router.patch('/:id', restrictTo('teacher','admin'), upload.single('outlinePdf'), updateCourse);
router.post('/:id/publish', restrictTo('teacher','admin'), publishCourse);

// enroll (teacher/admin or student self enroll)
router.post('/:id/enroll', protect, enrollStudent); // body: { courseId, studentId }
router.delete('/:id', restrictTo('teacher', 'admin'), deleteCourse);

export default router;
