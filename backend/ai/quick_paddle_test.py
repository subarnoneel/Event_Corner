"""Simple test to get actual text from PaddleOCR"""
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True, lang='en')
results = ocr.ocr(r"C:\Users\nakib\Downloads\img_8.jpg")

print("Extracting text from PaddleOCR...")
if results and len(results) > 0:
    ocr_result = results[0]
    
    # It's a dict - print all keys
    if hasattr(ocr_result, 'keys'):
        print(f"Keys: {list(ocr_result.keys())}")
        
        # Try to access 'rec_text' or similar
        for key in ocr_result.keys():
            if 'text' in key.lower() or 'rec' in key.lower():
                print(f"\n{key}: {ocr_result[key]}")
    
    # Also try just printing it
    print(f"\nString representation:\n{str(ocr_result)}")
