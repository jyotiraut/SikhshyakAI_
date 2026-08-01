import mongoose from 'mongoose';

const tutorialAnswerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    responseText: { type: String, required: true }
  },
  { _id: false }
);

const gradingSchema = new mongoose.Schema(
  {
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    gradedAt: { type: Date }
  },
  { _id: false }
);

const tutorialSubmissionSchema = new mongoose.Schema(
  {
    tutorial: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutorial', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [tutorialAnswerSchema], default: [] },
    // Optional uploaded file link (e.g., PDF or doc) stored in R2
    fileUrl: { type: String },
    fileName: { type: String },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    grading: { type: gradingSchema, default: {} },
  },
  { timestamps: true }
);

tutorialSubmissionSchema.index({ tutorial: 1, submittedBy: 1, createdAt: -1 });

const TutorialSubmission = mongoose.model('TutorialSubmission', tutorialSubmissionSchema);
export default TutorialSubmission;
