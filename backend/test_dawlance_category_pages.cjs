const https = require('https');

function testUrl(urlPath) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.dawlance.com.pk',
      path: urlPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, title: (body.match(/<title>(.*?)<\/title>/i) || [])[1] || 'No Title' });
      });
    });

    req.on('error', (e) => resolve({ status: 'Error', title: e.message }));
    req.end();
  });
}

async function testCategories() {
  console.log("Testing Dawlance Category Pages:");
  console.log("1. /products/refrigerator:", await testUrl('/products/refrigerator'));
  console.log("2. /products/washing-machine:", await testUrl('/products/washing-machine'));
  process.exit(0);
}

testCategories();
