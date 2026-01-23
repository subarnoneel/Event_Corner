"""
Extract text from PaddleOCR OCRResult object
"""
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True, lang='en')
result = ocr.ocr(r"C:\Users\nakib\Downloads\img_8.jpg")

print("Testing OCRResult extraction...")
print("=" * 60)

if result and len(result) > 0:
    ocr_result = result[0]
    print(f"\nOCRResult type: {type(ocr_result)}")
    print(f"OCRResult dir: {[attr for attr in dir(ocr_result) if not attr.startswith('_')]}")
    
    # Try common attributes
    for attr in ['text', 'texts', 'boxes', 'scores', 'rec_text', 'dt_polys', 'rec_score']:
        if hasattr(ocr_result, attr):
            val = getattr(ocr_result, attr)
            print(f"\n{attr}: {type(val)}")
            if isinstance(val, (list, tuple)) and len(val) > 0:
                print(f"  Length: {len(val)}")
                print(f"  First few: {val[:3]}")
            elif isinstance(val, str):
                print(f"  Value: {val[:200]}")
    
    # Try to call it as a dict
    try:
        print(f"\nTrying dict access...")
        print(f"  Keys: {ocr_result.keys() if hasattr(ocr_result, 'keys') else 'no keys method'}")
    except:
        pass
    
    # Try str() representation
    print(f"\nString representation (first 500 chars):")
    print(str(ocr_result)[:500])

print("\n" + "=" * 60)
