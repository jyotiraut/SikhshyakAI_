import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // HOD user id
  description: { type: String },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const Department = mongoose.model('Department', departmentSchema);
export default Department;
