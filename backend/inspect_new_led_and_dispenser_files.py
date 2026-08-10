import os
import pandas as pd
import json

base_dir = r"e:\earthyelectronics\backend\all products files"

files = [
    "LED UPLOADING.xlsx",
    "water dispenser.xlsx",
    "ALL LEDs ALFA.csv",
    "ALL W-D ALFA.csv",
    "PEL WATER DISPENSER OCT 2024.csv"
]

print("==================================================")
print("📊 INSPECTING NEW LED AND WATER DISPENSER FILES")
print("==================================================")

for fname in files:
    fpath = os.path.join(base_dir, fname)
    if os.path.exists(fpath):
        print(f"\n📄 FILE: {fname}")
        try:
            if fname.endswith('.xlsx') or fname.endswith('.xls'):
                df = pd.read_excel(fpath)
            else:
                df = pd.read_csv(fpath, encoding='utf-8', errors='ignore')

            print(f"   Row Count: {len(df)}")
            print(f"   Columns ({len(df.columns)}): {list(df.columns)}")
            print("   Sample Rows (First 3):")
            sample = df.head(3).to_dict(orient='records')
            for i, s in enumerate(sample):
                print(f"     Row {i+1}: {s}")
        except Exception as e:
            print(f"   Error reading file: {e}")
    else:
        print(f"❌ File not found: {fname}")

print("\n==================================================")
