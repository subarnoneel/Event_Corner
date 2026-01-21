# AI Banner Analysis Setup Guide

## Installation Steps

### 1. Install Tesseract OCR (Windows)

Download and install Tesseract from:
https://github.com/UB-Mannheim/tesseract/wiki

During installation, note the installation path (usually `C:\Program Files\Tesseract-OCR\`)

After installation, add to system PATH or update line 10 in `banner_analyzer.py`:
```python
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

### 2. Install Python Packages

```bash
cd backend/ai
pip install -r requirements.txt
```

For GPU support (recommended with your RTX 4050):
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install transformers pillow pytesseract
```

### 3. Test Python Setup

```bash
install the package with: `pip install huggingface_hub[hf_xet]` or `pip install hf_xet` 
```

### 4. Test AI Service

Start backend:
```bash
cd backend
npm run dev
```

Test endpoint:
```bash
curl http://localhost:5000/api/ai/status
```

## Usage

1. Go to Event Creation page
2. Click "AI-Assisted Creation"
3. Upload event banner image
4. Click "Analyze Banner"
5. Review extracted data
6. Click "Use This Data" to fill form

## What Gets Extracted

- ✅ Event title
- ✅ Description (dates, times)
- ✅ Category (workshop, seminar, etc.)
- ✅ Venue name and address
- ✅ Contact email
- ✅ Contact phone
- ✅ Entry fee
- ✅ Tags

## Troubleshooting

**"Python not found"**
- Install Python 3.8+ from python.org
- Add to system PATH

**"Tesseract not found"**
- Install Tesseract OCR
- Update path in banner_analyzer.py

**"CUDA not available"**
- Install NVIDIA CUDA Toolkit
- Or run on CPU (slower but works)

**"Model download slow"**
- First run downloads BLIP model (~2GB)
- Subsequent runs are fast

## Files Created

```
backend/
  ai/
    banner_analyzer.py    # Main Python script
    requirements.txt      # Python dependencies
  routes/
    ai.routes.js         # Express routes
  uploads/
    banners/            # Temp upload folder (auto-created)

frontend/
  src/
    pages/EventAdd/
      components/
        BannerAnalyzer.jsx  # Upload UI component
    config/
      api.js               # Added AI endpoints
```

## Performance Notes

With your specs (i5 13400HX, RTX 4050 6GB):
- First analysis: ~30 seconds (model loading)
- Subsequent: ~5-10 seconds
- GPU memory usage: ~2GB
- Runs entirely local, no API costs!
