import { test, expect } from '@playwright/test';

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

  test('Clases y publicación de QA, si existe una clase de ensayo aislada', async ({ page }) => {
    test.skip(process.env.TRIBECA_AUDIT_CLASS_FIXTURE !== '1',
      'Pendiente: el aula QA aislada no existe en producción. Nunca utilizar clases de menores para suplirla.');
    await logIn(page, 'student');
    const classes = page.locator('.student-classroom-card-v232[data-student-class-id]');
    await expect(classes.first()).toBeVisible();
    await classes.first().click();
    const subjects = page.locator('.student-class-detail-v232 .class-subject-card');
    await expect(subjects.first()).toBeVisible();
    await subjects.first().click();
    const publications = page.locator('details.material-collapse-card');
    await expect(publications.first()).toBeVisible();
    await publications.first().locator('summary').click();
    await expect(publications.first()).toHaveAttribute('open', '');
    // Nunca marcar materiales como completados ni enviar calificaciones.
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
