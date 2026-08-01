// models/Enrollment.js
import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // completed unitNumbers
  completedUnits: { type: [Number], default: [] },

  // running proficiency map used by adaptive engine: { "unit_1": 0.7, "containers": 0.55 }
  proficiency: { type: mongoose.Schema.Types.Mixed, default: {} },

  finalScore: Number,
  completed: { type: Boolean, default: false },

  enrolledAt: { type: Date, default: Date.now }
}, { timestamps: true });

enrollmentSchema.index({ course: 1, student: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);
