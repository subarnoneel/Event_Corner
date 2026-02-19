# Event Corner AI Chatbot - Advanced Features

## ✨ Implemented Features

### 1. **Conversation Context** ✅
- Previous messages remembered and sent with requests
- Last 4 messages stored for context
- Conversation ID tracking across sessions
- Persistent storage in `conversations.json`

### 2. **Database Integration Ready** ✅
- Structure ready for Supabase integration
- Can query real Event Corner data
- Foundation for future enhancements

### 3. **Analytics & Tracking** ✅
- Blocked queries logged by role
- Usage statistics (total, blocked, by role/intent)
- Intent classification system
- Audit trail with timestamps

### 4. **Intent Detection** ✅
- Classifies queries: event_search, event_creation, account, admin, general
- Displayed in chat header
- Foundation for NLP enhancement

### 5. **Security Features** ✅ (NEW)
- **Rate Limiting**: 30 requests/15min per user (chat), 100/15min global
- **Input Validation**: Message length 1-5000 chars, XSS sanitization
- **JWT Verification**: Firebase token validation
- **Access Control**: Users see own data only, admins see analytics
- **Security Headers**: Helmet protection against common attacks
- **Audit Logging**: All actions logged with user/IP/timestamp
- **Role-based Guardrails**: Participants blocked from creating events

### 6. **Markdown Rendering** ✅
- Bold, italic, headings, lists, code blocks
- Proper spacing between sections
- Blockquotes and horizontal rules
- Clean, readable formatting

### 7. **Role-Based Access Control** ✅
- 5 user types with specific permissions
- Keyword filtering per role
- Regex pattern matching for sophisticated detection
- Custom rejection messages explaining limitations

---

## 📊 API Endpoints

| Endpoint | Method | Auth | Rate Limit | Description |
|----------|--------|------|-----------|-------------|
| `/api/ai/chat` | POST | JWT | 30/15min | Send message with role context, returns AI response + intent |
| `/api/ai/analytics` | GET | JWT+Admin | 10/hour | Returns usage stats by role and intent (admin only) |
| `/api/ai/conversation/:id` | GET | JWT | 30/15min | Retrieve full conversation history (user isolation enforced) |
| `/api/ai/analyze-banner` | POST | None | 50/30min | OCR analysis for event banners (existing feature) |

---

## 🔄 Data Flow

Frontend (token + metadata) → Express route (auth + validation + rate limit) → FastAPI server (intent detection + context retrieval + guardrails + Ollama call + analytics logging) → Response (answer + intent + conversation_id)

---

## � **Dependencies Added**

### Backend (`package.json`)
```json
{
  "dependencies": {
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

**Install with:**
```bash
cd backend
npm install
npm audit fix  // Fix any vulnerabilities
```

### Frontend
- Uses `react-markdown` (already installed)
- No new dependencies needed

### `chat_analytics.json`
```json
{
  "events": [
    {
      "timestamp": "2026-01-22T10:30:00",
      "user_role": "participant",
      "blocked": false,
      "query": "How do I find events?",
      "intent": "event_search"
    }
  ]
}
```

### `conversations.json`
```json
{
  "user123_20260122": {
    "user_id": "user123",
    "user_role": "organizer",
    "created_at": "2026-01-22T10:30:00",
    "messages": [
      {
        "timestamp": "...",
        "user_message": "...",
        "ai_response": "..."
      }
    ]
  }
}
```

---

## 🚀 Future Enhancements (Priority Order)

| Priority | Feature | Effort | Value | Notes |
|----------|---------|--------|-------|-------|
| HIGH | Typing indicator | 15 min | High | Shows "AI is typing..." for UX |
| HIGH | Quick reply suggestions | 30 min | High | 3-4 follow-up question suggestions |
| HIGH | Message feedback (👍👎) | 30 min | Medium | Rate response quality for analytics |
| MEDIUM | Search conversations | 1 hour | Medium | Query past conversations by keyword |
| MEDIUM | NLP Intent Detection | 3 hours | Medium | ML model replaces regex patterns |
| MEDIUM | Database Migration | 4 hours | High | Move JSON to Supabase with RLS |
| LOW | Admin dashboard | 6 hours | Low | View conversations + system health |
| LOW | Conversation Summarization | 2 hours | Low | Auto-summarize long threads |

---

## 🔐 Role-Based Access Control

| Role | Can Ask | Cannot Ask |
|------|---------|-----------|
| **super_admin** | Everything | Nothing |
| **admin** | Admin features, institutions | Role assignment, system settings |
| **institution** | Organizer mgmt, events | Institution verification, admin stuff |
| **organizer** | Event creation, promotion | Manage users, verify institutions |
| **participant** | Find events, register | Event creation, admin tasks |

---

## ✅ Testing the Features

- **Conversation Context**: Send multiple messages in same `conversationId` - verify history improves follow-up responses
- **Analytics**: Call `GET /api/ai/analytics` with admin token - verify stats by role and intent
- **Blocked Queries**: Message "How do I create an event?" as participant - verify rejection with role explanation
- **Rate Limiting**: Send 31+ messages in 15 min - verify 429 error on 31st message
- **Access Control**: Try accessing admin analytics without admin role - verify 403 forbidden

---

## 📝 Implementation Summary

| Feature | Status | Files Modified | Dependencies |
|---------|--------|-----------------|-------------|
| Conversation Context | ✅ Complete | ai_server.py, ai.routes.js, ChatBot.jsx | None |
| Analytics Logging | ✅ Complete | ai_server.py, ai.routes.js | None |
| Intent Detection | ✅ Complete | ai_server.py | None |
| Role-Based Guards | ✅ Complete | ai_server.py | None |
| Markdown Rendering | ✅ Complete | ChatBot.jsx | react-markdown |
| API Endpoints | ✅ Complete | ai_server.py, ai.routes.js | None |
| Rate Limiting | ✅ Complete | server.js, ai.routes.js, security.js | express-rate-limit |
| Input Validation | ✅ Complete | security.js, ai.routes.js | None |
| JWT Verification | ✅ Complete | security.js, ChatBot.jsx | jsonwebtoken |
| Access Control | ✅ Complete | security.js, ai.routes.js | None |
| Security Headers | ✅ Complete | server.js | helmet |
| Audit Logging | ✅ Complete | security.js, ai.routes.js | None |
| Database Integration | 🟡 Ready | ai_server.py (functions defined) | None (uses Supabase) |
| NLP Enhancement | 🟡 Ready | ai_server.py (foundation) | Would need ML library |

---

## 📂 Files Created/Modified

### **New Files Created:**
- `backend/middleware/security.js` - All security functions (rate limit, validation, auth, audit)
- `AI_CHATBOT_FEATURES.md` - This documentation
- `CHATBOT_SECURITY.md` - Security implementation details
- `SECURITY_COMPATIBILITY.md` - Compatibility verification

### **Files Modified:**
- `backend/package.json` - Added 3 security dependencies
- `backend/server.js` - Integrated security middleware & Helmet
- `backend/ai/ai_server.py` - Enhanced with context, analytics, intent detection, stricter guards
- `backend/routes/ai.routes.js` - Applied security, added endpoints, imported middleware
- `frontend/src/components/ChatBot.jsx` - Send JWT tokens, improved markdown rendering, show intent

---

## 🔄 Key Changes Made

| Layer | Change | Impact |
|-------|--------|--------|
| **Express Server** | Added Helmet, payload limits, global rate limiter, audit middleware | All endpoints now hardened |
| **Chat Route** | Added token verification → rate limiting → input validation middleware chain | Secure processing pipeline |
| **Analytics Route** | Added admin-only access control | Sensitive data protected |
| **Frontend** | Now sends Firebase token + role/userId context in headers | Backend can verify requests |
| **FastAPI Server** | Added context retrieval, intent detection, stricter guardrails, audit logging | Smarter + safer responses |
| **Storage** | Moved to JSON files (ready for Supabase migration) | Persistent across restarts |

---

**Version**: 1.0 (January 22, 2026)  
**Status**: Production Ready with Future Enhancement Roadmap
