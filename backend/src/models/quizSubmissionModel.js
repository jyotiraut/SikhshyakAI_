import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    answerIndex: { type: Number },
    textAnswer: { type: String }
  },
  { _id: false }
);

const resultDetailSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    correct: { type: Boolean, required: true },
    correctAnswer: { type: Number }
  },
  { _id: false }
);

const quizSubmissionSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    details: { type: [resultDetailSchema], default: [] },
  },
  { timestamps: true }
);

quizSubmissionSchema.index({ quiz: 1, submittedBy: 1, createdAt: -1 });

const QuizSubmission = mongoose.model('QuizSubmission', quizSubmissionSchema);
export default QuizSubmission;
