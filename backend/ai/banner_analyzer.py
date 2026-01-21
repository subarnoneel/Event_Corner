import sys
import json
import os
from datetime import datetime
import re
from PIL import Image, ImageEnhance, ImageFilter
import torch
# Transformers imported lazily in load_blip_model to speed up startup

# Try to import pytesseract, but make it optional
try:
    import pytesseract
    # Set tesseract path for Windows
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("Warning: pytesseract not available, OCR disabled", file=sys.stderr)

class BannerAnalyzer:
    def __init__(self):
        """Initialize analyzer - BLIP loads lazily when needed"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = None
        self.model = None
        self.model_loaded = False
        
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

    def preprocess_image(self, image):
        """Preprocess image for better OCR accuracy"""
        try:
            # Convert to grayscale
            image = image.convert('L')
            
            # Increase contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            # Resize - scaling up helps with small text
            # Calculate new size maintaining aspect ratio
            width, height = image.size
            new_width = width * 2
            new_height = height * 2
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Apply slight sharpening
            image = image.filter(ImageFilter.SHARPEN)
            
            return image
        except Exception as e:
            print(f"Preprocessing Warning: {str(e)}", file=sys.stderr)
            return image
        
    def extract_text_ocr(self, image_path):
        """Extract text using OCR with confidence scoring"""
        if not TESSERACT_AVAILABLE:
            print("OCR skipped: Tesseract not installed", file=sys.stderr)
            return "", 0.0
            
        try:
            image = Image.open(image_path)
            
            # Preprocess image
            processed_image = self.preprocess_image(image)
            
            # Get data including confidence
            # image_to_data returns a dict with keys: 'level', 'page_num', 'block_num', 'par_num', 'line_num', 'word_num', 'left', 'top', 'width', 'height', 'conf', 'text'
            data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
            
            text_parts = []
            total_conf = 0
            count_conf = 0
            
            num_boxes = len(data['text'])
            for i in range(num_boxes):
                # Check for valid confidence (non-negative) and actual text
                if int(data['conf'][i]) > -1:
                    text_content = data['text'][i].strip()
                    if text_content:
                        text_parts.append(text_content)
                        total_conf += float(data['conf'][i])
                        count_conf += 1
            
            # Reconstruct text (simple join) - for parsing we often want lines preserved
            # So let's do a simple full string extraction for parsing as well, but use 'data' for confidence
            # Actually, let's stick to the simpler image_to_string for the full text to preserve layout better,
            # and use data just for stats, OR use image_to_string completely if we trust it more.
            # But let's verify if image_to_string on processed image is better.
            
            full_text = pytesseract.image_to_string(processed_image)
            
            avg_conf = (total_conf / count_conf) if count_conf > 0 else 0.0
            
            return full_text, avg_conf
            
        except Exception as e:
            print(f"OCR Error: {str(e)}", file=sys.stderr)
            return "", 0.0
    
    def understand_image(self, image_path):
        """Use BLIP to understand image context"""
        # Load model if not already loaded
        self.load_blip_model()
        
        try:
            image = Image.open(image_path).convert('RGB')
            
            # Generate caption
            inputs = self.processor(image, return_tensors="pt").to(self.device)
            out = self.model.generate(**inputs, max_length=100)
            caption = self.processor.decode(out[0], skip_special_tokens=True)
            
            # Ask specific questions about the image
            questions = [
                "What is the title of this event?",
                "When is this event happening?",
                "Where is this event taking place?",
                "What type of event is this?"
            ]
            
            answers = {}
            for question in questions:
                inputs = self.processor(image, question, return_tensors="pt").to(self.device)
                out = self.model.generate(**inputs, max_length=50)
                answer = self.processor.decode(out[0], skip_special_tokens=True)
                answers[question] = answer
            
            return {
                "caption": caption,
                "qa": answers
            }
        except Exception as e:
            print(f"BLIP Error: {str(e)}", file=sys.stderr)
            return {"caption": "", "qa": {}}
    
    def parse_event_details(self, ocr_text, blip_data, ocr_confidence=0.0):
        """Parse event details from OCR text and BLIP understanding"""
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
        
        # Extract title (usually first line or largest text)
        lines = [line.strip() for line in ocr_text.split('\n') if line.strip()]
        if lines:
            # First non-empty line is often the title
            event_data["title"] = lines[0]
        
        # Try to get title from BLIP if OCR failed
        if not event_data["title"] and blip_data.get("caption"):
            event_data["title"] = blip_data["caption"][:100]
        
        # Extract dates (various formats)
        date_patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',  # DD/MM/YYYY or MM/DD/YYYY
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',    # YYYY-MM-DD
            r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}',  # Month DD, YYYY
            r'\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}'  # DD Month YYYY
        ]
        
        dates_found = []
        for pattern in date_patterns:
            dates_found.extend(re.findall(pattern, ocr_text, re.IGNORECASE))
        
        # Extract times
        time_patterns = [
            r'\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)',
            r'\d{1,2}\s*(?:AM|PM|am|pm)'
        ]
        
        times_found = []
        for pattern in time_patterns:
            times_found.extend(re.findall(pattern, ocr_text, re.IGNORECASE))
        
        # Build description from dates and times found
        if dates_found or times_found:
            desc_parts = []
            if dates_found:
                desc_parts.append(f"Date: {', '.join(dates_found[:2])}")
            if times_found:
                desc_parts.append(f"Time: {', '.join(times_found[:2])}")
            event_data["description"] = " | ".join(desc_parts)
        
        # Extract email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, ocr_text)
        if emails:
            event_data["contact_email"] = emails[0]
        
        # Extract phone numbers (various formats)
        phone_patterns = [
            r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}',  # International/US format
            r'\+88\d{11}',  # Bangladesh format
            r'01\d{9}'  # Bangladesh mobile
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, ocr_text)
            if phones:
                event_data["contact_phone"] = phones[0]
                break
        
        # Extract venue/location
        location_keywords = ['venue', 'location', 'at', 'hall', 'auditorium', 'room', 'building']
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in location_keywords):
                # Next line might be the venue name
                if i + 1 < len(lines):
                    event_data["venue_name"] = lines[i + 1]
                    if i + 2 < len(lines):
                        event_data["venue_address"] = lines[i + 2]
                break
        
        # Determine category from keywords
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
        
        # Extract entry fee
        fee_pattern = r'(?:fee|price|cost|entry)[:\s]*(?:BDT|Tk|৳)?\s*(\d+)'
        fees = re.findall(fee_pattern, ocr_text, re.IGNORECASE)
        if fees:
            event_data["entry_fee"] = fees[0]
        elif re.search(r'\bfree\b', ocr_text, re.IGNORECASE):
            event_data["entry_fee"] = "0"
        
        # Extract additional tags
        common_tags = ['workshop', 'online', 'offline', 'hybrid', 'certificate', 'networking']
        for tag in common_tags:
            if tag in text_lower and tag not in event_data["tags"]:
                event_data["tags"].append(tag)
        
        # Use BLIP answers to fill missing data
        qa = blip_data.get("qa", {})
        if not event_data["title"] and "What is the title of this event?" in qa:
            event_data["title"] = qa["What is the title of this event?"]
        
        if not event_data["venue_name"] and "Where is this event taking place?" in qa:
            event_data["venue_name"] = qa["Where is this event taking place?"]
        
        if not event_data["category"] and "What type of event is this?" in qa:
            event_type = qa["What type of event is this?"].lower()
            for category in category_keywords.keys():
                if category in event_type:
                    event_data["category"] = category
                    break
        
        # Calculate confidence
        # Hybrid score: 50% from OCR confidence, 50% from field completeness
        
        filled_fields = sum(1 for v in event_data.values() if v and v != [] and v != "medium")
        total_fields = len(event_data) - 1  # Exclude confidence field
        completeness_score = (filled_fields / total_fields) * 100
        
        # Normalize OCR confidence (it comes as 0-100)
        ocr_score = ocr_confidence
        
        final_score = (completeness_score * 0.5) + (ocr_score * 0.5)
        
        if final_score > 70:
            event_data["confidence"] = "high"
        elif final_score > 40:
            event_data["confidence"] = "medium"
        else:
            event_data["confidence"] = "low"
        
        return event_data

    def analyze(self, image_path):
        """Main analysis function"""
        print(f"Analyzing image: {image_path}", file=sys.stderr)
        
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
                "tesseract_available": TESSERACT_AVAILABLE
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
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
