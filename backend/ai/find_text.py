"""
Find text in OCRResult - try all possible text fields
"""
from paddleocr import PaddleOCR
import json

ocr = PaddleOCR(use_angle_cls=True, lang='en')
results = ocr.ocr(r"C:\Users\nakib\Downloads\img_8.jpg")

print("Finding text in OCRResult...")
print("=" * 60)

if results and len(results) > 0:
    ocr_result = results[0]
    
    # Print ALL keys and their types
    if hasattr(ocr_result, 'keys'):
        print("\nAll keys and value types:")
        for key in ocr_result.keys():
            val = ocr_result[key]
            print(f"  {key}: {type(val).__name__}")
    
    # Convert to dict and print JSON (limited)
    try:
        result_dict = dict(ocr_result)
        # Remove large arrays for readability
        simple_dict = {}
        for k, v in result_dict.items():
            if isinstance(v, (str, int, float, bool)):
                simple_dict[k] = v
            elif isinstance(v, (list, tuple)) and len(v) < 100:
                simple_dict[k] = str(v)[:200]
            else:
                simple_dict[k] = f"<{type(v).__name__} object>"
        
        print("\nSimplified result:")
        print(json.dumps(simple_dict, indent=2))
    except Exception as e:
        print(f"Could not convert to dict: {e}")
    
    # The text might be in a nested structure - check common PaddleOCR patterns
    print("\nChecking for text in nested structures...")
    
    # Pattern 1: Check if result is iterable with (box, text) pairs
    try:
        if hasattr(ocr_result, '__iter__'):
            print(f"Result is iterable, length: {len(ocr_result) if hasattr(ocr_result, '__len__') else 'unknown'}")
    except:
        pass
