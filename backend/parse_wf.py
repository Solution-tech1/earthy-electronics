import pypdf, json, os

fpath = r"e:\earthyelectronics\backend\all products files\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

# Washers: Page 3
washers = []
p3_text = reader.pages[2].extract_text() or ""
for line in p3_text.split('\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Division' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            model = " ".join(parts[1:-3])
            washers.append({"sr": parts[0], "model": model, "mrp": mrp, "category": "Washing Machines"})

# Freezers: Page 4
freezers = []
p4_text = reader.pages[3].extract_text() or ""
for line in p4_text.split('\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Division' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            model = " ".join(parts[1:-3])
            freezers.append({"sr": parts[0], "model": model, "mrp": mrp, "category": "Deep Freezers"})

with open(r"e:\earthyelectronics\backend\haier_wash_freez.json", "w", encoding="utf-8") as f:
    json.dump({"washers": washers, "freezers": freezers}, f, indent=2)
