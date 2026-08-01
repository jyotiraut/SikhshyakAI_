// models/Assessment.js
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: { type: String, enum: ['mcq','multi','short','long','code'], default: 'mcq' },

  // MCQ / multi options
  options: { type: [String], default: [] },

  // correctAnswer must be kept server-side and never sent to client endpoints that deliver the quiz.
  // Structure depends on type: for 'mcq' it might be index (Number), for 'multi' an array of indexes, for 'short' a text
  correctAnswer: mongoose.Schema.Types.Mixed,

  marks: { type: Number, default: 1 },

  // Adaptive fields
  difficulty: { type: String, enum: ['low','mid','high'], default: 'mid' },
  learningObjectiveIndex: { type: Number }, // index into Course.units[n].learningObjectives
  skillTags: { type: [String], default: [] },

  explanation: { type: String } // optional teacher/AI explanation for grading/review
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  type: { type: String, enum: ['quiz','assignment','final'], required: true },

  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  unitNumber: { type: Number }, // null for course-level final

  title: { type: String, required: true },
  instructions: { type: String },

  questions: { type: [questionSchema], required: true },
  totalMarks: { type: Number },

  status: { type: String, enum: ['draft','published','archived'], default: 'draft' },

  // provenance, useful for re-generation / auditing
  generatedBy: { type: String },   // e.g. 'rag-v1' or null
  generatedAt: { type: Date },

  // optional field to store which resource fileUrls or extracts were used (no RAG ids)
  generatedFrom: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

assessmentSchema.index({ course: 1, unitNumber: 1 });

export default mongoose.model('Assessment', assessmentSchema);
