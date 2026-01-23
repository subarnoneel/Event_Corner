# 🎨 Event Banner Analyzer - LLaVA Integration

Automatically extract event information from banner images using **LLaVA vision model** (via Ollama).

## 🚀 Quick Start

### Prerequisites

1. **Ollama installed** with LLaVA:7b model
   ```bash
   # Download and install Ollama from: https://ollama.com
   
   # Pull LLaVA model
   ollama pull llava:7b
   ```

2. **Python packages installed**
   ```bash
   pip install -r requirements.txt
   ```

### Usage

#### Command Line
```bash
# Analyze a banner image
python banner_analyzer.py path/to/banner.jpg

# Test with detailed output
python test_llava_banner.py path/to/banner.jpg
```

#### Python API
```python
from banner_analyzer import BannerAnalyzer

analyzer = BannerAnalyzer()
result = analyzer.analyze("banner.jpg")

if result["success"]:
    event_data = result["event_data"]
    print(f"Title: {event_data['title']}")
    print(f"Venue: {event_data['venue_name']}")
    print(f"Date: {event_data['event_date']}")
    # ... etc
```

## 📋 Extracted Fields

The analyzer extracts the following fields from event banners:

| Field | Description | Example |
|-------|-------------|---------|
| `title` | Event name | "AI Workshop 2024" |
| `description` | Brief summary | "Learn about machine learning" |
| `category` | Event type | "workshop", "seminar", "competition" |
| `venue_name` | Location name | "BUET Auditorium" |
| `venue_address` | Full address | "ECE Building, BUET Campus" |
| `event_date` | Date (YYYY-MM-DD) | "2024-12-25" |
| `event_time` | Time (HH:MM) | "14:00" |
| `registration_deadline` | Deadline date | "2024-12-24" |
| `organizer` | Organizing body | "IEEE Student Branch" |
| `contact_email` | Contact email | "info@event.com" |
| `contact_phone` | Phone number | "+8801712345678" |
| `entry_fee` | Ticket price | "500 BDT" or "Free" |
| `tags` | Keywords | ["AI", "Workshop", "Tech"] |

## 🔄 How It Works

1. **Primary Strategy: LLaVA Vision Model**
   - Sends image directly to LLaVA:7b
   - No OCR needed!
   - Returns structured JSON with all fields
   - **Best for:** Stylized text, complex layouts, overlapping elements

2. **Fallback: OCR + SpaCy**
   - If LLaVA fails or unavailable
   - Uses EasyOCR for text extraction
   - SpaCy NER + Regex for parsing
   - **Best for:** Simple banners, when Ollama is down

## 📊 Output Format

```json
{
  "success": true,
  "event_data": {
    "title": "Tech Conference 2024",
    "description": "Annual technology conference",
    "category": "conference",
    "venue_name": "Bashundhara Convention Center",
    "venue_address": "Dhaka, Bangladesh",
    "event_date": "2024-12-30",
    "event_time": "10:00",
    "registration_deadline": "2024-12-25",
    "organizer": "Tech Society",
    "contact_email": "contact@techconf.org",
    "contact_phone": "+8801712345678",
    "entry_fee": "1000 BDT",
    "tags": ["technology", "conference"],
    "confidence": "high"
  },
  "debug_info": {
    "method": "llava_vlm"
  }
}
```

## 🎯 Confidence Scores

| Score | Criteria | Meaning |
|-------|----------|---------|
| `high` | >70% fields filled | Most information extracted |
| `medium` | 40-70% fields filled | Some information missing |
| `low` | <40% fields filled | Difficult to read banner |

## 🧪 Testing

### Test Ollama Connection
```bash
python test_ollama.py
```
Expected output:
```
✅ Ollama is running!
Found 1 models:
  - llava:7b
```

### Test Banner Analysis
```bash
python test_llava_banner.py sample_banner.jpg
```

## 🔧 Integration with Frontend

### Node.js/Express Example

```javascript
const { spawn } = require('child_process');
const path = require('path');

async function analyzeBanner(imagePath) {
    return new Promise((resolve, reject) => {
        const python = spawn('python', [
            path.join(__dirname, 'ai', 'banner_analyzer.py'),
            imagePath
        ]);
        
        let output = '';
        let errors = '';
        
        python.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        python.stderr.on('data', (data) => {
            errors += data.toString();
            console.log('Analyzer:', data.toString());
        });
        
        python.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    resolve(result.event_data);
                } catch (err) {
                    reject(new Error('Invalid JSON from analyzer'));
                }
            } else {
                reject(new Error('Analysis failed: ' + errors));
            }
        });
    });
}

// Usage in route
app.post('/api/analyze-banner', upload.single('banner'), async (req, res) => {
    try {
        const eventData = await analyzeBanner(req.file.path);
        res.json({ success: true, data: eventData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

### Client-Side Form Population

```javascript
// After receiving eventData from API
function populateEventForm(eventData) {
    document.getElementById('title').value = eventData.title || '';
    document.getElementById('description').value = eventData.description || '';
    document.getElementById('category').value = eventData.category || '';
    document.getElementById('venue_name').value = eventData.venue_name || '';
    document.getElementById('venue_address').value = eventData.venue_address || '';
    document.getElementById('event_date').value = eventData.event_date || '';
    document.getElementById('event_time').value = eventData.event_time || '';
    document.getElementById('contact_email').value = eventData.contact_email || '';
    document.getElementById('contact_phone').value = eventData.contact_phone || '';
    document.getElementById('entry_fee').value = eventData.entry_fee || '';
    
    // Show confidence indicator
    const confidence = eventData.confidence;
    showConfidenceBadge(confidence); // 'high', 'medium', or 'low'
    
    // Allow user to review and edit before submission
    enableFormEditing();
}
```

## 🐛 Troubleshooting

### Issue: "Cannot connect to Ollama"
**Solution:** Make sure Ollama is running
```bash
# Windows: Check if Ollama is running in system tray
# Or restart it from Start Menu

# Test connection
python test_ollama.py
```

### Issue: "LLaVA model not found"
**Solution:** Download the model
```bash
ollama pull llava:7b
```

### Issue: Slow analysis (>30 seconds)
**Cause:** Running on CPU instead of GPU
**Solution:** Ensure CUDA is installed and GPU is detected:
```python
import torch
print(torch.cuda.is_available())  # Should be True
```

### Issue: Poor extraction quality
**Tips:**
- Ensure banner image is clear (not blurry)
- Try preprocessing: increase contrast, resize
- Check if banner has very stylized fonts
- Review confidence score - may need manual review

## ⚙️ Configuration

You can modify the analyzer behavior in `banner_analyzer.py`:

```python
# Line 431: Change model
MODEL_NAME = "llava:13b"  # For better accuracy (slower)

# Line 449: Adjust temperature
'temperature': 0.1,  # Lower = more consistent (0.0-1.0)

# Line 418: Modify prompt
# Edit the prompt to add/remove fields or change instructions
```

## 📝 Requirements

- **Python**: 3.8+
- **Ollama**: Latest version
- **LLaVA Model**: 7B (recommended) or 13B (better quality)
- **GPU**: NVIDIA with 4GB+ VRAM (RTX 4050 or better)
- **RAM**: 8GB minimum, 16GB recommended

## 🎓 Learn More

- [Ollama Documentation](https://github.com/ollama/ollama)
- [LLaVA Paper](https://llava-vl.github.io/)
- [Walkthrough Document](file:///C:/Users/nakib/.gemini/antigravity/brain/f9aa5206-4455-471d-8789-8b0e3678afb1/walkthrough.md)

---

**Created:** 2024-12-24  
**Author:** Event Corner Team  
**License:** MIT
