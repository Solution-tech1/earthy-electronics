import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

fpath = r"e:\earthyelectronics\backend\all products files\HAIER JUNE-26 MRP.pdf"

print("==================================================")
print("INSPECTING HAIER JUNE-26 MRP.PDF")
print("==================================================")

try:
    import pypdf
    reader = pypdf.PdfReader(fpath)
    print(f"Total Pages: {len(reader.pages)}")
    full_text = ""
    for i, page in enumerate(reader.pages):
        t = page.extract_text() or ""
        print(f"\n--- PAGE {i+1} SAMPLE (First 400 chars) ---")
        print(t[:400])
        full_text += t + "\n"
    
    with open(r"e:\earthyelectronics\backend\haier_pdf_text.txt", "w", encoding="utf-8") as f:
        f.write(full_text)
    print("\nText extracted to haier_pdf_text.txt")
except Exception as e1:
    print(f"pypdf failed: {e1}")
    try:
        import fitz # PyMuPDF
        doc = fitz.open(fpath)
        print(f"Total Pages: {len(doc)}")
        full_text = ""
        for i, page in enumerate(doc):
            t = page.get_text()
            print(f"\n--- PAGE {i+1} SAMPLE (First 400 chars) ---")
            print(t[:400])
            full_text += t + "\n"
        with open(r"e:\earthyelectronics\backend\haier_pdf_text.txt", "w", encoding="utf-8") as f:
            f.write(full_text)
        print("\nText extracted to haier_pdf_text.txt via PyMuPDF")
    except Exception as e2:
        print(f"fitz failed: {e2}")
        try:
            with open(fpath, "rb") as f:
                content = f.read().decode("latin1", errors="ignore")
            import re
            strings = re.findall(r"\(([^\(\)]{3,100})\)", content)
            print(f"Extracted {len(strings)} raw text strings from PDF stream.")
            print("Sample raw text strings:")
            for s in strings[:30]:
                print("  ", s)
        except Exception as e3:
            print(f"Raw extraction error: {e3}")

print("==================================================")
