import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../tribeca-student-payments-v263.js',import.meta.url),'utf8');
const styles=await readFile(new URL('../tribeca-student-payments-v263.css',import.meta.url),'utf8');
const app=await readFile(new URL('../supabase-auth.js',import.meta.url),'utf8');
const paid=[{month:'2026-10',amount:55,status:'paid',paid_date:'2026-10-14'}];
const pending=[{month:'2026-10',amount:55,status:'pending',paid_date:null}];

async function preview(page,raw) {
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main style="max-width:850px;margin:auto;padding:16px"><h1>Mi aula</h1><section id="clases" style="min-height:120px;border:1px solid #ddd;padding:20px;border-radius:12px">Mis clases · Recursos y actividades</section><div id="resumen"></div></main></body></html>');
  await page.addStyleTag({content:styles});
  await page.addScriptTag({content:source});
  await page.evaluate(data=>document.getElementById('resumen').innerHTML=window.TribecaStudentPaymentsV263.home(data),raw);
}

test('La mensualidad aparece debajo de las materias, no al principio',async({page})=>{
  expect(app).toContain("\${videoClassesHomePanel()}\${learningArea}\${window.TribecaStudentPaymentsV263?.home");
  expect(app).toContain("\${videoClassesHomePanel()}\${classHtml}\${window.TribecaStudentPaymentsV263?.home");
  await preview(page,paid);
  const info=page.locator('.student-monthly-summary-v263');
  await expect(info).toBeVisible();
  await expect(info).toContainText('55,00');
  await expect(info).toContainText('Pagado · 14/10/2026');
  await expect(info.locator('button')).toHaveText('Ver meses');
  const where=await page.evaluate(()=>{
    const classroom=document.getElementById('clases').getBoundingClientRect();
    const payment=document.querySelector('.student-monthly-summary-v263').getBoundingClientRect();
    const cs=getComputedStyle(document.querySelector('.student-monthly-summary-v263'));
    return {classBottom:classroom.bottom,paymentTop:payment.top,bg:cs.backgroundColor,shadow:cs.boxShadow,borderRadius:cs.borderRadius};
  });
  expect(where.paymentTop).toBeGreaterThanOrEqual(where.classBottom);
  expect(where.bg).toBe('rgba(0, 0, 0, 0)');
  expect(where.shadow).toBe('none');
  expect(where.borderRadius).toBe('0px');
  await expect(info.locator('.student-monthly-stats-v263')).toHaveCount(0);
  await expect(info.locator('h2')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Notas de la profesora');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  // Solo los elementos informativos previstos; no ofrece edición al alumno.
  await expect(info.locator('input,select,textarea')).toHaveCount(0);
});

test('Pendiente y sin datos: sin advertencias prominentes ni datos internos',async({page})=>{
  await preview(page,pending);
  const info=page.locator('.student-monthly-summary-v263');
  await expect(info).toContainText('Pendiente');
  await expect(info).not.toContainText('14/10/2026');
  await expect(info.locator('.student-monthly-state-v263')).not.toHaveClass(/is-paid/);
  await page.evaluate(()=>document.getElementById('resumen').innerHTML=window.TribecaStudentPaymentsV263.home(null));
  await expect(info).toContainText('Cargando…');
  await expect(info).not.toContainText('Pendiente');
});

test('El historial conserva solo mes importe estado y fecha',async({page})=>{
  await preview(page,paid);
  await page.evaluate((rows)=>document.getElementById('resumen').innerHTML=window.TribecaStudentPaymentsV263.detail(rows),[...paid,...pending]);
  const headers=await page.locator('.student-monthly-table-v263 thead th').allTextContents();
  expect(headers).toEqual(['Mes','Importe','Estado','Fecha de pago']);
  await expect(page.locator('.student-monthly-detail-v263 textarea')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Anotaciones');
  await expect(page.locator('main')).not.toContainText('Pago en efectivo');
});

test('El indicador mantiene el enlace accesible con teclado',async({page})=>{
  await preview(page,paid);
  const btn=page.getByRole('button',{name:'Consultar mis mensualidades'});
  await btn.focus();
  await expect(btn).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>document.activeElement?.tagName)).toBe('BODY');
});
