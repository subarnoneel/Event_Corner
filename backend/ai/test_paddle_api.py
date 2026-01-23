"""
Minimal PaddleOCR example to understand correct API
Based on deprecation warning: use predict() instead of ocr()
"""
from paddleocr import PaddleOCR
import sys

print("Testing PaddleOCR API...")
print("=" * 60)

# Initialize PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en')

# Test image
image_path = r"C:\Users\nakib\Downloads\img_8.jpg"

# Try the deprecated .ocr() method to see structure
print("\n1. Testing .ocr() method (deprecated):")
print("-" * 60)
try:
    result = ocr.ocr(image_path)
    print(f"Type: {type(result)}")
    print(f"Keys: {result.keys() if isinstance(result, dict) else 'not a dict'}")
    if isinstance(result, list) and result:
        print(f"List length: {len(result)}")
        if result[0]:
            print(f"First item type: {type(result[0])}")
except Exception as e:
    print(f"Error: {e}")

# Try the newer .predict() method
print("\n\n2. Testing .predict() method (recommended):")
print("-" * 60)
try:
    result = ocr.predict(image_path)
    print(f"Type: {type(result)}")
    
    if isinstance(result, dict):
        print(f"\nDict keys: {list(result.keys())}")
        
        # Check for text-related keys
        for key in ['rec_text', 'text', 'texts', 'ocr_text', 'dt_polys', 'rec_score']:
            if key in result:
                print(f"\n'{key}' found:")
                print(f"  Type: {type(result[key])}")
                print(f"  Value: {result[key][:200] if isinstance(result[key], (str, list)) else result[key]}")
                
    print("\n\nFull result (first 1000 chars):")
    print(str(result)[:1000])
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
