const http = require('http');

const options = {
  method: 'OPTIONS',
  hostname: 'localhost',
  port: 4000,
  path: '/storage/list',
  headers: {
    Origin: 'http://localhost:5173',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'x-user-id, content-type'
  }
};

const req = http.request(options, res => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', res.headers);
  res.on('data', () => {});
  res.on('end', () => {});
});

req.on('error', e => {
  console.error('ERROR', e.message);
});

req.end();
