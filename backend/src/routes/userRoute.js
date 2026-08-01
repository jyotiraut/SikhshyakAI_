import express from 'express';
import { getAllUsers, getUser, updateUser, updateUserRole, updateMyRole, deleteUser } from '../controllers/userController.js';
import { getVerifiedSchools } from '../controllers/schoolController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();


 router.get('/schools', getVerifiedSchools);
// User routes
router.get('/', protect, restrictTo('admin','superadmin'), getAllUsers);
router.get('/:id', protect, getUser);
router.patch('/:id', protect, restrictTo('admin','superadmin'), updateUser);
router.delete('/:id', protect, restrictTo('admin','superadmin'), deleteUser);

// Update role specifically
// Any authenticated user can update their own role via token
// Place before param route to avoid matching 'me' as :id
router.patch('/me/role', protect, updateMyRole);

// Update any user's role by id (per request) — restricted to admin/superadmin
router.patch('/:id/role', protect, updateUserRole);

//profile Completion


export default router;
