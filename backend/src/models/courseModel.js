// models/Course.js
import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema({
  unitNumber: {
    type: Number,
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: String,

  learningObjectives: {
    type: [String],
    default: []
  },

  // ✅ HOW TO TEACH THIS UNIT
  teachingPlan: {
    overview: String,                 // pedagogical approach
    methods: {                        // teaching methods
      type: [String],                 // e.g., lecture, lab, case-study
      default: []
    },
    activities: {                     // in-class activities
      type: [String],
      default: []
    }
  },

  // ✅ TIME ESTIMATION PER UNIT
  estimatedTime: {
    totalMinutes: Number,
    theoryMinutes: Number,
    practicalMinutes: Number
  },

  // ✅ GENERATED LATER (empty initially)
  tutorials: { type: Array, default: [] },
  labs: { type: Array, default: [] }

}, { _id: false });

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  description: String,

  outlineText: {
    type: String,
    required: true
  },

  // Optional public URL to the original outline PDF stored in R2
  outlinePdfUrl: {
    type: String
  },

  // Enrollment code for students to join course (5-6 chars)
  enrollmentCode: {
    type: String,
    unique: true,
    sparse: true,
    minlength: 5,
    maxlength: 6,
    index: true
  },

  teacherProvided: {
    periodDurationMinutes: Number,
    totalPeriods: Number,
    pace: {
      type: String,
      enum: ['fast', 'normal', 'slow'],
      default: 'normal'
    }
  },

  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Tenant and department
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },

  status: {
    type: String,
    enum: ['draft', 'generated', 'published'],
    default: 'draft'
  }

}, { timestamps: true });

export default mongoose.model('Course', courseSchema);
