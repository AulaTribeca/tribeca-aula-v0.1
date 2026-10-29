import { test, expect } from '@playwright/test';

test('Acceso y recuperación muestran un solo formulario y transfieren el foco', async ({ page, browserName, isMobile }) => {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  const login = page.locator('#t16LoginForm');
  const reset = page.locator('#t16ResetForm');
  await expect(login).toBeVisible({ timeout: 45_000 });
  if (browserName === 'webkit' && isMobile) {
    const install = page.locator('#tribecaPwaInstallCta');
    await expect(install).toBeAttached();
    await expect(install).toBeHidden();
    await expect(install).toHaveAttribute('inert', '');
  }
  await login.locator('[data-t16-forgot]').click();
  await expect(reset).toBeVisible();
  await expect(login).toBeHidden();
  await expect(reset.locator('input[name="username"]')).toBeFocused();
  await reset.locator('[data-t16-login]').click();
  await expect(login).toBeVisible();
  await expect(reset).toBeHidden();
  await expect(login.locator('input[name="username"]')).toBeFocused();
});

test('El acceso conserva texto legible y controles táctiles', async ({ page }) => {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#t16LoginForm')).toBeVisible({ timeout: 45_000 });
  const metrics = await page.locator('#t16LoginForm').evaluate(form => ({
    text: [...form.querySelectorAll('p, label, button')].map(el => parseFloat(getComputedStyle(el).fontSize)),
    inputs: [...form.querySelectorAll('input')].map(el => parseFloat(getComputedStyle(el).fontSize)),
    targets: [...form.querySelectorAll('input, button')].map(el => el.getBoundingClientRect().height),
  }));
  expect(Math.min(...metrics.text)).toBeGreaterThanOrEqual(14);
  expect(Math.min(...metrics.inputs)).toBeGreaterThanOrEqual(16);
  expect(Math.min(...metrics.targets)).toBeGreaterThanOrEqual(44);
});

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

test('El formulario de acceso permite navegar por teclado', async ({ page }) => {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  const skip = page.locator('a.tribeca-skip-link');
  await expect(skip).toHaveAttribute('href', '#inicio');
  await expect(page.locator('#t16LoginForm')).toBeVisible({ timeout: 45_000 });

  // Un modal de acceso activo debe retener el foco: no exigir que se salte
  // al contenido protegido antes de iniciar sesión.
  const username = page.locator('#t16LoginForm input[name="username"]');
  const password = page.locator('#t16LoginForm input[name="password"]');
  await username.focus();
  await expect(username).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(password).toBeFocused();
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


test('El fondo del acceso queda fuera del teclado y conserva accesibilidad', async ({ page }) => {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  const login = page.locator('#t16LoginForm');
  await expect(login).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('#appHeader')).toHaveAttribute('inert', '');
  await expect(page.locator('main#inicio')).toHaveAttribute('inert', '');
  const accessibility = page.locator('.tribeca-a11y-button');
  await expect(accessibility).toBeVisible();
  expect(await accessibility.evaluate(el => !!el.closest('[inert]'))).toBe(false);
  await login.locator('input[name="username"]').focus();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#appHeader, main#inicio, footer, #windowLayer, #windowDock'))).toBe(false);
  }
});
