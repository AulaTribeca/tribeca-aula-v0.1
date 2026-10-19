import { test, expect } from '@playwright/test';

// Never commit real users, passwords, tokens or storageState. GitHub repository is public.
// One login per role/project only; login itself may write attendance-independent audit logs.
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
    throw new Error('Faltan secretos de la cuenta de pruebas del rol solicitado.');
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
}

function assertNoHorizontalOverflow(page) {
  return page.evaluate(() => {
    const pageWidth = document.documentElement.scrollWidth;
    const screenWidth = document.documentElement.clientWidth;
    return pageWidth <= screenWidth + 2;
  });
}

test.describe('Cuenta de alumno: navegación sin escrituras', () => {
  test.skip(!accounts.student.username || !accounts.student.password, 'No hay cuenta de prueba de alumno configurada.');
  test('Panel, clase, materia y despliegue de publicación', async ({ page }) => {
    await logIn(page, 'student');

    const classes = page.locator('.student-classroom-card-v232[data-student-class-id]');
    await expect(classes.first(), 'La cuenta de prueba debe tener una clase asignada').toBeVisible();
    await classes.first().click();

    const subjects = page.locator('.student-class-detail-v232 .class-subject-card');
    await expect(subjects.first(), 'La clase de prueba necesita una materia publicada').toBeVisible();
    await subjects.first().click();

    const publication = page.locator('details.material-collapse-card');
    await expect(publication.first(), 'La materia de prueba necesita al menos una publicación').toBeVisible();
    await publication.first().locator('summary').click();
    await expect(publication.first()).toHaveAttribute('open', '');

    // Intentionally do not press "Marcar como feita", save a grade or attempt an exam.
    // Do not click external links or download teaching materials during this first audit.
    expect(await assertNoHorizontalOverflow(page), 'Desbordamiento horizontal dentro del aula').toBeTruthy();
  });
});

test.describe('Cuenta docente: navegación sin escrituras', () => {
  test.skip(!accounts.teacher.username || !accounts.teacher.password, 'No hay cuenta de prueba de profesora configurada.');
  test('Panel docente, herramientas y clases visibles', async ({ page }) => {
    await logIn(page, 'teacher');
    const dashboard = page.locator('.teacher-dashboard');
    await expect(dashboard, 'La cuenta de prueba no parece tener rol docente').toBeVisible();
    await expect(dashboard.locator('.t16-tool-card[data-t16-tool="studentProfiles"]')).toBeVisible();
    await expect(dashboard.locator('.t16-tool-card[data-t16-tool="classrooms"]')).toBeVisible();
    await expect(dashboard.locator('.t16-tool-card[data-t16-tool="payments"]')).toBeVisible();
    await expect(dashboard.locator('.t16-tool-card[data-t16-tool="attendance"]')).toBeVisible();
    await expect(dashboard.locator('.teacher-quick-class-card').first()).toBeVisible();

    // Only inspect the dashboard; opening financial forms is a later, separate test.
    expect(await assertNoHorizontalOverflow(page), 'Desbordamiento horizontal del panel docente').toBeTruthy();
  });
});
