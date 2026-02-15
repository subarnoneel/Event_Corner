import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  chatLimiter,
  analyticsLimiter,
  bannerUploadLimiter,
  validateChatInput,
  verifyFirebaseToken,
  requireAuth,
  requireAdmin,
  verifyConversationAccess,
  auditLog
} from '../middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for banner uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/banners');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// POST /api/ai/chat - Chat with AI (with context, analytics, and conversation tracking)
router.post('/chat', verifyFirebaseToken, chatLimiter, validateChatInput, async (req, res) => {
  const { message, context, userRole, userId, conversationId, messageHistory } = req.body;

  try {
    const axios = (await import('axios')).default;

    // Log chat activity
    auditLog('CHAT_REQUEST', req.user, {
      role: userRole,
      messageLength: message.length,
      ip: req.requestInfo.ip
    });

    console.log(`📤 Chat request [${userRole || 'participant'}] ConvID: ${conversationId}: ${message.substring(0, 50)}...`);

    const response = await axios.post('http://localhost:5001/chat', {
      message: message.trim(),
      context: context || null,
      user_role: userRole || 'participant',
      user_id: userId || req.user.id,
      conversation_id: conversationId || null,
      message_history: messageHistory || []
    }, {
      timeout: 30000
    });

    console.log('✅ Chat response received');
    res.json(response.data);

  } catch (error) {
    console.error('Chat error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'AI server not running. Please start: python ai/ai_server.py'
      });
    }

    if (error.response?.status === 503) {
      return res.status(503).json({
        success: false,
        error: 'Ollama is not running. Please start Ollama first.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Chat failed',
      details: error.message
    });
  }
});

// GET /api/ai/analytics - Get chat analytics (admin only)
router.get('/analytics', verifyFirebaseToken, analyticsLimiter, requireAdmin, async (req, res) => {
  try {
    auditLog('ANALYTICS_ACCESS', req.user, { ip: req.requestInfo.ip });

    const axios = (await import('axios')).default;
    const response = await axios.get('http://localhost:5001/analytics', { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// GET /api/ai/conversation/:conversationId - Get conversation history (own only)
router.get('/conversation/:conversationId', verifyFirebaseToken, verifyConversationAccess, async (req, res) => {
  try {
    const { conversationId } = req.params;

    auditLog('CONVERSATION_ACCESS', req.user, {
      conversationId,
      ip: req.requestInfo.ip
    });

    const axios = (await import('axios')).default;
    const response = await axios.get(`http://localhost:5001/conversations/${conversationId}`, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    console.error('Conversation retrieval error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
});

// POST /api/ai/analyze-banner - Send to FastAPI server (with banner-specific rate limit)
router.post('/analyze-banner', bannerUploadLimiter, upload.single('banner'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No banner image uploaded' });
  }

  const imagePath = req.file.path;
  console.log('Analyzing banner:', imagePath);

  try {
    // Import axios and FormData dynamically (ESM)
    const axios = (await import('axios')).default;
    const FormData = (await import('form-data')).default;

    // Send to FastAPI server
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));

    console.log('📤 Sending to FastAPI server (port 5001)...');

    const response = await axios.post('http://localhost:5001/analyze', formData, {
      headers: formData.getHeaders(),
      timeout: 120000  // 120s timeout (first load takes longer)
    });

    console.log('✅ Analysis complete!');

    // Clean up uploaded file after processing
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    res.json(response.data);

  } catch (error) {
    console.error('Analysis error:', error.message);

    // Clean up file on error
    if (fs.existsSync(imagePath)) {
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }

    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'AI server not running. Please start: python ai/ai_server.py'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Banner analysis failed',
      details: error.message
    });
  }
});

// GET /api/ai/status - Check if AI service is available
router.get('/status', async (req, res) => {
  try {
    const axios = (await import('axios')).default;

    // Check FastAPI server health
    const response = await axios.get('http://localhost:5001/health', { timeout: 5000 });

    res.json({
      available: true,
      message: 'AI FastAPI server is running',
      details: response.data
    });
  } catch (error) {
    res.json({
      available: false,
      error: 'FastAPI server not running. Run: python ai/ai_server.py'
    });
  }
});

// POST /api/ai/chat - Chat with AI assistant
router.post('/chat', async (req, res) => {
  const { message, context } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  console.log('💬 Chat request:', message.substring(0, 50) + '...');

  try {
    const axios = (await import('axios')).default;

    const response = await axios.post('http://localhost:5001/chat', {
      message,
      context: context || ''
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });

    console.log('✅ Chat response received');
    return res.json(response.data);

  } catch (error) {
    console.error('Chat error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'AI server not running. Start: python backend/ai/ai_server.py'
      });
    }

    if (error.response?.status === 503) {
      return res.status(503).json({
        success: false,
        error: 'Ollama not running. Ensure ollama serve is active on port 11434'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Chat failed',
      details: error.message
    });
  }
});

// POST /api/ai/create-event-conversation - Conversational event creation
router.post('/create-event-conversation', async (req, res) => {
  const { message, conversation_history } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  console.log('🎯 Event conversation request:', message.substring(0, 50) + '...');

  try {
    const axios = (await import('axios')).default;

    const response = await axios.post('http://localhost:5001/create-event-conversation', {
      message,
      conversation_history: conversation_history || []
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    });

    console.log('✅ Event conversation response received');
    return res.json(response.data);

  } catch (error) {
    console.error('Event conversation error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'AI server not running. Start: python backend/ai/ai_server.py'
      });
    }

    if (error.response?.status === 503) {
      return res.status(503).json({
        success: false,
        error: 'Ollama not running. Ensure ollama serve is active on port 11434'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Event conversation failed',
      details: error.message
    });
  }
});

export default router;
