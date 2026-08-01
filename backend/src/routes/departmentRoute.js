import express from 'express';
import {
  createDepartment,
  listDepartmentsForSchool,
  createOrAssignHod,
  createHodAssistant,
  listCoursesForDepartment,
  courseLeaderboardForDepartment,
  updateDepartment,
  deleteDepartment,
  listStudentsForDepartment,
  listTeachersForDepartment,
  getDepartmentsForMe,
  getDepartmentsBySchoolPublic
} from '../controllers/departmentController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create department (admin only)
router.post('/', protect, restrictTo('admin','superadmin'), createDepartment);
// List departments for a school
router.get('/school/:id', protect, restrictTo('admin','hod','hod_assistant','superadmin'), listDepartmentsForSchool);
// Create/assign HOD
router.post('/:id/hod', protect, restrictTo('admin','superadmin'), createOrAssignHod);
// Create HOD assistant
router.post('/:id/assistant', protect, restrictTo('admin','superadmin'), createHodAssistant);
// Update department info
router.patch('/:id', protect, restrictTo('admin','superadmin'), updateDepartment);
// Delete department
router.delete('/:id', protect, restrictTo('admin','superadmin'), deleteDepartment);
// List courses in department (paginated)
router.get('/:id/courses', protect, restrictTo('admin','hod','superadmin'), listCoursesForDepartment);
// HOD: list teachers in department (paginated)
router.get('/:id/teachers', protect, restrictTo('admin','hod','superadmin'), listTeachersForDepartment);
// HOD: list students enrolled in published courses (paginated)
router.get('/:id/students', protect, restrictTo('admin','hod','superadmin'), listStudentsForDepartment);
// Course leaderboard inside department
router.get('/:id/courses/:courseId/leaderboard', protect, restrictTo('admin','hod','teacher','superadmin'), courseLeaderboardForDepartment);

// Protected convenient endpoint: departments for logged-in user's school
router.get('/me', protect, getDepartmentsForMe);
// Public: list departments by school id (no auth required)
router.get('/public/school/:id', getDepartmentsBySchoolPublic);

export default router;
