import sys
import os
from PIL import Image, ImageDraw, ImageFont
import json

# Add current directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from banner_analyzer import BannerAnalyzer

def create_test_image(filename="test_banner_complex.png"):
    """Create a simple image with text for testing"""
    # Create white image
    img = Image.new('RGB', (800, 400), color='white')
    d = ImageDraw.Draw(img)
    
    # Add text
    try:
        font_large = ImageFont.truetype("arial.ttf", 40)
        font_small = ImageFont.truetype("arial.ttf", 20)
    except IOError:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
        
    d.text((50, 50), "Python Workshop 2024", fill='black', font=font_large)
    d.text((50, 120), "Date: 15/05/2024", fill='black', font=font_small)
    d.text((50, 150), "Time: 10:00 AM", fill='black', font=font_small)
    d.text((50, 180), "Venue: Virtual Meeting Room", fill='black', font=font_small)
    d.text((50, 210), "Contact: test@example.com", fill='black', font=font_small)
    
    img.save(filename)
    print(f"Created test image: {filename}")
    return filename

def test_analyzer():
    # Create image
    image_path = create_test_image()
    abs_path = os.path.abspath(image_path)
    
    print("-" * 50)
    print("Running Analyzer with EasyOCR...")
    analyzer = BannerAnalyzer()
    
    # Run analysis
    result = analyzer.analyze(abs_path)
    
    print("-" * 50)
    print("Test Results:")
    print(f"Success: {result['success']}")
    if result['success']:
        data = result['event_data']
        print(f"Title: {data['title']}")
        print(f"Date/Time: {data['description']}")
        print(f"Email: {data['contact_email']}")
        print(f"Confidence Level: {data['confidence']}")
        try:
             print(f"OCR Confidence Score: {result['debug_info']['ocr_confidence']:.2f}%")
        except:
             print("OCR Confidence Score: N/A")
        
    # Cleanup
    if os.path.exists(image_path):
        os.remove(image_path)

if __name__ == "__main__":
    test_analyzer()
