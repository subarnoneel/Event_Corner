"""
FastAPI Server for Banner Analysis & AI Chat with Advanced Features
- Conversation context tracking
- Database integration for real data
- Analytics for blocked queries
- Intent detection
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from banner_analyzer import BannerAnalyzer
import os
import tempfile
import sys
import ollama
from datetime import datetime
import json
from pathlib import Path
import crawler

app = FastAPI(title="Banner Analyzer API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global analyzer - loaded once at startup
analyzer = None

# Analytics and conversation storage
ANALYTICS_FILE = Path("backend/ai/chat_analytics.json")
CONVERSATIONS_FILE = Path("backend/ai/conversations.json")

# Chat request model with conversation history
class ChatRequest(BaseModel):
    message: str
    context: str | None = None
    user_role: str | None = None
    user_roles: list[str] | None = None
    user_id: str | None = None
    conversation_id: str | None = None
    message_history: list[dict] | None = None  # Previous messages for context

class Message(BaseModel):
    role: str
    content: str

@app.on_event("startup")
async def startup_event():
    """Load models once at startup"""
    global analyzer
    print("=" * 60, file=sys.stderr)
    print("🚀 Starting Banner Analyzer FastAPI Server...", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    try:
        print("📦 Loading Banner Analyzer with EasyOCR...", file=sys.stderr)
        analyzer = BannerAnalyzer(ocr_backend='easy')
        print(f"✅ Banner Analyzer ready! Backend: {analyzer.ocr_backend}", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
    except Exception as e:
        print(f"❌ Failed to load analyzer: {e}", file=sys.stderr)
        raise

# ============ ANALYTICS & LOGGING ============
def log_analytics(user_role: str, blocked: bool, query: str, intent: str = "general"):
    """Log query analytics for tracking blocked questions and user patterns"""
    try:
        analytics = {}
        if ANALYTICS_FILE.exists():
            with open(ANALYTICS_FILE, 'r') as f:
                analytics = json.load(f)
        
        timestamp = datetime.now().isoformat()
        event = {
            "timestamp": timestamp,
            "user_role": user_role,
            "blocked": blocked,
            "query": query[:100],  # First 100 chars
            "intent": intent
        }
        
        if "events" not in analytics:
            analytics["events"] = []
        analytics["events"].append(event)
        
        # Keep only last 1000 events
        if len(analytics["events"]) > 1000:
            analytics["events"] = analytics["events"][-1000:]
        
        with open(ANALYTICS_FILE, 'w') as f:
            json.dump(analytics, f, indent=2)
    except Exception as e:
        print(f"⚠️  Analytics logging failed: {e}", file=sys.stderr)

def detect_intent(message: str, user_role: str = "participant") -> str:
    """Detect user intent from query, restricted by role"""
    message_lower = message.lower()
    
    event_keywords = ["find event", "search event", "event near", "what events", "upcoming events", "show events", "browse"]
    creation_keywords = ["create event", "add event", "host event", "organize event", "new event", "setup event"]
    account_keywords = ["profile", "account", "password", "email", "registration", "logout", "login"]
    admin_keywords = ["manage", "verify", "approve", "reject", "role", "permission", "user", "institution"]
    
    # Check for admin intent (only for admins/super_admins)
    if user_role in ["admin", "super_admin"]:
        for keyword in admin_keywords:
            if keyword in message_lower:
                return "admin"
    
    for keyword in event_keywords:
        if keyword in message_lower:
            return "event_search"
    
    for keyword in creation_keywords:
        if keyword in message_lower:
            return "event_creation"
    
    for keyword in account_keywords:
        if keyword in message_lower:
            return "account"
    
    return "general"

# ============ CONVERSATION MANAGEMENT ============
def get_conversation_context(conversation_id: str, user_id: str, max_messages: int = 5) -> list[dict]:
    """Retrieve previous messages and verify ownership"""
    try:
        if CONVERSATIONS_FILE.exists():
            with open(CONVERSATIONS_FILE, 'r') as f:
                conversations = json.load(f)
            
            if conversation_id in conversations:
                conv = conversations[conversation_id]
                # Security check: verify this conversation belongs to the user
                if conv.get("user_id") != user_id:
                    print(f"⚠️  Access denied for user {user_id} to conversation {conversation_id}", file=sys.stderr)
                    return []
                
                messages = conv.get("messages", [])
                # Return last N messages for context
                return messages[-max_messages:] if messages else []
    except Exception as e:
        print(f"⚠️  Conversation retrieval failed: {e}", file=sys.stderr)
    return []

def save_conversation(conversation_id: str, user_id: str, message: str, response: str, user_role: str):
    """Save message to conversation history"""
    try:
        conversations = {}
        if CONVERSATIONS_FILE.exists():
            with open(CONVERSATIONS_FILE, 'r') as f:
                conversations = json.load(f)
        
        if conversation_id not in conversations:
            conversations[conversation_id] = {
                "user_id": user_id,
                "user_role": user_role,
                "created_at": datetime.now().isoformat(),
                "messages": []
            }
        else:
            # Prevent history mixing by verifying owner
            if conversations[conversation_id].get("user_id") != user_id:
                print(f"⚠️  Conversation ID collision or leakage blocked for user {user_id}", file=sys.stderr)
                # Create a new unique ID if collision
                conversation_id = f"{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                conversations[conversation_id] = {
                    "user_id": user_id,
                    "user_role": user_role,
                    "created_at": datetime.now().isoformat(),
                    "messages": []
                }
        
        conversations[conversation_id]["messages"].append({
            "timestamp": datetime.now().isoformat(),
            "user_message": message,
            "ai_response": response
        })
        
        # Keep only last 50 conversations
        if len(conversations) > 50:
            conversations = dict(list(conversations.items())[-50:])
        
        with open(CONVERSATIONS_FILE, 'w') as f:
            json.dump(conversations, f, indent=2)
    except Exception as e:
        print(f"⚠️  Conversation save failed: {e}", file=sys.stderr)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "running", "service": "Banner Analyzer API"}

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "analyzer_loaded": analyzer is not None,
        "ocr_backend": analyzer.ocr_backend if analyzer else None
    }

@app.post("/analyze")
async def analyze_banner(file: UploadFile = File(...)):
    """
    Analyze banner image and extract event details
    
    Returns JSON with event data or error
    """
    if analyzer is None:
        raise HTTPException(status_code=503, detail="Analyzer not initialized")
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save uploaded file temporarily
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        print(f"📸 Analyzing: {file.filename}", file=sys.stderr)
        
        # Analyze (models already loaded!)
        result = analyzer.analyze(tmp_path)
        
        print(f"✅ Analysis complete: {file.filename}", file=sys.stderr)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Analysis error: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
        
    finally:
        # Cleanup temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as e:
                print(f"⚠️  Failed to delete temp file: {e}", file=sys.stderr)

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint using Ollama llama3.2 for Event Corner assistance
    Features:
    - Role-aware with guardrails
    - Conversation context tracking
    - Intent detection
    - Analytics logging
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message is required")
        
        user_role = request.user_role or "participant"
        user_id = request.user_id or "anonymous"
        conversation_id = request.conversation_id or f"{user_id}_{datetime.now().strftime('%Y%m%d')}"
        
        # Detect user intent
        intent = detect_intent(request.message, user_role)
        
        print(f"💬 Chat request [{user_role}] Intent: {intent}: {request.message[:50]}...", file=sys.stderr)
        
        # Role-based system prompts
        role_prompts = {
            "super_admin": (
                "You are Event Corner's AI assistant for Super Admins. "
                "You have full access to system functions including role assignment, institution verification, "
                "system settings, user management, and analytics. Provide comprehensive technical guidance. "
                "Be authoritative and detailed."
            ),
            "admin": (
                "You are Event Corner's AI assistant for Admins. "
                "You can help with institution management, user moderation, and admin features. "
                "You cannot discuss role assignments or system-level settings. "
                "Be helpful and professional."
            ),
            "institution": (
                "You are Event Corner's AI assistant for Institution Admins. "
                "Help with managing organizers, approving events, institution settings, and team management. "
                "You cannot verify institutions or manage other institutions. "
                "Be focused on institutional operations."
            ),
            "organizer": (
                "You are Event Corner's AI assistant for Event Organizers. "
                "Help with creating events, managing event details, participant management, and promotion. "
                "You cannot create additional organizer accounts or manage institutions. "
                "Be focused on event creation and management."
            ),
            "participant": (
                "You are Event Corner's AI assistant for Participants. "
                "Help users find events, understand event details, register for events, and troubleshoot basic issues. "
                "You cannot help with event creation, organizer functions, or admin tasks. "
                "Be friendly and user-focused."
            )
        }
        
        # Restricted keywords by role
        restricted_keywords = {
            "super_admin": [],
            "admin": [
                "role assignment", "system settings", "super admin",
                "assign role", "change role", "promote user"
            ],
            "institution": [
                "role assignment", "institution verification", "super admin", "system settings",
                "assign organizer", "promote to organizer", "verify institution"
            ],
            "organizer": [
                "manage users", "verify institution", "admin", "super admin", 
                "system settings", "role assignment", "assign role", "manage admins"
            ],
            "participant": [
                "create event", "host event", "organize event", "start event",
                "manage organizers", "admin", "super admin", "organizer features", 
                "institution management", "assign role", "promote user", "verify institution",
                "how to create event", "how do i create event", "how do you create event",
                "steps to create event", "create an event", "organize an event"
            ]
        }
        
        # Check for restricted keywords in message
        message_lower = request.message.lower()
        restricted = restricted_keywords.get(user_role, [])
        
        # For participants, also check if they're asking about event creation
        if user_role == "participant":
            # More sophisticated check for event creation questions
            creation_patterns = [
                "how.*create.*event",
                "can.*create.*event",
                "create.*event",
                "host.*event",
                "organize.*event",
                "start.*event",
                "way.*create.*event",
                "method.*create.*event"
            ]
            import re
            for pattern in creation_patterns:
                if re.search(pattern, message_lower):
                    rejection_msg = (
                        "As a **participant**, you can only **find and register for events**, not create them. "
                        "📍 To create events, you need an **organizer role**.\n\n"
                        "**What you CAN do:**\n"
                        "• Browse and search for events\n"
                        "• Register for events you find\n"
                        "• View event details\n"
                        "• Manage your registrations\n\n"
                        "**To become an organizer**, contact your institution admin or the Event Corner team."
                    )
                    log_analytics(user_role, True, request.message, "event_creation_blocked")
                    print(f"⛔ Event creation request blocked for participant", file=sys.stderr)
                    return JSONResponse(content={"success": True, "response": rejection_msg})
        
        for keyword in restricted:
            if keyword.lower() in message_lower:
                rejection_msg = f"I can't help with that question as a {user_role}. This requires higher permissions or a different role."
                log_analytics(user_role, True, request.message, intent)
                print(f"⛔ Restricted query blocked for {user_role}", file=sys.stderr)
                return JSONResponse(content={"success": True, "response": rejection_msg})
        
        system_prompt = role_prompts.get(user_role, role_prompts["participant"])
        
        # Build messages array with conversation history
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add previous messages for context (if available)
        if request.message_history:
            for prev_msg in request.message_history[-3:]:  # Last 3 messages for context
                messages.append({"role": prev_msg.get("role", "user"), "content": prev_msg.get("content", "")})
        elif request.conversation_id:
            # Try to retrieve from file storage
            history = get_conversation_context(request.conversation_id, user_id)
            for hist_item in history:
                if "user_message" in hist_item:
                    messages.append({"role": "user", "content": hist_item["user_message"]})
                    messages.append({"role": "assistant", "content": hist_item["ai_response"]})
        
        if request.context:
            messages.append({"role": "system", "content": f"Context: {request.context}"})
        
        messages.append({"role": "user", "content": request.message})
        
        response = ollama.chat(model="llama3.2", messages=messages)
        content = response.get("message", {}).get("content", "")
        
        if not content:
            raise HTTPException(status_code=500, detail="Empty response from model")
        
        # Save to conversation history
        if request.conversation_id:
            save_conversation(request.conversation_id, user_id, request.message, content, user_role)
        
        # Log analytics
        log_analytics(user_role, False, request.message, intent)
        
        print(f"✅ Chat response generated for {user_role} (Intent: {intent})", file=sys.stderr)
        return JSONResponse(content={
            "success": True,
            "response": content,
            "conversation_id": conversation_id,
            "intent": intent
        })
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Chat error: {error_msg}", file=sys.stderr)
        
        if "connection" in error_msg.lower() or "11434" in error_msg:
            raise HTTPException(status_code=503, detail="Ollama is not running on port 11434")
        raise HTTPException(status_code=500, detail=f"Chat failed: {error_msg}")

class EventConversationRequest(BaseModel):
    message: str
    conversation_history: list[dict] | None = None

@app.post("/create-event-conversation")
async def create_event_conversation(request: EventConversationRequest):
    """
    Conversational event creation - extracts event details from natural language
    and asks clarifying questions when needed
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message is required")
        
        print(f"🎯 Event creation conversation: {request.message[:50]}...", file=sys.stderr)
        
        system_prompt = """You are an expert event planning assistant for Event Corner platform.
Your job is to help users create events by extracting event details from their descriptions.

Required fields:
- title (string): Event name
- description (text): Detailed description
- category (string): MUST be ONE of these exact values: workshop, seminar, competition, cultural, conference, networking, sports, charity, exhibition, other
- venue_type (string): MUST be ONE of: physical, online, hybrid
- venue_name (string): Venue or platform name (e.g., "IUT Auditorium", "Zoom", "Hybrid: Main Hall + YouTube Live")
- timeslots (array): [{title, start, end}] - Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS+06:00) for Asia/Dhaka timezone

Optional fields:
- tags (array of strings): Relevant keywords
- contact_email, contact_phone: Contact information
- requirements (text): Prerequisites or requirements to participate
- venue_address (for physical/hybrid events): Full address
- venue_city, venue_state, venue_country: Location details

Guidelines:
1. Extract ALL available information from the user's message
2. If CRITICAL information is missing (title, date/time, or venue_type), ask ONE specific question
3. Make reasonable assumptions for optional fields based on context
4. Infer category from event description (e.g., "coding competition" → competition, "tech talk" → seminar)
5. For dates: Use ISO 8601 format with +06:00 timezone (Asia/Dhaka)
6. Be friendly and concise

RESPONSE FORMAT - You MUST respond with valid JSON only, no other text:

When asking for clarification:
{
  "needs_clarification": true,
  "question": "What date and time will the workshop be held?",
  "extracted_so_far": {"title": "React Workshop", "category": "workshop", "venue_type": "online"},
  "missing_fields": ["timeslots"],
  "confidence": 0.6
}

When data is complete:
{
  "needs_clarification": false,
  "event_data": {
    "title": "React Workshop",
    "description": "Learn React...",
    "category": "workshop",
    "venue_type": "online",
    "venue_name": "Zoom",
    "timeslots": [{"title": "Main Session", "start": "2025-01-15T14:00:00+06:00", "end": "2025-01-15T16:00:00+06:00"}],
    "tags": ["react", "javascript", "web-development"]
  },
  "confidence": 0.95,
  "message": "Great! I've extracted all the details for your event. Please review and edit if needed."
}

Remember: Respond ONLY with valid JSON, no markdown, no explanation text outside the JSON."""

        # Build conversation history
        messages = [{"role": "system", "content": system_prompt}]
        
        if request.conversation_history:
            for msg in request.conversation_history:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        
        messages.append({"role": "user", "content": request.message})
        
        # Get response from Ollama
        response = ollama.chat(
            model="llama3.2",
            messages=messages,
            format="json"  # Request JSON format
        )
        
        content = response.get("message", {}).get("content", "")
        
        if not content:
            raise HTTPException(status_code=500, detail="Empty response from model")
        
        # Parse JSON response
        import json
        try:
            result = json.loads(content)
        except json.JSONDecodeError as e:
            print(f"⚠️  JSON parse error: {e}", file=sys.stderr)
            print(f"Raw response: {content}", file=sys.stderr)
            # Fallback: wrap in error response
            result = {
                "needs_clarification": True,
                "question": "I'm having trouble understanding. Could you describe your event with more details?",
                "extracted_so_far": {},
                "missing_fields": ["title", "category", "venue_type", "timeslots"],
                "confidence": 0.0
            }
        
        print(f"✅ Event conversation response generated", file=sys.stderr)
        return JSONResponse(content={"success": True, "result": result})
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Event conversation error: {error_msg}", file=sys.stderr)
        
        if "connection" in error_msg.lower() or "11434" in error_msg:
            raise HTTPException(status_code=503, detail="Ollama is not running on port 11434")
        raise HTTPException(status_code=500, detail=f"Event conversation failed: {error_msg}")

<<<<<<< HEAD
@app.get("/analytics")
async def get_analytics():
    """Get chat analytics (blocked queries, user patterns, intents)"""
    try:
        if not ANALYTICS_FILE.exists():
            return {"total_queries": 0, "events": []}
        
        with open(ANALYTICS_FILE, 'r') as f:
            analytics = json.load(f)
        
        # Calculate summary stats
        total_queries = len(analytics.get("events", []))
        blocked_queries = len([e for e in analytics.get("events", []) if e.get("blocked")])
        
        # Group by role
        by_role = {}
        for event in analytics.get("events", []):
            role = event.get("user_role", "unknown")
            if role not in by_role:
                by_role[role] = {"total": 0, "blocked": 0}
            by_role[role]["total"] += 1
            if event.get("blocked"):
                by_role[role]["blocked"] += 1
        
        # Group by intent
        by_intent = {}
        for event in analytics.get("events", []):
            intent = event.get("intent", "general")
            by_intent[intent] = by_intent.get(intent, 0) + 1
        
        return {
            "total_queries": total_queries,
            "blocked_queries": blocked_queries,
            "block_rate": f"{(blocked_queries/total_queries*100):.1f}%" if total_queries > 0 else "0%",
            "by_role": by_role,
            "by_intent": by_intent,
            "recent_events": analytics.get("events", [])[-20:]
        }
    except Exception as e:
        print(f"⚠️  Analytics retrieval failed: {e}", file=sys.stderr)
        return {"error": str(e)}

@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get full conversation history"""
    try:
        if not CONVERSATIONS_FILE.exists():
            return {"error": "No conversations found"}
        
        with open(CONVERSATIONS_FILE, 'r') as f:
            conversations = json.load(f)
        
        if conversation_id not in conversations:
            return {"error": "Conversation not found"}
        
        return conversations[conversation_id]
    except Exception as e:
        print(f"⚠️  Conversation retrieval failed: {e}", file=sys.stderr)
        return {"error": str(e)}

class CrawlRequest(BaseModel):
    url: str

@app.post("/crawl")
async def crawl_website(request: CrawlRequest):
    """
    Crawl a website and extract event information
    """
    try:
        print(f"🕷️ Crawling URL: {request.url}", file=sys.stderr)
        
        result = crawler.extract_events(request.url)
        
        if "error" in result:
             raise HTTPException(status_code=400, detail=result["error"])
             
        print(f"✅ Crawl complete for {request.url}", file=sys.stderr)
        return JSONResponse(content={"success": True, "data": result})
        
    except Exception as e:
        print(f"❌ Crawl error: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Crawl failed: {str(e)}")

@app.post("/fetch-html")
async def fetch_html(request: CrawlRequest):
    """
    Fetch raw HTML content from a URL (using curl_cffi via crawler.py)
    """
    try:
        print(f"📥 Fetching HTML for: {request.url}", file=sys.stderr)
        html_content = crawler.fetch_page(request.url)
        
        if not html_content:
             raise HTTPException(status_code=400, detail="Failed to fetch page content")
             
        print(f"✅ Fetch complete: {len(html_content)} chars", file=sys.stderr)
        return JSONResponse(content={"success": True, "html": html_content})
        
    except Exception as e:
        print(f"❌ Fetch HTML error: {str(e)}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Fetch failed: {str(e)}")

if __name__ == "__main__":
    print("\n🌟 Banner Analyzer FastAPI Server", file=sys.stderr)
    print("Port: 5001", file=sys.stderr)
    print("Docs: http://localhost:5001/docs\n", file=sys.stderr)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5001,
        log_level="info"
    )
