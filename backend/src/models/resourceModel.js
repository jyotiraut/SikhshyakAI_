// models/Resource.js
import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  unitNumber: { type: Number, required: true },

  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },   // S3/CDN url
  mimeType: String,
  sizeBytes: Number,

  // optional plain text extracted and stored for auditing / regeneration
  textExtract: { type: String },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

resourceSchema.index({ course: 1, unitNumber: 1 });

export default mongoose.model('Resource', resourceSchema);
