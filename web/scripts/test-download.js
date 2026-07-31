const https = require('https');
const crypto = require('crypto');

function calculateMD5Path(filename) {
  const hash = crypto.createHash('md5').update(filename).digest('hex');
  const first = hash[0];
  const firstTwo = hash.slice(0, 2);
  return `${first}/${firstTwo}/${filename}`;
}

const filename = '0.png';
const url = `https://sa-mp.ru/img/skins/${filename}`;

console.log('Testing URL:', url);

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://wiki.multitheftauto.com/wiki/All_Skins_Page'
  }
};

https.get(url, options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  res.on('data', (d) => {
    console.log('Received chunk of size:', d.length);
  });
}).on('error', (e) => {
  console.error('Error:', e);
});
