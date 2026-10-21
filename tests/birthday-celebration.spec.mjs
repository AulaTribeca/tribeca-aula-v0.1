import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const birthdayJS = await readFile(new URL('../tribeca-birthday-v259.js',import.meta.url),'utf8');
const birthdayCSS = await readFile(new URL('../tribeca-birthday-v259.css',import.meta.url),'utf8');

// Datos sintéticos: ninguna credencial, cuenta real ni fecha de nacimiento real.
async function demo(page) {
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html lang="gl"><body><main id="inicio"><h1>Tribeca Aula QA</h1></main><select id="languageSelect"><option value="gl" selected>Galego</option><option value="es">Castellano</option></select></body></html>');
  await page.addStyleTag({content:birthdayCSS});
  await page.addScriptTag({content:birthdayJS});
}
const fakeBirthday = page => page.evaluate(() => {
  const today=window.TribecaBirthdayV259.madridDate(new Date());
  return {
    id:'synthetic-student-259',role:'student',active:true,
    full_name:'Noa Ficticia',birth_date:'2013-'+String(today.month).padStart(2,'0')+'-'+String(today.day).padStart(2,'0')
  };
});

test('La felicitación aparece para el alumno y no altera la navegación',async ({page})=>{
  await demo(page);
  const person=await fakeBirthday(page);
  await page.evaluate(p=>window.TribecaBirthdayV259.onProfile(p,{teacher:false,paused:false}),person);
  const card=page.locator('#tribeca-birthday-v259 .tribeca-birthday-card-v259');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Parabéns, Noa!');
  await expect(page.locator('#tribeca-birthday-v259 .tribeca-birthday-particle-v259')).toHaveCount(52);
  await expect(page.locator('#inicio h1')).toBeVisible();
  const style=await page.locator('#tribeca-birthday-v259').evaluate(el=>getComputedStyle(el).pointerEvents);
  expect(style).toBe('none');
  const width=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(width).toBeLessThanOrEqual(2);
});

test('Una celebración por entrada; al salir y volver a entrar se repite',async ({page})=>{
  await demo(page);
  const person=await fakeBirthday(page);
  await page.evaluate(p=>window.TribecaBirthdayV259.onProfile(p,{}),person);
  await expect(page.locator('#tribeca-birthday-v259')).toHaveCount(1);
  await page.locator('.tribeca-birthday-close-v259').click();
  await page.evaluate(p=>window.TribecaBirthdayV259.onProfile(p,{}),person);
  await expect(page.locator('#tribeca-birthday-v259')).toHaveCount(0);
  await page.evaluate(p=>{
    window.TribecaBirthdayV259.onProfile(null);
    window.TribecaBirthdayV259.onProfile(p,{});
  },person);
  await expect(page.locator('#tribeca-birthday-v259')).toHaveCount(1);
});

test('Nunca felicita a profesora, alumno de otro día o alumno en pausa',async ({page})=>{
  await demo(page);
  const person=await fakeBirthday(page);
  await page.evaluate(p=>{
    window.TribecaBirthdayV259.onProfile({...p,role:'teacher'},{teacher:false});
    window.TribecaBirthdayV259.onProfile({...p,role:'student'},{paused:true});
    let date=p.birth_date.split('-');
    date[1]=date[1]==='12'?'01':String(Number(date[1])+1).padStart(2,'0');
    window.TribecaBirthdayV259.onProfile({...p,birth_date:date.join('-')},{});
  },person);
  await expect(page.locator('#tribeca-birthday-v259')).toHaveCount(0);
});

test('El movimiento reducido y el modo concentración eliminan la lluvia',async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await demo(page);
  const person=await fakeBirthday(page);
  await page.evaluate(p=>window.TribecaBirthdayV259.onProfile(p,{}),person);
  await expect(page.locator('#tribeca-birthday-v259 .tribeca-birthday-card-v259')).toBeVisible();
  await expect(page.locator('#tribeca-birthday-v259 .tribeca-birthday-particle-v259')).toHaveCount(0);
  await page.evaluate(()=>window.TribecaBirthdayV259.onProfile(null));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(p=>{
    document.body.classList.add('is-focus-mode');
    window.TribecaBirthdayV259.onProfile(p,{});
  },person);
  await expect(page.locator('#tribeca-birthday-v259 .tribeca-birthday-particle-v259')).toHaveCount(0);
});

test('Zona horaria madrileña y cumpleaños de 29 de febrero',async ({page})=>{
  await demo(page);
  const values=await page.evaluate(()=>{
    const api=window.TribecaBirthdayV259;
    return {
      midnight:api.madridDate(new Date('2026-10-21T22:30:00Z')),
      leap:api.isBirthday({birth_date:'2012-02-29'},new Date('2028-02-29T12:00:00Z')),
      nonLeap:api.isBirthday({birth_date:'2012-02-29'},new Date('2027-02-28T12:00:00Z')),
      invalid:api.birthdayParts({birth_date:'2012-02-31'})
    };
  });
  expect(values.midnight.key).toBe('2026-10-22');
  expect(values.leap).toBe(true);
  expect(values.nonLeap).toBe(false);
  expect(values.invalid).toBeNull();
});

test('Mensaje y nombre ficticio se incorporan como texto, no HTML',async ({page})=>{
  await demo(page);
  const person=await fakeBirthday(page);
  person.preferred_name='<img src=x onerror=alert(1)>';
  await page.evaluate(p=>window.TribecaBirthdayV259.onProfile(p,{}),person);
  await expect(page.locator('#tribeca-birthday-v259 img')).toHaveCount(0);
  await expect(page.locator('#tribeca-birthday-v259 .tribeca-birthday-title-v259')).toContainText('<img');
});
