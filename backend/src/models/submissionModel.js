// models/Submission.js
import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true }, // index in Assessment.questions
  answer: mongoose.Schema.Types.Mixed,
  marksAwarded: Number
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  answers: { type: [answerSchema], default: [] },

  totalScore: Number,
  graded: { type: Boolean, default: false },

  // snapshot used by adaptive engine to update student model
  studentCapabilitySnapshot: {
    overallLevel: { type: String, enum: ['low','mid','high'] },
    skillEstimates: { type: mongoose.Schema.Types.Mixed, default: {} } // e.g. { "containers": 0.6 }
  },

  submittedAt: { type: Date, default: Date.now },
  gradedAt: Date,
  grader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // optional teacher/auto-grader id
}, { timestamps: true });

submissionSchema.index({ assessment: 1, student: 1 });

export default mongoose.model('Submission', submissionSchema);
