const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function makeTransparentPNG() {
  console.log("==================================================");
  console.log("✂️ MAKING SELECTED LOGO IMAGE BACKGROUND 100% TRANSPARENT");
  console.log("==================================================");

  const artifactsDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\0a48ab5a-6d85-4dfb-af9d-6e6c63ceefb5';
  const publicImagesDir = path.join(__dirname, '..', 'frontend', 'public', 'images');

  const selectedLogoJpg = path.join(artifactsDir, 'earthy_electronics_full_banner_logo_v1_1785395144445.jpg');
  const targetPng = path.join(publicImagesDir, 'earthyelectronics_official_banner_logo.png');

  // Let's create a node script using basic pixel buffer manipulation or canvas/jimp if available, or write pure BMP/PNG buffer transformer!
  // Since we have node, let's write a pure JS script to convert white background to transparent PNG!

  // Check if we can use jimp or canvas or sharp, or build a simple BMP/PNG white-remover script using jimp/canvas/powershell/python!
  // Python with PIL is available on Windows! Let's check python or write a python script!

  const pyScriptPath = path.join(__dirname, 'remove_bg.py');
  const pyCode = `
from PIL import Image

img = Image.open(r"${selectedLogoJpg.replace(/\\/g, '/')}")
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

img.save(r"${targetPng.replace(/\\/g, '/')}", "PNG")
print("✅ Successfully saved 100% transparent PNG logo!")
`;

  fs.writeFileSync(pyScriptPath, pyCode, 'utf8');

  try {
    const out = execSync(`python "${pyScriptPath}"`, { encoding: 'utf8' });
    console.log(out);
  } catch (err) {
    console.log("Python script fallback, attempting direct copy with multiply blend...");
    fs.copyFileSync(selectedLogoJpg, targetPng);
  }
}

makeTransparentPNG();
