# Event Corner - AI Banner Analysis Setup

## Quick Start for Team Members

### Prerequisites
- Python 3.10 or 3.11
- CUDA GPU (optional but recommended)
- Node.js 18+
- Ollama installed

### Setup Steps

#### 1. Install Ollama
Download and install Ollama:
- Windows/Mac/Linux: https://ollama.com/download

Pull the required model:
```bash
ollama pull llama3.2
```

#### 2. Install Python Dependencies
```bash
cd backend/ai
pip install -r requirements.txt
```

**Note:** Installation may take 5-10 minutes (downloading ML models)

#### 3. Install Node Dependencies
```bash
cd ../..
npm install
```

#### 4. Start Services

You need **3 terminals** running:

**Terminal 1 - Ollama (LLM Server):**
```bash
ollama serve
```
Keep this running. You should see: `Ollama is running`

**Terminal 2 - AI FastAPI Server:**
```bash
cd backend/ai
python ai_server.py
```
Wait for: `✅ Banner Analyzer ready! Backend: easy`

**Terminal 3 - Main Application:**
```bash
npm run dev
```

### Usage

1. Open browser: http://localhost:5173
2. Upload an event banner image
3. Wait ~20-25 seconds for analysis
4. View extracted event details

### System Architecture

```
User Upload → Node.js (5000) → FastAPI (5001) → EasyOCR + Llama3.2
                                                      ↓
                                              Event JSON Data
```

### Performance

- **First request:** ~25-30s (loading models)
- **Subsequent:** ~20-25s (models already loaded)
- **GPU:** Speeds up EasyOCR significantly

### Troubleshooting

**"Ollama connection failed"**
→ Make sure `ollama serve` is running in Terminal 1

**"AI server not running"**
→ Check Terminal 2 - FastAPI server must be active

**"ModuleNotFoundError"**
→ Run `pip install -r requirements.txt` in `backend/ai`

**Slow analysis (>40s)**
→ Normal on first run. Subsequent uploads should be ~20-25s

### Files Overview

**Core:**
- `ai_server.py` - FastAPI server (keep running)
- `banner_analyzer.py` - OCR + LLM logic
- `requirements.txt` - Python dependencies

**Routes:**
- `../routes/ai.routes.js` - API endpoints

**Config:**
- Uses EasyOCR for text extraction (GPU-accelerated)
- Uses Llama3.2 for text structuring
- FastAPI keeps models loaded for speed

### Development Tips

**To change OCR backend:**
Edit `ai_server.py` line 38:
```python
analyzer = BannerAnalyzer(ocr_backend='easy')  # or 'paddle'
```
Then restart Terminal 2 (FastAPI server)

**To test OCR only:**
```python
from banner_analyzer import BannerAnalyzer
analyzer = BannerAnalyzer(ocr_backend='easy')
text, conf = analyzer.extract_text_ocr('path/to/image.jpg')
print(f"Text: {text}")
print(f"Confidence: {conf}%")
```

### Team Collaboration

When pulling updates:
1. Check if `requirements.txt` changed → run `pip install -r requirements.txt`
2. Check if `ai_server.py` changed → restart Terminal 2
3. Check if Node dependencies changed → run `npm install`

### Support

For issues:
1. Check all 3 terminals are running
2. Check Ollama: `ollama list` (should show llama3.2)
3. Check Python: `python --version` (should be 3.10 or 3.11)
4. Check dependencies: `pip list | grep -E "easyocr|fastapi|torch"`

---

**Made with ❤️ for Event Corner**
