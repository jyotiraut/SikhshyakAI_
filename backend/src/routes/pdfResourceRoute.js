import express from 'express';
import upload from '../middlewares/multerMiddleware.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { uploadPdf, updatePdf, deletePdf } from '../controllers/pdfResourceController.js';

const router = express.Router();

router.use(protect);

// Upload new PDF for a unit
router.post('/', restrictTo('teacher','admin'), upload.single('file'), uploadPdf);

// Update existing PDF by resourceId
router.put('/:resourceId', restrictTo('teacher','admin'), upload.single('file'), updatePdf);

// Delete existing PDF by resourceId
router.delete('/:resourceId', restrictTo('teacher','admin'), deletePdf);

export default router;
