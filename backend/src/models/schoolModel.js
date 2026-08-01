import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['school','college','university'], default: 'school' },
  address: { type: String },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Verification & blocking
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },

  isBlocked: { type: Boolean, default: false },
  blockedAt: { type: Date },
  blockedReason: { type: String },

}, { timestamps: true });

const School = mongoose.model('School', schoolSchema);
export default School;
