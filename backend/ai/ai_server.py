"""
FastAPI Server for Banner Analysis
Keeps Python process alive and models loaded for fast analysis
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from banner_analyzer import BannerAnalyzer
import os
import tempfile
import sys

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
