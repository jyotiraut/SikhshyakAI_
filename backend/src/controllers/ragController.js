import axios from 'axios';
import { asyncHandler } from '../utils/asyncHandler.js';

// RAG service base URL
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:3000';

/**
 * Helper to proxy requests to RAG service
 */
const ragRequest = async (method, endpoint, data = null, params = {}) => {
  const url = `${RAG_SERVICE_URL}/api/rag${endpoint}`;
  const config = { method, url, params };
  if (data) config.data = data;
  
  const response = await axios(config);
  return response.data;
};

// ============ Health Check ============

/**
 * @desc    Check RAG service health
 * @route   GET /api/v1/rag/health
 * @access  Public
 */
export const healthCheck = asyncHandler(async (req, res) => {
  try {
    const result = await ragRequest('GET', '/health');
    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[RAG:health] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'RAG service unavailable'
    });
  }
});

// ============ Embedding Routes ============

/**
 * @desc    Embed a unit's documents (called automatically or manually)
 * @route   POST /api/v1/rag/embed/:unitId
 * @access  Private (Teacher, Admin)
 */
export const embedUnit = asyncHandler(async (req, res) => {
  try {
    const { unitId } = req.params;
    const { force } = req.query;
    
    console.log(`[RAG:embed] User ${req.user._id} embedding unit ${unitId}`);
    
    const result = await ragRequest('POST', `/embed/${unitId}`, null, { force: force === 'true' });
    
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    console.error('[RAG:embed] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Failed to embed unit'
    });
  }
});

/**
 * @desc    Get embedding status for a unit
 * @route   GET /api/v1/rag/embed/:unitId/status
 * @access  Private
 */
export const getEmbeddingStatus = asyncHandler(async (req, res) => {
  try {
    const { unitId } = req.params;
    
    const result = await ragRequest('GET', `/embed/${unitId}/status`);
    
    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[RAG:embedStatus] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Failed to get embedding status'
    });
  }
});

// ============ Session Management ============

/**
 * @desc    Create a new chat session
 * @route   POST /api/v1/rag/sessions/:unitId
 * @access  Private (Teacher, Student)
 */
export const createSession = asyncHandler(async (req, res) => {
  try {
    const { unitId } = req.params;
    const userId = req.user._id.toString();
    
    console.log(`[RAG:createSession] User ${userId} creating session for unit ${unitId}`);
    
    const result = await ragRequest('POST', `/sessions/${unitId}`, null, { user_id: userId });
    
    res.status(201).json({ status: 'success', data: result.data });
  } catch (error) {
    console.error('[RAG:createSession] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Failed to create session'
    });
  }
});

// ============ Chat Routes ============

/**
 * @desc    Chat with a unit's content
 * @route   POST /api/v1/rag/chat/:unitId
 * @access  Private (Teacher, Student)
 */
export const chat = asyncHandler(async (req, res) => {
  try {
    const { unitId } = req.params;
    const { message, session_id } = req.body;
    const userId = req.user._id.toString();
    
    if (!message) {
      return res.status(400).json({ status: 'error', message: 'Message is required' });
    }
    
    if (!session_id) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Session ID is required. Create a session first using POST /api/v1/rag/sessions/:unitId' 
      });
    }
    
    console.log(`[RAG:chat] User ${userId} chatting in session ${session_id}`);
    
    const result = await ragRequest('POST', `/chat/${unitId}`, {
      message,
      user_id: userId,
      session_id
    });
    
    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[RAG:chat] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Chat failed'
    });
  }
});

// ============ Session Routes ============

/**
 * @desc    Get all chat sessions for current user
 * @route   GET /api/v1/rag/sessions
 * @access  Private
 */
export const getSessions = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { unit_id } = req.query;
    
    const params = { user_id: userId };
    if (unit_id) params.unit_id = unit_id;
    
    const result = await ragRequest('GET', '/sessions', null, params);
    
    res.json({ status: 'success', data: result.data });
  } catch (error) {
    console.error('[RAG:getSessions] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Failed to get sessions'
    });
  }
});

/**
 * @desc    Get chat history for a session
 * @route   GET /api/v1/rag/sessions/:sessionId
 * @access  Private
 */
export const getSessionHistory = asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await ragRequest('GET', `/sessions/${sessionId}`);
    
    res.json({ status: 'success', data: result.data });
  } catch (error) {
    console.error('[RAG:getHistory] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Failed to get session history'
    });
  }
});

/**
 * @desc    Delete a chat session
 * @route   DELETE /api/v1/rag/sessions/:sessionId
 * @access  Private
 */
export const deleteSession = asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id.toString();
    
    console.log(`[RAG:deleteSession] User ${userId} deleting session ${sessionId}`);
    
    const result = await ragRequest('DELETE', `/sessions/${sessionId}`, null, { user_id: userId });
    
    res.json({ status: 'success', message: result.message });
  } catch (error) {
    console.error('[RAG:deleteSession] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Failed to delete session'
    });
  }
});

// ============ Unit Info Routes ============

/**
 * @desc    Get suggested questions for a unit
 * @route   GET /api/v1/rag/units/:unitId/suggestions
 * @access  Private
 */
export const getSuggestions = asyncHandler(async (req, res) => {
  try {
    const { unitId } = req.params;
    
    const result = await ragRequest('GET', `/units/${unitId}/suggestions`);
    
    res.json({ status: 'success', data: result.data });
  } catch (error) {
    console.error('[RAG:getSuggestions] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Failed to get suggestions'
    });
  }
});

/**
 * @desc    Get unit summary
 * @route   GET /api/v1/rag/units/:unitId/summary
 * @access  Private
 */
export const getUnitSummary = asyncHandler(async (req, res) => {
  try {
    const { unitId } = req.params;
    
    const result = await ragRequest('GET', `/units/${unitId}/summary`);
    
    res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[RAG:getSummary] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Failed to get unit summary'
    });
  }
});

/**
 * @desc    Search unit content
 * @route   POST /api/v1/rag/units/:unitId/search
 * @access  Private
 */
export const searchUnit = asyncHandler(async (req, res) => {
  try {
    const { unitId } = req.params;
    const { query, limit = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ status: 'error', message: 'Query is required' });
    }
    
    const result = await ragRequest('POST', `/units/${unitId}/search`, { query, limit });
    
    res.json({ status: 'success', data: result.data });
  } catch (error) {
    console.error('[RAG:search] Error:', error?.response?.data || error.message);
    res.status(error?.response?.status || 500).json({
      status: 'error',
      message: error?.response?.data?.detail || 'Search failed'
    });
  }
});

// ============ Internal Helper (for auto-embedding) ============

/**
 * @desc    Trigger embedding for a unit (internal use)
 * @param   {string} unitId - Unit ID to embed
 * @returns {Promise<object>} - Embedding result
 */
export const triggerEmbedding = async (unitId) => {
  try {
    console.log(`[RAG:autoEmbed] Triggering embedding for unit ${unitId}`);
    const result = await ragRequest('POST', `/embed/${unitId}`, null, { force: false });
    console.log(`[RAG:autoEmbed] Embedding triggered successfully for unit ${unitId}`);
    return result;
  } catch (error) {
    console.error(`[RAG:autoEmbed] Failed to embed unit ${unitId}:`, error?.response?.data || error.message);
    // Don't throw - embedding failure shouldn't break unit creation
    return null;
  }
};
