// controllers/submissionController.js
import Submission from '../models/submissionModel.js';
import Assessment from '../models/assessmentModel.js';
import Enrollment from '../models/enrollmentModel.js';

// Auto-grade function (basic): MCQ and multi
function autoGrade(assessment, answers) {
  let total = 0;
  const gradedAnswers = [];

  for (const ans of answers) {
    const qIndex = ans.questionIndex;
    const q = assessment.questions[qIndex];
    if (!q) {
      gradedAnswers.push({ ...ans, marksAwarded: 0 });
      continue;
    }

    let marksAwarded = 0;
    if (q.type === 'mcq') {
      if (typeof q.correctAnswer === 'number' && q.correctAnswer === ans.answer) marksAwarded = q.marks || 1;
    } else if (q.type === 'multi') {
      // assume correctAnswer is array of indexes
      if (Array.isArray(q.correctAnswer) && Array.isArray(ans.answer)) {
        const correctSet = new Set(q.correctAnswer.map(Number));
        const ansSet = new Set(ans.answer.map(Number));
        // simple all-or-nothing
        const isEqual = correctSet.size === ansSet.size && [...correctSet].every(x => ansSet.has(x));
        if (isEqual) marksAwarded = q.marks || 1;
      }
    } else {
      // short/long/code - leave for manual grading
      marksAwarded = 0;
    }
    total += marksAwarded;
    gradedAnswers.push({ ...ans, marksAwarded });
  }

  return { gradedAnswers, total };
}

// Create submission and grade
export const submitAssessment = async (req, res) => {
  try {
    const student = req.user.id;
    const { assessmentId } = req.params;
    const { answers } = req.body; // answers: [{questionIndex, answer}, ...]

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) return res.status(404).json({ status: 'error', message: 'Assessment not found' });

    // auto-grade MCQ/multi
    const { gradedAnswers, total } = autoGrade(assessment, answers || []);

    const submission = await Submission.create({
      assessment: assessmentId,
      student,
      answers: gradedAnswers,
      totalScore: total,
      graded: true,
      studentCapabilitySnapshot: {
        overallLevel: 'mid' // placeholder - compute real estimate
      }
    });

    // update enrollment proficiency / completedUnits (simple example)
    const enrollment = await Enrollment.findOne({ course: assessment.course, student });
    if (enrollment) {
      // mark unit completed if submission relates to assignment/quiz and pass threshold reached
      if (assessment.unitNumber && !enrollment.completedUnits.includes(assessment.unitNumber)) {
        enrollment.completedUnits.push(assessment.unitNumber);
      }
      // very basic proficiency update: store last score for unit
      enrollment.proficiency = enrollment.proficiency || {};
      enrollment.proficiency[`unit_${assessment.unitNumber || 0}`] = (enrollment.proficiency[`unit_${assessment.unitNumber || 0}`] || 0 + total) / 1;
      await enrollment.save();
    }

    res.status(201).json({ status: 'success', message: 'Submission saved', data: { submission } });
  } catch (error) {
    console.error('submitAssessment error', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id).populate('student', 'fullName email');
    if (!submission) return res.status(404).json({ status: 'error', message: 'Submission not found' });
    res.json({ status: 'success', data: { submission } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
