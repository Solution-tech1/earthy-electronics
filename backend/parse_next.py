import pypdf, json, os, re

fpath = r"e:\earthyelectronics\backend\all products files\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

# Page 1 remaining Refrigerators (#51 to #57)
page1_text = reader.pages[0].extract_text() or ""
lines1 = page1_text.split('\n')
ref_items = []
for line in lines1:
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            model = " ".join(parts[1:-3])
            ref_items.append({"sr": parts[0], "model": model, "mrp": mrp, "category": "Refrigerators"})

ref_chunk2 = ref_items[50:]

# AC items from Page 2 and Page 5
ac_items = []
for page_num in [1, 4]:
    p_text = reader.pages[page_num].extract_text() or ""
    lines = p_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line or 'Gulberg' in line or 'College' in line or 'Tax' in line or 'Capacity' in line:
            continue
        parts = line.split()
        if len(parts) >= 4:
            mrp_str = parts[-1].replace(',', '')
            if mrp_str.isdigit():
                mrp = int(mrp_str)
                sr = parts[0] if parts[0].isdigit() else str(len(ac_items) + 1)
                model = " ".join(parts[1:-3]) if parts[0].isdigit() else " ".join(parts[0:-3])
                ac_items.append({"sr": sr, "model": model, "mrp": mrp, "category": "Air Conditioners"})

with open(r"e:\earthyelectronics\backend\haier_next_parsed.json", "w", encoding="utf-8") as f:
    json.dump({"ref_chunk2": ref_chunk2, "ac_chunk1": ac_items[:50]}, f, indent=2)
