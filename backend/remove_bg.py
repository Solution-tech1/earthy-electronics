
from PIL import Image

img = Image.open(r"C:/Users/HP/.gemini/antigravity/brain/0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5/earthy_electronics_full_banner_logo_v1_1785395144445.jpg")
img = img.convert("RGBA")

datas = img.getdata()

newData = []
for item in datas:
    # Change all white / near-white pixels to transparent
    if item[0] > 235 and item[1] > 235 and item[2] > 235:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)

# Bounding box crop to trim whitespace
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

img.save(r"E:/earthyelectronics/frontend/public/images/earthyelectronics_official_banner_logo.png", "PNG")
print("✅ Successfully saved 100% transparent PNG logo!")
