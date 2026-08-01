// controllers/resourceController.js
import Resource from '../models/resourceModel.js';
import Course from '../models/courseModel.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { uploadToS3 } from '../utils/s3.js'; // optional helper for uploading to S3

// Save uploaded resource and optionally extract text by sending to FastAPI or using pdf-parse (Node)
export const uploadResource = async (req, res) => {
  try {
    const { courseId, unitNumber } = req.body;
    if (!req.file) return res.status(400).json({ status: 'error', message: 'file is required' });

    // upload file to S3 / CDN - replace with your upload helper
    // If you already use Cloudinary replace logic accordingly
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    // Example: assume uploadToS3 returns a URL
    const fileUrl = await uploadToS3(fileBuffer, fileName);

    // Optionally extract text here (or send fileUrl to FastAPI ingestion)
    // For simplicity we will not call RAG here, just save metadata
    const resource = await Resource.create({
      course: courseId,
      unitNumber: Number(unitNumber),
      fileName,
      fileUrl,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedBy: req.user.id
    });

    res.status(201).json({ status: 'success', message: 'Resource uploaded', data: { resource } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const listResourcesForUnit = async (req, res) => {
  try {
    const { courseId, unitNumber } = req.query;
    const resources = await Resource.find({ course: courseId, unitNumber: Number(unitNumber) });
    res.json({ status: 'success', data: { resources } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
