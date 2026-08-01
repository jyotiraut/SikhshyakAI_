import School from '../models/schoolModel.js';
import User from '../models/userModel.js';
import Course from '../models/courseModel.js';

// Create a new school (superadmin only)
export const createSchool = async (req, res) => {
  try {
    const { name, type, address, settings } = req.body;
    if (!name) return res.status(400).json({ status: 'fail', message: 'School name required' });

    const existing = await School.findOne({ name });
    if (existing) return res.status(400).json({ status: 'fail', message: 'School already exists' });

    const school = await School.create({ name, type, address, settings });
    res.status(201).json({ status: 'success', data: { school } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
export const getVerifiedSchools = async (req, res) => {
  try {
    // isVerified must be true and isBlocked must not be true
    const schools = await School.find({ isVerified: true, isBlocked: { $ne: true } });
    res.status(200).json({ status: 'success', results: schools.length, data: { schools } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
// Get all schools (superadmin)
export const getAllSchools = async (req, res) => {
  try {
    const schools = await School.find();
    res.status(200).json({ status: 'success', results: schools.length, data: { schools } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// List courses for a school (admin or superadmin)
export const listCoursesForSchool = async (req, res) => {
  try {
    const { id: schoolId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(schoolId)) return res.status(400).json({ status: 'fail', message: 'Invalid school id' });

    // If requester is admin, ensure same school
    if (req.user.role === 'admin' && String(req.user.school) !== String(schoolId)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    // Include courses explicitly marked with school OR courses whose teacher belongs to the school (backwards compatibility)
    const teacherIds = await User.find({ school: schoolId }).distinct('_id');
    const courses = await Course.find({ $or: [ { school: schoolId }, { teacher: { $in: teacherIds } } ] }).populate('teacher', 'fullName');
    res.status(200).json({ status: 'success', results: courses.length, data: { courses } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get admins for a school (superadmin)
export const getAdminsForSchool = async (req, res) => {
  try {
    const { id: schoolId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(schoolId)) return res.status(400).json({ status: 'fail', message: 'Invalid schoolId' });

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ status: 'fail', message: 'School not found' });

    const admins = await User.find({ school: schoolId, role: 'admin' }).select('-password');
    res.status(200).json({ status: 'success', results: admins.length, data: { admins } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get all admins across all schools (superadmin)
export const getAllAdmins = async (req, res) => {
  try {
    // populate associated school name for each admin
    const admins = await User.find({ role: 'admin' }).select('-password').populate('school', 'name');
    res.status(200).json({ status: 'success', results: admins.length, data: { admins } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get a single school (superadmin or same-school admin)
export const getSchool = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate ObjectId early to avoid Cast errors
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ status: 'fail', message: 'Invalid school id' });

    const school = await School.findById(id);
    if (!school) return res.status(404).json({ status: 'fail', message: 'School not found' });

    res.status(200).json({ status: 'success', data: { school } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update a school (superadmin)
export const updateSchool = async (req, res) => {
  try {
    const school = await School.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!school) return res.status(404).json({ status: 'fail', message: 'School not found' });
    res.status(200).json({ status: 'success', data: { school } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Delete a school (superadmin)
export const deleteSchool = async (req, res) => {
  try {
    const school = await School.findByIdAndDelete(req.params.id);
    if (!school) return res.status(404).json({ status: 'fail', message: 'School not found' });
    // Optionally: unset school ref on users of that school or prevent deletion if users exist
    await User.updateMany({ school: req.params.id }, { $unset: { school: '' } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Create an admin for a school (superadmin only)
export const createAdminForSchool = async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { fullName, email, password, confirmPassword, designation } = req.body;
    if (!fullName || !email || !password || !confirmPassword) return res.status(400).json({ status: 'fail', message: 'Missing required fields' });
    if (password !== confirmPassword) return res.status(400).json({ status: 'fail', message: 'Passwords do not match' });

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ status: 'fail', message: 'School not found' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ status: 'fail', message: 'Email already exists' });

    const admin = await User.create({ fullName, email, password, role: 'admin', school: schoolId, designation, isEmailVerified: true });
    res.status(201).json({ status: 'success', data: { admin } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Verify or unverify a school (superadmin)
export const setSchoolVerified = async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { verified } = req.body; // boolean
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ status: 'fail', message: 'School not found' });

    school.isVerified = Boolean(verified);
    school.verifiedAt = verified ? new Date() : undefined;
    await school.save();
    res.status(200).json({ status: 'success', data: { school } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Block or unblock a school (superadmin) — blocking sets users under that school as blocked
export const setSchoolBlocked = async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { blocked, reason } = req.body; // blocked: boolean
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ status: 'fail', message: 'School not found' });

    school.isBlocked = Boolean(blocked);
    school.blockedAt = blocked ? new Date() : undefined;
    school.blockedReason = blocked ? reason : undefined;
    await school.save();

    // Update user blocked status for that school
    await User.updateMany({ school: schoolId }, { $set: { isBlocked: Boolean(blocked), blockedAt: blocked ? new Date() : undefined } });

    res.status(200).json({ status: 'success', data: { school } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

import mongoose from 'mongoose';

// Block/unblock an admin for a school (superadmin)
export const setAdminBlocked = async (req, res) => {
  try {
    const { id: schoolId, adminId } = req.params;
    const { blocked, reason } = req.body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid schoolId or adminId' });
    }

    const admin = await User.findOne({ _id: adminId, school: schoolId, role: 'admin' });
    if (!admin) return res.status(404).json({ status: 'fail', message: 'Admin not found for this school' });

    admin.isBlocked = Boolean(blocked);
    admin.blockedAt = blocked ? new Date() : undefined;
    await admin.save();

    res.status(200).json({ status: 'success', data: { admin } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Delete an admin from a school (superadmin)
export const deleteAdmin = async (req, res) => {
  try {
    const { id: schoolId, adminId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid schoolId or adminId' });
    }

    const admin = await User.findOneAndDelete({ _id: adminId, school: schoolId, role: 'admin' });
    if (!admin) return res.status(404).json({ status: 'fail', message: 'Admin not found' });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
