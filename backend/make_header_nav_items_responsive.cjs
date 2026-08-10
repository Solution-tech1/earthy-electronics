const fs = require('fs');
const path = require('path');

function makeHeaderResponsive() {
  const cssPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'Header.css');
  const jsxPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'Header.jsx');

  // Add ultra-clean responsive CSS rules for header logo, search, and nav action buttons
  const responsiveCss = `

/* ==================================================
   📱 PERFECT RESPONSIVE NAV ITEMS & MEDIA QUERIES
   ================================================== */

.hdr-logo-img {
  height: 62px;
  width: auto;
  max-height: 62px;
  object-fit: contain;
  transition: all 0.3s ease;
}

@media (max-width: 1024px) {
  .hdr-logo-img {
    height: 52px !important;
    max-height: 52px !important;
  }
}

@media (max-width: 768px) {
  .header-main-row {
    padding: 8px 14px !important;
    gap: 10px !important;
  }
  .hdr-logo-img {
    height: 46px !important;
    max-height: 46px !important;
  }
  .hdr-search-wrap {
    min-width: 120px !important;
  }
}

@media (max-width: 480px) {
  .header-main-row {
    padding: 6px 10px !important;
    gap: 8px !important;
  }
  .hdr-logo-img {
    height: 40px !important;
    max-height: 40px !important;
  }
}
`;

  fs.appendFileSync(cssPath, responsiveCss, 'utf8');

  // Update Header.jsx to use class .hdr-logo-img for image
  let jsxContent = fs.readFileSync(jsxPath, 'utf8');
  jsxContent = jsxContent.replace(
    /style=\{\{\s*height:\s*'62px',[\s\S]*?\}\}/g,
    `className="hdr-logo-img"`
  );

  fs.writeFileSync(jsxPath, jsxContent, 'utf8');
  console.log("✅ Successfully applied responsive CSS & class to Header navbar items!");
}

makeHeaderResponsive();
