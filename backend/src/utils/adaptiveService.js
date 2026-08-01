/**
 * Adaptive Learning Service
 * Handles communication with FastAPI adaptive learning backend
 * BaseURL: http://localhost:4000
 */

const ADAPTIVE_BASE_URL = process.env.ADAPTIVE_LEARNING_URL || 'http://localhost:4000';

/**
 * Helper function to make API calls to adaptive learning backend
 */
// Requests hang forever without a timeout when the Python service stalls, which
// leaves the student's browser spinning with no feedback.
const REQUEST_TIMEOUT_MS = Number(process.env.ADAPTIVE_TIMEOUT_MS || 60000);

const callAdaptiveAPI = async (method, endpoint, data = null) => {
  const url = `${ADAPTIVE_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const text = await response.text();

    let result;
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      // A crashed service returns an HTML error page; JSON.parse used to throw
      // an unhelpful SyntaxError over the real failure.
      const error = new Error(`Adaptive service returned a non-JSON response (${response.status})`);
      error.status = 502;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(result.detail || `Adaptive service error (${response.status})`);
      // Carry the upstream status so 403/404/409 do not become 500s.
      error.status = response.status;
      throw error;
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeout = new Error('Adaptive service timed out');
      timeout.status = 504;
      console.error(`Adaptive API Timeout [${method} ${endpoint}]`);
      throw timeout;
    }
    console.error(`Adaptive API Error [${method} ${endpoint}]:`, error.message);
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * 1. Create adaptive learning for a student in a course
 * POST /api/adaptive/create-adaptive-learning
 */
export const createAdaptiveLearning = async (studentId, courseId) => {
  return callAdaptiveAPI('POST', '/api/adaptive/create-adaptive-learning', {
    student_id: studentId,
    course_id: courseId
  });
};

/**
 * 2. Generate an adaptive quiz for a student (requires unit_id)
 * POST /api/adaptive/generate-quiz
 */
export const generateAdaptiveQuiz = async (studentId, courseId, unitId) => {
  return callAdaptiveAPI('POST', '/api/adaptive/generate-quiz', {
    student_id: studentId,
    course_id: courseId,
    unit_id: unitId
  });
};

/**
 * 3. Submit quiz answer, update stats, and get next question
 * POST /api/adaptive/submit-quiz
 */
export const submitAdaptiveQuiz = async (quizId, studentId, courseId, answers) => {
  return callAdaptiveAPI('POST', '/api/adaptive/submit-quiz', {
    quiz_id: quizId,
    student_id: studentId,
    course_id: courseId,
    answers: answers // Array of { questionIndex, selectedOption }
  });
};

/**
 * 4. Get comprehensive student progress (all courses or filtered)
 * GET /api/adaptive/student-progress/{student_id}?course_id={course_id}
 */
export const getStudentProgress = async (studentId, courseId = null) => {
  let endpoint = `/api/adaptive/student-progress/${studentId}`;
  if (courseId) {
    endpoint += `?course_id=${courseId}`;
  }
  return callAdaptiveAPI('GET', endpoint);
};

/**
 * 5. Get detailed progress for a specific student in a specific course
 * GET /api/adaptive/student-progress/{student_id}/course/{course_id}
 */
export const getStudentCourseProgress = async (studentId, courseId) => {
  return callAdaptiveAPI('GET', `/api/adaptive/student-progress/${studentId}/course/${courseId}`);
};

/**
 * 6. Get detailed progress for a specific student in a specific unit
 * GET /api/adaptive/student-progress/{student_id}/course/{course_id}/unit/{unit_id}
 */
export const getStudentUnitProgress = async (studentId, courseId, unitId) => {
  return callAdaptiveAPI('GET', `/api/adaptive/student-progress/${studentId}/course/${courseId}/unit/${unitId}`);
};
