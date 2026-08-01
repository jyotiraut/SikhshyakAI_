// controllers/courseController.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import http from 'http';
import https from 'https';
import { createRequire } from 'module';
import mongoose from 'mongoose';
const require = createRequire(import.meta.url);
const _pdf = require('pdf-parse');
const pdf = (_pdf && typeof _pdf === 'function')
  ? _pdf
  : (_pdf?.default && typeof _pdf.default === 'function')
    ? _pdf.default
    : (_pdf?.parse && typeof _pdf.parse === 'function')
      ? _pdf.parse
      : (_pdf?.pdf && typeof _pdf.pdf === 'function')
        ? _pdf.pdf
        : _pdf;
import Course from '../models/courseModel.js';
import Unit from '../models/unitModel.js';
import Resource from '../models/resourceModel.js';
import Enrollment from '../models/enrollmentModel.js';
import { uploadToS3 } from '../utils/s3.js';

// Helper: generate unique enrollment code (A-Z0-9, length 6 by default)
function generateCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid easily confused chars
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Helper: extract text from uploaded PDF buffer (pdf-parse)
async function extractTextFromBuffer(buffer) {
  try {
    let pdfParser;
    
    // Try different ways to access the pdf-parse function
    if (typeof pdf === 'function') {
      pdfParser = pdf;
    } else if (pdf?.default && typeof pdf.default === 'function') {
      pdfParser = pdf.default;
    } else if (pdf?.parse && typeof pdf.parse === 'function') {
      pdfParser = pdf.parse;
    } else if (pdf?.pdf && typeof pdf.pdf === 'function') {
      pdfParser = pdf.pdf;
    } else {
      throw new Error('pdf-parse module did not expose a callable function. Available properties: ' + Object.keys(pdf || {}).join(', '));
    }

    const data = await pdfParser(buffer);
    let text = data.text || '';
    text = text.replace(/\t+/g, ' ')
               .replace(/\n{3,}/g, '\n\n')
               .trim();
    return text;
  } catch (err) {
    console.error('PDF extraction error:', err);
    throw new Error('Failed to extract text from PDF: ' + err.message);
  }
}
  // Helper: normalize RAG `units` payload into Course model shape
  function normalizeUnits(units) {
    if (!Array.isArray(units)) return [];
    const normalized = units.map((u, idx) => {
      const unitNumber = Number(u?.unitNumber);
      return {
        unitNumber: Number.isFinite(unitNumber) ? unitNumber : idx + 1,
        title: String(u?.title || '').trim(),
        description: u?.description ? String(u.description).trim() : undefined,
        learningObjectives: Array.isArray(u?.learningObjectives) ? u.learningObjectives.filter(Boolean).map(String) : [],
        teachingPlan: {
          overview: u?.teachingPlan?.overview ? String(u.teachingPlan.overview).trim() : undefined,
          methods: Array.isArray(u?.teachingPlan?.methods) ? u.teachingPlan.methods.filter(Boolean).map(String) : [],
          activities: Array.isArray(u?.teachingPlan?.activities) ? u.teachingPlan.activities.filter(Boolean).map(String) : []
        },
        estimatedTime: {
          totalMinutes: Number.isFinite(Number(u?.estimatedTime?.totalMinutes)) ? Number(u.estimatedTime.totalMinutes) : undefined,
          theoryMinutes: Number.isFinite(Number(u?.estimatedTime?.theoryMinutes)) ? Number(u.estimatedTime.theoryMinutes) : undefined,
          practicalMinutes: Number.isFinite(Number(u?.estimatedTime?.practicalMinutes)) ? Number(u.estimatedTime.practicalMinutes) : undefined
        },
        tutorials: Array.isArray(u?.tutorials) ? u.tutorials : [],
        labs: Array.isArray(u?.labs) ? u.labs : []
      };
    });
    // Sort by unitNumber ascending
    normalized.sort((a, b) => (a.unitNumber ?? 0) - (b.unitNumber ?? 0));
    return normalized;
  }


// Helper: call RAG FastAPI to enrich course (units, teachingPlan, estimatedTime)
// Uses `RAG_URL` or falls back to `FASTAPI_URL` (http://fastapi-host:8000)
async function callRagEnrichCourse(outlineText, courseMeta) {
  const baseUrl = process.env.RAG_URL || process.env.FASTAPI_URL;
  if (!baseUrl) {
    throw new Error('RAG_URL or FASTAPI_URL environment variable is not set');
  }
  const url = `${baseUrl.replace(/\/$/, '')}/rag/enrich-course`;
  const payload = {
    outlineText,
    courseMeta
  };
  const isHttps = url.startsWith('https://');
  const agent = isHttps
    ? new https.Agent({ keepAlive: true })
    : new http.Agent({ keepAlive: true });

  // No client timeout (wait indefinitely); keep connection alive
  const resp = await axios.post(url, payload, {
    timeout: 0,
    httpAgent: agent,
    httpsAgent: agent,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: (status) => status >= 200 && status < 300
  });
  const data = resp.data;
  // Normalize shape: accept { units: [...] } or { data: { units: [...] } }
  if (data && Array.isArray(data.units)) return data;
  if (data && data.data && Array.isArray(data.data.units)) {
    return { units: data.data.units };
  }
  return data;
}

// Create a new Course (accepts either outlineText or outlinePdf file)
export const createCourse = async (req, res) => {
  try {
    const { title, description, periodDurationMinutes, totalPeriods, pace, language } = req.body;
    const teacher = req.user.id;

    let outlineText = req.body.outlineText || '';
    let outlinePdfBuffer = null;

    // If file uploaded, extract text using pdf-parse
    if (req.file && req.file.buffer) {
      outlineText = await extractTextFromBuffer(req.file.buffer);
      outlinePdfBuffer = req.file.buffer; // keep buffer to upload original PDF to R2
    }

    if (!outlineText) {
      return res.status(400).json({ status: 'error', message: 'outlineText or outlinePdf file is required' });
    }

    // Determine department: teacher may pass `department` in body to assign course to a dept in same school
    let departmentId;
    if (req.body.department) {
      if (!mongoose.Types.ObjectId.isValid(req.body.department)) return res.status(400).json({ status: 'fail', message: 'Invalid department id' });
      const dept = await (await import('../models/departmentModel.js')).default.findById(req.body.department);
      if (!dept) return res.status(400).json({ status: 'fail', message: 'Department not found' });
      // Ensure department belongs to the same school as the creator
      if (!req.user?.school || String(dept.school) !== String(req.user.school)) return res.status(403).json({ status: 'fail', message: 'Department must belong to your school' });
      departmentId = dept._id;
    } else if (req.user?.department) {
      // fallback to creator's department if set
      departmentId = req.user.department;
    }

    // Ensure teacher has a school set
    if (!req.user?.school) return res.status(400).json({ status: 'fail', message: 'Please set your school in profile before creating a course' });

    // Create initial course doc (status draft)
    const course = await Course.create({
      title,
      description,
      outlineText,
      teacherProvided: {
        periodDurationMinutes: Number(periodDurationMinutes) || undefined,
        totalPeriods: Number(totalPeriods) || undefined,
        pace: pace || 'normal'
      },
      teacher,
      // set tenant and department from creator or provided department
      school: req.user.school,
      department: departmentId || undefined,
      status: 'draft'
    });

    // Assign enrollment code if not set
    if (!course.enrollmentCode) {
      for (let i = 0; i < 5; i++) {
        const code = generateCode(6);
        const exists = await Course.exists({ enrollmentCode: code });
        if (!exists) {
          course.enrollmentCode = code;
          await course.save();
          break;
        }
      }
    }

    // Upload original outline PDF to R2 and save URL in course (if a file was provided)
    if (outlinePdfBuffer) {
      try {
        const bucket = process.env.CF_BUCKET_NAME;
        const key = `courses/${course._id}/outline/${Date.now()}-outline.pdf`;
        const outlinePdfUrl = await uploadToS3(bucket, key, outlinePdfBuffer, 'application/pdf');
        course.outlinePdfUrl = outlinePdfUrl;
        await course.save();
  
      } catch (e) {
        console.warn('[Course:create] Failed to upload outline PDF to R2', { error: e?.message });
      }
    }

    // Call RAG to enrich course (units, teachingPlan, estimatedTime)
    let ragResponse = null;
    try {
      ragResponse = await callRagEnrichCourse(outlineText, {
        periodDurationMinutes: Number(periodDurationMinutes) || undefined,
        totalPeriods: Number(totalPeriods) || undefined,
        pace: pace || 'normal',
        language: language || 'en'
      });
    } catch (err) {
      // Do not fail hard — we already created course
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('RAG enrich error:', err.message || err);
      if (status) console.error('RAG status:', status);
      if (data) console.error('RAG response:', typeof data === 'object' ? JSON.stringify(data) : data);
      console.error('RAG URL used:', (process.env.RAG_URL || process.env.FASTAPI_URL));
    }

    // If RAG returned units, create Unit documents and proceed; else error
    let unitsCount = 0;
    if (ragResponse && Array.isArray(ragResponse.units) && ragResponse.units.length > 0) {
      const units = normalizeUnits(ragResponse.units);
      const toCreate = units.map(u => ({
        course: course._id,
        unitNumber: u.unitNumber,
        title: u.title,
        description: u.description,
        // do not save outlineText in Unit; roadmap stays at course level
        learningObjectives: u.learningObjectives,
        teachingPlan: u.teachingPlan,
        estimatedTime: u.estimatedTime,
        quizzes: [],
        tutorials: [],
        labs: [],
        status: 'draft'
      }));
      if (toCreate.length) {
        await Unit.insertMany(toCreate);
        unitsCount = toCreate.length;
      }
      // Keep course.units empty for easier unit CRUD later
      course.units = [];
      course.status = 'generated';
      await course.save();
    } else {
      // No units from RAG — do not proceed; return explicit Gemini Error
      console.error('[Course:create] RAG did not return units');
      return res.status(502).json({ status: 'error', message: 'Gemini Error' });
    }

    res.status(201).json({
      status: 'success',
      message: 'Course created',
      data: { course, unitsCount }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id).populate('teacher', 'fullName email');
    if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });
    // Avoid returning full outline text; include a short preview only
    const outlinePreview = (course.outlineText || '').slice(0, 500);
    const courseObj = course.toObject();
    delete courseObj.outlineText;
    courseObj.outlinePreview = outlinePreview;
    // Fetch units info from Unit collection
    const units = await Unit.find({ course: id }).sort({ unitNumber: 1 }).select(
      'unitNumber title description learningObjectives teachingPlan estimatedTime status resource files createdAt updatedAt'
    );
    // Add fileUrl to each unit (get latest file's URL or null if no files)
    const unitsWithFileUrl = units.map(unit => {
      const unitObj = unit.toObject();
      unitObj.fileUrl = unit.files && unit.files.length > 0 ? unit.files[unit.files.length - 1].fileUrl : null;
      delete unitObj.files; // Remove full files array from response
      return unitObj;
    });
    const unitsCount = unitsWithFileUrl.length;
    res.json({ status: 'success', data: { course: courseObj, units: unitsWithFileUrl, unitsCount } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    // If a new outline PDF is uploaded, extract text
    if (req.file && req.file.buffer) {
      try {
        const extracted = await extractTextFromBuffer(req.file.buffer);
        updates.outlineText = extracted;
      } catch (e) {
        return res.status(400).json({ status: 'error', message: e.message });
      }
    }

    // Fetch existing course to compare outlineText changes and authorize
    const existing = await Course.findById(id);
    if (!existing) return res.status(404).json({ status: 'error', message: 'Course not found' });

    // Authorization: teachers can only update their own courses; admins only within their school
    if (req.user.role === 'teacher' && String(existing.teacher) !== String(req.user.id)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
    if (req.user.role === 'admin') {
      // if course has school, ensure admin belongs to it; otherwise, check teacher's school
      const courseSchool = existing.school || (existing.teacher ? (await (await import('../models/userModel.js')).default.findById(existing.teacher)).school : null);
      if (courseSchool && String(req.user.school) !== String(courseSchool)) return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }

    // If client wants to change department, validate it belongs to same school
    if (updates.department) {
      if (!mongoose.Types.ObjectId.isValid(updates.department)) return res.status(400).json({ status: 'fail', message: 'Invalid department id' });
      const dept = await (await import('../models/departmentModel.js')).default.findById(updates.department);
      if (!dept) return res.status(400).json({ status: 'fail', message: 'Department not found' });
      // ensure department belongs to course school (or requester's school)
      const targetSchool = existing.school || req.user.school;
      if (!targetSchool || String(dept.school) !== String(targetSchool)) return res.status(403).json({ status: 'fail', message: 'Department must belong to the same school' });
    }

    const outlineWillChange = typeof updates.outlineText === 'string' && updates.outlineText !== existing.outlineText;

    // Apply updates
    const course = await Course.findByIdAndUpdate(id, updates, { new: true });
    if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });

    // If a new outline PDF was uploaded, also upload original PDF to R2 and save URL
    if (req.file && req.file.buffer) {
      try {
        const bucket = process.env.CF_BUCKET_NAME;
        const key = `courses/${course._id}/outline/${Date.now()}-outline.pdf`;
        const outlinePdfUrl = await uploadToS3(bucket, key, req.file.buffer, 'application/pdf');
        course.outlinePdfUrl = outlinePdfUrl;
        await course.save();

      } catch (e) {
        console.warn('[Course:update] Failed to upload outline PDF to R2', { error: e?.message });
      }
    }

    // If outlineText changed, re-enrich units via RAG (recreate Unit docs)
    if (outlineWillChange) {
      try {
        const meta = {
          periodDurationMinutes: Number(course?.teacherProvided?.periodDurationMinutes) || undefined,
          totalPeriods: Number(course?.teacherProvided?.totalPeriods) || undefined,
          pace: course?.teacherProvided?.pace || 'normal',
          language: req.body.language || 'en'
        };
        const ragResponse = await callRagEnrichCourse(course.outlineText, meta);
        if (ragResponse && Array.isArray(ragResponse.units) && ragResponse.units.length > 0) {
          const units = normalizeUnits(ragResponse.units);
          // Remove existing Unit docs for this course and recreate
          await Unit.deleteMany({ course: course._id });
          const toCreate = units.map(u => ({
            course: course._id,
            unitNumber: u.unitNumber,
            title: u.title,
            description: u.description,
            // do not save outlineText in Unit
            learningObjectives: u.learningObjectives,
            teachingPlan: u.teachingPlan,
            estimatedTime: u.estimatedTime,
            quizzes: [],
            tutorials: [],
            labs: [],
            status: 'draft'
          }));
          if (toCreate.length) {
            await Unit.insertMany(toCreate);
          }
          course.units = [];
          course.status = 'generated';
          await course.save();
        } else {
          // If re-enrichment returns no units, signal Gemini Error
          return res.status(502).json({ status: 'error', message: 'Gemini Error' });
        }
      } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        console.error('RAG enrich error (update):', err.message || err);
        if (status) console.error('RAG status:', status);
        if (data) console.error('RAG response:', typeof data === 'object' ? JSON.stringify(data) : data);
        console.error('RAG URL used:', (process.env.RAG_URL || process.env.FASTAPI_URL));
        // Do not fail the update due to enrichment errors
      }
    }

    // Fallback or explicit override: if client sends `units`, create Unit docs
    // Remove client-provided units fallback: require RAG

    res.json({ status: 'success', message: 'Course updated', data: { course } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const publishCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });

    course.status = 'published';
    await course.save();
    res.json({ status: 'success', message: 'Course published', data: { course } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Delete a course and all its units (and enrollments)
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ status: 'error', message: 'Course not found' });
    }

    // Delete associated Units
    const unitsResult = await Unit.deleteMany({ course: id });
    // Optionally delete enrollments referencing the course
    const enrollmentsResult = await Enrollment.deleteMany({ course: id });

    // Delete the Course
    await Course.findByIdAndDelete(id);

    res.json({
      status: 'success',
      message: 'Course and related units deleted',
      data: {
        deletedUnits: unitsResult?.deletedCount || 0,
        deletedEnrollments: enrollmentsResult?.deletedCount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Enroll a student into a course
export const enrollStudent = async (req, res) => {
  try {
    const { courseId, studentId } = req.body;
    // create or update enrollment
    let enrollment = await Enrollment.findOne({ course: courseId, student: studentId });
    if (!enrollment) {
      enrollment = await Enrollment.create({ course: courseId, student: studentId });
    }
    res.status(201).json({ status: 'success', message: 'Enrolled', data: { enrollment } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const listCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (p - 1) * l;

    const query = {};
    if (status) query.status = status;

    const [total, courses] = await Promise.all([
      Course.countDocuments(query),
      Course.find(query)
        .select('title description status teacher')
        .populate('teacher','fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
    ]);

    res.json({ status: 'success', data: { courses, page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (p - 1) * l;

    const query = { teacher: teacherId };
    if (status) query.status = status;

    const [total, courses] = await Promise.all([
      Course.countDocuments(query),
      Course.find(query)
        .select('title description status enrollmentCode outlinePdfUrl teacher')
        .populate('teacher','fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
    ]);

    res.json({ status: 'success', data: { courses, page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
