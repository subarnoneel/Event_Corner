import express from 'express';
import multer from 'multer';
import path from 'path';
import { spawn } from 'child_process';
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

// POST /api/ai/analyze-banner
router.post('/analyze-banner', upload.single('banner'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No banner image uploaded' });
  }

  const imagePath = req.file.path;
  console.log('Analyzing banner:', imagePath);

  try {
    // Path to Python script
    const pythonScript = path.join(__dirname, '../ai/banner_analyzer.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python', [pythonScript, imagePath]);
    
    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.log('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      // Clean up uploaded file after processing
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });

      if (code !== 0) {
        console.error('Python process error:', errorData);
        return res.status(500).json({
          success: false,
          error: 'Banner analysis failed',
          details: errorData
        });
      }

      try {
        const result = JSON.parse(outputData);
        res.json(result);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw output:', outputData);
        res.status(500).json({
          success: false,
          error: 'Failed to parse analysis results',
          raw_output: outputData
        });
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Clean up file on error
    if (fs.existsSync(imagePath)) {
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/ai/status - Check if AI service is available
router.get('/status', (req, res) => {
  const pythonScript = path.join(__dirname, '../ai/banner_analyzer.py');
  
  if (!fs.existsSync(pythonScript)) {
    return res.json({
      available: false,
      error: 'Python script not found'
    });
  }

  // Try to run a simple Python check
  const pythonProcess = spawn('python', ['--version']);
  
  pythonProcess.on('close', (code) => {
    if (code === 0) {
      res.json({
        available: true,
        message: 'AI analysis service is ready'
      });
    } else {
      res.json({
        available: false,
        error: 'Python not available'
      });
    }
  });

  pythonProcess.on('error', (error) => {
    res.json({
      available: false,
      error: 'Python not found: ' + error.message
    });
  });
});

export default router;
