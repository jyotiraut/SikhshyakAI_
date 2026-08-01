// controllers/enrollmentController.js
import Enrollment from '../models/enrollmentModel.js';
import Course from '../models/courseModel.js';

export const enroll = async (req, res) => {
  try {
    const student = req.user.id;
    const { courseId } = req.body;


    let enrollment = await Enrollment.findOne({ course: courseId, student });
    if (!enrollment) {
      enrollment = await Enrollment.create({ course: courseId, student });
    }

    res.status(201).json({ status: 'success', message: 'Enrolled', data: { enrollment } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getEnrollment = async (req, res) => {
  try {
    const { courseId, studentId, page = 1, limit = 10 } = req.query;
    const query = {};
    if (courseId) query.course = courseId;
    if (studentId) query.student = studentId;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const [total, enrollments] = await Promise.all([
      Enrollment.countDocuments(query),
      Enrollment.find(query)
        .populate('course', 'title')
        .populate('student', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      status: 'success',
      data: {
        enrollments,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        count: enrollments.length
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Enroll by course enrollment code
export const enrollByCode = async (req, res) => {
  try {
    const student = req.user.id;
    const { code, courseId } = req.body;
    if (!code) return res.status(400).json({ status: 'error', message: 'code is required' });
    const norm = String(code).trim().toUpperCase();

    let course = null;
    if (courseId) {
      // Fast path: fetch by ID and verify code matches
      course = await Course.findById(courseId).select('title enrollmentCode');
      if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });
      if (String(course.enrollmentCode).toUpperCase() !== norm) {
        return res.status(400).json({ status: 'error', message: 'Enrollment code does not match this course' });
      }
    } else {
      // Lookup by code using indexed field
      course = await Course.findOne({ enrollmentCode: norm }).select('title enrollmentCode');
      if (!course) return res.status(404).json({ status: 'error', message: 'Invalid enrollment code' });
    }

    let enrollment = await Enrollment.findOne({ course: course._id, student });
    if (!enrollment) {
      enrollment = await Enrollment.create({ course: course._id, student });
    }

    const populated = await Enrollment.findById(enrollment._id)
      .populate('course', 'title enrollmentCode')
      .populate('student', 'fullName');

    res.status(201).json({ status: 'success', message: 'Enrolled by code', data: { enrollment: populated } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Mark course as completed (student only)
export const markCourseCompleted = async (req, res) => {
  try {
    const student = req.user.id;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ course: courseId, student });
    if (!enrollment) {
      return res.status(404).json({ status: 'error', message: 'Enrollment not found' });
    }

    if (enrollment.completed) {
      return res.status(400).json({ status: 'error', message: 'Course already marked as completed' });
    }

    enrollment.completed = true;
    await enrollment.save();

    const populated = await Enrollment.findById(enrollment._id)
      .populate('course', 'title')
      .populate('student', 'fullName');

    res.json({ status: 'success', message: 'Course marked as completed', data: { enrollment: populated } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
