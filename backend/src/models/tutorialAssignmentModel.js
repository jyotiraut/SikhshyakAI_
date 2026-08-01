// models/TutorialAssignment.js
import mongoose from 'mongoose';

const tutorialAssignmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  unitNumber: { type: Number, required: true },

  // index into Course.units[n].tutorials array
  tutorialIndex: { type: Number, required: true },

  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  assignedAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,

  status: { type: String, enum: ['assigned','in_progress','completed'], default: 'assigned' },
  score: Number,
  feedback: String
}, { timestamps: true });

tutorialAssignmentSchema.index({ course: 1, unitNumber: 1, student: 1 });

export default mongoose.model('TutorialAssignment', tutorialAssignmentSchema);
