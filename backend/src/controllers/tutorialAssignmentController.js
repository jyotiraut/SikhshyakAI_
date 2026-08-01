// controllers/tutorialAssignmentController.js
import TutorialAssignment from '../models/tutorialAssignmentModel.js';
import Course from '../models/courseModel.js';

export const assignTutorial = async (req, res) => {
  try {
    const teacher = req.user.id;
    const { courseId, unitNumber, tutorialIndex, studentId } = req.body;

    // basic validation: ensure tutorialIndex exists in course
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });

    const unit = (course.units || []).find(u => u.unitNumber === Number(unitNumber));
    if (!unit) return res.status(404).json({ status: 'error', message: 'Unit not found' });

    if (!Array.isArray(unit.tutorials) || !unit.tutorials[tutorialIndex]) {
      return res.status(400).json({ status: 'error', message: 'Invalid tutorialIndex' });
    }

    const ta = await TutorialAssignment.create({
      course: courseId,
      unitNumber: Number(unitNumber),
      tutorialIndex: Number(tutorialIndex),
      student: studentId,
      status: 'assigned'
    });

    res.status(201).json({ status: 'success', message: 'Tutorial assigned', data: { tutorialAssignment: ta } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const completeTutorial = async (req, res) => {
  try {
    const { id } = req.params; // tutorialAssignment id
    const { score, feedback } = req.body;
    const ta = await TutorialAssignment.findById(id);
    if (!ta) return res.status(404).json({ status: 'error', message: 'Tutorial assignment not found' });

    ta.status = 'completed';
    ta.completedAt = Date.now();
    if (score) ta.score = score;
    if (feedback) ta.feedback = feedback;
    await ta.save();

    res.json({ status: 'success', message: 'Tutorial completed', data: { ta } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
