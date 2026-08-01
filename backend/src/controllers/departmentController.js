import Department from '../models/departmentModel.js';
import School from '../models/schoolModel.js';
import User from '../models/userModel.js';
import Course from '../models/courseModel.js';
import Enrollment from '../models/enrollmentModel.js';
import mongoose from 'mongoose';

// Create a department (admin of the school)
export const createDepartment = async (req, res) => {
  try {
    const { name, school: schoolId, description } = req.body;
    const creator = req.user;

    if (!name || !schoolId) return res.status(400).json({ status: 'fail', message: 'name and school are required' });
    if (!mongoose.Types.ObjectId.isValid(schoolId)) return res.status(400).json({ status: 'fail', message: 'Invalid school id' });

    // Only admin of the school or superadmin can create
    if (creator.role !== 'superadmin' && String(creator.school) !== String(schoolId)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ status: 'fail', message: 'School not found' });

    const existing = await Department.findOne({ name, school: schoolId });
    if (existing) return res.status(400).json({ status: 'fail', message: 'Department already exists in this school' });

    const dept = await Department.create({ name, school: schoolId, description });
    res.status(201).json({ status: 'success', data: { department: dept } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// List departments for a school (admin, hods can view)
export const listDepartmentsForSchool = async (req, res) => {
  try {
    const { id: schoolId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(schoolId)) return res.status(400).json({ status: 'fail', message: 'Invalid school id' });

    const departments = await Department.find({ school: schoolId });
    res.status(200).json({ status: 'success', results: departments.length, data: { departments } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Assign or create an HOD for department (admin only)
export const createOrAssignHod = async (req, res) => {
  try {
    const { id: deptId } = req.params;
    const { fullName, email, password, confirmPassword, designation } = req.body;
    const actor = req.user;

    if (!mongoose.Types.ObjectId.isValid(deptId)) return res.status(400).json({ status: 'fail', message: 'Invalid department id' });
    const dept = await Department.findById(deptId);
    if (!dept) return res.status(404).json({ status: 'fail', message: 'Department not found' });

    // Only school admin or superadmin can assign
    if (actor.role !== 'superadmin' && String(actor.school) !== String(dept.school)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    // Option A: if email provided and user exists, assign as HOD
    if (email && !fullName) {
      const existing = await User.findOne({ email });
      if (!existing) return res.status(404).json({ status: 'fail', message: 'User not found' });
      // Ensure user's school matches department school
      if (String(existing.school) !== String(dept.school)) return res.status(400).json({ status: 'fail', message: 'User belongs to a different school' });
      existing.role = 'hod';
      existing.department = deptId;
      await existing.save();
      dept.head = existing._id;
      await dept.save();
      return res.status(200).json({ status: 'success', data: { hod: existing, department: dept } });
    }

    // Create new HOD user
    if (!fullName || !email || !password || !confirmPassword) return res.status(400).json({ status: 'fail', message: 'Missing required fields to create HOD' });

    if (password !== confirmPassword) return res.status(400).json({ status: 'fail', message: 'Passwords do not match' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ status: 'fail', message: 'Email already exists' });

    const hod = await User.create({ fullName, email, password, role: 'hod', school: dept.school, designation: designation || 'Head of Department', department: deptId, isEmailVerified: true });
    dept.head = hod._id;
    await dept.save();

    res.status(201).json({ status: 'success', data: { hod, department: dept } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Create HOD assistant (admin only)
export const createHodAssistant = async (req, res) => {
  try {
    const { id: deptId } = req.params;
    const { fullName, email, password, confirmPassword, designation } = req.body;
    const actor = req.user;

    if (!mongoose.Types.ObjectId.isValid(deptId)) return res.status(400).json({ status: 'fail', message: 'Invalid department id' });
    const dept = await Department.findById(deptId);
    if (!dept) return res.status(404).json({ status: 'fail', message: 'Department not found' });

    // Only school admin or superadmin can create assistant
    if (actor.role !== 'superadmin' && String(actor.school) !== String(dept.school)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    if (!fullName || !email || !password || !confirmPassword) return res.status(400).json({ status: 'fail', message: 'Missing required fields' });
    if (password !== confirmPassword) return res.status(400).json({ status: 'fail', message: 'Passwords do not match' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ status: 'fail', message: 'Email already exists' });

    const assistant = await User.create({ fullName, email, password, role: 'hod_assistant', school: dept.school, department: deptId, designation: designation || 'HOD Assistant', isEmailVerified: true });

    res.status(201).json({ status: 'success', data: { assistant } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// List courses for a department (with pagination)
export const listCoursesForDepartment = async (req, res) => {
  try {
    const { id: deptId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!mongoose.Types.ObjectId.isValid(deptId)) return res.status(400).json({ status: 'fail', message: 'Invalid department id' });
    const dept = await Department.findById(deptId);
    if (!dept) return res.status(404).json({ status: 'fail', message: 'Department not found' });

    // Permission: HOD can only access their own department; admin must belong to same school
    const actor = req.user;
    if (actor.role === 'hod' && String(actor.department) !== String(deptId)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    if (actor.role === 'admin' && String(actor.school) !== String(dept.school)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (p - 1) * l;

    const [total, courses] = await Promise.all([
      Course.countDocuments({ department: deptId }),
      Course.find({ department: deptId }).sort({ createdAt: -1 }).skip(skip).limit(l).populate('teacher', 'fullName')
    ]);

    res.status(200).json({ status: 'success', results: total, page: p, limit: l, data: { courses } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get departments for the logged-in user's school (protected)
export const getDepartmentsForMe = async (req, res) => {
  try {
    const actor = req.user;
    const schoolId = actor.school;
    if (!schoolId) return res.status(400).json({ status: 'fail', message: 'User has no school assigned' });

    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (p - 1) * l;

    const [total, departments] = await Promise.all([
      Department.countDocuments({ school: schoolId }),
      Department.find({ school: schoolId }).sort({ name: 1 }).skip(skip).limit(l)
    ]);

    res.status(200).json({ status: 'success', results: total, page: p, limit: l, data: { departments } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Public: get departments for a given school id (no auth required)
export const getDepartmentsBySchoolPublic = async (req, res) => {
  try {
    const { id: schoolId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(schoolId)) return res.status(400).json({ status: 'fail', message: 'Invalid school id' });

    const { page = 1, limit = 50 } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(parseInt(limit, 10) || 50, 1);
    const skip = (p - 1) * l;

    const [total, departments] = await Promise.all([
      Department.countDocuments({ school: schoolId }),
      Department.find({ school: schoolId }).sort({ name: 1 }).skip(skip).limit(l).select('name description')
    ]);

    res.status(200).json({ status: 'success', results: total, page: p, limit: l, data: { departments } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// List teachers for a department (paginated) — teachers are users with role 'teacher' in department or teachers assigned to courses in the department
export const listTeachersForDepartment = async (req, res) => {
  try {
    const { id: deptId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!mongoose.Types.ObjectId.isValid(deptId)) return res.status(400).json({ status: 'fail', message: 'Invalid department id' });

    const dept = await Department.findById(deptId);
    if (!dept) return res.status(404).json({ status: 'fail', message: 'Department not found' });

    // Permission: HOD can only access their own department; admin must belong to same school
    const actor = req.user;
    if (actor.role === 'hod' && String(actor.department) !== String(deptId)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    if (actor.role === 'admin' && String(actor.school) !== String(dept.school)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    // Collect teacher ids from users and from courses
    const teacherFromUsers = await User.find({ role: 'teacher', department: deptId }).distinct('_id');
    const teacherFromCourses = await Course.find({ department: deptId }).distinct('teacher');
    const uniqueIds = Array.from(new Set([...teacherFromUsers.map(String), ...teacherFromCourses.map(String)])).map(id => new mongoose.Types.ObjectId(id));

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(parseInt(limit, 10) || 10, 1);
    const start = (p - 1) * l;
    const pageIds = uniqueIds.slice(start, start + l);

    const users = await User.find({ _id: { $in: pageIds } }).select('-password');
    res.status(200).json({ status: 'success', results: uniqueIds.length, page: p, limit: l, data: { teachers: users } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// List students enrolled in published courses for a department (paginated)
export const listStudentsForDepartment = async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get all course IDs in this department
    const courses = await Course.find({ department: departmentId }).select('_id');
    const courseIds = courses.map(c => new mongoose.Types.ObjectId(c._id));

    // Get students enrolled in these courses (role: student only)
    const students = await Enrollment.find({ course: { $in: courseIds } })
      .populate({
        path: 'student',
        match: { role: 'student' }  // Only students, exclude teachers
      })
      .skip(skip)
      .limit(limit);

    // Filter out null entries (non-student enrollments)
    const studentData = students.map(e => e.student).filter(s => s !== null);

    // Get total count for pagination
    const totalCount = await Enrollment.countDocuments({ 
      course: { $in: courseIds }
    }).populate('student', { match: { role: 'student' } });

    res.status(200).json({
      status: 'success',
      results: studentData.length,
      page,
      limit,
      data: { students: studentData }
    });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

// Department course leaderboard (wrap existing logic)
export const courseLeaderboardForDepartment = async (req, res) => {
  try {
    const { id: deptId, courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(deptId) || !mongoose.Types.ObjectId.isValid(courseId)) return res.status(400).json({ status: 'fail', message: 'Invalid id(s)' });
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ status: 'fail', message: 'Course not found' });
    if (!course.department || String(course.department) !== String(deptId)) return res.status(400).json({ status: 'fail', message: 'Course does not belong to department' });

    // Reuse existing controller code by importing aggregate logic here
    const { page = 1, limit = 10 } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (p - 1) * l;
    const QuizSubmission = (await import('../models/quizSubmissionModel.js')).default;

    const pipeline = [
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      { $group: { _id: '$submittedBy', totalScore: { $sum: '$score' }, totalMax: { $sum: '$total' }, attempts: { $sum: 1 } } },
      { $sort: { totalScore: -1 } },
      { $skip: skip },
      { $limit: l }
    ];

    const agg = await QuizSubmission.aggregate(pipeline);
    const ids = agg.map(a => a._id);
    const users = await User.find({ _id: { $in: ids } }).select('fullName');
    const userMap = new Map(users.map(u => [String(u._id), u.fullName]));
    const leaderboard = agg.map(a => ({ userId: a._id, fullName: userMap.get(String(a._id)) || 'Unknown', score: a.totalScore, max: a.totalMax, attempts: a.attempts }));

    res.status(200).json({ status: 'success', data: { leaderboard, page: p, limit: l } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update department info (admin or superadmin)
export const updateDepartment = async (req, res) => {
  try {
    const { id: deptId } = req.params;
    const actor = req.user;
    if (!mongoose.Types.ObjectId.isValid(deptId)) return res.status(400).json({ status: 'fail', message: 'Invalid department id' });
    const dept = await Department.findById(deptId);
    if (!dept) return res.status(404).json({ status: 'fail', message: 'Department not found' });

    // Only school admin or superadmin
    if (actor.role !== 'superadmin' && String(actor.school) !== String(dept.school)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    const allowed = ['name', 'description', 'settings'];
    allowed.forEach(field => {
      if (field in req.body) dept[field] = req.body[field];
    });

    await dept.save();
    res.status(200).json({ status: 'success', data: { department: dept } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Delete department (admin or superadmin)
export const deleteDepartment = async (req, res) => {
  try {
    const { id: deptId } = req.params;
    const actor = req.user;
    if (!mongoose.Types.ObjectId.isValid(deptId)) return res.status(400).json({ status: 'fail', message: 'Invalid department id' });
    const dept = await Department.findById(deptId);
    if (!dept) return res.status(404).json({ status: 'fail', message: 'Department not found' });

    // Only school admin or superadmin
    if (actor.role !== 'superadmin' && String(actor.school) !== String(dept.school)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    // Prevent deletion if courses exist in department
    const courseCount = await Course.countDocuments({ department: deptId });
    if (courseCount > 0) return res.status(400).json({ status: 'fail', message: 'Cannot delete department with courses' });

    // Unset department on users (hod/assistants/teachers/students)
    await User.updateMany({ department: deptId }, { $unset: { department: '' } });

    await Department.findByIdAndDelete(deptId);
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
