const mysql = require('mysql2/promise');

function extractBaseName(name) {
  let base = name.toLowerCase();
  
  // Remove common variant descriptors to find the true base model
  // Colors
  const colors = ['white', 'black', 'silver', 'grey', 'gray', 'red', 'blue', 'golden', 'gold', 'champagne', 'inox', 'glass'];
  for(const c of colors) base = base.replace(new RegExp(`\\b${c}\\b`, 'gi'), '');
  
  // Capacities
  base = base.replace(/\b\d+(\.\d+)?\s*(ton|kg|ltr|liters|cft|cu ft|l)\b/gi, '');
  base = base.replace(/\b(1|1\.5|2|2\.5)\s*ton\b/gi, '');
  
  // Minor suffix like 11S vs 14S (if at the end) - this is tricky, so we rely on Levenshtein or just word matching
  
  return base.replace(/\s+/g, ' ').trim();
}

// Simple Levenshtein distance
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  var matrix = [];
  for (var i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (var j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (var i = 1; i <= b.length; i++) {
    for (var j = 1; j <= a.length; j++) {
      if (b.charAt(i-1) == a.charAt(j-1)) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

async function analyze() {
  const c = await mysql.createConnection({host:'localhost',user:'root',database:'earthy_elec'});
  const [products] = await c.query('SELECT * FROM products');
  
  const groups = [];
  
  // Group by Brand + Category first
  const buckets = {};
  for(const p of products) {
    if(!p.name) continue;
    const key = `${(p.brand||'').toLowerCase()}-${(p.category||'').toLowerCase()}`;
    if(!buckets[key]) buckets[key] = [];
    buckets[key].push(p);
  }

  let total_groups = 0;
  let items_in_groups = 0;
  const m4_examples = [];

  for(const key in buckets) {
    const bucket = buckets[key];
    // Check every pair in the bucket
    const used = new Set();
    
    for(let i=0; i<bucket.length; i++) {
      if(used.has(bucket[i].id)) continue;
      
      const group = [bucket[i]];
      used.add(bucket[i].id);
      
      const baseA = extractBaseName(bucket[i].name);
      
      for(let j=i+1; j<bucket.length; j++) {
        if(used.has(bucket[j].id)) continue;
        
        const baseB = extractBaseName(bucket[j].name);
        
        // They are a variant if their base names are very similar, and price difference is < 40%
        const priceA = bucket[i].discountPrice || bucket[i].price;
        const priceB = bucket[j].discountPrice || bucket[j].price;
        
        let priceDiff = 0;
        if (priceA > 0 && priceB > 0) {
            priceDiff = Math.abs(priceA - priceB) / Math.max(priceA, priceB);
        }
        
        // Strict name similarity (mostly identical except for 1-2 chars or the stripped color/size)
        // Also check if they share the same first 2-3 significant words
        const wordsA = bucket[i].name.split(' ').slice(0,2).join(' ').toLowerCase();
        const wordsB = bucket[j].name.split(' ').slice(0,2).join(' ').toLowerCase();
        
        const dist = levenshtein(baseA, baseB);
        
        if (wordsA === wordsB && dist < 5 && priceDiff < 0.4) {
          group.push(bucket[j]);
          used.add(bucket[j].id);
        }
      }
      
      if(group.length > 1) {
        total_groups++;
        items_in_groups += group.length;
        m4_examples.push({
          groupKey: key,
          count: group.length,
          items: group.map(g => `${g.name} (Rs.${g.discountPrice || g.price})`)
        });
      }
    }
  }

  console.log(JSON.stringify({
    m4: { groups_count: total_groups, items_in_groups: items_in_groups, examples: m4_examples.slice(0, 5) } // Show top 5
  }, null, 2));

  await c.end();
}

analyze().catch(console.error);
