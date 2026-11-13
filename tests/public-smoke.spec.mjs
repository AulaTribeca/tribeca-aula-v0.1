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

test('Accesibilidad: foco, nombres, contraste y reflujo a 320px y 200%', async ({ page }, testInfo) => {
  await page.goto('./#inicio');
  const toggle=page.locator('[data-a11y-toggle]');
  await toggle.click();
  const panel=page.locator('[data-a11y-panel]');
  const close=panel.locator('[data-a11y-close]');
  await expect(close).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Shift+Tab');
  await expect(panel.locator('button').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await panel.locator('[data-a11y-font="serif"]').click();
  await expect(panel.locator('[data-a11y-font="serif"]')).toBeFocused();
  await expect(panel.locator('[data-a11y-font="serif"]')).toHaveAttribute('aria-pressed','true');
  await panel.locator('[data-a11y-font="reset"]').click();
  for(const control of await panel.locator('input,select').all()) await expect(control).toHaveAttribute('aria-labelledby',/tribeca-a11y-option/);
  const contrast=await panel.locator('h3').first().evaluate(el=>{
    const luminance=color=>{const c=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
    const a=luminance(getComputedStyle(el).color),b=luminance(getComputedStyle(el.closest('article')).backgroundColor);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  for(const width of [320,640]) {
    await page.setViewportSize({width,height:900});
    // CSS zoom checks scaled controls; browser-native zoom remains a manual gate.
    await panel.evaluate((el,zoom)=>el.style.zoom=zoom,width===640?'2':'1');
    const metrics=await panel.evaluate(el=>({width:el.scrollWidth,client:el.clientWidth,grid:el.querySelector('.tribeca-a11y-grid').scrollWidth,gridClient:el.querySelector('.tribeca-a11y-grid').clientWidth,targets:[...el.querySelectorAll('button,input,select')].map(n=>n.getBoundingClientRect().height)}));
    expect(metrics.width).toBeLessThanOrEqual(metrics.client+2);
    expect(metrics.grid).toBeLessThanOrEqual(metrics.gridClient+2);
    expect(Math.min(...metrics.targets)).toBeGreaterThanOrEqual(44);
  }
  await panel.evaluate(el=>el.style.zoom='1');
  await page.setViewportSize({width:390,height:844});
  if(process.env.TRIBECA_QA_SCREENSHOTS==='1') await page.screenshot({path:testInfo.outputPath('teacher-classroom.png')});
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
});
