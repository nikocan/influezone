const test = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../src/server');

function startServer() {
  const server = createServer();
  return new Promise(resolve => {
    server.listen(0, () => resolve(server));
  });
}

function stopServer(server) {
  return new Promise(resolve => server.close(resolve));
}

test('influezone health endpoint', async () => {
  const server = await startServer();
  const { port } = server.address();
  const res = await fetch(`http://localhost:${port}/influezone/health`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(json, { status: 'InflueZone API healthy' });
  await stopServer(server);
});

test('benimdukkanim store endpoint', async () => {
  const server = await startServer();
  const { port } = server.address();
  const res = await fetch(`http://localhost:${port}/benimdukkanim/store`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(json, { message: 'Store homepage placeholder' });
  await stopServer(server);
});
