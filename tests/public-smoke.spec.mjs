import { test, expect } from '@playwright/test';

// No personal data is printed, saved, or downloaded by these tests.
test('La portada se sirve y muestra el acceso a Tribeca Aula', async ({ page }) => {
  const response = await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  expect(response?.status(), 'La portada debe devolver HTTP 200').toBe(200);
  await expect(page).toHaveTitle(/Tribeca Aula/);
  await expect(page.locator('#appHeader')).toBeAttached();
  await expect(page.locator('main#inicio')).toBeAttached();
  await expect(page.locator('#t16LoginForm')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('#t16LoginForm input[name="username"]')).toBeEnabled();
  await expect(page.locator('#t16LoginForm input[name="password"]')).toHaveAttribute('type', 'password');

  const version = await page.locator('body').getAttribute('data-ui-version');
  expect(version, 'Debe poder identificarse la versión de la interfaz').toMatch(/^\d+(?:\.\d+)?$/);
});

test('Las hojas de estilo del aula responden correctamente', async ({ page, request }) => {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  const urls = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes =>
    nodes.map(node => node.href).filter(url => url.startsWith(location.origin))
  );
  expect(urls.length, 'Deben existir hojas de estilo').toBeGreaterThan(0);
  for (const url of urls) {
    const response = await request.get(url, { timeout: 25_000 });
    expect(response.ok(), 'No se puede cargar una hoja de estilo publicada').toBeTruthy();
    expect(response.headers()['content-type'] || '').toContain('css');
  }
});

test('El acceso rápido al contenido es navegable con teclado', async ({ page }) => {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  const skip = page.locator('a.tribeca-skip-link');
  await expect(skip).toHaveAttribute('href', '#inicio');
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  const visible = await skip.evaluate(node => {
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && Number(style.opacity) > 0;
  });
  expect(visible, 'El enlace para saltar al contenido debe ser visible al enfocarlo').toBeTruthy();
});

test('La pantalla de acceso no obliga a desplazamiento horizontal', async ({ page }) => {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#t16LoginForm')).toBeVisible({ timeout: 45_000 });
  const metrics = await page.evaluate(() => ({
    contentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.contentWidth, 'Desbordamiento horizontal del documento').toBeLessThanOrEqual(metrics.viewportWidth + 2);
});
