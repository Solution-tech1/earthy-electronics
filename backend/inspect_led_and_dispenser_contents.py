import os
import pandas as pd

folder = r"E:\earthyelectronics\backend\all products files"

led_csv = os.path.join(folder, "ALL LEDs ALFA.csv")
disp_csv = os.path.join(folder, "PEL WATER DISPENSER OCT 2024.csv")
disp_xlsx = os.path.join(folder, "water dispenser.xlsx")
led_xlsx = os.path.join(folder, "LED UPLOADING.xlsx")

print("==================================================")
print("📄 LED & WATER DISPENSER FILES CONTENTS INSPECTION")
print("==================================================")

if os.path.exists(led_csv):
    try:
        df = pd.read_csv(led_csv)
        print(f"\n📺 ALL LEDs ALFA.csv: {len(df)} rows")
        print(df.head(5).to_string())
    except Exception as e:
        print("Error reading LED csv:", e)

if os.path.exists(disp_xlsx):
    try:
        df = pd.read_excel(disp_xlsx)
        print(f"\n💧 water dispenser.xlsx: {len(df)} rows")
        print(df.head(5).to_string())
    except Exception as e:
        print("Error reading Dispenser xlsx:", e)

print("==================================================")
