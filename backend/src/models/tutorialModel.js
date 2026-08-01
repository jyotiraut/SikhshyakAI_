import mongoose from 'mongoose';

const tutorialQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    type: { type: String, enum: ['numerical-problem', 'short-answer', 'essay'], required: true },
    options: { type: [String], default: null },
    correctAnswer: { type: Number, default: null },
    difficulty: { type: String, enum: ['low', 'mid', 'high'], default: 'low' },
    learningObjectiveIndex: { type: Number, default: null },
    solutionApproach: { type: String, default: null }
  },
  { _id: false }
);

const tutorialSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    unitNumber: { type: Number, required: true },
    title: { type: String, required: true },
    questions: { type: [tutorialQuestionSchema], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' }
  },
  { timestamps: true }
);

tutorialSchema.index({ course: 1, unit: 1, createdAt: -1 });

const Tutorial = mongoose.model('Tutorial', tutorialSchema);
export default Tutorial;
