import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

// POST /api/ai/analyze-banner - Send to FastAPI server
router.post('/analyze-banner', upload.single('banner'), async (req, res) => {
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

export default router;
