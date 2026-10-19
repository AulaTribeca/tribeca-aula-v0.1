import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  QA_IDS, QA_CLASS_NAME, QA_SUBJECT_NAME, installAnonymousSyntheticStudent
} from './fixtures/browser-classroom.mjs';

// Tests sin credenciales ni acceso a datos de menores. Todo es memoria local.
test('Aula ficticia: navegación de clase, materia, unidad y publicación', async ({ page }) => {
  // Una defensa adicional: las peticiones PostgREST no salen al exterior.
  await page.route(/\/rest\/v1\//, route => route.abort());
  // Vista previa exclusiva de CI: sirve la versión propuesta del puente
  // desde el checkout de la rama, nunca cambia GitHub Pages ni Supabase.
  if (process.env.TRIBECA_AUDIT_PREVIEW_FIX === '1') {
    const fixedProgress = await readFile(new URL('../resource-progress.js', import.meta.url), 'utf8');
    await page.route('**/resource-progress.js*', route => route.fulfill({
      status: 200, contentType: 'application/javascript; charset=utf-8',
      body: fixedProgress,
    }));
  }
  await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#t16LoginForm')).toBeVisible({ timeout: 45_000 });

  await installAnonymousSyntheticStudent(page);

  const classroom = page.locator(`.student-classroom-card-v232[data-student-class-id="${QA_IDS.classId}"]`);
  await expect(classroom).toBeVisible();
  await expect(classroom).toContainText(QA_CLASS_NAME);
  await classroom.click();

  const subject = page.locator(`.student-class-detail-v232 .class-subject-card[data-class-subject="${QA_IDS.subjectId}"]`);
  await expect(subject).toBeVisible();
  await expect(subject).toContainText(QA_SUBJECT_NAME);
  await subject.click();

  const unit = page.locator('details.subject-unit-card').filter({ hasText: 'Unidad QA 1 · Fracciones' });
  await expect(unit).toBeVisible();
  await expect(unit).toHaveAttribute('open', '');

  const plain = page.locator(`details.material-collapse-card[data-t180-material-card="${QA_IDS.materialId}"]`);
  await expect(plain).toBeVisible();
  await plain.locator('summary').click();
  await expect(plain).toHaveAttribute('open', '');
  await expect(plain).toContainText('1/2 + 1/2 = 1.');

  const visual = page.locator(`details.material-collapse-card[data-t180-material-card="${QA_IDS.interactiveId}"]`);
  await expect(visual).toBeVisible();
  await visual.locator('summary').click();
  await expect(visual).toHaveAttribute('open', '');
  const embed = visual.frameLocator('iframe[title="Recurso interactivo"]');
  await expect(embed.locator('#qa-interactive-proof')).toBeVisible({ timeout: 20_000 });
  await embed.locator('#qa-check').click();
  await expect(embed.locator('#qa-answer')).toHaveText('Funciona');

  const width = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(width, 'La navegación de QA no debe provocar scroll horizontal').toBeLessThanOrEqual(2);
});
