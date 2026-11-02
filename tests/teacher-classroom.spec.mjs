import { test, expect } from '@playwright/test';
import { QA_IDS, installAnonymousSyntheticStudent } from './fixtures/browser-classroom.mjs';

test('Detalle docente ficticio: legibilidad, teclado y apertura de recurso', async ({ page }, testInfo) => {
  await page.route(/\/rest\/v1\//, route => route.abort());
  await page.goto('./#inicio', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#t16LoginForm')).toBeVisible({timeout:45000});
  await installAnonymousSyntheticStudent(page);
  await page.evaluate(({classId}) => {
    const state=window.TribecaAuth;
    if(state.client || state.session || state.profile.username!=='tribeca_qa_alumno') throw new Error('Requiere contexto ficticio');
    state.profile.role='teacher';
    document.body.classList.add('is-teacher');
    window.TribecaRenderInlineSection('classroomDetail',{classId});
  },{classId:QA_IDS.classId});
  const detail=page.locator('.classroom-detail-v92');
  await expect(detail).toBeVisible();
  const subject=detail.locator('.classroom-subject-card-v92');
  await subject.locator(':scope > summary').click();
  const title=subject.getByLabel('Nombre de la unidad');
  await expect(title).toBeVisible();
  await subject.locator('.classroom-unit-card-v92 > summary').click();
  const controls=await detail.locator('button:visible, input[name="title"]:visible').evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)})));
  expect(controls.length).toBeGreaterThan(3);
  expect(Math.min(...controls.map(el=>el.height))).toBeGreaterThanOrEqual(44);
  expect(Math.min(...controls.map(el=>el.font))).toBeGreaterThanOrEqual(14);
  expect(await title.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  await title.focus(); await page.keyboard.press('Tab');
  await expect(subject.getByRole('button',{name:'Añadir unidad',exact:true})).toBeFocused();
  await page.evaluate(()=>window.scrollTo(0,0));
  await expect.poll(()=>page.evaluate(()=>document.querySelector('.classroom-detail-hero-v92').getBoundingClientRect().top-document.querySelector('#appHeader').getBoundingClientRect().bottom), {message:'El encabezado no debe tapar el título de la clase'}).toBeGreaterThanOrEqual(-2);
  if(process.env.TRIBECA_QA_SCREENSHOTS==='1') await page.screenshot({path:testInfo.outputPath('teacher-classroom.png'),fullPage:true});
  const row=subject.locator('.classroom-material-row').filter({hasText:'Actividad interactiva de prueba QA'});
  // En táctil puede utilizar el visor interno en vez de una pestaña nueva.
  const popupPromise=page.waitForEvent('popup',{timeout:5000}).catch(()=>null);
  await row.getByRole('button',{name:'Abrir',exact:true}).click();
  const popup=await popupPromise;
  const target=popup||page;
  const frame=popup ? target.frameLocator('iframe').last() : target;
  await expect(frame.locator('#qa-interactive-proof')).toBeVisible();
  await frame.locator('#qa-check').click();
  await expect(frame.locator('#qa-answer')).toHaveText('Funciona');
});

test('Abrir material HTML de Storage desde el aula usa el visor también en táctil',async({page,context})=>{
  const url='https://fuhkvjyfwkggjaqxfsgv.supabase.co/storage/v1/object/public/tribeca-public-assets/qa/open.html';
  await context.route(url,route=>route.fulfill({contentType:'text/plain',headers:{'access-control-allow-origin':'*'},body:'<!doctype html><html><body><h1 id="storage-proof">Actividad de Storage</h1></body></html>'}));
  await page.route(/\/rest\/v1\//,route=>route.abort());
  await page.goto('./');
  await expect(page.locator('#t16LoginForm')).toBeVisible();
  await installAnonymousSyntheticStudent(page);
  await page.evaluate(({id,classId,url})=>{
    const state=window.TribecaAuth;
    if(state.client || state.session) throw new Error('Requiere contexto ficticio');
    const m=state.data.materials.find(m=>m.id===id);m.embed_code='';m.embed_url=url;
    state.profile.role='teacher';document.body.classList.add('is-teacher');
    window.TribecaRenderInlineSection('classroomDetail',{classId});
  },{id:QA_IDS.interactiveId,classId:QA_IDS.classId,url});
  const subject=page.locator('.classroom-subject-card-v92');
  await subject.locator(':scope > summary').click();
  await subject.locator('.classroom-unit-card-v92 > summary').click();
  const pop=page.waitForEvent('popup',{timeout:5000}).catch(()=>null);
  await subject.locator('.classroom-material-row').filter({hasText:'Actividad interactiva de prueba QA'}).getByRole('button',{name:'Abrir',exact:true}).click();
  const popup=await pop;
  const resource=popup ? popup.frameLocator('iframe').frameLocator('#resourceFrame') : page.frameLocator('#resourceFrame');
  await expect(resource.locator('#storage-proof')).toHaveText('Actividad de Storage');
});
