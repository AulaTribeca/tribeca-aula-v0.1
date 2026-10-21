import {test,expect} from '@playwright/test';

// Solo contenido didáctico público: sin credenciales ni datos personales.
// Verifica el HTML real servido desde GitHub Pages, no una maqueta.
const resource='recursos/lengua-2eso-fernando-blanco-tema-2-estudio-practica-interactivo.html';
const materialId='ad6a74c6-1e00-4dda-9d0a-811cc4a6ce9f';

test('Lengua 2.º ESO: inicio, tema, corrección, navegación y accesibilidad',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('./'+resource,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.hero h1')).toContainText('Estudia, practica y afianza');
  await expect(page.locator('#menu button')).toHaveCount(7);
  await expect(page.locator('#homeCards .study-card')).toHaveCount(5);
  await expect(page.locator('.stat .n').first()).toHaveText('5');
  const initialWidth=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(initialWidth,'No debe existir desplazamiento horizontal en el inicio').toBeLessThanOrEqual(2);
  await page.locator('#homeCards [data-open="comunicacion"]').click();
  await expect(page.locator('#comunicacionView')).toBeVisible();
  await page.locator('#comunicacionView input[name="c1"][value="1"]').check();
  await page.locator('#comunicacionView [data-check="c1"]').click();
  await expect(page.locator('#fb-c1')).toHaveClass(/ok/);
  await page.locator('#menu [data-target="home"]').click();
  const card=page.locator('#globalFlashcards .flashcard').first();
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-jump="final"]').click();
  await expect(page.locator('#finalView')).toBeVisible();
  await expect(page.locator('#finalActivities .activity')).toHaveCount(12);
  const finalWidth=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(finalWidth).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('Lengua 2.º ESO: visor en página nueva carga el HTML sin data URL',async({page})=>{
  const url='./tribeca-package-viewer.html?'+new URLSearchParams({
    url:new URL(resource,'https://aulatribeca.github.io/tribeca-aula-v0.1/').href,
    title:'Tema 2 · Lengua castellana',
    material:materialId
  }).toString();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const frame=page.frameLocator('iframe#resourceFrame');
  await expect(frame.locator('.hero h1')).toContainText('Estudia, practica y afianza',{timeout:25000});
  await expect(frame.locator('#homeCards .study-card')).toHaveCount(5);
});