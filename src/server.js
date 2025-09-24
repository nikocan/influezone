const http = require('http');
const url = require('url');

function createServer() {
  return http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const { pathname } = parsedUrl;

    const sendJSON = (status, data) => {
      const body = JSON.stringify(data);
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      });
      res.end(body);
    };

    // InflueZone routes
    if (pathname === '/influezone/health' && req.method === 'GET') {
      return sendJSON(200, { status: 'InflueZone API healthy' });
    }
    if (pathname === '/influezone/dashboard' && req.method === 'GET') {
      return sendJSON(200, { message: 'Influencer dashboard placeholder' });
    }

    // BenimDükkanım routes
    if (pathname === '/benimdukkanim/health' && req.method === 'GET') {
      return sendJSON(200, { status: 'BenimDükkanım API healthy' });
    }
    if (pathname === '/benimdukkanim/store' && req.method === 'GET') {
      return sendJSON(200, { message: 'Store homepage placeholder' });
    }

    // Not Found
    sendJSON(404, { error: 'Not found' });
  });
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = { createServer };
