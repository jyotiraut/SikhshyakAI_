import Resource from '../models/resourceModel.js';
import { uploadToS3, r2 } from '../utils/s3.js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import pdf from 'pdf-parse';

// Upload a PDF to Cloudflare R2 and save URL + extracted text
export const uploadPdf = async (req, res) => {
  try {
    const { courseId, unitNumber } = req.body;
    if (!req.file) return res.status(400).json({ status: 'error', message: 'PDF file is required' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ status: 'error', message: 'Only PDF files are allowed' });

    const bucket = process.env.CF_BUCKET_NAME;
    const key = `courses/${courseId}/units/${unitNumber}/${Date.now()}-${req.file.originalname}`;

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    const fileUrl = await uploadToS3(bucket, key, fileBuffer, mimeType);
    // console.log('[PDF:upload] Uploaded file URL', { fileUrl });

    let textExtract = '';
    try {
      const data = await pdf(fileBuffer);
      textExtract = data.text || '';

    } catch (e) {
      console.warn('[PDF:upload] PDF text extraction failed', { error: e?.message });
      // If extraction fails, proceed without text
      textExtract = '';
    }

    const resource = await Resource.create({
      course: courseId,
      unitNumber: Number(unitNumber),
      fileName: req.file.originalname,
      fileUrl,
      mimeType,
      sizeBytes: req.file.size,
      textExtract,
      uploadedBy: req.user.id
    });


    res.status(201).json({ status: 'success', message: 'PDF uploaded', data: { resource } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Update an existing PDF: replace file in R2 and update metadata/text
export const updatePdf = async (req, res) => {
  try {
    const { resourceId } = req.params;
    if (!req.file) return res.status(400).json({ status: 'error', message: 'PDF file is required' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ status: 'error', message: 'Only PDF files are allowed' });

    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(404).json({ status: 'error', message: 'Resource not found' });

    const bucket = process.env.CF_BUCKET_NAME;
    const key = `courses/${resource.course}/units/${resource.unitNumber}/${Date.now()}-${req.file.originalname}`;

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    const fileUrl = await uploadToS3(bucket, key, fileBuffer, mimeType);


    let textExtract = '';
    try {
      const data = await pdf(fileBuffer);
      textExtract = data.text || '';

    } catch (e) {
      console.warn('[PDF:update] PDF text extraction failed', { error: e?.message });
      textExtract = '';
    }

    resource.fileName = req.file.originalname;
    resource.fileUrl = fileUrl;
    resource.mimeType = mimeType;
    resource.sizeBytes = req.file.size;
    resource.textExtract = textExtract;
    await resource.save();


    res.json({ status: 'success', message: 'PDF updated', data: { resource } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete a PDF resource: remove DB record and attempt to delete object
export const deletePdf = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(404).json({ status: 'error', message: 'Resource not found' });

    // Best-effort delete from R2: derive key from URL structure
    // URL format returned by helper: https://{account}.r2.dev/{bucket}/{key}
    const url = new URL(resource.fileUrl);
    const parts = url.pathname.split('/').filter(Boolean); // [bucket, ...keyParts]
    const bucket = parts.shift();
    const key = parts.join('/');

    if (bucket && key) {
      try {
        const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
        await r2.send(cmd);

      } catch (e) {
        console.warn('[PDF:delete] Failed to delete R2 object', { bucket, key, error: e?.message });
        // If delete fails, continue removing DB record
      }
    }

    await Resource.deleteOne({ _id: resourceId });
    res.json({ status: 'success', message: 'PDF deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
