import express from 'express';
import {
  createSchool,
  getAllSchools,
  getSchool,
  updateSchool,
  deleteSchool,
  createAdminForSchool,
  setSchoolVerified,
  setSchoolBlocked,
  setAdminBlocked,
  deleteAdmin,
  getAdminsForSchool,
  getAllAdmins,
  listCoursesForSchool
} from '../controllers/schoolController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { sameSchoolOrSuperAdmin } from '../middlewares/tenantMiddleware.js';

const router = express.Router();

// Superadmin creates and lists schools
router.route('/').post(protect, restrictTo('superadmin'), createSchool).get(getAllSchools);

// Global admins list (must come before '/:id' to avoid route param conflicts)
router.route('/admins').get(protect, restrictTo('superadmin'), getAllAdmins);

// School-level actions
router.route('/:id')
  .get(protect, sameSchoolOrSuperAdmin, getSchool)
  .put(protect, restrictTo('superadmin'), updateSchool)
  .delete(protect, restrictTo('superadmin'), deleteSchool);

// Admin management for a school
router.route('/:id/admins').post(protect, restrictTo('superadmin'), createAdminForSchool).get(protect, restrictTo('superadmin'), getAdminsForSchool);

router.route('/:id/verify').post(protect, restrictTo('superadmin'), setSchoolVerified);
router.route('/:id/block').post(protect, restrictTo('superadmin'), setSchoolBlocked);
router.route('/:id/admins/:adminId/block').post(protect, restrictTo('superadmin'), setAdminBlocked);
router.route('/:id/admins/:adminId').delete(protect, restrictTo('superadmin'), deleteAdmin);
router.route('/:id/courses').get(protect, sameSchoolOrSuperAdmin, listCoursesForSchool);

export default router;
