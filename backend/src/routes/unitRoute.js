import express from 'express';
import upload from '../middlewares/multerMiddleware.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { createUnit, createUnitWithPdf, attachPdfToUnit, listUnitsByCourse, updateUnit, deleteUnit, createUnitResourceFromPdf, updateUnitText, deleteUnitFile } from '../controllers/unitController.js';

const router = express.Router();

router.use(protect);

// create unit skeleton
router.post('/', restrictTo('teacher','admin'), createUnit);

// create unit with PDF (FormData)
router.post('/with-pdf', restrictTo('teacher','admin'), upload.single('file'), createUnitWithPdf);

// create unit resource from PDF (FormData: unitId + file)
router.post('/resource', restrictTo('teacher','admin'), upload.single('file'), createUnitResourceFromPdf);

// attach/replace pdf to a unit
router.post('/:unitId/pdf', restrictTo('teacher','admin'), upload.single('file'), attachPdfToUnit);

// list units by course
router.get('/course/:courseId', listUnitsByCourse);

// update unit
router.put('/:unitId', restrictTo('teacher','admin'), updateUnit);

// delete unit
router.delete('/:unitId', restrictTo('teacher','admin'), deleteUnit);

// delete a specific file entry from unit.files
router.delete('/:unitId/files/:fileIndex', restrictTo('teacher','admin'), deleteUnitFile);

// update unit text (outlineText or file textExtract)
router.put('/:unitId/text', restrictTo('teacher','admin'), updateUnitText);

export default router;
