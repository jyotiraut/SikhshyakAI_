import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  unitNumber: { type: Number, required: true },

  title: { type: String, required: true },
  description: { type: String },
  outlineText: { type: String },

  learningObjectives: { type: [String], default: [] },

  teachingPlan: {
    overview: { type: String },
    methods: { type: [String], default: [] },
    activities: { type: [String], default: [] }
  },

  estimatedTime: {
    totalMinutes: { type: Number },
    theoryMinutes: { type: Number },
    practicalMinutes: { type: Number }
  },

  labs: { type: Array, default: [] },

  // PDF/resource uploaded by teacher for this unit
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },

  // History of uploaded unit files (PDFs) with extracted text
  files: {
    type: [
      new mongoose.Schema({
        resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
        fileUrl: { type: String },
        fileName: { type: String },
        mimeType: { type: String },
        sizeBytes: { type: Number },
        textExtract: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
      }, { _id: false })
    ],
    default: []
  },

  // Assessments generated/added later
  quizzes: { type: Array, default: [] },
  tutorials: { type: Array, default: [] },

  status: { type: String, enum: ['draft', 'ready', 'published'], default: 'published' }
}, { timestamps: true });

unitSchema.index({ course: 1, unitNumber: 1 }, { unique: true });

export default mongoose.model('Unit', unitSchema);
