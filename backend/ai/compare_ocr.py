"""
OCR Backend Comparison: EasyOCR vs PaddleOCR
Usage: python compare_ocr.py <image_path>
"""
import sys
import time
from banner_analyzer import BannerAnalyzer

def test_comparison(image_path):
    print("\n" + "="*60)
    print("OCR BACKEND COMPARISON")
    print("="*60)
    print(f"\nImage: {image_path}\n")
    
    # Test EasyOCR
    print("\n" + "─"*60)
    print("Testing EasyOCR")
    print("─"*60)
    analyzer_easy = BannerAnalyzer(ocr_backend='easy')
    start = time.time()
    text_easy, conf_easy = analyzer_easy.extract_text_ocr(image_path)
    time_easy = time.time() - start
    
    # Test PaddleOCR
    print("\n" + "─"*60)
    print("Testing PaddleOCR")
    print("─"*60)
    analyzer_paddle = BannerAnalyzer(ocr_backend='paddle')
    start = time.time()
    text_paddle, conf_paddle = analyzer_paddle.extract_text_paddle(image_path)
    time_paddle = time.time() - start
    
    # Results
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)
    
    print(f"\n{'Backend':<15} | {'Time':<8} | {'Confidence':<12} | {'Characters'}")
    print("-"*60)
    print(f"{'EasyOCR':<15} | {time_easy:<8.2f}s | {conf_easy:<12.1f}% | {len(text_easy)}")
    print(f"{'PaddleOCR':<15} | {time_paddle:<8.2f}s | {conf_paddle:<12.1f}% | {len(text_paddle)}")
    
    # Winner
    if time_paddle < time_easy and conf_paddle >= conf_easy - 5:
        print(f"\n🏆 Winner: PaddleOCR (faster, similar accuracy)")
    elif conf_easy > conf_paddle + 5:
        print(f"\n🏆 Winner: EasyOCR (more accurate)")
    else:
        print(f"\n🤝 Both are comparable")
    
    # Show text samples
    print("\n" + "="*60)
    print("TEXT SAMPLES (first 200 chars)")
    print("="*60)
    print(f"\nEasyOCR:\n{text_easy[:200]}")
    print(f"\nPaddleOCR:\n{text_paddle[:200]}")
    print("\n" + "="*60)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python compare_ocr.py <image_path>")
        sys.exit(1)
    
    test_comparison(sys.argv[1])
