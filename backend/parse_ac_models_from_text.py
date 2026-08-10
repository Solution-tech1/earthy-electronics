import json
import re

with open("haier_pdf_text.txt", "r", encoding="utf-8") as f:
    text = f.read()

lines = [l.strip() for l in text.split('\n') if l.strip()]

ac_models = []

for i, line in enumerate(lines):
    # Match Haier AC model codes: HSU-, HDU-, HBA-, HFU-, HCA-, or line with Inverter/Split/Commercial AC
    if re.search(r'H[SDBFC]U-\d+|HSU-|HDU-', line, re.IGNORECASE) or ('AC' in line and ('INVERTER' in line or 'SPLIT' in line or 'COMMERCIAL' in line)):
        mrp = 0
        for j in range(i, min(i+6, len(lines))):
            price_match = re.search(r'\b\d{5,7}\b', lines[j].replace(',', ''))
            if price_match:
                mrp = int(price_match.group(0))
                break
        ac_models.append({"model": line, "mrp": mrp})

# Clean and deduplicate
seen = set()
clean_ac = []
for m in ac_models:
    model_str = m["model"].strip()
    if len(model_str) > 4 and model_str.upper() not in seen and not model_str.startswith('MRP'):
        seen.add(model_str.upper())
        clean_ac.append(m)

with open("haier_ac_parsed.json", "w", encoding="utf-8") as f:
    json.dump(clean_ac, f, indent=2)

print(f"Successfully extracted {len(clean_ac)} Haier AC models from PDF text!")
for idx, m in enumerate(clean_ac[:10]):
    print(f"   [{idx+1}] Model: '{m['model']}' | MRP: {m['mrp']}")
