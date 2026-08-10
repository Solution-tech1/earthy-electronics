import os
import sys
import pypdf

sys.stdout.reconfigure(encoding='utf-8')

fpath = r"e:\earthyelectronics\backend\all products files\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

print("==================================================")
print("📊 DETAILED ANALYSIS OF 'HAIER JUNE-26 MRP.pdf'")
print("==================================================")

page_summary = []

for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    page_summary.append({
        'page': i + 1,
        'line_count': len(lines),
        'sample_lines': lines[:8]
    })

print(f"Total Pages in PDF: {len(reader.pages)}\n")

for p in page_summary:
    print(f"📄 PAGE {p['page']} (Lines: {p['line_count']}):")
    for l in p['sample_lines']:
        print(f"   {l}")
    print()

print("==================================================")
