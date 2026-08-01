// controllers/assessmentController.js
import axios from 'axios';
import Assessment from '../models/assessmentModel.js';
import Course from '../models/courseModel.js';
import Resource from '../models/resourceModel.js';

// Helper: mask correct answers before sending to client
function maskAssessmentForClient(assessment) {
  const masked = {
    _id: assessment._id,
    type: assessment.type,
    course: assessment.course,
    unitNumber: assessment.unitNumber,
    title: assessment.title,
    instructions: assessment.instructions,
    totalMarks: assessment.totalMarks,
    status: assessment.status,
    questions: assessment.questions.map(q => ({
      question: q.question,
      type: q.type,
      options: q.options || [],
      marks: q.marks,
      difficulty: q.difficulty,
      learningObjectiveIndex: q.learningObjectiveIndex,
      skillTags: q.skillTags || []
    }))
  };
  return masked;
}

// Generate assessment via FastAPI (RAG) and save to DB
export const generateAssessment = async (req, res) => {
  try {
    const { courseId, unitNumber, assessmentType, numQuestions, difficultyMix, questionTypes } = req.body;

    // gather resource texts for the unit (optional)
    const resources = await Resource.find({ course: courseId, unitNumber: Number(unitNumber) });
    // use resource.textExtract if present; otherwise send Course.outlineText
    const resourceTexts = resources.map(r => r.textExtract).filter(Boolean);
    if (resourceTexts.length === 0) {
      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });
      resourceTexts.push(course.outlineText);
    }

    // call RAG
    const url = `${process.env.RAG_URL}/rag/generate-assessment`;
    const payload = {
      courseId,
      unitNumber,
      resourceTexts,
      assessmentType,
      numQuestions: Number(numQuestions) || 10,
      difficultyMix: difficultyMix || { low: 0.4, mid: 0.4, high: 0.2 },
      questionTypes: questionTypes || ['mcq','short']
    };

    const ragResp = await axios.post(url, payload, { timeout: 120000 });
    const data = ragResp.data;

    // Build and persist assessment
    const assessment = await Assessment.create({
      type: assessmentType || 'quiz',
      course: courseId,
      unitNumber: Number(unitNumber),
      title: data.title || `Unit ${unitNumber} ${assessmentType || 'quiz'}`,
      instructions: data.instructions || '',
      questions: data.questions || [],
      totalMarks: data.totalMarks || (data.questions ? data.questions.reduce((s,q) => s + (q.marks || 1),0) : 0),
      status: 'draft',
      generatedBy: 'rag'
    });

    res.status(201).json({ status: 'success', message: 'Assessment generated', data: { assessment } });
  } catch (error) {
    console.error('generateAssessment error', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const publishAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id);
    if (!assessment) return res.status(404).json({ status: 'error', message: 'Assessment not found' });
    assessment.status = 'published';
    await assessment.save();
    res.json({ status: 'success', message: 'Assessment published', data: { assessment } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAssessmentForClient = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id);
    if (!assessment) return res.status(404).json({ status: 'error', message: 'Assessment not found' });

    const masked = maskAssessmentForClient(assessment);
    res.json({ status: 'success', data: { assessment: masked } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const listAssessmentsForUnit = async (req, res) => {
  try {
    const { courseId, unitNumber } = req.query;
    const assessments = await Assessment.find({ course: courseId, unitNumber: Number(unitNumber) });
    res.json({ status: 'success', data: { assessments } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
