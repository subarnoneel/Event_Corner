"""
FastAPI Server for Banner Analysis
Keeps Python process alive and models loaded for fast analysis
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

# Chat request model
class ChatRequest(BaseModel):
    message: str
    context: str | None = None

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
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message is required")
        
        print(f"💬 Chat request: {request.message[:50]}...", file=sys.stderr)
        
        system_prompt = (
            "You are a helpful AI assistant for Event Corner, an event management platform. "
            "Help users with finding events, understanding event details, creating events, and using the platform. "
            "Be friendly, concise, and helpful."
        )
        
        messages = [{"role": "system", "content": system_prompt}]
        if request.context:
            messages.append({"role": "system", "content": f"Context: {request.context}"})
        messages.append({"role": "user", "content": request.message})
        
        response = ollama.chat(model="llama3.2", messages=messages)
        content = response.get("message", {}).get("content", "")
        
        if not content:
            raise HTTPException(status_code=500, detail="Empty response from model")
        
        print(f"✅ Chat response generated", file=sys.stderr)
        return JSONResponse(content={"success": True, "response": content})
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Chat error: {error_msg}", file=sys.stderr)
        
        if "connection" in error_msg.lower() or "11434" in error_msg:
            raise HTTPException(status_code=503, detail="Ollama is not running on port 11434")
        raise HTTPException(status_code=500, detail=f"Chat failed: {error_msg}")

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
