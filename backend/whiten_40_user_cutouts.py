import os
import json
from PIL import Image

report_path = r"E:/earthyelectronics/backend/matched_40_user_images_report.json"
public_products_dir = r"E:/earthyelectronics/frontend/public/images/products"

with open(report_path, 'r', encoding='utf-8') as f:
    items = json.load(f)

print("==================================================")
print("🎨 CONVERTING ALL 40 USER MATCHED IMAGES TO 100% PURE WHITE CUTOUTS")
print("==================================================")

success_count = 0

for item in items:
    rel_path = item.get('targetPath')
    if rel_path and rel_path != 'None':
        fname = os.path.basename(rel_path)
        abs_path = os.path.join(public_products_dir, fname)

        if os.path.exists(abs_path):
            try:
                img = Image.open(abs_path).convert("RGBA")
                datas = img.getdata()

                new_data = []
                for p in datas:
                    # Convert transparent/near-white pixels to 100% pure white (#FFFFFF)
                    if p[3] < 50 or (p[0] > 235 and p[1] > 235 and p[2] > 235):
                        new_data.append((255, 255, 255, 255))
                    else:
                        new_data.append(p)

                img.putdata(new_data)
                rgb_img = img.convert("RGB")
                rgb_img.save(abs_path, "JPEG", quality=95)
                success_count += 1
                print(f"✅ Whitened & Saved: {fname}")
            except Exception as e:
                print(f"⚠️ Error processing {fname}: {e}")

print(f"\n==================================================")
print(f"🎉 SUCCESS: {success_count} / 40 IMAGES WHITENED & CLEANED!")
print("==================================================")
