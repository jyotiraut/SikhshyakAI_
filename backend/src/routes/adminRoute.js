import express from 'express';
import {  getAllUsers,getUser,deleteUser,updateUser, getSuperadminDashboardStats, getAdminDashboardStats, getHODDashboardStats, getTeacherDashboardStats, getStudentDashboardStats, getRecentCourses } from '../controllers/userController.js';

import { protect, restrictTo } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

router.use(protect);

// Superadmin dashboard stats route
router.get('/dashboard/stats',restrictTo('superadmin') , getSuperadminDashboardStats);

// Admin dashboard stats route
router.get('/dashboard/admin-stats', restrictTo('admin'), getAdminDashboardStats);

// HOD dashboard stats route
router.get('/dashboard/hod-stats', restrictTo('hod'), getHODDashboardStats);

// Teacher dashboard stats route
router.get('/dashboard/teacher-stats', restrictTo('teacher'), getTeacherDashboardStats);

// Student dashboard stats route
router.get('/dashboard/student-stats', restrictTo('student'), getStudentDashboardStats);

// Recent courses route (all authenticated users)
router.get('/courses/recent', getRecentCourses);

router.use(restrictTo('admin'));

router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);


export default router;