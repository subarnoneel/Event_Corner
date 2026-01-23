import sys
import json
import os
from datetime import datetime
import re
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import torch

# Import OpenCV for advanced preprocessing
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("Warning: opencv-python not available - advanced preprocessing disabled", file=sys.stderr)

# Transformers imported lazily in load_blip_model to speed up startup

# Force UTF-8 encoding for stdout/stderr to handle emojis and special chars on Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Import EasyOCR
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("Warning: easyocr not available", file=sys.stderr)

class BannerAnalyzer:
    def __init__(self):
        """Initialize analyzer - BLIP and EasyOCR load lazily when needed"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = None
        self.model = None
        self.model_loaded = False
        self.reader = None
        self.reader_loaded = False
        
    def load_easyocr(self):
        """Load EasyOCR reader only when needed"""
        if self.reader_loaded:
            return
            
        print("🚀 Loading EasyOCR model (this may take a moment)...", file=sys.stderr)
        # Initialize reader - this downloads models if needed
        # gpu=True if CUDA is available, else False
        use_gpu = torch.cuda.is_available()
        # verbose=False prevents progress bars from crashing on Windows terminals with encoding issues
        self.reader = easyocr.Reader(['en'], gpu=use_gpu, verbose=False)
        self.reader_loaded = True
        print(f"✅ EasyOCR loaded! (GPU: {use_gpu})", file=sys.stderr)

    def load_blip_model(self):
        """Load BLIP model only when needed"""
        if self.model_loaded:
            return
            
        print("🚀 Loading BLIP model (first time will download ~500MB)...", file=sys.stderr)
        
        # Lazy import to avoid slow startup for OCR-only use
        from transformers import BlipProcessor, BlipForConditionalGeneration
        
        print(f"✅ Using device: {self.device}", file=sys.stderr)
        
        # Load BLIP model (smaller, faster)
        print("📥 Step 1/2: Downloading processor files...", file=sys.stderr)
        self.processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base",
            resume_download=True,
            force_download=False
        )
        print("✅ Processor loaded!", file=sys.stderr)
        
        print("📥 Step 2/2: Downloading main model (~400MB)...", file=sys.stderr)
        print("    This may take 2-5 minutes depending on your internet speed.", file=sys.stderr)
        self.model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base",
            resume_download=True,
            force_download=False
        )
        print("✅ Model downloaded!", file=sys.stderr)
        
        print("🔄 Moving model to GPU...", file=sys.stderr)
        self.model.to(self.device)
        print("✅ Ready to analyze! Next analyses will be instant.", file=sys.stderr)
        self.model_loaded = True

    def load_spacy_model(self):
        """Load SpaCy model only when needed"""
        if hasattr(self, 'nlp') and self.nlp:
            return

        print("🚀 Loading SpaCy NLP model...", file=sys.stderr)
        try:
            import spacy
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                print("📥 Downloading SpaCy model 'en_core_web_sm'...", file=sys.stderr)
                from spacy.cli import download
                download("en_core_web_sm")
                self.nlp = spacy.load("en_core_web_sm")
            print("✅ SpaCy loaded!", file=sys.stderr)
        except Exception as e:
            print(f"SpaCy Error: {str(e)}", file=sys.stderr)
            self.nlp = None

    def preprocess_image_advanced(self, image_path):
        """Advanced multi-strategy preprocessing for optimal OCR"""
        if not CV2_AVAILABLE:
            # Fallback to basic PIL preprocessing
            return self._preprocess_basic_pil(image_path)
        
        try:
            # Read image with OpenCV
            img = cv2.imread(image_path)
            if img is None:
                print(f"⚠️  Could not read image with OpenCV, using PIL fallback", file=sys.stderr)
                return self._preprocess_basic_pil(image_path)
            
            # Resize if too large (to avoid OOM and speed up processing)
            max_size = 2048
            height, width = img.shape[:2]
            if max(height, width) > max_size:
                scale = max_size / max(height, width)
                new_width = int(width * scale)
                new_height = int(height * scale)
                img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_LANCZOS4)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Create multiple preprocessing variants
            variants = {}
            
            # Strategy 1: High Contrast (good for low-contrast text)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            variants['high_contrast'] = clahe.apply(gray)
            
            # Strategy 2: Adaptive Threshold (good for varied backgrounds)
            adaptive = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            variants['adaptive_thresh'] = adaptive
            
            # Strategy 3: Denoised + Sharpened (good for noisy images)
            denoised = cv2.fastNlMeansDenoising(gray)
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            sharpened = cv2.filter2D(denoised, -1, kernel)
            variants['denoised_sharp'] = sharpened
            
            # Strategy 4: Simple Bilateral Filter (preserves edges, reduces noise)
            bilateral = cv2.bilateralFilter(gray, 9, 75, 75)
            variants['bilateral'] = bilateral
            
            # Strategy 5: Original enhanced (baseline)
            _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            variants['original_otsu'] = otsu
            
            return variants
                
        except Exception as e:
            print(f"⚠️  Advanced preprocessing failed: {str(e)}", file=sys.stderr)
            print(f"   Falling back to basic PIL preprocessing", file=sys.stderr)
            return self._preprocess_basic_pil(image_path)
    
    def _preprocess_basic_pil(self, image_path):
        """Basic PIL preprocessing as fallback"""
        try:
            image = Image.open(image_path)
            
            # Convert to grayscale
            image = image.convert('L')
            
            # Increase contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            # Resize if needed
            max_size = 2048
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Convert back to numpy for consistency
            return {'basic_pil': np.array(image)}
        except Exception as e:
            print(f"⚠️  Basic preprocessing failed: {str(e)}", file=sys.stderr)
            return None
        
    def clean_ocr_text(self, text):
        """Post-process OCR text to remove noise and fix common issues"""
        if not text:
            return ""
        
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Remove excessive whitespace
            line = ' '.join(line.split())
            
            # Skip pure symbol/noise lines
            if len(line) < 2:
                continue
            if all(c in '=-_*#@!~`' for c in line.replace(' ', '')):
                continue
            
            # Fix common OCR artifacts
            line = line.replace(' ,', ',').replace(' .', '.')
            line = line.replace('  ', ' ')
            
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
        
    def extract_text_ocr(self, image_path):
        """Extract text using EasyOCR with multi-strategy preprocessing"""
        if not EASYOCR_AVAILABLE:
            print("OCR skipped: EasyOCR not installed", file=sys.stderr)
            return "", 0.0
            
        try:
            self.load_easyocr()
            
            print(f"📸 Preprocessing image with multiple strategies...", file=sys.stderr)
            preprocessed_variants = self.preprocess_image_advanced(image_path)
            
            if not preprocessed_variants:
                print("⚠️  Preprocessing failed, using original image", file=sys.stderr)
                preprocessed_variants = {'original': image_path}
            
            best_result = None
            best_confidence = 0
            best_strategy = None
            
            # Try each preprocessing strategy
            for strategy_name, processed_img in preprocessed_variants.items():
                print(f"  Testing strategy: {strategy_name}...", file=sys.stderr)
                
                try:
                    # Run EasyOCR with optimized parameters
                    if isinstance(processed_img, str):
                        # It's a file path
                        results = self.reader.readtext(
                            processed_img,
                            detail=1,
                            paragraph=False,
                            min_size=10,
                            text_threshold=0.7,
                            low_text=0.4,
                            link_threshold=0.4,
                            canvas_size=2560,
                            mag_ratio=1.0
                        )
                    else:
                        # It's a numpy array
                        results = self.reader.readtext(
                            processed_img,
                            detail=1,
                            paragraph=False,
                            min_size=10,
                            text_threshold=0.7,
                            low_text=0.4,
                            link_threshold=0.4,
                            canvas_size=2560,
                            mag_ratio=1.0
                        )
                    
                    # Sort results by vertical position (top to bottom)
                    results_sorted = sorted(results, key=lambda x: x[0][0][1])
                    
                    # Extract text with higher confidence threshold
                    text_parts = []
                    total_conf = 0
                    count_conf = 0
                    
                    for (bbox, text, prob) in results_sorted:
                        # Stricter confidence filter
                        if prob > 0.4:  # Increased from 0.3
                            text_parts.append(text)
                            total_conf += prob
                            count_conf += 1
                    
                    full_text = "\n".join(text_parts)
                    avg_conf = (total_conf / count_conf) if count_conf > 0 else 0.0
                    
                    print(f"    → Extracted {len(text_parts)} text blocks, confidence: {avg_conf*100:.1f}%", file=sys.stderr)
                    
                    # Keep track of best result
                    if avg_conf > best_confidence:
                        best_confidence = avg_conf
                        best_result = full_text
                        best_strategy = strategy_name
                        
                except Exception as strategy_error:
                    print(f"    ✗ Strategy {strategy_name} failed: {strategy_error}", file=sys.stderr)
                    continue
            
            if best_result:
                # Clean the text
                cleaned_text = self.clean_ocr_text(best_result)
                confidence_pct = best_confidence * 100
                
                print(f"✅ Best strategy: {best_strategy} (confidence: {confidence_pct:.1f}%)", file=sys.stderr)
                print(f"📝 Extracted {len(cleaned_text)} characters", file=sys.stderr)
                
                return cleaned_text, confidence_pct
            else:
                print("⚠️  All strategies failed", file=sys.stderr)
                return "", 0.0
            
        except Exception as e:
            print(f"OCR Error: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return "", 0.0
    
    def parse_event_details(self, ocr_text, blip_data, ocr_confidence=0.0):
        """Parse event details using SpaCy NER and Regex fallback"""
        # Load SpaCy if possible
        self.load_spacy_model()
        doc = self.nlp(ocr_text) if hasattr(self, 'nlp') and self.nlp else None
        
        event_data = {
            "title": "",
            "description": "",
            "category": "",
            "venue_name": "",
            "venue_address": "",
            "contact_email": "",
            "contact_phone": "",
            "entry_fee": "",
            "tags": [],
            "confidence": "medium"
        }
        
        lines = [line.strip() for line in ocr_text.split('\n') if line.strip()]
        
        # --- 0. Noise Reduction ---
        # Remove very short lines that assume to be OCR noise (e.g. "I", "::", "..")
        # But keep digits (could be dates/prices)
        clean_lines = []
        for line in lines:
            if len(line) > 2 or any(c.isdigit() for c in line):
                clean_lines.append(line)
        lines = clean_lines
        
        # --- 1. Title Extraction ---
        # Heuristic: Often the first line, OR the largest PROPN chunk in parsing
        if lines:
            event_data["title"] = lines[0] # Default fallback
            
        # Refined Title from SpaCy: Look for "EVENT" entities or just use the first line mostly
        # BLIP is actually better for title, but we disabled it.
        # If we have BLIP caption, use it if OCR failed
        if not event_data["title"] and blip_data.get("caption"):
            event_data["title"] = blip_data["caption"][:100]

        # --- 2. Entities Extraction (Date, Time, Venue, Org, Money) ---
        spacy_dates = []
        spacy_times = []
        spacy_locs = []
        spacy_orgs = []
        spacy_money = []
        
        if doc:
            print("="*50, file=sys.stderr)
            print("SpaCy ENTITIES Found:", file=sys.stderr)
            for ent in doc.ents:
                if ent.label_ in ["DATE", "TIME", "GPE", "FAC", "LOC", "ORG", "MONEY"]:
                    print(f"  - {ent.text} [{ent.label_}]", file=sys.stderr)
            print("="*50, file=sys.stderr)

            for ent in doc.ents:
                if ent.label_ == "DATE":
                    spacy_dates.append(ent.text)
                elif ent.label_ == "TIME":
                    spacy_times.append(ent.text)
                elif ent.label_ in ["GPE", "FAC", "LOC"]: # Location-like
                    spacy_locs.append(ent.text)
                elif ent.label_ == "ORG":
                    spacy_orgs.append(ent.text)
                elif ent.label_ == "MONEY":
                    spacy_money.append(ent.text)

        # --- 3. Date & Time ---
        # Fallback to regex if SpaCy fails, or combine them
        # Regex Date Patterns
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',  # DD/MM/YYYY
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',    # YYYY-MM-DD
            r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}',
            r'\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}'
        ]
        
        regex_dates = []
        for pattern in date_patterns:
            regex_dates.extend(re.findall(pattern, ocr_text, re.IGNORECASE))
            
        combined_dates = list(set(spacy_dates + regex_dates))
        
        # Regex Time Patterns
        time_patterns = [
            r'\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?',
            r'\d{1,2}\s*(?:AM|PM|am|pm)'
        ]
        regex_times = []
        for pattern in time_patterns:
            regex_times.extend(re.findall(pattern, ocr_text, re.IGNORECASE))
            
        combined_times = list(set(spacy_times + regex_times))

        # Build description
        desc_parts = []
        if combined_dates:
            desc_parts.append(f"Date: {', '.join(combined_dates[:2])}")
        if combined_times:
            desc_parts.append(f"Time: {', '.join(combined_times[:2])}")
        
        if desc_parts:
            event_data["description"] = " | ".join(desc_parts)

        # --- 4. Venue ---
        venue_found = False
        
        # 4a. Explicit Keyword Prefix (Best Confidence)
        venue_prefix_patterns = [
            r'(?:venue|location|place|where|address)\s*[:\-]?(.*)',
            r'\bat\b\s*(.*)'
        ]
        
        for i, line in enumerate(lines):
            for pattern in venue_prefix_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    content = match.group(1).strip()
                    # Filter noise: content must be at least 3 chars
                    if len(content) > 3: 
                        event_data["venue_name"] = content
                        venue_found = True
                        if i + 1 < len(lines):
                            event_data["venue_address"] = lines[i + 1]
                        break
            if venue_found: break

        # 4b. Known Venue Database (Fuzzy-ish Match)
        # If we didn't find "Venue:", look for lines containing known major venues
        if not venue_found:
            known_venues = [
                "bashundhara", "iccb", "convention", "center", "centre", "hall", 
                "auditorium", "stadium", "banquet", "club", "resort", "hotel", 
                "university", "campus", "buet", "du", "iut", "nsu", "brac", 
                "raowa", "senakunjo"
            ]
            
            for i, line in enumerate(lines):
                if i == 0: continue # Skip title
                
                line_lower = line.lower()
                # If line matches a known venue keyword
                if any(v in line_lower for v in known_venues):
                    # And isn't just a date or simple word
                    if len(line) > 5 and not any(c.isdigit() for c in line):
                        event_data["venue_name"] = line
                        venue_found = True
                        if i + 1 < len(lines):
                            event_data["venue_address"] = lines[i + 1]
                        break
        
        # 4c. SpaCy Fallback
        if not venue_found and spacy_locs:
            # Filter out country names usually (e.g. Bangladesh) if we have city
            valid_locs = [loc for loc in spacy_locs if loc.lower() not in ["bangladesh", "dhaka"]]
            if valid_locs:
                event_data["venue_name"] = valid_locs[0]
            elif spacy_locs:
                event_data["venue_name"] = spacy_locs[0]

        # --- 5. Contact (Email/Phone) - Regex is king here ---
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, ocr_text)
        if emails:
            event_data["contact_email"] = emails[0]
        
        phone_patterns = [
            r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}',
            r'01\d{9}'  # BD Mobile
        ]
        for pattern in phone_patterns:
            phones = re.findall(pattern, ocr_text)
            if phones:
                event_data["contact_phone"] = phones[0]
                break

        # --- 6. Entry Fee ---
        # Use SpaCy MONEY
        if spacy_money:
            event_data["entry_fee"] = spacy_money[0]
        else:
            # Fallback regex
            fee_pattern = r'(?:fee|price|cost|entry)[:\s]*(?:BDT|Tk|৳)?\s*(\d+)'
            fees = re.findall(fee_pattern, ocr_text, re.IGNORECASE)
            if fees:
                event_data["entry_fee"] = fees[0]
            elif re.search(r'\bfree\b', ocr_text, re.IGNORECASE):
                event_data["entry_fee"] = "0"
        
        # --- 7. Category & Tags ---
        category_keywords = {
            "workshop": ["workshop", "training", "seminar", "tutorial"],
            "seminar": ["seminar", "talk", "lecture", "presentation"],
            "competition": ["competition", "contest", "hackathon", "challenge"],
            "conference": ["conference", "summit", "symposium"],
            "cultural": ["cultural", "festival", "concert", "performance"],
            "sports": ["sports", "tournament", "match", "game"],
            "social": ["social", "meetup", "gathering", "networking"],
            "academic": ["academic", "research", "colloquium"]
        }
        
        text_lower = ocr_text.lower()
        for category, keywords in category_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                event_data["category"] = category
                event_data["tags"].append(category)
                break
                
        # --- 8. Confidence ---
        filled_fields = sum(1 for v in event_data.values() if v and v != [] and v != "medium")
        total_fields = len(event_data) - 1
        completeness_score = (filled_fields / total_fields) * 100
        ocr_score = ocr_confidence
        
        final_score = (completeness_score * 0.5) + (ocr_score * 0.5)
        
        if final_score > 70:
            event_data["confidence"] = "high"
        elif final_score > 40:
            event_data["confidence"] = "medium"
        else:
            event_data["confidence"] = "low"
        
        return event_data

    def validate_and_normalize_event_data(self, event_data):
        """Validate and normalize event data from LLaVA"""
        # Ensure all required fields exist
        required_fields = [
            "title", "description", "category", "venue_name", "venue_address",
            "contact_email", "contact_phone", "entry_fee", "tags"
        ]
        
        for field in required_fields:
            if field not in event_data:
                event_data[field] = "" if field != "tags" else []
        
        # Normalize tags to array
        if isinstance(event_data.get("tags"), str):
            event_data["tags"] = [event_data["tags"]] if event_data["tags"] else []
        
        # Parse and validate dates
        for date_field in ["event_date", "registration_deadline"]:
            if date_field in event_data and event_data[date_field]:
                # Try to parse and format date to YYYY-MM-DD
                try:
                    from dateutil import parser as date_parser
                    parsed_date = date_parser.parse(event_data[date_field])
                    event_data[date_field] = parsed_date.strftime("%Y-%m-%d")
                except:
                    pass  # Keep original if parsing fails
        
        # Calculate confidence based on field completeness
        filled_fields = sum(1 for v in event_data.values() if v and v != [] and v != "confidence")
        completeness = (filled_fields / len(required_fields)) * 100
        
        if completeness > 70:
            event_data["confidence"] = "high"
        elif completeness > 40:
            event_data["confidence"] = "medium"
        else:
            event_data["confidence"] = "low"
        
        return event_data

    def analyze_with_ollama(self, image_path):
        """Analyze image using EasyOCR + Ollama text-LLM (hybrid approach)"""
        try:
            import ollama
        except ImportError:
            print("⚠️ Ollama package not installed. Run: pip install ollama", file=sys.stderr)
            return None
        
        print(f"🧠 Analyzing with EasyOCR + Ollama hybrid approach...", file=sys.stderr)
        
        try:
            # Check if Ollama is running
            try:
                available_models = ollama.list()
                print(f"✅ Ollama is running. Found {len(available_models.get('models', []))} models.", file=sys.stderr)
            except Exception as conn_error:
                print(f"⚠️ Cannot connect to Ollama. Is it running? Error: {conn_error}", file=sys.stderr)
                return None
            
            # STEP 1: Use EasyOCR to extract text (precise, no hallucination)
            print("📝 Step 1: Extracting text with EasyOCR...", file=sys.stderr)
            ocr_text, ocr_conf = self.extract_text_ocr(image_path)
            
            if not ocr_text or len(ocr_text.strip()) < 10:
                print("⚠️ EasyOCR extracted very little text. Cannot proceed.", file=sys.stderr)
                return None
            
            print(f"✅ EasyOCR extracted {len(ocr_text)} characters (confidence: {ocr_conf:.1f}%)", file=sys.stderr)
            print(f"📄 OCR Text preview:\n{ocr_text[:300]}...\n", file=sys.stderr)
            
            # STEP 2: Use text-only Llama to structure the OCR text
            print("🔍 Step 2: Structuring text with Llama...", file=sys.stderr)
            
            # Auto-detect available model - prefer text-only Llama, but can use LLaVA for structuring
            models = available_models.get('models', [])
            print(f"🔍 DEBUG: Found {len(models)} models in Ollama", file=sys.stderr)
            if models:
                print(f"🔍 DEBUG: First model structure: {models[0]}", file=sys.stderr)
            
            MODEL_NAME = None
            
            # Try to find models in order of preference
            model_preferences = ["llama3.2", "llama3.1", "llama3", "llama2", "llava"]
            for pref in model_preferences:
                for model in models:
                    # Handle both dict with 'name' key and object with 'model' attribute
                    if isinstance(model, dict):
                        model_name = model.get('name', model.get('model', ''))
                    elif hasattr(model, 'model'):
                        model_name = model.model  # Access attribute directly
                    elif hasattr(model, 'name'):
                        model_name = model.name
                    else:
                        model_name = str(model)
                    
                    if pref in model_name.lower():
                        MODEL_NAME = model_name
                        print(f"✅ Selected model: {MODEL_NAME} (matched preference: {pref})", file=sys.stderr)
                        break
                if MODEL_NAME:
                    break
            
            # Fallback to first available model
            if not MODEL_NAME and models:
                first_model = models[0]
                if isinstance(first_model, dict):
                    MODEL_NAME = first_model.get('name', first_model.get('model', ''))
                elif hasattr(first_model, 'model'):
                    MODEL_NAME = first_model.model
                elif hasattr(first_model, 'name'):
                    MODEL_NAME = first_model.name
                else:
                    MODEL_NAME = str(first_model)
                print(f"⚠️ Using first available model: {MODEL_NAME}", file=sys.stderr)
            
            if not MODEL_NAME:
                print("⚠️ No models found in Ollama!", file=sys.stderr)
                return None
            
            prompt = f"""You are analyzing text extracted from an event banner using OCR.

OCR EXTRACTED TEXT:
{ocr_text}

Extract structured event information from this text and return a JSON object.

Required fields:
- title: Main event name/title (usually first major text)
- description: Brief description if present
- category: ONE of: workshop, seminar, competition, conference, cultural, sports, social, academic
- venue_name: Exact venue/location name (look for keywords like "venue:", "at", "centre", "hall", etc.)
- venue_address: Full address if present
- event_date: Date in YYYY-MM-DD format (convert "28 December 2025" to "2025-12-28")
- event_time: Time in HH:MM 24-hour format
- registration_deadline: Deadline in YYYY-MM-DD format if mentioned
- contact_email: Email address if present
- contact_phone: Phone number if present
- entry_fee: Fee amount, or "0" if free or not mentioned
- organizer: Organizing institution/company (look for university names, company names)
- tags: Array of relevant keywords

IMPORTANT:
- Use empty string "" for missing fields ([] for tags)
- For dates, read the YEAR very carefully from the OCR text
- Don't make up information - only extract what's in the OCR text
- Look for common patterns: "Venue: X", "Date: Y", "Time: Z"

Return ONLY valid JSON."""

            response = ollama.chat(
                model=MODEL_NAME,
                messages=[{
                    'role': 'user',
                    'content': prompt,
                }],
                format='json',
                options={
                    'temperature': 0.1,
                }
            )
            
            response_text = response['message']['content']
            print("✅ Llama structuring complete!", file=sys.stderr)
            print(f"📄 Raw response (first 200 chars): {response_text[:200]}...", file=sys.stderr)
            
            # Parse JSON response
            try:
                event_data = json.loads(response_text)
                # Validate and normalize
                event_data = self.validate_and_normalize_event_data(event_data)
                print(f"✨ Extracted {len([v for v in event_data.values() if v and v != []])} fields", file=sys.stderr)
                return event_data
                
            except json.JSONDecodeError as json_err:
                print(f"⚠️ Llama produced invalid JSON: {json_err}", file=sys.stderr)
                print(f"Response was: {response_text[:500]}", file=sys.stderr)
                return None
                
        except Exception as e:
            print(f"⚠️ Hybrid Analysis Error: {str(e)}", file=sys.stderr)
            print(f"🔍 DEBUG: Error type: {type(e).__name__}", file=sys.stderr)
            print(f"🔍 DEBUG: Error details: {repr(e)}", file=sys.stderr)
            import traceback
            print("🔍 DEBUG: Full traceback:", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return None


    def analyze(self, image_path):
        """Main analysis function"""
        print(f"Analyzing image: {image_path}", file=sys.stderr)
        
        # --- STRATEGY 1: Try Hybrid OCR + Llama Approach ---
        hybrid_result = self.analyze_with_ollama(image_path)
        if hybrid_result:
             print("✨ Used hybrid EasyOCR + Llama for analysis", file=sys.stderr)
             return {
                "success": True,
                "event_data": hybrid_result,
                "debug_info": {"method": "easyocr_llama_hybrid"}
             }
        
        # --- STRATEGY 2: Fallback to EasyOCR + SpaCy ---
        print("⚠️ LLaVA failed or not available. Falling back to OCR...", file=sys.stderr)
        
        # Extract text with OCR
        print("Running OCR...", file=sys.stderr)
        ocr_text, ocr_conf = self.extract_text_ocr(image_path)
        print(f"✅ OCR Complete! Extracted {len(ocr_text)} characters. Confidence: {ocr_conf:.2f}%", file=sys.stderr)
        print("="*50, file=sys.stderr)
        print("OCR OUTPUT:", file=sys.stderr)
        print(ocr_text[:1000] if ocr_text else "No text found", file=sys.stderr)
        print("="*50, file=sys.stderr)
        
        # Understand image with BLIP (COMMENTED OUT FOR NOW - OCR ONLY)
        # print("Running BLIP analysis...", file=sys.stderr)
        # blip_data = self.understand_image(image_path)
        # print("✅ BLIP Complete!", file=sys.stderr)
        # print("="*50, file=sys.stderr)
        # print("BLIP CAPTION:", file=sys.stderr)
        # print(blip_data.get("caption", "N/A"), file=sys.stderr)
        # print("="*50, file=sys.stderr)
        
        # Use empty BLIP data for now (OCR only mode)
        blip_data = {"caption": "", "qa": {}}
        
        # Parse event details
        print("Parsing event details...", file=sys.stderr)
        event_data = self.parse_event_details(ocr_text, blip_data, ocr_conf)
        
        # Add raw data for debugging
        result = {
            "success": True,
            "event_data": event_data,
            "raw_ocr_text": ocr_text[:1000],  # First 1000 chars
            "blip_caption": blip_data.get("caption", ""),
            "blip_qa": blip_data.get("qa", {}),
            "debug_info": {
                "ocr_length": len(ocr_text),
                "ocr_confidence": ocr_conf,
                "device_used": self.device,
                "easyocr_available": EASYOCR_AVAILABLE
            }
        }
        
        return result

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "No image path provided"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({"success": False, "error": f"Image not found: {image_path}"}))
        sys.exit(1)
    
    try:
        analyzer = BannerAnalyzer()
        result = analyzer.analyze(image_path)
        print(json.dumps(result))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
