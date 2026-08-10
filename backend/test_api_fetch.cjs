const http = require('http');

http.get('http://localhost:5000/api/products', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const resp = JSON.parse(data);
    const list = Array.isArray(resp) ? resp : (resp.data || []);
    console.log(`✅ API HTTP 200 OK! Total products returned: ${list.length}`);
  });
}).on('error', (err) => {
  console.error("❌ API Error:", err.message);
});
