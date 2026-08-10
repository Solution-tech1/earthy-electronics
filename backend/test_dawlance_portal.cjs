const https = require('https');

function testDawlancePortal() {
  const options = {
    hostname: 'www.dawlance.com.pk',
    path: '/',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, JSON.stringify(res.headers, null, 2));

    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`Body Length: ${body.length}`);
      console.log(`Snippet: ${body.slice(0, 500)}`);
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`Fetch Error: ${e.message}`);
    process.exit(1);
  });

  req.end();
}

testDawlancePortal();
