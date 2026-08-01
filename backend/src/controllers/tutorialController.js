import Tutorial from '../models/tutorialModel.js';
import Unit from '../models/unitModel.js';
import Course from '../models/courseModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Generate tutorial via RAG and save under unit (auto content from unit)
export const generateTutorialForUnit = asyncHandler(async (req, res) => {
  const { courseId, unitId, assessmentType = 'tutorial', difficultyMix, questionCount } = req.body;

  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });

  const unit = await Unit.findById(unitId);
  if (!unit || String(unit.course) !== String(courseId)) {
    return res.status(404).json({ status: 'error', message: 'Unit not found for given course' });
  }

  const teachingPlanText = typeof unit.teachingPlan === 'object' ? JSON.stringify(unit.teachingPlan) : String(unit.teachingPlan || '');
  const activitiesText = JSON.stringify({ labs: unit.labs || [], tutorials: unit.tutorials || [] });
  const fileTexts = Array.isArray(unit.files)
    ? unit.files.map(f => f.textExtract).filter(Boolean).join('\n\n')
    : '';
  const combinedContent = [unit.outlineText || '', teachingPlanText, activitiesText, fileTexts]
    .filter(Boolean)
    .join('\n\n');

  const url = process.env.RAG_URL || process.env.FASTAPI_URL || 'http://localhost:5000';
  const endpoint = `${url.replace(/\/$/, '')}/rag/generate-assignment`;

  const payload = {
    courseId: course._id.toString(),
    unitNumber: unit.unitNumber,
    contentText: combinedContent,
    assessmentType,
    difficultyMix,
    questionCount
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const text = await resp.text();
    return res.status(500).json({ status: 'error', message: `RAG error: ${text}` });
  }
  const data = await resp.json();
  if (!data?.questions || !Array.isArray(data.questions)) {
    return res.status(500).json({ status: 'error', message: 'Invalid RAG response format' });
  }

  const tutorial = await Tutorial.create({
    course: course._id,
    unit: unit._id,
    unitNumber: unit.unitNumber,
    title: data.title || `Unit ${unit.unitNumber} Tutorial`,
    questions: data.questions
  });

  res.status(201).json({ status: 'success', data: { tutorial } });
});

// List tutorials for a unit
export const listTutorialsForUnit = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const tutorials = await Tutorial.find({ unit: unitId }).sort({ createdAt: -1 });
  res.json({ status: 'success', data: { tutorials, count: tutorials.length } });
});

// Get a specific tutorial by id
export const getTutorialById = asyncHandler(async (req, res) => {
  const { tutorialId } = req.params;
  const tutorial = await Tutorial.findById(tutorialId);
  if (!tutorial) return res.status(404).json({ status: 'error', message: 'Tutorial not found' });
  res.json({ status: 'success', data: { tutorial } });
});

// Create tutorial manually (teacher)
export const createTutorialManual = asyncHandler(async (req, res) => {
  const { courseId, unitId, title, questions } = req.body;
  if (!courseId || !unitId || !title || !Array.isArray(questions)) {
    return res.status(400).json({ status: 'error', message: 'courseId, unitId, title, questions are required' });
  }
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });
  const unit = await Unit.findById(unitId);
  if (!unit || String(unit.course) !== String(courseId)) {
    return res.status(404).json({ status: 'error', message: 'Unit not found for given course' });
  }
  const tutorial = await Tutorial.create({
    course: course._id,
    unit: unit._id,
    unitNumber: unit.unitNumber,
    title,
    questions
  });
  res.status(201).json({ status: 'success', data: { tutorial } });
});

// Update tutorial
export const updateTutorial = asyncHandler(async (req, res) => {
  const { tutorialId } = req.params;
  const updates = {};
  const { title, questions } = req.body;
  if (typeof title === 'string') updates.title = title;
  if (Array.isArray(questions)) updates.questions = questions;
  if (!Object.keys(updates).length) {
    return res.status(400).json({ status: 'error', message: 'Nothing to update' });
  }
  const tutorial = await Tutorial.findByIdAndUpdate(tutorialId, { $set: updates }, { new: true });
  if (!tutorial) return res.status(404).json({ status: 'error', message: 'Tutorial not found' });
  res.json({ status: 'success', data: { tutorial } });
});

// Delete tutorial
export const deleteTutorial = asyncHandler(async (req, res) => {
  const { tutorialId } = req.params;
  const tutorial = await Tutorial.findByIdAndDelete(tutorialId);
  if (!tutorial) return res.status(404).json({ status: 'error', message: 'Tutorial not found' });
  res.json({ status: 'success', message: 'Tutorial deleted' });
});

// Publish a tutorial (set status = 'published')
export const publishTutorial = asyncHandler(async (req, res) => {
  const { tutorialId } = req.params;
  // Validate existence first for clearer errors
  const existing = await Tutorial.findById(tutorialId);
  if (!existing) return res.status(404).json({ status: 'error', message: 'Tutorial not found' });
  const tutorial = await Tutorial.findByIdAndUpdate(
    tutorialId,
    { $set: { status: 'published' } },
    { new: true }
  );
  res.json({ status: 'success', message: 'Tutorial published', data: { tutorial } });
});

// Get random N questions from the latest tutorial for a unit
export const getRandomTutorialQuestions = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const count = Number(req.query.count || 5);
  const latest = await Tutorial.findOne({ unit: unitId }).sort({ createdAt: -1 });
  if (!latest) return res.status(404).json({ status: 'error', message: 'No tutorial found for unit' });
  const qs = latest.questions || [];
  if (qs.length === 0) return res.status(404).json({ status: 'error', message: 'No questions available' });
  const shuffled = [...qs].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, qs.length));
  res.json({ status: 'success', data: { title: latest.title, questions: selected } });
});

// Get random N questions across all tutorials for a unit
export const getRandomTutorialQuestionsFromAll = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const count = Number(req.query.count || 5);
  const tutorials = await Tutorial.find({ unit: unitId }).sort({ createdAt: -1 });
  if (!tutorials || tutorials.length === 0) {
    return res.status(404).json({ status: 'error', message: 'No tutorials found for unit' });
  }
  const allQs = tutorials.flatMap(t => t.questions || []);
  if (allQs.length === 0) {
    return res.status(404).json({ status: 'error', message: 'No questions available' });
  }
  const shuffled = [...allQs].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, allQs.length));
  res.json({ status: 'success', data: { title: 'Unit Random Tutorial Questions', questions: selected, totalPool: allQs.length } });
});

// Get student's tutorial submissions (student view)
export const getStudentTutorialSubmissions = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { limit = 10, page = 1, courseId } = req.query;

  // Only students can access this
  if (req.user.role !== 'student') {
    return res.status(403).json({ status: 'fail', message: 'Forbidden' });
  }

  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (pageNum - 1) * limitNum;

  // Import TutorialSubmission model
  const TutorialSubmission = (await import('../models/tutorialSubmissionModel.js')).default;

  let query = { submittedBy: studentId };

  // Filter by courseId if provided
  if (courseId) {
    query.course = courseId;
  }

  const [total, submissions] = await Promise.all([
    TutorialSubmission.countDocuments(query),
    TutorialSubmission.find(query)
      .populate({
        path: 'tutorial',
        select: 'title questions unitNumber'
      })
      .populate({
        path: 'unit',
        select: 'title unitNumber'
      })
      .populate({
        path: 'course',
        select: 'title'
      })
      .populate({
        path: 'grading.gradedBy',
        select: 'fullName email'
      })
      .select('tutorial unit course answers grading fileUrl fileName createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  // Format submission data for student view
  const formattedSubmissions = submissions.map(submission => {
    const questions = submission.tutorial?.questions || [];
    
    return {
      id: submission._id,
      tutorial: {
        id: submission.tutorial?._id,
        title: submission.tutorial?.title,
        unitNumber: submission.tutorial?.unitNumber,
        totalQuestions: questions.length
      },
      unit: {
        id: submission.unit?._id,
        title: submission.unit?.title,
        unitNumber: submission.unit?.unitNumber
      },
      course: {
        id: submission.course?._id,
        title: submission.course?.title
      },
      submission: {
        totalQuestionsAttempted: submission.answers?.length || 0,
        answeredAt: submission.createdAt,
        lastUpdated: submission.updatedAt,
        fileUrl: submission.fileUrl || null,
        fileName: submission.fileName || null
      },
      grading: {
        isGraded: !!submission.grading?.gradedAt,
        score: submission.grading?.score || 0,
        maxScore: submission.grading?.maxScore || 0,
        percentage: submission.grading?.maxScore > 0 
          ? Math.round((submission.grading.score / submission.grading.maxScore) * 100) 
          : 0,
        feedback: submission.grading?.feedback || '',
        gradedBy: submission.grading?.gradedBy ? {
          id: submission.grading.gradedBy._id,
          name: submission.grading.gradedBy.fullName,
          email: submission.grading.gradedBy.email
        } : null,
        gradedAt: submission.grading?.gradedAt || null
      }
    };
  });

  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json({
    status: 'success',
    results: formattedSubmissions.length,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    },
    data: formattedSubmissions
  });
});

// Get student's detailed submission (student view with full answers)
export const getStudentSubmissionDetail = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { submissionId } = req.params;

  // Only students can access this
  if (req.user.role !== 'student') {
    return res.status(403).json({ status: 'fail', message: 'Forbidden' });
  }

  // Import TutorialSubmission model
  const TutorialSubmission = (await import('../models/tutorialSubmissionModel.js')).default;

  const submission = await TutorialSubmission.findById(submissionId)
    .populate({
      path: 'tutorial',
      select: 'title questions unitNumber'
    })
    .populate({
      path: 'unit',
      select: 'title unitNumber description'
    })
    .populate({
      path: 'course',
      select: 'title description'
    })
    .populate({
      path: 'grading.gradedBy',
      select: 'fullName email designation'
    });

  if (!submission) {
    return res.status(404).json({ status: 'fail', message: 'Submission not found' });
  }

  // Verify that this submission belongs to the student
  if (String(submission.submittedBy) !== String(studentId)) {
    return res.status(403).json({ status: 'fail', message: 'Forbidden' });
  }

  // Match answers with questions
  const questions = submission.tutorial?.questions || [];
  const answerDetails = submission.answers?.map((answer, idx) => {
    const question = questions[answer.questionIndex];
    return {
      questionIndex: answer.questionIndex,
      question: question || null,
      studentAnswer: answer.responseText
    };
  }) || [];

  const detailedSubmission = {
    id: submission._id,
    tutorial: {
      id: submission.tutorial?._id,
      title: submission.tutorial?.title,
      unitNumber: submission.tutorial?.unitNumber,
      totalQuestions: questions.length
    },
    unit: {
      id: submission.unit?._id,
      title: submission.unit?.title,
      unitNumber: submission.unit?.unitNumber,
      description: submission.unit?.description
    },
    course: {
      id: submission.course?._id,
      title: submission.course?.title,
      description: submission.course?.description
    },
    submission: {
      totalQuestionsAttempted: submission.answers?.length || 0,
      totalQuestions: questions.length,
      answers: answerDetails,
      fileUrl: submission.fileUrl || null,
      fileName: submission.fileName || null,
      submittedAt: submission.createdAt,
      lastUpdated: submission.updatedAt
    },
    grading: {
      isGraded: !!submission.grading?.gradedAt,
      score: submission.grading?.score || 0,
      maxScore: submission.grading?.maxScore || 0,
      percentage: submission.grading?.maxScore > 0 
        ? Math.round((submission.grading.score / submission.grading.maxScore) * 100) 
        : 0,
      feedback: submission.grading?.feedback || '',
      gradedBy: submission.grading?.gradedBy ? {
        id: submission.grading.gradedBy._id,
        name: submission.grading.gradedBy.fullName,
        email: submission.grading.gradedBy.email,
        designation: submission.grading.gradedBy.designation
      } : null,
      gradedAt: submission.grading?.gradedAt || null
    }
  };

  res.status(200).json({
    status: 'success',
    data: detailedSubmission
  });
});
