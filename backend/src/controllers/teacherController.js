import Course from '../models/courseModel.js';
import QuizSubmission from '../models/quizSubmissionModel.js';
import TutorialSubmission from '../models/tutorialSubmissionModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// List all tutorial submissions for a course (paginated)
export const listTutorialSubmissions = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (p - 1) * l;
  const [total, subs] = await Promise.all([
    TutorialSubmission.countDocuments({ course: courseId }),
    TutorialSubmission.find({ course: courseId })
      .populate('submittedBy', 'fullName')
      .sort({ createdAt: -1 }).skip(skip).limit(l)
  ]);
  res.json({ status: 'success', data: { submissions: subs, page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
});

// Grade a tutorial submission
export const gradeTutorialSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const { score = 0, maxScore = 0, feedback = '' } = req.body;
  const sub = await TutorialSubmission.findByIdAndUpdate(
    submissionId,
    { $set: { grading: { gradedBy: req.user.id, score, maxScore, feedback, gradedAt: new Date() } } },
    { new: true }
  );
  if (!sub) return res.status(404).json({ status: 'error', message: 'Submission not found' });
  res.json({ status: 'success', data: { submission: sub } });
});

// Course leaderboard from quiz submissions (sum of scores per student)
export const courseLeaderboard = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (p - 1) * l;
  const pipeline = [
    { $match: { course: typeof courseId === 'string' ? (await import('mongoose')).default.Types.ObjectId.createFromHexString(courseId) : courseId } },
    { $group: { _id: '$submittedBy', totalScore: { $sum: '$score' }, totalMax: { $sum: '$total' }, attempts: { $sum: 1 } } },
    { $sort: { totalScore: -1 } },
    { $skip: skip },
    { $limit: l }
  ];
  const agg = await QuizSubmission.aggregate(pipeline);
  // Populate user names
  const ids = agg.map(a => a._id);
  const users = await (await import('../models/userModel.js')).default.find({ _id: { $in: ids } }).select('fullName');
  const userMap = new Map(users.map(u => [String(u._id), u.fullName]));
  const leaderboard = agg.map(a => ({ userId: a._id, fullName: userMap.get(String(a._id)) || 'Unknown', score: a.totalScore, max: a.totalMax, attempts: a.attempts }));

  res.json({ status: 'success', data: { leaderboard, page: p, limit: l } });
});
