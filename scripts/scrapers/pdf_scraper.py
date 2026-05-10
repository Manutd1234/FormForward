import sys
import json
from paddleocr import PaddleOCR
import numpy as np
import pypdfium2 as pdfium

class ResearchPDFScraper:
    def __init__(self, lang='en'):
        # Initialize PaddleOCR
        # Repository: https://github.com/PaddlePaddle/PaddleOCR.git
        self.ocr = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)

    def scrape_pdf(self, pdf_path):
        """
        Convert PDF to images and extract text using PaddleOCR for biomechanical form training.
        """
        # Convert PDF pages to images with pdfium to avoid external poppler dependency.
        pdf = pdfium.PdfDocument(pdf_path)
        full_text = ""

        for i in range(len(pdf)):
            page = pdf[i]
            bitmap = page.render(scale=2.0)
            image = bitmap.to_pil()
            image_np = np.array(image)

            # Run OCR on rendered page image.
            result = self.ocr.ocr(image_np, cls=True)
            for idx in range(len(result)):
                res = result[idx]
                if res:
                    for line in res:
                        text = line[1][0]
                        full_text += text + "\\n"

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
