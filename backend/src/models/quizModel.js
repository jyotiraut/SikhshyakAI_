import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'true_false', 'short'], default: 'mcq' },
    options: { type: [String], default: [] },
    correctAnswer: { type: Number },
    difficulty: { type: String, enum: ['low', 'mid', 'high'], default: 'low' },
    learningObjectiveIndex: { type: Number },
    solutionApproach: { type: String, default: null }
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    unitNumber: { type: Number, required: true },
    title: { type: String, required: true },
    questions: { type: [questionSchema], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' }
  },
  { timestamps: true }
);

quizSchema.index({ course: 1, unit: 1, createdAt: -1 });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
