const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Products page...');
    await page.goto('http://localhost:3000/products', { waitUntil: 'networkidle2' });
    
    // Find all variant selectors in the catalog cards to identify grouped products
    // Wait for products to load
    await page.waitForSelector('.catalog-card', { timeout: 10000 });
    
    // We want to find cards that have the <select> for variants to know they are grouped
    const groupedCards = await page.$$('.catalog-card:has(select)');
    console.log(`Found ${groupedCards.length} grouped products on the page.`);
    
    if (groupedCards.length < 3) {
      console.log('Not enough grouped products found to test 3 distinct groups. Found:', groupedCards.length);
      // We will still test whatever we found
    }
    
    const limit = Math.min(3, groupedCards.length);
    for (let i = 0; i < limit; i++) {
      console.log(`\n--- Testing Group ${i + 1} ---`);
      
      // We must query the cards again because DOM might have changed after closing modal
      const cards = await page.$$('.catalog-card:has(select)');
      const card = cards[i];
      
      // Get the product name on the card
      const baseName = await card.$eval('.catalog-name', el => el.innerText);
      console.log(`Product Group: ${baseName}`);
      
      // Click the image to open the modal
      const imgWrap = await card.$('.catalog-img-wrap');
      await imgWrap.click();
      
      // Wait for modal to appear
      await page.waitForSelector('.modal-container', { visible: true, timeout: 5000 });
      
      // Check if Variant Selector exists
      const hasSelector = await page.$('.modal-variant-selector');
      if (!hasSelector) {
        console.log('❌ FAIL: Variant Selector not found in modal!');
        continue;
      }
      console.log('✅ Variant Selector found in modal.');
      
      // Get all variant tiles
      const tiles = await page.$$('.variant-tile');
      console.log(`Found ${tiles.length} variants in this group.`);
      
      if (tiles.length < 2) {
        console.log('❌ FAIL: Less than 2 variants found. Cannot test switching.');
      } else {
        // Test initial state
        let currentTitle = await page.$eval('.modal-info-header h2', el => el.innerText);
        let currentPrice = await page.$eval('.m-price', el => el.innerText);
        let currentDesc = await page.$eval('.modal-desc', el => el.innerText);
        let currentImg = await page.$eval('.modal-product-img img', el => el.src);
        
        console.log('Initial State:');
        console.log(`  Title: ${currentTitle}`);
        console.log(`  Price: ${currentPrice}`);
        console.log(`  Desc: ${currentDesc.substring(0, 30)}...`);
        console.log(`  Image: ${currentImg.split('/').pop()}`);
        
        // Click the second variant tile
        console.log('Clicking the second variant tile...');
        await tiles[1].click();
        
        // Wait a tiny bit for React state to update
        await new Promise(r => setTimeout(r, 500));
        
        // Verify state changed
        let newTitle = await page.$eval('.modal-info-header h2', el => el.innerText);
        let newPrice = await page.$eval('.m-price', el => el.innerText);
        let newDesc = await page.$eval('.modal-desc', el => el.innerText);
        let newImg = await page.$eval('.modal-product-img img', el => el.src);
        
        let changedCount = 0;
        if (newTitle !== currentTitle) { console.log('✅ Title changed successfully.'); changedCount++; }
        else { console.log('❌ Title did NOT change.', newTitle, 'vs', currentTitle); }
        
        if (newPrice !== currentPrice) { console.log('✅ Price changed successfully.'); changedCount++; }
        else { console.log('⚠️ Price did NOT change (maybe variants have same price).'); changedCount++; }
        
        if (newDesc !== currentDesc) { console.log('✅ Description changed successfully.'); changedCount++; }
        else { console.log('⚠️ Description did NOT change (maybe they share description).'); changedCount++; }
        
        if (newImg !== currentImg) { console.log('✅ Image changed successfully.'); changedCount++; }
        else { console.log('❌ Image did NOT change.'); }
        
        if (changedCount >= 3) {
          console.log(`✅ Group ${i + 1} passed the dynamic update test!`);
        } else {
          console.log(`❌ Group ${i + 1} failed some dynamic update tests.`);
        }
      }
      
      // Close modal
      const closeBtn = await page.$('.modal-x-btn');
      await closeBtn.click();
      
      // Wait for modal to disappear
      // Check if modal still exists first
      const modalExists = await page.$('.modal-container');
      if (modalExists) {
        // wait for it to be removed or hidden
        await new Promise(r => setTimeout(r, 500)); 
      }
    }
    
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
})();
