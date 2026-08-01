import Quiz from '../models/quizModel.js';
import Unit from '../models/unitModel.js';
import Course from '../models/courseModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Generate quiz via RAG and save under unit
export const generateQuizForUnit = asyncHandler(async (req, res) => {
  const { courseId, unitId, assessmentType = 'quiz', difficultyMix, questionCount } = req.body;

  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });

  const unit = await Unit.findById(unitId);
  if (!unit || String(unit.course) !== String(courseId)) {
    return res.status(404).json({ status: 'error', message: 'Unit not found for given course' });
  }

  // The generator reads the unit straight from MongoDB, so it always sees the
  // current outline, teaching plan, labs and extracted PDF text. Posting a
  // pre-flattened content blob meant later edits were never picked up.
  const payload = {
    course_id: course._id.toString(),
    unit_id: unit._id.toString(),
    assessment_type: assessmentType,
    question_count: Number(questionCount) || 5,
    difficulty_mix: difficultyMix || undefined
  };

  // Previously pointed at /rag/generate-assessment on a service that has no such
  // route, so this endpoint always failed.
  const url = process.env.ADAPTIVE_LEARNING_URL || 'http://localhost:4000';
  const endpoint = `${url.replace(/\/$/, '')}/api/adaptive/generate-assessment`;

  let data;
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error('[quiz:generate] Generator error:', resp.status, text);
      return res.status(resp.status === 503 ? 503 : 502).json({
        status: 'error',
        message: 'Question generator is unavailable. Please try again.'
      });
    }
    data = JSON.parse(text);
  } catch (error) {
    console.error('[quiz:generate] Request failed:', error.message);
    return res.status(502).json({ status: 'error', message: 'Could not reach the question generator' });
  }

  if (!Array.isArray(data?.questions) || data.questions.length === 0) {
    return res.status(502).json({ status: 'error', message: 'Generator returned no questions' });
  }

  // Reject anything the Quiz schema would silently mangle.
  const questions = data.questions.filter(
    q =>
      typeof q?.question === 'string' &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      Number.isInteger(q.correctAnswer) &&
      q.correctAnswer >= 0 &&
      q.correctAnswer < 4
  );
  if (questions.length === 0) {
    return res.status(502).json({ status: 'error', message: 'Generator returned no valid questions' });
  }

  const quiz = await Quiz.create({
    course: course._id,
    unit: unit._id,
    unitNumber: unit.unitNumber,
    title: data.title || `Unit ${unit.unitNumber} Quiz`,
    questions
  });

  res.status(201).json({
    status: 'success',
    data: { quiz, groundedInMaterial: Boolean(data.grounded_in_material), dropped: data.questions.length - questions.length }
  });
});

/**
 * These read routes are open to students, so the answer key has to be removed
 * before the questions leave the server — otherwise any student can read
 * correctAnswer straight out of the network response.
 */
const canSeeAnswers = req => ['teacher', 'admin'].includes(req.user?.role);

const stripAnswerKey = question => {
  const plain = typeof question?.toObject === 'function' ? question.toObject() : { ...question };
  delete plain.correctAnswer;
  delete plain.solutionApproach;
  return plain;
};

const presentQuestions = (req, questions) =>
  canSeeAnswers(req) ? questions : (questions || []).map(stripAnswerKey);

// List quizzes for a unit
export const listQuizzesForUnit = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const quizzes = await Quiz.find({ unit: unitId }).sort({ createdAt: -1 });
  const payload = quizzes.map(quiz => {
    const plain = quiz.toObject();
    plain.questions = presentQuestions(req, plain.questions);
    return plain;
  });
  res.json({ status: 'success', data: { quizzes: payload, count: payload.length } });
});

// Get random N questions from the latest quiz of a unit
export const getRandomQuestions = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const count = Number(req.query.count || 5);
  const latest = await Quiz.findOne({ unit: unitId }).sort({ createdAt: -1 });
  if (!latest) return res.status(404).json({ status: 'error', message: 'No quiz found for unit' });
  const qs = latest.questions || [];
  if (qs.length === 0) return res.status(404).json({ status: 'error', message: 'No questions available' });
  const shuffled = [...qs].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, qs.length));
  res.json({ status: 'success', data: { title: latest.title, questions: presentQuestions(req, selected) } });
});

// Get a specific quiz by id
export const getQuizById = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ status: 'error', message: 'Quiz not found' });
  const plain = quiz.toObject();
  plain.questions = presentQuestions(req, plain.questions);
  res.json({ status: 'success', data: { quiz: plain } });
});

// Get random questions across all quizzes for a unit
export const getRandomQuestionsFromAll = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const count = Number(req.query.count || 5);
  const quizzes = await Quiz.find({ unit: unitId }).sort({ createdAt: -1 });
  if (!quizzes || quizzes.length === 0) {
    return res.status(404).json({ status: 'error', message: 'No quizzes found for unit' });
  }
  const allQs = quizzes.flatMap(q => q.questions || []);
  if (allQs.length === 0) {
    return res.status(404).json({ status: 'error', message: 'No questions available' });
  }
  const shuffled = [...allQs].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, allQs.length));
  res.json({
    status: 'success',
    data: { title: `Unit Random Questions`, questions: presentQuestions(req, selected), totalPool: allQs.length }
  });
});

// Manually create a quiz by teacher
export const createQuizManual = asyncHandler(async (req, res) => {
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
  const quiz = await Quiz.create({
    course: course._id,
    unit: unit._id,
    unitNumber: unit.unitNumber,
    title,
    questions
  });
  res.status(201).json({ status: 'success', data: { quiz } });
});

// Update a quiz (title/questions)
export const updateQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const updates = {};
  const { title, questions } = req.body;
  if (typeof title === 'string') updates.title = title;
  if (Array.isArray(questions)) updates.questions = questions;
  if (!Object.keys(updates).length) {
    return res.status(400).json({ status: 'error', message: 'Nothing to update' });
  }
  const quiz = await Quiz.findByIdAndUpdate(quizId, { $set: updates }, { new: true });
  if (!quiz) return res.status(404).json({ status: 'error', message: 'Quiz not found' });
  res.json({ status: 'success', data: { quiz } });
});

// Delete a quiz
export const deleteQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const quiz = await Quiz.findByIdAndDelete(quizId);
  if (!quiz) return res.status(404).json({ status: 'error', message: 'Quiz not found' });
  res.json({ status: 'success', message: 'Quiz deleted' });
});

// Publish a quiz (set status = 'published')
export const publishQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const quiz = await Quiz.findByIdAndUpdate(
    quizId,
    { $set: { status: 'published' } },
    { new: true }
  );
  if (!quiz) return res.status(404).json({ status: 'error', message: 'Quiz not found' });
  res.json({ status: 'success', message: 'Quiz published', data: { quiz } });
});

// Unpublish a quiz (set status = 'draft')
export const unpublishQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const quiz = await Quiz.findByIdAndUpdate(
    quizId,
    { $set: { status: 'draft' } },
    { new: true }
  );
  if (!quiz) return res.status(404).json({ status: 'error', message: 'Quiz not found' });
  res.json({ status: 'success', message: 'Quiz unpublished', data: { quiz } });
});
