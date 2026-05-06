import os
import sys
import json
from paddleocr import PaddleOCR
import pdf2image

class ResearchPDFScraper:
    def __init__(self, lang='en'):
        # Initialize PaddleOCR
        # Repository: https://github.com/PaddlePaddle/PaddleOCR.git
        self.ocr = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)

    def scrape_pdf(self, pdf_path):
        """
        Convert PDF to images and extract text using PaddleOCR for biomechanical form training.
        """
        # Convert PDF pages to images
        images = pdf2image.convert_from_path(pdf_path)
        full_text = ""
        
        for i, img in enumerate(images):
            # Save temporary image for OCR
            temp_path = f"temp_page_{i}.jpg"
            img.save(temp_path, 'JPEG')
            
            # Run OCR on the image
            result = self.ocr.ocr(temp_path, cls=True)
            for idx in range(len(result)):
                res = result[idx]
                if res:
                    for line in res:
                        text = line[1][0]
                        full_text += text + "\\n"
            
            # Cleanup
            os.remove(temp_path)
            
        return full_text

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        try:
            scraper = ResearchPDFScraper()
            text = scraper.scrape_pdf(pdf_path)
            print(json.dumps({"text": text}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(json.dumps({"error": "No PDF path provided"}))
