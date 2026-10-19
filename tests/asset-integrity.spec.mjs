import { test, expect } from '@playwright/test';

// Exclusivamente recursos públicos; no se inicia sesión, no se guardan datos ni
// se registran URL privadas en el informe público de GitHub Actions.
test('Los scripts locales necesarios para iniciar Tribeca Aula responden', async ({ page, request }) => {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  const urls = await page.locator('script[src]').evaluateAll(nodes =>
    nodes.map(node => node.src).filter(src => new URL(src).origin === location.origin)
  );
  expect(urls.length, 'Deben cargarse los scripts locales del aula').toBeGreaterThan(5);
  for (const url of urls) {
    const response = await request.get(url, { timeout: 25_000 });
    expect(response.ok(), 'Un script local de la versión publicada no responde').toBeTruthy();
  }
});

test('El manifiesto PWA y sus iconos existen y son compatibles', async ({ request }) => {
  const response = await request.get('./manifest.webmanifest');
  expect(response.ok(), 'El manifiesto PWA no está disponible').toBeTruthy();
  const manifest = await response.json();
  expect(manifest.name).toBe('Tribeca Aula');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toMatch(/#inicio$/);
  expect(manifest.scope).toBe('./');
  expect(Array.isArray(manifest.icons) && manifest.icons.length >= 2).toBeTruthy();
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^assets\//);
    const iconResponse = await request.get(new URL(icon.src, response.url()).toString());
    expect(iconResponse.ok(), 'Uno de los iconos PWA no se puede cargar').toBeTruthy();
  }
});

test('La precaché y el documento publican el mismo puente de recursos', async ({ request }) => {
  const [indexResponse, swResponse] = await Promise.all([
    request.get('./index.html'),
    request.get('./service-worker.js'),
  ]);
  expect(indexResponse.ok()).toBeTruthy();
  expect(swResponse.ok()).toBeTruthy();
  const index = await indexResponse.text();
  const worker = await swResponse.text();
  const bridgeName = index.match(/resource-progress\.js\?v=\d+/)?.[0];
  expect(bridgeName, 'El documento debe versionar el puente de recursos').toBeTruthy();
  expect(worker, 'La PWA debe precachear el puente de la versión publicada').toContain(bridgeName);
  const bridgeResponse = await request.get('./' + bridgeName);
  expect(bridgeResponse.ok()).toBeTruthy();
  const bridge = await bridgeResponse.text();
  expect(bridge).toContain("+'</script>'");
});
