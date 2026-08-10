import pypdf, json, os, re

fpath = r"e:\earthyelectronics\backend\all products files\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

all_items = []

# Page 1: Refrigerators
p1_text = reader.pages[0].extract_text() or ""
for line in p1_text.split('\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            all_items.append({
                "category": "Refrigerators",
                "model": " ".join(parts[1:-3]),
                "mrp": int(mrp_str)
            })

# Page 2 & 5: Air Conditioners
for p_idx in [1, 4]:
    p_text = reader.pages[p_idx].extract_text() or ""
    for line in p_text.split('\n'):
        line = line.strip()
        if not line or 'Gulberg' in line or 'College' in line or 'Tax' in line or 'Capacity' in line:
            continue
        parts = line.split()
        if len(parts) >= 4:
            mrp_str = parts[-1].replace(',', '')
            if mrp_str.isdigit():
                model = " ".join(parts[1:-3]) if parts[0].isdigit() else " ".join(parts[0:-3])
                if len(model) > 2:
                    all_items.append({
                        "category": "Air Conditioners",
                        "model": model,
                        "mrp": int(mrp_str)
                    })

# Page 3: Washing Machines
p3_text = reader.pages[2].extract_text() or ""
for line in p3_text.split('\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Division' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            all_items.append({
                "category": "Washing Machines",
                "model": " ".join(parts[1:-3]),
                "mrp": int(mrp_str)
            })

# Page 4: Deep Freezers
p4_text = reader.pages[3].extract_text() or ""
for line in p4_text.split('\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Division' in line or 'Tax' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            all_items.append({
                "category": "Deep Freezers",
                "model": " ".join(parts[1:-3]),
                "mrp": int(mrp_str)
            })

# Pages 6 & 7: LED TVs
for p_idx in [5, 6]:
    p_text = reader.pages[p_idx].extract_text() or ""
    for line in p_text.split('\n'):
        line = line.strip()
        if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line or 'Date:' in line:
            continue
        parts = line.split()
        if len(parts) >= 2:
            mrp_str = parts[-1].replace(',', '')
            if mrp_str.isdigit():
                model = " ".join(parts[1:-3]) if parts[0].isdigit() else " ".join(parts[0:-3])
                if len(model) > 2:
                    all_items.append({
                        "category": "LED TVs",
                        "model": model,
                        "mrp": int(mrp_str)
                    })

# Page 8: Water Dispensers
p8_text = reader.pages[7].extract_text() or ""
for line in p8_text.split('\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Tax' in line or 'Company' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            all_items.append({
                "category": "Water Dispensers",
                "model": " ".join(parts[1:-3]),
                "mrp": int(mrp_str)
            })

with open(r"e:\earthyelectronics\backend\haier_all_models.json", "w", encoding="utf-8") as f:
    json.dump(all_items, f, indent=2)
