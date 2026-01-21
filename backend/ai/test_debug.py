print("Starting imports...")
import sys
print("Importing sys done")
import os
print("Importing os done")
from PIL import Image, ImageEnhance, ImageFilter
print("Importing PIL done")
try:
    import pytesseract
    print("Importing pytesseract done")
except ImportError:
    print("pytesseract not found")

print("Importing torch...")
import torch
print("Importing torch done")

print("Importing transformers...")
from transformers import BlipProcessor, BlipForConditionalGeneration
print("Importing transformers done")
