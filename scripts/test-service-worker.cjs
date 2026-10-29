const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

// Isolated worker logic: no browser sessions, network or student records.
const source = readFileSync(new URL('../service-worker.js', `file://${__filename}`), 'utf8');
const root = 'https://example.test/tribeca-aula-v0.1/';

function worker({ offline = true, cached = {}, failPut = false } = {}) {
  const listeners = {};
  const entries = new Map(Object.entries(cached));
  const key = request => new URL(typeof request === 'string' ? request : request.url, root).href;
  const cache = {
    async match(request) { return entries.get(key(request))?.clone(); },
    async put(request, response) {
      if (failPut) throw Error('Storage unavailable');
      entries.set(key(request), response.clone());
    },
  };
  vm.runInNewContext(source, {
    self: {
      location: new URL('service-worker.js', root),
      addEventListener(name, callback) { listeners[name] = callback; },
    },
    caches: { open: async () => cache, match: cache.match },
    fetch: async () => {
      if (offline) throw Error('Offline');
      return new Response('fresh resource');
    },
    URL, Response,
    setTimeout: (fn, delay) => setTimeout(fn, delay).unref(),
  });
  return async (path, mode = 'cors') => {
    const pending = [];
    let result;
    listeners.fetch({
      request: { url: new URL(path, root).href, method: 'GET', mode },
      respondWith(value) { result = Promise.resolve(value); },
      waitUntil(value) { pending.push(value); },
    });
    const response = await result;
    await Promise.all(pending);
    return response;
  };
}

test('Offline asset without cache returns a valid 503 response', async () => {
  const response = await worker()('assets/missing.png');
  assert.ok(response instanceof Response);
  assert.equal(response.status, 503);
});

for (const folder of ['resources', 'recursos', 'assets/ius/presentations']) {
  test(`Offline ${folder} document never receives the app shell`, async () => {
    const response = await worker({ cached: { [root + 'index.html']: new Response('APP SHELL') } })(`${folder}/lesson.html`, 'navigate');
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /APP SHELL/);
  });
}

test('Offline home with a query still receives the cached app shell', async () => {
  const response = await worker({ cached: { [root + 'index.html']: new Response('APP SHELL') } })('?source=pwa', 'navigate');
  assert.equal(await response.text(), 'APP SHELL');
});

test('Offline lesson receives its own cached document', async () => {
  const path = 'recursos/lesson.html';
  const response = await worker({ cached: { [root + path]: new Response('LESSON') } })(path, 'navigate');
  assert.equal(await response.text(), 'LESSON');
});

test('Cached images remain usable offline', async () => {
  const response = await worker({ cached: { [root + 'assets/logo.png']: new Response('IMAGE') } })('assets/logo.png');
  assert.equal(await response.text(), 'IMAGE');
});

test('Storage failure does not discard a successful network response', async () => {
  const response = await worker({ offline: false, failPut: true })('assets/logo.png');
  assert.equal(await response.text(), 'fresh resource');
});
