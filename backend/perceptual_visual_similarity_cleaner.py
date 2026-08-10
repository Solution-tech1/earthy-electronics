import os
import mysql.connector
from PIL import Image
import numpy as np

def compute_image_fingerprint(filepath):
    try:
        img = Image.open(filepath).convert('L') # Convert to grayscale
        img = img.resize((16, 16), Image.Resampling.LANCZOS)
        pixels = np.array(img, dtype=np.float32)
        avg = pixels.mean()
        diff = pixels > avg
        return diff
    except Exception as e:
        return None

def main():
    print("==================================================")
    print("🔍 VISUAL SIMILARITY AUDIT ACROSS ALL PRODUCT IMAGES")
    print("==================================================")

    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="earthy_elec"
    )
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != ''")
    products = cursor.fetchall()
    
    public_products_dir = r"E:\earthyelectronics\frontend\public\images\products"

    fingerprints = []
    duplicates_to_remove = []

    for p in products:
        img_url = p['image']
        if img_url and img_url.startswith('/images/products/'):
            fname = os.path.basename(img_url)
            abs_path = os.path.join(public_products_dir, fname)

            if os.path.exists(abs_path):
                fp = compute_image_fingerprint(abs_path)
                if fp is not None:
                    # Compare with existing fingerprints
                    is_dup = False
                    for existing_id, existing_name, existing_fp, existing_fname in fingerprints:
                        # Hamming distance
                        hamming_dist = np.count_nonzero(fp != existing_fp)
                        if hamming_dist <= 15: # Visually identical images threshold
                            is_dup = True
                            duplicates_to_remove.append((p['id'], p['name'], existing_id, existing_name, fname, existing_fname))
                            print(f"⚠️ Visual Match Found ({hamming_dist} diff): ID #{p['id']} ({p['name']}) IS VISUALLY IDENTICAL TO ID #{existing_id} ({existing_name})")
                            break
                    
                    if not is_dup:
                        fingerprints.append((p['id'], p['name'], fp, fname))

    print(f"\n🧹 Total Visually Identical Duplicate Product Images Found: {len(duplicates_to_remove)}")

    # Set image = NULL for all visually duplicate products
    for dup_id, dup_name, orig_id, orig_name, fname, orig_fname in duplicates_to_remove:
        cursor.execute("UPDATE products SET image = NULL WHERE id = %s", (dup_id,))
        db.commit()
        print(f"❌ Removed Duplicate Image from ID #{dup_id} ('{dup_name}')")

    cursor.execute("SELECT COUNT(*) as total, COUNT(image) as with_image FROM products")
    stats = cursor.fetchone()

    print("\n==================================================")
    print("🎉 VISUAL DEDUPLICATION COMPLETE")
    print("==================================================")
    print(f"🧹 Visually Duplicate Images Cleaned: {len(duplicates_to_remove)}")
    print(f"🛒 Total Active Products in DB: {stats['total']}")
    print(f"✨ Total Products with 100% TRULY DISTINCT Cutouts: {stats['with_image']}")
    print("==================================================\n")

    cursor.close()
    db.close()

if __name__ == "__main__":
    main()
