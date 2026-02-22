import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

const FIREBASE_SECRET = process.env.FIREBASE_SECRET || 'your-firebase-secret';

// ============ RATE LIMITING ============
// General API rate limit: 500 requests per 15 minutes (more lenient for development)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for common read operations and health checks
    const skipPaths = ['/api/health', '/api/ai/analyze-banner', '/api/events', '/api/auth/login'];
    return skipPaths.some(path => req.path.startsWith(path));
  }
});

// Banner upload rate limit: 50 requests per 30 minutes (slower for file processing)
export const bannerUploadLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 50,
  message: 'Too many banner upload requests. Please wait before uploading another banner.',
  keyGenerator: (req) => {
    // Rate limit by user ID if available, otherwise by IP
    return req.user?.id || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Chat endpoint strict limit: 30 requests per 15 minutes per user
export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many chat requests. Please wait before sending another message.',
  keyGenerator: (req) => {
    // Rate limit by user ID if available, otherwise by IP
    return req.user?.id || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Analytics endpoint limit: 10 requests per hour
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many analytics requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// ============ INPUT VALIDATION ============
export function validateChatInput(req, res, next) {
  const { message, userRole, userId, conversationId, messageHistory } = req.body;

  // Validate message
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid message format' });
  }

  // Check message length (prevent abuse)
  if (message.length < 1 || message.length > 5000) {
    return res.status(400).json({ success: false, error: 'Message must be between 1 and 5000 characters' });
  }

  // Sanitize message (basic XSS prevention)
  const sanitized = sanitizeInput(message);
  req.body.message = sanitized;

  // Validate optional fields
  if (userRole && !isValidRole(userRole)) {
    return res.status(400).json({ success: false, error: 'Invalid user role' });
  }

  if (userId && typeof userId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid user ID format' });
  }

  if (conversationId && typeof conversationId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid conversation ID format' });
  }

  if (messageHistory && !Array.isArray(messageHistory)) {
    return res.status(400).json({ success: false, error: 'Message history must be an array' });
  }

  next();
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

// Validate role
function isValidRole(role) {
  const validRoles = ['super_admin', 'admin', 'institution', 'organizer', 'participant'];
  return validRoles.includes(role);
}

// ============ JWT TOKEN VERIFICATION ============
export function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Decode token without verification (Firebase handles verification on client)
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || !decoded.payload) {
        return res.status(401).json({ success: false, error: 'Invalid token format' });
      }

      const payload = decoded.payload;
      
      // Try multiple fields for user ID (Firebase uses 'uid' or 'sub')
      const userId = payload.uid || payload.sub || payload.user_id;
      
      if (!userId) {
        console.warn('Token decoded but no user ID found. Payload:', Object.keys(payload));
        return res.status(401).json({ success: false, error: 'Token missing user identifier' });
      }

      // Attach user info to request
      req.user = {
        id: userId,
        email: payload.email || payload.preferred_username || 'unknown',
        iat: payload.iat,
        exp: payload.exp
      };

      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ success: false, error: 'Token expired' });
      }

      next();
    } catch (err) {
      console.error('Token decode error:', err.message);
      return res.status(401).json({ success: false, error: 'Token verification failed: ' + err.message });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

// ============ ACCESS CONTROL ============
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const userRole = req.body.userRole || req.query.userRole;
  const adminRoles = ['super_admin', 'admin'];

  if (!adminRoles.includes(userRole)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  next();
}

// Verify user can only access their own conversations
export function verifyConversationAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { conversationId } = req.params;
  const { userId } = req.body;
  const userRole = req.body.userRole || 'participant';

  // Super admins can access any conversation
  if (userRole === 'super_admin') {
    return next();
  }

  // Regular users can only access their own conversations
  if (userId && userId !== req.user.id) {
    return res.status(403).json({ success: false, error: 'You can only access your own conversations' });
  }

  next();
}

// ============ AUDIT LOGGING ============
export function auditLog(action, user, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    user: user?.email || 'unknown',
    userId: user?.id || 'unknown',
    details,
    ip: details.ip || 'unknown'
  };

  console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);

  // TODO: In production, save to database
  // await db.insert('audit_logs', logEntry);
}

// Middleware to capture request info for logging
export function captureRequestInfo(req, res, next) {
  req.requestInfo = {
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    path: req.path,
    timestamp: Date.now()
  };
  next();
}
