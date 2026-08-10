import pypdf, json, os, re

fpath = r"e:\earthyelectronics\backend\all products files\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

items = []
# Page 1 contains Refrigerators
page1_text = reader.pages[0].extract_text() or ""
lines = page1_text.split('\n')

for line in lines:
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line:
        continue
    # Match lines like: 1 HR-66 B 28,390 5,110 33,500 or 3 HRF-186 EBS/EBD 45,763 8,237 54,000
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        sr = parts[0]
        # MRP is last element
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            # Model is everything between sr and price numbers
            model = " ".join(parts[1:-3])
            items.append({
                "sr": sr,
                "model": model,
                "mrp": mrp,
                "category": "Refrigerators"
            })

with open(r"e:\earthyelectronics\backend\haier_refrigerators_parsed.json", "w", encoding="utf-8") as f:
    json.dump(items, f, indent=2)
