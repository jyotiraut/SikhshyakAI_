import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['superadmin','admin','hod','hod_assistant','teacher','student','user','undefined'], required: true },

  // Tenant: which school this user belongs to (null for superadmin)
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', index: true },

  // Link to department (for HODs and assistants and teachers optionally)
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },

  // Student-specific: unique per school
  collegeRollNo: { type: String, required: function() { return this.role === 'student'; } },

  // Teacher-specific
  designation: { type: String },

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

 // Email verification fields
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },

  // Blocking (superadmin can block users)
  isBlocked: { type: Boolean, default: false },
  blockedAt: { type: Date },

}, { timestamps: true });

// Ensure college roll number is unique within a school
userSchema.index({ school: 1, collegeRollNo: 1 }, { unique: true, partialFilterExpression: { collegeRollNo: { $exists: true } } });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);
export default User;