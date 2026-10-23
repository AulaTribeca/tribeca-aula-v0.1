import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const resource='recursos/lingua-galega-2eso-fernando-blanco-unidade-1-repaso-exame.html';
const root='https://aulatribeca.github.io/tribeca-aula-v0.1/';
const sourceJs=await readFile(new URL('../tribeca-publisher-v262.js',import.meta.url),'utf8');
const sourceAuth=await readFile(new URL('../supabase-auth.js',import.meta.url),'utf8');

test('Lingua Galega: recurso HTML real carga y funciona con navegación y ejercicio',async({page})=>{
  const failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  await page.goto('./'+resource,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#home h1')).toContainText('A lingua apréndese');
  await expect(page.locator('#nav button')).toHaveCount(7);
  await page.locator('#start').click();
  await expect(page.locator('#module')).toBeVisible();
  await expect(page.locator('#lesson-content')).not.toBeEmpty();
  await page.locator('#tab-practice').click();
  await expect(page.locator('#practice-pane')).toBeVisible();
  await expect(page.locator('#question-content')).not.toBeEmpty();
  await page.locator('#nav button[data-dest="review"]').click();
  await expect(page.locator('#review')).toBeVisible();
  await page.locator('#begin-review').click();
  await expect(page.locator('#review-quiz')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow,'El recurso no debe desbordar horizontalmente').toBeLessThanOrEqual(3);
  expect(failures).toEqual([]);
});

test('Lingua Galega: iframe aislado sigue ejecutando ejercicios sin permiso de DOM padre',async({page})=>{
  await page.goto('about:blank');
  const src=root+resource;
  await page.setContent('<!doctype html><html><body style="margin:0"><iframe id="lesson" title="Lingua Galega" sandbox="allow-scripts allow-forms allow-popups allow-downloads" style="width:100%;height:960px;border:0"></iframe></body></html>');
  await page.locator('iframe#lesson').evaluate((el,url)=>el.src=url,src);
  const frame=page.frameLocator('iframe#lesson');
  await expect(frame.locator('#home h1')).toContainText('A lingua apréndese',{timeout:25000});
  await frame.locator('#start').click();
  await expect(frame.locator('#module')).toBeVisible();
  await frame.locator('#tab-practice').click();
  await expect(frame.locator('#question-content')).not.toBeEmpty();
});

test('Publicador compatible: rechaza HTML pegado y enlaces inseguros, acepta URLs y JSON',async({page})=>{
  await page.goto('./',{waitUntil:'domcontentloaded'});
  await page.addScriptTag({content:sourceJs});
  const rows=await page.evaluate(()=>{
    const api=window.TribecaPublisherV262;
    return {
      pasted:api.check({kind:'presentation',code:'<!doctype html><html><script>alert(1)</script></html>'}),
      iframe:api.check({kind:'presentation',code:'<iframe src="https://x.example"></iframe>'}),
      bad:api.check({kind:'presentation',url:'http://example.org/curso.html'}),
      good:api.check({kind:'presentation',url:'https://example.org/curso.html'}),
      native:api.check({kind:'test',code:'tribeca-quiz-json::{"questions":[{"type":"single"}]}'}),
      noResource:api.check({kind:'presentation'})
    };
  });
  expect(rows.pasted.ok).toBe(false);
  expect(rows.iframe.ok).toBe(false);
  expect(rows.bad.ok).toBe(false);
  expect(rows.good.ok).toBe(true);
  expect(rows.native.ok).toBe(true);
  expect(rows.noResource.ok).toBe(false);
  expect(sourceAuth).toContain('tribeca-publisher-compatible-v262');
  expect(sourceAuth).toContain('name="resourceIndexFile"');
  expect(sourceAuth).toContain('name="resourceZipPackage"');
  expect(sourceAuth).toContain('window.TribecaPublisherV262?.check');
});

test('La fuente histórica no se duplica en el nuevo publicador',async()=>{
  const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const sw=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
  expect(index).toContain('tribeca-publisher-v262.js?v=262');
  expect(index).toContain('supabase-auth.js?v=262');
  expect(sw).toContain('tribeca-aula-static-v262');
  expect(sourceAuth).toContain('db4a66ff-2114-489f-ab70-a647b75e6bd9');
});
