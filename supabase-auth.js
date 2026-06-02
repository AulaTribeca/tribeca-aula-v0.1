/* Tribeca Aula · Versión 32 · insignias, etiquetas de publicaciones y contraste docente
   Mejora: reorganiza la asignación manual de insignias, añade etiquetas cromáticas por tipo de publicación
   y refuerza el contraste de las tarjetas de materias en la vista docente. */
(() => {
  'use strict';
  if (location.search && /(firstName|lastName|fullName|username|eventDate|monthlyFee|subject)=/.test(location.search)) {
    history.replaceState(null, '', location.pathname + location.hash);
  }

  const cfg = window.TRIBECA_SUPABASE || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(String(cfg.url || '')) && String(cfg.anonKey || '').length > 30;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const uid = () => (crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  const parseIso = iso => { const [y,m,d] = String(iso || todayIso()).slice(0,10).split('-').map(Number); return new Date(y || 2026, (m || 1)-1, d || 1); };
  const toIso = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate()+n); return d; };
  const startMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
  const fmtDate = iso => parseIso(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
  const fmtLongDate = iso => parseIso(iso).toLocaleDateString('es-ES', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const fmtDT = iso => iso ? new Date(iso).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
  const toast = (msg) => typeof window.showToast === 'function' ? window.showToast(msg) : alert(msg);

  const State = {
    client: null,
    session: null,
    user: null,
    profile: null,
    data: {},
    windows: new Map(),
    z: 5000,
    selectedDate: todayIso(),
    calendarMonth: startMonth(new Date()),
    selectedStudentId: null,
    selectedEventId: null,
    selectedGuidanceId: null,
    selectedSubjectStage: localStorage.getItem('tribeca-teacher-subject-stage') || 'ESO',
    selectedSubjectCourse: localStorage.getItem('tribeca-teacher-subject-course') || '1.º ESO',
    loadedAt: 0,
    activitySince: null,
    selfPause: null
  };
  window.TribecaAuth = State;
  const TRIBECA_TEACHER_PROFILE_IMAGE = 'assets/patricia-trillo-perfil.webp';
  function teacherProfileImageUrl(profile = State.profile) {
    if(!profile) return '';
    const isTeacher = profile.role === 'teacher' || String(profile.username || '').toLowerCase().includes('profesora');
    return profile.avatar_image_url || (isTeacher ? TRIBECA_TEACHER_PROFILE_IMAGE : '');
  }
  const UndoStack = [];
  const UNDO_TTL_MS = 15 * 60 * 1000;
  function pushUndo(label, fn){ if(typeof fn==='function') { UndoStack.push({label, fn, at: Date.now()}); toast(`Cambio realizado. Puedes deshacerlo durante 15 minutos: ${label}`); } }
  async function undoLast(){ const item = UndoStack.pop(); if(!item) return toast('No hay cambios recientes para deshacer.'); if(Date.now() - item.at > UNDO_TTL_MS) return toast('El plazo para deshacer este cambio ha caducado.'); try{ await item.fn(); await loadData(true); renderApp(); rerender(); toast(`Cambio deshecho: ${item.label}`); }catch(e){ console.error(e); toast(e.message || 'No se pudo deshacer el último cambio.'); } }
  window.TribecaUndoLastAction = undoLast;

  const icon100 = ['😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😎', '🤓', '🥳', '😇', '😋', '😍', '😌', '🤔', '🤠', '😺', '😸', '😻', '🙌', '💡', '📚', '🧠', '⭐', '🌟', '✨', '🔥', '🌈', '☀️', '🌙', '⚡', '🎯', '🏆', '🥇', '🎓', '🖊️', '✏️', '📝', '📐', '🔬', '🧪', '🧬', '🌍', '🗺️', '🏛️', '🎨', '🎭', '🎵', '🎧', '🎮', '🧩', '♟️', '📣', '🔔', '🧭', '🛡️', '💎', '🔖', '📖', '📌', '📎', '🗂️', '🧮', '🦉', '🐝', '🦋', '🐢', '🐬', '🦊', '🐱', '🐶', '🐼', '🐧', '🐸', '🦁', '🐯', '🐴', '🐳', '🦄', '🐵', '🐻', '🐨', '🐰', '🐹', '🐭', '🐮', '🐷', '🐙', '🦀', '🐠', '🐟', '🐞', '🐌', '🐥', '🦆', '🐔', '🦅', '🍀', '🌻', '🌸', '🌿', '🍄', '🍎', '🍓', '🍉', '🍍', '🍕', '🥐', '🍔', '🍟', '🌮', '🍪', '🍫', '🍯', '🥕', '🌽', '🍒', '🍋', '🍊', '🍌', '🍇', '⚽', '🏀', '🏐', '🎾', '🏓', '🏸', '🥊', '🥋', '🎿', '⛸️', '🚀', '✈️', '🚗', '🚂', '🚌', '🚢', '🏖️', '🏔️', '🏰', '🌊', '⛰️', '🌅', '🌌', '🏡', '🌉', '🏕️', '⛺', '🎁', '🧸'];  const centers = ['CEIP Praia de Quenxe','IES Fernando Blanco','IES Agra de Raíces','CPR Plurilingüe Manuela Rial Mouzo','CPR Ntra. Sra. del Carmen','CEIP Plurilingüe de Ponte do Porto','CEIP O Areal','CEIP de Camelle','IES Pedra da Aguia','CEIP do Pindo','CEIP Plurilingüe de Carnota','IES Lamas de Castelo','EEI da Pereiriña','CEIP de Brens','CEIP Plurilingüe Vila de Cee','CEIP Plurilingüe Santa Eulalia de Dumbría','CEIP Mar de Fóra','CEIP Areouta','IES Fin do Camiño','Tribeca Academia','Centro pendiente de asignar'];
  const stages = ['Infantil','Primaria','ESO','Bachillerato','FP','Adultos','Profesorado','Otros'];
  const courses = ['1.º Primaria','2.º Primaria','3.º Primaria','4.º Primaria','5.º Primaria','6.º Primaria','1.º ESO','2.º ESO','3.º ESO','3.º ESO PDC','4.º ESO','1.º Bachillerato','1.º Bachillerato Sociales','1.º Bachillerato Humanidades','2.º Bachillerato','Profesora','Otros'];
  const neeTypes = ['Discapacidad intelectual','Discapacidad auditiva','Discapacidad visual','Discapacidad motora o física','Pluridiscapacidad','Trastorno grave de conducta','Trastorno grave de la comunicación y del lenguaje','TEA / trastorno generalizado del desarrollo con necesidad de apoyos específicos','Otra NEE acreditada'];
  const neaeTypes = ['Necesidades educativas especiales','Retraso madurativo','Trastornos del desarrollo del lenguaje y la comunicación','Trastornos de atención o de aprendizaje','TDAH / TDA','Dislexia','Disortografía','Discalculia','Dificultades específicas de aprendizaje','Desconocimiento grave de la lengua de aprendizaje','Vulnerabilidad socioeducativa','Altas capacidades intelectuales','Incorporación tardía al sistema educativo','Condiciones personales o de historia escolar','Desfase curricular significativo','Necesidad de apoyo educativo temporal','Otra NEAE acreditada'];
  const healthConditions = ['Diabetes','Asma','Epilepsia','Celiaquía','Alergias','Migrañas','Enfermedad inflamatoria intestinal','Enfermedad aguda o transitoria','Recuperación posquirúrgica breve','Problema sensorial corregido','Dolor, fatiga o sueño insuficiente sin necesidad educativa acreditada','Dificultad emocional leve o reactiva','Factor familiar u organizativo no acreditado como vulnerabilidad','Otra condición que conviene conocer'];
  const badges = [
    ['sixseven','😎','67 sixseven'],['effort','💪','Esfuerzo sostenido'],['autonomy','🧭','Autonomía'],['kindness','🤝','Buen trato'],['perseverance','🌱','Constancia'],['focus','🎯','Concentración'],['careful_reading','📚','Lectura cuidadosa'],['improvement','📈','Mejora notable'],['responsibility','✅','Responsabilidad'],['curiosity','🔎','Curiosidad'],['creativity','🎨','Creatividad'],['teamwork','👥','Trabajo cooperativo'],['punctuality','⏰','Puntualidad'],['resilience','🛡️','Resiliencia'],['math_power','π','Razonamiento matemático'],['language_care','✍️','Cuidado lingüístico'],['science_mind','🔬','Mentalidad científica'],['history_eye','🏛️','Mirada histórica'],['english_star','GB','English star'],['galician_voice','🌿','Voz galega'],['exam_ready','📝','Preparación de examen'],['challenge','🧩','Desafío superado'],['golden_bulb','💡','Idea brillante'],['study_week','📆','Semana de estudio completa'],['oral_expression','🎙️','Expresión oral'],['writing_care','🖋️','Escritura cuidada'],['homework_done','📌','Tareas al día'],['good_questions','❓','Buenas preguntas'],['first_eval_passed','1️⃣','Primera evaluación superada'],['second_eval_passed','2️⃣','Segunda evaluación superada'],['course_passed','🎓','Curso superado'],['summer_study','☀️','Estudiando en verano'],['punctual_person','⏱️','Puntual']
  ].map(([code,icon,name]) => ({code,icon,name}));

  const TOOL_ICON = {
    guidance:'orientacion', badges:'badges', difficulties:'dificultades', grades:'calificaciones', subjects:'materias', calendar:'calendario', messages:'mensajes', announcements:'anuncios',
    newPublication:'nueva_publicacion', activityLog:'actividad', teacherAlerts:'alertas', classOverview:'vista_general', assignBadge:'asignar_insignias', passwordRequests:'recuperacion',
    studentProfiles:'perfiles', teacherSubjects:'materias_materiales', payments:'pagos', attendance:'asistencia'
  };
  function toolIcon(key, fallback=''){
    const file = TOOL_ICON[key];
    if(!file) return `<span class="tribeca-tool-icon-fallback">${safe(fallback||'')}</span>`;
    return `<img class="tribeca-tool-icon-img" src="assets/icons/${file}.png" alt="" aria-hidden="true">`;
  }
  const SUBJECT_PALETTE = ['#6f5a2a','#0b3d22','#103f5f','#51418b','#7a5225','#254f3f','#8f3d3d','#3e5f7a','#816b2c','#2f5d50','#624b78','#5f6f42','#884b4b','#345f7f'];
  const SUBJECT_GLYPHS = {
    'Matemáticas':'π','Matemáticas A':'π','Matemáticas B':'π','Matemáticas I':'π','Matemáticas II':'π','Matemáticas Aplicadas a las Ciencias Sociales':'∑','Métodos Estadísticos y Numéricos':'∑',
    'Biología y Geología':'BG','Ciencias de la Naturaleza':'CN','Ciencias Sociales':'CS','Física y Química':'FQ','Física':'F','Química':'Q','Geología y Ciencias Ambientales':'GA','Ciencias Generales':'CG',
    'Lengua Castellana y Literatura':'LC','Lengua Gallega y Literatura':'LG','English':'EN','English I':'EN','English II':'EN','Français':'FR','Français I':'FR','Français II':'FR',
    'Geografía e Historia':'GH','Historia de España':'HE','Historia de la Filosofía':'HF','Historia del Mundo Contemporáneo':'HM','Historia del Arte':'HA','Filosofía':'Φ','Latín':'LA','Griego':'GR','Cultura Clásica':'CC','Oratoria':'OR',
    'Educación Física':'EF','Educación Plástica y Visual':'EP','Educación Plástica, Visual y Audiovisual':'EP','Música':'MU','Música y Danza':'MD','Dibujo Artístico I':'DA','Dibujo Artístico II':'DA','Dibujo Técnico I':'DT','Dibujo Técnico II':'DT','Diseño':'DI','Volumen':'VO',
    'Tecnología y Digitalización':'TD','Tecnología':'TE','Digitalización':'DG','Tecnología e Ingeniería I':'TI','Tecnología e Ingeniería II':'TI','Educación Digital':'ED','Tecnologías de la Información y de la Comunicación I':'TIC','Tecnologías de la Información y de la Comunicación II':'TIC',
    'Economía':'€','Economía y Emprendimiento':'€','Empresa y Diseño de Modelos de Negocio':'€','Formación y Orientación Personal y Profesional':'FO','Psicología':'Ψ','Tutoría':'TU','Orientación académica':'OA','Apoyo personalizado':'AP','Ámbito Científico-Tecnológico':'CT','Ámbito Lingüístico y Social':'LS','Ámbito Práctico':'PR','Higiene Bucodental':'HB','FP Sanitaria':'FP'
  };
  function hashText(str='') { let h=0; for(const ch of String(str)) h=(h*31+ch.charCodeAt(0))>>>0; return h; }
  function subjectVisual(subject=''){
    const key = Object.keys(SUBJECT_GLYPHS).find(k => String(subject).toLowerCase().includes(k.toLowerCase())) || subject;
    const idx = hashText(subject) % SUBJECT_PALETTE.length;
    return { color: SUBJECT_PALETTE[idx], glyph: SUBJECT_GLYPHS[key] || String(subject||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,3).toUpperCase() };
  }
  const subjectCatalog = {
    'Primaria-1.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-2.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-3.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-4.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-5.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-6.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza','Educación en Valores Cívicos y Éticos'],
    'ESO-1.º ESO':['Biología y Geología','Educación Física','Educación Plástica, Visual y Audiovisual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Français','Tecnología y Digitalización','Geografía e Historia'],
    'ESO-2.º ESO':['Educación Física','Física y Química','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música','Français','Tecnología y Digitalización','Geografía e Historia'],
    'ESO-3.º ESO':['Biología y Geología','Educación en Valores Cívicos y Éticos','Educación Física','Educación Plástica, Visual y Audiovisual','Física y Química','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música','Geografía e Historia'],
    'ESO-3.º ESO PDC':['Ámbito Científico-Tecnológico','Ámbito Lingüístico y Social','English','Educación Física','Tecnología y Digitalización','Tutoría'],
    'ESO-4.º ESO':['Educación Física','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas A / Matemáticas B','Geografía e Historia','Biología y Geología','Digitalización','Economía y Emprendimiento','Física y Química','Latín','Tecnología'],
    'Bachillerato-1.º Bachillerato':['Educación Física','Filosofía','Lengua Castellana y Literatura I','English I','Lengua Gallega y Literatura I'],
    'Bachillerato-1.º Bachillerato Sociales':['Educación Física','Filosofía','Lengua Castellana y Literatura I','English I','Lengua Gallega y Literatura I','Matemáticas Aplicadas a las Ciencias Sociales I','Economía','Historia del Mundo Contemporáneo','Literatura Universal'],
    'Bachillerato-1.º Bachillerato Humanidades':['Educación Física','Filosofía','Lengua Castellana y Literatura I','English I','Lengua Gallega y Literatura I','Latín I','Griego I','Historia del Mundo Contemporáneo','Literatura Universal'],
    'Bachillerato-2.º Bachillerato':['Lengua Castellana y Literatura II','English II','Lengua Gallega y Literatura II','Historia de España','Historia de la Filosofía']
  };

  function dynamicCourses(){
    const set = new Set(courses);
    (State.data.subjects||[]).forEach(s => { if(s.course) set.add(s.course); });
    (State.data.students||[]).forEach(s => { if(s.course) set.add(s.course); });
    if(State.profile?.course) set.add(State.profile.course);
    return [...set].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
  }
  function subjectListFor(stage,course){
    const overrides = (State.data.subjects||[]).filter(x=>x.stage===stage && x.course===course);
    const hidden = new Set([...overrides.filter(x=>x.active===false).map(x=>x.subject), ...hiddenSubjectSet(stage, course)]);
    const base = (subjectCatalog[`${stage}-${course}`] || []).filter(x=>!hidden.has(x));
    const custom = overrides.filter(x=>x.active!==false && !hidden.has(x.subject)).map(x=>x.subject);
    return [...new Set([...base, ...custom])];
  }
  const officialEvents = [
    ['2025-09-08','Inicio de actividades lectivas 2025/26','school','Inicio general de actividades lectivas en Galicia.'],
    ['2026-06-19','Fin de actividades lectivas 2025/26','school','Finalización general de actividades lectivas en Galicia.'],
    ['2026-09-09','Inicio de actividades lectivas 2026/27','school-proposal','Fecha propuesta de inicio del curso 2026/27.'],
    ['2027-06-21','Fin de actividades lectivas 2026/27','school-proposal','Fecha propuesta de finalización del curso 2026/27.'],
    ['2026-01-01','Año Nuevo','national','Tribeca Academia no abre este día.'],['2026-01-06','Epifanía del Señor, Reyes','national','Tribeca Academia no abre este día.'],['2026-03-19','San José','galicia','Tribeca Academia no abre este día.'],['2026-04-02','Jueves Santo','galicia','Tribeca Academia no abre este día.'],['2026-04-03','Viernes Santo','national','Tribeca Academia no abre este día.'],['2026-05-01','Fiesta del Trabajo','national','Tribeca Academia no abre este día.'],['2026-06-24','San Juan','galicia','Tribeca Academia no abre este día.'],['2026-07-25','Día Nacional de Galicia','galicia','Tribeca Academia no abre este día.'],['2026-08-15','Asunción de la Virgen','national','Tribeca Academia no abre este día.'],['2026-10-12','Fiesta Nacional de España','national','Tribeca Academia no abre este día.'],['2026-12-08','Inmaculada Concepción','national','Tribeca Academia no abre este día.'],['2026-12-25','Natividad del Señor','national','Tribeca Academia no abre este día.'],
    ['2026-06-29','San Pedro, Corcubión','local','Tribeca Academia no abre este día.'],['2026-07-16','Fiesta del Carmen, Corcubión','local','Tribeca Academia no abre este día.'],
    ['2026-04-06','Lunes de Pascua, Cee','local-cee','Festivo local del centro educativo.'],['2026-06-16','San Adrián, Cee','local-cee','Festivo local del centro educativo.'],['2026-09-08','Fiesta local de Fisterra','local-fisterra','Festivo local del centro educativo.'],
    ['2025-10-31','Día de la Enseñanza','school','Día no lectivo.'],['2025-11-03','Día no lectivo','school','Día no lectivo.'],
    ['2025-12-22','Vacaciones de Navidad, inicio','school','Período no lectivo.'],['2026-01-07','Vacaciones de Navidad, fin','school','Período no lectivo.'],
    ['2026-02-16','Entroido/Carnaval, inicio','school','Período no lectivo.'],['2026-02-17','Entroido/Carnaval','school','Período no lectivo.'],['2026-02-18','Entroido/Carnaval, fin','school','Período no lectivo.'],
    ['2026-03-30','Semana Santa, inicio','school','Período no lectivo.'],['2026-03-31','Semana Santa','school','Período no lectivo.'],['2026-04-01','Semana Santa','school','Período no lectivo.'],['2026-04-02','Semana Santa','school','Período no lectivo.'],['2026-04-03','Semana Santa','school','Período no lectivo.'],['2026-04-06','Semana Santa, fin','school','Período no lectivo.'],
    ['2026-06-08','Evaluación final ordinaria 1.º Bachillerato y 1.º FP básica, inicio','school','Fecha relevante del calendario escolar.'],['2026-06-10','Evaluación final extraordinaria 2.º Bachillerato, inicio','school','Fecha relevante del calendario escolar.'],['2026-06-15','Evaluación final 2.º FP básica, media y superior','school','Fecha relevante del calendario escolar.'],['2026-06-16','Evaluación final 2.º FP básica, media y superior','school','Fecha relevante del calendario escolar.'],['2026-06-17','Pruebas extraordinarias 1.º Bachillerato y 1.º FP básica, inicio','school','Fecha relevante del calendario escolar.'],['2026-06-18','Pruebas extraordinarias 1.º Bachillerato y 1.º FP básica','school','Fecha relevante del calendario escolar.'],['2026-06-19','Pruebas extraordinarias 1.º Bachillerato y 1.º FP básica, fin','school','Fecha relevante del calendario escolar.'],
    ['2026-12-21','Vacaciones de Navidad 2026/27, inicio','school-proposal','Período no lectivo propuesto.'],['2027-01-06','Vacaciones de Navidad 2026/27, fin','school-proposal','Período no lectivo propuesto.'],['2027-02-08','Entroido/Carnaval 2026/27, inicio','school-proposal','Período no lectivo propuesto.'],['2027-02-09','Entroido/Carnaval 2026/27','school-proposal','Período no lectivo propuesto.'],['2027-02-10','Entroido/Carnaval 2026/27, fin','school-proposal','Período no lectivo propuesto.'],['2027-03-22','Semana Santa 2026/27, inicio','school-proposal','Período no lectivo propuesto.'],['2027-03-29','Semana Santa 2026/27, fin','school-proposal','Período no lectivo propuesto.']
  ].map(([date,title,type,body]) => ({id:`official-${date}-${type}-${title}`, date, event_date:date, title, type, event_type:type, body, official:true, hidden:false}));

  const roleTeacher = () => State.profile?.role === 'teacher';
  const knownStudentNames = {
    profesora:'Patri', naiara_marti:'Naiara Martí Domínguez', paula_allo:'Paula Allo', natalia_macias:'Natalia Macías', ana_sambade:'Ana Sambade', marco_calvo:'Marco Calvo', carla_fiuza:'Carla Fiuza', lucia_pose:'Lucía Pose', celia_trillo:'Celia Trillo', carlota_trillo:'Carlota Trillo', carla_caamano:'Carla Caamaño', susana_haymanot:'Susana Haymanot', sabela_paz:'Sabela Paz', gorka_montero:'Gorka Montero Ríos', sandra_casais:'Sandra Casais', eloy_casais:'Eloy Casais', antonia_wronna:'Antonia Wronna', filip_wronna:'Filip Wronna', ana_valino:'Ana Valiño', sofia_wronna:'Sofía Wronna'
  };
  const displayName = p => {
    const username = String(p?.username || '').toLowerCase();
    const full = String(p?.full_name || '').trim();
    const composed = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
    if(full && !/^demo\b/i.test(full)) return full;
    if(composed && !/^demo\b/i.test(composed)) return composed;
    return knownStudentNames[username] || p?.preferred_name || p?.username || 'Usuario';
  };
  const academicLine = p => [p?.center || 'Centro sin asignar', p?.stage || '', p?.course || ''].filter(Boolean).join(' · ');
  const options = (arr, val='') => arr.map(x => `<option value="${safe(x)}" ${x===val?'selected':''}>${safe(x)}</option>`).join('');
  const groups = arr => {
    const map = new Map();
    [...(arr||[])].sort((a,b)=>`${a.center||''} ${a.stage||''} ${a.course||''} ${a.full_name||''}`.localeCompare(`${b.center||''} ${b.stage||''} ${b.course||''} ${b.full_name||''}`,'es')).forEach(s=>{
      const k = [s.center||'Sin centro', s.stage||'Sin etapa', s.course||'Sin curso'].join(' · ');
      if(!map.has(k)) map.set(k, []); map.get(k).push(s);
    });
    return [...map.entries()].map(([label,items])=>({label,items}));
  };
  const builtinSubjectList = (p=State.profile) => subjectCatalog[`${p?.stage}-${p?.course}`] || subjectCatalog['ESO-1.º ESO'] || [];
  const subjectList = (p=State.profile) => {
    if(!p) return [];
    return subjectListFor(p.stage, p.course);
  };
  function teacherSubjectList(stage, course){
    const overrides = (State.data.subjects||[]).filter(x=>x.stage===stage && x.course===course);
    const names = [...new Set([...(subjectCatalog[`${stage}-${course}`] || []), ...overrides.map(x=>x.subject).filter(Boolean)])];
    return names;
  }
  function subjectOverride(stage, course, subject){
    return (State.data.subjects||[]).find(x=>x.stage===stage && x.course===course && x.subject===subject) || null;
  }
  function hiddenSubjectKey(stage, course){
    return `tribeca-hidden-subjects-${String(stage||'').trim()}-${String(course||'').trim()}`;
  }
  function hiddenSubjectSet(stage, course){
    try {
      const raw = localStorage.getItem(hiddenSubjectKey(stage, course));
      const arr = JSON.parse(raw || '[]');
      return new Set(Array.isArray(arr) ? arr : []);
    } catch(_e) {
      return new Set();
    }
  }
  function setLocalSubjectHidden(stage, course, subject, hidden){
    const set = hiddenSubjectSet(stage, course);
    if(hidden) set.add(subject); else set.delete(subject);
    localStorage.setItem(hiddenSubjectKey(stage, course), JSON.stringify([...set]));
  }
  function isSubjectHidden(stage, course, subject){
    const db = subjectOverride(stage, course, subject);
    return db?.active === false || hiddenSubjectSet(stage, course).has(subject);
  }
  function subjectIsHidden(stage, course, subject){
    return subjectOverride(stage, course, subject)?.active === false;
  }
  const table = name => State.client.from(name);
  async function maybe(promise, fallback=null) { try { const {data,error} = await promise; if(error) throw error; return data ?? fallback; } catch(e) { console.warn('[Tribeca Aula]', e.message || e); return fallback; } }
  function beep(kind='message') {
    if(!State.sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const map = {message:660,touch:880,join:520,leave:330};
      osc.frequency.value = map[kind] || 660;
      gain.gain.value = 0.055;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      setTimeout(()=>{osc.stop(); ctx.close();}, kind==='touch'?180:110);
    } catch(_) {}
  }

  function publicToolLinksMarkup(){
    return `<div class="public-tools-strip" aria-label="Herramientas públicas de Tribeca">
      <a class="public-tool-btn public-tool-lumen" href="https://aulatribeca.github.io/LUMEN-V/" target="_blank" rel="noopener" data-public-tool-link aria-label="Abrir LUMEN-V en una pestaña nueva"><img src="assets/lumen-v-icon.webp" alt="" aria-hidden="true"><span>LUMEN-V</span></a>
      <a class="public-tool-btn public-tool-itinera" href="https://aulatribeca.github.io/itinera/#inicio" target="_blank" rel="noopener" data-public-tool-link aria-label="Abrir ITINERA en una pestaña nueva"><img src="assets/itinera-icon.webp" alt="" aria-hidden="true"><span>ITINERA</span></a>
    </div>`;
  }

  function loginMarkup() {
    return `<div class="auth-card t16-auth"><div class="auth-brand"><img src="assets/logo-tribeca.png" alt=""><div><strong>Tribeca Aula</strong><span>Acceso seguro</span></div></div>${publicToolLinksMarkup()}${!configured?`<div class="auth-warning">Supabase aún no está configurado. Revisa supabase-config.js.</div>`:''}<form id="t16LoginForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="auth-form"><h1>Acceso a Tribeca Aula</h1><p>Introduce tu nombre de usuario y contraseña.</p><label><span>Usuario</span><input name="username" placeholder="nombre_apellido" autocomplete="username" required ${configured?'':'disabled'}></label><label><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required ${configured?'':'disabled'}></label><button class="primary-btn" type="submit" ${configured?'':'disabled'}>Entrar</button><div class="form-status auth-login-status" id="loginStatus" aria-live="polite"></div><button class="link-button" type="button" data-t16-forgot>No recuerdo mi contraseña</button></form><form id="t16ResetForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="auth-form is-secondary" hidden><h2>Recuperar contraseña</h2><p>La profesora recibirá la solicitud y restablecerá la contraseña manualmente.</p><label><span>Usuario</span><input name="username" placeholder="nombre_apellido" required></label><label><span>Nombre y apellidos</span><input name="displayName" maxlength="120"></label><button class="secondary-btn" type="submit">Solicitar recuperación</button><button class="link-button" type="button" data-t16-login>Volver al inicio de sesión</button></form></div>`;
  }
  function showLogin() {
    let overlay = $('#tribecaAuthOverlay');
    if(!overlay) { overlay = document.createElement('div'); overlay.id='tribecaAuthOverlay'; overlay.className='auth-overlay'; document.body.appendChild(overlay); }
    overlay.innerHTML = loginMarkup(); overlay.hidden = false; document.body.classList.add('auth-locked');
  }
  function hideLogin() { const o=$('#tribecaAuthOverlay'); if(o) o.hidden=true; document.body.classList.remove('auth-locked'); }
  async function resolveEmail(username) {
    const u = String(username||'').trim().toLowerCase();
    const rpc = await maybe(State.client.rpc('resolve_login_email', { p_username:u }), null);
    return rpc || `${u}@tribecaaula.test`;
  }
  async function signIn(username, password) {
    const box = document.getElementById('loginStatus');
    if(box){ box.textContent='Comprobando acceso…'; box.className='form-status auth-login-status is-info'; }
    try {
      const email = await resolveEmail(username);
      const { data, error } = await State.client.auth.signInWithPassword({ email, password });
      if(error) throw error;
      State.session = data.session; State.user = data.user;
      await hydrate();
      await log('login','Inicio de sesión', {user:displayName(State.profile)});
      hideLogin(); renderApp(); toast('Sesión iniciada.');
    } catch(error) {
      const msg = /invalid|credentials|login/i.test(String(error?.message||'')) ? 'Nombre de usuario o contraseña incorrectos.' : (error?.message || 'No se pudo iniciar sesión.');
      if(box){ box.textContent=msg; box.className='form-status auth-login-status is-error'; }
      throw new Error(msg);
    }
  }
  async function signOut() {
    try { await State.client?.auth?.signOut({scope:'global'}); } catch(_) {}
    try { await State.client?.auth?.signOut({scope:'local'}); } catch(_) {}
    Object.keys(localStorage).filter(k=>k.includes('supabase') || k.includes('tribeca')).forEach(k=>{ if(!['tribeca-zoom','tribeca-theme','tribeca-font'].includes(k)) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach(k=>{ if(k.includes('supabase') || k.includes('tribeca')) sessionStorage.removeItem(k); });
    location.replace(location.href.split('?')[0].split('#')[0] + '?logout=' + Date.now());
  }
  async function requestReset(form) {
    const fd = new FormData(form); const username = String(fd.get('username')||'').trim().toLowerCase();
    if(!username) return;
    await maybe(table('password_reset_requests').insert({ username, display_name: fd.get('displayName') || username, status:'pending' }));
    await maybe(table('notifications').insert({target_role:'teacher', tool:'passwordRequests', title:'Solicitud de recuperación', body:`Solicitud de recuperación para ${username}`}));
    toast('Solicitud enviada a la profesora.'); form.reset();
  }

  async function refreshSelfPause() {
    State.selfPause = null;
    if(!State.profile || roleTeacher()) return null;
    const today = todayIso();
    let pause = null;
    try {
      const rpc = await maybe(State.client.rpc('tribeca_current_student_pause'), null);
      pause = Array.isArray(rpc) ? (rpc[0] || null) : (rpc || null);
    } catch(_e) { pause = null; }
    if(!pause) {
      const direct = await maybe(
        table('student_pauses')
          .select('*')
          .eq('user_id', State.profile.id)
          .eq('active', true)
          .lte('start_date', today)
          .or(`end_date.is.null,end_date.gte.${today}`)
          .order('start_date', {ascending:false})
          .limit(1),
        []
      );
      pause = Array.isArray(direct) ? (direct[0] || null) : (direct || null);
    }
    State.selfPause = pause || null;
    if(pause) {
      State.data.studentPauses = [pause, ...((State.data.studentPauses||[]).filter(p => p.id !== pause.id))];
    }
    return State.selfPause;
  }

  async function hydrate(force=false) {
    if(!State.client) return;
    if(!State.user) {
      const res = await State.client.auth.getSession();
      State.session = res.data?.session || null; State.user = State.session?.user || null;
    }
    if(!State.user) return;
    State.profile = await maybe(table('profiles').select('*').eq('id', State.user.id).single(), null);
    if(!State.profile) throw new Error('No se encontró perfil vinculado a este usuario.');
    if(!State.activitySince){
      const key = `tribeca-last-session-${State.user.id}`;
      State.activitySince = localStorage.getItem(key) || new Date(0).toISOString();
      localStorage.setItem(key, new Date().toISOString());
    }
    await loadData(force);
    await refreshSelfPause();
    if(!State.selfPause) updatePresence().catch(()=>{});
  }
  async function loadData(force=false) {
    if(!State.profile || (!force && Date.now() - State.loadedAt < 1200)) return;
    State.loadedAt = Date.now(); const p=State.profile;
    const common = [
      maybe(table('subject_materials').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.materials=d||[]),
      maybe(table('announcements').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.announcements=d||[]),
      maybe(table('calendar_events').select('*').order('event_date',{ascending:true}), []).then(d=>State.data.events=d||[]),
      maybe(table('private_messages').select('*').order('created_at',{ascending:false}).limit(500), []).then(d=>State.data.messages=d||[]),
      maybe(table('user_badges').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.userBadges=d||[]),
      maybe(table('badge_claim_requests').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.badgeClaims=d||[]),
      maybe(table('password_reset_requests').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.passwordRequests=d||[]),
      maybe(table('user_presence').select('*').order('last_seen',{ascending:false}), []).then(d=>State.data.presence=d||[]),
      maybe(table('teacher_activity_log').select('*').order('created_at',{ascending:false}).limit(300), []).then(d=>State.data.activity=d||[]),
      maybe(table('guidance_resources').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.guidance=d||[]),
      maybe(table('subject_overrides').select('*').order('stage').order('course').order('subject'), []).then(d=>State.data.subjects=d||[]),
      maybe(table('material_completions').select('*'), []).then(d=>State.data.materialCompletions=d||[]),
      maybe(table('student_pauses').select('*').order('start_date',{ascending:false}), []).then(d=>State.data.studentPauses=d||[])
    ];
    if(roleTeacher()) {
      common.push(maybe(table('profiles').select('*').eq('role','student').order('center').order('stage').order('course').order('full_name'), []).then(d=>State.data.students=d||[]));
      common.push(maybe(table('grades').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.grades=d||[]));
      common.push(maybe(table('difficult_subjects').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.difficulties=d||[]));
      common.push(maybe(table('student_billing').select('*'), []).then(d=>State.data.billing=d||[]));
      common.push(maybe(table('student_schedules').select('*').order('weekday').order('start_time'), []).then(d=>State.data.schedules=d||[]));
      common.push(maybe(table('attendance_records').select('*').order('class_date',{ascending:false}), []).then(d=>State.data.attendance=d||[]));
      common.push(maybe(table('payment_months').select('*').order('month',{ascending:false}), []).then(d=>State.data.paymentMonths=d||[]));
    } else {
      common.push(maybe(table('grades').select('*').eq('user_id',p.id).order('created_at',{ascending:false}), []).then(d=>State.data.grades=d||[]));
      common.push(maybe(table('difficult_subjects').select('*').eq('user_id',p.id).order('created_at',{ascending:false}), []).then(d=>State.data.difficulties=d||[]));
    }
    await Promise.allSettled(common);
    updateBadges();
  }
  async function updatePresence() {
    const p=State.profile; if(!p) return;
    await maybe(table('user_presence').upsert({ user_id:p.id, display_name:displayName(p), role:p.role, center:p.center, stage:p.stage, course:p.course, avatar_icon:p.avatar_icon || '💡', avatar_image_url:teacherProfileImageUrl(p) || null, last_seen:new Date().toISOString() }, { onConflict:'user_id' }));
  }
  async function log(action_type, title, details={}) {
    const p=State.profile; if(!p) return;
    await maybe(table('teacher_activity_log').insert({ actor_id:p.id, actor_name:displayName(p), actor_role:p.role, action_type, title, details, session_id:sessionStorage.getItem('tribeca-session-id') || (sessionStorage.setItem('tribeca-session-id', uid()), sessionStorage.getItem('tribeca-session-id')) }));
  }

  function parseArrayField(value) {
    if(Array.isArray(value)) return value.filter(v => v !== null && v !== undefined).map(String);
    if(value === null || value === undefined || value === '') return [];
    if(typeof value === 'string') {
      const trimmed = value.trim();
      if(!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(v => v !== null && v !== undefined).map(String) : [];
      } catch(_e) {
        return trimmed.includes(',') ? trimmed.split(',').map(x => x.trim()).filter(Boolean) : [trimmed];
      }
    }
    return [];
  }
  function visibleForProfile(item={}, p=State.profile) {
    if(!p || !item || typeof item !== 'object') return false;
    if(roleTeacher()) return true;
    if(item.hidden) return false;
    const scope = item.target_scope || item.scope || 'all';
    const ids = parseArrayField(item.target_user_ids);
    if(scope === 'all') return true;
    if(['selected','user'].includes(scope)) return ids.includes(String(p.id));
    if(scope === 'center') return item.center === p.center;
    if(scope === 'class') return item.center === p.center && item.stage === p.stage && item.course === p.course;
    return true;
  }
  function visibleAnnouncements() { return (State.data.announcements||[]).filter(x=>visibleForProfile(x)); }
  function visibleMaterials(subject='') { return (State.data.materials||[]).filter(x=>visibleForProfile(x) && (!subject || x.subject===subject)); }
  function relevantEvents() {
    const p=State.profile;
    const db = (State.data.events||[]).filter(Boolean).filter(e=>{
      if(roleTeacher()) return true;
      if(e.hidden && e.created_by !== p.id) return false;
      const scope=e.scope||e.target_scope||'all';
      const ids=parseArrayField(e.target_user_ids);
      if(e.created_by === p.id || e.user_id === p.id) return true;
      if(scope==='all') return true;
      if(scope==='center') return e.center===p.center;
      if(scope==='class') return e.center===p.center && e.stage===p.stage && e.course===p.course;
      if(['selected','user'].includes(scope)) return ids.includes(String(p.id));
      return true;
    }).map(e=>({...e, date:e.event_date || e.date, type:e.event_type || e.type || 'personal'}));
    const official = officialEvents.filter(Boolean).filter(e=> roleTeacher() || ['national','galicia','local','school','school-proposal'].includes(e.type) || ((p?.center||'').includes('Cee') && e.type==='local-cee') || ((p?.center||'').includes('Fisterra') && e.type==='local-fisterra'));
    return [...official, ...db].filter(e=>e && (!e.hidden || e.official || roleTeacher() || e.created_by===p?.id));
  }
  function canEditEvent(e) { const p=State.profile; if(!p || e.official) return false; if(roleTeacher()) return true; if(e.created_by === p.id) return true; if((e.scope||e.target_scope)==='class' && e.center===p.center && e.stage===p.stage && e.course===p.course) return true; return false; }

  function pauseRecords(userId){ return (State.data.studentPauses||[]).filter(x=>String(x.user_id)===String(userId)); }
  function pauseCoversDate(pause, iso=todayIso()){
    if(!pause) return false;
    if(pause.active === false && !pause.end_date) return false;
    const d=String(iso).slice(0,10);
    const start=String(pause.start_date || todayIso()).slice(0,10);
    const end=pause.end_date ? String(pause.end_date).slice(0,10) : '9999-12-31';
    return start <= d && d <= end;
  }
  function activePauseFor(userId, iso=todayIso()){
    if(!roleTeacher() && State.profile && String(userId) === String(State.profile.id) && State.selfPause && pauseCoversDate(State.selfPause, iso)) return State.selfPause;
    return pauseRecords(userId).find(p=>p.active !== false && pauseCoversDate(p, iso)) || null;
  }
  function pausedOnDate(userId, iso){ return pauseRecords(userId).some(p=>pauseCoversDate(p, iso)); }
  function pauseMonthOverlap(userId, month){
    const [y,m]=String(month||'').split('-').map(Number); if(!y||!m) return [];
    const monthStart=`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-01`;
    const monthEnd=toIso(new Date(y,m,0));
    return pauseRecords(userId).filter(p=>(p.active!==false || p.end_date)).filter(p=>String(p.start_date||monthStart).slice(0,10)<=monthEnd && String(p.end_date||'9999-12-31').slice(0,10)>=monthStart);
  }
  function pauseStatusText(userId){
    const p=activePauseFor(userId);
    if(!p) return '';
    const start=p.start_date?fmtDate(p.start_date):'hoy';
    const end=p.end_date?fmtDate(p.end_date):'hasta reactivación manual';
    return `Pausa activa desde ${start} hasta ${end}${p.reason?`: ${p.reason}`:''}`;
  }
  function pauseLockContent(pause){
    const start=pause?.start_date?fmtDate(pause.start_date):'hoy';
    const end=pause?.end_date?fmtDate(pause.end_date):'la reactivación de la asistencia';
    return `<section class="pause-lock panel"><div class="pause-lock-icon">⏸</div><p class="eyebrow">Acceso pausado temporalmente</p><h1>Tu aula virtual está en pausa</h1><p>Tu asistencia está pausada desde ${safe(start)} hasta ${safe(end)}. Durante este período no podrás entrar al aula virtual.</p><p>Cuando se reactive tu asistencia, podrás acceder con el mismo usuario y la misma contraseña, y encontrarás las publicaciones realizadas durante el tiempo de pausa.</p>${pause?.reason?`<p class="pause-reason"><strong>Motivo registrado:</strong> ${safe(pause.reason)}</p>`:''}<button class="secondary-btn" type="button" data-action="logout">Cerrar sesión</button></section>`;
  }

  function renderApp() {
    document.body.classList.remove('is-dark','dark-mode','theme-dark');
    try { localStorage.removeItem('tribeca-theme'); localStorage.removeItem('theme'); } catch(_) {}
    if(!State.profile) { showLogin(); return; }
    const p=State.profile;
    $$('[data-tool="chat"], #chatBadge').forEach(el=>el.closest?.('button')?.remove?.() || el.remove());
    updateTopProfile();
    const main = $('#inicio'); if(!main) return;
    document.body.classList.toggle('is-teacher', roleTeacher());
    document.body.classList.toggle('is-student', !roleTeacher());
    ensureMainNavHomeButton();
    const pause = !roleTeacher() ? activePauseFor(p.id) : null;
    document.body.classList.toggle('is-paused-student', !!pause);
    if(pause){
      document.body.classList.remove('is-inline-section','is-standalone-page');
      State.activeInlineSection = null;
      State.activeInlineOptions = {};
      State.windows.forEach(w=>w?.remove?.());
      State.windows.clear();
      main.innerHTML = pauseLockContent(pause);
      updateBadges();
      setActiveMainNav('home');
      applyTranslations();
      return;
    }
    if(roleTeacher()) main.innerHTML = teacherHome(); else main.innerHTML = studentHome();
    bindSubjectCards(); updateBadges(); scrubZeroBadges(); setActiveMainNav('home'); applyTranslations();
  }
  function updateTopProfile() {
    const p=State.profile || {}; const avatar=$('#profileAvatar');
    const photo = teacherProfileImageUrl(p);
    if(avatar) {
      if(photo) {
        avatar.textContent='';
        avatar.style.backgroundImage=`url("${photo}")`;
        avatar.classList.add('profile-image-avatar');
      } else {
        avatar.style.backgroundImage='';
        avatar.classList.remove('profile-image-avatar');
        avatar.textContent=p.avatar_icon || '💡';
      }
    }
    const name=$('.profile-name'); if(name) name.textContent = 'Mi perfil';
    $('#profileMenu')?.setAttribute('hidden','');
  }
  function ensureMainNavHomeButton() {
    const nav = document.querySelector('.main-nav');
    if(!nav) return;
    if(roleTeacher()) nav.querySelector('[data-route="subjects"]')?.remove();
    if(!nav.querySelector('[data-route="home"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.route = 'home';
      btn.type = 'button';
      btn.innerHTML = '<span>Página principal</span>';
      nav.insertBefore(btn, nav.firstElementChild || null);
    }
  }
  function setActiveMainNav(id='home') {
    ensureMainNavHomeButton();
    document.querySelectorAll('.main-nav .nav-btn').forEach(b => b.classList.remove('is-active'));
    const selector = id === 'home' ? '.main-nav .nav-btn[data-route="home"]' : `.main-nav .nav-btn[data-tool="${CSS.escape(id)}"], .main-nav .nav-btn[data-route="${CSS.escape(id)}"]`;
    document.querySelector(selector)?.classList.add('is-active');
  }
  function showHomePage() {
    document.body.classList.remove('is-standalone-page','is-inline-section');
    State.activeInlineSection = null;
    State.activeInlineOptions = {};
    State.windows.forEach(win => win?.remove?.());
    State.windows.clear();
    if(openedPageTarget()) {
      history.replaceState(null, '', baseAppUrl());
    }
    renderApp();
    window.scrollTo({top:0, behavior:'smooth'});
  }
  function updateBadges() {
    const now=new Date(); const seven=addDays(new Date(),7);
    const calCount=relevantEvents().filter(e=>{const d=parseIso(e.date); return d>=new Date(now.getFullYear(),now.getMonth(),now.getDate()) && d<=seven;}).length;
    setBadge('#calendarBadge', calCount);
    const unreadMsg=(State.data.messages||[]).filter(m=>m.recipient_id===State.profile?.id && !m.read_at && !m.archived && !m.deleted_by_recipient).length; setBadge('#messagesBadge', unreadMsg);
    const annUnread=visibleAnnouncements().filter(a=>!localStorage.getItem(`tribeca-ann-seen-${a.id}`)).length; setBadge('#announcementsBadge', annUnread);
    if(roleTeacher()){
      const alertCount = teacherAlertCount();
      const seen = Number(localStorage.getItem(`tribeca-alerts-seen-${State.profile.id}`)||0);
      setBadge('#teacherAlertsBadge', Math.max(0, alertCount-seen));
    }
    scrubZeroBadges();
  }
  function teacherAlertCount(){
    const fail=(State.data.grades||[]).filter(g=>Number(g.grade)<5).length;
    const diff=(State.data.difficulties||[]).length;
    const pass=(State.data.passwordRequests||[]).filter(r=>r.status==='pending').length;
    const unpaid=unpaidPaymentAlerts().length;
    return fail+diff+pass+unpaid;
  }
  function setBadge(sel, n, dot=false){ const b=$(sel); if(!b) return; const count=Number(n||0); b.hidden=count<=0; b.textContent=count<=0?'':(dot?'•':String(Math.min(count,99))); b.classList.toggle('is-empty', count<=0); }
  function scrubZeroBadges(){ $$('.bubble,.badge,[id$="Badge"],.t16-tool-card em').forEach(b=>{ if((b.textContent||'').trim()==='0'){ b.textContent=''; b.hidden=true; b.classList.add('is-empty'); } }); $$('[data-section="notifications"]').forEach(btn=>btn.remove()); }
  function recent(iso){ return iso && (Date.now()-new Date(iso).getTime()) < 90_000; }

  const DAILY_QUOTES = [
    {
      author:'Nelson Mandela',
      es:'La educación es el arma más poderosa que puedes usar para cambiar el mundo.',
      gl:'A educación é a arma máis poderosa que podes usar para cambiar o mundo.',
      en:'Education is the most powerful weapon which you can use to change the world.',
      fr:'L’éducation est l’arme la plus puissante que l’on puisse utiliser pour changer le monde.',
      pl:'Edukacja jest najpotężniejszą bronią, której można użyć, aby zmienić świat.',
      de:'Bildung ist die mächtigste Waffe, mit der man die Welt verändern kann.',
      pt:'A educação é a arma mais poderosa que podes usar para mudar o mundo.'
    },
    {
      author:'Paulo Freire',
      es:'Enseñar no es transferir conocimiento, sino crear las posibilidades para su producción o construcción.',
      gl:'Ensinar non é transferir coñecemento, senón crear as posibilidades para a súa produción ou construción.',
      en:'Teaching is not transferring knowledge, but creating the possibilities for its production or construction.',
      fr:'Enseigner, ce n’est pas transférer un savoir, mais créer les possibilités de sa production ou de sa construction.',
      pl:'Nauczanie nie polega na przekazywaniu wiedzy, lecz na tworzeniu możliwości jej wytwarzania lub konstruowania.',
      de:'Lehren heißt nicht, Wissen zu übertragen, sondern Möglichkeiten für dessen Hervorbringung oder Konstruktion zu schaffen.',
      pt:'Ensinar não é transferir conhecimento, mas criar as possibilidades para a sua produção ou construção.'
    },
    {
      author:'Maria Montessori',
      es:'La mayor señal del éxito de un profesor es poder decir: ahora los niños trabajan como si yo no existiera.',
      gl:'O maior sinal do éxito dun profesor é poder dicir: agora os nenos traballan coma se eu non existise.',
      en:'The greatest sign of success for a teacher is being able to say: the children are now working as if I did not exist.',
      fr:'Le plus grand signe de réussite d’un professeur est de pouvoir dire : les enfants travaillent maintenant comme si je n’existais pas.',
      pl:'Największą oznaką sukcesu nauczyciela jest móc powiedzieć: dzieci pracują teraz tak, jakby mnie nie było.',
      de:'Das größte Zeichen des Erfolgs einer Lehrkraft ist sagen zu können: Die Kinder arbeiten jetzt, als gäbe es mich nicht.',
      pt:'O maior sinal de sucesso de um professor é poder dizer: agora as crianças trabalham como se eu não existisse.'
    },
    {
      author:'John Dewey',
      es:'La educación no es preparación para la vida; la educación es la vida misma.',
      gl:'A educación non é preparación para a vida; a educación é a vida mesma.',
      en:'Education is not preparation for life; education is life itself.',
      fr:'L’éducation n’est pas une préparation à la vie ; l’éducation est la vie elle-même.',
      pl:'Edukacja nie jest przygotowaniem do życia; edukacja jest samym życiem.',
      de:'Bildung ist nicht Vorbereitung auf das Leben; Bildung ist das Leben selbst.',
      pt:'A educação não é preparação para a vida; a educação é a própria vida.'
    },
    {
      author:'Jean Piaget',
      es:'El objetivo principal de la educación es crear personas capaces de hacer cosas nuevas.',
      gl:'O obxectivo principal da educación é crear persoas capaces de facer cousas novas.',
      en:'The principal goal of education is to create people who are capable of doing new things.',
      fr:'Le but principal de l’éducation est de former des personnes capables de faire des choses nouvelles.',
      pl:'Głównym celem edukacji jest kształtowanie ludzi zdolnych do robienia nowych rzeczy.',
      de:'Das Hauptziel der Bildung ist es, Menschen hervorzubringen, die fähig sind, Neues zu tun.',
      pt:'O principal objetivo da educação é formar pessoas capazes de fazer coisas novas.'
    },
    {
      author:'Lev Vygotsky',
      es:'Lo que un niño puede hacer hoy con ayuda, podrá hacerlo mañana por sí solo.',
      gl:'O que un neno pode facer hoxe con axuda, poderá facelo mañá por si só.',
      en:'What a child can do with assistance today, he will be able to do by himself tomorrow.',
      fr:'Ce qu’un enfant peut faire aujourd’hui avec de l’aide, il pourra le faire seul demain.',
      pl:'To, co dziecko potrafi dziś zrobić z pomocą, jutro będzie potrafiło zrobić samodzielnie.',
      de:'Was ein Kind heute mit Hilfe tun kann, wird es morgen selbstständig tun können.',
      pt:'O que uma criança consegue fazer hoje com ajuda, poderá fazer amanhã sozinha.'
    },
    {
      author:'Jerome Bruner',
      es:'Cualquier materia puede enseñarse de forma intelectualmente honesta a cualquier niño en cualquier etapa del desarrollo.',
      gl:'Calquera materia pode ensinarse de forma intelectualmente honesta a calquera neno en calquera etapa do desenvolvemento.',
      en:'Any subject can be taught in an intellectually honest form to any child at any stage of development.',
      fr:'Toute matière peut être enseignée de manière intellectuellement honnête à tout enfant, à n’importe quel stade de développement.',
      pl:'Każdego przedmiotu można nauczać w uczciwej intelektualnie formie każde dziecko na każdym etapie rozwoju.',
      de:'Jedes Fach kann jedem Kind in jeder Entwicklungsphase in intellektuell ehrlicher Form vermittelt werden.',
      pt:'Qualquer matéria pode ser ensinada de forma intelectualmente honesta a qualquer criança em qualquer etapa do desenvolvimento.'
    },
    {
      author:'Malala Yousafzai',
      es:'Un niño, un profesor, un libro y un lápiz pueden cambiar el mundo.',
      gl:'Un neno, un profesor, un libro e un lapis poden cambiar o mundo.',
      en:'One child, one teacher, one book and one pen can change the world.',
      fr:'Un enfant, un professeur, un livre et un stylo peuvent changer le monde.',
      pl:'Jedno dziecko, jeden nauczyciel, jedna książka i jeden długopis mogą zmienić świat.',
      de:'Ein Kind, eine Lehrkraft, ein Buch und ein Stift können die Welt verändern.',
      pt:'Uma criança, um professor, um livro e uma caneta podem mudar o mundo.'
    },
    {
      author:'Helen Keller',
      es:'El resultado más alto de la educación es la tolerancia.',
      gl:'O resultado máis alto da educación é a tolerancia.',
      en:'The highest result of education is tolerance.',
      fr:'Le plus haut résultat de l’éducation est la tolérance.',
      pl:'Najwyższym rezultatem edukacji jest tolerancja.',
      de:'Das höchste Ergebnis der Bildung ist Toleranz.',
      pt:'O resultado mais elevado da educação é a tolerância.'
    },
    {
      author:'Aristóteles',
      es:'Educar la mente sin educar el corazón no es educar en absoluto.',
      gl:'Educar a mente sen educar o corazón non é educar en absoluto.',
      en:'Educating the mind without educating the heart is no education at all.',
      fr:'Éduquer l’esprit sans éduquer le cœur, ce n’est pas éduquer du tout.',
      pl:'Kształcenie umysłu bez kształcenia serca nie jest prawdziwą edukacją.',
      de:'Den Verstand zu bilden, ohne das Herz zu bilden, ist keine Bildung.',
      pt:'Educar a mente sem educar o coração não é educar de modo algum.'
    }
  ];
  function dailyQuote(){
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const day = Math.floor((now - start) / 86400000);
    const q = DAILY_QUOTES[day % DAILY_QUOTES.length];
    const lang = currentLang();
    const key = lang==='Galego'?'gl':lang==='English'?'en':lang==='Français'?'fr':lang==='Polski'?'pl':lang==='Deutsch'?'de':lang==='Português'?'pt':'es';
    return { text:q[key] || q.es, author:q.author };
  }

  function teacherHome() {
    const students=State.data.students||[]; const assignedBadges=(State.data.userBadges||[]).length; const passReq=(State.data.passwordRequests||[]).filter(r=>r.status==='pending').length;
    const tools=[
      ['newPublication','✍️','Nueva publicación','Crear anuncios, avisos, materiales o tareas. Destinatarios ordenados por centro, etapa, curso y alumnado.'],
      ['activityLog','🕘','Qué ha ocurrido en el aula','Inicios de sesión, mensajes, publicaciones, calificaciones, dificultades e insignias.'],
      ['teacherAlerts','⚠️','Alertas docentes','Suspensos, materias con dificultades, solicitudes de contraseña e insignias pendientes.'],
      ['classOverview','📊','Vista general del aula','Cada grupo aparece en una tarjeta con alumnado y avisos básicos.'],
      ['assignBadge','🏅','Asignar insignia','Seleccionar uno o varios alumnos y asignar insignias docentes.'],
      ['passwordRequests','🔐','Solicitudes de recuperación','Solicitudes realizadas por el alumnado para restablecer contraseña.'],
      ['studentProfiles','👤','Perfiles del alumnado','Editar nombre, apellidos, usuario, centro, etapa, curso, horario, NEE, NEAE y observaciones.'],
      ['teacherSubjects','📚','Materias y materiales','Ver, crear, editar, ocultar o eliminar materias y revisar materiales por curso.'],
      ['guidance','🧭','Orientación académica','Subir, editar, ocultar o eliminar tests, documentos, enlaces y presentaciones de orientación.'],
      ['payments','💶','Pagos','Tarifas, mensualidades, meses pagados, recibís e histórico económico.'],
      ['attendance','📅','Asistencia y pausas','Registro de asistencia, faltas justificadas y pausas temporales de acceso.']
    ];
    const alertCount = teacherAlertCount();
    const unseenAlerts = Math.max(0, alertCount - Number(localStorage.getItem(`tribeca-alerts-seen-${State.profile.id}`)||0));
    return `<section class="teacher-dashboard t16-dashboard"><div class="section-heading teacher-heading-premium"><h2>Panel docente</h2><div class="teacher-stats"><span>${students.length} perfiles</span><span>${assignedBadges} insignias asignadas</span><span>${passReq} solicitudes de contraseña</span><span>${alertCount} alertas</span><button type="button" class="undo-chip" data-t30-undo>Deshacer último cambio</button></div></div><div class="t16-teacher-tools">${tools.map(([id,ic,title,desc])=>`<article class="t16-tool-card" role="button" tabindex="0" data-t16-tool="${id}"><span class="t16-tool-icon teacher-legacy-icon">${safe(ic)}</span><div><h3>${safe(title)}</h3><p>${safe(desc)}</p></div>${id==='passwordRequests'&&passReq?`<em>${passReq}</em>`:''}${id==='teacherAlerts'&&unseenAlerts?`<em id="teacherAlertsBadge">${unseenAlerts}</em>`:''}</article>`).join('')}</div></section>`;
  }
  function studentHome() {
    const p=State.profile; const diffs=State.data.difficulties||[]; const grades=State.data.grades||[]; const fails=grades.filter(g=>Number(g.grade)<5).length; const subjects=subjectList(p);
    const q=dailyQuote(); return `<section class="hero-card panel"><div class="hero-main"><p class="eyebrow">Panel personal de aprendizaje</p><h1>Hola, <span id="studentHeroName">${safe(displayName(p))}</span> <span class="wave">👋</span></h1><p>${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p><p class="muted">${safe(academicLine(p))}</p></div><div class="hero-quote-block"><blockquote>“${safe(q.text)}”<cite>${safe(q.author)}</cite></blockquote><img class="hero-watermark" src="assets/watermark-tribeca.png" alt="" aria-hidden="true"></div></section><section class="quick-grid"><article class="quick-card panel" data-tool="guidance" role="button"><span class="quick-icon">${toolIcon('guidance')}</span><h2>Orientación académica</h2><p>Tests vocacionales, inteligencia emocional, itinerarios, Bachillerato, FP y recursos para decidir mejor.</p></article><article class="quick-card panel" data-tool="badges" role="button"><span class="quick-icon">${toolIcon('badges')}</span><h2>Mis insignias</h2><p>${studentBadgeSummary()}</p></article><article class="quick-card panel" data-tool="difficulties" role="button"><span class="quick-icon">${toolIcon('difficulties')}</span><h2>Mis materias con dificultades</h2><p>${diffs.length?diffs.map(d=>safe(d.subject)).join(', '):'Indica dónde necesitas más refuerzo.'}</p></article><article class="quick-card panel" data-tool="grades" role="button"><span class="quick-icon">${toolIcon('grades')}</span><h2>Mis calificaciones</h2><p>${fails?`${fails} calificación/es suspensa/s`:grades.length?`${grades.length} calificaciones registradas`:'Registra tus notas del centro escolar.'}</p></article></section><section class="section-heading"><h2>Mis materias</h2><span>${safe(p.course||'')}</span></section><section class="subjects-grid" id="subjectsGrid">${subjects.map((s,i)=>subjectCard(s,i)).join('')}</section>`;
  }
  function subjectCard(subject, i) { const vis=subjectVisual(subject); const mats=visibleMaterials(subject); const units=new Set(mats.map(m=>m.unit_title||m.unit||'Unidad 1')); const pr=subjectProgress(subject); return `<article class="subject-card subject-${i%6}" tabindex="0" role="button" data-subject="${safe(subject)}" style="--subject-color:${vis.color}"><div class="subject-top"><span>${safe(State.profile.course||'')}</span></div><div class="subject-mark">${safe(vis.glyph)}</div><h3>${safe(subject)}</h3><p>${mats.length} publicaciones · ${units.size||0} unidades</p><div class="progress-row"><span>Progreso</span><strong>${pr.percent}%</strong></div><div class="progress"><span style="width:${pr.percent}%"></span></div><small>${pr.done}/${pr.total} publicaciones hechas.</small></article>`; }
  function bindSubjectCards(){ $$('.subject-card[data-subject]').forEach(card=>{card.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); openTool('subjectDetail', {subject:card.dataset.subject});});}); }
  function studentBadgeSummary(){ const earned=(State.data.userBadges||[]).filter(b=>b.user_id===State.profile?.id || b.student_id===State.profile?.id).length; if(earned) return `${earned} insignia${earned===1?'':'s'} asignada${earned===1?'':'s'} por la profesora`; return 'Sin insignias todavía.'; }

  function completionRows(){ return State.data.materialCompletions || []; }
  function completionStorageKey(materialId, userId=State.profile?.id){ return `tribeca-material-done-${userId||'anon'}-${materialId}`; }
  function isMaterialCompleted(materialId, userId=State.profile?.id){
    if(!materialId || !userId) return false;
    const row = completionRows().find(r => String(r.material_id)===String(materialId) && String(r.user_id)===String(userId));
    if(row) return row.completed !== false;
    return localStorage.getItem(completionStorageKey(materialId,userId)) === '1';
  }
  function subjectProgress(subject){
    const mats = visibleMaterials(subject).filter(m=>!m.hidden);
    const total = mats.length;
    const done = mats.filter(m=>isMaterialCompleted(m.id)).length;
    const percent = total ? Math.round((done/total)*100) : 0;
    return {total, done, percent};
  }
  async function toggleMaterialCompletion(materialId){
    if(roleTeacher()) return;
    const m=(State.data.materials||[]).find(x=>String(x.id)===String(materialId));
    if(!m) return toast('No se encontró la publicación.');
    const current = isMaterialCompleted(materialId);
    const next = !current;
    localStorage.setItem(completionStorageKey(materialId), next ? '1' : '0');
    try{
      if(next){
        await table('material_completions').upsert({user_id:State.profile.id, material_id:materialId, subject:m.subject||null, completed:true, completed_at:new Date().toISOString()}, {onConflict:'user_id,material_id'});
      } else {
        await table('material_completions').delete().eq('user_id',State.profile.id).eq('material_id',materialId);
      }
    }catch(e){
      console.warn('[Tribeca Aula] material_completions no disponible; se guarda en este navegador.', e?.message||e);
    }
    await loadData(true);
    toast(next?'Publicación marcada como hecha.':'Publicación marcada como pendiente.');
    renderApp(); rerender();
  }
  function materialCompletionButton(m){
    if(roleTeacher()) return '';
    const done = isMaterialCompleted(m.id);
    return `<button type="button" class="material-done-btn ${done?'is-done':''}" data-t33-toggle-completion="${safe(m.id)}">${done?'Hecha':'Marcar como hecha'}</button>`;
  }
  function materialOpenButton(m){
    return `<button type="button" class="secondary-btn material-open-btn" data-t33-open-mat="${safe(m.id)}">Abrir publicación</button>`;
  }
  function openMaterialInNewWindow(materialId){
    const m=(State.data.materials||[]).find(x=>String(x.id)===String(materialId));
    if(!m) return toast('No se encontró la publicación.');
    const meta=materialTypeMeta(m.material_type||m.type);
    const attachments=normalizeAttachments(m);
    const body=m.body||m.description||m.content||m.text||'';
    const w=window.open('', '_blank');
    if(!w) return toast('El navegador ha bloqueado la ventana emergente.');
    const attachmentHtml=attachments.length?`<section class="files"><h2>Archivos adjuntos</h2>${attachments.map((att,i)=>{ const url=att.url||att.href||att.path||att.publicUrl||att.public_url||''; const name=att.name||att.filename||att.file_name||`Archivo ${i+1}`; const type=String(att.type||att.mime_type||'').toLowerCase(); return url?`<a class="attachment" href="${safe(url)}" target="_blank" rel="noopener">${/^image\//.test(type)?`<img src="${safe(url)}" alt="">`:''}<span>📎 ${safe(name)}</span></a>`:`<p>📎 ${safe(name)}</p>`; }).join('')}</section>`:'';
    const fontSize = 12.5;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(m.title||'Publicación')}</title><style>:root{font-size:12.5px}*{box-sizing:border-box}body{margin:0;background:#f7f4ec;color:#172018;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5}.back-btn{position:fixed;top:16px;left:16px;z-index:20;display:inline-flex;align-items:center;gap:7px;border:1px solid #d7ccb5;border-radius:999px;background:#fffdf7;color:#0b3d22;text-decoration:none;font-weight:900;padding:8px 13px;box-shadow:0 8px 20px rgba(34,27,12,.09);font-size:13px}.back-btn:hover{background:#eef4e9}.wrap{max-width:620px;margin:0 auto;padding:64px 16px 28px}.head{border-left:4px solid #0b3d22;background:#fffdf7;border-radius:13px;padding:13px 16px;box-shadow:0 10px 26px rgba(35,28,12,.075)}.tag{display:inline-flex;border-radius:999px;background:#fff1df;color:#7b3c00;border:1px solid #f0c894;padding:4px 9px;font-weight:900;font-size:12px}h1{font-family:Georgia,serif;font-size:clamp(19px,1.55vw,24px);line-height:1.12;margin:12px 0 7px;letter-spacing:.01em}.meta{color:#6a6458;font-weight:750;font-size:13px;margin:0}.body,.files{background:#fffdf7;border:1px solid #e0d7c0;border-radius:13px;padding:13px 16px;margin-top:12px}.body{font-size:${fontSize}px}.body p{margin:0 0 12px}.image{display:block;max-width:100%;max-height:240px;object-fit:contain;border-radius:12px;margin:12px 0}.link,.attachment{display:flex;align-items:center;gap:8px;width:fit-content;margin:9px 0 0;padding:7px 11px;border-radius:999px;background:#eef4e9;color:#0b3d22;font-weight:900;text-decoration:none;font-size:13px}.files h2{font-size:16px;margin:0 0 10px}.attachment img{width:64px;height:48px;object-fit:cover;border-radius:8px}@media (max-width:680px){.wrap{padding:66px 12px 24px}.back-btn{top:10px;left:10px}.body,.files,.head{padding:14px}}@media print{.back-btn,.link{display:none}}</style></head><body><a class="back-btn" href="#" onclick="if(history.length>1){history.back();}else{window.close();}return false;">← Atrás</a><main class="wrap"><header class="head"><span class="tag">${safe(meta.icon)} ${safe(meta.label)}</span><h1>${safe(m.title||'Publicación')}</h1><p class="meta">${safe(m.subject||'Materia')} · ${safe(m.unit_title||m.unit||'Unidad 1')}</p></header><section class="body">${m.image_url?`<img class="image" src="${safe(m.image_url)}" alt="">`:''}<p>${safe(body).replace(/\n/g,'<br>')}</p>${m.link_url?`<a class="link" href="${safe(m.link_url)}" target="_blank" rel="noopener">Abrir enlace externo</a>`:''}</section>${attachmentHtml}</main></body></html>`);
    w.document.close();
  }

  const titleMap = {newPublication:'Nueva publicación',newDate:'Nueva fecha',activityLog:'Qué ha ocurrido en el aula',teacherAlerts:'Alertas docentes',classOverview:'Vista general del aula',assignBadge:'Asignar insignia',passwordRequests:'Solicitudes de recuperación',studentProfiles:'Perfiles del alumnado',payments:'Pagos',attendance:'Asistencia y pausas',teacherSubjects:'Materias y materiales',guidance:'Orientación académica',calendar:'Calendario',messages:'Mensajes',announcements:'Anuncios',profile:'Mi perfil',badges:'Mis insignias',difficulties:'Mis materias con dificultades',grades:'Mis calificaciones',subjectDetail:'Materia',aboutTribeca:'Detrás de Tribeca',legal:'Aviso legal',support:'Soporte',contact:'Contacto'};
  function openTool(id, opts={}) {
    if(!roleTeacher() && State.profile && activePauseFor(State.profile.id)) { renderApp(); return; }
    $('#profileMenu')?.setAttribute('hidden','');
    renderInlineSection(id, opts || {});
  }
  window.openTool = openTool;
  function baseAppUrl(){ return location.href.split('?')[0].split('#')[0]; }
  function openAppSectionInNewTab(section){
    renderInlineSection(String(section || 'subjects'));
  }
  function openedPageTarget(){
    const params = new URLSearchParams(location.search);
    return params.get('t39_page') || params.get('t37_page') || params.get('t36_page') || params.get('t35_open') || '';
  }
  function ensureOpenedTabBackButton(){
    if(!openedPageTarget() || document.getElementById('t36OpenedPageBack')) return;
    const btn = document.createElement('button');
    btn.id = 't36OpenedPageBack';
    btn.className = 't35-opened-tab-back t36-opened-page-back';
    btn.type = 'button';
    btn.textContent = '← Atrás';
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      if(history.length > 1) history.back(); else window.close();
    });
    document.body.appendChild(btn);
  }
  function standaloneSubjectsContent(){
    const p=State.profile;
    const subjects=subjectList(p);
    return `<section class="t36-standalone-head panel"><p class="eyebrow">Mis materias</p><h1>Materias de ${safe(p?.course||'')}</h1><p>${safe(academicLine(p))}</p></section><section class="subjects-grid t36-standalone-subjects" id="subjectsGrid">${subjects.map((s,i)=>subjectCard(s,i)).join('')}</section>`;
  }
  function renderStandalonePage(target){
    const main = $('#inicio');
    if(!main || !State.profile) return;
    if(!roleTeacher() && activePauseFor(State.profile.id)){ renderApp(); return; }
    const id = String(target || 'subjects');
    if(id === 'home') { showHomePage(); return; }
    document.body.classList.add('is-standalone-page');
    ensureMainNavHomeButton();
    ensureOpenedTabBackButton();
    setActiveMainNav(id);
    if(id === 'subjects') {
      main.innerHTML = standaloneSubjectsContent();
      bindSubjectCards();
    } else if(titleMap[id]) {
      let bodyHtml = '';
      try { bodyHtml = toolContent(id); }
      catch(error) { console.error(`[Tribeca Aula] Error al abrir página ${id}:`, error); bodyHtml = `<section class="window-panel"><h3>No se pudo cargar esta página</h3><p class="login-note">${safe(error?.message || 'Error desconocido')}</p></section>`; }
      main.innerHTML = `<section class="t36-standalone-head panel"><p class="eyebrow">Tribeca Aula</p><h1>${safe(titleMap[id]||id)}</h1></section><section class="t36-standalone-tool">${bodyHtml}</section>`;
      wireManagedForms(main);
      $$('.subject-card[data-subject]', main).forEach(card=>card.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); openTool('subjectDetail',{subject:card.dataset.subject});}));
      if(id==='announcements') visibleAnnouncements().forEach(a=>localStorage.setItem(`tribeca-ann-seen-${a.id}`,'1'));
    }
    updateBadges();
    applyTranslations();
  }
  function renderInlineSection(target, opts={}) {
    const main = $('#inicio');
    if(!main || !State.profile) return;
    if(!roleTeacher() && activePauseFor(State.profile.id)) { renderApp(); return; }
    const id = String(target || 'home');
    State.activeInlineSection = id;
    State.activeInlineOptions = opts || {};
    if(opts.subject) State.currentSubject = opts.subject;
    State.windows.forEach(win => win?.remove?.());
    State.windows.clear();
    document.body.classList.remove('is-standalone-page');
    document.body.classList.add('is-inline-section');
    ensureMainNavHomeButton();
    setActiveMainNav(id === 'subjectDetail' ? 'subjects' : id);

    if(id === 'home') {
      State.activeInlineSection = null;
      State.activeInlineOptions = {};
      renderApp();
      return;
    }

    if(id === 'subjects') {
      main.innerHTML = standaloneSubjectsContent();
      bindSubjectCards();
      window.scrollTo({top: 0, behavior: 'smooth'});
      updateBadges();
      applyTranslations();
      return;
    }

    let bodyHtml = '';
    try { bodyHtml = toolContent(id); }
    catch(error) {
      console.error(`[Tribeca Aula] Error al abrir sección ${id}:`, error);
      bodyHtml = `<section class="window-panel"><h3>No se pudo cargar esta sección</h3><p class="login-note">${safe(error?.message || 'Error desconocido')}</p></section>`;
    }

    const title = id === 'subjectDetail' && State.currentSubject ? State.currentSubject : (titleMap[id] || id);
    main.innerHTML = `<section class="t52-inline-head panel">
      <div>
        <p class="eyebrow">Tribeca Aula</p>
        <h1>${safe(title)}</h1>
      </div>
      <button type="button" class="secondary-btn" data-t52-go-home>← Página principal</button>
    </section>
    <section class="t52-inline-tool ${safe(id)}-inline">${bodyHtml}</section>`;

    wireManagedForms(main);
    $$('.subject-card[data-subject]', main).forEach(card => card.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      renderInlineSection('subjectDetail', {subject: card.dataset.subject});
    }));
    if(id === 'announcements') visibleAnnouncements().forEach(a => localStorage.setItem(`tribeca-ann-seen-${a.id}`, '1'));
    if(id === 'teacherAlerts' && roleTeacher()) localStorage.setItem(`tribeca-alerts-seen-${State.profile.id}`, String(teacherAlertCount()));
    window.scrollTo({top: 0, behavior: 'smooth'});
    updateBadges();
    applyTranslations();
  }
  window.TribecaRenderInlineSection = renderInlineSection;

  function handleInitialOpenRequest(){
    const target = openedPageTarget();
    if(!target || !State.profile) return;
    setTimeout(() => renderInlineSection(target), 80);
  }
  function refreshCalendarAfterNavigation(){
    if(State.activeInlineSection) renderInlineSection(State.activeInlineSection, State.activeInlineOptions || {});
    else rerender();
  }
  function parseCalendarInput(value){
    const raw = String(value || '').trim();
    if(!raw) return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const m = raw.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{4})$/);
    if(!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const date = new Date(year, month - 1, day);
    if(date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return toIso(date);
  }
  function chooseCalendarDate(){
    const current = parseIso(State.selectedDate || todayIso());
    const defaultValue = current.toLocaleDateString('es-ES');
    const answer = prompt('Introduce una fecha concreta en formato día/mes/año:', defaultValue);
    if(answer === null) return;
    const iso = parseCalendarInput(answer);
    if(!iso){ toast('Fecha no válida. Usa el formato día/mes/año, por ejemplo 31/05/2026.'); return; }
    State.selectedDate = iso;
    State.selectedEventId = null;
    State.calendarMonth = startMonth(parseIso(iso));
    refreshCalendarAfterNavigation();
  }
  function rerender(){
    if(State.activeInlineSection) {
      renderInlineSection(State.activeInlineSection, State.activeInlineOptions || {});
      return;
    }
    State.windows.forEach((_,id)=>openTool(id));
    updateBadges();
  }
  window.rerenderOpenWindows = rerender;
  function enableDrag(win){ const bar=$('.window-titlebar',win); if(!bar || bar.dataset.dragReady) return; bar.dataset.dragReady='1'; bar.addEventListener('pointerdown', e=>{ if(e.target.closest('button')||win.classList.contains('is-maximized')) return; const r=win.getBoundingClientRect(); const ox=e.clientX-r.left, oy=e.clientY-r.top; win.style.transform='none'; const move=me=>{win.style.left=`${me.clientX-ox}px`;win.style.top=`${me.clientY-oy}px`;}; const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);}; document.addEventListener('pointermove',move); document.addEventListener('pointerup',up); }); }
  function toolContent(id) {
    if(id==='newPublication') return newPublicationContent(); if(id==='newDate') return calendarContent(true); if(id==='calendar') return calendarContent(false); if(id==='activityLog') return activityContent(); if(id==='teacherAlerts') return alertsContent(); if(id==='classOverview') return classOverviewContent(); if(id==='assignBadge') return assignBadgeContent(); if(id==='passwordRequests') return passwordRequestsContent(); if(id==='studentProfiles') return studentProfilesContent(); if(id==='teacherSubjects') return teacherSubjectsContent(); if(id==='guidance') return guidanceContent(); if(id==='payments') return paymentsContent(); if(id==='attendance') return attendanceContent(); if(id==='messages') return messagesContent(); if(id==='announcements') return announcementsContent(); if(id==='profile') return profileContent(); if(id==='badges') return badgesContent(); if(id==='difficulties') return difficultiesContent(); if(id==='grades') return gradesContent(); if(id==='subjectDetail') return subjectDetailContent(State.currentSubject); if(id==='aboutTribeca') return aboutTribecaContent(); if(id==='legal') return legalContent(); if(id==='support') return supportContent(); if(id==='contact') return contactContent(); return '<div class="empty-state">Herramienta sin contenido.</div>';
  }

  function classSubjectOptions(stage = State.selectedSubjectStage, course = State.selectedSubjectCourse) {
    return (subjectCatalog[`${stage}-${course}`] || []).map(x => `<option>${safe(x)}</option>`).join('');
  }
  function recipientSelector(prefix='pub') {
    const students=State.data.students||[];
    return `<section class="window-panel recipient-panel"><h3>3. Destinatarios</h3><p class="meta">Primero elige el alcance. Si eliges alumnos concretos, marca uno o varios perfiles.</p><div class="t16-scope-grid premium-scope"><label><input type="radio" name="targetScope" value="all" checked> Todo el alumnado</label><label><input type="radio" name="targetScope" value="class"> Centro, etapa y curso</label><label><input type="radio" name="targetScope" value="selected"> Alumnos concretos</label></div><div class="window-grid"><label>Centro<select name="center"><option value="">Sin filtrar</option>${options(centers)}</select></label><label>Etapa<select name="stage"><option value="">Sin filtrar</option>${options(stages)}</select></label><label>Curso<select name="course"><option value="">Sin filtrar</option>${options(courses)}</select></label></div><input class="t16-search" type="search" placeholder="Filtrar alumnado por nombre o usuario..." data-t16-student-search><div class="recipient-scroll">${groups(students).map(g=>`<details class="recipient-group" open><summary>${safe(g.label)} <span>${g.items.length}</span></summary><div class="recipient-pills">${g.items.map(s=>`<label data-student-name="${safe((displayName(s)+' '+s.username+' '+academicLine(s)).toLowerCase())}"><input type="checkbox" name="targetUserIds" value="${safe(s.id)}"><span>${safe(displayName(s))}<small>${safe(s.username||'')} · ${safe(s.course||'')}</small></span></label>`).join('')}</div></details>`).join('')}</div></section>`;
  }
  function normalizeMaterialKind(value='') {
    const v = String(value || '').trim().toLowerCase();
    if(!v) return 'material';
    if(['announcement','notice','news','anuncio','aviso','noticia'].includes(v)) return 'announcement';
    if(['game','juego','jocs','play','gamified','ludico','lúdico'].includes(v) || /juego|game|l[uú]dic/.test(v)) return 'game';
    if(['test','quiz','external_test','prueba','cuestionario','daypo'].includes(v) || /test|quiz|cuestionario|prueba/.test(v)) return 'test';
    if(['task','tarea','actividad','activity','assignment','exercise','ejercicio'].includes(v) || /tarea|actividad|assignment|ejercicio/.test(v)) return 'task';
    if(['link','url','external_link','enlace','recurso','resource'].includes(v) || /enlace|link|url|recurso/.test(v)) return 'material';
    return 'material';
  }
  function dbMaterialType(kind='material') {
    const k = normalizeMaterialKind(kind);
    return ({ material:'apuntes', task:'tarea', test:'test', game:'juego' }[k] || 'apuntes');
  }
  function materialTypeMeta(value='material') {
    const k = normalizeMaterialKind(value);
    const map = {
      material: { key:'material', label:'Material', icon:'📄' },
      task: { key:'task', label:'Tarea', icon:'✅' },
      test: { key:'test', label:'Test externo', icon:'🧪' },
      game: { key:'game', label:'Juego', icon:'🎮' },
      announcement: { key:'announcement', label:'Anuncio', icon:'📣' }
    };
    return map[k] || map.material;
  }
  function selectedAttr(a,b){ return String(a||'')===String(b||'') ? 'selected' : ''; }
  async function persistSupabaseRecord(tableName, payload, id=null) {
    let current = {...payload};
    const materialFallbacks = ['apuntes','tarea','test','juego','actividad','recurso','documento','document','link','material'];
    for(let attempt=0; attempt<12; attempt++) {
      const res = id ? await table(tableName).update(current).eq('id', id) : await table(tableName).insert(current);
      if(!res.error) return res;
      const msg = String(res.error.message || res.error.details || res.error.hint || '');
      const col = (msg.match(/'([^']+)' column/) || msg.match(/column "?([a-zA-Z0-9_]+)"?/) || [])[1];
      if(col && Object.prototype.hasOwnProperty.call(current, col)) { delete current[col]; continue; }
      if(tableName === 'subject_materials' && /material_type.*check|check constraint|violates check/i.test(msg)) {
        const next = materialFallbacks.find(x => x !== current.material_type);
        if(next) { current.material_type = next; materialFallbacks.splice(materialFallbacks.indexOf(next), 1); continue; }
      }
      throw res.error;
    }
    throw new Error('No se pudo guardar la publicación después de adaptar los campos a Supabase.');
  }
  function newPublicationContent() {
    const edit = State.pendingPublicationEdit || null;
    const item = edit?.item || {};
    const editing = !!edit?.id;
    const kind = editing ? (edit.kind || (edit.table === 'announcements' ? 'announcement' : normalizeMaterialKind(item.material_type || item.type))) : 'announcement';
    const subjectValue = State.prefillPublicationSubject || item.subject || '';
    const dynamic = (State.data.subjects || []).map(s => s.subject).filter(Boolean);
    const allSubjects = [...new Set(Object.values(subjectCatalog).flat().concat(dynamic, ['Apoyo personalizado','Tutoría', subjectValue].filter(Boolean)))];
    const unitValue = item.unit_title || item.unit || '';
    const attachments = normalizeAttachments(item);
    const attachmentsJson = JSON.stringify(attachments).replace(/"/g, '&quot;');
    const typeCard = (value, icon, title, desc) => `<label><input type="radio" name="publicationKind" value="${value}" ${normalizeMaterialKind(kind)===normalizeMaterialKind(value)?'checked':''}><span>${icon} ${title}<small>${desc}</small></span></label>`;
    return `<form id="t16PublicationForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="t18-publication-wizard"><input type="hidden" name="editId" value="${safe(edit?.id||'')}"><input type="hidden" name="editTable" value="${safe(edit?.table||'')}"><section class="window-panel t18-publish-main"><h3>${editing?'Editar publicación':'1. Qué vas a publicar'}</h3>${editing?'<p class="meta">Estás modificando una publicación existente. Al guardar no se creará una copia duplicada.</p>':''}<div class="t18-type-cards">${typeCard('announcement','📣','Anuncio, aviso o noticia','Se verá en Anuncios, no dentro de una materia.')}${typeCard('material','📄','Material de materia','Apuntes, boletín, documento o recurso.')}${typeCard('task','✅','Tarea o actividad','Las insignias se asignan manualmente desde el panel docente.')}${typeCard('test','🧪','Test externo','Usa el enlace para el test interactivo.')}${typeCard('game','🎮','Juego','Actividad lúdica o enlace a juego.')}</div><div class="window-grid"><label>Materia<select name="subject"><option value="">Sin materia</option>${allSubjects.map(s=>`<option value="${safe(s)}" ${selectedAttr(s,subjectValue)}>${safe(s)}</option>`).join('')}</select></label><label>Unidad didáctica<input name="unit" placeholder="Unidad 1" value="${safe(unitValue)}"></label></div><label>Título<input name="title" class="title-input" maxlength="120" required placeholder="Título claro de la publicación" value="${safe(item.title||'')}"></label><label>Cuerpo<textarea name="body" rows="7" maxlength="1800" placeholder="Escribe el contenido de la publicación con instrucciones claras.">${safe(item.body||item.description||item.content||item.text||'')}</textarea></label><div class="t16-emoji-row">${['😀','🙂','👏','💡','⭐','📌','📚','🧠','🎯','🏅','✅','🔥','⚠️','📝','🔗'].map(e=>`<button type="button" data-t16-emoji="${e}">${e}</button>`).join('')}</div><div class="window-grid"><label>Tamaño de texto<select name="fontSize">${[15,16,18,20,22].map(n=>`<option ${Number(item.font_size||16)===n?'selected':''}>${n}</option>`).join('')}</select></label><label>Enlace externo<input name="linkUrl" type="url" placeholder="https://..." value="${safe(item.link_url||item.url||'')}"></label></div></section><section class="window-panel publication-files-panel"><h3>2. Archivos adjuntos</h3><p class="meta">Añade una imagen visible o documentos para que el alumnado los consulte desde la publicación.</p><label>Imagen visible en la publicación<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp"><input type="hidden" name="imageUrl" value="${safe(item.image_url||'')}"><span id="t16ImagePreview" class="t16-image-preview">${item.image_url?`<img src="${safe(item.image_url)}" alt="">`:''}</span></label><label>Documentos adjuntos PDF, Word o imágenes<input name="attachmentFiles" type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" multiple><input type="hidden" name="attachmentsJson" value="${attachmentsJson}"><span class="meta" id="attachmentPreview">${attachments.length?attachments.map(a=>safe(a.name||a.filename||'Archivo adjunto')).join(', '):'Ningún archivo seleccionado.'}</span></label></section>${recipientSelector()}<footer class="publish-sticky-footer"><button class="primary-btn" type="submit">${editing?'Guardar cambios':'Publicar ahora'}</button>${editing?'<button class="secondary-btn" type="button" data-t32-cancel-publication-edit>Cancelar edición</button>':''}</footer></form>`;
  }
  async function savePublication(form) {
    const fd=new FormData(form); const rawKind=fd.get('publicationKind'); const kind=normalizeMaterialKind(rawKind); const scope=fd.get('targetScope')||'all'; const ids=fd.getAll('targetUserIds'); const editId=String(fd.get('editId')||'').trim(); const editTable=String(fd.get('editTable')||'').trim();
    const rec={ title:fd.get('title'), body:fd.get('body')||'', description:fd.get('body')||'', content:fd.get('body')||'', image_url:fd.get('imageUrl')||null, link_url:fd.get('linkUrl')||null, font_size:Number(fd.get('fontSize')||16), target_scope:scope, target_user_ids:ids, center:fd.get('center')||null, stage:fd.get('stage')||null, course:fd.get('course')||null, created_by:State.profile.id, hidden:false };
    let attachments = [];
    try { attachments = JSON.parse(fd.get('attachmentsJson')||'[]'); } catch(_e) { attachments = []; }
    const isAnnouncement = kind === 'announcement' || editTable === 'announcements';
    const tableName = isAnnouncement ? 'announcements' : 'subject_materials';
    const payload = isAnnouncement ? {...rec, announcement_type:'announcement', attachments} : {...rec, subject:fd.get('subject')||'Apoyo personalizado', unit_title:fd.get('unit')||'Unidad 1', unit:fd.get('unit')||'Unidad 1', material_type:dbMaterialType(kind), badge_codes:[], attachments};
    if(editId) { delete payload.created_by; delete payload.hidden; }
    await persistSupabaseRecord(tableName, payload, editId || null);
    await log('publication', editId?'Publicación modificada':'Nueva publicación',{title:rec.title, kind, table:tableName});
    State.pendingPublicationEdit=null; State.prefillPublicationSubject=null;
    await loadData(true); toast(editId?'Publicación modificada.':'Publicación guardada.'); form.reset(); rerender();
  }

  function eventColorType(e){ return e.event_type || e.type || 'personal'; }
  function isClosedEvent(e){ const t=eventColorType(e); return ['national','galicia','local','closed'].includes(t) || /no abre|cerrad/i.test(String(e.body||e.description||e.title||'')); }
  function calendarGrid() {
    const month=State.calendarMonth; const first=startMonth(month); const start=addDays(first,-((first.getDay()+6)%7)); const events=relevantEvents(); const weekdays=['L','M','X','J','V','S','D'];
    let html=`<div class="t16-calendar-head"><button type="button" data-t16-cal-prev aria-label="Mes anterior">‹</button><button type="button" class="t40-calendar-month-button" data-t40-cal-jump title="Elegir una fecha concreta">${month.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</button><button type="button" data-t16-cal-next aria-label="Mes siguiente">›</button></div><div class="event-legend"><span><i class="event-national"></i>Nacional</span><span><i class="event-galicia"></i>Galicia</span><span><i class="event-local"></i>Corcubión</span><span><i class="event-school"></i>Escolar</span><span><i class="event-exam"></i>Examen</span><span><i class="event-delivery"></i>Entrega</span><span><i class="event-personal"></i>Personal</span></div><div class="t16-calendar-grid">${weekdays.map(d=>`<div class="calendar-weekday">${d}</div>`).join('')}`;
    for(let i=0;i<42;i++){ const d=addDays(start,i); const iso=toIso(d); const evs=events.filter(e=>e.date===iso); html+=`<button type="button" class="calendar-day ${d.getMonth()!==month.getMonth()?'is-other':''} ${iso===todayIso()?'is-today':''} ${iso===State.selectedDate?'is-selected':''} ${evs.some(isClosedEvent)?'is-closed-day':''}" data-t16-day="${iso}"><span class="day-number">${d.getDate()}</span>${evs.slice(0,4).map(e=>`<span class="day-event-label"><i class="day-event-dot event-${safe(eventColorType(e))}"></i>${safe(e.title)}</span>`).join('')}</button>`; }
    return html+'</div>';
  }
  function calendarContent(forceCreate=false) {
    const events=relevantEvents();
    const selected=events.filter(e=>e.date===State.selectedDate);
    const todayStart=parseIso(todayIso());
    const upcomingLimit=addDays(todayStart,7);
    const upcoming=events.filter(e=>{ const d=parseIso(e.date); return d>=todayStart && d<=upcomingLimit; }).sort((a,b)=>parseIso(a.date)-parseIso(b.date));
    const edit=State.selectedEventId ? events.find(e=>e.id===State.selectedEventId) : null; const closed=selected.filter(isClosedEvent);
    return `<div class="t16-calendar-layout premium-calendar"><section class="window-panel calendar-main-panel">${calendarGrid()}</section><section class="window-panel calendar-side-panel">${closed.length?`<div class="closed-alert"><strong>Tribeca Academia no abre este día</strong><p>${closed.map(e=>safe(e.title)).join(' · ')}</p></div>`:''}<h3>${forceCreate?'Nueva fecha':'Eventos del día'} · ${fmtDate(State.selectedDate)}</h3><div class="item-list">${selected.length?selected.map(e=>eventCard(e)).join(''):'<div class="empty-state">No hay eventos este día. Puedes crear uno nuevo.</div>'}</div><hr>${eventForm(edit)}</section><section class="window-panel upcoming-panel"><h3>Próximas fechas <span class="meta">7 días</span></h3><div class="item-list">${upcoming.map(e=>`<article class="list-item event-${safe(eventColorType(e))}" data-t16-event="${safe(e.id)}"><strong>${fmtDate(e.date)} · ${safe(e.title)}</strong><p>${safe(e.body||e.description||'')}</p><small>${safe(eventLabel(e))}</small></article>`).join('')||'<div class="empty-state">Sin próximas fechas en los próximos 7 días.</div>'}</div></section></div>`;
  }
  function eventLabel(e){ const t=eventColorType(e); return ({national:'Nacional',galicia:'Galicia',corcubion:'Corcubión',school:'Escolar',exam:'Examen',delivery:'Entrega',personal:'Personal',teacher:'Profesora',closed:'Tribeca cerrado',class:'Grupo-clase',student_absence:'No asistiré a clases','school-proposal':'Escolar'}[t] || t || 'Evento'); }
  function eventCard(e){ const actions=canEditEvent(e)?`<div class="inline-actions"><button type="button" data-t16-event="${safe(e.id)}">Editar</button><button type="button" data-t16-hide-event="${safe(e.id)}">${e.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t16-delete-event="${safe(e.id)}">Eliminar</button></div>`:''; return `<article class="list-item event-${safe(eventColorType(e))}"><strong>${safe(e.title)}</strong><p>${safe(e.body||e.description||'')}</p><small>${safe(eventLabel(e))} · Añadido por ${safe(e.author_name||e.created_by_name||studentName(e.created_by)||'Tribeca Aula')}</small>${actions}</article>`; }
  function eventForm(e=null){
    const can=!e||canEditEvent(e);
    const teacher = roleTeacher();
    const typeOptions = teacher
      ? [['teacher','Profesora'],['closed','Tribeca cerrado'],['personal','Personal'],['class','Clase'],['exam','Examen'],['delivery','Entrega'],['school','Escolar']]
      : [['student_absence','No asistiré a clases'],['personal','Personal'],['class','Grupo-clase']];
    const scopeOptions = teacher
      ? [['all','Todo el alumnado'],['class','Grupo-clase'],['user','Personal']]
      : [['user','Solo para mí'],['class','Mi grupo-clase']];
    const currentType = e?.event_type || e?.type || (teacher ? 'teacher' : 'personal');
    const currentScope = e?.scope || e?.target_scope || 'user';
    return `<form id="t16EventForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid premium-event-form"><input type="hidden" name="id" value="${safe(e?.id||'')}"><label>Fecha<input name="eventDate" type="date" value="${safe(e?.date||State.selectedDate)}" required ${can?'':'disabled'}></label><label>Título<input name="title" value="${safe(e?.title||'')}" required ${can?'':'disabled'}></label><label>Descripción<textarea name="body" rows="3" ${can?'':'disabled'}>${safe(e?.body||e?.description||'')}</textarea></label><div class="window-grid"><label>Tipo<select name="eventType" ${can?'':'disabled'}>${typeOptions.map(([v,l])=>`<option value="${v}" ${currentType===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Visibilidad<select name="scope" ${can?'':'disabled'}>${scopeOptions.map(([v,l])=>`<option value="${v}" ${currentScope===v?'selected':''}>${l}</option>`).join('')}</select></label></div><button class="primary-btn" type="button" data-t25-save-event onclick="return window.TribecaSaveCalendarEventDirect(this,event)" ${can?'':'disabled'}>${e?'Guardar cambios':'Añadir evento'}</button></form>`;
  }
  async function triggerEmailOutboxSend(eventType=''){
    try {
      if(!State.client?.functions?.invoke) return null;
      const cleanType = String(eventType || '').trim();
      const body = cleanType ? { event_type: cleanType } : {};
      const res = await State.client.functions.invoke('tribeca-send-email-outbox', { body });
      if(res?.error) throw res.error;
      return res?.data || null;
    } catch(error) {
      console.warn('[Tribeca Aula] La cola de email se ha preparado, pero no se pudo activar el envío inmediato:', error);
      return null;
    }
  }

  async function queueCalendarEmailNotification(rec, isUpdate=false){
    if(roleTeacher() || isUpdate) return;
    try {
      const payload = {
        event_date: rec.event_date,
        title: rec.title,
        body: rec.body || '',
        event_type: rec.event_type || '',
        scope: rec.scope || '',
        center: rec.center || State.profile?.center || '',
        stage: rec.stage || State.profile?.stage || '',
        course: rec.course || State.profile?.course || '',
        actor_id: State.profile?.id || null,
        actor_name: displayName(State.profile),
        actor_username: State.profile?.username || '',
        created_at: new Date().toISOString()
      };
      const rpc = await State.client.rpc('tribeca_queue_teacher_calendar_email_v63', { p_payload: payload });
      if(rpc?.error) throw rpc.error;
      const queued = Number(rpc?.data || 0);
      if(queued > 0) {
        await triggerEmailOutboxSend('calendar');
        toast(`Fecha creada. Aviso por email enviado o preparado para ${queued} destinatario${queued===1?'':'s'}.`);
      }
    } catch(error) {
      console.warn('[Tribeca Aula] No se pudo preparar el aviso por email del calendario:', error);
      await maybe(table('notifications').insert({
        target_role:'teacher',
        tool:'calendar',
        title:'Aviso pendiente de calendario',
        body:`${displayName(State.profile)} ha añadido una fecha al calendario, pero no se pudo preparar el email automático. Revisa la configuración de notificaciones.`
      }));
      toast('Fecha creada. No se pudo preparar el email automático; revisa la configuración de notificaciones.');
    }
  }

  async function queueTeacherMessageEmailNotification(payload){
    try {
      const emailPayload = {
        subject: payload.subject || 'Mensaje nuevo',
        body: payload.body || '',
        reason: payload.reason || '',
        sender_id: payload.sender_id || State.profile?.id || null,
        sender_name: payload.sender_name || displayName(State.profile),
        sender_username: State.profile?.username || '',
        recipient_id: payload.recipient_id || null,
        created_at: new Date().toISOString()
      };
      const rpc = await State.client.rpc('tribeca_queue_teacher_message_email_v63', { p_payload: emailPayload });
      if(rpc?.error) throw rpc.error;
      const queued = Number(rpc?.data || 0);
      if(queued > 0) await triggerEmailOutboxSend('message');
    } catch(error) {
      console.warn('[Tribeca Aula] No se pudo preparar el aviso por email del mensaje:', error);
      await maybe(table('notifications').insert({
        target_role:'teacher',
        tool:'messages',
        title:'Aviso pendiente de mensaje',
        body:`${displayName(State.profile)} ha enviado un mensaje, pero no se pudo preparar el email automático.`
      }));
    }
  }
  async function saveEvent(form){
    const fd=new FormData(form); const id=String(fd.get('id')||'').trim(); const type=fd.get('eventType')||'personal';
    const rawScope = fd.get('scope') || (roleTeacher() ? 'all' : 'user');
    const scope = roleTeacher() ? (type==='closed'?'all':rawScope) : (rawScope==='class'?'class':'user');
    const rec={ id:id||null, event_date:fd.get('eventDate'), title:String(fd.get('title')||'').trim(), body:fd.get('body')||'', event_type:type, scope, center:State.profile.center, stage:State.profile.stage, course:State.profile.course, created_by:State.profile.id, user_id:(scope==='user'?State.profile.id:null), hidden:false };
    if(!rec.event_date || !rec.title) throw new Error('Completa la fecha y el título.');
    const rpc=await State.client.rpc('tribeca_save_calendar_event_v27',{p_payload:rec});
    if(rpc.error) throw rpc.error;
    await log('calendar', id?'Fecha actualizada':'Fecha creada', {title:rec.title,date:rec.event_date});
    await queueCalendarEmailNotification(rec, !!id);
    await loadData(true); toast(id?'Fecha actualizada.':'Fecha creada.'); rerender();
  }

  function activityTypeClass(type=''){ const t=String(type||'').toLowerCase(); if(t.includes('login')) return 'activity-login'; if(t.includes('message')) return 'activity-message'; if(t.includes('publication')||t.includes('guidance')) return 'activity-publication'; if(t.includes('calendar')) return 'activity-calendar'; if(t.includes('badge')) return 'activity-badge'; if(t.includes('grade')) return 'activity-grade'; if(t.includes('difficulty')) return 'activity-difficulty'; if(t.includes('profile')) return 'activity-profile'; return 'activity-generic'; }
  function activityContent(){ const cutoff=State.activitySince?new Date(State.activitySince):new Date(0); const rows=(State.data.activity||[]).filter(a=>new Date(a.created_at||0)>cutoff); return `<section class="window-panel"><h3>Qué ha ocurrido desde tu última sesión</h3><p class="meta">Solo se muestran acciones posteriores a tu último acceso al aula.</p>${rows.length?`<div class="activity-list">${rows.map(a=>`<article class="list-item activity-card ${activityTypeClass(a.action_type)}"><strong>${safe(a.title||a.action_type)}</strong><p>${safe(a.actor_name||'Sistema')} · ${safe(a.action_type||'')}</p><small>${fmtDT(a.created_at)}</small></article>`).join('')}</div>`:'<div class="empty-state">No hay actividad nueva desde tu última sesión.</div>'}</section>`; }
  function alertsContent(){ const grades=(State.data.grades||[]).filter(g=>Number(g.grade)<5); const diff=State.data.difficulties||[]; const pass=(State.data.passwordRequests||[]).filter(r=>r.status==='pending'); const unpaid=unpaidPaymentAlerts(); return `<div class="window-grid"><section class="window-panel"><h3>Calificaciones bajas</h3>${grades.length?grades.map(g=>`<article class="list-item danger"><strong>${safe(g.subject)} · ${g.grade}</strong><p>${studentName(g.user_id)} · ${safe(g.evaluation||'')}</p></article>`).join(''):'<div class="empty-state">Sin suspensos registrados.</div>'}</section><section class="window-panel"><h3>Dificultades declaradas</h3>${diff.length?diff.map(d=>`<article class="list-item"><strong>${safe(d.subject)}</strong><p>${studentName(d.user_id)} · ${safe(d.level||'')}</p></article>`).join(''):'<div class="empty-state">Sin materias con dificultades.</div>'}</section><section class="window-panel"><h3>Pendientes</h3><p>${pass.length} recuperaciones de contraseña · ${unpaid.length} mensualidades pendientes vencidas.</p>${unpaid.map(a=>`<article class="list-item danger"><strong>${safe(a.name)} · ${safe(a.month)}</strong><p>Importe previsto: ${money(a.amount)}</p></article>`).join('')}</section></div>`; }
  function fieldArray(value){ if(Array.isArray(value)) return value.filter(Boolean); if(!value) return []; if(typeof value==='string'){ try{ const parsed=JSON.parse(value); if(Array.isArray(parsed)) return parsed.filter(Boolean); }catch(_e){} return value.split(/[;,]/).map(x=>x.trim()).filter(Boolean); } return []; }
  function supportSummary(s){ const nee=fieldArray(s.nee_types); const neae=fieldArray(s.neae_types); const health=fieldArray(s.health_conditions); const flags=[]; if(s.personalized_attention) flags.push('Atención personalizada'); if(nee.length) flags.push(`${nee.length} NEE`); if(neae.length) flags.push(`${neae.length} NEAE`); if(health.length) flags.push(`${health.length} condición/es registradas`); return {nee,neae,health,flags}; }
  function classOverviewContent(){
    const students=State.data.students||[]; const gs=groups(students);
    const totals=students.reduce((acc,s)=>{ const sup=supportSummary(s); acc.nee+=sup.nee.length?1:0; acc.neae+=sup.neae.length?1:0; acc.health+=sup.health.length?1:0; acc.attention+=s.personalized_attention?1:0; return acc; }, {nee:0,neae:0,health:0,attention:0});
    return `<section class="class-overview-premium"><div class="overview-hero window-panel"><div><p class="eyebrow">Vista docente</p><h3>Vista general del aula</h3><p class="meta">Resumen por grupos con alumnado, alertas académicas y condiciones de atención personalizada visibles solo para la profesora.</p></div><div class="overview-kpis"><span><strong>${students.length}</strong> alumnado</span><span><strong>${gs.length}</strong> grupos</span><span><strong>${totals.nee}</strong> con NEE</span><span><strong>${totals.neae}</strong> con NEAE</span><span><strong>${totals.health}</strong> condiciones registradas</span></div></div><div class="overview-group-grid">${gs.map(g=>{ const needCount=g.items.filter(s=>supportSummary(s).flags.length).length; return `<article class="overview-group-card window-panel"><header><div><h3>${safe(g.label)}</h3><p>${g.items.length} alumno/s · ${needCount} con seguimiento especial</p></div><span>${g.items.length}</span></header><div class="overview-student-list">${g.items.map(st=>{ const sup=supportSummary(st); const fails=(State.data.grades||[]).filter(x=>String(x.user_id||x.student_id)===String(st.id)&&Number(x.grade)<5).length; const diff=(State.data.difficulties||[]).filter(x=>String(x.user_id)===String(st.id)).length; const pause=pauseStatusText(st.id); return `<div class="overview-student-row ${pause?'is-paused-row':''}"><div><strong>${safe(displayName(st))}</strong><small>${safe(st.username||'')} · ${safe(st.course||'')}${pause?' · EN PAUSA':''}</small></div><div class="overview-tags">${pause?`<em class="tag-pause">${safe(pause)}</em>`:''}${fails?`<em class="tag-danger">${fails} suspenso/s</em>`:''}${diff?`<em>${diff} dificultad/es</em>`:''}${sup.flags.map(f=>`<em class="tag-support">${safe(f)}</em>`).join('')||(!pause?'<em class="tag-muted">Sin observaciones especiales</em>':'')}</div></div>`; }).join('')}</div></article>`; }).join('')||'<div class="empty-state">No hay alumnado cargado.</div>'}</div></section>`;
  }
  function assignBadgeContent(){
    const students=State.data.students||[]; const grouped=groups(students);
    const firstBadge = badges[0] || {icon:'🏅', name:'Insignia'};
    return `<section class="assign-badge-premium t32-assign-badge"><div class="assign-badge-header window-panel"><div><p class="eyebrow">Reconocimiento docente</p><h3>Asignar insignia manualmente</h3><p class="meta">Flujo simplificado: elige insignia, filtra alumnado y marca perfiles. Puedes seleccionar un grupo completo o solo los alumnos visibles tras la búsqueda.</p></div><span class="t35-badge-symbol">🏅</span></div><form id="t16AssignBadgeForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="window-panel assign-badge-form t35-badge-form t32-badge-form"><aside class="t32-assign-sidebar"><div class="t32-step"><span>1</span><strong>Insignia</strong></div><label>Insignia<select name="badgeCode" required>${badges.map(b=>`<option value="${b.code}">${b.icon} ${safe(b.name)}</option>`).join('')}</select></label><div class="t32-badge-preview"><span>${safe(firstBadge.icon)}</span><div><strong>Reconocimiento manual</strong><small>Se guardará en el perfil del alumnado seleccionado.</small></div></div><div class="t32-step"><span>2</span><strong>Búsqueda</strong></div><label>Filtrar alumnado<input class="t16-search" type="search" placeholder="Filtrar por nombre, usuario, centro, etapa o curso..." data-t16-student-search></label><div class="t32-badge-toolbar"><button type="button" class="secondary-btn" data-t32-select-visible>Marcar visibles</button><button type="button" class="secondary-btn" data-t32-clear-all>Desmarcar todo</button></div><p class="t35-counter">${students.length} perfiles disponibles · ${grouped.length} grupos</p></aside><main class="t32-assign-main"><div class="t32-step"><span>3</span><strong>Alumnado</strong></div><div class="t35-badge-groups t32-badge-groups">${grouped.map((g,idx)=>`<details class="t35-badge-group t32-badge-group" open><summary><strong>${safe(g.label)}</strong><span>${g.items.length}</span></summary><div class="t32-group-tools"><button type="button" data-t32-select-group="${idx}">Seleccionar este grupo</button><button type="button" data-t32-clear-group="${idx}">Limpiar grupo</button></div><div class="t35-badge-student-grid t32-badge-student-grid">${g.items.map(st=>`<label class="t35-badge-student t32-badge-student" data-student-name="${safe((displayName(st)+' '+(st.username||'')+' '+academicLine(st)).toLowerCase())}"><input type="checkbox" name="userIds" value="${safe(st.id)}"><span class="t32-student-avatar">${safe((displayName(st)||'?').slice(0,1).toUpperCase())}</span><span class="t32-student-copy"><strong>${safe(displayName(st))}</strong><small>${safe(st.username||'')} · ${safe(st.center||'Sin centro')} · ${safe(st.course||'Sin curso')}</small></span></label>`).join('')}</div></details>`).join('')}</div></main><footer class="t32-assign-footer"><button class="primary-btn t35-assign-submit" type="submit">Asignar insignia</button></footer></form></section>`;
  }
  async function saveUserBadgesWithoutDuplicates(rows){
    if(!rows.length) return { inserted:0, skipped:0 };
    const code = rows[0].badge_code;
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const existing = await maybe(table('user_badges').select('user_id,badge_code').eq('badge_code', code).in('user_id', ids), []);
    const existingIds = new Set((existing || []).map(x => x.user_id));
    const pending = rows.filter(r => !existingIds.has(r.user_id));
    if(!pending.length) return { inserted:0, skipped:ids.length };
    const { error } = await table('user_badges').upsert(pending, { onConflict:'user_id,badge_code', ignoreDuplicates:true });
    if(error && /duplicate|user_badges_user_id_badge_code_key/i.test(`${error.message||''} ${error.details||''}`)) {
      let inserted = 0;
      for(const row of pending){
        const res = await table('user_badges').insert(row);
        if(!res.error) inserted += 1;
      }
      return { inserted, skipped:ids.length - inserted };
    }
    if(error) throw error;
    return { inserted:pending.length, skipped:ids.length - pending.length };
  }
  async function assignBadge(form){
    const fd=new FormData(form);
    const ids=[...new Set(fd.getAll('userIds').filter(Boolean))];
    if(!ids.length) return toast('Selecciona al menos un alumno.');
    const code=fd.get('badgeCode');
    const rows=ids.map(user_id=>({user_id,badge_code:code,badge_name:badgeName(code),assigned_by:State.profile.id}));
    const result=await saveUserBadgesWithoutDuplicates(rows);
    await log('badge','Insignia asignada',{code, count:result.inserted, skipped:result.skipped});
    await loadData(true);
    if(result.inserted && result.skipped) toast(`Insignia asignada a ${result.inserted} alumno(s). ${result.skipped} ya la tenían.`);
    else if(result.inserted) toast(`Insignia asignada a ${result.inserted} alumno(s).`);
    else toast('La insignia ya estaba asignada al alumnado seleccionado.');
    rerender();
  }
  async function resolveClaim(id, ok){ const claim=(State.data.badgeClaims||[]).find(c=>c.id===id); if(!claim) return; await maybe(table('badge_claim_requests').update({status:ok?'approved':'rejected', resolved_at:new Date().toISOString(), resolved_by:State.profile.id}).eq('id',id)); if(ok) await saveUserBadgesWithoutDuplicates([{user_id:claim.user_id,badge_code:claim.badge_code,badge_name:badgeName(claim.badge_code),assigned_by:State.profile.id}]); await loadData(true); toast(ok?'Insignia aprobada.':'Solicitud rechazada.'); rerender(); }
  function passwordRequestsContent(){ const rows=State.data.passwordRequests||[]; return `<section class="window-panel"><h3>Solicitudes de recuperación de contraseña</h3>${rows.length?rows.map(r=>`<article class="list-item"><strong>${safe(r.username||r.display_name)}</strong><p>${safe(r.display_name||'')} · ${safe(r.status||'pending')}</p><small>${fmtDT(r.created_at)}</small><button data-t16-pass-done="${safe(r.id)}">Marcar como atendida</button></article>`).join(''):'<div class="empty-state">No hay solicitudes pendientes.</div>'}</section>`; }

  function studentProfilesContent(){
    const students = State.data.students || [];
    const selected = students.find(s => s.id === State.selectedStudentId) || students[0] || null;
    if(!State.selectedStudentId && selected) State.selectedStudentId = selected.id;
    const studentList = groups(students).map(g => `<details class="t24-profile-group" open><summary>${safe(g.label)} <span>${g.items.length}</span></summary>${g.items.map(s => { const pause=pauseStatusText(s.id); return `<button type="button" class="t24-student-row ${selected?.id===s.id?'is-selected':''} ${pause?'is-paused-row':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+(s.username||'')+' '+academicLine(s)).toLowerCase())}"><strong>${safe(displayName(s))}${pause?' <em class="pause-mini-badge">EN PAUSA</em>':''}</strong><small>${safe(s.username||'')} · ${safe(academicLine(s))}${pause?' · '+safe(pause):''}</small></button>`; }).join('')}</details>`).join('');
    return `<div class="t24-student-profiles"><section class="window-panel t24-profile-list"><h3>Alumnado</h3><p class="meta">Selecciona un perfil. Los cambios solo los puede guardar la profesora.</p><input class="t16-search" type="search" placeholder="Filtrar alumnado..." data-t16-student-search>${studentList || '<div class="empty-state">No hay alumnado cargado.</div>'}</section><section class="window-panel t24-profile-editor">${selected ? studentEditForm(selected) : '<div class="empty-state">Selecciona un alumno.</div>'}</section></div>`;
  }

  function studentEditForm(s){
    const sched = (State.data.schedules || []).filter(x => x.user_id === s.id && x.active !== false);
    const weekdayOptions = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const selectedNee = Array.isArray(s.nee_types) ? s.nee_types : [];
    const selectedNeae = Array.isArray(s.neae_types) ? s.neae_types : [];
    const selectedHealth = Array.isArray(s.health_conditions) ? s.health_conditions : [];
    const scheduleRows = Array.from({length:12}, (_,i) => i).map(i => {
      const r = sched[i] || {};
      return `<div class="schedule-row t24-schedule-row"><label>Día<select name="scheduleWeekday"><option value="">Sin clase</option>${weekdayOptions.map((d,idx)=>`<option value="${idx+1}" ${Number(r.weekday)===idx+1?'selected':''}>${d}</option>`).join('')}</select></label><label>Inicio<input name="scheduleStart" type="time" value="${safe(String(r.start_time||'').slice(0,5))}"></label><label>Fin<input name="scheduleEnd" type="time" value="${safe(String(r.end_time||'').slice(0,5))}"></label><label>Tipo<select name="scheduleType"><option value="group" ${r.class_type==='group'?'selected':''}>Grupal</option><option value="individual" ${r.class_type==='individual'?'selected':''}>Individual</option></select></label><label>Notas<input name="scheduleNotes" value="${safe(r.notes||'')}"></label></div>`;
    }).join('');
    const checks = (name, items, selected) => items.map(x=>`<label><input type="checkbox" name="${name}" value="${safe(x)}" ${selected.includes(x)?'checked':''}> <span>${safe(x)}</span></label>`).join('');
    return `<form id="t24StudentProfileForm" class="form-grid premium-student-editor t24-student-editor" method="post" action="javascript:void(0)"><input type="hidden" name="id" value="${safe(s.id)}"><div class="t24-editor-head"><div><h3>Perfil de ${safe(displayName(s))}</h3><p class="meta">Datos privados de gestión docente.</p>${pauseStatusText(s.id)?`<div class="pause-profile-banner">⏸ ${safe(pauseStatusText(s.id))}</div>`:''}</div></div><div class="form-status t24-profile-status" data-t24-profile-status></div><section class="premium-form-section"><h4>Identificación</h4><div class="window-grid"><label>Nombre<input name="firstName" value="${safe(s.first_name||firstPart(s.full_name))}"></label><label>Apellidos<input name="lastName" value="${safe(s.last_name||lastPart(s.full_name))}"></label></div><div class="window-grid"><label>Nombre completo<input name="fullName" value="${safe(s.full_name && !/^demo\b/i.test(s.full_name) ? s.full_name : displayName(s))}"></label><label>Usuario<input name="username" value="${safe(s.username||'')}"></label></div><div class="window-grid"><label>Email interno<input name="authEmail" type="email" value="${safe(s.auth_email||'')}"></label><label>Email personal<input name="personalEmail" type="email" value="${safe(s.personal_email||'')}"></label></div></section><section class="premium-form-section"><h4>Datos académicos</h4><div class="window-grid"><label>Centro<select name="center">${options(centers,s.center)}</select></label><label>Etapa<select name="stage">${options(stages,s.stage)}</select></label><label>Curso<select name="course">${options(dynamicCourses(),s.course)}</select></label></div><label>Modalidad / itinerario<input name="track" value="${safe(s.track||'')}"></label></section><section class="premium-form-section promotion-section"><h4>Promoción de curso</h4><p class="meta">Al promocionar se actualizará centro, etapa y curso con los datos elegidos arriba y se limpiarán calificaciones, dificultades e insignias del curso anterior.</p><button class="secondary-btn" type="button" data-t29-promote-student>Promocionar y limpiar datos del curso anterior</button></section><section class="premium-form-section"><h4>Horario de asistencia</h4><p class="meta">Estos días y horas se usarán para generar horarios semanales y calcular asistencia mensual. Hay 12 huecos disponibles para combinar clases grupales e individuales.</p><div class="t24-schedule-grid">${scheduleRows}</div></section><section class="premium-form-section attention-section t34-attention-section"><h4>Atención personalizada, NEAE y NEE</h4><div class="support-note"><strong>Clasificación correcta:</strong> las NEE forman parte de las NEAE. Todo el alumnado con NEE es alumnado con NEAE, pero no todo el alumnado con NEAE tiene NEE. La necesidad se registra cuando genera barreras de acceso, presencia, participación o aprendizaje y requiere apoyos educativos específicos.</div><label class="check-line attention-main"><input type="checkbox" name="personalizedAttention" ${s.personalized_attention?'checked':''}> Requiere atención personalizada o adaptación</label><div class="support-needs-grid t24-support-grid t34-support-grid"><fieldset class="support-box support-box-nee"><legend>1. NEE, necesidades educativas especiales</legend><p class="meta">Derivadas de discapacidad, trastornos graves de conducta, trastornos graves de comunicación o lenguaje, y TEA/TGD cuando requiere apoyos específicos.</p><div class="support-checks">${checks('neeTypes', neeTypes, selectedNee)}</div></fieldset><fieldset class="support-box support-box-neae"><legend>2. NEAE, necesidades específicas de apoyo educativo</legend><p class="meta">Incluye NEE y otras situaciones oficiales de apoyo educativo.</p><div class="support-checks">${checks('neaeTypes', neaeTypes, selectedNeae)}</div></fieldset><fieldset class="support-box support-box-health"><legend>Condiciones que conviene registrar</legend><p class="meta">No son NEAE por sí mismas si están controladas o no generan impacto educativo significativo, pero pueden ser relevantes para la atención diaria.</p><div class="support-checks">${checks('healthConditions', healthConditions, selectedHealth)}</div></fieldset></div><label>Observaciones privadas<textarea name="observations" rows="5">${safe(s.observations||'')}</textarea></label></section><div class="sticky-form-actions"><button class="primary-btn t24-save-profile" type="button" data-t24-save-student onclick="return window.TribecaSaveStudentProfileDirect(this,event)">Guardar cambios del alumno</button><span class="form-status" data-t24-profile-status-bottom></span></div></form>`;
  }

  function firstPart(n=''){ return String(n).trim().split(/\s+/).slice(0,1).join(' '); } function lastPart(n=''){ return String(n).trim().split(/\s+/).slice(1).join(' '); }

  function buildStudentProfilePayload(form){
    const fd = new FormData(form);
    const id = String(fd.get('id') || '').trim();
    const first = String(fd.get('firstName') || '').trim();
    const last = String(fd.get('lastName') || '').trim();
    const username = String(fd.get('username') || '').trim().toLowerCase();
    const full = String(fd.get('fullName') || `${first} ${last}`.trim() || knownStudentNames[username] || username).trim();
    const weekdays = fd.getAll('scheduleWeekday'), starts = fd.getAll('scheduleStart'), ends = fd.getAll('scheduleEnd'), types = fd.getAll('scheduleType'), notes = fd.getAll('scheduleNotes');
    const schedule = weekdays.map((w,i)=>({ weekday:Number(w), start_time:starts[i]||null, end_time:ends[i]||null, class_type:types[i]||'group', notes:notes[i]||'' })).filter(r => r.weekday && r.start_time && r.end_time);
    return { id, first_name:first, last_name:last, full_name:full, username, auth_email:String(fd.get('authEmail')||'').trim()||null, personal_email:String(fd.get('personalEmail')||'').trim()||null, center:fd.get('center')||null, stage:fd.get('stage')||null, course:fd.get('course')||null, track:String(fd.get('track')||'').trim()||null, nee_types:fd.getAll('neeTypes'), neae_types:fd.getAll('neaeTypes'), health_conditions:fd.getAll('healthConditions'), observations:fd.get('observations')||'', personalized_attention:!!fd.get('personalizedAttention'), schedule };
  }

  async function saveStudentProfile(form){
    const buttons = Array.from(form.querySelectorAll('[data-t24-save-student],[data-t23-save-student],[data-t22-save-student],[data-t21-save-student],[type="submit"]'));
    const statuses = Array.from(form.querySelectorAll('[data-t24-profile-status],[data-t24-profile-status-bottom],[data-t23-profile-status],[data-t22-profile-status],[data-t21-profile-status]'));
    const setStatus = (msg, kind='info') => { statuses.forEach(status => { status.textContent = msg || ''; status.classList.remove('is-ok','is-error','is-info'); if(msg) status.classList.add(kind==='ok'?'is-ok':kind==='error'?'is-error':'is-info'); }); if(msg) toast(msg); };
    if(!roleTeacher()) { setStatus('Solo la profesora puede editar perfiles del alumnado.', 'error'); return; }
    buttons.forEach(btn => { btn.disabled = true; btn.dataset.originalText = btn.dataset.originalText || btn.textContent; btn.textContent = 'Guardando…'; });
    setStatus('Guardando cambios en Supabase…', 'info');
    try {
      const payload = buildStudentProfilePayload(form);
      if(!payload.id) throw new Error('No se ha podido identificar el perfil del alumno.');
      const rpc = await State.client.rpc('tribeca_teacher_save_student_profile_v25', { p_payload: payload });
      if(rpc.error) throw rpc.error;
      if(!rpc.data || rpc.data.ok !== true) throw new Error('Supabase no confirmó el guardado.');
      const fresh = rpc.data.profile || payload;
      State.selectedStudentId = payload.id;
      State.data.students = (State.data.students||[]).map(st => st.id===payload.id ? {...st, ...fresh} : st);
      const sched = await State.client.from('student_schedules').select('*').eq('user_id', payload.id).order('weekday').order('start_time');
      if(!sched.error) State.data.schedules = [...(State.data.schedules||[]).filter(x=>x.user_id!==payload.id), ...(sched.data||[])];
      await log('profile','Perfil del alumnado actualizado',{student:payload.full_name});
      setStatus('Perfil guardado correctamente.', 'ok');
    } catch(e) {
      console.error('Error al guardar perfil de alumnado:', e);
      setStatus(`Error al guardar: ${e?.message || e?.details || e || 'Error desconocido'}`, 'error');
    } finally {
      buttons.forEach(btn => { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Guardar cambios del alumno'; });
    }
  }


  function paymentMonthRecord(userId, month){ return (State.data.paymentMonths||[]).find(x=>x.user_id===userId && String(x.month||'').slice(0,7)===String(month).slice(0,7)) || {}; }
  function monthLabel(month){ try { const [y,m]=String(month).split('-').map(Number); return new Date(y, (m||1)-1, 1).toLocaleDateString('es-ES',{month:'long',year:'numeric'}); } catch(_){ return String(month||''); } }
  function addMonthsToMonth(month, delta){ const [y,m]=String(month||todayIso().slice(0,7)).split('-').map(Number); const d=new Date(y||new Date().getFullYear(), (m||1)-1+delta, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  function paymentModeForStudent(s){ const haystack = `${displayName(s)} ${s?.username||''}`.toLowerCase(); return (/wronna/.test(haystack) || /marco\s+calvo|marco_calvo/.test(haystack)) ? 'advance' : 'arrears'; }
  function paymentModeLabel(s){ return paymentModeForStudent(s)==='advance' ? 'Pago por adelantado' : 'Pago a mes vencido'; }
  function paymentDueDate(s, month){ const [y,m]=String(month).split('-').map(Number); if(!y||!m) return new Date(); return paymentModeForStudent(s)==='advance' ? new Date(y, m-1, 1) : new Date(y, m, 20); }
  function isPaymentOverdue(month, student=null){ const [y,m]=String(month).split('-').map(Number); if(!y||!m) return false; const due = student ? paymentDueDate(student, month) : new Date(y, m, 20); const today=new Date(); return today > due; }
  function quarterMonthsFor(month){ const [y,m]=String(month||todayIso().slice(0,7)).split('-').map(Number); const start=Math.floor(((m||1)-1)/3)*3+1; return [0,1,2].map(i=>`${y}-${String(start+i).padStart(2,'0')}`); }
  function paidMonthsForStudent(userId){ return [...new Set((State.data.paymentMonths||[]).filter(p=>String(p.user_id)===String(userId) && p.paid).map(p=>String(p.month).slice(0,7)).filter(Boolean))].sort().reverse(); }
  function unpaidPaymentAlerts(){ const month=(State.billingMonth||todayIso().slice(0,7)); return (State.data.students||[]).map(s=>({student:s, bill:(State.data.billing||[]).find(b=>b.user_id===s.id)||{}, pay:paymentMonthRecord(s.id, month)})).filter(x=>isPaymentOverdue(month, x.student) && x.pay.paid!==true).map(x=>({name:displayName(x.student), month, amount:calculatePaymentAmount(x.student.id, month).amount})); }
  function teacherStudentPicker(selected, context='payments'){
    const students=State.data.students||[];
    const title = context === 'attendance' ? 'Alumnado' : 'Alumnado';
    return `<section class="window-panel payments-students t54-student-picker"><h3>${title}</h3><input class="t16-search" type="search" placeholder="Filtrar alumnado..." data-t16-student-search>${groups(students).map(g=>`<details open><summary>${safe(g.label)}</summary>${g.items.map(s=>{ const pText=pauseStatusText(s.id); return `<button type="button" class="t16-student-row ${selected?.id===s.id?'is-selected':''} ${pText?'is-paused-row':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+s.username+' '+academicLine(s)).toLowerCase())}"><span>${safe(displayName(s))}</span><small>${safe(academicLine(s))}${pText?' · En pausa':''}</small>${pText?'<em class="pause-mini-label">Pausa</em>':''}</button>`; }).join('')}</details>`).join('')}</section>`;
  }
  function paymentMonthNavigator(month, heading='Mes de referencia'){
    return `<div class="attendance-head payment-month-nav t54-month-nav"><h4>${safe(heading)}: ${safe(monthLabel(month))}</h4><div class="inline-actions"><button type="button" class="secondary-btn" data-t51-month-nav="${safe(addMonthsToMonth(month,-1))}">← Mes anterior</button><label>Mes<input type="month" value="${safe(month)}" data-t16-billing-month></label><button type="button" class="secondary-btn" data-t51-month-nav="${safe(addMonthsToMonth(month,1))}">Mes siguiente →</button></div></div>`;
  }
  function paymentsContent(){
    const students=State.data.students||[]; const selected=students.find(s=>s.id===State.selectedStudentId)||students[0]; if(!State.selectedStudentId && selected) State.selectedStudentId=selected.id;
    const month=(State.billingMonth||todayIso().slice(0,7)); State.billingMonth=month;
    return `<div class="payments-layout t54-payments-layout"><div class="t54-section-intro window-panel"><h3>Pagos</h3><p class="meta">Sección económica: tarifas, mensualidades, estado de pago, recibís e histórico. La asistencia y las pausas se gestionan ahora en una sección independiente.</p></div>${teacherStudentPicker(selected,'payments')}<section class="window-panel payments-main">${selected?paymentEditor(selected,month):'<div class="empty-state">Selecciona un alumno.</div>'}</section><section class="window-panel payments-summary"><h3>Resumen mensual</h3>${paymentSummary(month)}</section></div>`;
  }
  function attendanceContent(){
    const students=State.data.students||[]; const selected=students.find(s=>s.id===State.selectedStudentId)||students[0]; if(!State.selectedStudentId && selected) State.selectedStudentId=selected.id;
    const month=(State.billingMonth||todayIso().slice(0,7)); State.billingMonth=month;
    return `<div class="payments-layout attendance-layout t54-attendance-layout"><div class="t54-section-intro window-panel"><h3>Asistencia y pausas</h3><p class="meta">Sección operativa: asistencia mensual, faltas justificadas y pausas temporales de asistencia y acceso al aula virtual.</p></div>${teacherStudentPicker(selected,'attendance')}<section class="window-panel attendance-main">${selected?attendanceEditor(selected,month):'<div class="empty-state">Selecciona un alumno.</div>'}</section><section class="window-panel attendance-summary"><h3>Resumen de asistencia</h3>${attendanceSummary(month)}</section></div>`;
  }
  function paymentEditor(s,month){
    const bill=(State.data.billing||[]).find(b=>b.user_id===s.id)||{}; const pay=paymentMonthRecord(s.id,month); const calc=calculatePaymentAmount(s.id,month);
    return `<h3>Pagos de ${safe(displayName(s))}</h3>${paymentMonthNavigator(month,'Mes económico')}<form id="t16BillingForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid premium-form"><input type="hidden" name="userId" value="${safe(s.id)}"><input type="hidden" name="month" value="${safe(month)}"><label>Tipo de tarifa<select name="tariffType"><option value="group" ${bill.tariff_type==='group'||!bill.tariff_type?'selected':''}>Grupal, cuota fija mensual</option><option value="individual" ${bill.tariff_type==='individual'?'selected':''}>Individual, pago por clase asistida</option><option value="mixed" ${bill.tariff_type==='mixed'?'selected':''}>Mixta, cuota fija + clases individuales</option></select></label><div class="window-grid"><label>Cuota mensual fija (€)<input name="monthlyFee" type="number" min="0" step="0.01" value="${safe(bill.monthly_fee??'')}"></label><label>Precio por clase individual (€)<input name="classRate" type="number" min="0" step="0.01" value="${safe(bill.class_rate??'')}"></label></div><p class="meta">El importe se calcula con la asistencia registrada y con las pausas activas. Regla general: mensualidad a mes vencido. Excepciones configuradas: Wronna y Marco Calvo, pago por adelantado. Criterio actual: ${safe(paymentModeLabel(s))}.</p><div class="window-grid"><label class="check-line"><input type="checkbox" name="paid" ${pay.paid?'checked':''}> Mes ${safe(monthLabel(month))} pagado</label><label>Día de pago<input name="paidDate" type="date" value="${safe(pay.paid_date||'')}"></label></div><label>Notas privadas de pago<textarea name="paymentNotes" rows="3">${safe(bill.payment_notes||'')}</textarea></label><div class="inline-actions"><button class="primary-btn" type="submit">Guardar tarifa y estado de pago</button><button class="secondary-btn" type="button" onclick="window.TribecaPrintPaymentReceipt && window.TribecaPrintPaymentReceipt('${safe(s.id)}','${safe(month)}')">Descargar recibí del mes</button><button class="secondary-btn" type="button" onclick="window.TribecaPrintQuarterReceipts && window.TribecaPrintQuarterReceipts('${safe(s.id)}','${safe(month)}')">Descargar recibís del trimestre</button></div><div class="payment-total-card is-visible"><strong>Total calculado: ${money(calc.amount)}</strong><p>${safe(calc.detail)} · Asistencias: ${calc.present} · Individuales: ${calc.individualPresent||0} · Faltas: ${calc.absent} · Justificadas: ${calc.justified} · Pausadas: ${calc.paused||0} · Estado: ${pay.paid?'pagado':'pendiente'}</p></div></form><section class="payment-history-panel"><h4>Histórico económico del alumno</h4>${paymentStudentHistory(s.id)}<div class="inline-actions"><button type="button" class="secondary-btn" onclick="window.TribecaPrintPaymentsPdf && window.TribecaPrintPaymentsPdf('student')">Descargar histórico del alumno en PDF</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintPaymentReceipt && window.TribecaPrintPaymentReceipt('${safe(s.id)}','${safe(month)}')">Descargar recibí de ${safe(monthLabel(month))}</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintQuarterReceipts && window.TribecaPrintQuarterReceipts('${safe(s.id)}','${safe(month)}')">Descargar todos los recibís del trimestre</button></div></section>`;
  }
  function attendanceEditor(s,month){
    const days=monthScheduleDays(s.id,month,{includePaused:true}); const calc=calculatePaymentAmount(s.id,month);
    return `<h3>Asistencia de ${safe(displayName(s))}</h3>${paymentPausePanel(s,month)}${paymentMonthNavigator(month,'Mes de asistencia')}<p class="meta">Haz clic en un día de clase para alternar asistencia/no asistencia. Los días en pausa quedan bloqueados y se excluyen del cálculo económico.</p><div class="attendance-month-grid">${days.length?days.map(d=>{ const rec=(State.data.attendance||[]).find(a=>a.user_id===s.id && a.class_date===d.date && String(a.scheduled_start||'').slice(0,5)===d.start); const status=d.paused?'paused':(rec?.status||'absent'); return `<article class="attendance-day t22-attendance-day is-${status} is-${safe(d.type)}" role="button" tabindex="0" ${d.paused?'data-paused="true"':''} data-t22-attendance-toggle data-user="${safe(s.id)}" data-date="${safe(d.date)}" data-start="${safe(d.start)}" data-end="${safe(d.end)}" data-class-type="${safe(d.type)}" data-current="${safe(status)}"><strong>${fmtLongDate(d.date)}</strong><span>${safe(d.start)}-${safe(d.end)} · ${d.type==='individual'?'Individual':'Grupal'}</span><em>${status==='present'?'Asistió':status==='justified'?'Justificada':status==='paused'?'Pausa':'No asistió'}</em>${d.paused?'<small>Asistencia pausada</small>':`<button type="button" data-t16-attendance="justified" data-user="${safe(s.id)}" data-date="${safe(d.date)}" data-start="${safe(d.start)}" data-end="${safe(d.end)}" data-class-type="${safe(d.type)}">Justificar</button>`}</article>`; }).join(''):'<div class="empty-state">Este alumno no tiene horario asignado para este mes.</div>'}</div><div class="payment-total-card is-visible"><strong>Resumen del mes: ${calc.present} asistencias · ${calc.absent} faltas · ${calc.justified} justificadas · ${calc.paused||0} clases pausadas</strong><p>El cálculo económico asociado a este mes es ${money(calc.amount)}. Los recibís y el estado de pago se gestionan en la sección Pagos.</p></div>`;
  }
  function attendanceSummary(month){
    const students=State.data.students||[];
    const rows=students.map(s=>{ const c=calculatePaymentAmount(s.id,month); const active=activePauseFor(s.id); const monthPauses=pauseMonthOverlap(s.id,month).length; return `<tr class="${active?'is-paused-row':''}"><td>${safe(displayName(s))}${active?'<br><small>En pausa activa</small>':''}</td><td>${c.present}</td><td>${c.absent}</td><td>${c.justified}</td><td>${c.paused||0}</td><td>${monthPauses?`${monthPauses} pausa/s`:'—'}</td></tr>`; }).join('');
    return `<label>Mes<input type="month" value="${safe(month)}" data-t16-billing-month></label><table class="premium-table"><thead><tr><th>Alumno/a</th><th>Asist.</th><th>Faltas</th><th>Justif.</th><th>Pausadas</th><th>Pausas del mes</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function paymentPausePanel(s, month){
    const active=activePauseFor(s.id); const pauses=pauseRecords(s.id); const upcoming=pauses.find(p=>p.active!==false && !pauseCoversDate(p) && String(p.start_date||'')>todayIso()); const editing=active||upcoming||{};
    const status=active?`<div class="pause-active-card"><strong>Asistencia pausada</strong><p>${safe(pauseStatusText(s.id))}. El acceso del alumno al aula virtual queda bloqueado mientras dure la pausa.</p></div>`:(upcoming?`<div class="pause-active-card is-upcoming"><strong>Pausa programada</strong><p>Programada desde ${safe(fmtDate(upcoming.start_date))}${upcoming.end_date?` hasta ${safe(fmtDate(upcoming.end_date))}`:' hasta reactivación manual'}.</p></div>`:'<p class="meta">Puedes programar una pausa por fechas o dejarla abierta para activarla y desactivarla manualmente. La pausa se crea solo si marcas expresamente “Pausa activa”.</p>');
    return `<section class="student-pause-panel"><h4>Pausa temporal de asistencia y acceso</h4>${status}<form id="t50PauseForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><input type="hidden" name="pauseId" value="${safe(editing.id||'')}"><input type="hidden" name="userId" value="${safe(s.id)}"><div class="window-grid"><label>Tipo de pausa<select name="mode"><option value="scheduled" ${editing.mode!=='manual'?'selected':''}>Programada por fechas</option><option value="manual" ${editing.mode==='manual'?'selected':''}>Manual, hasta reactivación</option></select></label><label class="check-line"><input type="checkbox" name="active" ${(active || (editing.id && editing.active!==false))?'checked':''}> Pausa activa</label></div><div class="window-grid"><label>Fecha de inicio<input name="startDate" type="date" value="${safe(editing.start_date||todayIso())}" required></label><label>Fecha de fin<input name="endDate" type="date" value="${safe(editing.end_date||'')}"><small>Déjala en blanco si la pausa será manual.</small></label></div><label>Motivo o nota visible para el alumno cuando intente iniciar sesión<textarea name="reason" rows="2" placeholder="Ej.: pausa de verano, viaje familiar, descanso temporal... El alumno verá este texto al intentar entrar en el aula.">${safe(editing.reason||'')}</textarea><small class="field-help">No escribas aquí nada que no quieras que el alumno vea en la pantalla de acceso pausado.</small></label><div class="inline-actions"><button class="primary-btn" type="submit">Guardar pausa</button>${active?`<button class="danger-btn" type="button" data-t50-end-pause="${safe(active.id)}">Reanudar asistencia desde hoy</button>`:''}</div></form>${pauses.length?`<details class="pause-history"><summary>Histórico de pausas (${pauses.length})</summary><table class="premium-table compact"><thead><tr><th>Inicio</th><th>Fin</th><th>Estado</th><th>Motivo visible</th></tr></thead><tbody>${pauses.map(p=>`<tr><td>${p.start_date?fmtDate(p.start_date):'—'}</td><td>${p.end_date?fmtDate(p.end_date):'Abierta'}</td><td>${pauseCoversDate(p)?'Activa':'Finalizada/programada'}</td><td>${safe(p.reason||'—')}</td></tr>`).join('')}</tbody></table></details>`:''}</section>`;
  }
  function monthScheduleDays(userId,month,opts={}){ const [y,m]=String(month).split('-').map(Number); if(!y||!m) return []; const sched=(State.data.schedules||[]).filter(x=>x.user_id===userId && x.active!==false); const last=new Date(y,m,0).getDate(); const out=[]; for(let d=1; d<=last; d++){ const date=new Date(y,m-1,d); const iso=toIso(date); const isPaused=pausedOnDate(userId,iso); if(isPaused && !opts.includePaused) continue; const weekday=((date.getDay()+6)%7)+1; sched.filter(s=>Number(s.weekday)===weekday).forEach(s=>out.push({date:iso, start:String(s.start_time||'').slice(0,5), end:String(s.end_time||'').slice(0,5), type:String(s.class_type||s.type||'group'), paused:isPaused})); } return out; }
  function calculatePaymentAmount(userId,month){ const bill=(State.data.billing||[]).find(b=>b.user_id===userId)||{}; const allDays=monthScheduleDays(userId,month,{includePaused:true}); const activeDays=allDays.filter(d=>!d.paused); const att=(State.data.attendance||[]).filter(a=>a.user_id===userId && String(a.class_date||'').startsWith(month) && !pausedOnDate(userId,a.class_date)); const present=att.filter(a=>a.status==='present').length; const absent=att.filter(a=>a.status==='absent').length; const justified=att.filter(a=>a.status==='justified').length; const fixed=Number(bill.monthly_fee||0); const rate=Number(bill.class_rate||0); const individualPresent=activeDays.filter(d=>d.type==='individual' && att.some(a=>a.status==='present' && a.class_date===d.date && String(a.scheduled_start||'').slice(0,5)===d.start)).length; const totalGroupDays=allDays.filter(d=>d.type!=='individual').length; const activeGroupDays=activeDays.filter(d=>d.type!=='individual').length; const paused=allDays.filter(d=>d.paused).length; const fixedProrated=totalGroupDays>0 && activeGroupDays<totalGroupDays ? fixed*(activeGroupDays/totalGroupDays) : fixed; let amount=0, detail=''; if(bill.tariff_type==='individual'){ amount=present*rate; detail=`${present} asistencias activas × ${money(rate)}`; } else if(bill.tariff_type==='mixed'){ amount=fixedProrated+(individualPresent*rate); detail=`Cuota ${activeGroupDays<totalGroupDays?'prorrateada ':''}${money(fixedProrated)} + ${individualPresent} clases individuales × ${money(rate)}`; } else { amount=fixedProrated; detail=activeGroupDays<totalGroupDays?`Cuota fija prorrateada: ${activeGroupDays}/${totalGroupDays} clases activas`:'Cuota fija mensual'; } if(paused && amount===0) detail='Mes en pausa, sin clases facturables'; return {amount,detail,present,individualPresent,fixedGroupDays:activeGroupDays,absent,justified,paused,totalDays:allDays.length,activeDays:activeDays.length}; }
  function studentPaymentAmount(userId,month){ const c=calculatePaymentAmount(userId,month); const pay=paymentMonthRecord(userId,month); return `<strong>Total calculado: ${money(c.amount)}</strong><p>${safe(c.detail)} · Faltas: ${c.absent} · Justificadas: ${c.justified} · Pausadas: ${c.paused||0} · ${pay.paid?'Pagado '+(pay.paid_date?fmtDate(pay.paid_date):''):'Pendiente de pago'}</p>`; }
  function paymentStudentHistory(userId){
    const pauseMonths=pauseRecords(userId).flatMap(p=>{ const start=String(p.start_date||todayIso()).slice(0,7); const end=String(p.end_date||start).slice(0,7); return [start,end]; });
    const months=[...new Set([...(State.data.paymentMonths||[]).filter(p=>p.user_id===userId).map(p=>String(p.month).slice(0,7)), ...pauseMonths, State.billingMonth||todayIso().slice(0,7)])].filter(Boolean).sort().reverse();
    return `<table class="premium-table compact"><thead><tr><th>Mes</th><th>Importe</th><th>Estado</th><th>Día de pago</th><th>Pausas</th><th>Recibí</th></tr></thead><tbody>${months.map(m=>{ const c=calculatePaymentAmount(userId,m); const p=paymentMonthRecord(userId,m); const pauses=pauseMonthOverlap(userId,m).length; return `<tr><td>${safe(monthLabel(m))}</td><td>${money(c.amount)}</td><td>${p.paid?'Pagado':'Pendiente'}</td><td>${p.paid_date?fmtDate(p.paid_date):'—'}</td><td>${pauses?`${pauses} pausa/s`:c.paused?`${c.paused} clase/s`: '—'}</td><td><button type="button" class="secondary-btn compact-btn" onclick="window.TribecaPrintPaymentReceipt && window.TribecaPrintPaymentReceipt('${safe(userId)}','${safe(m)}')">Descargar</button></td></tr>`; }).join('')}</tbody></table>`;
  }
  function paymentSummary(month){ const students=State.data.students||[]; let total=0; const rows=students.map(s=>{ const bill=(State.data.billing||[]).find(b=>b.user_id===s.id)||{}; const c=calculatePaymentAmount(s.id,month); const pay=paymentMonthRecord(s.id,month); total+=c.amount; const pText=pauseMonthOverlap(s.id,month).length?' · pausa registrada':''; return `<tr class="${!pay.paid&&isPaymentOverdue(month,s)?'payment-overdue-row':''} ${pText?'is-paused-row':''}"><td>${safe(displayName(s))}${pText?'<br><small>Con pausa</small>':''}</td><td>${bill.tariff_type==='mixed'?'Mixta':bill.tariff_type==='individual'?'Individual':'Grupal'}</td><td>${c.present}</td><td>${money(c.amount)}</td><td>${pay.paid?'Pagado '+(pay.paid_date?fmtDate(pay.paid_date):''):'Pendiente'}<br><small>${safe(paymentModeLabel(s))}</small></td></tr>`; }).join(''); return `<label>Mes<input type="month" value="${safe(month)}" data-t16-billing-month></label><div class="payment-grand-total">Total previsto: ${money(total)}</div><h4>Histórico total mensual</h4><div class="inline-actions"><button type="button" class="secondary-btn" onclick="window.TribecaPrintPaymentsPdf && window.TribecaPrintPaymentsPdf('month')">Descargar histórico mensual en PDF</button></div><table class="premium-table"><thead><tr><th>Alumno/a</th><th>Tarifa</th><th>Asistencias</th><th>Importe</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`; }
  function money(v){ return `${Number(v||0).toFixed(2).replace('.',',')} €`; }
  async function saveBilling(form){ const fd=new FormData(form); const rec={user_id:fd.get('userId'), tariff_type:fd.get('tariffType'), monthly_fee:fd.get('monthlyFee')?Number(fd.get('monthlyFee')):0, class_rate:fd.get('classRate')?Number(fd.get('classRate')):0, payment_notes:fd.get('paymentNotes')||'', updated_at:new Date().toISOString()}; const pay={user_id:fd.get('userId'), month:fd.get('month')||State.billingMonth||todayIso().slice(0,7), paid:!!fd.get('paid'), paid_date:fd.get('paidDate')||null, updated_at:new Date().toISOString()}; const r=await State.client.rpc('tribeca_save_payment_v28',{p_billing:rec,p_month:pay}); if(r.error) throw r.error; await log('payment','Tarifa o pago actualizado',{student:studentName(rec.user_id),month:pay.month}); await loadData(true); toast('Pago guardado.'); rerender(); }
  async function saveStudentPause(form){ const fd=new FormData(form); const id=String(fd.get('pauseId')||'').trim(); const userId=String(fd.get('userId')||'').trim(); const start=String(fd.get('startDate')||todayIso()).slice(0,10); const end=String(fd.get('endDate')||'').slice(0,10)||null; if(end && end < start) throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.'); const active=!!fd.get('active'); if(!active && !id) throw new Error('Marca “Pausa activa” para crear una nueva pausa.'); const rec={user_id:userId,start_date:start,end_date:end,active,mode:fd.get('mode')||'scheduled',reason:String(fd.get('reason')||'').trim()||null,updated_at:new Date().toISOString()}; let error; if(id){ ({error}=await table('student_pauses').update(rec).eq('id',id)); } else { rec.created_by=State.profile.id; ({error}=await table('student_pauses').insert(rec)); } if(error) throw error; await log('pause','Pausa de asistencia actualizada',{student:studentName(userId),start,end,active}); await loadData(true); toast(active?'Pausa guardada. El acceso del alumno quedará bloqueado durante el período indicado.':'Pausa desactivada.'); rerender(); }
  async function endStudentPause(id){ const rec=(State.data.studentPauses||[]).find(p=>p.id===id); if(!rec) return toast('No se encontró la pausa.'); const {error}=await table('student_pauses').update({active:false,end_date:todayIso(),updated_at:new Date().toISOString()}).eq('id',id); if(error) return toast(error.message || 'No se pudo finalizar la pausa.'); await log('pause','Pausa finalizada',{student:studentName(rec.user_id)}); await loadData(true); toast('Pausa finalizada. El alumno podrá volver a acceder.'); rerender(); }
  async function saveAttendance(btn){ if(pausedOnDate(btn.dataset.user, btn.dataset.date)) return toast('Este día está dentro de una pausa y no cuenta como asistencia ni como falta.'); const rec={user_id:btn.dataset.user, class_date:btn.dataset.date, scheduled_start:btn.dataset.start||null, scheduled_end:btn.dataset.end||null, class_type:btn.dataset.classType||'group', status:btn.dataset.t16Attendance, updated_at:new Date().toISOString()}; const { error } = await State.client.from('attendance_records').upsert(rec,{onConflict:'user_id,class_date,scheduled_start'}); if(error) throw error; await loadData(true); rerender(); }
  async function toggleAttendance(card){ if(card.dataset.paused==='true' || pausedOnDate(card.dataset.user, card.dataset.date)) return toast('Este día está pausado y se excluye del cálculo de asistencia y facturación.'); const current=card.dataset.current || 'absent'; const next=current==='present'?'absent':'present'; const rec={user_id:card.dataset.user, class_date:card.dataset.date, scheduled_start:card.dataset.start||null, scheduled_end:card.dataset.end||null, class_type:card.dataset.classType||'group', status:next, updated_at:new Date().toISOString()}; const { error } = await State.client.from('attendance_records').upsert(rec,{onConflict:'user_id,class_date,scheduled_start'}); if(error) throw error; await loadData(true); rerender(); }


  function messagesContent(){
    const p=State.profile; const all=(State.data.messages||[]).filter(m=>!(m.sender_id===p.id&&m.deleted_by_sender) && !(m.recipient_id===p.id&&m.deleted_by_recipient));
    const inbox=all.filter(m=>m.recipient_id===p.id&&!m.archived), sent=all.filter(m=>m.sender_id===p.id), archived=all.filter(m=>m.archived && (m.sender_id===p.id||m.recipient_id===p.id));
    const compose = roleTeacher() ? `<form id="t16TeacherMessageForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid email-compose"><label>Alumno/a<select name="recipientId" required>${(State.data.students||[]).map(s=>`<option value="${s.id}">${safe(displayName(s))}</option>`).join('')}</select></label><label>Asunto<input name="subject" maxlength="100" required></label><div class="window-grid"><label>Tamaño<select name="fontSize"><option>14</option><option selected>16</option><option>18</option><option>20</option></select></label><label>Color<select name="textColor"><option value="#1d251d">Negro</option><option value="#0b3d22">Verde Tribeca</option><option value="#8a5a00">Dorado oscuro</option><option value="#9b1c1c">Rojo</option><option value="#234e8f">Azul</option></select></label></div><label>Mensaje<textarea name="body" maxlength="3000" rows="7" required></textarea></label><label>Adjuntar documentos o imágenes<input name="messageFiles" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"><input type="hidden" name="attachmentsJson" value=""><small data-message-file-name></small></label><button class="primary-btn" type="submit">Enviar</button></form>` : `<form id="t16StudentMessageForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid email-compose"><label>Motivo<select name="reason"><option>Necesito ayuda</option><option>No puedo asistir a clase</option><option>Tengo una duda sobre una tarea</option><option>Quiero revisar una calificación</option><option>Otro motivo</option></select></label><label>Asunto<input name="subject" maxlength="100" required></label><div class="window-grid"><label>Tamaño<select name="fontSize"><option>14</option><option selected>16</option><option>18</option><option>20</option></select></label><label>Color<select name="textColor"><option value="#1d251d">Negro</option><option value="#0b3d22">Verde Tribeca</option><option value="#8a5a00">Dorado oscuro</option><option value="#9b1c1c">Rojo</option><option value="#234e8f">Azul</option></select></label></div><label>Mensaje<textarea name="body" maxlength="2000" rows="7" required></textarea></label><label>Adjuntar documentos o imágenes<input name="messageFiles" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"><input type="hidden" name="attachmentsJson" value=""><small data-message-file-name></small></label><button class="primary-btn" type="submit">Enviar a la profesora</button></form>`;
    return `<div class="mail-app"><aside class="mail-sidebar window-panel"><h3>Mensajes</h3><button class="mail-tab is-active" type="button" data-mail-box="inbox">Recibidos <span>${inbox.filter(m=>!m.read_at).length}</span></button><button class="mail-tab" type="button" data-mail-box="sent">Enviados <span>${sent.length}</span></button><button class="mail-tab" type="button" data-mail-box="archived">Archivados <span>${archived.length}</span></button></aside><section class="window-panel mail-compose-panel"><h3>${roleTeacher()?'Escribir mensaje privado':'Mensaje para la profesora'}</h3><p class="meta">Los mensajes son privados entre profesora y alumno/a.</p>${compose}</section><section class="window-panel mail-list-panel"><div class="mail-box" data-mail-box-view="inbox"><h3>Bandeja de entrada</h3>${inbox.length?inbox.map(messageCard).join(''):'<div class="empty-state">No hay mensajes recibidos.</div>'}</div><div class="mail-box" data-mail-box-view="sent" hidden><h3>Enviados</h3>${sent.length?sent.map(messageCard).join(''):'<div class="empty-state">No hay mensajes enviados.</div>'}</div><div class="mail-box" data-mail-box-view="archived" hidden><h3>Archivados</h3>${archived.length?archived.map(messageCard).join(''):'<div class="empty-state">No hay mensajes archivados.</div>'}</div></section></div>`;
  }
  function messageCard(m){ const mine=m.sender_id===State.profile?.id; const atts=Array.isArray(m.attachments)?m.attachments:[]; return `<article class="mail-card ${!m.read_at && !mine?'is-unread':''}"><header><strong>${safe(m.subject||'Sin asunto')}</strong><span>${mine?'Enviado a '+safe(m.recipient_name||studentName(m.recipient_id)):'De '+safe(m.sender_name||studentName(m.sender_id))}</span></header><p style="font-size:${Number(m.font_size||16)}px;color:${safe(m.text_color||'inherit')}">${safe(m.body||'')}</p>${atts.length?`<div class="attachment-list">${atts.map(a=>`<a href="${safe(a.url)}" target="_blank" rel="noopener">📎 ${safe(a.name||'Archivo')}</a>`).join('')}</div>`:''}<footer><small>${fmtDT(m.created_at)}</small><div class="inline-actions">${!mine&&!m.read_at?`<button type="button" data-t28-mark-read="${safe(m.id)}">Marcar como leído</button>`:''}<button type="button" data-t16-archive-message="${safe(m.id)}">Archivar</button><button type="button" data-t28-delete-message="${safe(m.id)}">Eliminar</button></div></footer></article>`; }
  async function sendMessage(form, teacher=false){
    const fd=new FormData(form);
    let recipientId=fd.get('recipientId');
    let recipientName='Profesora';
    if(!teacher){
      const t=await maybe(table('profiles').select('id,full_name,username').eq('role','teacher').limit(1), []);
      recipientId=t?.[0]?.id;
      recipientName=displayName(t?.[0]);
    } else {
      recipientName=studentName(recipientId);
    }
    if(!recipientId) return toast('No se encontró destinatario.');
    let attachments=[];
    try{ attachments=fd.get('attachmentsJson')?JSON.parse(fd.get('attachmentsJson')):[]; }catch(_e){}
    const bodyRaw=String(fd.get('body')||'').trim();
    const payload={
      sender_id:State.profile.id,
      sender_name:displayName(State.profile),
      recipient_id:recipientId,
      recipient_name:recipientName,
      subject:String(fd.get('subject')||'').trim(),
      body:teacher?bodyRaw:`${fd.get('reason')}. ${bodyRaw}`,
      reason:fd.get('reason')||'',
      font_size:Number(fd.get('fontSize')||16),
      text_color:fd.get('textColor')||null,
      attachments,
      is_draft:false,
      archived:false
    };
    if(!payload.subject||!bodyRaw) return toast('Completa asunto y mensaje.');
    const rpc=await State.client.rpc('tribeca_send_private_message_v28',{p_payload:payload});
    if(rpc.error) throw rpc.error;
    await log('message','Mensaje enviado',{subject:payload.subject});
    if(!teacher) await queueTeacherMessageEmailNotification(payload);
    await loadData(true);
    toast('Mensaje enviado.');
    form.reset();
    rerender();
  }

  function safeJsonArray(value) { return parseArrayField(value); }
  function normalizeAttachments(item={}) {
    const raw = item.attachments ?? item.attachment ?? item.files ?? item.attachment_url ?? item.file_url ?? [];
    if(Array.isArray(raw)) return raw.filter(Boolean);
    if(typeof raw === 'string') {
      const trimmed = raw.trim();
      if(!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : (parsed ? [parsed] : []);
      } catch(_e) {
        return [{ name: item.attachment_name || item.file_name || 'Archivo adjunto', url: trimmed, type: item.attachment_type || item.file_type || '' }];
      }
    }
    return raw && typeof raw === 'object' ? [raw] : [];
  }
  function attachmentList(item={}) {
    const attachments = normalizeAttachments(item);
    if(!attachments.length) return '';
    return `<div class="attachment-list">${attachments.map((att, index) => {
      const url = att.url || att.href || att.path || att.publicUrl || att.public_url || '';
      const name = att.name || att.filename || att.file_name || `Archivo ${index + 1}`;
      const type = String(att.type || att.mime_type || '').toLowerCase();
      const thumb = url && /^image\//.test(type) ? `<img src="${safe(url)}" alt="">` : '';
      return url ? `<a class="attachment-pill" href="${safe(url)}" target="_blank" rel="noopener">${thumb}<span>📎 ${safe(name)}</span></a>` : `<span class="attachment-pill">📎 ${safe(name)}</span>`;
    }).join('')}</div>`;
  }
  function announcementScopeLabel(a={}) {
    const scope = a.target_scope || a.scope || 'all';
    if(['selected','user'].includes(scope)) {
      const count = safeJsonArray(a.target_user_ids).length;
      return count ? `${count} alumno${count===1?'':'s'} seleccionado${count===1?'':'s'}` : 'Alumnado seleccionado';
    }
    if(scope === 'class') return [a.center, a.stage, a.course].filter(Boolean).join(' · ') || 'Grupo concreto';
    if(scope === 'center') return a.center || 'Centro concreto';
    return 'Anuncio general';
  }
  function announcementsContent(){
    const rows=visibleAnnouncements();
    return `<section class="window-panel"><h3>Anuncios, avisos y noticias</h3>${rows.length?rows.map(a=>`<article class="t16-publication ${a.hidden?'is-hidden-item':''}"><small>${safe(announcementScopeLabel(a))}${a.created_at?` · ${fmtDT(a.created_at)}`:''}${a.hidden?' · Oculto':''}</small><h3>${safe(a.title || 'Anuncio sin título')}</h3>${a.image_url?`<img src="${safe(a.image_url)}" alt="">`:''}<p style="font-size:${Number(a.font_size||16)}px">${safe(a.body||a.description||a.content||'')}</p>${a.link_url?`<a href="${safe(a.link_url)}" target="_blank" rel="noopener">Abrir enlace</a>`:''}${attachmentList(a)}${roleTeacher()?`<div class="inline-actions"><button type="button" data-t32-edit-ann="${safe(a.id)}">Editar</button><button type="button" data-t16-toggle-ann="${safe(a.id)}">${a.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t16-delete-ann="${safe(a.id)}">Eliminar</button></div>`:''}</article>`).join(''):'<div class="empty-state">Todavía no hay anuncios publicados.</div>'}</section>`;
  }
  function subjectDetailContent(subject){
    const mats=visibleMaterials(subject);
    const byUnit=new Map();
    mats.forEach(m=>{ const u=m.unit_title||m.unit||'Unidad 1'; if(!byUnit.has(u)) byUnit.set(u,[]); byUnit.get(u).push(m); });
    const i=subjectList().indexOf(subject);
    const vis=subjectVisual(subject);
    const units=[...byUnit.entries()];
    const course = roleTeacher() ? (State.selectedSubjectCourse || State.profile?.course || '') : (State.profile?.course || '');
    const pr = subjectProgress(subject);
    return `<section class="t16-subject-detail subject-detail-premium">
      <header class="subject-detail-head subject-${Math.max(i,0)%6}" style="--subject-color:${vis.color}">
        <div class="subject-detail-emblem">${safe(vis.glyph)}</div>
        <div class="subject-detail-copy">
          <span class="subject-detail-kicker">${safe(course||'Materia')}</span>
          <h2>${safe(subject)}</h2>
          <p>${mats.length} publicaciones · ${units.length||0} unidades${roleTeacher()?'':` · progreso ${pr.percent}%`}</p>
          ${roleTeacher()?'':`<div class="subject-detail-progress"><span style="width:${pr.percent}%"></span></div>`}
        </div>
      </header>
      ${roleTeacher()?`<div class="subject-teacher-actions premium-actions"><button type="button" class="primary-btn" data-t29-new-material="${safe(subject)}">Publicar nuevo material</button><button type="button" class="secondary-btn" data-t30-subject-edit-by-name="${safe(subject)}">Editar materia</button></div>`:''}
      <div class="subject-detail-intro window-panel">
        <strong>Materiales organizados por unidades didácticas</strong>
        <p>Abre o cierra cada unidad para consultar apuntes, boletines, pruebas, juegos o enlaces publicados por la profesora.</p>
      </div>
      <div class="subject-units-list">
        ${units.map(([u,items],idx)=>`<details class="subject-unit-card" ${idx===0?'open':''}>
          <summary><span>${safe(u)}</span><em>${items.length} material${items.length===1?'':'es'}</em></summary>
          <div class="subject-material-list">${items.map(m=>materialCard(m)).join('')}</div>
        </details>`).join('')||'<div class="empty-state premium-empty">Todavía no hay publicaciones en esta materia.</div>'}
      </div>
    </section>`;
  }
  function materialCard(m){ const meta=materialTypeMeta(m.material_type||m.type); const done=isMaterialCompleted(m.id); return `<article class="t16-publication publication-type-card publication-type-card-${safe(meta.key)} ${m.hidden?'is-hidden-item':''} ${done?'is-completed-material':''}"><div class="publication-card-top"><span class="publication-type-tag publication-type-${safe(meta.key)}">${safe(meta.icon)} ${safe(meta.label)}</span>${m.hidden?'<small>Oculto</small>':''}${done&&!roleTeacher()?'<small class="completed-chip">Hecha</small>':''}</div><h3>${safe(m.title)}</h3>${m.image_url?`<img src="${safe(m.image_url)}" alt="">`:''}<p style="font-size:${Number(m.font_size||16)}px">${safe(m.body||m.description||m.content||m.text||'')}</p>${m.link_url?`<a href="${safe(m.link_url)}" target="_blank" rel="noopener">Abrir enlace</a>`:''}${attachmentList(m)}<div class="material-card-actions">${materialOpenButton(m)}${materialCompletionButton(m)}${roleTeacher()?`<div class="inline-actions"><button type="button" data-t32-edit-mat="${safe(m.id)}">Editar</button><button type="button" data-t16-toggle-mat="${safe(m.id)}">${m.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t16-delete-mat="${safe(m.id)}">Eliminar</button></div>`:''}</div></article>`; }



  function teacherSubjectsContent(){
    const stage=State.selectedSubjectStage, course=State.selectedSubjectCourse; const subjects=teacherSubjectList(stage,course);
    const custom=(State.data.subjects||[]).filter(x=>x.stage===stage&&x.course===course);
    const edit = State.pendingSubjectEdit || {};
    const editStage = edit.stage || stage, editCourse = edit.course || course, editSubject = edit.subject || '', editId = edit.id || '';
    return `<div class="teacher-subjects-layout v34-teacher-subjects"><section class="window-panel teacher-subjects-main"><h3>Materias vistas como alumnado</h3><p class="meta">Selecciona etapa y curso para revisar materias, publicaciones y visibilidad. Las materias ocultas aparecen atenuadas y marcadas con la etiqueta “Oculta”.</p><div class="window-grid teacher-subject-filters"><label>Etapa<select data-t18-subject-stage>${options(stages,stage)}</select></label><label>Curso<select data-t18-subject-course>${options(dynamicCourses(),course)}</select></label></div><div class="subjects-grid teacher-subject-preview v34-subject-preview">${subjects.map((sub,i)=>subjectCardFor(sub,i,course)).join('')||'<div class="empty-state">Selecciona un curso con materias cargadas.</div>'}</div></section><section class="window-panel subject-editor-panel v34-subject-editor"><h3>${editSubject?'Editar materia':'Crear curso o materia'}</h3><p class="meta">Cambia etapa, curso, nombre o visibilidad. Para cursos nuevos, escribe el curso y guarda una materia.</p><form id="t27SubjectForm" class="form-grid" method="post" action="javascript:void(0)"><input type="hidden" name="id" value="${safe(editId)}"><label>Etapa<select name="stage">${options(stages,editStage)}</select></label><label>Curso<select name="course">${options(dynamicCourses(),editCourse)}</select></label><label>O escribir curso nuevo<input name="courseCustom" placeholder="Ej.: FP Medio Higiene Bucodental"></label><label>Nombre de la materia<input name="subject" required maxlength="120" value="${safe(editSubject)}" placeholder="Ej.: Cultura Clásica"></label><label class="check-line"><input type="checkbox" name="active" ${edit.active===false?'':'checked'}> Visible para el alumnado</label><div class="inline-actions"><button class="primary-btn" type="button" data-t27-save-subject>Guardar materia</button><button class="secondary-btn" type="button" data-t31-clear-subject-editor>Limpiar editor</button></div><span class="form-status" data-t31-subject-status></span></form><hr><h3>Materias añadidas o modificadas</h3>${custom.map(x=>`<article class="list-item ${x.active===false?'is-hidden-item':''}"><strong>${safe(x.subject)}</strong><p>${safe(x.stage)} · ${safe(x.course)} · ${x.active===false?'oculta':'visible'}</p><div class="inline-actions"><button type="button" data-t27-edit-subject="${safe(x.id)}">Editar</button><button type="button" data-t33-toggle-subject="${safe(x.subject)}">${x.active===false?'Mostrar':'Ocultar'}</button><button type="button" data-t27-delete-subject="${safe(x.id)}">Eliminar</button></div></article>`).join('')||'<div class="empty-state">Todavía no hay materias personalizadas para este curso.</div>'}</section></div>`;
  }
  function subjectCardFor(subject, i, course){
    const mats=visibleMaterials(subject);
    const custom=subjectOverride(State.selectedSubjectStage,course,subject);
    const hidden=isSubjectHidden(State.selectedSubjectStage,course,subject);
    const vis=subjectVisual(subject);
    const units=new Set(mats.map(m=>m.unit_title||m.unit||'Unidad 1')).size||0;
    return `<article class="subject-card subject-${i%6} ${hidden?'is-hidden-subject':''}" tabindex="0" role="button" data-subject="${safe(subject)}" style="--subject-color:${vis.color}"><div class="subject-top"><span>${safe(course||'')}</span>${hidden?'<em class="subject-hidden-label">Oculta</em>':''}${roleTeacher()?`<button type="button" class="subject-menu-btn" data-t29-subject-menu="${safe(custom?.id||'')}" data-subject-name="${safe(subject)}">⋯</button>`:''}</div><div class="subject-mark">${safe(vis.glyph)}</div><h3>${safe(subject)}</h3><p>${mats.length} publicaciones · ${units} unidades</p><small>${hidden?'No se muestra al alumnado.':'Visible para el alumnado.'}</small>${roleTeacher()?`<div class="subject-inline-actions"><button type="button" data-t29-new-material="${safe(subject)}">Publicar material</button><button type="button" data-t33-toggle-subject="${safe(subject)}">${hidden?'Mostrar al alumnado':'Ocultar al alumnado'}</button>${custom?`<button type="button" data-t27-edit-subject="${safe(custom.id)}">Editar</button><button type="button" data-t27-delete-subject="${safe(custom.id)}">Eliminar</button>`:`<button type="button" data-t29-create-custom-subject="${safe(subject)}">Editar</button>`}</div>`:''}</article>`;
  }
  async function toggleSubjectVisibility(subject){
    const stage=State.selectedSubjectStage, course=State.selectedSubjectCourse;
    const current=subjectOverride(stage, course, subject);
    const currentlyHidden=isSubjectHidden(stage, course, subject);
    const payload=current ? {...current, active: currentlyHidden} : {id:null, stage, course, subject, active: currentlyHidden ? true : false};
    const rpc=await State.client.rpc('tribeca_save_subject_override_v30',{p_payload:payload});
    if(rpc.error) throw rpc.error;
    setLocalSubjectHidden(stage, course, subject, payload.active===false);
    await loadData(true);
    toast(payload.active===false?'Materia oculta al alumnado.':'Materia visible para el alumnado.');
    rerender();
  }

  function guidanceContent(){
    const rows = (State.data.guidance || []).filter(r => roleTeacher() || !r.hidden);
    if(roleTeacher()) { const edit=State.pendingGuidanceEdit||{}; return `<div class="guidance-layout t24-guidance-layout"><section class="window-panel guidance-editor-panel"><h3>${edit.id?'Editar recurso de orientación':'Nuevo recurso de orientación'}</h3><p class="meta">Publica o modifica tests, documentos, enlaces, presentaciones o recursos visibles para el alumnado.</p><form id="t24GuidanceForm" method="post" action="javascript:void(0)" class="form-grid"><input type="hidden" name="id" value="${safe(edit.id||'')}"><label>Tipo<select name="resourceType">${[['vocational_test','Test vocacional'],['emotional_test','Test de inteligencia emocional'],['itinerary','Itinerarios académicos'],['bachillerato','Bachillerato y accesos'],['fp','Formación Profesional'],['career','Carreras universitarias'],['link','Enlace externo'],['presentation','Presentación'],['pdf','Documento PDF']].map(([v,l])=>`<option value="${v}" ${String(edit.resource_type||'')===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Título<input name="title" required maxlength="140" value="${safe(edit.title||'')}"></label><label>Descripción<textarea name="body" rows="5">${safe(edit.body||'')}</textarea></label><label>Enlace<input name="linkUrl" type="url" placeholder="https://..." value="${safe(edit.link_url||'')}"></label><label>Archivo PDF, presentación, Word o imagen<input name="guidanceFile" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,image/png,image/jpeg,image/webp"><input type="hidden" name="attachmentJson" value="${safe(JSON.stringify(Array.isArray(edit.attachments)?edit.attachments[0]||'':''))}"><small id="guidanceFileName">${safe(Array.isArray(edit.attachments)&&edit.attachments[0]?.name?edit.attachments[0].name:'')}</small></label><label class="check-line"><input type="checkbox" name="hidden" ${edit.hidden?'checked':''}> Ocultar de momento</label><div class="inline-actions"><button class="primary-btn" type="button" data-t24-save-guidance onclick="return window.TribecaSaveGuidanceDirect(this,event)">${edit.id?'Guardar cambios':'Guardar recurso'}</button>${edit.id?'<button class="secondary-btn" type="button" data-t35-cancel-guidance-edit>Cancelar edición</button>':''}</div><span class="form-status" data-t24-guidance-status></span></form></section><section class="window-panel guidance-list-panel"><h3>Recursos publicados</h3>${rows.map(g=>guidanceCard(g,true)).join('')||'<div class="empty-state">Todavía no hay recursos.</div>'}</section></div>`; }
    return `<section class="window-panel guidance-student"><h3>Orientación académica y profesional</h3><p class="meta">Recursos publicados por la profesora para orientar tus decisiones académicas y profesionales.</p>${rows.map(g=>guidanceCard(g,false)).join('')||'<div class="empty-state">Todavía no hay recursos de orientación publicados.</div>'}</section>`;
  }
  function guidanceTypeLabel(g){
    const raw = String(g.resource_type || g.resourceType || '').trim();
    const text = `${g.title||''} ${g.body||''}`.toLowerCase();
    if(/emocional|emotional/.test(text)) return 'Test de inteligencia emocional';
    const map = {vocational_test:'Test vocacional', emotional_test:'Test de inteligencia emocional', itinerary:'Itinerarios académicos', bachillerato:'Bachillerato y accesos', fp:'Formación Profesional', career:'Carreras universitarias', link:'Enlace externo', presentation:'Presentación', pdf:'Documento PDF'};
    return map[raw] || 'Recurso de orientación';
  }
  function guidanceCustomIconAsset(g){
    const text = `${g?.title||''} ${g?.body||''} ${g?.link_url||''}`.toLowerCase();
    if(text.includes('lumen-v') || text.includes('lumen v')) return 'assets/lumen-v-icon.webp';
    if(text.includes('itinera')) return 'assets/itinera-icon.webp';
    return '';
  }
  function guidanceTypeIcon(g){
    const label = guidanceTypeLabel(g).toLowerCase();
    if(label.includes('emocional')) return '🧠';
    if(label.includes('vocacional')) return '🧭';
    if(label.includes('bachiller')) return '🎓';
    if(label.includes('formación profesional')) return '🛠️';
    if(label.includes('universit')) return '🏛️';
    if(label.includes('pdf')) return '📄';
    if(label.includes('presentación')) return '🖥️';
    return '🔗';
  }
  function guidanceIconMarkup(g){
    const custom = guidanceCustomIconAsset(g);
    if(custom) return `<img src="${safe(custom)}" alt="Icono del recurso ${safe(g?.title || 'de orientación')}" loading="lazy">`;
    return `<span aria-hidden="true">${safe(guidanceTypeIcon(g))}</span>`;
  }
  function guidanceCard(g,teacher=false){
    const a=Array.isArray(g.attachments)?g.attachments[0]:null;
    const typeLabel=guidanceTypeLabel(g);
    return `<article class="guidance-card-premium ${g.hidden?'is-hidden-item':''}"><div class="guidance-card-icon ${guidanceCustomIconAsset(g)?'has-custom-icon':''}">${guidanceIconMarkup(g)}</div><div class="guidance-card-body"><div class="guidance-card-top"><span>${safe(typeLabel)}</span>${g.hidden?'<em>Oculto</em>':''}</div><h3>${safe(g.title)}</h3><p>${safe(g.body||'')}</p><div class="guidance-actions">${g.link_url?`<a class="secondary-btn" href="${safe(g.link_url)}" target="_blank" rel="noopener">Abrir recurso</a>`:''}${a?attachmentList({attachments:[a]}):''}${teacher?`<button type="button" data-t35-edit-guidance="${safe(g.id)}">Editar</button><button type="button" data-t18-toggle-guidance="${safe(g.id)}">${g.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t18-delete-guidance="${safe(g.id)}">Eliminar</button>`:''}</div></div></article>`;
  }
  async function saveGuidance(form){
    const fd = new FormData(form); const btn = form.querySelector('[type="submit"]'); const status=form.querySelector('[data-t24-guidance-status]');
    const setStatus=(msg,kind='info')=>{ if(status){ status.textContent=msg||''; status.classList.remove('is-ok','is-error','is-info'); if(msg) status.classList.add(kind==='ok'?'is-ok':kind==='error'?'is-error':'is-info'); } if(msg) toast(msg); };
    if(btn){ btn.disabled=true; btn.dataset.originalText=btn.textContent; btn.textContent='Guardando…'; }
    try{
      const attachment = fd.get('attachmentJson') ? JSON.parse(fd.get('attachmentJson')) : null;
      const rec = { id: fd.get('id') || null, resource_type: fd.get('resourceType'), title:String(fd.get('title')||'').trim(), body:fd.get('body')||'', link_url:String(fd.get('linkUrl')||'').trim()||null, attachments:attachment?[attachment]:[], hidden:!!fd.get('hidden'), created_by:State.profile.id };
      if(!rec.title) throw new Error('Escribe un título para el recurso de orientación.');
      const rpc = await State.client.rpc('tribeca_save_guidance_resource_v27', { p_payload: rec });
      if(rpc.error) throw rpc.error;
      await log('guidance','Recurso de orientación guardado',{title:rec.title});
      await loadData(true); State.pendingGuidanceEdit=null; setStatus('Recurso guardado correctamente.', 'ok'); form.reset(); rerender();
    } catch(e){ console.error(e); setStatus(`Error al guardar orientación: ${e?.message || e?.details || e}`, 'error'); }
    finally { if(btn){ btn.disabled=false; btn.textContent=btn.dataset.originalText || 'Guardar recurso'; } }
  }

  function profileContent(){
    const p = State.profile || {};
    const notify = p.notification_preferences || {};
    const currentIcon = p.avatar_icon || '💡';
    const photo = teacherProfileImageUrl(p);
    const academic = academicLine(p);
    return `<div class="profile-hub">
      <section class="profile-summary-card">
        <div class="profile-summary-avatar">${photo ? `<img src="${safe(photo)}" alt="Retrato de perfil">` : safe(currentIcon)}</div>
        <div>
          <p class="eyebrow">Panel personal</p>
          <h2>${safe(displayName(p))}</h2>
          <p>${safe(p.role === 'teacher' ? 'Profesora' : academic)}</p>
        </div>
      </section>

      <section class="profile-tool-card profile-avatar-card">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">🎨</span>
          <div>
            <h3>Cambiar icono de perfil</h3>
            <p>Elige uno de los iconos disponibles para que sea tu nueva imagen de perfil.</p>
          </div>
        </header>
        <form id="t16ProfileIconForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid">
          <div class="icon-grid t16-icon-grid profile-icon-grid" aria-label="Iconos de perfil">${icon100.map(ic=>`<button type="button" class="icon-choice ${(currentIcon)===ic?'is-selected':''}" data-t16-avatar="${safe(ic)}" title="Icono ${safe(ic)}">${safe(ic)}</button>`).join('')}</div>
          <input type="hidden" name="avatarIcon" value="${safe(currentIcon)}">
          ${roleTeacher()?`<div class="teacher-profile-image-box"><label>Imagen de perfil de profesora<input name="profileImage" type="file" accept="image/png,image/jpeg,image/webp"></label><input type="hidden" name="avatarImageUrl" value="${safe(photo||'')}"><span id="profileImagePreview" class="profile-preview-avatar">${photo?`<img src="${safe(photo)}" alt="Retrato de perfil">`:safe(currentIcon)}</span></div>`:''}
          <button class="primary-btn" type="submit">Guardar icono</button>
        </form>
      </section>

      <section class="profile-tool-card">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">✉️</span>
          <div>
            <h3>Notificaciones por email</h3>
            <p>Indica un correo personal y marca qué avisos quieres recibir. Para que los emails salgan de verdad, debe estar activo el servicio de envío de Supabase.</p>
          </div>
        </header>
        <form id="t16ProfileNotificationsForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid">
          <label>Email personal<input name="personalEmail" type="email" value="${safe(p.personal_email||'')}" placeholder="tuemail@ejemplo.com"></label>
          <div class="notification-options profile-notification-options">
            <label><input type="checkbox" name="messages" ${notify.messages?'checked':''}> <span>Mensajes</span></label>
            <label><input type="checkbox" name="calendar" ${notify.calendar?'checked':''}> <span>Calendario</span></label>
            <label><input type="checkbox" name="announcements" ${notify.announcements?'checked':''}> <span>Anuncios</span></label>
            <label><input type="checkbox" name="materials" ${notify.materials?'checked':''}> <span>Materiales</span></label>
          </div>
          <button class="secondary-btn" type="submit">Guardar notificaciones</button>
        </form>
      </section>

      <section class="profile-tool-card">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">🔐</span>
          <div>
            <h3>Modificar contraseña</h3>
            <p>Cambia tu contraseña de acceso o solicita recuperación si no recuerdas la actual.</p>
          </div>
        </header>
        <form id="t16PasswordForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid">
          <label>Nueva contraseña<input name="password" type="password" minlength="6" required autocomplete="new-password"></label>
          <label>Repetir contraseña<input name="repeat" type="password" minlength="6" required autocomplete="new-password"></label>
          <button class="secondary-btn" type="submit">Modificar contraseña</button>
        </form>
        <form id="t16OwnResetForm" class="profile-reset-form">
          <button class="link-button" type="submit">Solicitar recuperación de contraseña</button>
        </form>
      </section>

      ${!roleTeacher()?`<section class="profile-tool-card profile-academic-card">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">🎓</span>
          <div>
            <h3>Datos académicos</h3>
            <p>${safe(academic)}</p>
          </div>
        </header>
        <p class="meta">Estos datos solo puede modificarlos la profesora.</p>
      </section>`:''}
    </div>`;
  }

  async function saveProfileIcon(form){ const fd=new FormData(form); const patch={avatar_icon:fd.get('avatarIcon')||'💡'}; if(roleTeacher()) patch.avatar_image_url=fd.get('avatarImageUrl') || TRIBECA_TEACHER_PROFILE_IMAGE; const {error}=await table('profiles').update(patch).eq('id',State.profile.id); if(error) throw error; Object.assign(State.profile,patch); updateTopProfile(); await updatePresence(); toast('Perfil actualizado correctamente.'); }
  async function saveProfileNotifications(form){ const fd=new FormData(form); const prefs={messages:!!fd.get('messages'),calendar:!!fd.get('calendar'),announcements:!!fd.get('announcements'),materials:!!fd.get('materials')}; const patch={personal_email:fd.get('personalEmail')||null,notification_preferences:prefs}; await maybe(table('profiles').update(patch).eq('id',State.profile.id)); Object.assign(State.profile,patch); toast('Preferencias guardadas.'); }
  async function changePassword(form){ const fd=new FormData(form); if(fd.get('password')!==fd.get('repeat')) return toast('Las contraseñas no coinciden.'); if(!confirm('¿Quieres modificar tu contraseña?')) return; const {error}=await State.client.auth.updateUser({password:fd.get('password')}); if(error) toast('No se pudo modificar la contraseña.'); else {toast('Contraseña modificada correctamente.'); form.reset();} }

  function difficultiesContent(){ const rows=State.data.difficulties||[]; return `<div class="window-grid"><section class="window-panel"><h3>Añadir o modificar materia</h3><form id="t16DifficultyForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><input type="hidden" name="id"><label>Materia<select name="subject">${subjectList().map(s=>`<option>${safe(s)}</option>`).join('')}</select></label><label>Nivel de dificultad<select name="level"><option>Baja</option><option selected>Media</option><option>Alta</option><option>Muy alta</option></select></label><label>Explica las dificultades<textarea name="notes" rows="4" placeholder="Describe qué contenidos, tareas o situaciones te resultan difíciles."></textarea></label><button class="primary-btn" type="submit">Guardar</button></form></section><section class="window-panel"><h3>Mis materias con dificultades</h3>${rows.length?rows.map(d=>`<article class="list-item"><strong>${safe(d.subject)}</strong><p>${safe(d.level)} · ${safe(d.notes||'')}</p><button data-t16-edit-diff="${d.id}">Editar</button><button data-t16-delete-diff="${d.id}">Eliminar</button></article>`).join(''):'<div class="empty-state">No has indicado materias con dificultades.</div>'}</section></div>`; }
  async function saveDifficulty(form){ const fd=new FormData(form); const rec={user_id:State.profile.id,subject:fd.get('subject'),level:fd.get('level'),notes:fd.get('notes')||''}; if(fd.get('id')) await maybe(table('difficult_subjects').update(rec).eq('id',fd.get('id'))); else await maybe(table('difficult_subjects').insert(rec)); await log('difficulty','Materia con dificultad actualizada',rec); await loadData(true); toast('Guardado.'); renderApp(); rerender(); }
  function gradesContent(){
    const rows=(State.data.grades||[]).filter(g=>String(g.user_id||g.student_id||'')===String(State.profile?.id||''));
    const subjects=subjectList();
    const bySubject=gradeSubjectSummaries(rows);
    const overall=gradeSummary(rows);
    const subjectOptions=subjects.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('');
    const subjectCards=bySubject.length ? bySubject.map(s=>{
      const evals = ['Primera evaluación','Segunda evaluación','Tercera evaluación'].map(ev=>{
        const evSum=gradeSummary(s.items.filter(x=>String(x.evaluation||'')===ev));
        return `<span class="eval-chip ${evSum.cls}">${ev.replace(' evaluación','')}: <strong>${evSum.avg}</strong></span>`;
      }).join('');
      return `<article class="grade-average-card ${s.cls}"><div><strong>${safe(s.subject)}</strong><span>${s.count} nota${s.count===1?'':'s'}</span></div><div class="grade-average-number">${s.avg}</div><small>${safe(s.label)}</small><div class="evaluation-average-row">${evals}</div></article>`;
    }).join('') : '<div class="empty-state">Aún no hay medias por asignatura. Registra tu primera calificación.</div>';
    const tableRows=rows.length ? rows.map(g=>{ const item=gradeSummary([g]); return `<tr><td>${safe(g.subject)}</td><td>${safe(g.unit||g.didactic_unit||'')}</td><td>${safe(g.evaluation)}</td><td>${safe(g.type||g.assessment_type||g.test_type||'')}</td><td>${g.weight?`${Number(g.weight).toFixed(0)} %`:'Normal'}</td><td><span class="grade-pill ${item.cls}">${Number(g.grade).toFixed(2)} · ${safe(item.label)}</span></td><td class="table-actions"><button type="button" data-t16-edit-grade="${g.id}">Editar</button><button type="button" data-t16-delete-grade="${g.id}">Eliminar</button></td></tr>`; }).join('') : `<tr><td colspan="7" class="empty-cell">Todavía no hay calificaciones registradas.</td></tr>`;
    return `<div class="grades-tool"><section class="window-panel grade-form-panel"><h3>Nueva calificación</h3><p class="meta">Añade tus notas del centro escolar. La media se calcula automáticamente por asignatura y por evaluación.</p><form id="t16GradeForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid grade-form"><input type="hidden" name="id"><label>Materia<select name="subject" required>${subjectOptions}</select></label><label>Unidad didáctica<input name="unit" maxlength="80" required placeholder="Ej.: Unidade 5"></label><label>Evaluación<select name="evaluation" required><option>Primera evaluación</option><option>Segunda evaluación</option><option>Tercera evaluación</option></select></label><label>Tipo de prueba<select name="type" required><option>Examen</option><option>Trabajo</option><option>Presentación</option><option>Examen oral</option></select></label><label>Nota<input name="grade" type="number" step="0.01" min="0" max="10" required placeholder="0-10"></label><label class="grade-weight-field">Ponderación opcional (%)<input name="weight" type="number" step="1" min="0" max="100" placeholder="Vacío = media normal"><small>La ponderación sirve para indicar cuánto pesa una prueba en la media. Por ejemplo, un examen puede valer el 70 % y un trabajo el 30 %. Si lo dejas en blanco, la plataforma calcula una media normal con el mismo valor para todas las notas.</small></label><button class="primary-btn" type="button" data-t29-save-grade onclick="return window.TribecaSaveGradeDirect(this,event)">Guardar calificación</button><div id="gradeSaveStatus" class="form-status" aria-live="polite"></div></form></section><section class="window-panel grade-summary-panel"><h3>Media total de todas las evaluaciones</h3><div class="t16-grade-summary ${overall.cls}"><strong>${overall.avg}</strong><span>${safe(overall.label)}</span></div><h3>Media por asignatura y evaluación</h3><div class="grade-average-grid">${subjectCards}</div></section><section class="window-panel grade-table-panel"><h3>Tabla de calificaciones</h3><div class="table-wrap"><table class="grades-table"><thead><tr><th>Materia</th><th>Unidad</th><th>Evaluación</th><th>Tipo</th><th>Ponderación</th><th>Nota</th><th>Acciones</th></tr></thead><tbody>${tableRows}</tbody></table></div></section></div>`;
  }
  function gradeSubjectSummaries(rows){
    const map=new Map();
    rows.forEach(r=>{ const key=r.subject||'Sin materia'; if(!map.has(key)) map.set(key,[]); map.get(key).push(r); });
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([subject,items])=>({subject,count:items.length,items,...gradeSummary(items)}));
  }
  function gradeSummary(rows){
    const clean=(rows||[]).filter(r=>!Number.isNaN(Number(r.grade)));
    if(!clean.length) return {avg:'—',label:'Sin calificaciones',cls:'is-empty'};
    const weighted=clean.filter(r=>Number(r.weight)>0);
    const totalW=weighted.reduce((a,r)=>a+Number(r.weight),0);
    const avg=totalW>0 ? weighted.reduce((a,r)=>a+(Number(r.grade)*Number(r.weight)),0)/totalW : clean.reduce((a,r)=>a+Number(r.grade),0)/clean.length;
    let label='Suspenso', cls='is-fail';
    if(avg>=9){label='Sobresaliente';cls='is-excellent'} else if(avg>=7){label='Notable';cls='is-notable'} else if(avg>=6){label='Bien';cls='is-good'} else if(avg>=5){label='Aprobado';cls='is-pass'}
    return {avg:avg.toFixed(2),label,cls};
  }
  async function saveGrade(form){
    const status = form?.querySelector?.('#gradeSaveStatus');
    const setStatus=(msg,kind='info')=>{ if(status){ status.textContent=msg; status.className=`form-status ${kind}`; } };
    try{
      if(!State.client || !State.profile?.id) throw new Error('No se detecta sesión activa. Cierra sesión y vuelve a entrar.');
      const fd=new FormData(form);
      const gradeValue=Number(String(fd.get('grade')||'').replace(',','.'));
      const weightRaw=String(fd.get('weight')||'').trim();
      const rec={ id:fd.get('id')||null, user_id:State.profile.id, student_id:State.profile.id, subject:String(fd.get('subject')||'').trim(), unit:String(fd.get('unit')||'').trim(), didactic_unit:String(fd.get('unit')||'').trim(), evaluation:String(fd.get('evaluation')||'').trim(), type:String(fd.get('type')||'').trim(), assessment_type:String(fd.get('type')||'').trim(), test_type:String(fd.get('type')||'').trim(), grade:gradeValue, weight:weightRaw!==''?Number(weightRaw):null };
      if(!rec.subject || !rec.unit || !rec.evaluation || !rec.type) throw new Error('Completa materia, unidad didáctica, evaluación y tipo de prueba.');
      if(Number.isNaN(rec.grade) || rec.grade<0 || rec.grade>10) throw new Error('La nota debe estar entre 0 y 10.');
      if(rec.weight!==null && (Number.isNaN(rec.weight) || rec.weight<0 || rec.weight>100)) throw new Error('La ponderación debe estar entre 0 y 100.');
      setStatus('Guardando calificación...', 'info');
      const {data,error}=await State.client.rpc('tribeca_save_student_grade_v29',{p_payload:rec});
      if(error) throw error;
      if(!data || data.ok===false) throw new Error(data?.message || 'Supabase no confirmó el guardado de la calificación.');
      try{ await log('grade','Calificación registrada',rec); }catch(_e){}
      await loadData(true); setStatus('Calificación guardada correctamente.', 'success'); toast('Calificación guardada correctamente.'); form.reset(); renderApp(); rerender();
    }catch(e){ console.error('Error al guardar calificación', e); const msg=e?.message || 'No se pudo guardar la calificación.'; setStatus(`Error: ${msg}`, 'error'); toast(`No se pudo guardar la calificación: ${msg}`); }
    return false;
  }
  function badgesContent(){ const earned=(State.data.userBadges||[]).filter(b=>b.user_id===State.profile.id || b.student_id===State.profile.id); return `<section class="window-panel"><h3>Mis insignias</h3>${earned.length?earned.map(b=>`<article class="r10-badge-card"><span class="badge-icon">${safe(badgeIcon(b.badge_code))}</span><div><strong>${safe(b.badge_name||badgeName(b.badge_code))}</strong><p>Asignada por la profesora.</p></div></article>`).join(''):'<div class="empty-state">Todavía no tienes insignias asignadas.</div>'}</section>`; }

  function claimableMaterials(){ const claimed=new Set((State.data.badgeClaims||[]).filter(c=>c.user_id===State.profile?.id).map(c=>`${c.material_id}:${c.badge_code}`)); return visibleMaterials().filter(m=>Array.isArray(m.badge_codes)&&m.badge_codes.some(c=>!claimed.has(`${m.id}:${c}`))); }
  async function claimBadge(materialId){ const mat=visibleMaterials().find(m=>m.id===materialId); if(!mat) return; for(const code of mat.badge_codes||[]) await maybe(table('badge_claim_requests').insert({user_id:State.profile.id, material_id:mat.id, material_title:mat.title, badge_code:code, status:'pending'})); await log('badge_claim','Insignia reclamada',{material:mat.title}); await loadData(true); toast('Solicitud enviada a la profesora.'); rerender(); }



  function aboutTribecaContent(){
    return `<section class="footer-about about-tribeca-panel" aria-labelledby="aboutTribecaTitle"><figure class="footer-about-portrait"><img src="assets/patricia-trillo-perfil.webp" alt="Retrato profesional de Patricia Trillo, pedagoga y fundadora de Tribeca Academia"></figure><div class="footer-about-copy"><p class="footer-about-kicker">Detrás de Tribeca</p><h2 id="aboutTribecaTitle">Patricia Trillo, una mirada pedagógica, creativa e innovadora</h2><p>Tribeca Academia nace del impulso profesional de Patricia Trillo, pedagoga y fundadora del proyecto. Con quince años de experiencia en enseñanza, refuerzo educativo y acompañamiento académico, Patricia ha trabajado con alumnado de distintas edades, etapas y perfiles, siempre desde una premisa clara: cada persona aprende de una forma singular y necesita una respuesta educativa ajustada, humana y rigurosa.</p><p>El proyecto comenzó cuando, con veintiún años, fundó Tribeca Academia para ofrecer apoyo educativo a alumnado de Primaria y ESO. Desde entonces, la academia ha crecido hasta convertirse en un espacio de aprendizaje cercano, exigente y creativo, orientado a acompañar trayectorias académicas diversas y a transformar las dificultades en oportunidades reales de mejora.</p><p>Su forma de entender la educación combina experiencia, curiosidad e innovación pedagógica. Esa búsqueda constante de mejora sostiene la identidad del proyecto: enseñar con rigor, acompañar con sensibilidad y crear soluciones educativas que tengan sentido para el alumnado de hoy.</p></div></section>`;
  }
  function legalContent(){ return `<section class="window-panel privacy-section"><h3>Aviso legal</h3><p>Tribeca Aula es una plataforma educativa vinculada a Tribeca Academia, situada en Calle Rafael Juan, 33, 15130, Corcubión, A Coruña. Esta web se destina a la comunicación educativa, la organización de materiales, el seguimiento académico y la atención pedagógica del alumnado.</p><h4>Política de privacidad</h4><p>Los datos personales se tratarán con la finalidad de gestionar el aula virtual, las comunicaciones, el seguimiento académico y las solicitudes realizadas por alumnado o familias. El acceso a datos sensibles de seguimiento, observaciones, NEE o NEAE queda restringido a la profesora.</p><h4>Política de cookies</h4><p>La plataforma puede utilizar almacenamiento local técnico para conservar preferencias de visualización, sesión, idioma, zoom o estado de lectura. Antes de incorporar analítica, publicidad o cookies no técnicas deberá habilitarse un sistema específico de consentimiento.</p><h4>Condiciones de uso</h4><p>El uso de Tribeca Aula debe ser respetuoso, veraz y exclusivamente educativo. No se permite compartir credenciales, suplantar identidades, difundir materiales sin autorización ni publicar contenido ofensivo.</p><h4>Protección de datos</h4><p>La versión operativa debe mantener autenticación, permisos y reglas de seguridad en Supabase. Las contraseñas no deben compartirse y cualquier solicitud de recuperación será gestionada manualmente por la profesora.</p></section>`; }
  function supportContent(){ return `<section class="window-panel"><h3>Soporte</h3><p>Para incidencias de acceso, materiales, mensajes o calendario, utiliza el formulario de contacto o escribe a la profesora.</p></section>`; }
  function contactContent(){ return `<section class="window-panel"><h3>Contacto</h3><form id="contactForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><label>Nombre y apellidos<input name="name" required></label><label>Teléfono<input name="phone" required></label><label>Email<input name="email" type="email" required></label><label>Consulta<select name="topic"><option>Información sobre precios</option><option>Horarios</option><option>Metodología</option><option>Problemas de acceso</option><option>Otra consulta</option></select></label><label>Mensaje<textarea name="message" maxlength="600" rows="5"></textarea></label><button class="primary-btn" type="submit">Preparar email</button></form></section>`; }


  async function saveSubjectOverride(form){ const status=form.querySelector('[data-t31-subject-status]'); const setStatus=(m,k='info')=>{ if(status){ status.textContent=m; status.className='form-status '+(k==='ok'?'is-ok':k==='error'?'is-error':'is-info'); } if(m) toast(m); }; const fd=new FormData(form); const custom=String(fd.get('courseCustom')||'').trim(); const previousId=fd.get('id')||null; const before=previousId ? (State.data.subjects||[]).find(x=>x.id===previousId) : null; const payload={id:previousId,stage:fd.get('stage'),course:custom||fd.get('course'),subject:String(fd.get('subject')||'').trim(),active:!!fd.get('active')}; if(!payload.subject) return setStatus('Escribe el nombre de la materia.','error'); setStatus('Guardando materia…'); const rpc=await State.client.rpc('tribeca_save_subject_override_v30',{p_payload:payload}); if(rpc.error) throw rpc.error; const saved=rpc.data?.subject || rpc.data?.row || payload; if(before){ pushUndo('edición de materia', async()=>{ await State.client.rpc('tribeca_save_subject_override_v30',{p_payload:before}); }); } else if(saved?.id){ pushUndo('creación de materia', async()=>{ await State.client.rpc('tribeca_delete_subject_override_v30',{p_id:saved.id}); }); } await loadData(true); State.selectedSubjectStage=payload.stage; State.selectedSubjectCourse=payload.course; State.pendingSubjectEdit=null; setStatus('Materia guardada correctamente.','ok'); rerender(); }
  async function deleteSubjectOverride(id){ if(!confirm('¿Eliminar esta materia personalizada?')) return; const before=(State.data.subjects||[]).find(x=>x.id===id); const rpc=await State.client.rpc('tribeca_delete_subject_override_v30',{p_id:id}); if(rpc.error) throw rpc.error; if(before){ pushUndo('eliminación de materia', async()=>{ await State.client.rpc('tribeca_save_subject_override_v30',{p_payload:before}); }); } await loadData(true); toast('Materia eliminada.'); rerender(); }
  function studentName(id){ const s=(State.data.students||[]).find(x=>x.id===id); if(s) return displayName(s); if(id===State.profile?.id) return displayName(State.profile); return 'Usuario'; }
  function badgeName(code){ return badges.find(b=>b.code===code)?.name || code || 'Insignia'; } function badgeIcon(code){ return badges.find(b=>b.code===code)?.icon || '🏅'; }
  function normImage(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }



  async function promoteStudentFromForm(form){
    if(!roleTeacher()) return toast('Solo la profesora puede promocionar alumnado.');
    if(!confirm('¿Promocionar este alumno y borrar datos académicos del curso anterior?')) return;
    const fd=new FormData(form);
    const id=String(fd.get('id')||'').trim();
    const center=fd.get('center')||null, stage=fd.get('stage')||null, course=fd.get('course')||null;
    const rpc=await State.client.rpc('tribeca_teacher_promote_student_v30',{p_student_id:id,p_center:center,p_stage:stage,p_course:course});
    if(rpc.error){ toast(rpc.error.message||'No se pudo promocionar.'); return; }
    pushUndo('promoción de alumno', async()=>{ await State.client.rpc('tribeca_teacher_undo_last_v30',{}); }); await loadData(true); toast('Alumno promocionado y datos académicos anteriores limpiados.'); rerender();
  }

  async function handleManagedSubmit(form){
    if(!form || form.dataset.tribecaSubmitting === '1') return;
    form.dataset.tribecaSubmitting = '1';
    try {
      if(form.id==='t16LoginForm') await signIn(form.elements.username.value,form.elements.password.value);
      else if(form.id==='t16ResetForm') await requestReset(form);
      else if(form.id==='t16PublicationForm') await savePublication(form);
      else if(form.id==='t16EventForm') await saveEvent(form);
      else if(form.id==='t16AssignBadgeForm') await assignBadge(form);
      else if(form.id==='t16StudentProfileForm' || form.id==='t24StudentProfileForm') await saveStudentProfile(form);
      else if(form.id==='t16StudentMessageForm') await sendMessage(form,false);
      else if(form.id==='t16TeacherMessageForm') await sendMessage(form,true);
      else if(form.id==='t16ProfileIconForm') await saveProfileIcon(form);
      else if(form.id==='t16ProfileNotificationsForm') await saveProfileNotifications(form);
      else if(form.id==='t16PasswordForm') await changePassword(form);
      else if(form.id==='t16OwnResetForm') { await maybe(table('password_reset_requests').insert({username:State.profile.username,display_name:displayName(State.profile),status:'pending'})); toast('Solicitud enviada.'); }
      else if(form.id==='t16DifficultyForm') await saveDifficulty(form);
      else if(form.id==='t16GradeForm') await saveGrade(form);
      else if(form.id==='t16BillingForm') await saveBilling(form);
      else if(form.id==='t50PauseForm') await saveStudentPause(form);
      else if(form.id==='t18GuidanceForm' || form.id==='t24GuidanceForm') await saveGuidance(form);
      else if(form.id==='t27SubjectForm') await saveSubjectOverride(form);
      else if(form.id==='contactForm'){ const fd=new FormData(form); location.href=`mailto:tribecaacademia@gmail.com?subject=${encodeURIComponent('Consulta Tribeca Aula: '+fd.get('topic'))}&body=${encodeURIComponent('Nombre: '+fd.get('name')+'\nTeléfono: '+fd.get('phone')+'\nEmail: '+fd.get('email')+'\n\n'+fd.get('message'))}`; }
    } catch(e){ console.error(e); toast(e.message || 'No se pudo completar la acción.'); }
    finally { setTimeout(()=>{ if(form) form.dataset.tribecaSubmitting = ''; }, 250); }
  }
  window.TribecaSubmitForm = function(form, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } handleManagedSubmit(form); return false; };
  window.TribecaSaveStudentProfileDirect = function(btn, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } const form = btn?.closest?.('form') || (document.getElementById('t24StudentProfileForm') || document.getElementById('t16StudentProfileForm')); if(!form){ toast('No se encontró el formulario de perfil. Cierra y vuelve a abrir Perfiles del alumnado.'); return false; } saveStudentProfile(form); return false; };
  window.TribecaSaveCalendarEventDirect = function(btn, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } const form = btn?.closest?.('form') || document.getElementById('t16EventForm'); if(!form){ toast('No se encontró el formulario del calendario.'); return false; } saveEvent(form); return false; };
  window.TribecaSaveGuidanceDirect = function(btn, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } const form = btn?.closest?.('form') || document.getElementById('t24GuidanceForm') || document.getElementById('t18GuidanceForm'); if(!form){ toast('No se encontró el formulario de orientación.'); return false; } saveGuidance(form); return false; };
  window.TribecaSaveGradeDirect = function(btn, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } const form = btn?.closest?.('form') || document.getElementById('t16GradeForm'); if(!form){ toast('No se encontró el formulario de calificaciones.'); return false; } saveGrade(form); return false; };
  function receiptVerificationCode(userId, month, amount){ return `TRB-${String(month).replace('-','')}-${String(hashText(`${userId}-${month}-${amount}-${new Date().toISOString().slice(0,10)}`)).slice(0,8).toUpperCase()}`; }
  window.TribecaPrintPaymentsPdf = function(kind){ const title = kind==='student'?'Histórico de pagos del alumno':'Resumen mensual de pagos'; const source = kind==='student' ? document.querySelector('.payment-history-panel') : document.querySelector('.payments-summary'); const html = source ? source.innerHTML : document.querySelector('.payments-layout')?.innerHTML || ''; const w = window.open('', '_blank'); if(!w) return toast('No se pudo abrir la ventana de impresión.'); const logo = 'assets/tribeca-academia-logo.webp'; w.document.write(`<html><head><title>${title}</title><style>@page{margin:18mm}body{font-family:Georgia,serif;padding:0;color:#172018}.pdf-head{display:flex;align-items:center;gap:14px;border-bottom:2px solid #b99a3b;padding-bottom:12px;margin-bottom:22px}.pdf-head img{width:54px;height:54px;object-fit:contain}.pdf-head strong{font-size:22px}.pdf-head span{display:block;color:#686052;font-size:12px}h1{font-size:21px;margin:0 0 18px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}.primary-btn,.secondary-btn,button{display:none!important}</style></head><body><header class="pdf-head"><img src="${logo}" alt="Tribeca Academia"><div><strong>Tribeca Academia</strong><span>Documento generado desde Tribeca Aula</span></div></header><h1>${title}</h1>${html}</body></html>`); w.document.close(); setTimeout(()=>w.print(),250); };
  function paymentReceiptMarkup(userId, month, opts={}){
    const s=(State.data.students||[]).find(x=>String(x.id)===String(userId)); if(!s) return '';
    const c=calculatePaymentAmount(userId, month); const pay=paymentMonthRecord(userId, month); const bill=(State.data.billing||[]).find(b=>b.user_id===userId)||{};
    const now=new Date(); const generated=now.toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}); const paidText=pay.paid?(pay.paid_date?fmtDate(pay.paid_date):'pagado'):'pendiente de pago'; const code=receiptVerificationCode(userId, month, c.amount);
    const tariff=bill.tariff_type==='mixed'?'Mixta':bill.tariff_type==='individual'?'Individual, por clase asistida':'Grupal, cuota fija mensual';
    const logo='assets/tribeca-academia-logo.webp';
    return `<main class="receipt-slip"><header class="receipt-head"><div class="receipt-brand"><img src="${logo}" alt="Tribeca Academia"><div><strong>Tribeca Academia</strong><span>Recibí interno · no factura</span></div></div><div class="receipt-code"><strong>${safe(code)}</strong><span>${safe(generated)}</span></div></header><section class="receipt-title"><h1>RECIBÍ</h1><p>${safe(monthLabel(month))} · ${safe(paymentModeLabel(s))}</p></section><section class="receipt-grid"><div><small>Alumno/a</small><strong>${safe(displayName(s))}</strong><span>${safe(academicLine(s))}</span></div><div><small>Estado</small><strong>${safe(paidText)}</strong><span>${pay.paid_date?fmtDate(pay.paid_date):'Fecha no registrada'}</span></div><div><small>Tarifa</small><strong>${safe(tariff)}</strong><span>${safe(c.detail)}</span></div><div><small>Importe</small><strong class="receipt-amount">${money(c.amount)}</strong><span>${c.present} asist. · ${c.justified} justif. · ${c.paused||0} pausadas</span></div></section><section class="receipt-concept"><strong>Concepto:</strong> apoyo educativo y clases de refuerzo correspondientes a ${safe(monthLabel(month))}.</section><footer class="receipt-sign"><div><small>Recibido por</small><strong>Patricia Trillo</strong></div><div><small>Firma electrónica interna</small><strong>${safe(code)}</strong></div></footer></main>`;
  }
  function receiptPrintDocument(title, body){
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(title)}</title><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#f7f5ee;color:#172018;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}.actions{position:sticky;top:0;z-index:2;padding:8px;text-align:right;background:#f7f5ee}.actions button{border:0;border-radius:999px;background:#0b3d22;color:#fffdf8;font-weight:900;padding:8px 12px}.receipt-sheet{display:grid;gap:8mm;align-content:start}.receipt-slip{width:190mm;min-height:86mm;margin:0 auto;background:#fffdf8;border:1px solid #d9cfb7;border-left:5px solid #0b3d22;border-radius:10px;padding:8mm;break-inside:avoid;page-break-inside:avoid}.receipt-head{display:flex;justify-content:space-between;gap:10px;border-bottom:1.5px solid #b99a3b;padding-bottom:6px}.receipt-brand{display:flex;align-items:center;gap:9px}.receipt-brand img{width:34px;height:34px;object-fit:contain}.receipt-brand strong{display:block;font-family:Georgia,serif;font-size:15px;color:#0b3d22}.receipt-brand span,.receipt-code span{display:block;color:#6f6658;font-size:9px;font-weight:750}.receipt-code{text-align:right;font-size:9px;color:#4b443b}.receipt-title{display:flex;align-items:end;justify-content:space-between;margin:8px 0}.receipt-title h1{font-family:Georgia,serif;font-size:22px;letter-spacing:.16em;color:#0b3d22;margin:0}.receipt-title p{margin:0;color:#6f6658;font-weight:850;font-size:10px}.receipt-grid{display:grid;grid-template-columns:1.15fr .85fr 1.15fr .85fr;gap:6px}.receipt-grid div{border:1px solid #e2d8c2;border-radius:8px;padding:7px;background:#fff}.receipt-grid small,.receipt-sign small{display:block;text-transform:uppercase;letter-spacing:.08em;color:#8a753b;font-size:8px;font-weight:900;margin-bottom:3px}.receipt-grid strong{display:block;font-size:11px}.receipt-grid span{display:block;color:#6f6658;font-size:9px;margin-top:2px}.receipt-amount{font-size:16px!important;color:#0b3d22}.receipt-concept{border-left:3px solid #b99a3b;margin:8px 0;padding:5px 0 5px 8px;font-size:10px}.receipt-sign{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-top:1px solid #e2d8c2;padding-top:6px}.receipt-sign strong{font-family:Georgia,serif;font-size:12px}@media print{body{background:white}.actions{display:none}.receipt-slip{margin:0 auto 5mm}}</style></head><body><div class="actions"><button onclick="window.print()">Descargar o guardar como PDF</button></div><section class="receipt-sheet">${body}</section><script>setTimeout(()=>window.print(),350)</script></body></html>`;
  }
  window.TribecaPrintPaymentReceipt = function(userId, month){
    const s=(State.data.students||[]).find(x=>String(x.id)===String(userId)); if(!s) return toast('Selecciona un alumno para generar el recibí.');
    const html=paymentReceiptMarkup(userId, month); const w=window.open('', '_blank'); if(!w) return toast('No se pudo abrir la ventana de impresión.');
    w.document.write(receiptPrintDocument(`Recibí ${displayName(s)} ${monthLabel(month)}`, html)); w.document.close();
  };
  window.TribecaPrintQuarterReceipts = function(userId, month){
    const s=(State.data.students||[]).find(x=>String(x.id)===String(userId)); if(!s) return toast('Selecciona un alumno para generar los recibís.');
    const months=quarterMonthsFor(month).filter(m=>paymentMonthRecord(userId,m).paid || calculatePaymentAmount(userId,m).amount>0);
    const html=months.map(m=>paymentReceiptMarkup(userId,m)).join(''); const w=window.open('', '_blank'); if(!w) return toast('No se pudo abrir la ventana de impresión.');
    w.document.write(receiptPrintDocument(`Recibís trimestrales ${displayName(s)}`, html || '<p>No hay recibís disponibles para este trimestre.</p>')); w.document.close();
  };

  function wireManagedForms(root=document){ root.querySelectorAll('form').forEach(form=>{ if(form.dataset.tribecaWired) return; form.dataset.tribecaWired='1'; form.setAttribute('method','post'); form.setAttribute('action','javascript:void(0)'); form.addEventListener('submit', ev=>window.TribecaSubmitForm(form, ev), true); }); }
  function bindGlobal() {
    window.addEventListener('click', async ev=>{ const btn=ev.target.closest?.('[data-t24-save-student]'); if(btn){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); const f=btn.closest('form'); if(f) await saveStudentProfile(f); } }, true);
    document.addEventListener('click', async ev=>{
      const mailTab=ev.target.closest?.('[data-mail-box]'); if(mailTab){ const box=mailTab.dataset.mailBox; const root=mailTab.closest('.mail-app'); root?.querySelectorAll('.mail-tab').forEach(b=>b.classList.toggle('is-active', b===mailTab)); root?.querySelectorAll('[data-mail-box-view]').forEach(v=>v.hidden=v.dataset.mailBoxView!==box); return; }
      const monthNav=ev.target.closest?.('[data-t51-month-nav]'); if(monthNav){ ev.preventDefault(); ev.stopPropagation(); State.billingMonth=monthNav.dataset.t51MonthNav; rerender(); return; }
      const logout=ev.target.closest?.('#logoutButton,[data-action="logout"]'); if(logout){ ev.preventDefault(); ev.stopImmediatePropagation(); signOut(); return; }
      const prof=ev.target.closest?.('#profileButton'); if(prof){ ev.preventDefault(); ev.stopImmediatePropagation(); openTool('profile'); return; }
      const navBtn=ev.target.closest?.('.main-nav .nav-btn');
      if(navBtn){
        if(navBtn.matches('[data-public-tool-link]')) return;
        const target = navBtn.dataset.tool || navBtn.dataset.route || 'subjects';
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if(target === 'home') showHomePage();
        else renderInlineSection(target);
        return;
      }
      const publicToolLink=ev.target.closest?.('[data-public-tool-link]'); if(publicToolLink){ return; }
      const inlineHome=ev.target.closest?.('[data-t52-go-home]'); if(inlineHome){ ev.preventDefault(); ev.stopImmediatePropagation(); showHomePage(); return; }
      const dataTool=ev.target.closest?.('[data-tool]'); if(dataTool){ ev.preventDefault(); ev.stopImmediatePropagation(); openTool(dataTool.dataset.tool); return; }
      const undoBtn=ev.target.closest?.('[data-t30-undo]'); if(undoBtn){ ev.preventDefault(); ev.stopPropagation(); await undoLast(); return; } const teacherTool=ev.target.closest?.('[data-t16-tool]'); if(teacherTool){ ev.preventDefault(); openTool(teacherTool.dataset.t16Tool); return; }
      if(ev.target.closest?.('[data-t44-mobile-back],[data-t16-close]')){ const w=ev.target.closest('.tool-window'); State.windows.delete(w?.dataset.window); w?.remove(); return; }
      if(ev.target.closest?.('[data-t16-min]')){ ev.target.closest('.tool-window')?.classList.add('is-hidden'); return; }
      if(ev.target.closest?.('[data-t16-max]')){ ev.target.closest('.tool-window')?.classList.toggle('is-maximized'); return; }
      const saveStudentBtn=ev.target.closest?.('[data-t24-save-student],[data-t23-save-student],[data-t22-save-student],[data-t21-save-student]'); if(saveStudentBtn){ const f=saveStudentBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await handleManagedSubmit(f); } return; }
      const saveEventBtn=ev.target.closest?.('[data-t25-save-event]'); if(saveEventBtn){ const f=saveEventBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveEvent(f); } return; }
      const saveGuidanceBtn=ev.target.closest?.('[data-t24-save-guidance]'); if(saveGuidanceBtn){ const f=saveGuidanceBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveGuidance(f); } return; }
      const saveGradeBtn=ev.target.closest?.('[data-t25-save-grade],[data-t26-save-grade],[data-t29-save-grade]'); if(saveGradeBtn){ const f=saveGradeBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveGrade(f); } return; }
      const avatar=ev.target.closest?.('[data-t16-avatar]'); if(avatar){ const f=avatar.closest('form'); f.querySelectorAll('.icon-choice').forEach(b=>b.classList.remove('is-selected')); avatar.classList.add('is-selected'); f.elements.avatarIcon.value=avatar.dataset.t16Avatar; return; }
      const emoji=ev.target.closest?.('[data-t16-emoji]'); if(emoji){ const ta=emoji.closest('form')?.elements.body; if(ta){ta.value+=emoji.dataset.t16Emoji; ta.focus();} return; }
      const day=ev.target.closest?.('[data-t16-day]'); if(day){ State.selectedDate=day.dataset.t16Day; State.selectedEventId=null; State.calendarMonth=startMonth(parseIso(State.selectedDate)); refreshCalendarAfterNavigation(); return; }
      if(ev.target.closest?.('[data-t40-cal-jump]')){ ev.preventDefault(); chooseCalendarDate(); return; }
      if(ev.target.closest?.('[data-t16-cal-prev]')){ State.calendarMonth=new Date(State.calendarMonth.getFullYear(),State.calendarMonth.getMonth()-1,1); refreshCalendarAfterNavigation(); return; }
      if(ev.target.closest?.('[data-t16-cal-next]')){ State.calendarMonth=new Date(State.calendarMonth.getFullYear(),State.calendarMonth.getMonth()+1,1); refreshCalendarAfterNavigation(); return; }
      const eventBtn=ev.target.closest?.('[data-t16-event]'); if(eventBtn){ State.selectedEventId=eventBtn.dataset.t16Event; const e=relevantEvents().find(x=>x.id===State.selectedEventId); if(e){State.selectedDate=e.date;State.calendarMonth=startMonth(parseIso(e.date));} refreshCalendarAfterNavigation(); return; }
      const hideE=ev.target.closest?.('[data-t16-hide-event]'); if(hideE){ await maybe(table('calendar_events').update({hidden:true}).eq('id',hideE.dataset.t16HideEvent)); await loadData(true); rerender(); return; }
      const delE=ev.target.closest?.('[data-t16-delete-event]'); if(delE){ if(confirm('¿Eliminar esta fecha?')){ await maybe(table('calendar_events').delete().eq('id',delE.dataset.t16DeleteEvent)); await loadData(true); rerender(); } return; }
      const st=ev.target.closest?.('[data-t16-select-student]'); if(st){ State.selectedStudentId=st.dataset.t16SelectStudent; rerender(); return; }
      const attToggle=ev.target.closest?.('[data-t22-attendance-toggle]'); if(attToggle && !ev.target.closest('button')){ await toggleAttendance(attToggle); return; }
      const attBtn=ev.target.closest?.('[data-t16-attendance]'); if(attBtn){ await saveAttendance(attBtn); return; }
      const endPauseBtn=ev.target.closest?.('[data-t50-end-pause]'); if(endPauseBtn){ ev.preventDefault(); ev.stopPropagation(); await endStudentPause(endPauseBtn.dataset.t50EndPause); return; }
      const approve=ev.target.closest?.('[data-t16-approve-claim]'); if(approve){ resolveClaim(approve.dataset.t16ApproveClaim,true); return; }
      const reject=ev.target.closest?.('[data-t16-reject-claim]'); if(reject){ resolveClaim(reject.dataset.t16RejectClaim,false); return; }
      const passDone=ev.target.closest?.('[data-t16-pass-done]'); if(passDone){ await maybe(table('password_reset_requests').update({status:'attended',consulted_at:new Date().toISOString()}).eq('id',passDone.dataset.t16PassDone)); await loadData(true); rerender(); return; }
      const diffE=ev.target.closest?.('[data-t16-edit-diff]'); if(diffE){ const d=(State.data.difficulties||[]).find(x=>x.id===diffE.dataset.t16EditDiff); const f=$('#t16DifficultyForm'); if(d&&f){f.elements.id.value=d.id;f.elements.subject.value=d.subject;f.elements.level.value=d.level;f.elements.notes.value=d.notes||'';} return; }
      const diffD=ev.target.closest?.('[data-t16-delete-diff]'); if(diffD){ await maybe(table('difficult_subjects').delete().eq('id',diffD.dataset.t16DeleteDiff)); await loadData(true); renderApp(); rerender(); return; }
      const gradeE=ev.target.closest?.('[data-t16-edit-grade]'); if(gradeE){ const g=(State.data.grades||[]).find(x=>x.id===gradeE.dataset.t16EditGrade); const f=$('#t16GradeForm'); if(g&&f){f.elements.id.value=g.id;f.elements.subject.value=g.subject;f.elements.unit.value=g.unit||g.didactic_unit||'';f.elements.evaluation.value=g.evaluation;f.elements.type.value=g.type||g.assessment_type||g.test_type||'';f.elements.grade.value=g.grade;f.elements.weight.value=g.weight||'';} return; }
      const gradeD=ev.target.closest?.('[data-t16-delete-grade]'); if(gradeD){ const rpc=await State.client.rpc('tribeca_delete_student_grade_v29',{p_grade_id:gradeD.dataset.t16DeleteGrade}); if(rpc.error) toast(rpc.error.message||'No se pudo eliminar.'); await loadData(true); renderApp(); rerender(); return; }
      const claim=ev.target.closest?.('[data-t16-claim]'); if(claim){ claimBadge(claim.dataset.t16Claim); return; }
      const toggleAnn=ev.target.closest?.('[data-t16-toggle-ann]'); if(toggleAnn){ const a=(State.data.announcements||[]).find(x=>x.id===toggleAnn.dataset.t16ToggleAnn); await maybe(table('announcements').update({hidden:!a?.hidden}).eq('id',toggleAnn.dataset.t16ToggleAnn)); await loadData(true); rerender(); return; }
      const delAnn=ev.target.closest?.('[data-t16-delete-ann]'); if(delAnn){ await maybe(table('announcements').delete().eq('id',delAnn.dataset.t16DeleteAnn)); await loadData(true); rerender(); return; }
      const toggleMat=ev.target.closest?.('[data-t16-toggle-mat]'); if(toggleMat){ const m=(State.data.materials||[]).find(x=>x.id===toggleMat.dataset.t16ToggleMat); await maybe(table('subject_materials').update({hidden:!m?.hidden}).eq('id',toggleMat.dataset.t16ToggleMat)); await loadData(true); rerender(); return; }
      const delMat=ev.target.closest?.('[data-t16-delete-mat]'); if(delMat){ await maybe(table('subject_materials').delete().eq('id',delMat.dataset.t16DeleteMat)); await loadData(true); rerender(); return; }
      const editAnn=ev.target.closest?.('[data-t32-edit-ann]'); if(editAnn){ ev.preventDefault(); ev.stopPropagation(); const a=(State.data.announcements||[]).find(x=>String(x.id)===String(editAnn.dataset.t32EditAnn)); if(a){ State.pendingPublicationEdit={table:'announcements', id:a.id, item:{...a}, kind:'announcement'}; openTool('newPublication'); } return; }
      const editMat=ev.target.closest?.('[data-t32-edit-mat]'); if(editMat){ ev.preventDefault(); ev.stopPropagation(); const m=(State.data.materials||[]).find(x=>String(x.id)===String(editMat.dataset.t32EditMat)); if(m){ State.pendingPublicationEdit={table:'subject_materials', id:m.id, item:{...m}, kind:normalizeMaterialKind(m.material_type||m.type)}; State.currentSubject=m.subject || State.currentSubject; openTool('newPublication'); } return; }
      if(ev.target.closest?.('[data-t32-cancel-publication-edit]')){ ev.preventDefault(); ev.stopPropagation(); State.pendingPublicationEdit=null; State.prefillPublicationSubject=null; openTool('newPublication'); return; }
      const selectVisible=ev.target.closest?.('[data-t32-select-visible]'); if(selectVisible){ ev.preventDefault(); const form=selectVisible.closest('form'); form?.querySelectorAll('.t32-badge-student:not([hidden]) input[name="userIds"]').forEach(i=>{ i.checked=true; }); return; }
      const clearAll=ev.target.closest?.('[data-t32-clear-all]'); if(clearAll){ ev.preventDefault(); clearAll.closest('form')?.querySelectorAll('input[name="userIds"]').forEach(i=>{ i.checked=false; }); return; }
      const selectGroup=ev.target.closest?.('[data-t32-select-group]'); if(selectGroup){ ev.preventDefault(); selectGroup.closest('details')?.querySelectorAll('.t32-badge-student:not([hidden]) input[name="userIds"]').forEach(i=>{ i.checked=true; }); return; }
      const clearGroup=ev.target.closest?.('[data-t32-clear-group]'); if(clearGroup){ ev.preventDefault(); clearGroup.closest('details')?.querySelectorAll('input[name="userIds"]').forEach(i=>{ i.checked=false; }); return; }

      const matDone=ev.target.closest?.('[data-t33-toggle-completion]'); if(matDone){ ev.preventDefault(); ev.stopPropagation(); await toggleMaterialCompletion(matDone.dataset.t33ToggleCompletion); return; }
      const matOpen=ev.target.closest?.('[data-t33-open-mat]'); if(matOpen){ ev.preventDefault(); ev.stopPropagation(); openMaterialInNewWindow(matOpen.dataset.t33OpenMat); return; }
      const subjToggle=ev.target.closest?.('[data-t33-toggle-subject]'); if(subjToggle){ ev.preventDefault(); ev.stopPropagation(); await toggleSubjectVisibility(subjToggle.dataset.t33ToggleSubject); return; }
      const newMat=ev.target.closest?.('[data-t29-new-material]'); if(newMat){ ev.preventDefault(); ev.stopPropagation(); State.pendingPublicationEdit=null; State.prefillPublicationSubject=newMat.dataset.t29NewMaterial; openTool('newPublication'); return; }
      const subjMenu=ev.target.closest?.('[data-t29-subject-menu]'); if(subjMenu){ ev.preventDefault(); ev.stopPropagation(); const id=subjMenu.dataset.t29SubjectMenu; const x=(State.data.subjects||[]).find(s=>s.id===id); State.pendingSubjectEdit = x ? {...x} : {stage:State.selectedSubjectStage,course:State.selectedSubjectCourse,subject:subjMenu.dataset.subjectName,active:true}; openTool('teacherSubjects'); return; }
      const subjEditByName=ev.target.closest?.('[data-t30-subject-edit-by-name]'); if(subjEditByName){ ev.preventDefault(); ev.stopPropagation(); const name=subjEditByName.dataset.t30SubjectEditByName; const x=(State.data.subjects||[]).find(s=>s.stage===State.selectedSubjectStage&&s.course===State.selectedSubjectCourse&&s.subject===name); State.pendingSubjectEdit = x ? {...x} : {stage:State.selectedSubjectStage,course:State.selectedSubjectCourse,subject:name,active:true}; openTool('teacherSubjects'); return; }
      const createCustom=ev.target.closest?.('[data-t29-create-custom-subject]'); if(createCustom){ ev.preventDefault(); ev.stopPropagation(); const name=createCustom.dataset.t29CreateCustomSubject; const x=(State.data.subjects||[]).find(s=>s.stage===State.selectedSubjectStage&&s.course===State.selectedSubjectCourse&&s.subject===name); State.pendingSubjectEdit = x ? {...x} : {stage:State.selectedSubjectStage,course:State.selectedSubjectCourse,subject:name,active:true}; openTool('teacherSubjects'); return; }
      const clearSubj=ev.target.closest?.('[data-t31-clear-subject-editor]'); if(clearSubj){ ev.preventDefault(); State.pendingSubjectEdit=null; rerender(); return; }
      const prom=ev.target.closest?.('[data-t29-promote-student]'); if(prom){ const f=prom.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await promoteStudentFromForm(f); } return; }
      const saveSubj=ev.target.closest?.('[data-t27-save-subject]'); if(saveSubj){ const f=saveSubj.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveSubjectOverride(f); } return; }
      const editSubj=ev.target.closest?.('[data-t27-edit-subject]'); if(editSubj){ const x=(State.data.subjects||[]).find(s=>s.id===editSubj.dataset.t27EditSubject); if(x){ State.pendingSubjectEdit={...x}; rerender(); } return; }
      const delSubj=ev.target.closest?.('[data-t27-delete-subject]'); if(delSubj){ await deleteSubjectOverride(delSubj.dataset.t27DeleteSubject); return; }
      const editGuid=ev.target.closest?.('[data-t35-edit-guidance]'); if(editGuid){ ev.preventDefault(); ev.stopPropagation(); const g=(State.data.guidance||[]).find(x=>x.id===editGuid.dataset.t35EditGuidance); if(g){ State.pendingGuidanceEdit={...g}; openTool('guidance'); } return; }
      const cancelGuid=ev.target.closest?.('[data-t35-cancel-guidance-edit]'); if(cancelGuid){ ev.preventDefault(); ev.stopPropagation(); State.pendingGuidanceEdit=null; openTool('guidance'); return; }
      const toggleGuid=ev.target.closest?.('[data-t18-toggle-guidance]'); if(toggleGuid){ const g=(State.data.guidance||[]).find(x=>x.id===toggleGuid.dataset.t18ToggleGuidance); await maybe(table('guidance_resources').update({hidden:!g?.hidden}).eq('id',toggleGuid.dataset.t18ToggleGuidance)); await loadData(true); rerender(); return; }
      const delGuid=ev.target.closest?.('[data-t18-delete-guidance]'); if(delGuid){ if(confirm('¿Eliminar este recurso de orientación?')){ await maybe(table('guidance_resources').delete().eq('id',delGuid.dataset.t18DeleteGuidance)); await loadData(true); rerender(); } return; }
      const markMsg=ev.target.closest?.('[data-t16-mark-read],[data-t28-mark-read]'); if(markMsg){ const id=markMsg.dataset.t16MarkRead||markMsg.dataset.t28MarkRead; const rpc=await State.client.rpc('tribeca_mark_private_message_read_v28',{p_message_id:id}); if(rpc.error) toast(rpc.error.message||'No se pudo marcar como leído.'); await loadData(true); updateBadges(); rerender(); return; }
      const archMsg=ev.target.closest?.('[data-t16-archive-message]'); if(archMsg){ const rpc=await State.client.rpc('tribeca_archive_private_message_v28',{p_message_id:archMsg.dataset.t16ArchiveMessage}); if(rpc.error) toast(rpc.error.message||'No se pudo archivar.'); await loadData(true); updateBadges(); rerender(); return; }
      const delMsg=ev.target.closest?.('[data-t28-delete-message]'); if(delMsg){ if(confirm('¿Eliminar este mensaje de tu bandeja?')){ const rpc=await State.client.rpc('tribeca_delete_private_message_v28',{p_message_id:delMsg.dataset.t28DeleteMessage}); if(rpc.error) toast(rpc.error.message||'No se pudo eliminar.'); await loadData(true); updateBadges(); rerender(); } return; }
      if(ev.target.closest?.('[data-t16-forgot]')){ $('#t16LoginForm').hidden=true; $('#t16ResetForm').hidden=false; return; }
      if(ev.target.closest?.('[data-t16-login]')){ $('#t16ResetForm').hidden=true; $('#t16LoginForm').hidden=false; return; }
    }, true);
    document.addEventListener('submit', async ev=>{ const f=ev.target; const ids=['t16LoginForm','t16ResetForm','t16PublicationForm','t16EventForm','t16AssignBadgeForm','t16StudentProfileForm','t24StudentProfileForm','t16StudentMessageForm','t16TeacherMessageForm','t16ProfileIconForm','t16ProfileNotificationsForm','t16PasswordForm','t16OwnResetForm','t16DifficultyForm','t16GradeForm','t16BillingForm','t50PauseForm','t18GuidanceForm','t24GuidanceForm','t27SubjectForm','contactForm']; if(!ids.includes(f.id)) return; ev.preventDefault(); ev.stopImmediatePropagation(); await handleManagedSubmit(f); }, true);
    document.addEventListener('input', ev=>{ if(ev.target?.dataset?.t16StudentSearch!==undefined){ const q=ev.target.value.toLowerCase(); const root=ev.target.closest('.window-panel,form') || document; root.querySelectorAll('[data-student-name]').forEach(el=>{el.hidden=!!(q && !el.dataset.studentName.includes(q));}); root.querySelectorAll('details').forEach(d=>{ const items=[...d.querySelectorAll('[data-student-name]')]; if(items.length) d.hidden=items.every(x=>x.hidden); }); } }, true);
    document.addEventListener('change', async ev=>{ if(ev.target?.id==='languageSelect'){ localStorage.setItem('tribeca-language-user-set','1'); localStorage.setItem('tribeca-language', ev.target.value || (roleTeacher()?'es':'gl')); setTimeout(()=>applyTranslations(document), 0); return; } if(ev.target?.name==='imageFile' && ev.target.files?.[0]){ const url=await normImage(ev.target.files[0]); ev.target.form.elements.imageUrl.value=url; $('#t16ImagePreview', ev.target.form).innerHTML=`<img src="${safe(url)}" alt="">`; } if(ev.target?.name==='attachmentFiles' && ev.target.files?.length){ const files=await Promise.all(Array.from(ev.target.files).map(async file=>({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}))); ev.target.form.elements.attachmentsJson.value=JSON.stringify(files); const box=$('#attachmentPreview', ev.target.form); if(box) box.textContent=files.map(f=>f.name).join(', '); } if(ev.target?.name==='messageFiles' && ev.target.files?.length){ const files=await Promise.all(Array.from(ev.target.files).map(async file=>({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}))); ev.target.form.elements.attachmentsJson.value=JSON.stringify(files); const n=ev.target.form.querySelector('[data-message-file-name]'); if(n) n.textContent=files.map(f=>f.name).join(', '); } if(ev.target?.name==='guidanceFile' && ev.target.files?.[0]){ const file=ev.target.files[0]; ev.target.form.elements.attachmentJson.value=JSON.stringify({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}); const n=ev.target.form.querySelector('#guidanceFileName'); if(n) n.textContent=file.name; } if(ev.target?.name==='profileImage' && ev.target.files?.[0]){ const url=await normImage(ev.target.files[0]); ev.target.form.elements.avatarImageUrl.value=url; $('#profileImagePreview', ev.target.form).innerHTML=`<img src="${safe(url)}" alt="">`; } if(ev.target?.dataset?.t16BillingMonth!==undefined){ State.billingMonth=ev.target.value; rerender(); } if(ev.target?.dataset?.t18SubjectStage!==undefined){ State.selectedSubjectStage=ev.target.value; localStorage.setItem('tribeca-teacher-subject-stage', ev.target.value); rerender(); } if(ev.target?.dataset?.t18SubjectCourse!==undefined){ State.selectedSubjectCourse=ev.target.value; localStorage.setItem('tribeca-teacher-subject-course', ev.target.value); rerender(); } }, true);
  }


  const BASE_TRANSLATIONS = {
    'Panel personal de aprendizaje':{Galego:'Panel persoal de aprendizaxe',English:'Personal learning panel',Français:'Tableau personnel d’apprentissage',Polski:'Osobisty panel nauki',Deutsch:'Persönlicher Lernbereich',Português:'Painel pessoal de aprendizagem'},
    'Materiales organizados por unidades didácticas':{Galego:'Materiais organizados por unidades didácticas',English:'Materials organised by teaching units',Français:'Ressources organisées par unités',Polski:'Materiały uporządkowane według działów',Deutsch:'Materialien nach Lerneinheiten geordnet',Português:'Materiais organizados por unidades didáticas'},
    'Abre o cierra cada unidad para consultar apuntes, boletines, pruebas, juegos o enlaces publicados por la profesora.':{Galego:'Abre ou pecha cada unidade para consultar apuntamentos, boletíns, probas, xogos ou ligazóns publicados pola profesora.',English:'Open or close each unit to check notes, worksheets, tests, games or links published by the teacher.',Français:'Ouvre ou ferme chaque unité pour consulter les notes, fiches, tests, jeux ou liens publiés par l’enseignante.',Polski:'Otwórz lub zamknij każdy dział, aby sprawdzić notatki, karty pracy, testy, gry lub linki opublikowane przez nauczycielkę.',Deutsch:'Öffne oder schließe jede Einheit, um Notizen, Arbeitsblätter, Tests, Spiele oder Links der Lehrerin anzusehen.',Português:'Abre ou fecha cada unidade para consultar apontamentos, fichas, testes, jogos ou ligações publicados pela professora.'},
    'Todavía no hay publicaciones en esta materia.':{Galego:'Aínda non hai publicacións nesta materia.',English:'There are no posts in this subject yet.',Français:'Il n’y a pas encore de publications dans cette matière.',Polski:'Nie ma jeszcze publikacji z tego przedmiotu.',Deutsch:'Für dieses Fach gibt es noch keine Veröffentlichungen.',Português:'Ainda não há publicações nesta disciplina.'},
    'Publicar nuevo material':{Galego:'Publicar novo material',English:'Publish new material',Français:'Publier une nouvelle ressource',Polski:'Opublikuj nowy materiał',Deutsch:'Neues Material veröffentlichen',Português:'Publicar novo material'},
    'Editar materia':{Galego:'Editar materia',English:'Edit subject',Français:'Modifier la matière',Polski:'Edytuj przedmiot',Deutsch:'Fach bearbeiten',Português:'Editar disciplina'},
    'Progreso':{Galego:'Progreso',English:'Progress',Français:'Progression',Polski:'Postęp',Deutsch:'Fortschritt',Português:'Progresso'},
    'Abre la materia para ver unidades y materiales.':{Galego:'Abre a materia para ver unidades e materiais.',English:'Open the subject to view units and materials.',Français:'Ouvre la matière pour voir les unités et les ressources.',Polski:'Otwórz przedmiot, aby zobaczyć działy i materiały.',Deutsch:'Öffne das Fach, um Einheiten und Materialien zu sehen.',Português:'Abre a disciplina para ver unidades e materiais.'},
    'Ciencias de la Naturaleza':{Galego:'Ciencias da Natureza',English:'Natural Sciences',Français:'Sciences de la nature',Polski:'Nauki przyrodnicze',Deutsch:'Naturwissenschaften',Português:'Ciências da Natureza'},
    'Ciencias Sociales':{Galego:'Ciencias Sociais',English:'Social Sciences',Français:'Sciences sociales',Polski:'Nauki społeczne',Deutsch:'Sozialwissenschaften',Português:'Ciências Sociais'},
    'Educación Física':{Galego:'Educación Física',English:'Physical Education',Français:'Éducation physique',Polski:'Wychowanie fizyczne',Deutsch:'Sport',Português:'Educação Física'},
    'Educación Plástica y Visual':{Galego:'Educación Plástica e Visual',English:'Art and Visual Education',Français:'Arts plastiques et visuels',Polski:'Plastyka i edukacja wizualna',Deutsch:'Kunst und visuelle Bildung',Português:'Educação Plástica e Visual'},
    'Educación Plástica, Visual y Audiovisual':{Galego:'Educación Plástica, Visual e Audiovisual',English:'Art, Visual and Audiovisual Education',Français:'Arts plastiques, visuels et audiovisuels',Polski:'Edukacja plastyczna, wizualna i audiowizualna',Deutsch:'Kunst, visuelle und audiovisuelle Bildung',Português:'Educação Plástica, Visual e Audiovisual'},
    'Lengua Castellana y Literatura':{Galego:'Lingua Castelá e Literatura',English:'Spanish Language and Literature',Français:'Langue espagnole et littérature',Polski:'Język hiszpański i literatura',Deutsch:'Spanische Sprache und Literatur',Português:'Língua Espanhola e Literatura'},
    'Lengua Gallega y Literatura':{Galego:'Lingua Galega e Literatura',English:'Galician Language and Literature',Français:'Langue galicienne et littérature',Polski:'Język galicyjski i literatura',Deutsch:'Galicische Sprache und Literatur',Português:'Língua Galega e Literatura'},
    'English':{Galego:'English',English:'English',Français:'Anglais',Polski:'Angielski',Deutsch:'Englisch',Português:'Inglês'},
    'Français':{Galego:'Français',English:'French',Français:'Français',Polski:'Francuski',Deutsch:'Französisch',Português:'Francês'},
    'Matemáticas':{Galego:'Matemáticas',English:'Mathematics',Français:'Mathématiques',Polski:'Matematyka',Deutsch:'Mathematik',Português:'Matemática'},
    'Música':{Galego:'Música',English:'Music',Français:'Musique',Polski:'Muzyka',Deutsch:'Musik',Português:'Música'},
    'Música y Danza':{Galego:'Música e Danza',English:'Music and Dance',Français:'Musique et danse',Polski:'Muzyka i taniec',Deutsch:'Musik und Tanz',Português:'Música e Dança'},
    'Biología y Geología':{Galego:'Bioloxía e Xeoloxía',English:'Biology and Geology',Français:'Biologie et géologie',Polski:'Biologia i geologia',Deutsch:'Biologie und Geologie',Português:'Biologia e Geologia'},
    'Física y Química':{Galego:'Física e Química',English:'Physics and Chemistry',Français:'Physique et chimie',Polski:'Fizyka i chemia',Deutsch:'Physik und Chemie',Português:'Física e Química'},
    'Geografía e Historia':{Galego:'Xeografía e Historia',English:'Geography and History',Français:'Géographie et histoire',Polski:'Geografia i historia',Deutsch:'Geografie und Geschichte',Português:'Geografia e História'},
    'Tecnología y Digitalización':{Galego:'Tecnoloxía e Dixitalización',English:'Technology and Digitalisation',Français:'Technologie et numérisation',Polski:'Technologia i cyfryzacja',Deutsch:'Technologie und Digitalisierung',Português:'Tecnologia e Digitalização'},
    'Tecnología':{Galego:'Tecnoloxía',English:'Technology',Français:'Technologie',Polski:'Technologia',Deutsch:'Technik',Português:'Tecnologia'},
    'Digitalización':{Galego:'Dixitalización',English:'Digitalisation',Français:'Numérisation',Polski:'Cyfryzacja',Deutsch:'Digitalisierung',Português:'Digitalização'},
    'Tutoría':{Galego:'Titoría',English:'Tutoring',Français:'Tutorat',Polski:'Tutoring',Deutsch:'Tutorium',Português:'Tutoria'},
    'Ámbito Científico-Tecnológico':{Galego:'Ámbito Científico-Tecnolóxico',English:'Scientific-Technological Area',Français:'Domaine scientifique et technologique',Polski:'Obszar naukowo-technologiczny',Deutsch:'Naturwissenschaftlich-technischer Bereich',Português:'Área Científico-Tecnológica'},
    'Ámbito Lingüístico y Social':{Galego:'Ámbito Lingüístico e Social',English:'Linguistic and Social Area',Français:'Domaine linguistique et social',Polski:'Obszar językowo-społeczny',Deutsch:'Sprachlich-sozialer Bereich',Português:'Área Linguística e Social'},
    'Educación en Valores Cívicos y Éticos':{Galego:'Educación en Valores Cívicos e Éticos',English:'Civic and Ethical Values',Français:'Valeurs civiques et éthiques',Polski:'Wartości obywatelskie i etyczne',Deutsch:'Bürgerliche und ethische Werte',Português:'Valores Cívicos e Éticos'},
    'Filosofía':{Galego:'Filosofía',English:'Philosophy',Français:'Philosophie',Polski:'Filozofia',Deutsch:'Philosophie',Português:'Filosofia'},
    'Latín':{Galego:'Latín',English:'Latin',Français:'Latin',Polski:'Łacina',Deutsch:'Latein',Português:'Latim'},
    'Griego':{Galego:'Grego',English:'Greek',Français:'Grec',Polski:'Greka',Deutsch:'Griechisch',Português:'Grego'},
    'Economía':{Galego:'Economía',English:'Economics',Français:'Économie',Polski:'Ekonomia',Deutsch:'Wirtschaft',Português:'Economia'},
    'Economía y Emprendimiento':{Galego:'Economía e Emprendemento',English:'Economics and Entrepreneurship',Français:'Économie et entrepreneuriat',Polski:'Ekonomia i przedsiębiorczość',Deutsch:'Wirtschaft und Unternehmertum',Português:'Economia e Empreendedorismo'},
    'Química':{Galego:'Química',English:'Chemistry',Français:'Chimie',Polski:'Chemia',Deutsch:'Chemie',Português:'Química'},
    'Física':{Galego:'Física',English:'Physics',Français:'Physique',Polski:'Fizyka',Deutsch:'Physik',Português:'Física'},
    'Historia de España':{Galego:'Historia de España',English:'History of Spain',Français:'Histoire de l’Espagne',Polski:'Historia Hiszpanii',Deutsch:'Geschichte Spaniens',Português:'História de Espanha'},
    'Historia de la Filosofía':{Galego:'Historia da Filosofía',English:'History of Philosophy',Français:'Histoire de la philosophie',Polski:'Historia filozofii',Deutsch:'Geschichte der Philosophie',Português:'História da Filosofia'},
    'Psicología':{Galego:'Psicoloxía',English:'Psychology',Français:'Psychologie',Polski:'Psychologia',Deutsch:'Psychologie',Português:'Psicologia'},
    'Mis materias':{Galego:'As miñas materias',English:'My subjects',Français:'Mes matières',Polski:'Moje przedmioty',Deutsch:'Meine Fächer',Português:'As minhas disciplinas'},
    'Calendario':{Galego:'Calendario',English:'Calendar',Français:'Calendrier',Polski:'Kalendarz',Deutsch:'Kalender',Português:'Calendário'},
    'Mensajes':{Galego:'Mensaxes',English:'Messages',Français:'Messages',Polski:'Wiadomości',Deutsch:'Nachrichten',Português:'Mensagens'},
    'Anuncios':{Galego:'Anuncios',English:'Announcements',Français:'Annonces',Polski:'Ogłoszenia',Deutsch:'Ankündigungen',Português:'Anúncios'},
    'Cerrar sesión':{Galego:'Pechar sesión',English:'Log out',Français:'Se déconnecter',Polski:'Wyloguj',Deutsch:'Abmelden',Português:'Terminar sessão'},
    'Mi perfil':{Galego:'O meu perfil',English:'My profile',Français:'Mon profil',Polski:'Mój profil',Deutsch:'Mein Profil',Português:'O meu perfil'},
    'Panel docente':{Galego:'Panel docente',English:'Teacher panel',Français:'Panneau enseignant',Polski:'Panel nauczyciela',Deutsch:'Lehrerbereich',Português:'Painel docente'},
    'Nueva publicación':{Galego:'Nova publicación',English:'New post',Français:'Nouvelle publication',Polski:'Nowa publikacja',Deutsch:'Neue Veröffentlichung',Português:'Nova publicação'},
    'Qué ha ocurrido en el aula':{Galego:'Que ocorreu na aula',English:'What happened in class',Français:'Ce qui s’est passé en classe',Polski:'Co wydarzyło się w klasie',Deutsch:'Was im Kurs passiert ist',Português:'O que aconteceu na aula'},
    'Alertas docentes':{Galego:'Alertas docentes',English:'Teacher alerts',Français:'Alertes enseignantes',Polski:'Alerty nauczyciela',Deutsch:'Lehrerhinweise',Português:'Alertas docentes'},
    'Vista general del aula':{Galego:'Vista xeral da aula',English:'Class overview',Français:'Vue générale de la classe',Polski:'Przegląd klasy',Deutsch:'Kursübersicht',Português:'Vista geral da turma'},
    'Asignar insignia':{Galego:'Asignar insignia',English:'Assign badge',Français:'Attribuer un badge',Polski:'Przyznaj odznakę',Deutsch:'Abzeichen vergeben',Português:'Atribuir insígnia'},
    'Solicitudes de recuperación':{Galego:'Solicitudes de recuperación',English:'Password requests',Français:'Demandes de récupération',Polski:'Prośby o odzyskanie hasła',Deutsch:'Passwortanfragen',Português:'Pedidos de recuperação'},
    'Perfiles del alumnado':{Galego:'Perfís do alumnado',English:'Student profiles',Français:'Profils des élèves',Polski:'Profile uczniów',Deutsch:'Schülerprofile',Português:'Perfis dos alunos'},
    'Materias y materiales':{Galego:'Materias e materiais',English:'Subjects and materials',Français:'Matières et ressources',Polski:'Przedmioty i materiały',Deutsch:'Fächer und Materialien',Português:'Disciplinas e materiais'},
    'Orientación académica':{Galego:'Orientación académica',English:'Academic guidance',Français:'Orientation académique',Polski:'Doradztwo edukacyjne',Deutsch:'Schulische Beratung',Português:'Orientação académica'},
    'Pagos y asistencia':{Galego:'Pagos e asistencia',English:'Payments and attendance',Français:'Paiements et présence',Polski:'Płatności i obecność',Deutsch:'Zahlungen und Anwesenheit',Português:'Pagamentos e assiduidade'},
    'Pagos':{Galego:'Pagos',English:'Payments',Français:'Paiements',Polski:'Płatności',Deutsch:'Zahlungen',Português:'Pagamentos'},
    'Asistencia y pausas':{Galego:'Asistencia e pausas',English:'Attendance and pauses',Français:'Présence et pauses',Polski:'Obecność i przerwy',Deutsch:'Anwesenheit und Pausen',Português:'Assiduidade e pausas'},
    'Mis insignias':{Galego:'As miñas insignias',English:'My badges',Français:'Mes badges',Polski:'Moje odznaki',Deutsch:'Meine Abzeichen',Português:'As minhas insígnias'},
    'Mis materias con dificultades':{Galego:'Materias con dificultades',English:'Subjects I find difficult',Français:'Matières difficiles',Polski:'Trudne przedmioty',Deutsch:'Schwierige Fächer',Português:'Disciplinas com dificuldade'},
    'Mis calificaciones':{Galego:'As miñas cualificacións',English:'My grades',Français:'Mes notes',Polski:'Moje oceny',Deutsch:'Meine Noten',Português:'As minhas classificações'},
    'Guardar':{Galego:'Gardar',English:'Save',Français:'Enregistrer',Polski:'Zapisz',Deutsch:'Speichern',Português:'Guardar'},
    'Guardar calificación':{Galego:'Gardar cualificación',English:'Save grade',Français:'Enregistrer la note',Polski:'Zapisz ocenę',Deutsch:'Note speichern',Português:'Guardar classificação'},
    'Nueva calificación':{Galego:'Nova cualificación',English:'New grade',Français:'Nouvelle note',Polski:'Nowa ocena',Deutsch:'Neue Note',Português:'Nova classificação'},
    'Materia':{Galego:'Materia',English:'Subject',Français:'Matière',Polski:'Przedmiot',Deutsch:'Fach',Português:'Disciplina'},
    'Unidad didáctica':{Galego:'Unidade didáctica',English:'Unit',Français:'Unité',Polski:'Dział',Deutsch:'Lerneinheit',Português:'Unidade didática'},
    'Evaluación':{Galego:'Avaliación',English:'Term',Français:'Évaluation',Polski:'Okres oceniania',Deutsch:'Bewertung',Português:'Avaliação'},
    'Tipo de prueba':{Galego:'Tipo de proba',English:'Assessment type',Français:'Type d’épreuve',Polski:'Rodzaj sprawdzianu',Deutsch:'Prüfungsart',Português:'Tipo de prova'},
    'Nota':{Galego:'Nota',English:'Grade',Français:'Note',Polski:'Ocena',Deutsch:'Note',Português:'Nota'},
    'Tabla de calificaciones':{Galego:'Táboa de cualificacións',English:'Grades table',Français:'Tableau des notes',Polski:'Tabela ocen',Deutsch:'Notentabelle',Português:'Tabela de classificações'},
    'Media total de todas las evaluaciones':{Galego:'Media total de todas as avaliacións',English:'Overall average for all terms',Français:'Moyenne totale de toutes les évaluations',Polski:'Średnia ogólna ze wszystkich okresów',Deutsch:'Gesamtdurchschnitt aller Bewertungen',Português:'Média total de todas as avaliações'},
    'Media por asignatura y evaluación':{Galego:'Media por materia e avaliación',English:'Average by subject and term',Français:'Moyenne par matière et période',Polski:'Średnia według przedmiotu i okresu',Deutsch:'Durchschnitt nach Fach und Halbjahr',Português:'Média por disciplina e avaliação'},
    'Crear fecha':{Galego:'Crear data',English:'Create event',Français:'Créer une date',Polski:'Utwórz datę',Deutsch:'Termin erstellen',Português:'Criar data'},
    'Próximas fechas':{Galego:'Próximas datas',English:'Upcoming dates',Français:'Prochaines dates',Polski:'Nadchodzące daty',Deutsch:'Kommende Termine',Português:'Próximas datas'},
    'Deshacer último cambio':{Galego:'Desfacer o último cambio',English:'Undo last change',Français:'Annuler le dernier changement',Polski:'Cofnij ostatnią zmianę',Deutsch:'Letzte Änderung rückgängig machen',Português:'Desfazer última alteração'}
  };
  const EXTRA_TRANSLATIONS = {
    'Curso 2025/26':{Galego:'Curso 2025/26',English:'School year 2025/26',Français:'Année scolaire 2025/26',Polski:'Rok szkolny 2025/26',Deutsch:'Schuljahr 2025/26',Português:'Ano letivo 2025/26'},
    'Página principal':{Galego:'Páxina principal',English:'Home page',Français:'Page d’accueil',Polski:'Strona główna',Deutsch:'Startseite',Português:'Página principal'},
    'Texto':{Galego:'Texto',English:'Text',Français:'Texte',Polski:'Tekst',Deutsch:'Text',Português:'Texto'},
    'Lectura':{Galego:'Lectura',English:'Reading',Français:'Lecture',Polski:'Czytanie',Deutsch:'Lesen',Português:'Leitura'},
    'Por defecto':{Galego:'Por defecto',English:'Default',Français:'Par défaut',Polski:'Domyślne',Deutsch:'Standard',Português:'Predefinido'},
    'Idioma':{Galego:'Idioma',English:'Language',Français:'Langue',Polski:'Język',Deutsch:'Sprache',Português:'Idioma'},
    'Claro':{Galego:'Claro',English:'Light',Français:'Clair',Polski:'Jasny',Deutsch:'Hell',Português:'Claro'},
    'Oscuro':{Galego:'Escuro',English:'Dark',Français:'Sombre',Polski:'Ciemny',Deutsch:'Dunkel',Português:'Escuro'},
    'Aviso legal':{Galego:'Aviso legal',English:'Legal notice',Français:'Mentions légales',Polski:'Nota prawna',Deutsch:'Impressum',Português:'Aviso legal'},
    'Soporte':{Galego:'Soporte',English:'Support',Français:'Support',Polski:'Pomoc',Deutsch:'Support',Português:'Suporte'},
    'Contacto':{Galego:'Contacto',English:'Contact',Français:'Contact',Polski:'Kontakt',Deutsch:'Kontakt',Português:'Contacto'},
    '← Atrás':{Galego:'← Atrás',English:'← Back',Français:'← Retour',Polski:'← Wstecz',Deutsch:'← Zurück',Português:'← Voltar'},
    'Atrás':{Galego:'Atrás',English:'Back',Français:'Retour',Polski:'Wstecz',Deutsch:'Zurück',Português:'Voltar'},
    'Hola':{Galego:'Ola',English:'Hello',Français:'Bonjour',Polski:'Witaj',Deutsch:'Hallo',Português:'Olá'},
    'Panel personal':{Galego:'Panel persoal',English:'Personal panel',Français:'Panneau personnel',Polski:'Panel osobisty',Deutsch:'Persönlicher Bereich',Português:'Painel pessoal'},
    'Orientación académica y profesional':{Galego:'Orientación académica e profesional',English:'Academic and career guidance',Français:'Orientation scolaire et professionnelle',Polski:'Doradztwo edukacyjne i zawodowe',Deutsch:'Schulische und berufliche Beratung',Português:'Orientação académica e profissional'},
    'Tests vocacionales, inteligencia emocional, itinerarios, Bachillerato, FP y recursos para decidir mejor.':{Galego:'Tests vocacionais, intelixencia emocional, itinerarios, Bacharelato, FP e recursos para decidir mellor.',English:'Vocational tests, emotional intelligence, pathways, Baccalaureate, vocational training and resources to make better decisions.',Français:'Tests d’orientation, intelligence émotionnelle, parcours, lycée, formation professionnelle et ressources pour mieux décider.',Polski:'Testy predyspozycji, inteligencja emocjonalna, ścieżki kształcenia, szkoła średnia, kształcenie zawodowe i zasoby pomagające lepiej decydować.',Deutsch:'Berufswahltests, emotionale Intelligenz, Bildungswege, Oberstufe, Berufsbildung und Materialien für bessere Entscheidungen.',Português:'Testes vocacionais, inteligência emocional, percursos, Bacharelato, formação profissional e recursos para decidir melhor.'},
    'Recursos publicados por la profesora para orientar tus decisiones académicas y profesionales.':{Galego:'Recursos publicados pola profesora para orientar as túas decisións académicas e profesionais.',English:'Resources published by the teacher to guide your academic and career decisions.',Français:'Ressources publiées par l’enseignante pour guider tes décisions scolaires et professionnelles.',Polski:'Materiały opublikowane przez nauczycielkę, aby pomóc Ci w decyzjach edukacyjnych i zawodowych.',Deutsch:'Von der Lehrerin veröffentlichte Materialien zur Unterstützung deiner schulischen und beruflichen Entscheidungen.',Português:'Recursos publicados pela professora para orientar as tuas decisões académicas e profissionais.'},
    'Indica dónde necesitas más refuerzo.':{Galego:'Indica onde precisas máis reforzo.',English:'Indicate where you need more support.',Français:'Indique où tu as besoin de plus de soutien.',Polski:'Wskaż, gdzie potrzebujesz większego wsparcia.',Deutsch:'Gib an, wo du mehr Unterstützung brauchst.',Português:'Indica onde precisas de mais apoio.'},
    'Registra tus notas del centro escolar.':{Galego:'Rexistra as túas notas do centro escolar.',English:'Record your school grades.',Français:'Enregistre tes notes scolaires.',Polski:'Zapisuj swoje oceny szkolne.',Deutsch:'Trage deine Schulnoten ein.',Português:'Regista as tuas notas escolares.'},
    'Sin insignias todavía.':{Galego:'Aínda sen insignias.',English:'No badges yet.',Français:'Aucun badge pour le moment.',Polski:'Brak odznak.',Deutsch:'Noch keine Abzeichen.',Português:'Ainda sem insígnias.'},
    'Todavía no tienes insignias asignadas.':{Galego:'Aínda non tes insignias asignadas.',English:'You do not have any assigned badges yet.',Français:'Tu n’as pas encore de badges attribués.',Polski:'Nie masz jeszcze przyznanych odznak.',Deutsch:'Du hast noch keine Abzeichen erhalten.',Português:'Ainda não tens insígnias atribuídas.'},
    'No has indicado materias con dificultades.':{Galego:'Non indicaches materias con dificultades.',English:'You have not added subjects with difficulties.',Français:'Tu n’as indiqué aucune matière difficile.',Polski:'Nie wskazano trudnych przedmiotów.',Deutsch:'Du hast keine schwierigen Fächer angegeben.',Português:'Não indicaste disciplinas com dificuldades.'},
    'Sin materias con dificultades.':{Galego:'Sen materias con dificultades.',English:'No difficult subjects.',Français:'Aucune matière difficile.',Polski:'Brak trudnych przedmiotów.',Deutsch:'Keine schwierigen Fächer.',Português:'Sem disciplinas com dificuldades.'},
    'Explica las dificultades':{Galego:'Explica as dificultades',English:'Explain the difficulties',Français:'Explique les difficultés',Polski:'Opisz trudności',Deutsch:'Erkläre die Schwierigkeiten',Português:'Explica as dificuldades'},
    'Nivel de dificultad':{Galego:'Nivel de dificultade',English:'Difficulty level',Français:'Niveau de difficulté',Polski:'Poziom trudności',Deutsch:'Schwierigkeitsgrad',Português:'Nível de dificuldade'},
    'Leve':{Galego:'Leve',English:'Low',Français:'Faible',Polski:'Niski',Deutsch:'Gering',Português:'Ligeira'},
    'Media':{Galego:'Media',English:'Medium',Français:'Moyenne',Polski:'Średni',Deutsch:'Mittel',Português:'Média'},
    'Alta':{Galego:'Alta',English:'High',Français:'Élevée',Polski:'Wysoki',Deutsch:'Hoch',Português:'Alta'},
    'Añade tus notas del centro escolar. La media se calcula automáticamente por asignatura y por evaluación.':{Galego:'Engade as túas notas do centro escolar. A media calcúlase automaticamente por materia e por avaliación.',English:'Add your school grades. The average is calculated automatically by subject and term.',Français:'Ajoute tes notes scolaires. La moyenne est calculée automatiquement par matière et par période.',Polski:'Dodaj swoje oceny szkolne. Średnia oblicza się automatycznie według przedmiotu i okresu.',Deutsch:'Trage deine Schulnoten ein. Der Durchschnitt wird automatisch nach Fach und Halbjahr berechnet.',Português:'Adiciona as tuas notas escolares. A média é calculada automaticamente por disciplina e avaliação.'},
    'Ponderación':{Galego:'Ponderación',English:'Weighting',Français:'Pondération',Polski:'Waga oceny',Deutsch:'Gewichtung',Português:'Ponderação'},
    'Ponderación opcional (%)':{Galego:'Ponderación opcional (%)',English:'Optional weighting (%)',Français:'Pondération facultative (%)',Polski:'Opcjonalna waga (%)',Deutsch:'Optionale Gewichtung (%)',Português:'Ponderação opcional (%)'},
    'Se puede dejar en blanco. Sirve para indicar que una prueba cuenta más o menos en la media. Si todas las ponderaciones están vacías, la media será aritmética; si alguna tiene porcentaje, se usará la media ponderada.':{Galego:'Pódese deixar en branco. Serve para indicar que unha proba conta máis ou menos na media. Se todas as ponderacións están baleiras, a media será aritmética; se algunha ten porcentaxe, usarase a media ponderada.',English:'It can be left blank. It indicates whether an assessment counts more or less towards the average. If all weightings are blank, the average is arithmetic; if any percentage is entered, the weighted average is used.',Français:'Ce champ peut rester vide. Il indique si une épreuve compte plus ou moins dans la moyenne. Si toutes les pondérations sont vides, la moyenne est arithmétique ; si un pourcentage est indiqué, la moyenne pondérée est utilisée.',Polski:'Można zostawić puste. Pole wskazuje, czy dana praca liczy się bardziej lub mniej do średniej. Jeśli wszystkie wagi są puste, średnia jest arytmetyczna; jeśli wpisano procent, używana jest średnia ważona.',Deutsch:'Das Feld kann leer bleiben. Es zeigt an, ob eine Leistung stärker oder schwächer in den Durchschnitt eingeht. Sind alle Gewichtungen leer, wird der arithmetische Durchschnitt berechnet; bei Prozentwerten der gewichtete Durchschnitt.',Português:'Pode ficar em branco. Serve para indicar se uma prova conta mais ou menos na média. Se todas as ponderações estiverem vazias, a média será aritmética; se alguma tiver percentagem, será usada a média ponderada.'},
    'Primera evaluación':{Galego:'Primeira avaliación',English:'First term',Français:'Première évaluation',Polski:'Pierwszy okres',Deutsch:'Erste Bewertung',Português:'Primeira avaliação'},
    'Segunda evaluación':{Galego:'Segunda avaliación',English:'Second term',Français:'Deuxième évaluation',Polski:'Drugi okres',Deutsch:'Zweite Bewertung',Português:'Segunda avaliação'},
    'Tercera evaluación':{Galego:'Terceira avaliación',English:'Third term',Français:'Troisième évaluation',Polski:'Trzeci okres',Deutsch:'Dritte Bewertung',Português:'Terceira avaliação'},
    'Examen':{Galego:'Exame',English:'Exam',Français:'Examen',Polski:'Egzamin',Deutsch:'Prüfung',Português:'Exame'},
    'Trabajo':{Galego:'Traballo',English:'Project',Français:'Travail',Polski:'Praca',Deutsch:'Arbeit',Português:'Trabalho'},
    'Presentación':{Galego:'Presentación',English:'Presentation',Français:'Présentation',Polski:'Prezentacja',Deutsch:'Präsentation',Português:'Apresentação'},
    'Examen oral':{Galego:'Exame oral',English:'Oral exam',Français:'Examen oral',Polski:'Egzamin ustny',Deutsch:'Mündliche Prüfung',Português:'Exame oral'},
    'Todavía no hay calificaciones registradas.':{Galego:'Aínda non hai cualificacións rexistradas.',English:'There are no grades recorded yet.',Français:'Aucune note n’est encore enregistrée.',Polski:'Nie zapisano jeszcze ocen.',Deutsch:'Es sind noch keine Noten eingetragen.',Português:'Ainda não há classificações registadas.'},
    'Aún no hay medias por asignatura. Registra tu primera calificación.':{Galego:'Aínda non hai medias por materia. Rexistra a túa primeira cualificación.',English:'There are no subject averages yet. Record your first grade.',Français:'Il n’y a pas encore de moyennes par matière. Enregistre ta première note.',Polski:'Nie ma jeszcze średnich z przedmiotów. Zapisz pierwszą ocenę.',Deutsch:'Es gibt noch keine Fach-Durchschnitte. Trage deine erste Note ein.',Português:'Ainda não há médias por disciplina. Regista a tua primeira classificação.'},
    'No hay eventos este día. Puedes crear uno nuevo.':{Galego:'Non hai eventos este día. Podes crear un novo.',English:'There are no events on this day. You can create a new one.',Français:'Il n’y a aucun événement ce jour-là. Tu peux en créer un nouveau.',Polski:'Tego dnia nie ma wydarzeń. Możesz utworzyć nowe.',Deutsch:'An diesem Tag gibt es keine Termine. Du kannst einen neuen erstellen.',Português:'Não há eventos neste dia. Podes criar um novo.'},
    'Sin próximas fechas en los próximos 7 días.':{Galego:'Sen próximas datas nos vindeiros 7 días.',English:'No upcoming dates in the next 7 days.',Français:'Aucune date prévue dans les 7 prochains jours.',Polski:'Brak nadchodzących dat w ciągu najbliższych 7 dni.',Deutsch:'Keine Termine in den nächsten 7 Tagen.',Português:'Sem próximas datas nos próximos 7 dias.'},
    'Próximas fechas y días':{Galego:'Próximas datas e días',English:'Upcoming dates and days',Français:'Prochaines dates et journées',Polski:'Nadchodzące daty i dni',Deutsch:'Kommende Termine und Tage',Português:'Próximas datas e dias'},
    'Solo se muestran fechas en los próximos 7 días.':{Galego:'Só se mostran datas dos vindeiros 7 días.',English:'Only dates in the next 7 days are shown.',Français:'Seules les dates des 7 prochains jours sont affichées.',Polski:'Wyświetlane są tylko daty z najbliższych 7 dni.',Deutsch:'Es werden nur Termine der nächsten 7 Tage angezeigt.',Português:'Só são mostradas datas dos próximos 7 dias.'},
    'Fecha':{Galego:'Data',English:'Date',Français:'Date',Polski:'Data',Deutsch:'Datum',Português:'Data'},
    'Título':{Galego:'Título',English:'Title',Français:'Titre',Polski:'Tytuł',Deutsch:'Titel',Português:'Título'},
    'Descripción':{Galego:'Descrición',English:'Description',Français:'Description',Polski:'Opis',Deutsch:'Beschreibung',Português:'Descrição'},
    'Tipo':{Galego:'Tipo',English:'Type',Français:'Type',Polski:'Typ',Deutsch:'Typ',Português:'Tipo'},
    'Visibilidad':{Galego:'Visibilidade',English:'Visibility',Français:'Visibilité',Polski:'Widoczność',Deutsch:'Sichtbarkeit',Português:'Visibilidade'},
    'Solo para mí':{Galego:'Só para min',English:'Only me',Français:'Seulement pour moi',Polski:'Tylko dla mnie',Deutsch:'Nur für mich',Português:'Só para mim'},
    'Todo el alumnado':{Galego:'Todo o alumnado',English:'All students',Français:'Tous les élèves',Polski:'Wszyscy uczniowie',Deutsch:'Alle Schülerinnen und Schüler',Português:'Todo o alumnado'},
    'Centro, etapa y curso':{Galego:'Centro, etapa e curso',English:'School, stage and course',Français:'Établissement, niveau et classe',Polski:'Szkoła, etap i klasa',Deutsch:'Schule, Stufe und Kurs',Português:'Centro, etapa e curso'},
    'Alumnos concretos':{Galego:'Alumnado concreto',English:'Specific students',Français:'Élèves précis',Polski:'Wybrani uczniowie',Deutsch:'Bestimmte Lernende',Português:'Alunos concretos'},
    'Centro':{Galego:'Centro',English:'School',Français:'Établissement',Polski:'Szkoła',Deutsch:'Schule',Português:'Centro'},
    'Etapa':{Galego:'Etapa',English:'Stage',Français:'Niveau',Polski:'Etap',Deutsch:'Stufe',Português:'Etapa'},
    'Curso':{Galego:'Curso',English:'Course',Français:'Classe',Polski:'Klasa',Deutsch:'Kurs',Português:'Curso'},
    'Sin filtrar':{Galego:'Sen filtrar',English:'No filter',Français:'Sans filtre',Polski:'Bez filtra',Deutsch:'Ohne Filter',Português:'Sem filtrar'},
    'Filtrar alumnado...':{Galego:'Filtrar alumnado...',English:'Filter students...',Français:'Filtrer les élèves...',Polski:'Filtruj uczniów...',Deutsch:'Lernende filtern...',Português:'Filtrar alumnado...'},
    'Nombre, usuario, centro, etapa o curso...':{Galego:'Nome, usuario, centro, etapa ou curso...',English:'Name, username, school, stage or course...',Français:'Nom, utilisateur, établissement, niveau ou classe...',Polski:'Imię, użytkownik, szkoła, etap lub klasa...',Deutsch:'Name, Benutzername, Schule, Stufe oder Kurs...',Português:'Nome, utilizador, centro, etapa ou curso...'},
    'Buscar alumno':{Galego:'Filtrar alumnado',English:'Filter students',Français:'Filtrer les élèves',Polski:'Filtruj uczniów',Deutsch:'Lernende filtern',Português:'Filtrar alumnado'},
    'Seleccionar visibles':{Galego:'Seleccionar visibles',English:'Select visible',Français:'Sélectionner les visibles',Polski:'Zaznacz widocznych',Deutsch:'Sichtbare auswählen',Português:'Selecionar visíveis'},
    'Desmarcar todo':{Galego:'Desmarcar todo',English:'Unselect all',Français:'Tout décocher',Polski:'Odznacz wszystko',Deutsch:'Alles abwählen',Português:'Desmarcar tudo'},
    'Asignar insignia manualmente':{Galego:'Asignar insignia manualmente',English:'Assign badge manually',Français:'Attribuer un badge manuellement',Polski:'Przyznaj odznakę ręcznie',Deutsch:'Abzeichen manuell vergeben',Português:'Atribuir insígnia manualmente'},
    'Las insignias solo puede concederlas la profesora. Selecciona una insignia, busca alumnado y marca uno o varios perfiles.':{Galego:'As insignias só pode concedelas a profesora. Selecciona unha insignia, filtra alumnado e marca un ou varios perfís.',English:'Only the teacher can award badges. Select a badge, filter students and mark one or more profiles.',Français:'Seule l’enseignante peut attribuer les badges. Sélectionne un badge, filtre les élèves et coche un ou plusieurs profils.',Polski:'Odznaki może przyznawać tylko nauczycielka. Wybierz odznakę, przefiltruj uczniów i zaznacz jeden lub kilka profili.',Deutsch:'Nur die Lehrerin kann Abzeichen vergeben. Wähle ein Abzeichen, filtere die Lernenden und markiere ein oder mehrere Profile.',Português:'As insígnias só podem ser atribuídas pela professora. Seleciona uma insígnia, filtra alumnado e marca um ou vários perfis.'},
    'Se guardará en el perfil del alumnado seleccionado.':{Galego:'Gardarase no perfil do alumnado seleccionado.',English:'It will be saved in the selected students’ profiles.',Français:'Ce sera enregistré dans le profil des élèves sélectionnés.',Polski:'Zostanie zapisane w profilach wybranych uczniów.',Deutsch:'Es wird in den Profilen der ausgewählten Lernenden gespeichert.',Português:'Será guardado no perfil do alumnado selecionado.'},
    'perfiles disponibles':{Galego:'perfís dispoñibles',English:'profiles available',Français:'profils disponibles',Polski:'dostępne profile',Deutsch:'Profile verfügbar',Português:'perfis disponíveis'},
    'perfil disponible':{Galego:'perfil dispoñible',English:'profile available',Français:'profil disponible',Polski:'dostępny profil',Deutsch:'Profil verfügbar',Português:'perfil disponível'},
    'Nueva publicación':{Galego:'Nova publicación',English:'New post',Français:'Nouvelle publication',Polski:'Nowa publikacja',Deutsch:'Neue Veröffentlichung',Português:'Nova publicação'},
    'Qué vas a publicar':{Galego:'Que vas publicar',English:'What are you going to publish?',Français:'Que vas-tu publier ?',Polski:'Co chcesz opublikować?',Deutsch:'Was möchtest du veröffentlichen?',Português:'O que vais publicar'},
    'Anuncio, aviso o noticia':{Galego:'Anuncio, aviso ou noticia',English:'Announcement, notice or news',Français:'Annonce, avis ou nouvelle',Polski:'Ogłoszenie, informacja lub aktualność',Deutsch:'Ankündigung, Hinweis oder Nachricht',Português:'Anúncio, aviso ou notícia'},
    'Material de materia':{Galego:'Material de materia',English:'Subject material',Français:'Ressource de matière',Polski:'Materiał przedmiotowy',Deutsch:'Fachmaterial',Português:'Material de disciplina'},
    'Tarea o actividad':{Galego:'Tarefa ou actividade',English:'Task or activity',Français:'Tâche ou activité',Polski:'Zadanie lub aktywność',Deutsch:'Aufgabe oder Aktivität',Português:'Tarefa ou atividade'},
    'Test externo':{Galego:'Test externo',English:'External test',Français:'Test externe',Polski:'Test zewnętrzny',Deutsch:'Externer Test',Português:'Teste externo'},
    'Juego':{Galego:'Xogo',English:'Game',Français:'Jeu',Polski:'Gra',Deutsch:'Spiel',Português:'Jogo'},
    'Actividad lúdica o enlace a juego.':{Galego:'Actividade lúdica ou ligazón a un xogo.',English:'Playful activity or link to a game.',Français:'Activité ludique ou lien vers un jeu.',Polski:'Aktywność edukacyjna lub link do gry.',Deutsch:'Spielerische Aktivität oder Link zu einem Spiel.',Português:'Atividade lúdica ou ligação para jogo.'},
    'Se verá en Anuncios, dentro de una materia.':{Galego:'Verase en Anuncios, dentro dunha materia.',English:'It will appear in Announcements, within a subject.',Français:'Cela apparaîtra dans les annonces, dans une matière.',Polski:'Pojawi się w Ogłoszeniach, w ramach przedmiotu.',Deutsch:'Es erscheint in den Ankündigungen innerhalb eines Fachs.',Português:'Será visto em Anúncios, dentro de uma disciplina.'},
    'Apuntes, boletín, documento o recurso.':{Galego:'Apuntamentos, boletín, documento ou recurso.',English:'Notes, worksheet, document or resource.',Français:'Notes, fiche, document ou ressource.',Polski:'Notatki, karta pracy, dokument lub materiał.',Deutsch:'Notizen, Arbeitsblatt, Dokument oder Ressource.',Português:'Apontamentos, ficha, documento ou recurso.'},
    'Las insignias se asignan manualmente desde el panel docente.':{Galego:'As insignias asígnanse manualmente desde o panel docente.',English:'Badges are assigned manually from the teacher panel.',Français:'Les badges sont attribués manuellement depuis le panneau enseignant.',Polski:'Odznaki są przyznawane ręcznie z panelu nauczyciela.',Deutsch:'Abzeichen werden manuell über den Lehrerbereich vergeben.',Português:'As insígnias são atribuídas manualmente a partir do painel docente.'},
    'Usa el enlace para el test interactivo.':{Galego:'Usa a ligazón para o test interactivo.',English:'Use the link for the interactive test.',Français:'Utilise le lien pour le test interactif.',Polski:'Użyj linku do testu interaktywnego.',Deutsch:'Nutze den Link für den interaktiven Test.',Português:'Usa a ligação para o teste interativo.'},
    'Archivos adjuntos':{Galego:'Arquivos adxuntos',English:'Attachments',Français:'Fichiers joints',Polski:'Załączniki',Deutsch:'Anhänge',Português:'Ficheiros anexos'},
    'Imagen visible en la publicación':{Galego:'Imaxe visible na publicación',English:'Visible image in the post',Français:'Image visible dans la publication',Polski:'Widoczny obraz w publikacji',Deutsch:'Sichtbares Bild in der Veröffentlichung',Português:'Imagem visível na publicação'},
    'Documentos adjuntos PDF, Word o imágenes':{Galego:'Documentos adxuntos PDF, Word ou imaxes',English:'Attached PDF, Word or image files',Français:'Documents joints PDF, Word ou images',Polski:'Załączone pliki PDF, Word lub obrazy',Deutsch:'Angehängte PDF-, Word- oder Bilddateien',Português:'Documentos anexos PDF, Word ou imagens'},
    'Ningún archivo seleccionado.':{Galego:'Ningún arquivo seleccionado.',English:'No file selected.',Français:'Aucun fichier sélectionné.',Polski:'Nie wybrano pliku.',Deutsch:'Keine Datei ausgewählt.',Português:'Nenhum ficheiro selecionado.'},
    'Destinatarios':{Galego:'Destinatarios',English:'Recipients',Français:'Destinataires',Polski:'Odbiorcy',Deutsch:'Empfänger',Português:'Destinatários'},
    'Primero elige el alcance. Si eliges alumnos concretos, marca uno o varios perfiles.':{Galego:'Primeiro escolle o alcance. Se escolles alumnado concreto, marca un ou varios perfís.',English:'First choose the scope. If you choose specific students, select one or more profiles.',Français:'Choisis d’abord la portée. Si tu choisis des élèves précis, coche un ou plusieurs profils.',Polski:'Najpierw wybierz zakres. Jeśli wybierzesz konkretnych uczniów, zaznacz jeden lub kilka profili.',Deutsch:'Wähle zuerst den Umfang. Wenn du bestimmte Lernende auswählst, markiere ein oder mehrere Profile.',Português:'Primeiro escolhe o alcance. Se escolheres alunos concretos, marca um ou vários perfis.'},
    'Publicar ahora':{Galego:'Publicar agora',English:'Publish now',Français:'Publier maintenant',Polski:'Opublikuj teraz',Deutsch:'Jetzt veröffentlichen',Português:'Publicar agora'},
    'Estás modificando una publicación existente. Al guardar no se creará una copia duplicada.':{Galego:'Estás modificando unha publicación existente. Ao gardar non se creará unha copia duplicada.',English:'You are editing an existing post. Saving will not create a duplicate copy.',Français:'Tu modifies une publication existante. L’enregistrement ne créera pas de copie.',Polski:'Edytujesz istniejącą publikację. Zapisanie nie utworzy duplikatu.',Deutsch:'Du bearbeitest eine bestehende Veröffentlichung. Beim Speichern wird keine Kopie erstellt.',Português:'Estás a modificar uma publicação existente. Ao guardar não será criada uma cópia duplicada.'},
    'Cancelar edición':{Galego:'Cancelar edición',English:'Cancel editing',Français:'Annuler la modification',Polski:'Anuluj edycję',Deutsch:'Bearbeitung abbrechen',Português:'Cancelar edição'},
    'Abrir publicación':{Galego:'Abrir publicación',English:'Open post',Français:'Ouvrir la publication',Polski:'Otwórz publikację',Deutsch:'Veröffentlichung öffnen',Português:'Abrir publicação'},
    'Abrir enlace':{Galego:'Abrir ligazón',English:'Open link',Français:'Ouvrir le lien',Polski:'Otwórz link',Deutsch:'Link öffnen',Português:'Abrir ligação'},
    'Abrir enlace externo':{Galego:'Abrir ligazón externa',English:'Open external link',Français:'Ouvrir le lien externe',Polski:'Otwórz link zewnętrzny',Deutsch:'Externen Link öffnen',Português:'Abrir ligação externa'},
    'Marcar como hecha':{Galego:'Marcar como feita',English:'Mark as done',Français:'Marquer comme terminé',Polski:'Oznacz jako wykonane',Deutsch:'Als erledigt markieren',Português:'Marcar como feita'},
    'Hecha':{Galego:'Feita',English:'Done',Français:'Terminée',Polski:'Wykonane',Deutsch:'Erledigt',Português:'Feita'},
    'Pendiente':{Galego:'Pendente',English:'Pending',Français:'En attente',Polski:'Oczekujące',Deutsch:'Ausstehend',Português:'Pendente'},
    'Publicación marcada como hecha.':{Galego:'Publicación marcada como feita.',English:'Post marked as done.',Français:'Publication marquée comme terminée.',Polski:'Publikacja oznaczona jako wykonana.',Deutsch:'Veröffentlichung als erledigt markiert.',Português:'Publicação marcada como feita.'},
    'Publicación marcada como pendiente.':{Galego:'Publicación marcada como pendente.',English:'Post marked as pending.',Français:'Publication marquée comme en attente.',Polski:'Publikacja oznaczona jako oczekująca.',Deutsch:'Veröffentlichung als ausstehend markiert.',Português:'Publicação marcada como pendente.'},
    'Material':{Galego:'Material',English:'Material',Français:'Ressource',Polski:'Materiał',Deutsch:'Material',Português:'Material'},
    'Tarea':{Galego:'Tarefa',English:'Task',Français:'Tâche',Polski:'Zadanie',Deutsch:'Aufgabe',Português:'Tarefa'},
    'Test':{Galego:'Test',English:'Test',Français:'Test',Polski:'Test',Deutsch:'Test',Português:'Teste'},
    'Aviso':{Galego:'Aviso',English:'Notice',Français:'Avis',Polski:'Informacja',Deutsch:'Hinweis',Português:'Aviso'},
    'Noticia':{Galego:'Noticia',English:'News',Français:'Nouvelle',Polski:'Aktualność',Deutsch:'Nachricht',Português:'Notícia'},
    'Visible':{Galego:'Visible',English:'Visible',Français:'Visible',Polski:'Widoczne',Deutsch:'Sichtbar',Português:'Visível'},
    'Oculta':{Galego:'Oculta',English:'Hidden',Français:'Masquée',Polski:'Ukryte',Deutsch:'Ausgeblendet',Português:'Oculta'},
    'Oculto':{Galego:'Oculto',English:'Hidden',Français:'Masqué',Polski:'Ukryte',Deutsch:'Ausgeblendet',Português:'Oculto'},
    'Ocultar':{Galego:'Ocultar',English:'Hide',Français:'Masquer',Polski:'Ukryj',Deutsch:'Ausblenden',Português:'Ocultar'},
    'Mostrar':{Galego:'Mostrar',English:'Show',Français:'Afficher',Polski:'Pokaż',Deutsch:'Anzeigen',Português:'Mostrar'},
    'Ocultar al alumnado':{Galego:'Ocultar ao alumnado',English:'Hide from students',Français:'Masquer aux élèves',Polski:'Ukryj przed uczniami',Deutsch:'Vor Lernenden ausblenden',Português:'Ocultar ao alumnado'},
    'Mostrar al alumnado':{Galego:'Mostrar ao alumnado',English:'Show to students',Français:'Afficher aux élèves',Polski:'Pokaż uczniom',Deutsch:'Lernenden anzeigen',Português:'Mostrar ao alumnado'},
    'Publicar material':{Galego:'Publicar material',English:'Publish material',Français:'Publier une ressource',Polski:'Opublikuj materiał',Deutsch:'Material veröffentlichen',Português:'Publicar material'},
    'Crear curso o materia':{Galego:'Crear curso ou materia',English:'Create course or subject',Français:'Créer une classe ou une matière',Polski:'Utwórz klasę lub przedmiot',Deutsch:'Kurs oder Fach erstellen',Português:'Criar curso ou disciplina'},
    'Cambia etapa, curso, nombre o visibilidad. Para cursos nuevos, escribe el curso y guarda una materia.':{Galego:'Cambia etapa, curso, nome ou visibilidade. Para cursos novos, escribe o curso e garda unha materia.',English:'Change stage, course, name or visibility. For new courses, type the course and save a subject.',Français:'Modifie le niveau, la classe, le nom ou la visibilité. Pour de nouvelles classes, écris la classe et enregistre une matière.',Polski:'Zmień etap, klasę, nazwę lub widoczność. Dla nowych klas wpisz klasę i zapisz przedmiot.',Deutsch:'Ändere Stufe, Kurs, Name oder Sichtbarkeit. Für neue Kurse gib den Kurs ein und speichere ein Fach.',Português:'Altera etapa, curso, nome ou visibilidade. Para cursos novos, escreve o curso e guarda uma disciplina.'},
    'Nombre de la materia':{Galego:'Nome da materia',English:'Subject name',Français:'Nom de la matière',Polski:'Nazwa przedmiotu',Deutsch:'Fachname',Português:'Nome da disciplina'},
    'Visible para el alumnado':{Galego:'Visible para o alumnado',English:'Visible to students',Français:'Visible pour les élèves',Polski:'Widoczne dla uczniów',Deutsch:'Für Lernende sichtbar',Português:'Visível para o alumnado'},
    'Guardar materia':{Galego:'Gardar materia',English:'Save subject',Français:'Enregistrer la matière',Polski:'Zapisz przedmiot',Deutsch:'Fach speichern',Português:'Guardar disciplina'},
    'Limpiar editor':{Galego:'Limpar editor',English:'Clear editor',Français:'Effacer l’éditeur',Polski:'Wyczyść edytor',Deutsch:'Editor leeren',Português:'Limpar editor'},
    'Materias añadidas o modificadas':{Galego:'Materias engadidas ou modificadas',English:'Added or modified subjects',Français:'Matières ajoutées ou modifiées',Polski:'Dodane lub zmienione przedmioty',Deutsch:'Hinzugefügte oder geänderte Fächer',Português:'Disciplinas adicionadas ou modificadas'},
    'Todavía no hay materias personalizadas para este curso.':{Galego:'Aínda non hai materias personalizadas para este curso.',English:'There are no customised subjects for this course yet.',Français:'Il n’y a pas encore de matières personnalisées pour cette classe.',Polski:'Nie ma jeszcze przedmiotów dostosowanych do tej klasy.',Deutsch:'Für diesen Kurs gibt es noch keine angepassten Fächer.',Português:'Ainda não há disciplinas personalizadas para este curso.'},
    'Materias vistas como alumnado':{Galego:'Materias vistas como alumnado',English:'Subjects as seen by students',Français:'Matières vues comme par les élèves',Polski:'Przedmioty widoczne dla uczniów',Deutsch:'Fächer aus Schülersicht',Português:'Disciplinas vistas como alumnado'},
    'Selecciona etapa y curso para revisar materias, publicaciones y visibilidad. Las materias ocultas aparecen marcadas para que se distingan de inmediato.':{Galego:'Selecciona etapa e curso para revisar materias, publicacións e visibilidade. As materias ocultas aparecen marcadas para distinguilas de inmediato.',English:'Select stage and course to review subjects, posts and visibility. Hidden subjects are marked so they can be identified immediately.',Français:'Sélectionne le niveau et la classe pour revoir les matières, publications et visibilité. Les matières masquées sont indiquées clairement.',Polski:'Wybierz etap i klasę, aby sprawdzić przedmioty, publikacje i widoczność. Ukryte przedmioty są oznaczone, aby były od razu widoczne.',Deutsch:'Wähle Stufe und Kurs, um Fächer, Veröffentlichungen und Sichtbarkeit zu prüfen. Ausgeblendete Fächer sind deutlich markiert.',Português:'Seleciona etapa e curso para rever disciplinas, publicações e visibilidade. As disciplinas ocultas aparecem marcadas para se distinguirem de imediato.'},
    'Perfiles del alumnado':{Galego:'Perfís do alumnado',English:'Student profiles',Français:'Profils des élèves',Polski:'Profile uczniów',Deutsch:'Schülerprofile',Português:'Perfis do alumnado'},
    'Identificación':{Galego:'Identificación',English:'Identification',Français:'Identification',Polski:'Identyfikacja',Deutsch:'Identifikation',Português:'Identificação'},
    'Atención personalizada, NEAE y NEE':{Galego:'Atención personalizada, NEAE e NEE',English:'Personalised support, NEAE and SEN',Français:'Accompagnement personnalisé, besoins spécifiques et besoins éducatifs particuliers',Polski:'Wsparcie indywidualne, specjalne potrzeby i trudności edukacyjne',Deutsch:'Individuelle Unterstützung, Förderbedarf und besondere Bedürfnisse',Português:'Atenção personalizada, NEAE e NEE'},
    'Datos privados de gestión docente.':{Galego:'Datos privados de xestión docente.',English:'Private data for teacher management.',Français:'Données privées de gestion enseignante.',Polski:'Dane prywatne do zarządzania nauczycielskiego.',Deutsch:'Private Daten für die Lehrerverwaltung.',Português:'Dados privados de gestão docente.'},
    'Guardar cambios del alumno':{Galego:'Gardar cambios do alumno',English:'Save student changes',Français:'Enregistrer les modifications de l’élève',Polski:'Zapisz zmiany ucznia',Deutsch:'Änderungen am Schülerprofil speichern',Português:'Guardar alterações do aluno'},
    'Mi perfil':{Galego:'O meu perfil',English:'My profile',Français:'Mon profil',Polski:'Mój profil',Deutsch:'Mein Profil',Português:'O meu perfil'},
    'Cambiar icono de perfil':{Galego:'Cambiar icona de perfil',English:'Change profile icon',Français:'Changer l’icône du profil',Polski:'Zmień ikonę profilu',Deutsch:'Profilsymbol ändern',Português:'Alterar ícone de perfil'},
    'Elige uno de los iconos disponibles para que sea tu nueva imagen de perfil.':{Galego:'Elixe un dos iconos dispoñibles para que sexa a túa nova imaxe de perfil.',English:'Choose one of the available icons to use as your new profile image.',Français:'Choisis l’une des icônes disponibles comme nouvelle image de profil.',Polski:'Wybierz jedną z dostępnych ikon jako nowy obraz profilu.',Deutsch:'Wähle eines der verfügbaren Symbole als neues Profilbild.',Português:'Escolhe um dos ícones disponíveis para ser a tua nova imagem de perfil.'},
    'Guardar icono':{Galego:'Gardar icona',English:'Save icon',Français:'Enregistrer l’icône',Polski:'Zapisz ikonę',Deutsch:'Symbol speichern',Português:'Guardar ícone'},
    'Notificaciones por email':{Galego:'Notificacións por email',English:'Email notifications',Français:'Notifications par email',Polski:'Powiadomienia e-mail',Deutsch:'E-Mail-Benachrichtigungen',Português:'Notificações por email'},
    'Indica un correo personal y marca qué avisos quieres recibir.':{Galego:'Indica un correo persoal e marca que avisos queres recibir.',English:'Enter a personal email and choose which notices you want to receive.',Français:'Indique une adresse personnelle et choisis les avis que tu veux recevoir.',Polski:'Wpisz prywatny e-mail i zaznacz, jakie powiadomienia chcesz otrzymywać.',Deutsch:'Gib eine persönliche E-Mail-Adresse ein und wähle aus, welche Hinweise du erhalten möchtest.',Português:'Indica um email pessoal e assinala os avisos que queres receber.'},
    'Email personal':{Galego:'Email persoal',English:'Personal email',Français:'Email personnel',Polski:'E-mail prywatny',Deutsch:'Persönliche E-Mail',Português:'Email pessoal'},
    'Guardar notificaciones':{Galego:'Gardar notificacións',English:'Save notifications',Français:'Enregistrer les notifications',Polski:'Zapisz powiadomienia',Deutsch:'Benachrichtigungen speichern',Português:'Guardar notificações'},
    'Modificar contraseña':{Galego:'Modificar contrasinal',English:'Change password',Français:'Modifier le mot de passe',Polski:'Zmień hasło',Deutsch:'Passwort ändern',Português:'Modificar palavra-passe'},
    'Cambia tu contraseña de acceso o solicita recuperación si no recuerdas la actual.':{Galego:'Cambia o teu contrasinal de acceso ou solicita recuperación se non lembras o actual.',English:'Change your access password or request recovery if you do not remember the current one.',Français:'Modifie ton mot de passe ou demande une récupération si tu ne te souviens pas de l’actuel.',Polski:'Zmień hasło dostępu albo poproś o odzyskanie, jeśli nie pamiętasz obecnego.',Deutsch:'Ändere dein Zugangspasswort oder beantrage Wiederherstellung, wenn du das aktuelle nicht kennst.',Português:'Altera a tua palavra-passe de acesso ou solicita recuperação se não te lembras da atual.'},
    'Nueva contraseña':{Galego:'Novo contrasinal',English:'New password',Français:'Nouveau mot de passe',Polski:'Nowe hasło',Deutsch:'Neues Passwort',Português:'Nova palavra-passe'},
    'Repetir contraseña':{Galego:'Repetir contrasinal',English:'Repeat password',Français:'Répéter le mot de passe',Polski:'Powtórz hasło',Deutsch:'Passwort wiederholen',Português:'Repetir palavra-passe'},
    'Solicitar recuperación de contraseña':{Galego:'Solicitar recuperación de contrasinal',English:'Request password recovery',Français:'Demander la récupération du mot de passe',Polski:'Poproś o odzyskanie hasła',Deutsch:'Passwortwiederherstellung beantragen',Português:'Solicitar recuperação da palavra-passe'},
    'Datos académicos':{Galego:'Datos académicos',English:'Academic data',Français:'Données scolaires',Polski:'Dane edukacyjne',Deutsch:'Schuldaten',Português:'Dados académicos'},
    'Estos datos solo puede modificarlos la profesora.':{Galego:'Estes datos só pode modificalos a profesora.',English:'Only the teacher can modify these data.',Français:'Seule l’enseignante peut modifier ces données.',Polski:'Te dane może zmienić tylko nauczycielka.',Deutsch:'Diese Daten kann nur die Lehrerin ändern.',Português:'Estes dados só podem ser modificados pela professora.'},
    'Bandeja de entrada':{Galego:'Bandexa de entrada',English:'Inbox',Français:'Boîte de réception',Polski:'Skrzynka odbiorcza',Deutsch:'Posteingang',Português:'Caixa de entrada'},
    'Recibidos':{Galego:'Recibidos',English:'Received',Français:'Reçus',Polski:'Odebrane',Deutsch:'Empfangen',Português:'Recebidos'},
    'Enviados':{Galego:'Enviados',English:'Sent',Français:'Envoyés',Polski:'Wysłane',Deutsch:'Gesendet',Português:'Enviados'},
    'Archivados':{Galego:'Arquivados',English:'Archived',Français:'Archivés',Polski:'Zarchiwizowane',Deutsch:'Archiviert',Português:'Arquivados'},
    'Marcar como leído':{Galego:'Marcar como lido',English:'Mark as read',Français:'Marquer comme lu',Polski:'Oznacz jako przeczytane',Deutsch:'Als gelesen markieren',Português:'Marcar como lido'},
    'Responder':{Galego:'Responder',English:'Reply',Français:'Répondre',Polski:'Odpowiedz',Deutsch:'Antworten',Português:'Responder'},
    'Archivar':{Galego:'Arquivar',English:'Archive',Français:'Archiver',Polski:'Archiwizuj',Deutsch:'Archivieren',Português:'Arquivar'},
    'Eliminar':{Galego:'Eliminar',English:'Delete',Français:'Supprimer',Polski:'Usuń',Deutsch:'Löschen',Português:'Eliminar'},
    'Enviar mensaje':{Galego:'Enviar mensaxe',English:'Send message',Français:'Envoyer un message',Polski:'Wyślij wiadomość',Deutsch:'Nachricht senden',Português:'Enviar mensagem'},
    'Asunto':{Galego:'Asunto',English:'Subject',Français:'Objet',Polski:'Temat',Deutsch:'Betreff',Português:'Assunto'},
    'Mensaje':{Galego:'Mensaxe',English:'Message',Français:'Message',Polski:'Wiadomość',Deutsch:'Nachricht',Português:'Mensagem'},
    'Enviar':{Galego:'Enviar',English:'Send',Français:'Envoyer',Polski:'Wyślij',Deutsch:'Senden',Português:'Enviar'},
    'Todavía no hay anuncios publicados.':{Galego:'Aínda non hai anuncios publicados.',English:'There are no announcements yet.',Français:'Il n’y a pas encore d’annonces.',Polski:'Nie ma jeszcze ogłoszeń.',Deutsch:'Es gibt noch keine Ankündigungen.',Português:'Ainda não há anúncios publicados.'},
    'Día de la Enseñanza':{Galego:'Día do Ensino',English:'Education Day',Français:'Journée de l’enseignement',Polski:'Dzień Edukacji',Deutsch:'Tag der Bildung',Português:'Dia do Ensino'},
    'Día no lectivo':{Galego:'Día non lectivo',English:'Non-teaching day',Français:'Jour non scolaire',Polski:'Dzień wolny od zajęć',Deutsch:'Unterrichtsfreier Tag',Português:'Dia não letivo'},
    'Día no lectivo.':{Galego:'Día non lectivo.',English:'Non-teaching day.',Français:'Jour non scolaire.',Polski:'Dzień wolny od zajęć.',Deutsch:'Unterrichtsfreier Tag.',Português:'Dia não letivo.'},
    'Tribeca Academia no abre este día.':{Galego:'Tribeca Academia non abre este día.',English:'Tribeca Academia is closed on this day.',Français:'Tribeca Academia est fermée ce jour-là.',Polski:'Tribeca Academia jest tego dnia zamknięta.',Deutsch:'Tribeca Academia ist an diesem Tag geschlossen.',Português:'A Tribeca Academia não abre neste dia.'},
    'Tribeca Academia no abre este día':{Galego:'Tribeca Academia non abre este día',English:'Tribeca Academia is closed on this day',Français:'Tribeca Academia est fermée ce jour-là',Polski:'Tribeca Academia jest tego dnia zamknięta',Deutsch:'Tribeca Academia ist an diesem Tag geschlossen',Português:'A Tribeca Academia não abre neste dia'},
    'Fecha relevante del calendario escolar.':{Galego:'Data relevante do calendario escolar.',English:'Relevant school calendar date.',Français:'Date importante du calendrier scolaire.',Polski:'Ważna data w kalendarzu szkolnym.',Deutsch:'Wichtiger Termin im Schulkalender.',Português:'Data relevante do calendário escolar.'},
    'Festivo local del centro educativo.':{Galego:'Festivo local do centro educativo.',English:'Local holiday for the school.',Français:'Jour férié local de l’établissement.',Polski:'Lokalne święto szkoły.',Deutsch:'Lokaler Feiertag der Schule.',Português:'Feriado local do centro educativo.'},
    'Período no lectivo.':{Galego:'Período non lectivo.',English:'Non-teaching period.',Français:'Période non scolaire.',Polski:'Okres bez zajęć.',Deutsch:'Unterrichtsfreie Zeit.',Português:'Período não letivo.'},
    'Período no lectivo propuesto.':{Galego:'Período non lectivo proposto.',English:'Proposed non-teaching period.',Français:'Période non scolaire proposée.',Polski:'Proponowany okres bez zajęć.',Deutsch:'Vorgeschlagene unterrichtsfreie Zeit.',Português:'Período não letivo proposto.'},
    'Inicio general de actividades lectivas en Galicia.':{Galego:'Inicio xeral das actividades lectivas en Galicia.',English:'General start of teaching activities in Galicia.',Français:'Début général des activités scolaires en Galice.',Polski:'Ogólny początek zajęć szkolnych w Galicji.',Deutsch:'Allgemeiner Beginn des Unterrichts in Galicien.',Português:'Início geral das atividades letivas na Galiza.'},
    'Finalización general de actividades lectivas en Galicia.':{Galego:'Finalización xeral das actividades lectivas en Galicia.',English:'General end of teaching activities in Galicia.',Français:'Fin générale des activités scolaires en Galice.',Polski:'Ogólne zakończenie zajęć szkolnych w Galicji.',Deutsch:'Allgemeines Ende des Unterrichts in Galicien.',Português:'Finalização geral das atividades letivas na Galiza.'},
    'Inicio de actividades lectivas 2025/26':{Galego:'Inicio das actividades lectivas 2025/26',English:'Start of teaching activities 2025/26',Français:'Début des activités scolaires 2025/26',Polski:'Początek zajęć szkolnych 2025/26',Deutsch:'Unterrichtsbeginn 2025/26',Português:'Início das atividades letivas 2025/26'},
    'Fin de actividades lectivas 2025/26':{Galego:'Fin das actividades lectivas 2025/26',English:'End of teaching activities 2025/26',Français:'Fin des activités scolaires 2025/26',Polski:'Koniec zajęć szkolnych 2025/26',Deutsch:'Unterrichtsende 2025/26',Português:'Fim das atividades letivas 2025/26'},
    'Inicio de actividades lectivas 2026/27':{Galego:'Inicio das actividades lectivas 2026/27',English:'Start of teaching activities 2026/27',Français:'Début des activités scolaires 2026/27',Polski:'Początek zajęć szkolnych 2026/27',Deutsch:'Unterrichtsbeginn 2026/27',Português:'Início das atividades letivas 2026/27'},
    'Fin de actividades lectivas 2026/27':{Galego:'Fin das actividades lectivas 2026/27',English:'End of teaching activities 2026/27',Français:'Fin des activités scolaires 2026/27',Polski:'Koniec zajęć szkolnych 2026/27',Deutsch:'Unterrichtsende 2026/27',Português:'Fim das atividades letivas 2026/27'},
    'Año Nuevo':{Galego:'Aninovo',English:'New Year’s Day',Français:'Jour de l’An',Polski:'Nowy Rok',Deutsch:'Neujahr',Português:'Ano Novo'},
    'Epifanía del Señor, Reyes':{Galego:'Epifanía do Señor, Reis',English:'Epiphany',Français:'Épiphanie',Polski:'Święto Trzech Króli',Deutsch:'Heilige Drei Könige',Português:'Epifania do Senhor, Reis'},
    'San José':{Galego:'San Xosé',English:'Saint Joseph’s Day',Français:'Saint Joseph',Polski:'Świętego Józefa',Deutsch:'Josefstag',Português:'São José'},
    'Jueves Santo':{Galego:'Xoves Santo',English:'Maundy Thursday',Français:'Jeudi saint',Polski:'Wielki Czwartek',Deutsch:'Gründonnerstag',Português:'Quinta-feira Santa'},
    'Viernes Santo':{Galego:'Venres Santo',English:'Good Friday',Français:'Vendredi saint',Polski:'Wielki Piątek',Deutsch:'Karfreitag',Português:'Sexta-feira Santa'},
    'Fiesta del Trabajo':{Galego:'Festa do Traballo',English:'Labour Day',Français:'Fête du Travail',Polski:'Święto Pracy',Deutsch:'Tag der Arbeit',Português:'Festa do Trabalho'},
    'San Juan':{Galego:'San Xoán',English:'Saint John’s Day',Français:'Saint Jean',Polski:'Świętego Jana',Deutsch:'Johannistag',Português:'São João'},
    'Día Nacional de Galicia':{Galego:'Día Nacional de Galicia',English:'Galicia National Day',Français:'Fête nationale de la Galice',Polski:'Narodowy Dzień Galicji',Deutsch:'Nationalfeiertag Galiciens',Português:'Dia Nacional da Galiza'},
    'Asunción de la Virgen':{Galego:'Asunción da Virxe',English:'Assumption of Mary',Français:'Assomption',Polski:'Wniebowzięcie Najświętszej Maryi Panny',Deutsch:'Mariä Himmelfahrt',Português:'Assunção da Virgem'},
    'Fiesta Nacional de España':{Galego:'Festa Nacional de España',English:'National Day of Spain',Français:'Fête nationale de l’Espagne',Polski:'Święto Narodowe Hiszpanii',Deutsch:'Spanischer Nationalfeiertag',Português:'Festa Nacional de Espanha'},
    'Inmaculada Concepción':{Galego:'Inmaculada Concepción',English:'Immaculate Conception',Français:'Immaculée Conception',Polski:'Niepokalane Poczęcie',Deutsch:'Unbefleckte Empfängnis',Português:'Imaculada Conceição'},
    'Natividad del Señor':{Galego:'Natividade do Señor',English:'Christmas Day',Français:'Nativité du Seigneur',Polski:'Boże Narodzenie',Deutsch:'Weihnachten',Português:'Natividade do Senhor'},
    'Vacaciones de Navidad, inicio':{Galego:'Vacacións de Nadal, inicio',English:'Christmas holidays, start',Français:'Vacances de Noël, début',Polski:'Ferie świąteczne, początek',Deutsch:'Weihnachtsferien, Beginn',Português:'Férias de Natal, início'},
    'Vacaciones de Navidad, fin':{Galego:'Vacacións de Nadal, fin',English:'Christmas holidays, end',Français:'Vacances de Noël, fin',Polski:'Ferie świąteczne, koniec',Deutsch:'Weihnachtsferien, Ende',Português:'Férias de Natal, fim'},
    'Entroido/Carnaval, inicio':{Galego:'Entroido/Carnaval, inicio',English:'Carnival, start',Français:'Carnaval, début',Polski:'Karnawał, początek',Deutsch:'Karneval, Beginn',Português:'Entrudo/Carnaval, início'},
    'Entroido/Carnaval, fin':{Galego:'Entroido/Carnaval, fin',English:'Carnival, end',Français:'Carnaval, fin',Polski:'Karnawał, koniec',Deutsch:'Karneval, Ende',Português:'Entrudo/Carnaval, fim'},
    'Semana Santa, inicio':{Galego:'Semana Santa, inicio',English:'Holy Week, start',Français:'Semaine sainte, début',Polski:'Wielki Tydzień, początek',Deutsch:'Karwoche, Beginn',Português:'Semana Santa, início'},
    'Semana Santa, fin':{Galego:'Semana Santa, fin',English:'Holy Week, end',Français:'Semaine sainte, fin',Polski:'Wielki Tydzień, koniec',Deutsch:'Karwoche, Ende',Português:'Semana Santa, fim'},
    'Lunes de Pascua, Cee':{Galego:'Luns de Pascua, Cee',English:'Easter Monday, Cee',Français:'Lundi de Pâques, Cee',Polski:'Poniedziałek Wielkanocny, Cee',Deutsch:'Ostermontag, Cee',Português:'Segunda-feira de Páscoa, Cee'},
    'San Adrián, Cee':{Galego:'San Adrián, Cee',English:'Saint Adrian, Cee',Français:'Saint Adrien, Cee',Polski:'Święty Adrian, Cee',Deutsch:'Sankt Adrian, Cee',Português:'São Adrião, Cee'},
    'San Pedro, Corcubión':{Galego:'San Pedro, Corcubión',English:'Saint Peter, Corcubión',Français:'Saint Pierre, Corcubión',Polski:'Święty Piotr, Corcubión',Deutsch:'Sankt Peter, Corcubión',Português:'São Pedro, Corcubión'},
    'Fiesta del Carmen, Corcubión':{Galego:'Festa do Carme, Corcubión',English:'Our Lady of Carmen, Corcubión',Français:'Fête du Carmen, Corcubión',Polski:'Święto Carmen, Corcubión',Deutsch:'Fest der Virgen del Carmen, Corcubión',Português:'Festa do Carmo, Corcubión'},
    'Fiesta local de Fisterra':{Galego:'Festa local de Fisterra',English:'Local holiday in Fisterra',Français:'Fête locale de Fisterra',Polski:'Lokalne święto Fisterry',Deutsch:'Lokaler Feiertag in Fisterra',Português:'Festa local de Fisterra'},
    'Detrás de Tribeca':{Galego:'Detrás de Tribeca',English:'Behind Tribeca',Français:'Derrière Tribeca',Polski:'Za Tribecą',Deutsch:'Hinter Tribeca',Português:'Por trás da Tribeca'},
    'Patricia Trillo, una mirada pedagógica, creativa e innovadora':{Galego:'Patricia Trillo, unha mirada pedagóxica, creativa e innovadora',English:'Patricia Trillo, a creative and innovative pedagogical outlook',Français:'Patricia Trillo, un regard pédagogique, créatif et innovant',Polski:'Patricia Trillo, pedagogiczne, kreatywne i innowacyjne spojrzenie',Deutsch:'Patricia Trillo, ein pädagogischer, kreativer und innovativer Blick',Português:'Patricia Trillo, um olhar pedagógico, criativo e inovador'},
    'Tribeca Academia nace del impulso profesional de Patricia Trillo, pedagoga y fundadora del proyecto. Con quince años de experiencia en enseñanza, refuerzo educativo y acompañamiento académico, Patricia ha trabajado con alumnado de distintas edades, etapas y perfiles, siempre desde una premisa clara: cada persona aprende de una forma singular y necesita una respuesta educativa ajustada, humana y rigurosa.':{Galego:'Tribeca Academia nace do impulso profesional de Patricia Trillo, pedagoga e fundadora do proxecto. Con quince anos de experiencia en ensino, reforzo educativo e acompañamento académico, Patricia traballou con alumnado de distintas idades, etapas e perfís, sempre desde unha premisa clara: cada persoa aprende dunha maneira singular e precisa unha resposta educativa axustada, humana e rigorosa.',English:'Tribeca Academia grew from the professional drive of Patricia Trillo, pedagogue and founder of the project. With fifteen years of experience in teaching, educational support and academic guidance, Patricia has worked with learners of different ages, stages and profiles, always from one clear premise: each person learns in a singular way and needs an educational response that is precise, humane and rigorous.',Français:'Tribeca Academia naît de l’élan professionnel de Patricia Trillo, pédagogue et fondatrice du projet. Forte de quinze ans d’expérience dans l’enseignement, le soutien éducatif et l’accompagnement scolaire, Patricia a travaillé avec des élèves d’âges, de niveaux et de profils différents, toujours à partir d’une idée claire : chaque personne apprend d’une manière singulière et a besoin d’une réponse éducative ajustée, humaine et rigoureuse.',Polski:'Tribeca Academia powstała z zawodowej inicjatywy Patricii Trillo, pedagoga i założycielki projektu. Mając piętnaście lat doświadczenia w nauczaniu, wsparciu edukacyjnym i towarzyszeniu w nauce, Patricia pracowała z uczniami w różnym wieku, na różnych etapach i o różnych profilach, wychodząc z jasnego założenia: każda osoba uczy się w sposób szczególny i potrzebuje odpowiedzi edukacyjnej dopasowanej, ludzkiej i rzetelnej.',Deutsch:'Tribeca Academia entstand aus dem beruflichen Antrieb von Patricia Trillo, Pädagogin und Gründerin des Projekts. Mit fünfzehn Jahren Erfahrung in Unterricht, Bildungsförderung und schulischer Begleitung hat Patricia mit Lernenden unterschiedlichen Alters, verschiedener Stufen und Profile gearbeitet, stets ausgehend von einer klaren Prämisse: Jeder Mensch lernt auf eigene Weise und braucht eine passgenaue, menschliche und sorgfältige pädagogische Antwort.',Português:'A Tribeca Academia nasce do impulso profissional de Patricia Trillo, pedagoga e fundadora do projeto. Com quinze anos de experiência em ensino, reforço educativo e acompanhamento académico, Patricia trabalhou com alumnado de diferentes idades, etapas e perfis, sempre a partir de uma premissa clara: cada pessoa aprende de forma singular e precisa de uma resposta educativa ajustada, humana e rigorosa.'},
    'El proyecto comenzó cuando, con veintiún años, fundó Tribeca Academia para ofrecer apoyo educativo a alumnado de Primaria y ESO. Desde entonces, la academia ha crecido hasta convertirse en un espacio de aprendizaje cercano, exigente y creativo, orientado a acompañar trayectorias académicas diversas y a transformar las dificultades en oportunidades reales de mejora.':{Galego:'O proxecto comezou cando, con vinte e un anos, fundou Tribeca Academia para ofrecer apoio educativo a alumnado de Primaria e ESO. Desde entón, a academia medrou ata converterse nun espazo de aprendizaxe próximo, esixente e creativo, orientado a acompañar traxectorias académicas diversas e a transformar as dificultades en oportunidades reais de mellora.',English:'The project began when, at the age of twenty-one, she founded Tribeca Academia to provide educational support for Primary and Secondary students. Since then, the academy has grown into a close, demanding and creative learning space, focused on accompanying diverse academic journeys and transforming difficulties into real opportunities for improvement.',Français:'Le projet a commencé lorsqu’à vingt et un ans, elle a fondé Tribeca Academia pour offrir un soutien éducatif aux élèves du primaire et du secondaire. Depuis, l’académie est devenue un espace d’apprentissage proche, exigeant et créatif, destiné à accompagner des parcours scolaires divers et à transformer les difficultés en véritables occasions de progrès.',Polski:'Projekt rozpoczął się, gdy w wieku dwudziestu jeden lat założyła Tribeca Academia, aby oferować wsparcie edukacyjne uczniom szkoły podstawowej i średniej. Od tego czasu akademia rozwinęła się w bliską, wymagającą i kreatywną przestrzeń nauki, której celem jest towarzyszenie różnym ścieżkom edukacyjnym i przekształcanie trudności w realne możliwości rozwoju.',Deutsch:'Das Projekt begann, als sie mit einundzwanzig Jahren Tribeca Academia gründete, um Schülerinnen und Schülern der Primar- und Sekundarstufe Bildungsunterstützung anzubieten. Seitdem ist die Akademie zu einem nahbaren, anspruchsvollen und kreativen Lernraum gewachsen, der vielfältige Bildungswege begleitet und Schwierigkeiten in echte Verbesserungsmöglichkeiten verwandelt.',Português:'O projeto começou quando, aos vinte e um anos, fundou a Tribeca Academia para oferecer apoio educativo ao alumnado de Primária e ESO. Desde então, a academia cresceu até se tornar um espaço de aprendizagem próximo, exigente e criativo, orientado para acompanhar trajetórias académicas diversas e transformar dificuldades em oportunidades reais de melhoria.'},
    'Su forma de entender la educación combina experiencia, curiosidad e innovación pedagógica. Esa búsqueda constante de mejora sostiene la identidad del proyecto: enseñar con rigor, acompañar con sensibilidad y crear soluciones educativas que tengan sentido para el alumnado de hoy.':{Galego:'A súa forma de entender a educación combina experiencia, curiosidade e innovación pedagóxica. Esa procura constante de mellora sostén a identidade do proxecto: ensinar con rigor, acompañar con sensibilidade e crear solucións educativas con sentido para o alumnado de hoxe.',English:'Her way of understanding education combines experience, curiosity and pedagogical innovation. This constant search for improvement sustains the identity of the project: teaching with rigour, accompanying with sensitivity and creating educational solutions that make sense for today’s learners.',Français:'Sa manière de comprendre l’éducation combine expérience, curiosité et innovation pédagogique. Cette recherche constante d’amélioration fonde l’identité du projet : enseigner avec rigueur, accompagner avec sensibilité et créer des solutions éducatives qui aient du sens pour les élèves d’aujourd’hui.',Polski:'Jej sposób rozumienia edukacji łączy doświadczenie, ciekawość i innowację pedagogiczną. To ciągłe dążenie do poprawy stanowi podstawę tożsamości projektu: uczyć rzetelnie, towarzyszyć z wrażliwością i tworzyć rozwiązania edukacyjne, które mają sens dla dzisiejszych uczniów.',Deutsch:'Ihr Bildungsverständnis verbindet Erfahrung, Neugier und pädagogische Innovation. Diese ständige Suche nach Verbesserung trägt die Identität des Projekts: sorgfältig unterrichten, sensibel begleiten und pädagogische Lösungen schaffen, die für die Lernenden von heute sinnvoll sind.',Português:'A sua forma de entender a educação combina experiência, curiosidade e inovação pedagógica. Essa procura constante de melhoria sustenta a identidade do projeto: ensinar com rigor, acompanhar com sensibilidade e criar soluções educativas que façam sentido para o alumnado de hoje.'},
    'Acceso seguro':{Galego:'Acceso seguro',English:'Secure access',Français:'Accès sécurisé',Polski:'Bezpieczny dostęp',Deutsch:'Sicherer Zugang',Português:'Acesso seguro'},
    'Acceso a Tribeca Aula':{Galego:'Acceso a Tribeca Aula',English:'Access to Tribeca Aula',Français:'Accès à Tribeca Aula',Polski:'Dostęp do Tribeca Aula',Deutsch:'Zugang zu Tribeca Aula',Português:'Acesso à Tribeca Aula'},
    'Introduce tu nombre de usuario y contraseña.':{Galego:'Introduce o teu nome de usuario e contrasinal.',English:'Enter your username and password.',Français:'Saisis ton nom d’utilisateur et ton mot de passe.',Polski:'Wpisz nazwę użytkownika i hasło.',Deutsch:'Gib deinen Benutzernamen und dein Passwort ein.',Português:'Introduz o teu nome de utilizador e palavra-passe.'},
    'Usuario':{Galego:'Usuario',English:'Username',Français:'Utilisateur',Polski:'Użytkownik',Deutsch:'Benutzername',Português:'Utilizador'},
    'Contraseña':{Galego:'Contrasinal',English:'Password',Français:'Mot de passe',Polski:'Hasło',Deutsch:'Passwort',Português:'Palavra-passe'},
    'Entrar':{Galego:'Entrar',English:'Log in',Français:'Entrer',Polski:'Zaloguj',Deutsch:'Anmelden',Português:'Entrar'},
    'No recuerdo mi contraseña':{Galego:'Non lembro o meu contrasinal',English:'I do not remember my password',Français:'Je ne me souviens pas de mon mot de passe',Polski:'Nie pamiętam hasła',Deutsch:'Ich habe mein Passwort vergessen',Português:'Não me lembro da minha palavra-passe'},
    'Recuperar contraseña':{Galego:'Recuperar contrasinal',English:'Recover password',Français:'Récupérer le mot de passe',Polski:'Odzyskaj hasło',Deutsch:'Passwort wiederherstellen',Português:'Recuperar palavra-passe'},
    'La profesora recibirá la solicitud y restablecerá la contraseña manualmente.':{Galego:'A profesora recibirá a solicitude e restablecerá o contrasinal manualmente.',English:'The teacher will receive the request and reset the password manually.',Français:'L’enseignante recevra la demande et réinitialisera le mot de passe manuellement.',Polski:'Nauczycielka otrzyma prośbę i ręcznie zresetuje hasło.',Deutsch:'Die Lehrerin erhält die Anfrage und setzt das Passwort manuell zurück.',Português:'A professora receberá o pedido e reporá a palavra-passe manualmente.'},
    'Nombre y apellidos':{Galego:'Nome e apelidos',English:'Full name',Français:'Nom et prénom',Polski:'Imię i nazwisko',Deutsch:'Vor- und Nachname',Português:'Nome e apelidos'},
    'Solicitar recuperación':{Galego:'Solicitar recuperación',English:'Request recovery',Français:'Demander la récupération',Polski:'Poproś o odzyskanie',Deutsch:'Wiederherstellung beantragen',Português:'Solicitar recuperação'},
    'Volver al inicio de sesión':{Galego:'Volver ao inicio de sesión',English:'Return to login',Français:'Revenir à la connexion',Polski:'Wróć do logowania',Deutsch:'Zur Anmeldung zurück',Português:'Voltar ao início de sessão'},
    'Sesión iniciada.':{Galego:'Sesión iniciada.',English:'Session started.',Français:'Session ouverte.',Polski:'Sesja rozpoczęta.',Deutsch:'Sitzung gestartet.',Português:'Sessão iniciada.'},
    'Nombre de usuario o contraseña incorrectos.':{Galego:'Nome de usuario ou contrasinal incorrectos.',English:'Incorrect username or password.',Français:'Nom d’utilisateur ou mot de passe incorrect.',Polski:'Nieprawidłowa nazwa użytkownika lub hasło.',Deutsch:'Benutzername oder Passwort falsch.',Português:'Nome de utilizador ou palavra-passe incorretos.'},
    'Supabase aún no está configurado. Revisa supabase-config.js.':{Galego:'Supabase aínda non está configurado. Revisa supabase-config.js.',English:'Supabase is not configured yet. Check supabase-config.js.',Français:'Supabase n’est pas encore configuré. Vérifie supabase-config.js.',Polski:'Supabase nie jest jeszcze skonfigurowany. Sprawdź supabase-config.js.',Deutsch:'Supabase ist noch nicht konfiguriert. Prüfe supabase-config.js.',Português:'O Supabase ainda não está configurado. Revê supabase-config.js.'}
  };
  Object.assign(BASE_TRANSLATIONS, EXTRA_TRANSLATIONS);
  const LANG_META = {
    es:{label:'Castellano', html:'es'}, gl:{label:'Galego', html:'gl'}, en:{label:'English', html:'en'}, fr:{label:'Français', html:'fr'}, pl:{label:'Polski', html:'pl'}, de:{label:'Deutsch', html:'de'}, pt:{label:'Português', html:'pt'}
  };
  const LABEL_TO_CODE = Object.fromEntries(Object.entries(LANG_META).map(([code,meta]) => [meta.label, code]));
  const textSource = new WeakMap();
  let translationLookup = null;
  const normalizeI18n = value => String(value ?? '').replace(/\s+/g,' ').trim();
  function buildTranslationLookup(){
    if(translationLookup) return translationLookup;
    translationLookup = new Map();
    Object.entries(BASE_TRANSLATIONS).forEach(([source,row]) => {
      const pack = {Castellano:source, ...(row||{})};
      Object.values(pack).forEach(value => { const key=normalizeI18n(value); if(key && !translationLookup.has(key)) translationLookup.set(key, {source, row}); });
    });
    return translationLookup;
  }
  function currentLangCode(){
    const sel = document.querySelector('#languageSelect');
    const value = sel?.value || localStorage.getItem('tribeca-language') || 'gl';
    if(LANG_META[value]) return value;
    const label = sel?.selectedOptions?.[0]?.textContent?.trim() || value;
    return LABEL_TO_CODE[label] || 'gl';
  }
  function currentLang(){ return LANG_META[currentLangCode()]?.label || 'Galego'; }
  function translateText(value, targetLabel=currentLang()){
    const raw = String(value ?? '');
    const trimmed = normalizeI18n(raw);
    if(!trimmed) return raw;
    if(targetLabel === 'Castellano') return raw;
    const found = buildTranslationLookup().get(trimmed);
    if(found?.row?.[targetLabel]) return raw.replace(raw.trim(), found.row[targetLabel]);
    let m;
    if((m = trimmed.match(/^(\d+) publicaciones · (\d+) unidades$/))){
      const pub = targetLabel==='Galego'?'publicacións':targetLabel==='English'?'posts':targetLabel==='Français'?'publications':targetLabel==='Polski'?'publikacje':targetLabel==='Deutsch'?'Veröffentlichungen':'publicações';
      const uni = targetLabel==='Galego'?'unidades':targetLabel==='English'?'units':targetLabel==='Français'?'unités':targetLabel==='Polski'?'działy':targetLabel==='Deutsch'?'Einheiten':'unidades';
      return `${m[1]} ${pub} · ${m[2]} ${uni}`;
    }
    if((m = trimmed.match(/^(\d+)\/(\d+) publicaciones hechas\.$/))){
      const txt = targetLabel==='Galego'?'publicacións feitas.':targetLabel==='English'?'posts completed.':targetLabel==='Français'?'publications terminées.':targetLabel==='Polski'?'publikacje wykonane.':targetLabel==='Deutsch'?'Veröffentlichungen erledigt.':'publicações feitas.';
      return `${m[1]}/${m[2]} ${txt}`;
    }
    if((m = trimmed.match(/^(\d+) perfiles$/))){
      return `${m[1]} ${targetLabel==='Galego'?'perfís':targetLabel==='English'?'profiles':targetLabel==='Français'?'profils':targetLabel==='Polski'?'profile':targetLabel==='Deutsch'?'Profile':'perfis'}`;
    }
    if((m = trimmed.match(/^(\d+) insignias asignadas$/))){
      return `${m[1]} ${targetLabel==='Galego'?'insignias asignadas':targetLabel==='English'?'badges assigned':targetLabel==='Français'?'badges attribués':targetLabel==='Polski'?'przyznane odznaki':targetLabel==='Deutsch'?'vergebene Abzeichen':'insígnias atribuídas'}`;
    }
    if((m = trimmed.match(/^(\d+) solicitudes de contraseña$/))){
      return `${m[1]} ${targetLabel==='Galego'?'solicitudes de contrasinal':targetLabel==='English'?'password requests':targetLabel==='Français'?'demandes de mot de passe':targetLabel==='Polski'?'prośby o hasło':targetLabel==='Deutsch'?'Passwortanfragen':'pedidos de palavra-passe'}`;
    }
    if((m = trimmed.match(/^(\d+) alertas$/))){
      return `${m[1]} ${targetLabel==='Galego'?'alertas':targetLabel==='English'?'alerts':targetLabel==='Français'?'alertes':targetLabel==='Polski'?'alerty':targetLabel==='Deutsch'?'Hinweise':'alertas'}`;
    }
    return raw;
  }
  function ensureLanguageDefault(){
    const sel = document.querySelector('#languageSelect');
    if(!sel) return;
    const saved = localStorage.getItem('tribeca-language');
    const manual = localStorage.getItem('tribeca-language-user-set') === '1';
    const fallbackLang = roleTeacher() ? 'es' : 'gl';
    const next = manual && saved && LANG_META[saved] ? saved : fallbackLang;
    if(sel.value !== next) sel.value = next;
    document.documentElement.lang = LANG_META[next].html;
  }
  function applyTranslations(root=document){
    const targetLabel = currentLang();
    const targetCode = currentLangCode();
    const i18n = window.I18N || {};
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = i18n[targetCode]?.[key] || i18n.gl?.[key] || i18n.es?.[key];
      if(val) el.textContent = val;
    });
    const container = root.body || root;
    const rejectTags = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA']);
    const walker=document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {acceptNode:n=>{
      if(!n.parentElement || rejectTags.has(n.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
      const current = normalizeI18n(n.nodeValue || '');
      if(!current || current.length>650) return NodeFilter.FILTER_REJECT;
      if(!textSource.has(n)) textSource.set(n, n.nodeValue.trim());
      const source = normalizeI18n(textSource.get(n) || n.nodeValue);
      if(buildTranslationLookup().has(source) || buildTranslationLookup().has(current) || /^(\d+) publicaciones · (\d+) unidades$/.test(current) || /^(\d+)\/(\d+) publicaciones hechas\.$/.test(current) || /^(\d+) (perfiles|insignias asignadas|solicitudes de contraseña|alertas)$/.test(current)) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_REJECT;
    }});
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      const source = textSource.get(n) || n.nodeValue;
      const translated = translateText(source, targetLabel);
      if(translated !== source) n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), translated.trim());
      else {
        const translatedCurrent = translateText(n.nodeValue, targetLabel);
        if(translatedCurrent !== n.nodeValue) n.nodeValue = translatedCurrent;
      }
    });
    container.querySelectorAll?.('[placeholder],[title],[aria-label],[alt]').forEach(el => ['placeholder','title','aria-label','alt'].forEach(attr=>{
      if(el.hasAttribute(attr)){
        const originalAttr = `data-i18n-original-${attr.replace(/[^a-z]/g,'')}`;
        if(!el.hasAttribute(originalAttr)) el.setAttribute(originalAttr, el.getAttribute(attr) || '');
        const translated = translateText(el.getAttribute(originalAttr), targetLabel);
        if(translated) el.setAttribute(attr, translated);
      }
    }));
    document.documentElement.lang = LANG_META[targetCode]?.html || 'gl';
  }
  async function boot() {
    ensureLanguageDefault();
    document.body.classList.remove('is-dark','dark-mode','theme-dark');
    try { localStorage.removeItem('tribeca-theme'); localStorage.removeItem('theme'); } catch(_) {}
    document.querySelectorAll('.theme-toggle,[data-theme-toggle],#themeToggle,#themeSelect').forEach(el=>{ const wrap=el.closest('label,.select-wrap,.control-field')||el; wrap.remove(); });
    State.client = configured && window.supabase?.createClient ? window.supabase.createClient(cfg.url, cfg.anonKey, { auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true} }) : null;
    bindGlobal(); wireManagedForms(); new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{ if(n.nodeType===1){ wireManagedForms(n); applyTranslations(n); } }))).observe(document.body,{childList:true,subtree:true}); if(!State.client){ showLogin(); return; }
    try { await hydrate(true); ensureLanguageDefault(); } catch(e) { console.warn(e); }
    if(State.user && State.profile){ hideLogin(); renderApp(); handleInitialOpenRequest(); } else showLogin();
    setInterval(async()=>{ if(!State.profile) return; await updatePresence(); updateBadges(); }, 45000);
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
