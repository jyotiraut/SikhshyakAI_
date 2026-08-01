import User from '../models/userModel.js';

// Get all users (admin or superadmin)
export const getAllUsers = async (req, res) => {
  try {
    const { role, school } = req.query;
    const query = {};

    // If requester is admin, restrict to their school and allowed roles
    if (req.user.role === 'admin') {
      query.school = req.user.school;
      // allow filtering by role but only for allowed roles
      const allowedRoles = ['teacher','hod','hod_assistant','student'];
      if (role) {
        const requested = String(role).split(',').map(r => r.trim()).filter(Boolean);
        const filtered = requested.filter(r => allowedRoles.includes(r));
        if (filtered.length) query.role = { $in: filtered };
      } else {
        query.role = { $in: allowedRoles };
      }
    } else if (req.user.role === 'superadmin') {
      // Superadmin can filter by school and role
      if (school) query.school = school;
      if (role) query.role = { $in: String(role).split(',').map(r => r.trim()).filter(Boolean) };
    } else {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    const users = await User.find(query).select('-password');
    res.status(200).json({ status: 'success', results: users.length, data: { users } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get a single user by ID
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update a user by ID
export const updateUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ status: 'fail', message: 'User not found' });

    // If requester is school admin, ensure same school
    if (req.user.role === 'admin' && String(req.user.school) !== String(targetUser.school)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    // Allow update
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Delete a user by ID
export const deleteUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ status: 'fail', message: 'User not found' });

    // If requester is school admin, ensure same school
    if (req.user.role === 'admin') {
      if (String(req.user.school) !== String(targetUser.school)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });
      // Admins can only delete HODs or HOD assistants
      if (!['hod','hod_assistant'].includes(targetUser.role)) return res.status(403).json({ status: 'fail', message: 'Admins can only delete HOD or HOD assistant users' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update only user role (admin/teacher can update roles)
export const updateUserRole = async (req, res) => {
  try {
    // Only admin or superadmin can update roles
    if (!['admin','superadmin'].includes(req.user.role)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    const { role } = req.body;
    const allowed = ['user', 'admin', 'teacher', 'student', 'hod', 'hod_assistant'];
    if (!role || !allowed.includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ status: 'fail', message: 'User not found' });

    // admin can only update roles within their school
    if (req.user.role === 'admin' && String(req.user.school) !== String(targetUser.school)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });

    targetUser.role = role;
    await targetUser.save();

    res.status(200).json({ status: 'success', data: { user: targetUser } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update my own role using auth token (any authenticated user)
export const updateMyRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['user', 'admin', 'teacher', 'student'];
    if (!role || !allowed.includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role' });
    }
    const myId = req.user?.id;
    if (!myId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const user = await User.findByIdAndUpdate(
      myId,
      { $set: { role } },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }
    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get dashboard stats for superadmin
export const getSuperadminDashboardStats = async (req, res) => {
  try {
    // Only superadmin can access this
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    // Import models
    const School = (await import('../models/schoolModel.js')).default;
    const Course = (await import('../models/courseModel.js')).default;
    const Enrollment = (await import('../models/enrollmentModel.js')).default;
    const Quiz = (await import('../models/quizModel.js')).default;
    const Department = (await import('../models/departmentModel.js')).default;

    // Count total schools
    const totalSchools = await School.countDocuments();
    const activeSchools = await School.countDocuments({ isVerified: true, isBlocked: false });
    const blockedSchools = await School.countDocuments({ isBlocked: true });

    // Count users by role
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalHODs = await User.countDocuments({ role: 'hod' });
    const totalHODAssistants = await User.countDocuments({ role: 'hod_assistant' });
    const totalUsers = await User.countDocuments();
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    // Count courses
    const totalCourses = await Course.countDocuments();
    const draftCourses = await Course.countDocuments({ status: 'draft' });
    const publishedCourses = await Course.countDocuments({ status: 'published' });
    const generatedCourses = await Course.countDocuments({ status: 'generated' });

    // Count enrollments
    const totalEnrollments = await Enrollment.countDocuments();
    const completedEnrollments = await Enrollment.countDocuments({ completed: true });

    // Count quizzes
    const totalQuizzes = await Quiz.countDocuments();

    // Count departments
    const totalDepartments = await Department.countDocuments();

    // Get top schools by users
    const topSchools = await User.aggregate([
      { $match: { school: { $ne: null } } },
      { $group: { _id: '$school', userCount: { $sum: 1 } } },
      { $sort: { userCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'schools', localField: '_id', foreignField: '_id', as: 'schoolInfo' } },
      { $unwind: { path: '$schoolInfo', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, schoolName: '$schoolInfo.name', userCount: 1 } }
    ]);

    // Get users by role breakdown per school
    const usersBySchool = await User.aggregate([
      { $match: { school: { $ne: null } } },
      { $group: { _id: { school: '$school', role: '$role' }, count: { $sum: 1 } } },
      { $sort: { '_id.school': 1 } }
    ]);

    // Get enrollment trends (courses per school)
    const coursesBySchool = await Course.aggregate([
      { $match: { school: { $ne: null } } },
      { $group: { _id: '$school', courseCount: { $sum: 1 } } },
      { $sort: { courseCount: -1 } },
      { $lookup: { from: 'schools', localField: '_id', foreignField: '_id', as: 'schoolInfo' } },
      { $unwind: { path: '$schoolInfo', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, schoolName: '$schoolInfo.name', courseCount: 1 } }
    ]);

    const dashboardStats = {
      schools: {
        total: totalSchools,
        active: activeSchools,
        blocked: blockedSchools
      },
      users: {
        total: totalUsers,
        admins: totalAdmins,
        teachers: totalTeachers,
        students: totalStudents,
        hods: totalHODs,
        hodAssistants: totalHODAssistants,
        blocked: blockedUsers
      },
      courses: {
        total: totalCourses,
        draft: draftCourses,
        published: publishedCourses,
        generated: generatedCourses
      },
      enrollments: {
        total: totalEnrollments,
        completed: completedEnrollments
      },
      quizzes: {
        total: totalQuizzes
      },
      departments: {
        total: totalDepartments
      },
      topSchools,
      coursesBySchool
    };

    res.status(200).json({
      status: 'success',
      data: dashboardStats
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get dashboard stats for admin (school-specific)
export const getAdminDashboardStats = async (req, res) => {
  try {
    // Only admin can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    const adminSchoolId = req.user.school;
    if (!adminSchoolId) {
      return res.status(400).json({ status: 'fail', message: 'Admin school not found' });
    }

    // Import models
    const School = (await import('../models/schoolModel.js')).default;
    const Course = (await import('../models/courseModel.js')).default;
    const Enrollment = (await import('../models/enrollmentModel.js')).default;
    const Quiz = (await import('../models/quizModel.js')).default;
    const Department = (await import('../models/departmentModel.js')).default;

    // Get school info
    const schoolInfo = await School.findById(adminSchoolId);

    // Count users in this school by role
    const totalTeachers = await User.countDocuments({ school: adminSchoolId, role: 'teacher' });
    const totalStudents = await User.countDocuments({ school: adminSchoolId, role: 'student' });
    const totalHODs = await User.countDocuments({ school: adminSchoolId, role: 'hod' });
    const totalHODAssistants = await User.countDocuments({ school: adminSchoolId, role: 'hod_assistant' });
    const totalUsers = await User.countDocuments({ school: adminSchoolId });
    const blockedUsers = await User.countDocuments({ school: adminSchoolId, isBlocked: true });

    // Count courses in this school
    const totalCourses = await Course.countDocuments({ school: adminSchoolId });
    const draftCourses = await Course.countDocuments({ school: adminSchoolId, status: 'draft' });
    const publishedCourses = await Course.countDocuments({ school: adminSchoolId, status: 'published' });
    const generatedCourses = await Course.countDocuments({ school: adminSchoolId, status: 'generated' });

    // Count enrollments for courses in this school
    const totalEnrollments = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $match: { 'courseInfo.school': adminSchoolId }
      },
      { $count: 'total' }
    ]);

    const completedEnrollments = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $match: { 'courseInfo.school': adminSchoolId, completed: true }
      },
      { $count: 'total' }
    ]);

    // Count quizzes in this school
    const totalQuizzes = await Quiz.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $match: { 'courseInfo.school': adminSchoolId }
      },
      { $count: 'total' }
    ]);

    // Count departments in this school
    const totalDepartments = await Department.countDocuments({ school: adminSchoolId });

    // Get top teachers by course count
    const topTeachers = await Course.aggregate([
      { $match: { school: adminSchoolId } },
      { $group: { _id: '$teacher', courseCount: { $sum: 1 } } },
      { $sort: { courseCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'teacherInfo' } },
      { $unwind: { path: '$teacherInfo', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, teacherName: '$teacherInfo.fullName', courseCount: 1 } }
    ]);

    // Get departments with their user counts
    const departmentStats = await User.aggregate([
      { $match: { school: adminSchoolId, department: { $ne: null } } },
      { $group: { _id: '$department', userCount: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'deptInfo' } },
      { $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, departmentName: '$deptInfo.name', userCount: 1 } },
      { $sort: { userCount: -1 } }
    ]);

    const dashboardStats = {
      school: {
        id: schoolInfo?._id,
        name: schoolInfo?.name,
        type: schoolInfo?.type,
        isVerified: schoolInfo?.isVerified,
        isBlocked: schoolInfo?.isBlocked
      },
      users: {
        total: totalUsers,
        teachers: totalTeachers,
        students: totalStudents,
        hods: totalHODs,
        hodAssistants: totalHODAssistants,
        blocked: blockedUsers
      },
      courses: {
        total: totalCourses,
        draft: draftCourses,
        published: publishedCourses,
        generated: generatedCourses
      },
      enrollments: {
        total: totalEnrollments[0]?.total || 0,
        completed: completedEnrollments[0]?.total || 0
      },
      quizzes: {
        total: totalQuizzes[0]?.total || 0
      },
      departments: {
        total: totalDepartments
      },
      topTeachers,
      departmentStats
    };

    res.status(200).json({
      status: 'success',
      data: dashboardStats
    });
  } catch (err) {
    console.error('Admin dashboard stats error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get dashboard stats for HOD (department-specific)
export const getHODDashboardStats = async (req, res) => {
  try {
    // Only HOD can access this
    if (req.user.role !== 'hod') {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    const hodDepartmentId = req.user.department;
    const hodSchoolId = req.user.school;

    if (!hodDepartmentId) {
      return res.status(400).json({ status: 'fail', message: 'HOD department not found' });
    }

    // Import models
    const Department = (await import('../models/departmentModel.js')).default;
    const Course = (await import('../models/courseModel.js')).default;
    const Enrollment = (await import('../models/enrollmentModel.js')).default;
    const Quiz = (await import('../models/quizModel.js')).default;

    // Get department info
    const departmentInfo = await Department.findById(hodDepartmentId).populate('school', 'name');

    // Count users in this department
    const totalTeachers = await User.countDocuments({ department: hodDepartmentId, role: 'teacher' });
    const totalStudents = await User.countDocuments({ department: hodDepartmentId, role: 'student' });
    const totalHODAssistants = await User.countDocuments({ department: hodDepartmentId, role: 'hod_assistant' });
    const totalUsers = await User.countDocuments({ department: hodDepartmentId });
    const blockedUsers = await User.countDocuments({ department: hodDepartmentId, isBlocked: true });

    // Count courses in this department
    const totalCourses = await Course.countDocuments({ department: hodDepartmentId });
    const draftCourses = await Course.countDocuments({ department: hodDepartmentId, status: 'draft' });
    const publishedCourses = await Course.countDocuments({ department: hodDepartmentId, status: 'published' });
    const generatedCourses = await Course.countDocuments({ department: hodDepartmentId, status: 'generated' });

    // Count enrollments for courses in this department
    const totalEnrollments = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $match: { 'courseInfo.department': hodDepartmentId }
      },
      { $count: 'total' }
    ]);

    const completedEnrollments = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $match: { 'courseInfo.department': hodDepartmentId, completed: true }
      },
      { $count: 'total' }
    ]);

    // Count quizzes in this department
    const totalQuizzes = await Quiz.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $match: { 'courseInfo.department': hodDepartmentId }
      },
      { $count: 'total' }
    ]);

    // Get teachers by course count
    const topTeachers = await Course.aggregate([
      { $match: { department: hodDepartmentId } },
      { $group: { _id: '$teacher', courseCount: { $sum: 1 } } },
      { $sort: { courseCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'teacherInfo' } },
      { $unwind: { path: '$teacherInfo', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, teacherName: '$teacherInfo.fullName', teacherEmail: '$teacherInfo.email', courseCount: 1 } }
    ]);

    // Get course status breakdown
    const courseStatusBreakdown = await Course.aggregate([
      { $match: { department: hodDepartmentId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const dashboardStats = {
      department: {
        id: departmentInfo?._id,
        name: departmentInfo?.name,
        school: departmentInfo?.school
      },
      users: {
        total: totalUsers,
        teachers: totalTeachers,
        students: totalStudents,
        hodAssistants: totalHODAssistants,
        blocked: blockedUsers
      },
      courses: {
        total: totalCourses,
        draft: draftCourses,
        published: publishedCourses,
        generated: generatedCourses
      },
      enrollments: {
        total: totalEnrollments[0]?.total || 0,
        completed: completedEnrollments[0]?.total || 0
      },
      quizzes: {
        total: totalQuizzes[0]?.total || 0
      },
      topTeachers,
      courseStatusBreakdown
    };

    res.status(200).json({
      status: 'success',
      data: dashboardStats
    });
  } catch (err) {
    console.error('HOD dashboard stats error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get dashboard stats for teacher (single teacher dashboard)
export const getTeacherDashboardStats = async (req, res) => {
  try {
    // Only teacher can access this
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    const teacherId = req.user.id;

    // Import models
    const Course = (await import('../models/courseModel.js')).default;
    const Enrollment = (await import('../models/enrollmentModel.js')).default;

    // Get teacher info
    const teacher = await User.findById(teacherId)
      .populate('school', 'name')
      .populate('department', 'name')
      .select('fullName email designation school department createdAt');

    // Count courses
    const totalCourses = await Course.countDocuments({ teacher: teacherId });
    const draftCourses = await Course.countDocuments({ teacher: teacherId, status: 'draft' });
    const publishedCourses = await Course.countDocuments({ teacher: teacherId, status: 'published' });
    const generatedCourses = await Course.countDocuments({ teacher: teacherId, status: 'generated' });

    // Get total enrollments across all teacher's courses
    const enrollmentStats = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $match: { 'courseInfo.teacher': teacherId }
      },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedEnrollments: { $sum: { $cond: ['$completed', 1, 0] } }
        }
      }
    ]);

    // Get course status breakdown
    const courseStatusBreakdown = await Course.aggregate([
      { $match: { teacher: teacherId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const dashboardStats = {
      teacher: {
        id: teacher?._id,
        fullName: teacher?.fullName,
        email: teacher?.email,
        designation: teacher?.designation,
        school: teacher?.school,
        department: teacher?.department,
        joinedAt: teacher?.createdAt
      },
      courses: {
        total: totalCourses,
        draft: draftCourses,
        published: publishedCourses,
        generated: generatedCourses
      },
      enrollments: {
        total: enrollmentStats[0]?.totalEnrollments || 0,
        completed: enrollmentStats[0]?.completedEnrollments || 0
      },
      courseStatusBreakdown
    };

    res.status(200).json({
      status: 'success',
      data: dashboardStats
    });
  } catch (err) {
    console.error('Teacher dashboard stats error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get recent courses (admin/superadmin/teacher/student)
export const getRecentCourses = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    // Import models
    const Course = (await import('../models/courseModel.js')).default;

    let query = {};

    // Filter based on user role
    if (req.user.role === 'admin') {
      // Admin sees courses from their school
      query.school = req.user.school;
    } else if (req.user.role === 'teacher') {
      // Teacher sees their own courses
      query.teacher = req.user.id;
    } else if (req.user.role === 'hod') {
      // HOD sees courses from their department
      query.department = req.user.department;
    } else if (req.user.role === 'student') {
      // Student sees only published courses and their enrolled courses
      query.status = 'published';
    }
    // Superadmin sees all courses

    const [total, courses] = await Promise.all([
      Course.countDocuments(query),
      Course.find(query)
        .populate('teacher', 'fullName email')
        .populate('school', 'name')
        .populate('department', 'name')
        .select('_id title description status teacher school department createdAt updatedAt enrollmentCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      status: 'success',
      results: courses.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      },
      data: courses
    });
  } catch (err) {
    console.error('Recent courses error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get dashboard stats for student (single student dashboard)
export const getStudentDashboardStats = async (req, res) => {
  try {
    // Only student can access this
    if (req.user.role !== 'student') {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    const studentId = req.user.id;

    // Import models
    const Course = (await import('../models/courseModel.js')).default;
    const Enrollment = (await import('../models/enrollmentModel.js')).default;

    // Get student info
    const student = await User.findById(studentId)
      .populate('school', 'name')
      .populate('department', 'name')
      .select('fullName email collegeRollNo school department createdAt');

    // Get all enrollments for this student
    const enrollments = await Enrollment.find({ student: studentId })
      .populate({
        path: 'course',
        select: 'title description status teacher school department enrollmentCode',
        populate: [
          { path: 'teacher', select: 'fullName email' },
          { path: 'school', select: 'name' }
        ]
      });

    // Count stats
    const totalEnrolled = enrollments.length;
    const completedEnrollments = enrollments.filter(e => e.completed).length;
    const inProgressEnrollments = enrollments.filter(e => !e.completed).length;

    // Get enrolled courses
    const enrolledCourses = enrollments.map(e => ({
      courseId: e.course._id,
      title: e.course.title,
      description: e.course.description,
      status: e.course.status,
      teacher: e.course.teacher,
      school: e.course.school,
      completedUnits: e.completedUnits,
      finalScore: e.finalScore,
      completed: e.completed,
      enrolledAt: e.enrolledAt
    }));

    // Get enrollment status breakdown
    const enrollmentStatusBreakdown = [
      { status: 'completed', count: completedEnrollments },
      { status: 'in-progress', count: inProgressEnrollments }
    ];

    // Get average completion rate
    const totalUnitsAcrossEnrollments = enrollments.reduce((sum, e) => sum + (e.completedUnits?.length || 0), 0);
    const averageProgressPercentage = totalEnrolled > 0 
      ? Math.round((totalUnitsAcrossEnrollments / (totalEnrolled * 10)) * 100) // assuming avg 10 units per course
      : 0;

    const dashboardStats = {
      student: {
        id: student?._id,
        fullName: student?.fullName,
        email: student?.email,
        collegeRollNo: student?.collegeRollNo,
        school: student?.school,
        department: student?.department,
        joinedAt: student?.createdAt
      },
      enrollments: {
        total: totalEnrolled,
        completed: completedEnrollments,
        inProgress: inProgressEnrollments
      },
      performance: {
        averageProgressPercentage,
        completionRate: totalEnrolled > 0 ? Math.round((completedEnrollments / totalEnrolled) * 100) : 0
      },
      enrollmentStatusBreakdown,
      enrolledCourses
    };

    res.status(200).json({
      status: 'success',
      data: dashboardStats
    });
  } catch (err) {
    console.error('Student dashboard stats error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};


