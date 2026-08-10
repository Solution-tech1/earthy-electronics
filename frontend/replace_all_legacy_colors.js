const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const srcDir = path.join(__dirname, 'src');
let filesModified = 0;

walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.css') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace old navy blue with Option 2 Mint Tech (#065f46 / #059669)
    content = content.replace(/#0f2557/gi, '#065f46');
    content = content.replace(/#1e40af/gi, '#059669');
    
    // Replace old orange with Option 2 Mint Tech (#10b981 / #06b6d4)
    content = content.replace(/#f97316/gi, '#10b981');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated legacy colors in: ${filePath}`);
      filesModified++;
    }
  }
});

console.log(`✅ Total files updated with Option 2 Mint Tech colors: ${filesModified}`);
