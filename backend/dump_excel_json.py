import zipfile, xml.etree.ElementTree as ET, json, os

def read_xlsx(fpath):
    rows = []
    if not os.path.exists(fpath): return rows
    with zipfile.ZipFile(fpath, 'r') as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for elem in ss_tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                strings.append(elem.text or '')
        sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        sheet_data = sheet_tree.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData')
        for r_elem in sheet_data.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            row_vals = []
            for c_elem in r_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                t = c_elem.get('t')
                v_elem = c_elem.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v_elem.text if v_elem is not None else ''
                if t == 's' and val != '':
                    idx = int(val)
                    val = strings[idx] if idx < len(strings) else val
                row_vals.append(val)
            if any(row_vals):
                rows.append(row_vals)
    return rows

base_dir = r"e:\earthyelectronics\backend\all products files"
led_rows = read_xlsx(os.path.join(base_dir, "LED UPLOADING.xlsx"))
wd_rows = read_xlsx(os.path.join(base_dir, "water dispenser.xlsx"))
wm_rows = read_xlsx(os.path.join(base_dir, "Washing Machine.xlsx"))

out = {
    "led": led_rows,
    "wd": wd_rows,
    "wm": wm_rows
}
with open(r"e:\earthyelectronics\backend\parsed_excel_data.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
