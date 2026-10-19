// Escenario sintético: solo existe dentro de la memoria de la página Playwright.
// No se insertan clases, materias, alumnos ni publicaciones en Supabase.
export const QA_IDS = Object.freeze({
  classId: '95000000-0000-4000-8000-000000000001',
  subjectId: '95000000-0000-4000-8000-000000000002',
  unitId: '95000000-0000-4000-8000-000000000003',
  materialId: '95000000-0000-4000-8000-000000000004',
  interactiveId: '95000000-0000-4000-8000-000000000005',
});
export const QA_CLASS_NAME = 'Aula ficticia de auditoría';
export const QA_SUBJECT_NAME = 'Matemáticas';

export async function installQaBrowserFixture(page) {
  return page.evaluate(({ ids, className, subjectName }) => {
    const state = window.TribecaAuth;
    if (!state || state.profile?.username !== 'tribeca_qa_alumno' || state.profile.role !== 'student') {
      throw new Error('Solo puede instalarse el ensayo con el perfil QA de alumno.');
    }
    const userId = state.profile.id;
    const now = '2026-10-19T10:00:00.000Z';
    const classroom = {
      id: ids.classId, name: className, center: 'Centro ficticio QA',
      stage: 'ESO', course: '1.º ESO', academic_year: '2026-2027',
      active: true, hidden: false, created_at: now,
    };
    const enrollment = {
      id: '95000000-0000-4000-8000-000000000006',
      user_id: userId, class_id: ids.classId, active: true,
    };
    const subject = {
      id: ids.subjectId, class_id: ids.classId,
      subject: subjectName, sort_order: 1, active: true, hidden: false,
    };
    const unit = {
      id: ids.unitId, class_subject_id: ids.subjectId,
      title: 'Unidad QA 1 · Fracciones', sort_order: 1,
      active: true, hidden: false,
    };
    const baseMaterial = {
      class_id: ids.classId, class_subject_id: ids.subjectId,
      class_unit_id: ids.unitId, subject: subjectName,
      unit_title: unit.title, active: true, hidden: false,
      target_scope: 'all', target_user_ids: [],
      created_at: now, attachments: [], _metadata_only_v237: false,
    };
    const textMaterial = {
      ...baseMaterial, id: ids.materialId, material_type: 'material',
      title: 'Lectura de prueba QA',
      body: 'Documento de ensayo totalmente ficticio: 1/2 + 1/2 = 1.',
      sort_order: 1,
    };
    const interactiveMaterial = {
      ...baseMaterial, id: ids.interactiveId, material_type: 'game',
      title: 'Actividad interactiva de prueba QA',
      body: 'Ejemplo de recurso embebido, sin persistencia ni notas.',
      embed_code: '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="qa-interactive-proof"><h1>Recurso QA cargado</h1><button type="button" id="qa-check">Comprobar</button><output id="qa-answer"></output></main><script>document.getElementById("qa-check").addEventListener("click",function(){document.getElementById("qa-answer").textContent="Funciona";});</script></body></html>',
      sort_order: 2,
    };

    for (const [field, rows] of [
      ['classrooms', [classroom]],
      ['classStudents', [enrollment]],
      ['classSubjects', [subject]],
      ['classUnits', [unit]],
      ['materials', [textMaterial, interactiveMaterial]],
    ]) {
      const original = Array.isArray(state.data[field]) ? state.data[field] : [];
      if (original.some(row => rows.some(fixture => String(row.id) === String(fixture.id)))) {
        throw new Error('El identificador sintético ha colisionado con datos reales.');
      }
      // La sustitución ocurre únicamente en el estado JS del navegador QA.
      state.data[field] = [...original, ...rows];
    }
    if (typeof window.openTool !== 'function') {
      throw new Error('La aplicación no dispone de navegación interactiva.');
    }
    // Vuelve a renderizar con el estado de ensayo, sin recargar ni guardar.
    window.openTool('home');
    return { installed: true, fixtureRecords: 6, userRole: state.profile.role };
  }, { ids: QA_IDS, className: QA_CLASS_NAME, subjectName: QA_SUBJECT_NAME });
}

/** Inicio artificial del panel sin autenticación y sin consultar datos privados.
 *  Únicamente se usa en CI público para probar la interfaz. Nunca persiste.
 */
export async function installAnonymousSyntheticStudent(page) {
  const ready = await page.evaluate(() => {
    const state = window.TribecaAuth;
    if (!state || state.profile || state.user) {
      throw new Error('El escenario anónimo requiere una sesión sin autenticar.');
    }
    const syntheticId = '95000000-0000-4000-8000-000000000007';
    state.user = { id: syntheticId };
    state.profile = {
      id: syntheticId, username: 'tribeca_qa_alumno',
      role: 'student', full_name: 'Alumno ficticio de pruebas',
      preferred_name: 'QA', avatar_icon: 'Q', active: true, archived: false,
      center: 'Centro ficticio QA', stage: 'ESO', course: '1.º ESO',
      focus_mode_enabled: false, ui_preferences: {}
    };
    const overlay = document.querySelector('#tribecaAuthOverlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('auth-locked');
    return true;
  });
  if (!ready) throw new Error('No se pudo iniciar el contexto anónimo de pruebas.');
  return installQaBrowserFixture(page);
}
