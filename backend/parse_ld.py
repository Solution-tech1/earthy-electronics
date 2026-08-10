import pypdf, json, os

fpath = r"e:\earthyelectronics\backend\all products files\HAIER JUNE-26 MRP.pdf"
reader = pypdf.PdfReader(fpath)

# LEDs: Pages 6 & 7
leds = []
for p_idx in [5, 6]:
    p_text = reader.pages[p_idx].extract_text() or ""
    lines = p_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line or 'Gulberg' in line or 'College' in line or 'Series' in line or 'Tax' in line or 'Date:' in line:
            continue
        # Extract lines starting with digit or model like H32... H43...
        parts = line.split()
        if len(parts) >= 2:
            mrp_str = parts[-1].replace(',', '')
            if mrp_str.isdigit():
                mrp = int(mrp_str)
                sr = parts[0] if parts[0].isdigit() else str(len(leds) + 1)
                model = " ".join(parts[1:-3]) if parts[0].isdigit() else " ".join(parts[0:-3])
                if len(model) > 2:
                    leds.append({"sr": sr, "model": model, "mrp": mrp, "category": "LED TVs"})

# Dispensers: Page 8
dispensers = []
p8_text = reader.pages[7].extract_text() or ""
for line in p8_text.split('\n'):
    line = line.strip()
    if not line or 'Gulberg' in line or 'College' in line or 'Tax' in line or 'Company' in line:
        continue
    parts = line.split()
    if len(parts) >= 4 and parts[0].isdigit():
        mrp_str = parts[-1].replace(',', '')
        if mrp_str.isdigit():
            mrp = int(mrp_str)
            model = " ".join(parts[1:-3])
            dispensers.append({"sr": parts[0], "model": model, "mrp": mrp, "category": "Water Dispensers"})

with open(r"e:\earthyelectronics\backend\haier_led_disp.json", "w", encoding="utf-8") as f:
    json.dump({"leds": leds, "dispensers": dispensers}, f, indent=2)
