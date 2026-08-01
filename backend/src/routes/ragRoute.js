import express from 'express';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import {
  healthCheck,
  embedUnit,
  getEmbeddingStatus,
  createSession,
  chat,
  getSessions,
  getSessionHistory,
  deleteSession,
  getSuggestions,
  getUnitSummary,
  searchUnit
} from '../controllers/ragController.js';

const router = express.Router();

// Public route for health check
router.get('/health', healthCheck);

// All other routes require authentication
router.use(protect);

// ============ Embedding Routes (Teacher/Admin only) ============
router.post('/embed/:unitId', restrictTo('teacher', 'admin'), embedUnit);
router.get('/embed/:unitId/status', getEmbeddingStatus);

// ============ Session Routes (Teacher & Student) ============
router.post('/sessions/:unitId', restrictTo('teacher', 'student', 'admin'), createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:sessionId', getSessionHistory);
router.delete('/sessions/:sessionId', deleteSession);

// ============ Chat Routes (Teacher & Student) ============
router.post('/chat/:unitId', restrictTo('teacher', 'student', 'admin'), chat);

// ============ Unit Info Routes ============
router.get('/units/:unitId/suggestions', getSuggestions);
router.get('/units/:unitId/summary', getUnitSummary);
router.post('/units/:unitId/search', searchUnit);

export default router;
