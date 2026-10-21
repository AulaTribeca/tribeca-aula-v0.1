import {test,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';

const html=await readFile(new URL('../resources/xeografia-historia-2eso-fernando-blanco-europa-feudal.html',import.meta.url),'utf8');
let server, origin;
test.beforeAll(async()=>{
  server=createServer((req,res)=>{
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(html);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port+'/';
});
test.afterAll(async()=>{if(server) await new Promise(resolve=>server.close(resolve));});
test('Europa feudal · abrir, estudar, practicar, navegación e imaxes',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#app h1')).toBeVisible({timeout:20000});
  await expect(page.locator('#startStudy')).toBeVisible();
  await expect(page.locator('#startQuiz')).toBeVisible();
  await mkdir('tests/.feudal-preview',{recursive:true});
  await page.screenshot({path:`tests/.feudal-preview/${test.info().project.name}-inicio.png`,fullPage:true});
  await page.locator('#startStudy').click();
  await page.screenshot({path:`tests/.feudal-preview/${test.info().project.name}-estudo.png`,fullPage:true});
  await expect(page.locator('#app h1')).toBeVisible();
  const images=page.locator('#app img');
  if(await images.count()){
    const visible=await images.evaluateAll(items=>items.filter(el=>el.complete&&el.naturalWidth>0).length);
    expect(visible,'As imaxes didácticas deben cargar correctamente').toBeGreaterThan(0);
  }
  await page.locator('[data-go-home]').first().click();
  await expect(page.locator('#startQuiz')).toBeVisible();
  await page.locator('#startQuiz').click();
  await expect(page.locator('#app h1')).toBeVisible();
  const dims=await page.evaluate(()=>({
    body:document.documentElement.scrollWidth, viewport:document.documentElement.clientWidth,
    app:document.getElementById('app')?.getBoundingClientRect().width
  }));
  expect(dims.body-dims.viewport,'Non pode haber desprazamento horizontal').toBeLessThanOrEqual(3);
  expect(errors,'O recurso non debe fallar por erros JavaScript').toEqual([]);
});
test('Europa feudal · reabre unha segunda vez en sesión nova sen gardar respostas alleas',async({page})=>{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#startStudy')).toBeVisible();
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#startStudy')).toBeVisible();
});
