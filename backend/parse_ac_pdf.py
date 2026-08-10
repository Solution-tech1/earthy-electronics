import json
import re
import sys

try:
    import pypdf
    reader = pypdf.PdfReader("product files/HAIER_JUNE-26_MRP.pdf")
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"

    lines = [l.strip() for l in text.split('\n') if l.strip()]

    ac_models = []
    for i, line in enumerate(lines):
        # Match HSU-, HDU-, HBA-, HFU-, HCA-
        if re.search(r'H[SDBFC]U-\d+|HSU-|HDU-', line, re.IGNORECASE):
            mrp = 0
            for j in range(i, min(i+5, len(lines))):
                price_match = re.search(r'\b\d{5,7}\b', lines[j].replace(',', ''))
                if price_match:
                    mrp = int(price_match.group(0))
                    break
            ac_models.append({"model": line, "mrp": mrp})

    # Deduplicate
    seen = set()
    clean_ac = []
    for m in ac_models:
        k = m["model"].upper()
        if k not in seen:
            seen.add(k)
            clean_ac.append(m)

    with open("haier_ac_parsed.json", "w", encoding="utf-8") as f:
        json.dump(clean_ac, f, indent=2)

    print(f"Successfully extracted {len(clean_ac)} Haier AC models from PDF.")

except Exception as e:
    print(f"Error: {e}")
