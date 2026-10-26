import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';

const code=await readFile(new URL('../tribeca-cookie-consent-v264.js',import.meta.url),'utf8');
const css=await readFile(new URL('../tribeca-cookie-consent-v264.css',import.meta.url),'utf8');
const policy=await readFile(new URL('../politica-cookies.html',import.meta.url),'utf8');
let server,origin;
test.beforeAll(async()=>{
  server=createServer((req,res)=>{
    const url=String(req.url||'');
    if(url.startsWith('/tribeca-cookie-consent-v264.js')){
      res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'});
      return res.end(code);
    }
    if(url.startsWith('/tribeca-cookie-consent-v264.css')){
      res.writeHead(200,{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store'});
      return res.end(css);
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(url.startsWith('/politica-cookies.html')?policy:
      '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><h1>Tribeca Aula — escenario ficticio</h1><a href="politica-cookies.html">Política de cookies</a><button type="button" data-tribeca-cookies-manage>Configurar cookies</button></main></body></html>');
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  origin='http://127.0.0.1:'+server.address().port+'/';
});
test.afterAll(async()=>{if(server)await new Promise(resolve=>server.close(resolve));});
async function setup(page){
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:css});
  await page.addScriptTag({content:code});
}
test('Dos opciones visibles e igual de destacadas antes de la elección',async({page})=>{
  await setup(page);
  const box=page.locator('#tribeca-cookie-panel-v264');
  await expect(box).toBeVisible();
  const reject=box.locator('[data-tribeca-cookie-choice-v264="reject"]');
  const accept=box.locator('[data-tribeca-cookie-choice-v264="accept"]');
  await expect(reject).toBeVisible();
  await expect(accept).toBeVisible();
  const sizes=await Promise.all([reject.boundingBox(),accept.boundingBox()]);
  expect(Math.abs(sizes[0].width-sizes[1].width)).toBeLessThan(2);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow,'El aviso no causa desplazamiento horizontal').toBeLessThanOrEqual(2);
  await mkdir('tests/cookie-preview',{recursive:true});
  await page.screenshot({path:'tests/cookie-preview/'+test.info().project.name+'-banner.png',fullPage:false});
  await box.locator('[data-tribeca-cookie-choice-v264="settings"]').click();
  await expect(box.locator('#tribeca-external-media-v264')).not.toBeChecked();
  await page.screenshot({path:'tests/cookie-preview/'+test.info().project.name+'-configuracion.png',fullPage:false});
});

test('Rechazo se recuerda y bloquea iframe de terceros sin bloquear contenido propio',async({page})=>{
  await setup(page);
  await page.locator('[data-tribeca-cookie-choice-v264="reject"]').click();
  const result=await page.evaluate(()=>{
    const api=window.TribecaCookieConsentV264;
    const youtube='https://www.youtube.com/embed/fictional-video';
    return {stored:JSON.parse(localStorage.getItem('tribeca-cookie-preferences-v264')),
      allowed:api.allowed(),external:api.externalFrameMarkup(youtube,'Video',470),
      own:api.externalFrameMarkup(location.origin+'/recurso.html','Recurso',400)};
  });
  expect(result.allowed).toBe(false);
  expect(result.stored.externalMedia).toBe(false);
  expect(result.external).toContain('Cargar este contenido');
  expect(result.external).not.toContain('<iframe');
  expect(result.own).toBe('');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.addScriptTag({content:code});
  await expect(page.locator('#tribeca-cookie-panel-v264')).toHaveCount(0);
  await expect(page.locator('main h1')).toBeVisible();
});

test('Aceptación expresa y cambio posterior desde Configurar cookies',async({page})=>{
  await setup(page);
  await page.locator('[data-tribeca-cookie-choice-v264="accept"]').click();
  expect(await page.evaluate(()=>window.TribecaCookieConsentV264.allowed())).toBe(true);
  await page.locator('[data-tribeca-cookies-manage]').click();
  await expect(page.locator('#tribeca-external-media-v264')).toBeChecked();
  await page.locator('[data-tribeca-cookie-choice-v264="reject"]').click();
  expect(await page.evaluate(()=>window.TribecaCookieConsentV264.allowed())).toBe(false);
});

test('Una carga puntual de un vídeo externo se retira al revocar consentimiento',async({page})=>{
  await page.route('https://www.youtube.com/**',route=>route.fulfill({
    status:200,contentType:'text/html',body:'<!doctype html><h1>Vídeo de prueba, sin cookies</h1>'}));
  await setup(page);
  await page.locator('[data-tribeca-cookie-choice-v264="reject"]').click();
  await page.evaluate(()=>{
    const url='https://www.youtube.com/embed/fictional';
    const markup=window.TribecaCookieConsentV264.externalFrameMarkup(url,'Vídeo ficticio',510);
    document.querySelector('main').insertAdjacentHTML('beforeend',markup);
  });
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.locator('[data-tribeca-media-activate-v264]').click();
  await expect(page.locator('iframe[data-tribeca-external-media-v264]')).toHaveCount(1);
  await page.locator('[data-tribeca-cookies-manage]').click();
  await page.locator('[data-tribeca-cookie-choice-v264="reject"]').click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('.tribeca-media-choice-v264')).toBeVisible();
});

test('Menores de 14 años: la opción externa permanece bloqueada',async({page})=>{
  await setup(page);
  await page.locator('[data-tribeca-cookie-choice-v264="accept"]').click();
  const result=await page.evaluate(()=>{
    const api=window.TribecaCookieConsentV264;
    api.onProfile({role:'student',birth_date:'2017-10-01'});
    return {allowed:api.allowed(),html:api.externalFrameMarkup('https://www.youtube.com/embed/fictional','Vídeo',420)};
  });
  expect(result.allowed).toBe(false);
  expect(result.html).not.toContain('data-tribeca-media-activate-v264');
});

test('La política es pública incluso sin iniciar sesión',async({page})=>{
  await page.goto(origin+'politica-cookies.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('h1')).toContainText('Política de cookies');
  await expect(page.locator('button[data-tribeca-cookies-manage]')).toBeVisible();
  await page.locator('button[data-tribeca-cookies-manage]').click();
  await expect(page.locator('#tribeca-cookie-panel-v264')).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
});
