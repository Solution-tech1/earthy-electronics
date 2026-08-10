import zipfile
import xml.etree.ElementTree as ET
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def read_xlsx(fpath):
    rows = []
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
files = ["LED UPLOADING.xlsx", "water dispenser.xlsx", "Washing Machine.xlsx"]

for fname in files:
    fpath = os.path.join(base_dir, fname)
    if os.path.exists(fpath):
        print("==================================================")
        print(f"EXCEL FILE: {fname}")
        print("==================================================")
        data = read_xlsx(fpath)
        print(f"Total Rows: {len(data)}")
        if len(data) > 0:
            print(f"Header Row: {data[0]}")
            print("First 3 Data Rows:")
            for r in data[1:4]:
                print(r)
