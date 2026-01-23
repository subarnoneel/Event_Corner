"""
Quick test of improved OCR on a banner image
Usage: python test_improved_ocr.py <path_to_banner_image>
"""
import sys
from banner_analyzer import BannerAnalyzer

def test_ocr(image_path):
    print("="*60)
    print("TESTING IMPROVED OCR")
    print("="*60)
    print(f"\nImage: {image_path}\n")
    
    analyzer = BannerAnalyzer()
    
    # Extract text with new improved OCR
    ocr_text, confidence = analyzer.extract_text_ocr(image_path)
    
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)
    print(f"\nConfidence: {confidence:.1f}%")
    print(f"Characters extracted: {len(ocr_text)}")
    print(f"\nExtracted Text:")
    print("-"*60)
    print(ocr_text)
    print("-"*60)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_improved_ocr.py <image_path>")
        sys.exit(1)
    
    test_ocr(sys.argv[1])
