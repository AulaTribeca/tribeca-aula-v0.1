import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const resource='recursos/lingua-galega-2eso-fernando-blanco-unidade-1-repaso-exame.html';
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

test('Lingua Galega: iframe aislado sigue ejecutando ejercicios sin permiso de DOM padre',async({page,baseURL})=>{
  await page.goto('about:blank');
  const src=new URL(resource,baseURL).href;
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
  expect(index).toContain('tribeca-publisher-v262.js?v=263.2');
  const authScripts=[...index.matchAll(/<script\s+src="(supabase-auth\.js\?v=[^"]+)"/g)];
  expect(authScripts).toHaveLength(1);
  expect(sw.includes('./'+authScripts[0][1]), 'La caché debe incluir el script de acceso vigente').toBe(true);
  const version=index.match(/data-ui-version="([^"]+)"/)?.[1];
  expect(version).toBeTruthy();
  expect(sw.includes('tribeca-aula-static-v'+version.replace(/\./g,'-')), 'La caché y la interfaz deben compartir versión').toBe(true);
  expect(sourceAuth).toContain('db4a66ff-2114-489f-ab70-a647b75e6bd9');
});

const storageHtml='https://fuhkvjyfwkggjaqxfsgv.supabase.co/storage/v1/object/public/tribeca-public-assets/qa/index.html';
test('HTML de Storage servido como texto: ejecuta ejercicios y aísla DOM y sesión',async({page})=>{
  await page.route(storageHtml,route=>route.fulfill({status:200,contentType:'text/plain',headers:{'access-control-allow-origin':'*','content-security-policy':"default-src 'none'; sandbox"},body:`<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><h1>Ejercicio de prueba</h1><button id="check">Corregir</button><p id="answer"></p><p id="isolation"></p><script>
  let blocked=0;try{parent.document.body.dataset.compromised='yes'}catch(e){blocked++}if(localStorage.getItem('qa-session')===null)blocked++;localStorage.setItem('activity-answer','14');
  document.getElementById('isolation').textContent=String(blocked);
  document.getElementById('check').onclick=()=>document.getElementById('answer').textContent='Correcto';
  </script></body></html>`}));
  await page.route('**/qa/style.css',route=>route.fulfill({contentType:'text/css',body:'h1 { color: rgb(11, 75, 53); }'}));
  await page.goto('./');
  await page.evaluate(()=>localStorage.setItem('qa-session','private-test-sentinel'));
  await page.goto('./tribeca-package-viewer.html?'+new URLSearchParams({url:storageHtml}));
  const frame=page.frameLocator('#resourceFrame');
  await expect(frame.locator('h1')).toHaveText('Ejercicio de prueba');
  await expect(frame.locator('h1')).toHaveCSS('color','rgb(11, 75, 53)');
  await frame.locator('#check').click();
  await expect(frame.locator('#answer')).toHaveText('Correcto');
  await expect(frame.locator('#isolation')).toHaveText('2');
  await expect(page.locator('#resourceFrame')).not.toHaveAttribute('sandbox',/allow-same-origin/);
  expect(await page.locator('body').getAttribute('data-compromised')).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('activity-answer'))).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('qa-session'))).toBe('private-test-sentinel');
});

test('Visor rechaza hosts suplantados y protocolos ejecutables sin ofrecer enlaces peligrosos',async({page})=>{
  for(const source of [storageHtml.replace('fuhkvjyfwkggjaqxfsgv.supabase.co','evil.example'), 'javascript:alert(1)']){
    await page.goto('./tribeca-package-viewer.html?'+new URLSearchParams({url:source}));
    await expect(page.getByRole('heading',{name:'No se pudo abrir el recurso'})).toBeVisible();
    await expect(page.locator('#resourceFrame')).toHaveCount(0);
    await expect(page.getByRole('link',{name:'Abrir archivo original'})).toHaveCount(0);
  }
});

test('Paquete de varias páginas: enlaces HTML, regreso y respuestas conservadas',async({page},testInfo)=>{
  const root='https://fuhkvjyfwkggjaqxfsgv.supabase.co/storage/v1/object/public/tribeca-public-assets/qa/';
  await page.route(root+'**',route=>{
    const second=route.request().url().endsWith('page2.html');
    return route.fulfill({contentType:'text/plain',headers:{'access-control-allow-origin':'*'},body:`<!doctype html><html><body><h1>${second?'Segunda página':'Primera página'}</h1><label>Respuesta<input id="answer"></label><a href="${second?'index.html':'page2.html'}">Siguiente</a></body></html>`});
  });
  await page.goto('./tribeca-package-viewer.html?'+new URLSearchParams({url:root+'index.html',title:'Paquete de prueba'}));
  const first=page.frameLocator('#resourceFrame');
  await expect(first.locator('h1')).toHaveText('Primera página');
  await first.getByLabel('Respuesta').fill('Respuesta de la primera página');
  await first.getByRole('link',{name:'Siguiente'}).click();
  await expect(page.frameLocator('#resourceFrame').locator('h1')).toHaveText('Segunda página');
  await expect(page.frameLocator('#resourceFrame').getByLabel('Respuesta')).toHaveValue('');
  await page.getByRole('button',{name:'Anterior',exact:true}).click();
  await expect(page.frameLocator('#resourceFrame').getByLabel('Respuesta')).toHaveValue('Respuesta de la primera página');
  await expect(page.getByRole('button',{name:'Anterior',exact:true})).toBeDisabled();
  await expect(page.getByRole('link',{name:'Volver al aula'})).toHaveAttribute('href','./');
  const nav=page.getByRole('navigation',{name:'Navegación del recurso'});
  expect(await nav.locator('a,button').evaluateAll(els=>Math.min(...els.map(el=>el.getBoundingClientRect().height)))).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  // A message from the wrapper itself must not be accepted as a resource click.
  await page.evaluate(url=>window.postMessage({type:'TRIBECA_RESOURCE_NAVIGATE',url},'*'),root+'page2.html');
  await expect(page.frameLocator('#resourceFrame').locator('h1')).toHaveText('Primera página');
  if(process.env.TRIBECA_QA_SCREENSHOTS==='1') await page.screenshot({path:testInfo.outputPath('teacher-classroom.png')});
});
