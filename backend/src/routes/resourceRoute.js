// routes/resourceRoute.js
import express from 'express';
import upload from '../middlewares/multerMiddleware.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { uploadResource, listResourcesForUnit } from '../controllers/resourceController.js';

const router = express.Router();

router.use(protect);
router.post('/', restrictTo('teacher','admin'), upload.single('file'), uploadResource);
router.get('/', listResourcesForUnit);

export default router;
