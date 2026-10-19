import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Las estructuras de prueba son 100% ficticias. Nunca se inicia sesión ni
// se leen datos privados, y jamás se guardan capturas/trazas en un repo público.
const visualCSS = await readFile(new URL('../tribeca-visual-system-v257.css', import.meta.url), 'utf8');
const keyboardHelper = await readFile(new URL('../tribeca-keyboard-activation-v257.js', import.meta.url), 'utf8');
const teacherFixture = `
<section class="teacher-dashboard t16-dashboard">
  <section class="teacher-welcome-panel teacher-welcome-panel-v114 window-panel">
    <div class="teacher-welcome-copy">
      <p class="eyebrow">Tribeca Aula</p><h2>Panel de prueba</h2>
      <p>Fecha ficticia</p><span>Semana de prueba</span>
    </div>
    <div class="teacher-week-summary">
      <h3>Eventos de la semana</h3>
      <div class="teacher-week-day"><strong>Lunes</strong><span>Sesión ficticia</span></div>
      <div class="teacher-week-day"><strong>Martes</strong><span>Recurso de prueba</span></div>
    </div>
    <article class="teacher-tasks-summary"><h3>Tareas</h3><p>Sin tareas</p></article>
  </section>
  <div class="section-heading"><h2>Panel docente</h2><div class="teacher-stats"><span>2 perfiles</span></div></div>
  <div class="t16-teacher-tools">
    ${Array.from({length: 4}, (_,i) => `<article class="t16-tool-card" role="button" tabindex="0"><span class="t16-tool-icon">✦</span><div><h3>Acción ${i+1}</h3><p>Descripción breve de la acción de pruebas.</p></div></article>`).join('')}
  </div>
  <section class="teacher-quick-classes window-panel">
    <div class="section-heading"><h2>Clases activas</h2><span>2 clases</span></div>
    <div class="teacher-quick-class-grid">
      ${Array.from({length: 4}, (_,i) => `<article class="teacher-quick-class-card" role="button" tabindex="0" style="--class-primary:#315e44;--class-soft:#eaf4eb"><div><p>2026-27</p><h3>Clase ficticia ${i+1}</h3><small>Centro de prueba</small></div><footer><span>2 alumnos</span><span>3 materias</span></footer></article>`).join('')}
    </div>
  </section>
</section>`;
const studentFixture = `
<section class="student-classroom-area-v232">
  <div class="student-classroom-grid-v232">
    <article class="student-classroom-card-v232" role="button" tabindex="0">
      <div class="student-class-card-main-v232"><p class="eyebrow">2026-27</p><h3>Clase ficticia</h3><p>Centro de prueba</p></div>
      <div class="student-class-card-meta-v232"><span>2 materias</span></div>
    </article>
  </div>
  <section class="student-class-detail-v232">
    <header class="student-class-detail-head-v232 panel"><div><h1>Clase ficticia</h1></div></header>
    <div class="student-class-detail-body-v232">
      <div class="section-heading"><h2>Mis materias</h2><span>1</span></div>
      <article class="class-subject-card" role="button" tabindex="0"><h3>Matemáticas</h3></article>
      <details class="material-collapse-card"><summary class="material-collapse-summary"><div class="material-summary-main"><h3 class="material-title-prominent">Recurso de prueba</h3></div><span class="material-expand-hint">Abrir</span></summary><div>Contenido ficticio</div></details>
    </div>
  </section>
</section>`;

async function initPreview(page, role) {
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#t16LoginForm')).toBeVisible({ timeout: 45_000 });
  await page.evaluate(({ role, html }) => {
    document.body.classList.toggle('is-teacher', role === 'teacher');
    // Contenido de demostración inyectado solo en el navegador de CI.
    document.querySelector('main#inicio').innerHTML = html;
  }, { role, html: role === 'teacher' ? teacherFixture : studentFixture });
  await page.addStyleTag({ content: visualCSS });
}

test('El panel docente tiene jerarquia y tipografia legibles sin desbordamiento de tarjetas', async ({ page }) => {
  await initPreview(page,'teacher');
  const metrics = await page.evaluate(() => {
    const card = document.querySelector('.t16-teacher-tools .t16-tool-card');
    const heading = card.querySelector('h3');
    const description = card.querySelector('p');
    const className = document.querySelector('.teacher-quick-class-card h3');
    const pill = document.querySelector('.teacher-quick-class-card footer span');
    const weekText = document.querySelector('.teacher-week-day span');
    const dashboard = document.querySelector('.teacher-dashboard');
    return {
      headingPx: parseFloat(getComputedStyle(heading).fontSize),
      descriptionPx: parseFloat(getComputedStyle(description).fontSize),
      classHeadingPx: parseFloat(getComputedStyle(className).fontSize),
      metaPx: parseFloat(getComputedStyle(pill).fontSize),
      weekPx: parseFloat(getComputedStyle(weekText).fontSize),
      cardWidth: card.getBoundingClientRect().width,
      cardScrollWidth: card.scrollWidth,
      layoutScrollWidth: dashboard.scrollWidth,
      layoutWidth: dashboard.clientWidth,
    };
  });
  expect(metrics.headingPx).toBeGreaterThanOrEqual(17);
  expect(metrics.descriptionPx).toBeGreaterThanOrEqual(13);
  expect(metrics.classHeadingPx).toBeGreaterThanOrEqual(17);
  expect(metrics.metaPx).toBeGreaterThanOrEqual(12);
  expect(metrics.weekPx).toBeGreaterThanOrEqual(13);
  expect(metrics.cardScrollWidth).toBeLessThanOrEqual(metrics.cardWidth + 2);
  expect(metrics.layoutScrollWidth).toBeLessThanOrEqual(metrics.layoutWidth + 3);
});

test('Las clases del alumno y las publicaciones son legibles y tienen objetivos tactiles', async ({ page }) => {
  await initPreview(page,'student');
  const metrics = await page.evaluate(() => {
    const classroom = document.querySelector('.student-classroom-card-v232');
    const title = classroom.querySelector('h3');
    const meta = classroom.querySelector('.student-class-card-meta-v232 span');
    const summary = document.querySelector('summary.material-collapse-summary');
    const root = document.querySelector('.student-classroom-area-v232');
    return {
      titlePx: parseFloat(getComputedStyle(title).fontSize),
      metaPx: parseFloat(getComputedStyle(meta).fontSize),
      summaryHeight: summary.getBoundingClientRect().height,
      rootWidth: root.clientWidth,
      rootScrollWidth: root.scrollWidth
    };
  });
  expect(metrics.titlePx).toBeGreaterThanOrEqual(18);
  expect(metrics.metaPx).toBeGreaterThanOrEqual(12);
  expect(metrics.summaryHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.rootWidth+3);
});

test('La propuesta visual no sustituye los temas alternativos ni los estados de foco', async ({page}) => {
  await initPreview(page,'teacher');
  const light = await page.locator('.t16-tool-card').first().evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => document.body.classList.add('is-focus-mode'));
  const focus = await page.locator('.t16-tool-card').first().evaluate(el => getComputedStyle(el).backgroundColor);
  // La regla v257 de tema claro no debe pintar encima del modo de concentración.
  expect(focus).not.toBe(light);
});

test('Enter y Espacio activan tarjetas no nativas una sola vez', async ({ page }) => {
  await initPreview(page, 'teacher');
  await page.evaluate(() => {
    window.__qaClicks = { tool:0, classCard:0 };
    const tool = document.querySelector('.t16-tool-card');
    const classroom = document.querySelector('.teacher-quick-class-card');
    tool.dataset.t16Tool = 'classrooms';
    classroom.dataset.t90OpenClass = 'qa-synthetic';
    tool.addEventListener('click', () => window.__qaClicks.tool++);
    classroom.addEventListener('click', () => window.__qaClicks.classCard++);
  });
  await page.addScriptTag({ content: keyboardHelper });
  const tool = page.locator('.t16-tool-card').first();
  await tool.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__qaClicks.tool)).toBe(1);
  const classroom = page.locator('.teacher-quick-class-card').first();
  await classroom.focus();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__qaClicks.classCard)).toBe(1);
});

test('La activacion de materias por teclado no interfiere con tarjetas ya gestionadas', async ({ page }) => {
  await initPreview(page, 'student');
  await page.evaluate(() => {
    window.__qaClicks = { subject:0, classroom:0 };
    const subject = document.querySelector('.class-subject-card');
    subject.dataset.classSubject = 'qa-synthetic';
    subject.classList.add('subject-card');
    subject.addEventListener('click', () => window.__qaClicks.subject++);
    document.querySelector('.student-classroom-card-v232').addEventListener('click',
      () => window.__qaClicks.classroom++);
  });
  await page.addScriptTag({ content: keyboardHelper });
  await page.locator('.class-subject-card').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__qaClicks.subject)).toBe(1);
  await page.locator('.student-classroom-card-v232').focus();
  await page.keyboard.press('Space');
  // Las tarjetas del alumno ya tienen su manejador propio: no añadir un segundo.
  expect(await page.evaluate(() => window.__qaClicks.classroom)).toBe(0);
});
