# Event Corner AI Chatbot - Advanced Features

## ✨ Implemented Features

### 1. **Conversation Context** 
- Previous messages are remembered and sent with each request
- Last 4 messages stored in message history for better context
- Conversation ID tracking across sessions
- Persistent conversation storage in `conversations.json`
- **Frontend**: Sends `messageHistory` and `conversationId` with requests
- **Backend**: Retrieves and builds context from previous messages

### 2. **Database Integration** 
- Ready for future integration with real Event Corner data
- Query system can be enhanced to fetch:
  - Actual events matching user queries
  - User profile information
  - Institution data
- Currently uses keyword-based intent detection as foundation
- **Future Enhancement**: Call Supabase to fetch real event data and include in system prompt

### 3. **Analytics & Tracking**
- **Blocked Queries Logging**: Tracks all restricted queries per role
- **Usage Statistics**: Records total queries, blocked rate, by role/intent
- **Intent Detection**: Classifies queries (event_search, event_creation, account, admin, general)
- **Endpoints**:
  - `GET /api/ai/analytics` - Get summary statistics
  - Shows: total queries, blocked count, block rate, breakdown by role and intent
- **Storage**: `chat_analytics.json` with last 1000 events

### 4. **Intent Detection** (NLP Foundation)
- Analyzes user queries to determine intent
- 5 intent categories:
  - **event_search**: Finding/searching for events
  - **event_creation**: Creating new events
  - **account**: User profile/account issues
  - **admin**: Administrative tasks
  - **general**: General questions
- Keywords used: `["find event", "create event", "profile", "manage", "verify"]`
- **Future Enhancement**: Replace keywords with actual NLP/ML model

### 5. **Training Data Foundation**
- System prompts customized per role (5 user types)
- Guardrails built in for each role type
- Ready for fine-tuning with Event Corner-specific documentation
- **Future Enhancement**: 
  - Add Event Corner docs/FAQs to system context
  - Fine-tune Ollama model with domain-specific knowledge
  - Create training dataset from conversation history

---

## 📊 API Endpoints

### Chat Endpoint (Enhanced)
```javascript
POST /api/ai/chat
{
  "message": "How do I create an event?",
  "userRole": "organizer",
  "userId": "user123",
  "conversationId": "user123_1706001234",
  "messageHistory": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" }
  ]
}
```

**Response includes:**
- `success`: boolean
- `response`: AI reply
- `conversation_id`: ID for this conversation
- `intent`: Detected user intent

### Analytics Endpoint
```javascript
GET /api/ai/analytics

Response:
{
  "total_queries": 42,
  "blocked_queries": 3,
  "block_rate": "7.1%",
  "by_role": {
    "participant": { "total": 20, "blocked": 1 },
    "organizer": { "total": 15, "blocked": 2 },
    ...
  },
  "by_intent": {
    "event_search": 18,
    "event_creation": 12,
    ...
  },
  "recent_events": [...]
}
```

### Conversation History Endpoint
```javascript
GET /api/ai/conversation/:conversationId

Response:
{
  "user_id": "user123",
  "user_role": "organizer",
  "created_at": "2026-01-22T10:30:00",
  "messages": [
    {
      "timestamp": "...",
      "user_message": "How do I...",
      "ai_response": "You can..."
    }
  ]
}
```

---

## 🔄 Data Flow

1. **Frontend** sends message + metadata (role, userId, conversationId, messageHistory)
2. **Express Route** receives and forwards to FastAPI
3. **FastAPI Server**:
   - Detects intent from query
   - Retrieves previous messages for context
   - Applies role-based guardrails
   - Calls Ollama with system prompt + context
   - Logs analytics (blocked/allowed, intent)
   - Saves conversation to history
4. **Response** includes conversation_id and detected intent
5. **Frontend** stores message history for next request

---

## 📁 File Storage

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

## 🚀 Future Enhancements

### 1. **Database Integration**
```python
# Example enhancement for FastAPI
def get_event_data(query: str, limit: int = 5):
    # Query Supabase for real events
    # Use LLM to match events to user query
    pass
```

### 2. **NLP Intent Detection**
- Replace keyword matching with ML model
- Options: Hugging Face transformers, spaCy, or specialized NLP model
- Train on conversation history data

### 3. **Training Data Collection**
- Use conversation history as training data
- Build Event Corner-specific training set
- Fine-tune Ollama model or switch to better base model

### 4. **Advanced Analytics**
- Dashboard showing conversation trends
- Blocked query patterns by role
- Response time metrics
- User satisfaction tracking

### 5. **Conversation Summarization**
- Auto-summarize long conversations
- Provide concise context to new conversations
- Reduce token usage

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

### 1. Test Conversation Context
```bash
# First message
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi", "userRole":"participant"}'

# Follow-up (should remember context)
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message":"Tell me more",
    "userRole":"participant",
    "messageHistory":[{"role":"user","content":"Hi"},{"role":"assistant","content":"Hello!"}]
  }'
```

### 2. Test Analytics
```bash
curl http://localhost:5000/api/ai/analytics
```

### 3. Test Blocked Queries
```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I manage users?", "userRole":"participant"}'
# Should return rejection message
```

---

## 📝 Implementation Summary

| Feature | Status | Files Modified |
|---------|--------|-----------------|
| Conversation Context | ✅ Complete | ai_server.py, ai.routes.js, ChatBot.jsx |
| Analytics Logging | ✅ Complete | ai_server.py, ai.routes.js |
| Intent Detection | ✅ Complete | ai_server.py |
| Role-Based Guards | ✅ Complete | ai_server.py |
| Markdown Rendering | ✅ Complete | ChatBot.jsx |
| API Endpoints | ✅ Complete | ai_server.py, ai.routes.js |
| Database Integration | 🟡 Ready | Needs Supabase queries |
| NLP Enhancement | 🟡 Ready | Needs ML model integration |
| Training Data | 🟡 Ready | Has foundation, needs dataset |

---

**Version**: 1.0 (January 22, 2026)  
**Status**: Production Ready with Future Enhancement Roadmap
