import Course from '../models/courseModel.js';
import Unit from '../models/unitModel.js';
import Quiz from '../models/quizModel.js';
import QuizSubmission from '../models/quizSubmissionModel.js';
import Tutorial from '../models/tutorialModel.js';
import TutorialSubmission from '../models/tutorialSubmissionModel.js';
import Enrollment from '../models/enrollmentModel.js';
import { uploadToS3 } from '../utils/s3.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createAdaptiveLearning,
  generateAdaptiveQuiz,
  submitAdaptiveQuiz,
  getStudentProgress,
  getStudentCourseProgress,
  getStudentUnitProgress
} from '../utils/adaptiveService.js';

// List published courses for students
export const listPublishedCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (p - 1) * l;
  const [total, courses] = await Promise.all([
    Course.countDocuments({ status: 'published' }),
    Course.find({ status: 'published' }).select('title description teacher status')
      .populate('teacher', 'fullName')
      .sort({ createdAt: -1 }).skip(skip).limit(l)
  ]);
  res.json({ status: 'success', data: { courses, page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
});

// List courses the current student is enrolled in
export const listEnrolledCourses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const studentId = req.user.id;
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (p - 1) * l;

  const [total, enrollments] = await Promise.all([
    Enrollment.countDocuments({ student: studentId }),
    Enrollment.find({ student: studentId })
      .populate({
        path: 'course',
        select: 'title description status teacher',
        populate: { path: 'teacher', select: 'fullName' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
  ]);

  const courses = enrollments.map(e => e.course).filter(Boolean);

  res.json({
    status: 'success',
    data: {
      courses,
      enrollments,
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l)
    }
  });
});

// List quizzes for a unit (latest only) — course must be published
export const listQuizzesForUnitStudent = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const unit = await Unit.findById(unitId);
  if (!unit) return res.status(404).json({ status: 'error', message: 'Unit not found' });
  const course = await Course.findById(unit.course);
  if (!course || course.status !== 'published') return res.status(403).json({ status: 'error', message: 'Course not published' });
  const quizzes = await Quiz.find({ unit: unitId, status: 'published' })
    .select('_id course unit unitNumber title status')
    .sort({ createdAt: -1 });
  res.json({ status: 'success', data: { quizzes, count: quizzes.length } });
});

// Submit quiz attempt and return marks
export const submitQuizStudent = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { answers = [] } = req.body;
  const quiz = await Quiz.findById(quizId).populate('course', 'status');
  if (!quiz) return res.status(404).json({ status: 'error', message: 'Quiz not found' });
  const course = await Course.findById(quiz.course);
  if (!course || course.status !== 'published') return res.status(403).json({ status: 'error', message: 'Course not published' });
  const total = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
  const details = [];
  let score = 0;
  if (total > 0 && Array.isArray(answers)) {
    for (const a of answers) {
      const qi = a.questionIndex;
      if (qi == null || qi < 0 || qi >= total) continue;
      const q = quiz.questions[qi];
      const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : undefined;
      const isCorrect = typeof a.answerIndex === 'number' && typeof correctIdx === 'number' && a.answerIndex === correctIdx;
      if (isCorrect) score += 1;
      details.push({ questionIndex: qi, correct: !!isCorrect, correctAnswer: correctIdx });
    }
  }
  const submission = await QuizSubmission.create({
    quiz: quiz._id,
    course: quiz.course,
    unit: quiz.unit,
    submittedBy: req.user.id,
    answers,
    score,
    total,
    details
  });
  res.status(201).json({ status: 'success', data: { submission, marks: { score, total } } });
});

// List tutorials for unit (course must be published)
export const listTutorialsForUnitStudent = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const unit = await Unit.findById(unitId);
  if (!unit) return res.status(404).json({ status: 'error', message: 'Unit not found' });
  const course = await Course.findById(unit.course);
  if (!course || course.status !== 'published') return res.status(403).json({ status: 'error', message: 'Course not published' });
  const tutorials = await Tutorial.find({ unit: unitId, status: 'published' })
    .select('_id course unit unitNumber title status')
    .sort({ createdAt: -1 });
  res.json({ status: 'success', data: { tutorials, count: tutorials.length } });
});

// Submit tutorial answers (free-form), creates submission awaiting teacher grading
export const submitTutorialStudent = asyncHandler(async (req, res) => {
  const { tutorialId } = req.params;
  const { answers = [] } = req.body; // [{ questionIndex, responseText }]
  const tutorial = await Tutorial.findById(tutorialId).populate('course', 'status');
  if (!tutorial) return res.status(404).json({ status: 'error', message: 'Tutorial not found' });
  const course = await Course.findById(tutorial.course);
  if (!course || course.status !== 'published') return res.status(403).json({ status: 'error', message: 'Course not published' });

  // Optional file upload to R2 if provided via multipart/form-data under field 'file'
  let fileMeta = {};
  if (req.file && req.file.buffer) {
    const bucket = process.env.CF_BUCKET_NAME;
    const safeName = (req.file.originalname || 'submission').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = `courses/${course._id}/units/${tutorial.unit}/tutorials/${tutorial._id}/submissions/${req.user.id}/${Date.now()}-${safeName}`;
    const fileUrl = await uploadToS3(bucket, key, req.file.buffer, req.file.mimetype);
    fileMeta = {
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    };
  }

  const submission = await TutorialSubmission.create({
    tutorial: tutorial._id,
    course: tutorial.course,
    unit: tutorial.unit,
    submittedBy: req.user.id,
    answers,
    ...fileMeta
  });
  res.status(201).json({ status: 'success', data: { submission } });
});

// Student dashboard metrics (basic): courses enrolled, quiz average, tutorial submissions count
export const studentDashboard = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const quizSubs = await QuizSubmission.find({ submittedBy: studentId });
  const tutorialSubs = await TutorialSubmission.find({ submittedBy: studentId });
  const totalQuiz = quizSubs.length;
  const quizScoreSum = quizSubs.reduce((sum, s) => sum + (s.score || 0), 0);
  const quizMaxSum = quizSubs.reduce((sum, s) => sum + (s.total || 0), 0);
  const tutorialCount = tutorialSubs.length;
  res.json({
    status: 'success',
    data: {
      quizzes: { attempts: totalQuiz, score: quizScoreSum, max: quizMaxSum, avg: quizMaxSum ? (quizScoreSum / quizMaxSum) : 0 },
      tutorials: { submissions: tutorialCount }
    }
  });
});

// ================== ADAPTIVE LEARNING ENDPOINTS ==================

/**
 * Shared guard for the adaptive endpoints: the course must exist, be published,
 * and the student must actually be enrolled in it. Without the enrollment check
 * any signed-in student could drill — and accumulate mastery records for — every
 * published course on the platform.
 *
 * Returns the course on success, or null after sending the error response.
 */
const requireEnrolledCourse = async (req, res, courseId) => {
  if (!courseId) {
    res.status(400).json({ status: 'error', message: 'courseId is required' });
    return null;
  }

  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404).json({ status: 'error', message: 'Course not found' });
    return null;
  }
  if (course.status !== 'published') {
    res.status(403).json({ status: 'error', message: 'Course must be published' });
    return null;
  }

  const enrollment = await Enrollment.findOne({ course: courseId, student: req.user.id });
  if (!enrollment) {
    res.status(403).json({ status: 'error', message: 'You are not enrolled in this course' });
    return null;
  }

  return course;
};

/**
 * 1. Initialize adaptive learning for a student in a course
 * POST /api/v1/students/adaptive/initialize
 * Body: { courseId }
 */
export const initializeAdaptiveLearning = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { courseId } = req.body;

  if (!(await requireEnrolledCourse(req, res, courseId))) return;

  try {
    const result = await createAdaptiveLearning(studentId, courseId);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    res.status(error.status || 500).json({ status: 'error', message: error.message });
  }
});

/**
 * 2. Generate an adaptive quiz for a student
 * POST /api/v1/students/adaptive/generate-quiz
 * Body: { courseId, unitId }
 */
export const generateAdaptiveQuizStudent = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { courseId, unitId } = req.body;

  if (!unitId) {
    return res.status(400).json({ status: 'error', message: 'unitId is required' });
  }
  if (!(await requireEnrolledCourse(req, res, courseId))) return;

  const unit = await Unit.findById(unitId);
  if (!unit) {
    return res.status(404).json({ status: 'error', message: 'Unit not found' });
  }
  if (unit.course.toString() !== courseId) {
    return res.status(400).json({ status: 'error', message: 'Unit does not belong to this course' });
  }

  try {
    // Auto-initialize adaptive learning record (idempotent - returns existing if already created)
    // This ensures quizStats entries exist for all units/LOs before generating quiz
    await createAdaptiveLearning(studentId, courseId);

    const result = await generateAdaptiveQuiz(studentId, courseId, unitId);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    res.status(error.status || 500).json({ status: 'error', message: error.message });
  }
});

/**
 * 3. Submit adaptive quiz answer, update stats, and get next question
 * POST /api/v1/students/adaptive/submit-quiz
 * Body: { quizId, courseId, answers: [{ questionIndex, selectedOption }] }
 */
export const submitAdaptiveQuizStudent = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { quizId, courseId, answers } = req.body;

  if (!quizId || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'quizId, courseId, and a non-empty answers array are required'
    });
  }

  if (!(await requireEnrolledCourse(req, res, courseId))) return;

  try {
    const result = await submitAdaptiveQuiz(quizId, studentId, courseId, answers);
    res.json({ status: 'success', data: result });
  } catch (error) {
    // Preserve the engine's status code so "already answered" and "not your
    // quiz" do not surface to the student as a generic 500.
    res.status(error.status || 500).json({ status: 'error', message: error.message });
  }
});

/**
 * 4. Get student progress (all courses, or filtered by courseId)
 * GET /api/v1/students/adaptive/progress?courseId={courseId}
 */
export const getAdaptiveProgress = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { courseId } = req.query;

  try {
    const result = await getStudentProgress(studentId, courseId);
    res.json({ status: 'success', data: result });
  } catch (error) {
    res.status(error.status || 500).json({ status: 'error', message: error.message });
  }
});

/**
 * 5. Get student progress for a specific course
 * GET /api/v1/students/adaptive/progress/course/:courseId
 */
export const getAdaptiveCourseProgress = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { courseId } = req.params;

  try {
    const result = await getStudentCourseProgress(studentId, courseId);
    res.json({ status: 'success', data: result });
  } catch (error) {
    res.status(error.status || 500).json({ status: 'error', message: error.message });
  }
});

/**
 * 6. Get student progress for a specific unit in a course
 * GET /api/v1/students/adaptive/progress/course/:courseId/unit/:unitId
 */
export const getAdaptiveUnitProgress = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { courseId, unitId } = req.params;

  try {
    const result = await getStudentUnitProgress(studentId, courseId, unitId);
    res.json({ status: 'success', data: result });
  } catch (error) {
    res.status(error.status || 500).json({ status: 'error', message: error.message });
  }
});

// ================== COURSE & UNIT INFO ENDPOINTS ==================

/**
 * Get basic course information
 * GET /api/v1/students/course/:courseId
 */
export const getCourseInfo = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId)
    .select('title description teacher status')
    .populate('teacher', 'fullName email designation');

  if (!course) {
    return res.status(404).json({ status: 'error', message: 'Course not found' });
  }

  res.json({
    status: 'success',
    data: {
      _id: course._id,
      title: course.title,
      description: course.description,
      status: course.status,
      teacher: course.teacher
    }
  });
});

/**
 * Get basic unit information
 * GET /api/v1/students/unit/:unitId
 */
export const getUnitInfo = asyncHandler(async (req, res) => {
  const { unitId } = req.params;

  const unit = await Unit.findById(unitId)
    .select('title description unitNumber learningObjectives estimatedTime teachingPlan')
    .populate('course', 'title');

  if (!unit) {
    return res.status(404).json({ status: 'error', message: 'Unit not found' });
  }

  res.json({
    status: 'success',
    data: {
      _id: unit._id,
      title: unit.title,
      description: unit.description,
      unitNumber: unit.unitNumber,
      course: unit.course,
      learningObjectives: unit.learningObjectives,
      estimatedTime: unit.estimatedTime,
      teachingPlan: unit.teachingPlan
    }
  });
});
