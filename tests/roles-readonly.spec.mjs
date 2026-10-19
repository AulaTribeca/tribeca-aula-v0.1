import { test, expect } from '@playwright/test';
import { QA_IDS, QA_CLASS_NAME, QA_SUBJECT_NAME, installQaBrowserFixture } from './fixtures/browser-classroom.mjs';

// Se prueban cuentas QA, nunca perfiles reales del alumnado.
const accounts = {
  student: {
    username: process.env.TRIBECA_AUDIT_STUDENT_USER,
    password: process.env.TRIBECA_AUDIT_STUDENT_PASSWORD,
  },
  teacher: {
    username: process.env.TRIBECA_AUDIT_TEACHER_USER,
    password: process.env.TRIBECA_AUDIT_TEACHER_PASSWORD,
  },
};

async function logIn(page, role) {
  const account = accounts[role];
  if (!account?.username || !account?.password) {
    throw new Error('Faltan secretos de la cuenta de auditoría solicitada.');
  }
  const response = await page.goto('./#inicio', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  const form = page.locator('#t16LoginForm');
  await expect(form).toBeVisible({ timeout: 45_000 });
  await form.locator('[name="username"]').fill(account.username);
  await form.locator('[name="password"]').fill(account.password);
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('body')).not.toHaveClass(/auth-locked/, { timeout: 60_000 });
  await expect(page.locator('main#inicio')).toBeVisible();
  await expect(page.locator('#tribecaAuthOverlay')).toBeHidden();
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <=
    document.documentElement.clientWidth + 2);
}

test.describe('Cuenta QA alumno: acceso sin escrituras', () => {
  test.skip(!accounts.student.username || !accounts.student.password, 'Sin secretos de alumno QA.');
  test('Inicia sesión con su perfil y mantiene la interfaz navegable', async ({ page }) => {
    await logIn(page, 'student');
    await expect(page.locator('main#inicio')).toBeVisible();
    await expect(page.locator('.teacher-dashboard')).toHaveCount(0);
    expect(await noHorizontalOverflow(page), 'Desbordamiento horizontal en alumno QA').toBeTruthy();
  });

  test('Clase, materia, publicaciones y recurso HTML solo en memoria QA', async ({ page }) => {
    await logIn(page, 'student');

    // Evitar falsos positivos: la cuenta QA comienza sin ninguna clase real.
    const productionState = await page.evaluate(() => {
      const state = window.TribecaAuth;
      return {
        ownClassCount: (state?.data?.classStudents || []).filter(row =>
          row.user_id === state?.profile?.id && row.active !== false).length,
        username: state?.profile?.username,
      };
    });
    expect(productionState.username).toBe('tribeca_qa_alumno');
    expect(productionState.ownClassCount,
      'La cuenta de auditoría no debe estar matriculada en ninguna clase real').toBe(0);

    // El estado sintético jamás toca las tablas reales de Supabase.
    const blockedWriteTables = new Set([
      'tribeca_classes', 'tribeca_class_students', 'tribeca_class_subjects',
      'tribeca_class_units', 'subject_materials', 'material_completions',
      'exam_attempts', 'grades', 'payment_months', 'student_schedules'
    ]);
    const writes = [];
    page.on('request', req => {
      const method = req.method();
      if (!['POST','PATCH','PUT','DELETE'].includes(method)) return;
      const url = new URL(req.url());
      const table = url.pathname.split('/').pop();
      if (url.pathname.includes('/rest/v1/') && blockedWriteTables.has(table)) {
        writes.push(table); // Nunca conservar ni imprimir cuerpos de peticiones.
      }
    });

    const injected = await installQaBrowserFixture(page);
    expect(injected).toEqual({ installed: true, fixtureRecords: 6, userRole: 'student' });

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

    const textMaterial = page.locator(`details.material-collapse-card[data-t180-material-card="${QA_IDS.materialId}"]`);
    await expect(textMaterial).toBeVisible();
    await textMaterial.locator('summary').click();
    await expect(textMaterial).toHaveAttribute('open', '');
    await expect(textMaterial).toContainText('1/2 + 1/2 = 1.');
    await expect(textMaterial.locator('summary .material-expand-hint')).toHaveText(/Cerrar|Pechar|Close/);

    const interactive = page.locator(`details.material-collapse-card[data-t180-material-card="${QA_IDS.interactiveId}"]`);
    await expect(interactive).toBeVisible();
    await interactive.locator('summary').click();
    await expect(interactive).toHaveAttribute('open', '');

    const frame = interactive.frameLocator('iframe[title="Recurso interactivo"]');
    await expect(frame.locator('#qa-interactive-proof')).toBeVisible({ timeout: 20_000 });
    await frame.locator('#qa-check').click();
    await expect(frame.locator('#qa-answer')).toHaveText('Funciona');

    expect(writes, 'Ninguna prueba puede escribir contenidos ni datos académicos').toEqual([]);
    expect(await noHorizontalOverflow(page), 'Desbordamiento horizontal en el aula de prueba').toBeTruthy();
  });
});

test.describe('Cuenta QA profesora: acceso sin escrituras', () => {
  test.skip(!accounts.teacher.username || !accounts.teacher.password, 'Sin secretos de profesora QA.');
  test('Tiene panel docente y herramientas esenciales visibles', async ({ page }) => {
    await logIn(page, 'teacher');
    const dashboard = page.locator('.teacher-dashboard');
    await expect(dashboard).toBeVisible();
    for (const action of ['studentProfiles','classrooms','payments','attendance']) {
      await expect(dashboard.locator(`.t16-tool-card[data-t16-tool="${action}"]`)).toBeVisible();
    }
    await expect(dashboard.locator('.teacher-quick-class-card').first()).toBeVisible();
    expect(await noHorizontalOverflow(page), 'Desbordamiento horizontal en profesora QA').toBeTruthy();
    // No abrir formularios de pago, cambiar clases, alterar perfiles ni publicar.
  });
});
