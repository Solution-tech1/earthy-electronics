import os
import sys
import mysql.connector
from PIL import Image

print("==================================================")
print("🛠️ FIXING BLACK BACKGROUNDS & PURGING DISTORTED CUTOUTS")
print("==================================================")

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="earthy_elec"
)
cursor = db.cursor(dictionary=True)

cursor.execute("SELECT id, name, brand, category, image FROM products WHERE image IS NOT NULL AND image != ''")
products = cursor.fetchall()
print(f"📦 Auditing {len(products)} live products...")

public_dir = r"E:\earthyelectronics\frontend\public\images\products"

fixed_bg_count = 0
deleted_count = 0

for p in products:
    img_rel = p['image']
    if not img_rel.startswith('/images/products/'):
        continue

    fname = os.path.basename(img_rel)
    abs_path = os.path.join(public_dir, fname)

    if not os.path.exists(abs_path):
        cursor.execute("DELETE FROM products WHERE id = %s", (p['id'],))
        deleted_count += 1
        continue

    lower_name = (p['name'] + ' ' + fname).lower()

    # Check 1: Known distorted / erased / split cutouts shown in screenshots
    if any(k in lower_name for k in ['dwt-9560', 'dwt-1775', 'dwt 14470', 'hmw-28100', 'dw-6550g', 'dw-6000', 'wa21ck', 'wa90ck']):
        cursor.execute("DELETE FROM products WHERE id = %s", (p['id'],))
        print(f"   ❌ Deleted Distorted/Erased Product ID #{p['id']} ('{p['name']}')")
        deleted_count += 1
        continue

    # Check 2: Process image to convert BLACK/DARK background to PURE WHITE (#FFFFFF)
    try:
        img = Image.open(abs_path).convert("RGBA")
        width, height = img.size
        pixels = img.load()

        # Sample corner pixels to see if background is dark/black
        corners = [pixels[0, 0], pixels[width-1, 0], pixels[0, height-1], pixels[width-1, height-1]]
        is_dark_bg = any(c[0] < 40 and c[1] < 40 and c[2] < 40 for c in corners)

        if is_dark_bg or '316s6' in lower_name or 'zith1w-t3' in lower_name:
            print(f"   🎨 Converting Black/Dark BG to Pure White for ID #{p['id']} ('{p['name']}')")
            new_img = Image.new("RGBA", img.size, (255, 255, 255, 255))
            
            for y in range(height):
                for x in range(width):
                    r, g, b, a = pixels[x, y]
                    # If pixel is dark background pixel, turn white
                    if a == 0 or (r < 35 and g < 35 and b < 35):
                        pixels[x, y] = (255, 255, 255, 255)
            
            new_img.paste(img, (0, 0), img)
            rgb_img = new_img.convert("RGB")
            rgb_img.save(abs_path, "JPEG", quality=95)
            fixed_bg_count += 1
    except Exception as e:
        print(f"Error processing image {fname}: {e}")

db.commit()

cursor.execute("SELECT COUNT(*) as total FROM products")
total = cursor.fetchone()['total']

print("\n==================================================")
print("🎉 BLACK BG FIX & DISTORTION PURGE COMPLETE")
print("==================================================")
print(f"✨ Black/Dark Backgrounds Converted to Pure White: {fixed_bg_count}")
print(f"🧹 Distorted/Erased Products Deleted: {deleted_count}")
print(f"🛒 Total Active Clean Products Remaining in DB: {total}")
print("==================================================\n")

cursor.close()
db.close()
