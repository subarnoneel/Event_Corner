"""Extract text and confidence from PaddleOCR"""
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True, lang='en')
results = ocr.ocr(r"C:\Users\nakib\Downloads\img_8.jpg")

if results and len(results) > 0:
    ocr_result = results[0]
    
    # Get the texts
    if 'rec_texts' in ocr_result:
        texts = ocr_result['rec_texts']
        print(f"Texts ({len(texts)} items):")
        for i, text in enumerate(texts[:10]):  # First 10
            print(f"  {i+1}. {text}")
    
    # Look for scores/confidence
    print(f"\nLooking for confidence scores...")
    for key in ocr_result.keys():
        if 'score' in key.lower() or 'conf' in key.lower():
            print(f"  {key}: {type(ocr_result[key])}")
            val = ocr_result[key]
            if hasattr(val, '__iter__') and not isinstance(val, str):
                try:
                    print(f"    First few: {list(val)[:5]}")
                except:
                    pass
