import Unit from '../models/unitModel.js';
import Course from '../models/courseModel.js';
// Resource collection is optional; storing file URL and text directly on Unit
import { uploadToS3 } from '../utils/s3.js';
import { triggerEmbedding } from './ragController.js';
import pdf from 'pdf-parse';
import { r2 } from '../utils/s3.js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create a unit skeleton under a course
export const createUnit = async (req, res) => {
  try {
    const {
      courseId,
      unitNumber,
      title,
      description,
      outlineText,
      learningObjectives = [],
      teachingPlan = {},
      estimatedTime = {},
      // optional PDF/resource metadata when frontend uploads first
      fileUrl,
      fileName,
      mimeType,
      sizeBytes,
      textExtract
    } = req.body;
    //console.log('[Unit:create] Payload received', { courseId, unitNumber, title });
    const course = await Course.findById(courseId);
    if (!course) {
      console.warn('[Unit:create] Course not found', { courseId });
      return res.status(404).json({ status: 'error', message: 'Course not found' });
    }

    const unitPayload = {
      course: courseId,
      unitNumber: Number(unitNumber),
      title,
      description,
      outlineText,
      learningObjectives,
      teachingPlan,
      estimatedTime,
      quizzes: [],
      tutorials: [],
      labs: [],
      status: 'draft'
    };

    // If frontend already uploaded and provides fileUrl etc., create Resource and link
    if (fileUrl && fileName) {
      unitPayload.files = [
        {
          fileUrl,
          fileName,
          mimeType,
          sizeBytes,
          textExtract,
          uploadedBy: req.user?.id
        }
      ];
    }

    const unit = await Unit.create(unitPayload);
    //console.log('[Unit:create] Unit created', { unitId: unit._id, unitNumber: unit.unitNumber });

    // Auto-embed if textExtract exists
    if (textExtract && textExtract.trim().length > 0) {
      triggerEmbedding(unit._id.toString());
    }

    res.status(201).json({ status: 'success', data: { unit } });
  } catch (error) {
    console.error('[Unit:create] Error', { error: error?.message });
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create unit with PDF uploaded via FormData in one step
export const createUnitWithPdf = async (req, res) => {
  try {
    const {
      courseId,
      unitNumber,
      title,
      description,
      outlineText,
      learningObjectives = [],
      teachingPlan = {},
      estimatedTime = {}
    } = req.body;

    //console.log('[Unit:createWithPdf] Payload received', { courseId, unitNumber, title });
    const course = await Course.findById(courseId);
    if (!course) {
      console.warn('[Unit:createWithPdf] Course not found', { courseId });
      return res.status(404).json({ status: 'error', message: 'Course not found' });
    }

    if (!req.file) return res.status(400).json({ status: 'error', message: 'PDF file is required' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ status: 'error', message: 'Only PDF files are allowed' });

    // Normalize possible FormData string values
    const safeUnitNumber = Number(String(unitNumber).trim());
    let safeLearningObjectives = learningObjectives;
    let safeTeachingPlan = teachingPlan;
    let safeEstimatedTime = estimatedTime;

    try {
      if (typeof learningObjectives === 'string') {
        safeLearningObjectives = JSON.parse(learningObjectives);
      }
    } catch {}
    try {
      if (typeof teachingPlan === 'string') {
        safeTeachingPlan = JSON.parse(teachingPlan);
      }
    } catch {}
    try {
      if (typeof estimatedTime === 'string') {
        safeEstimatedTime = JSON.parse(estimatedTime);
      }
    } catch {}

    const bucket = process.env.CF_BUCKET_NAME;
    const key = `courses/${courseId}/units/${safeUnitNumber}/${Date.now()}-${req.file.originalname}`;

    //console.log('[Unit:createWithPdf] Uploading to R2', { bucket, key, courseId, unitNumber: safeUnitNumber, fileName: req.file.originalname });
    const fileUrl = await uploadToS3(bucket, key, req.file.buffer, req.file.mimetype);
    //console.log('[Unit:createWithPdf] Uploaded file URL', { fileUrl });

    let textExtract = '';
    try {
      const data = await pdf(req.file.buffer);
      textExtract = data.text || '';
      //console.log('[Unit:createWithPdf] PDF text extracted', { length: textExtract.length });
    } catch (e) {
      console.warn('[Unit:createWithPdf] PDF text extraction failed', { error: e?.message });
      textExtract = '';
    }
    const unit = await Unit.create({
      course: courseId,
      unitNumber: safeUnitNumber,
      title,
      description,
      outlineText,
      learningObjectives: safeLearningObjectives,
      teachingPlan: safeTeachingPlan,
      estimatedTime: safeEstimatedTime,
      quizzes: [],
      tutorials: [],
      labs: [],
      status: 'draft',
      files: [{
        fileUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        textExtract,
        uploadedBy: req.user.id
      }]
    });
    //console.log('[Unit:createWithPdf] Unit created', { unitId: unit._id });

    // Auto-embed if textExtract exists
    if (textExtract && textExtract.trim().length > 0) {
      triggerEmbedding(unit._id.toString());
    }

    res.status(201).json({ status: 'success', data: { unit } });
  } catch (error) {
    console.error('[Unit:createWithPdf] Error', { error: error?.message });
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Attach or replace a PDF for a unit: upload to R2 and store Resource link
export const attachPdfToUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    //console.log('[Unit:attachPdf] Start', { unitId });
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ status: 'error', message: 'Unit not found' });

    if (!req.file) return res.status(400).json({ status: 'error', message: 'PDF file is required' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ status: 'error', message: 'Only PDF files are allowed' });

    const bucket = process.env.CF_BUCKET_NAME;
    const key = `courses/${unit.course}/units/${unit.unitNumber}/${Date.now()}-${req.file.originalname}`;

    //console.log('[Unit:attachPdf] Uploading to R2', { bucket, key });
    const fileUrl = await uploadToS3(bucket, key, req.file.buffer, req.file.mimetype);
    //console.log('[Unit:attachPdf] Uploaded', { fileUrl });

    // Extract text from PDF
    let textExtract = '';
    try {
      const data = await pdf(req.file.buffer);
      textExtract = data.text || '';
    } catch (e) {
      console.warn('[Unit:attachPdf] PDF text extraction failed', { error: e?.message });
      textExtract = '';
    }

    unit.files.push({
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      textExtract,
      uploadedBy: req.user.id
    });
    await unit.save();
    //console.log('[Unit:attachPdf] Completed', { unitId: unit._id });

    // Auto-embed if textExtract exists
    if (textExtract && textExtract.trim().length > 0) {
      triggerEmbedding(unit._id.toString());
    }

    res.status(201).json({ status: 'success', data: { unit } });
  } catch (error) {
    console.error('[Unit:attachPdf] Error', { error: error?.message });
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// New: Create unit resource by receiving only unitId and PDF file
// Frontend sends FormData with fields: unitId and file (PDF)
export const createUnitResourceFromPdf = async (req, res) => {
  try {
    const { unitId } = req.body;
    //console.log('[Unit:createResource] Start', { unitId });
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ status: 'error', message: 'Unit not found' });

    if (!req.file) return res.status(400).json({ status: 'error', message: 'PDF file is required' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ status: 'error', message: 'Only PDF files are allowed' });

    const bucket = process.env.CF_BUCKET_NAME;
    const key = `courses/${unit.course}/units/${unit.unitNumber}/${Date.now()}-${req.file.originalname}`;

    //console.log('[Unit:createResource] Uploading to R2', { bucket, key });
    const fileUrl = await uploadToS3(bucket, key, req.file.buffer, req.file.mimetype);
    //console.log('[Unit:createResource] Uploaded', { fileUrl });

    let textExtract = '';
    try {
      const data = await pdf(req.file.buffer);
      textExtract = data.text || '';
    } catch (e) {
      textExtract = '';
    }

    unit.files.push({
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      textExtract,
      uploadedBy: req.user.id
    });
    await unit.save();
    //console.log('[Unit:createResource] Unit updated', { unitId: unit._id });

    // Auto-embed if textExtract exists
    if (textExtract && textExtract.trim().length > 0) {
      triggerEmbedding(unit._id.toString());
    }

    res.status(201).json({ status: 'success', message: 'Unit PDF saved', data: { unit } });
  } catch (error) {
    console.error('[Unit:createResource] Error', { error: error?.message });
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// List all units for a course
export const listUnitsByCourse = asyncHandler(async (req, res) => {
  try {
    const { courseId } = req.params;
    const units = await Unit.find({ course: courseId }).sort({ unitNumber: 1 });
    res.status(200).json({ status: 'success', data: { units, count: units.length } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

  // Delete a single file entry from a unit and remove from R2
  export const deleteUnitFile = asyncHandler(async (req, res) => {
    try {
      const { unitId, fileIndex } = req.params;
      //console.log('[Unit:deleteFile] Start', { unitId, fileIndex });
      const unit = await Unit.findById(unitId);
      if (!unit) {
        return res.status(404).json({ status: 'error', message: 'Unit not found' });
      }
      const idx = Number(fileIndex);
      if (Number.isNaN(idx) || idx < 0 || idx >= unit.files.length) {
        return res.status(400).json({ status: 'error', message: 'Invalid file index' });
      }
      const fileEntry = unit.files[idx];
      const fileUrl = fileEntry.fileUrl;

      // Best-effort deletion from R2 based on public URL
      try {
        const publicDomain = process.env.CF_R2_PUBLIC_DOMAIN;
        const bucket = process.env.CF_BUCKET_NAME;
        let keyFromUrl = null;
        if (publicDomain && fileUrl.includes(publicDomain)) {
          const isPubDev = /^pub-.*\.r2\.dev$/i.test(publicDomain);
          const afterDomain = fileUrl.split(publicDomain)[1];
          const path = afterDomain.replace(/^\//, '');
          keyFromUrl = isPubDev ? path : path.replace(new RegExp(`^${bucket}/`), '');
        }
        if (keyFromUrl) {
          const { s3Client } = await import('../utils/s3.js');
          await s3Client.send(new (await import('@aws-sdk/client-s3')).DeleteObjectCommand({
            Bucket: bucket,
            Key: keyFromUrl,
          }));
          //console.log('[Unit:deleteFile] R2 object deleted', { key: keyFromUrl });
        } else {
          //console.log('[Unit:deleteFile] Skip R2 delete; could not derive key');
        }
      } catch (err) {
        console.warn('[Unit:deleteFile] R2 delete failed', err.message);
      }

      // Remove file entry from unit
      unit.files.splice(idx, 1);
      await unit.save();
      //console.log('[Unit:deleteFile] Completed', { unitId });
      res.status(200).json({ status: 'success', message: 'File removed from unit', data: { unit } });
    } catch (error) {
      console.error('[Unit:deleteFile] Error', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

// Update unit metadata (title, description, outlineText)
export const updateUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { title, description, outlineText, status } = req.body;
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ status: 'error', message: 'Unit not found' });

    if (title !== undefined) unit.title = title;
    if (description !== undefined) unit.description = description;
    if (outlineText !== undefined) unit.outlineText = outlineText;
    if (status !== undefined) unit.status = status;
    await unit.save();

    res.json({ status: 'success', data: { unit } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete a unit (does not delete associated Resource automatically)
export const deleteUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ status: 'error', message: 'Unit not found' });
    // Best-effort delete all R2 objects linked in files
    if (Array.isArray(unit.files)) {
      for (const f of unit.files) {
        if (f?.fileUrl) {
          try {
            const url = new URL(f.fileUrl);
            const parts = url.pathname.split('/').filter(Boolean); // [maybe bucket? or just key]
            let bucket = process.env.CF_BUCKET_NAME;
            let keyPath = parts.join('/');
            // If public dev domain (bucket omitted), use env bucket; otherwise first part may be bucket
            if (!/^pub-.*\.r2\.dev$/i.test(url.host) && parts.length > 1) {
              bucket = parts.shift();
              keyPath = parts.join('/');
            }
            if (bucket && keyPath) {
              const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: keyPath });
              await r2.send(cmd);
              //console.log('[Unit:delete] R2 object deleted', { bucket, key: keyPath });
            }
          } catch (e) {
            console.warn('[Unit:delete] R2 delete failed', { fileUrl: f.fileUrl, error: e?.message });
          }
        }
      }
    }
    await Unit.deleteOne({ _id: unitId });
    res.json({ status: 'success', message: 'Unit deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update unit text (either unit-level outlineText or latest file's textExtract)
export const updateUnitText = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { outlineText, fileTextExtractIndex, textExtract } = req.body;
    const unit = await Unit.findById(unitId);
    if (!unit) return res.status(404).json({ status: 'error', message: 'Unit not found' });

    if (typeof outlineText === 'string') {
      unit.outlineText = outlineText;
    }
    if (typeof textExtract === 'string') {
      const idx = Number.isFinite(Number(fileTextExtractIndex)) ? Number(fileTextExtractIndex) : unit.files.length - 1;
      if (idx >= 0 && idx < unit.files.length) {
        unit.files[idx].textExtract = textExtract;
      }
    }
    await unit.save();
    res.json({ status: 'success', message: 'Unit text updated', data: { unit } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
