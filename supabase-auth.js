/* Tribeca Aula · Revisión 35 · vista general, orientación, insignias y publicaciones
   Objetivo: retirar parches acumulados, fijar un único flujo para panel docente/alumnado
   y dejar cada herramienta con una utilidad real conectada a Supabase cuando exista tabla. */
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
    activitySince: null
  };
  window.TribecaAuth = State;
  const UndoStack = [];
  const UNDO_TTL_MS = 15 * 60 * 1000;
  function pushUndo(label, fn){ if(typeof fn==='function') { UndoStack.push({label, fn, at: Date.now()}); toast(`Cambio realizado. Puedes deshacerlo durante 15 minutos: ${label}`); } }
  async function undoLast(){ const item = UndoStack.pop(); if(!item) return toast('No hay cambios recientes para deshacer.'); if(Date.now() - item.at > UNDO_TTL_MS) return toast('El plazo para deshacer este cambio ha caducado.'); try{ await item.fn(); await loadData(true); renderApp(); rerender(); toast(`Cambio deshecho: ${item.label}`); }catch(e){ console.error(e); toast(e.message || 'No se pudo deshacer el último cambio.'); } }
  window.TribecaUndoLastAction = undoLast;

  const icon100 = ['💡','📚','🧠','⭐','🌟','✨','🔥','🌈','☀️','🌙','⚡','🎯','🏆','🥇','🎓','🖊️','✏️','📝','📐','🔬','🧪','🧬','🌍','🗺️','🏛️','🎨','🎭','🎵','🎧','🎮','🧩','♟️','🦉','🐝','🦋','🐢','🐬','🦊','🐱','🐶','🐼','🐧','🐸','🦁','🐯','🐴','🐳','🦄','🍀','🌻','🌸','🌿','🍄','🍎','🍓','🍉','🍍','🍕','🥐','⚽','🏀','🏐','🎾','🚀','🛸','✈️','🚲','🏖️','🏔️','🏰','💎','🔔','🧭','🪄','🛡️','📣','🪐','☕','🧋','🎁','🧸','🪁','🎈','🎀','🧵','🪡','📌','📎','🗂️','📖','🔖','🧮','🪴','🌊','⛰️','🌅','🌌','🦜','🦖','🐙','🦭'];
  const centers = ['CEIP Praia de Quenxe','IES Fernando Blanco','IES Agra de Raíces','CPR Plurilingüe Manuela Rial Mouzo','CPR Ntra. Sra. del Carmen','CEIP Plurilingüe de Ponte do Porto','CEIP O Areal','CEIP de Camelle','IES Pedra da Aguia','CEIP do Pindo','CEIP Plurilingüe de Carnota','IES Lamas de Castelo','EEI da Pereiriña','CEIP de Brens','CEIP Plurilingüe Vila de Cee','CEIP Plurilingüe Santa Eulalia de Dumbría','CEIP Mar de Fóra','CEIP Areouta','IES Fin do Camiño','Tribeca Academia','Centro pendiente de asignar'];
  const stages = ['Infantil','Primaria','ESO','Bachillerato','FP','Adultos','Profesorado','Otros'];
  const courses = ['1.º Primaria','2.º Primaria','3.º Primaria','4.º Primaria','5.º Primaria','6.º Primaria','1.º ESO','2.º ESO','3.º ESO','3.º ESO PDC','4.º ESO','1.º Bachillerato','1.º Bachillerato Sociales','1.º Bachillerato Humanidades','2.º Bachillerato','Profesora','Otros'];
  const neeTypes = ['Discapacidad intelectual','Discapacidad auditiva','Discapacidad visual','Discapacidad motora o física','Pluridiscapacidad','Trastorno grave de conducta','Trastorno grave de la comunicación y del lenguaje','TEA / trastorno generalizado del desarrollo con necesidad de apoyos específicos','Otra NEE acreditada'];
  const neaeTypes = ['Necesidades educativas especiales','Retraso madurativo','Trastornos del desarrollo del lenguaje y la comunicación','Trastornos de atención o de aprendizaje','TDAH / TDA','Dislexia','Disortografía','Discalculia','Dificultades específicas de aprendizaje','Desconocimiento grave de la lengua de aprendizaje','Vulnerabilidad socioeducativa','Altas capacidades intelectuales','Incorporación tardía al sistema educativo','Condiciones personales o de historia escolar','Desfase curricular significativo','Necesidad de apoyo educativo temporal','Otra NEAE acreditada'];
  const healthConditions = ['Diabetes','Asma','Epilepsia','Celiaquía','Alergias','Migrañas','Enfermedad inflamatoria intestinal','Enfermedad aguda o transitoria','Recuperación posquirúrgica breve','Problema sensorial corregido','Dolor, fatiga o sueño insuficiente sin necesidad educativa acreditada','Dificultad emocional leve o reactiva','Factor familiar u organizativo no acreditado como vulnerabilidad','Otra condición que conviene conocer'];
  const badges = [
    ['sixseven','😎','67 sixseven'],['effort','💪','Esfuerzo sostenido'],['autonomy','🧭','Autonomía'],['kindness','🤝','Buen trato'],['perseverance','🌱','Constancia'],['focus','🎯','Concentración'],['careful_reading','📚','Lectura cuidadosa'],['improvement','📈','Mejora notable'],['responsibility','✅','Responsabilidad'],['curiosity','🔎','Curiosidad'],['creativity','🎨','Creatividad'],['teamwork','👥','Trabajo cooperativo'],['punctuality','⏰','Puntualidad'],['resilience','🛡️','Resiliencia'],['math_power','π','Razonamiento matemático'],['language_care','✍️','Cuidado lingüístico'],['science_mind','🔬','Mentalidad científica'],['history_eye','🏛️','Mirada histórica'],['english_star','GB','English star'],['galician_voice','🌿','Voz galega'],['exam_ready','📝','Preparación de examen'],['challenge','🧩','Desafío superado'],['golden_bulb','💡','Idea brillante'],['study_week','📆','Semana de estudio completa'],['oral_expression','🎙️','Expresión oral'],['writing_care','🖋️','Escritura cuidada'],['homework_done','📌','Tareas al día'],['good_questions','❓','Buenas preguntas']
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
    const hidden = new Set(overrides.filter(x=>x.active===false).map(x=>x.subject));
    const base = (subjectCatalog[`${stage}-${course}`] || []).filter(x=>!hidden.has(x));
    const custom = overrides.filter(x=>x.active!==false).map(x=>x.subject);
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
    const base = builtinSubjectList(p);
    const extra = (State.data.subjects || []).filter(x => x.active !== false && (!p || (x.stage===p.stage && x.course===p.course))).map(x => x.subject || x.display_name).filter(Boolean);
    return [...new Set([...base, ...extra])];
  };
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

  function loginMarkup() {
    return `<div class="auth-card t16-auth"><div class="auth-brand"><img src="assets/logo-tribeca.png" alt=""><div><strong>Tribeca Aula</strong><span>Acceso seguro</span></div></div>${!configured?`<div class="auth-warning">Supabase aún no está configurado. Revisa supabase-config.js.</div>`:''}<form id="t16LoginForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="auth-form"><h1>Acceso a Tribeca Aula</h1><p>Introduce tu nombre de usuario y contraseña.</p><label><span>Usuario</span><input name="username" placeholder="nombre_apellido" autocomplete="username" required ${configured?'':'disabled'}></label><label><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required ${configured?'':'disabled'}></label><button class="primary-btn" type="submit" ${configured?'':'disabled'}>Entrar</button><div class="form-status auth-login-status" id="loginStatus" aria-live="polite"></div><button class="link-button" type="button" data-t16-forgot>No recuerdo mi contraseña</button></form><form id="t16ResetForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="auth-form is-secondary" hidden><h2>Recuperar contraseña</h2><p>La profesora recibirá la solicitud y restablecerá la contraseña manualmente.</p><label><span>Usuario</span><input name="username" placeholder="nombre_apellido" required></label><label><span>Nombre y apellidos</span><input name="displayName" maxlength="120"></label><button class="secondary-btn" type="submit">Solicitar recuperación</button><button class="link-button" type="button" data-t16-login>Volver al inicio de sesión</button></form></div>`;
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
    updatePresence().catch(()=>{});
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
      maybe(table('subject_overrides').select('*').order('stage').order('course').order('subject'), []).then(d=>State.data.subjects=d||[])
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
    await maybe(table('user_presence').upsert({ user_id:p.id, display_name:displayName(p), role:p.role, center:p.center, stage:p.stage, course:p.course, avatar_icon:p.avatar_icon || '💡', avatar_image_url:p.avatar_image_url || null, last_seen:new Date().toISOString() }, { onConflict:'user_id' }));
  }
  async function log(action_type, title, details={}) {
    const p=State.profile; if(!p) return;
    await maybe(table('teacher_activity_log').insert({ actor_id:p.id, actor_name:displayName(p), actor_role:p.role, action_type, title, details, session_id:sessionStorage.getItem('tribeca-session-id') || (sessionStorage.setItem('tribeca-session-id', uid()), sessionStorage.getItem('tribeca-session-id')) }));
  }

  function visibleForProfile(item, p=State.profile) {
    if(!p) return false; if(roleTeacher()) return true; if(item.hidden) return false;
    const scope = item.target_scope || item.scope || 'all';
    const ids = Array.isArray(item.target_user_ids) ? item.target_user_ids : (typeof item.target_user_ids === 'string' ? JSON.parse(item.target_user_ids || '[]') : []);
    if(scope === 'all') return true;
    if(['selected','user'].includes(scope)) return ids.includes(p.id);
    if(scope === 'center') return item.center === p.center;
    if(scope === 'class') return item.center === p.center && item.stage === p.stage && item.course === p.course;
    return true;
  }
  function visibleAnnouncements() { return (State.data.announcements||[]).filter(x=>visibleForProfile(x)); }
  function visibleMaterials(subject='') { return (State.data.materials||[]).filter(x=>visibleForProfile(x) && (!subject || x.subject===subject)); }
  function relevantEvents() {
    const p=State.profile;
    const db = (State.data.events||[]).filter(e=>{
      if(roleTeacher()) return true;
      if(e.hidden && e.created_by !== p.id) return false;
      const scope=e.scope||e.target_scope||'all';
      if(e.created_by === p.id || e.user_id === p.id) return true;
      if(scope==='all') return true;
      if(scope==='center') return e.center===p.center;
      if(scope==='class') return e.center===p.center && e.stage===p.stage && e.course===p.course;
      if(['selected','user'].includes(scope)) return Array.isArray(e.target_user_ids) && e.target_user_ids.includes(p.id);
      return true;
    }).map(e=>({...e, date:e.event_date || e.date, type:e.event_type || e.type || 'personal'}));
    const official = officialEvents.filter(e=> roleTeacher() || ['national','galicia','local','school','school-proposal'].includes(e.type) || ((p?.center||'').includes('Cee') && e.type==='local-cee') || ((p?.center||'').includes('Fisterra') && e.type==='local-fisterra'));
    return [...official, ...db].filter(e=>!e.hidden || e.official || roleTeacher() || e.created_by===p?.id);
  }
  function canEditEvent(e) { const p=State.profile; if(!p || e.official) return false; if(roleTeacher()) return true; if(e.created_by === p.id) return true; if((e.scope||e.target_scope)==='class' && e.center===p.center && e.stage===p.stage && e.course===p.course) return true; return false; }

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
    if(roleTeacher()) main.innerHTML = teacherHome(); else main.innerHTML = studentHome();
    bindSubjectCards(); updateBadges(); scrubZeroBadges(); applyTranslations();
  }
  function updateTopProfile() {
    const p=State.profile || {}; const avatar=$('#profileAvatar');
    if(avatar) { if(p.avatar_image_url) { avatar.textContent=''; avatar.style.backgroundImage=`url("${p.avatar_image_url}")`; avatar.classList.add('profile-image-avatar'); } else { avatar.style.backgroundImage=''; avatar.classList.remove('profile-image-avatar'); avatar.textContent=p.avatar_icon || '💡'; } }
    const name=$('.profile-name'); if(name) name.textContent = 'Mi perfil';
    $('#profileMenu')?.setAttribute('hidden','');
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
      ['payments','💶','Pagos y asistencia','Tarifas, asistencia mensual, ausencias, cálculo de importes y previsión de ingresos.']
    ];
    const alertCount = teacherAlertCount();
    const unseenAlerts = Math.max(0, alertCount - Number(localStorage.getItem(`tribeca-alerts-seen-${State.profile.id}`)||0));
    return `<section class="teacher-dashboard t16-dashboard"><div class="section-heading teacher-heading-premium"><h2>Panel docente</h2><div class="teacher-stats"><span>${students.length} perfiles</span><span>${assignedBadges} insignias asignadas</span><span>${passReq} solicitudes de contraseña</span><span>${alertCount} alertas</span><button type="button" class="undo-chip" data-t30-undo>Deshacer último cambio</button></div></div><div class="t16-teacher-tools">${tools.map(([id,ic,title,desc])=>`<article class="t16-tool-card" role="button" tabindex="0" data-t16-tool="${id}"><span class="t16-tool-icon teacher-legacy-icon">${safe(ic)}</span><div><h3>${safe(title)}</h3><p>${safe(desc)}</p></div>${id==='passwordRequests'&&passReq?`<em>${passReq}</em>`:''}${id==='teacherAlerts'&&unseenAlerts?`<em id="teacherAlertsBadge">${unseenAlerts}</em>`:''}</article>`).join('')}</div></section>`;
  }
  function studentHome() {
    const p=State.profile; const diffs=State.data.difficulties||[]; const grades=State.data.grades||[]; const fails=grades.filter(g=>Number(g.grade)<5).length; const subjects=subjectList(p);
    const q=dailyQuote(); return `<section class="hero-card panel"><div class="hero-main"><p class="eyebrow">Panel personal de aprendizaje</p><h1>Hola, <span id="studentHeroName">${safe(displayName(p))}</span> <span class="wave">👋</span></h1><p>${new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p><p class="muted">${safe(academicLine(p))}</p></div><div class="hero-quote-block"><blockquote>“${safe(q.text)}”<cite>${safe(q.author)}</cite></blockquote><img class="hero-watermark" src="assets/watermark-tribeca.png" alt="" aria-hidden="true"></div></section><section class="quick-grid"><article class="quick-card panel" data-tool="guidance" role="button"><span class="quick-icon">${toolIcon('guidance')}</span><h2>Orientación académica</h2><p>Tests vocacionales, inteligencia emocional, itinerarios, Bachillerato, FP y recursos para decidir mejor.</p></article><article class="quick-card panel" data-tool="badges" role="button"><span class="quick-icon">${toolIcon('badges')}</span><h2>Mis insignias</h2><p>${studentBadgeSummary()}</p></article><article class="quick-card panel" data-tool="difficulties" role="button"><span class="quick-icon">${toolIcon('difficulties')}</span><h2>Mis materias con dificultades</h2><p>${diffs.length?diffs.map(d=>safe(d.subject)).join(', '):'Indica dónde necesitas más refuerzo.'}</p></article><article class="quick-card panel" data-tool="grades" role="button"><span class="quick-icon">${toolIcon('grades')}</span><h2>Mis calificaciones</h2><p>${fails?`${fails} calificación/es suspensa/s`:grades.length?`${grades.length} calificaciones registradas`:'Registra tus notas del centro escolar.'}</p></article></section><section class="section-heading"><h2>Mis materias</h2><span>${safe(p.course||'')}</span></section><section class="subjects-grid" id="subjectsGrid">${subjects.map((s,i)=>subjectCard(s,i)).join('')}</section>`;
  }
  function subjectCard(subject, i) { const vis=subjectVisual(subject); const mats=visibleMaterials(subject); const units=new Set(mats.map(m=>m.unit_title||m.unit||'Unidad 1')); return `<article class="subject-card subject-${i%6}" tabindex="0" role="button" data-subject="${safe(subject)}" style="--subject-color:${vis.color}"><div class="subject-top"><span>${safe(State.profile.course||'')}</span></div><div class="subject-mark">${safe(vis.glyph)}</div><h3>${safe(subject)}</h3><p>${mats.length} publicaciones · ${units.size||0} unidades</p><div class="progress-row"><span>Progreso</span><strong>0%</strong></div><div class="progress"><span style="width:0%"></span></div><small>Abre la materia para ver unidades y materiales.</small></article>`; }
  function bindSubjectCards(){ $$('.subject-card[data-subject]').forEach(card=>{card.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); openTool('subjectDetail', {subject:card.dataset.subject});});}); }
  function studentBadgeSummary(){ const earned=(State.data.userBadges||[]).filter(b=>b.user_id===State.profile?.id || b.student_id===State.profile?.id).length; if(earned) return `${earned} insignia${earned===1?'':'s'} asignada${earned===1?'':'s'} por la profesora`; return 'Sin insignias todavía.'; }

  const titleMap = {newPublication:'Nueva publicación',newDate:'Nueva fecha',activityLog:'Qué ha ocurrido en el aula',teacherAlerts:'Alertas docentes',classOverview:'Vista general del aula',assignBadge:'Asignar insignia',passwordRequests:'Solicitudes de recuperación',studentProfiles:'Perfiles del alumnado',payments:'Pagos y asistencia',teacherSubjects:'Materias y materiales',guidance:'Orientación académica',calendar:'Calendario',messages:'Mensajes',announcements:'Anuncios',profile:'Mi perfil',badges:'Mis insignias',difficulties:'Mis materias con dificultades',grades:'Mis calificaciones',subjectDetail:'Materia',legal:'Aviso legal',support:'Soporte',contact:'Contacto'};
  function openTool(id, opts={}) {
    $('#profileMenu')?.setAttribute('hidden','');
    if(opts.subject) State.currentSubject = opts.subject;
    const layer=$('#windowLayer'); if(!layer) return;
    let win=State.windows.get(id);
    if(!win){ win=document.createElement('section'); win.className=`tool-window t16-window ${id}-window`; win.dataset.window=id; win.style.left='50%'; win.style.top='50%'; win.style.transform='translate(-50%, -50%)'; State.windows.set(id,win); layer.appendChild(win); enableDrag(win); }
    win.innerHTML = `<header class="window-titlebar"><strong>${safe(titleMap[id]||id)}</strong><div class="window-actions"><button type="button" data-t16-min>−</button><button type="button" data-t16-max>□</button><button type="button" data-t16-close>×</button></div></header><div class="window-body">${toolContent(id)}</div>`;
    wireManagedForms(win);
    win.classList.remove('is-hidden'); win.style.zIndex=++State.z; enableDrag(win); $$('.subject-card[data-subject]', win).forEach(card=>card.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); openTool('subjectDetail',{subject:card.dataset.subject});}));
    if(id==='announcements') visibleAnnouncements().forEach(a=>localStorage.setItem(`tribeca-ann-seen-${a.id}`,'1'));
    if(id==='teacherAlerts' && roleTeacher()) localStorage.setItem(`tribeca-alerts-seen-${State.profile.id}`, String(teacherAlertCount()));
    updateBadges(); applyTranslations();
  }
  window.openTool = openTool;
  function rerender(){ State.windows.forEach((_,id)=>openTool(id)); updateBadges(); }
  window.rerenderOpenWindows = rerender;
  function enableDrag(win){ const bar=$('.window-titlebar',win); if(!bar || bar.dataset.dragReady) return; bar.dataset.dragReady='1'; bar.addEventListener('pointerdown', e=>{ if(e.target.closest('button')||win.classList.contains('is-maximized')) return; const r=win.getBoundingClientRect(); const ox=e.clientX-r.left, oy=e.clientY-r.top; win.style.transform='none'; const move=me=>{win.style.left=`${me.clientX-ox}px`;win.style.top=`${me.clientY-oy}px`;}; const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);}; document.addEventListener('pointermove',move); document.addEventListener('pointerup',up); }); }
  function toolContent(id) {
    if(id==='newPublication') return newPublicationContent(); if(id==='newDate') return calendarContent(true); if(id==='calendar') return calendarContent(false); if(id==='activityLog') return activityContent(); if(id==='teacherAlerts') return alertsContent(); if(id==='classOverview') return classOverviewContent(); if(id==='assignBadge') return assignBadgeContent(); if(id==='passwordRequests') return passwordRequestsContent(); if(id==='studentProfiles') return studentProfilesContent(); if(id==='teacherSubjects') return teacherSubjectsContent(); if(id==='guidance') return guidanceContent(); if(id==='payments') return paymentsContent(); if(id==='messages') return messagesContent(); if(id==='announcements') return announcementsContent(); if(id==='profile') return profileContent(); if(id==='badges') return badgesContent(); if(id==='difficulties') return difficultiesContent(); if(id==='grades') return gradesContent(); if(id==='subjectDetail') return subjectDetailContent(State.currentSubject); if(id==='legal') return legalContent(); if(id==='support') return supportContent(); if(id==='contact') return contactContent(); return '<div class="empty-state">Herramienta sin contenido.</div>';
  }

  function classSubjectOptions(stage = State.selectedSubjectStage, course = State.selectedSubjectCourse) {
    return (subjectCatalog[`${stage}-${course}`] || []).map(x => `<option>${safe(x)}</option>`).join('');
  }
  function recipientSelector(prefix='pub') {
    const students=State.data.students||[];
    return `<section class="window-panel recipient-panel"><h3>3. Destinatarios</h3><p class="meta">Primero elige el alcance. Si eliges alumnos concretos, marca uno o varios perfiles.</p><div class="t16-scope-grid premium-scope"><label><input type="radio" name="targetScope" value="all" checked> Todo el alumnado</label><label><input type="radio" name="targetScope" value="class"> Centro, etapa y curso</label><label><input type="radio" name="targetScope" value="selected"> Alumnos concretos</label></div><div class="window-grid"><label>Centro<select name="center"><option value="">Sin filtrar</option>${options(centers)}</select></label><label>Etapa<select name="stage"><option value="">Sin filtrar</option>${options(stages)}</select></label><label>Curso<select name="course"><option value="">Sin filtrar</option>${options(courses)}</select></label></div><input class="t16-search" type="search" placeholder="Buscar alumno por nombre o usuario..." data-t16-student-search><div class="recipient-scroll">${groups(students).map(g=>`<details class="recipient-group" open><summary>${safe(g.label)} <span>${g.items.length}</span></summary><div class="recipient-pills">${g.items.map(s=>`<label data-student-name="${safe((displayName(s)+' '+s.username+' '+academicLine(s)).toLowerCase())}"><input type="checkbox" name="targetUserIds" value="${safe(s.id)}"><span>${safe(displayName(s))}<small>${safe(s.username||'')} · ${safe(s.course||'')}</small></span></label>`).join('')}</div></details>`).join('')}</div></section>`;
  }
  function newPublicationContent() {
    const allSubjects = [...new Set(Object.values(subjectCatalog).flat().concat(['Apoyo personalizado','Tutoría']))];
    return `<form id="t16PublicationForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="t18-publication-wizard"><section class="window-panel t18-publish-main"><h3>1. Qué vas a publicar</h3><div class="t18-type-cards"><label><input type="radio" name="publicationKind" value="announcement" checked><span>📣 Anuncio, aviso o noticia<small>Se verá en Anuncios, no dentro de una materia.</small></span></label><label><input type="radio" name="publicationKind" value="material"><span>📄 Material de materia<small>Apuntes, boletín, documento o recurso.</small></span></label><label><input type="radio" name="publicationKind" value="task"><span>✅ Tarea o actividad<small>Las insignias se asignan manualmente desde el panel docente.</small></span></label><label><input type="radio" name="publicationKind" value="test"><span>🧪 Test externo<small>Usa el enlace para el test interactivo.</small></span></label><label><input type="radio" name="publicationKind" value="game"><span>🎮 Juego<small>Actividad lúdica o enlace a juego.</small></span></label></div><div class="window-grid"><label>Materia<select name="subject"><option value="">Sin materia</option>${allSubjects.map(s=>`<option>${safe(s)}</option>`).join('')}</select></label><label>Unidad didáctica<input name="unit" placeholder="Unidad 1"></label></div><label>Título<input name="title" class="title-input" maxlength="120" required placeholder="Título claro de la publicación"></label><label>Cuerpo<textarea name="body" rows="7" maxlength="1800" placeholder="Escribe el contenido de la publicación con instrucciones claras."></textarea></label><div class="t16-emoji-row">${['😀','🙂','👏','💡','⭐','📌','📚','🧠','🎯','🏅','✅','🔥','⚠️','📝','🔗'].map(e=>`<button type="button" data-t16-emoji="${e}">${e}</button>`).join('')}</div><div class="window-grid"><label>Tamaño de texto<select name="fontSize"><option>15</option><option selected>16</option><option>18</option><option>20</option><option>22</option></select></label><label>Enlace externo<input name="linkUrl" type="url" placeholder="https://..."></label></div></section><section class="window-panel publication-files-panel"><h3>2. Archivos adjuntos</h3><p class="meta">Añade una imagen visible o documentos para que el alumnado los consulte desde la publicación.</p><label>Imagen visible en la publicación<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp"><input type="hidden" name="imageUrl"><span id="t16ImagePreview" class="t16-image-preview"></span></label><label>Documentos adjuntos PDF, Word o imágenes<input name="attachmentFiles" type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" multiple><input type="hidden" name="attachmentsJson" value="[]"><span class="meta" id="attachmentPreview">Ningún archivo seleccionado.</span></label></section>${recipientSelector()}<footer class="publish-sticky-footer"><button class="primary-btn" type="submit">Publicar ahora</button></footer></form>`;
  }
  async function savePublication(form) {
    const fd=new FormData(form); const kind=fd.get('publicationKind'); const scope=fd.get('targetScope')||'all'; const ids=fd.getAll('targetUserIds');
    const rec={ title:fd.get('title'), body:fd.get('body')||'', image_url:fd.get('imageUrl')||null, link_url:fd.get('linkUrl')||null, font_size:Number(fd.get('fontSize')||16), target_scope:scope, target_user_ids:ids, center:fd.get('center')||null, stage:fd.get('stage')||null, course:fd.get('course')||null, created_by:State.profile.id, hidden:false };
    const attachments = JSON.parse(fd.get('attachmentsJson')||'[]');
    let res; if(['announcement','notice','news'].includes(kind)) res=await table('announcements').insert({...rec, announcement_type:kind, attachments});
    else res=await table('subject_materials').insert({...rec, subject:fd.get('subject')||'Apoyo personalizado', unit_title:fd.get('unit')||'Unidad 1', material_type:kind, badge_codes:[], attachments});
    if(res.error) throw res.error;
    await log('publication','Nueva publicación',{title:rec.title, kind}); await loadData(true); toast('Publicación guardada.'); form.reset(); rerender();
  }

  function eventColorType(e){ return e.event_type || e.type || 'personal'; }
  function isClosedEvent(e){ const t=eventColorType(e); return ['national','galicia','local','closed'].includes(t) || /no abre|cerrad/i.test(String(e.body||e.description||e.title||'')); }
  function calendarGrid() {
    const month=State.calendarMonth; const first=startMonth(month); const start=addDays(first,-((first.getDay()+6)%7)); const events=relevantEvents(); const weekdays=['L','M','X','J','V','S','D'];
    let html=`<div class="t16-calendar-head"><button type="button" data-t16-cal-prev>‹</button><strong>${month.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</strong><button type="button" data-t16-cal-next>›</button></div><div class="event-legend"><span><i class="event-national"></i>Nacional</span><span><i class="event-galicia"></i>Galicia</span><span><i class="event-local"></i>Corcubión</span><span><i class="event-school"></i>Escolar</span><span><i class="event-exam"></i>Examen</span><span><i class="event-delivery"></i>Entrega</span><span><i class="event-personal"></i>Personal</span></div><div class="t16-calendar-grid">${weekdays.map(d=>`<div class="calendar-weekday">${d}</div>`).join('')}`;
    for(let i=0;i<42;i++){ const d=addDays(start,i); const iso=toIso(d); const evs=events.filter(e=>e.date===iso); html+=`<button type="button" class="calendar-day ${d.getMonth()!==month.getMonth()?'is-other':''} ${iso===todayIso()?'is-today':''} ${iso===State.selectedDate?'is-selected':''} ${evs.some(isClosedEvent)?'is-closed-day':''}" data-t16-day="${iso}"><span class="day-number">${d.getDate()}</span>${evs.slice(0,4).map(e=>`<span class="day-event-label"><i class="day-event-dot event-${safe(eventColorType(e))}"></i>${safe(e.title)}</span>`).join('')}</button>`; }
    return html+'</div>';
  }
  function calendarContent(forceCreate=false) {
    const events=relevantEvents(); const selected=events.filter(e=>e.date===State.selectedDate); const upcoming=events.filter(e=>parseIso(e.date)>=parseIso(todayIso())).sort((a,b)=>parseIso(a.date)-parseIso(b.date)).slice(0,30); const edit=State.selectedEventId ? events.find(e=>e.id===State.selectedEventId) : null; const closed=selected.filter(isClosedEvent);
    return `<div class="t16-calendar-layout premium-calendar"><section class="window-panel calendar-main-panel">${calendarGrid()}</section><section class="window-panel calendar-side-panel">${closed.length?`<div class="closed-alert"><strong>Tribeca Academia no abre este día</strong><p>${closed.map(e=>safe(e.title)).join(' · ')}</p></div>`:''}<h3>${forceCreate?'Nueva fecha':'Eventos del día'} · ${fmtDate(State.selectedDate)}</h3><div class="item-list">${selected.length?selected.map(e=>eventCard(e)).join(''):'<div class="empty-state">No hay eventos este día. Puedes crear uno nuevo.</div>'}</div><hr>${eventForm(edit)}</section><section class="window-panel upcoming-panel"><h3>Próximas fechas</h3><div class="item-list">${upcoming.map(e=>`<article class="list-item event-${safe(eventColorType(e))}" data-t16-event="${safe(e.id)}"><strong>${fmtDate(e.date)} · ${safe(e.title)}</strong><p>${safe(e.body||e.description||'')}</p><small>${safe(eventLabel(e))}</small></article>`).join('')||'<div class="empty-state">Sin próximas fechas.</div>'}</div></section></div>`;
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
    return `<form id="t16EventForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid premium-event-form"><input type="hidden" name="id" value="${safe(e?.id||'')}"><label>Fecha<input name="eventDate" type="date" value="${safe(e?.date||State.selectedDate)}" required ${can?'':'disabled'}></label><label>Título<input name="title" value="${safe(e?.title||'')}" required ${can?'':'disabled'}></label><label>Descripción<textarea name="body" rows="3" ${can?'':'disabled'}>${safe(e?.body||e?.description||'')}</textarea></label><div class="window-grid"><label>Tipo<select name="eventType" ${can?'':'disabled'}>${typeOptions.map(([v,l])=>`<option value="${v}" ${currentType===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Visibilidad<select name="scope" ${can?'':'disabled'}>${scopeOptions.map(([v,l])=>`<option value="${v}" ${currentScope===v?'selected':''}>${l}</option>`).join('')}</select></label></div><button class="primary-btn" type="button" data-t25-save-event onclick="return window.TribecaSaveCalendarEventDirect(this,event)" ${can?'':'disabled'}>${e?'Guardar cambios':'Crear fecha'}</button></form>`;
  }
  async function saveEvent(form){
    const fd=new FormData(form); const id=String(fd.get('id')||'').trim(); const type=fd.get('eventType')||'personal';
    const rawScope = fd.get('scope') || (roleTeacher() ? 'all' : 'user');
    const scope = roleTeacher() ? (type==='closed'?'all':rawScope) : (rawScope==='class'?'class':'user');
    const rec={ id:id||null, event_date:fd.get('eventDate'), title:String(fd.get('title')||'').trim(), body:fd.get('body')||'', event_type:type, scope, center:State.profile.center, stage:State.profile.stage, course:State.profile.course, created_by:State.profile.id, user_id:(scope==='user'?State.profile.id:null), hidden:false };
    if(!rec.event_date || !rec.title) throw new Error('Completa la fecha y el título.');
    const rpc=await State.client.rpc('tribeca_save_calendar_event_v27',{p_payload:rec});
    if(rpc.error) throw rpc.error;
    await log('calendar', id?'Fecha actualizada':'Fecha creada', {title:rec.title,date:rec.event_date}); await loadData(true); toast(id?'Fecha actualizada.':'Fecha creada.'); rerender();
  }

  function activityTypeClass(type=''){ const t=String(type||'').toLowerCase(); if(t.includes('login')) return 'activity-login'; if(t.includes('message')) return 'activity-message'; if(t.includes('publication')||t.includes('guidance')) return 'activity-publication'; if(t.includes('calendar')) return 'activity-calendar'; if(t.includes('badge')) return 'activity-badge'; if(t.includes('grade')) return 'activity-grade'; if(t.includes('difficulty')) return 'activity-difficulty'; if(t.includes('profile')) return 'activity-profile'; return 'activity-generic'; }
  function activityContent(){ const cutoff=State.activitySince?new Date(State.activitySince):new Date(0); const rows=(State.data.activity||[]).filter(a=>new Date(a.created_at||0)>cutoff); return `<section class="window-panel"><h3>Qué ha ocurrido desde tu última sesión</h3><p class="meta">Solo se muestran acciones posteriores a tu último acceso al aula.</p>${rows.length?`<div class="activity-list">${rows.map(a=>`<article class="list-item activity-card ${activityTypeClass(a.action_type)}"><strong>${safe(a.title||a.action_type)}</strong><p>${safe(a.actor_name||'Sistema')} · ${safe(a.action_type||'')}</p><small>${fmtDT(a.created_at)}</small></article>`).join('')}</div>`:'<div class="empty-state">No hay actividad nueva desde tu última sesión.</div>'}</section>`; }
  function alertsContent(){ const grades=(State.data.grades||[]).filter(g=>Number(g.grade)<5); const diff=State.data.difficulties||[]; const pass=(State.data.passwordRequests||[]).filter(r=>r.status==='pending'); const unpaid=unpaidPaymentAlerts(); return `<div class="window-grid"><section class="window-panel"><h3>Calificaciones bajas</h3>${grades.length?grades.map(g=>`<article class="list-item danger"><strong>${safe(g.subject)} · ${g.grade}</strong><p>${studentName(g.user_id)} · ${safe(g.evaluation||'')}</p></article>`).join(''):'<div class="empty-state">Sin suspensos registrados.</div>'}</section><section class="window-panel"><h3>Dificultades declaradas</h3>${diff.length?diff.map(d=>`<article class="list-item"><strong>${safe(d.subject)}</strong><p>${studentName(d.user_id)} · ${safe(d.level||'')}</p></article>`).join(''):'<div class="empty-state">Sin materias con dificultades.</div>'}</section><section class="window-panel"><h3>Pendientes</h3><p>${pass.length} recuperaciones de contraseña · ${unpaid.length} mensualidades pendientes vencidas.</p>${unpaid.map(a=>`<article class="list-item danger"><strong>${safe(a.name)} · ${safe(a.month)}</strong><p>Importe previsto: ${money(a.amount)}</p></article>`).join('')}</section></div>`; }
  function fieldArray(value){ if(Array.isArray(value)) return value.filter(Boolean); if(!value) return []; if(typeof value==='string'){ try{ const parsed=JSON.parse(value); if(Array.isArray(parsed)) return parsed.filter(Boolean); }catch(_e){} return value.split(/[;,]/).map(x=>x.trim()).filter(Boolean); } return []; }
  function supportSummary(s){ const nee=fieldArray(s.nee_types); const neae=fieldArray(s.neae_types); const health=fieldArray(s.health_conditions); const flags=[]; if(s.personalized_attention) flags.push('Atención personalizada'); if(nee.length) flags.push(`${nee.length} NEE`); if(neae.length) flags.push(`${neae.length} NEAE`); if(health.length) flags.push(`${health.length} condición/es registradas`); return {nee,neae,health,flags}; }
  function classOverviewContent(){
    const students=State.data.students||[]; const gs=groups(students);
    const totals=students.reduce((acc,s)=>{ const sup=supportSummary(s); acc.nee+=sup.nee.length?1:0; acc.neae+=sup.neae.length?1:0; acc.health+=sup.health.length?1:0; acc.attention+=s.personalized_attention?1:0; return acc; }, {nee:0,neae:0,health:0,attention:0});
    return `<section class="class-overview-premium"><div class="overview-hero window-panel"><div><p class="eyebrow">Vista docente</p><h3>Vista general del aula</h3><p class="meta">Resumen por grupos con alumnado, alertas académicas y condiciones de atención personalizada visibles solo para la profesora.</p></div><div class="overview-kpis"><span><strong>${students.length}</strong> alumnado</span><span><strong>${gs.length}</strong> grupos</span><span><strong>${totals.nee}</strong> con NEE</span><span><strong>${totals.neae}</strong> con NEAE</span><span><strong>${totals.health}</strong> condiciones registradas</span></div></div><div class="overview-group-grid">${gs.map(g=>{ const needCount=g.items.filter(s=>supportSummary(s).flags.length).length; return `<article class="overview-group-card window-panel"><header><div><h3>${safe(g.label)}</h3><p>${g.items.length} alumno/s · ${needCount} con seguimiento especial</p></div><span>${g.items.length}</span></header><div class="overview-student-list">${g.items.map(st=>{ const sup=supportSummary(st); const fails=(State.data.grades||[]).filter(x=>String(x.user_id||x.student_id)===String(st.id)&&Number(x.grade)<5).length; const diff=(State.data.difficulties||[]).filter(x=>String(x.user_id)===String(st.id)).length; return `<div class="overview-student-row"><div><strong>${safe(displayName(st))}</strong><small>${safe(st.username||'')} · ${safe(st.course||'')}</small></div><div class="overview-tags">${fails?`<em class="tag-danger">${fails} suspenso/s</em>`:''}${diff?`<em>${diff} dificultad/es</em>`:''}${sup.flags.map(f=>`<em class="tag-support">${safe(f)}</em>`).join('')||'<em class="tag-muted">Sin observaciones especiales</em>'}</div></div>`; }).join('')}</div></article>`; }).join('')||'<div class="empty-state">No hay alumnado cargado.</div>'}</div></section>`;
  }
  function assignBadgeContent(){
    const students=State.data.students||[]; const grouped=groups(students);
    return `<section class="assign-badge-premium"><div class="assign-badge-header window-panel"><div><p class="eyebrow">Reconocimiento docente</p><h3>Asignar insignia manualmente</h3><p class="meta">Las insignias solo puede concederlas la profesora. Selecciona una insignia, busca alumnado y marca uno o varios perfiles.</p></div><span class="t35-badge-symbol">🏅</span></div><form id="t16AssignBadgeForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="window-panel assign-badge-form t35-badge-form"><div class="t35-badge-top"><label>Insignia<select name="badgeCode" required>${badges.map(b=>`<option value="${b.code}">${b.icon} ${safe(b.name)}</option>`).join('')}</select></label><label>Buscar alumnado<input class="t16-search" type="search" placeholder="Nombre, usuario, centro, etapa o curso..." data-t16-student-search></label><span class="t35-counter">${students.length} perfiles disponibles</span></div><div class="t35-badge-groups">${grouped.map(g=>`<details class="t35-badge-group" open><summary><strong>${safe(g.label)}</strong><span>${g.items.length}</span></summary><div class="t35-badge-student-grid">${g.items.map(st=>`<label class="t35-badge-student" data-student-name="${safe((displayName(st)+' '+(st.username||'')+' '+academicLine(st)).toLowerCase())}"><input type="checkbox" name="userIds" value="${safe(st.id)}"><span><strong>${safe(displayName(st))}</strong><small>${safe(st.username||'')} · ${safe(st.center||'Sin centro')} · ${safe(st.course||'Sin curso')}</small></span></label>`).join('')}</div></details>`).join('')}</div><button class="primary-btn t35-assign-submit" type="submit">Asignar insignia</button></form></section>`;
  }
  async function assignBadge(form){ const fd=new FormData(form); const ids=fd.getAll('userIds'); if(!ids.length) return toast('Selecciona al menos un alumno.'); const code=fd.get('badgeCode'); const rpc=await State.client.rpc('tribeca_teacher_assign_badge_v28',{p_user_ids:ids,p_badge_code:code,p_badge_name:badgeName(code)}); if(rpc.error) throw rpc.error; await log('badge','Insignia asignada',{code, count:ids.length}); await loadData(true); toast('Insignia asignada.'); rerender(); }
  async function resolveClaim(id, ok){ const claim=(State.data.badgeClaims||[]).find(c=>c.id===id); if(!claim) return; await maybe(table('badge_claim_requests').update({status:ok?'approved':'rejected', resolved_at:new Date().toISOString(), resolved_by:State.profile.id}).eq('id',id)); if(ok) await maybe(table('user_badges').insert({user_id:claim.user_id,badge_code:claim.badge_code,badge_name:badgeName(claim.badge_code),assigned_by:State.profile.id})); await loadData(true); toast(ok?'Insignia aprobada.':'Solicitud rechazada.'); rerender(); }
  function passwordRequestsContent(){ const rows=State.data.passwordRequests||[]; return `<section class="window-panel"><h3>Solicitudes de recuperación de contraseña</h3>${rows.length?rows.map(r=>`<article class="list-item"><strong>${safe(r.username||r.display_name)}</strong><p>${safe(r.display_name||'')} · ${safe(r.status||'pending')}</p><small>${fmtDT(r.created_at)}</small><button data-t16-pass-done="${safe(r.id)}">Marcar como atendida</button></article>`).join(''):'<div class="empty-state">No hay solicitudes pendientes.</div>'}</section>`; }

  function studentProfilesContent(){
    const students = State.data.students || [];
    const selected = students.find(s => s.id === State.selectedStudentId) || students[0] || null;
    if(!State.selectedStudentId && selected) State.selectedStudentId = selected.id;
    const studentList = groups(students).map(g => `<details class="t24-profile-group" open><summary>${safe(g.label)} <span>${g.items.length}</span></summary>${g.items.map(s => `<button type="button" class="t24-student-row ${selected?.id===s.id?'is-selected':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+(s.username||'')+' '+academicLine(s)).toLowerCase())}"><strong>${safe(displayName(s))}</strong><small>${safe(s.username||'')} · ${safe(academicLine(s))}</small></button>`).join('')}</details>`).join('');
    return `<div class="t24-student-profiles"><section class="window-panel t24-profile-list"><h3>Alumnado</h3><p class="meta">Selecciona un perfil. Los cambios solo los puede guardar la profesora.</p><input class="t16-search" type="search" placeholder="Buscar alumno..." data-t16-student-search>${studentList || '<div class="empty-state">No hay alumnado cargado.</div>'}</section><section class="window-panel t24-profile-editor">${selected ? studentEditForm(selected) : '<div class="empty-state">Selecciona un alumno.</div>'}</section></div>`;
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
    return `<form id="t24StudentProfileForm" class="form-grid premium-student-editor t24-student-editor" method="post" action="javascript:void(0)"><input type="hidden" name="id" value="${safe(s.id)}"><div class="t24-editor-head"><div><h3>Perfil de ${safe(displayName(s))}</h3><p class="meta">Datos privados de gestión docente.</p></div><button class="primary-btn t24-save-profile" type="button" data-t24-save-student onclick="return window.TribecaSaveStudentProfileDirect(this,event)">Guardar cambios del alumno</button></div><div class="form-status t24-profile-status" data-t24-profile-status></div><section class="premium-form-section"><h4>Identificación</h4><div class="window-grid"><label>Nombre<input name="firstName" value="${safe(s.first_name||firstPart(s.full_name))}"></label><label>Apellidos<input name="lastName" value="${safe(s.last_name||lastPart(s.full_name))}"></label></div><div class="window-grid"><label>Nombre completo<input name="fullName" value="${safe(s.full_name && !/^demo\b/i.test(s.full_name) ? s.full_name : displayName(s))}"></label><label>Usuario<input name="username" value="${safe(s.username||'')}"></label></div><div class="window-grid"><label>Email interno<input name="authEmail" type="email" value="${safe(s.auth_email||'')}"></label><label>Email personal<input name="personalEmail" type="email" value="${safe(s.personal_email||'')}"></label></div></section><section class="premium-form-section"><h4>Datos académicos</h4><div class="window-grid"><label>Centro<select name="center">${options(centers,s.center)}</select></label><label>Etapa<select name="stage">${options(stages,s.stage)}</select></label><label>Curso<select name="course">${options(dynamicCourses(),s.course)}</select></label></div><label>Modalidad / itinerario<input name="track" value="${safe(s.track||'')}"></label></section><section class="premium-form-section promotion-section"><h4>Promoción de curso</h4><p class="meta">Al promocionar se actualizará centro, etapa y curso con los datos elegidos arriba y se limpiarán calificaciones, dificultades e insignias del curso anterior.</p><button class="secondary-btn" type="button" data-t29-promote-student>Promocionar y limpiar datos del curso anterior</button></section><section class="premium-form-section"><h4>Horario de asistencia</h4><p class="meta">Estos días y horas se usarán para generar horarios semanales y calcular asistencia mensual. Hay 12 huecos disponibles para combinar clases grupales e individuales.</p><div class="t24-schedule-grid">${scheduleRows}</div></section><section class="premium-form-section attention-section t34-attention-section"><h4>Atención personalizada, NEAE y NEE</h4><div class="support-note"><strong>Clasificación correcta:</strong> las NEE forman parte de las NEAE. Todo el alumnado con NEE es alumnado con NEAE, pero no todo el alumnado con NEAE tiene NEE. La necesidad se registra cuando genera barreras de acceso, presencia, participación o aprendizaje y requiere apoyos educativos específicos.</div><label class="check-line attention-main"><input type="checkbox" name="personalizedAttention" ${s.personalized_attention?'checked':''}> Requiere atención personalizada o adaptación</label><div class="support-needs-grid t24-support-grid t34-support-grid"><fieldset class="support-box support-box-nee"><legend>1. NEE, necesidades educativas especiales</legend><p class="meta">Derivadas de discapacidad, trastornos graves de conducta, trastornos graves de comunicación o lenguaje, y TEA/TGD cuando requiere apoyos específicos.</p><div class="support-checks">${checks('neeTypes', neeTypes, selectedNee)}</div></fieldset><fieldset class="support-box support-box-neae"><legend>2. NEAE, necesidades específicas de apoyo educativo</legend><p class="meta">Incluye NEE y otras situaciones oficiales de apoyo educativo.</p><div class="support-checks">${checks('neaeTypes', neaeTypes, selectedNeae)}</div></fieldset><fieldset class="support-box support-box-health"><legend>Condiciones que conviene registrar</legend><p class="meta">No son NEAE por sí mismas si están controladas o no generan impacto educativo significativo, pero pueden ser relevantes para la atención diaria.</p><div class="support-checks">${checks('healthConditions', healthConditions, selectedHealth)}</div></fieldset></div><label>Observaciones privadas<textarea name="observations" rows="5">${safe(s.observations||'')}</textarea></label></section><div class="sticky-form-actions"><button class="primary-btn t24-save-profile" type="button" data-t24-save-student onclick="return window.TribecaSaveStudentProfileDirect(this,event)">Guardar cambios del alumno</button><span class="form-status" data-t24-profile-status-bottom></span></div></form>`;
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
  function isPaymentOverdue(month){ const [y,m]=String(month).split('-').map(Number); if(!y||!m) return false; const due=new Date(y, m, 10); const today=new Date(); return today > due; }
  function unpaidPaymentAlerts(){ const month=(State.billingMonth||todayIso().slice(0,7)); return (State.data.students||[]).map(s=>({student:s, bill:(State.data.billing||[]).find(b=>b.user_id===s.id)||{}, pay:paymentMonthRecord(s.id, month)})).filter(x=>isPaymentOverdue(month) && x.pay.paid!==true).map(x=>({name:displayName(x.student), month, amount:calculatePaymentAmount(x.student.id, month).amount})); }
  function paymentsContent(){
    const students=State.data.students||[]; const selected=students.find(s=>s.id===State.selectedStudentId)||students[0]; if(!State.selectedStudentId && selected) State.selectedStudentId=selected.id;
    const month=(State.billingMonth||todayIso().slice(0,7)); State.billingMonth=month;
    return `<div class="payments-layout"><section class="window-panel payments-students"><h3>Alumnado</h3><input class="t16-search" type="search" placeholder="Buscar alumno..." data-t16-student-search>${groups(students).map(g=>`<details open><summary>${safe(g.label)}</summary>${g.items.map(s=>`<button type="button" class="t16-student-row ${selected?.id===s.id?'is-selected':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+s.username).toLowerCase())}">${safe(displayName(s))}<small>${safe(academicLine(s))}</small></button>`).join('')}</details>`).join('')}</section><section class="window-panel payments-main">${selected?paymentEditor(selected,month):'<div class="empty-state">Selecciona un alumno.</div>'}</section><section class="window-panel payments-summary"><h3>Resumen mensual</h3>${paymentSummary(month)}</section></div>`;
  }
  function paymentEditor(s,month){
    const bill=(State.data.billing||[]).find(b=>b.user_id===s.id)||{}; const pay=paymentMonthRecord(s.id,month); const days=monthScheduleDays(s.id,month); const calc=calculatePaymentAmount(s.id,month);
    return `<h3>Pagos y asistencia de ${safe(displayName(s))}</h3><form id="t16BillingForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid premium-form"><input type="hidden" name="userId" value="${safe(s.id)}"><input type="hidden" name="month" value="${safe(month)}"><label>Tipo de tarifa<select name="tariffType"><option value="group" ${bill.tariff_type==='group'||!bill.tariff_type?'selected':''}>Grupal, cuota fija mensual</option><option value="individual" ${bill.tariff_type==='individual'?'selected':''}>Individual, pago por clase asistida</option><option value="mixed" ${bill.tariff_type==='mixed'?'selected':''}>Mixta, cuota fija + clases individuales</option></select></label><div class="window-grid"><label>Cuota mensual fija (€)<input name="monthlyFee" type="number" min="0" step="0.01" value="${safe(bill.monthly_fee??'')}"></label><label>Precio por clase individual (€)<input name="classRate" type="number" min="0" step="0.01" value="${safe(bill.class_rate??'')}"></label></div><p class="meta">Tarifa mixta: la cuota fija se suma solamente a las clases marcadas como individuales en el horario y asistidas en este mes.</p><div class="window-grid"><label class="check-line"><input type="checkbox" name="paid" ${pay.paid?'checked':''}> Mes pagado</label><label>Día de pago<input name="paidDate" type="date" value="${safe(pay.paid_date||'')}"></label></div><label>Notas privadas de pago<textarea name="paymentNotes" rows="3">${safe(bill.payment_notes||'')}</textarea></label><button class="primary-btn" type="submit">Guardar tarifa y estado de pago</button><div class="payment-total-card is-visible"><strong>Total calculado: ${money(calc.amount)}</strong><p>${safe(calc.detail)} · Asistencias: ${calc.present} · Individuales: ${calc.individualPresent||0} · Faltas: ${calc.absent} · Justificadas: ${calc.justified} · Estado: ${pay.paid?'pagado':'pendiente'}</p></div></form><hr><div class="attendance-head"><h4>Asistencia de ${safe(month)}</h4><label>Mes<input type="month" value="${safe(month)}" data-t16-billing-month></label></div><p class="meta">Haz clic en un día de clase para alternar asistencia/no asistencia. Usa “Justificar” solo si la falta debe constar como justificada.</p><div class="attendance-month-grid">${days.length?days.map(d=>{ const rec=(State.data.attendance||[]).find(a=>a.user_id===s.id && a.class_date===d.date && String(a.scheduled_start||'').slice(0,5)===d.start); const status=rec?.status||'absent'; return `<article class="attendance-day t22-attendance-day is-${status} is-${safe(d.type)}" role="button" tabindex="0" data-t22-attendance-toggle data-user="${safe(s.id)}" data-date="${safe(d.date)}" data-start="${safe(d.start)}" data-end="${safe(d.end)}" data-class-type="${safe(d.type)}" data-current="${safe(status)}"><strong>${fmtLongDate(d.date)}</strong><span>${safe(d.start)}-${safe(d.end)} · ${d.type==='individual'?'Individual':'Grupal'}</span><em>${status==='present'?'Asistió':status==='justified'?'Justificada':'No asistió'}</em><button type="button" data-t16-attendance="justified" data-user="${safe(s.id)}" data-date="${safe(d.date)}" data-start="${safe(d.start)}" data-end="${safe(d.end)}" data-class-type="${safe(d.type)}">Justificar</button></article>`; }).join(''):'<div class="empty-state">Este alumno no tiene horario asignado para este mes.</div>'}</div><section class="payment-history-panel"><h4>Histórico del alumno</h4>${paymentStudentHistory(s.id)}<button type="button" class="secondary-btn" onclick="window.TribecaPrintPaymentsPdf && window.TribecaPrintPaymentsPdf('student')">Descargar histórico del alumno en PDF</button></section>`;
  }
  function monthScheduleDays(userId,month){ const [y,m]=String(month).split('-').map(Number); if(!y||!m) return []; const sched=(State.data.schedules||[]).filter(x=>x.user_id===userId && x.active!==false); const last=new Date(y,m,0).getDate(); const out=[]; for(let d=1; d<=last; d++){ const date=new Date(y,m-1,d); const weekday=((date.getDay()+6)%7)+1; sched.filter(s=>Number(s.weekday)===weekday).forEach(s=>out.push({date:toIso(date), start:String(s.start_time||'').slice(0,5), end:String(s.end_time||'').slice(0,5), type:String(s.class_type||s.type||'group')})); } return out; }
  function calculatePaymentAmount(userId,month){ const bill=(State.data.billing||[]).find(b=>b.user_id===userId)||{}; const att=(State.data.attendance||[]).filter(a=>a.user_id===userId && String(a.class_date||'').startsWith(month)); const present=att.filter(a=>a.status==='present').length; const absent=att.filter(a=>a.status==='absent').length; const justified=att.filter(a=>a.status==='justified').length; const fixed=Number(bill.monthly_fee||0); const rate=Number(bill.class_rate||0); const scheduleDays=monthScheduleDays(userId,month); const individualPresent=scheduleDays.filter(d=>d.type==='individual' && att.some(a=>a.status==='present' && a.class_date===d.date && String(a.scheduled_start||'').slice(0,5)===d.start)).length; const fixedGroupDays=scheduleDays.filter(d=>d.type!=='individual').length; let amount=0, detail=''; if(bill.tariff_type==='individual'){ amount=present*rate; detail=`${present} asistencias × ${money(rate)}`; } else if(bill.tariff_type==='mixed'){ amount=fixed+(individualPresent*rate); detail=`Cuota fija ${money(fixed)} + ${individualPresent} clases individuales × ${money(rate)}`; } else { amount=fixed; detail='Cuota fija mensual'; } return {amount,detail,present,individualPresent,fixedGroupDays,absent,justified}; }
  function studentPaymentAmount(userId,month){ const c=calculatePaymentAmount(userId,month); const pay=paymentMonthRecord(userId,month); return `<strong>Total calculado: ${money(c.amount)}</strong><p>${safe(c.detail)} · Faltas: ${c.absent} · Justificadas: ${c.justified} · ${pay.paid?'Pagado '+(pay.paid_date?fmtDate(pay.paid_date):''):'Pendiente de pago'}</p>`; }
  function paymentStudentHistory(userId){ const months=[...new Set([...(State.data.paymentMonths||[]).filter(p=>p.user_id===userId).map(p=>String(p.month).slice(0,7)), State.billingMonth||todayIso().slice(0,7)])].sort().reverse(); return `<table class="premium-table compact"><thead><tr><th>Mes</th><th>Importe</th><th>Estado</th><th>Día de pago</th></tr></thead><tbody>${months.map(m=>{ const c=calculatePaymentAmount(userId,m); const p=paymentMonthRecord(userId,m); return `<tr><td>${safe(m)}</td><td>${money(c.amount)}</td><td>${p.paid?'Pagado':'Pendiente'}</td><td>${p.paid_date?fmtDate(p.paid_date):'—'}</td></tr>`; }).join('')}</tbody></table>`; }
  function paymentSummary(month){ const students=State.data.students||[]; let total=0; const rows=students.map(s=>{ const bill=(State.data.billing||[]).find(b=>b.user_id===s.id)||{}; const c=calculatePaymentAmount(s.id,month); const pay=paymentMonthRecord(s.id,month); total+=c.amount; return `<tr class="${!pay.paid&&isPaymentOverdue(month)?'payment-overdue-row':''}"><td>${safe(displayName(s))}</td><td>${bill.tariff_type==='mixed'?'Mixta':bill.tariff_type==='individual'?'Individual':'Grupal'}</td><td>${c.present}</td><td>${money(c.amount)}</td><td>${pay.paid?'Pagado '+(pay.paid_date?fmtDate(pay.paid_date):''):'Pendiente'}</td></tr>`; }).join(''); return `<label>Mes<input type="month" value="${safe(month)}" data-t16-billing-month></label><div class="payment-grand-total">Total previsto: ${money(total)}</div><h4>Histórico total mensual</h4><div class="inline-actions"><button type="button" class="secondary-btn" onclick="window.TribecaPrintPaymentsPdf && window.TribecaPrintPaymentsPdf('month')">Descargar histórico mensual en PDF</button></div><table class="premium-table"><thead><tr><th>Alumno/a</th><th>Tarifa</th><th>Asistencias</th><th>Importe</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`; }
  function money(v){ return `${Number(v||0).toFixed(2).replace('.',',')} €`; }
  async function saveBilling(form){ const fd=new FormData(form); const rec={user_id:fd.get('userId'), tariff_type:fd.get('tariffType'), monthly_fee:fd.get('monthlyFee')?Number(fd.get('monthlyFee')):0, class_rate:fd.get('classRate')?Number(fd.get('classRate')):0, payment_notes:fd.get('paymentNotes')||'', updated_at:new Date().toISOString()}; const pay={user_id:fd.get('userId'), month:fd.get('month')||State.billingMonth||todayIso().slice(0,7), paid:!!fd.get('paid'), paid_date:fd.get('paidDate')||null, updated_at:new Date().toISOString()}; const r=await State.client.rpc('tribeca_save_payment_v28',{p_billing:rec,p_month:pay}); if(r.error) throw r.error; await log('payment','Tarifa o pago actualizado',{student:studentName(rec.user_id),month:pay.month}); await loadData(true); toast('Pago guardado.'); rerender(); }
  async function saveAttendance(btn){ const rec={user_id:btn.dataset.user, class_date:btn.dataset.date, scheduled_start:btn.dataset.start||null, scheduled_end:btn.dataset.end||null, class_type:btn.dataset.classType||'group', status:btn.dataset.t16Attendance, updated_at:new Date().toISOString()}; const { error } = await State.client.from('attendance_records').upsert(rec,{onConflict:'user_id,class_date,scheduled_start'}); if(error) throw error; await loadData(true); rerender(); }
  async function toggleAttendance(card){ const current=card.dataset.current || 'absent'; const next=current==='present'?'absent':'present'; const rec={user_id:card.dataset.user, class_date:card.dataset.date, scheduled_start:card.dataset.start||null, scheduled_end:card.dataset.end||null, class_type:card.dataset.classType||'group', status:next, updated_at:new Date().toISOString()}; const { error } = await State.client.from('attendance_records').upsert(rec,{onConflict:'user_id,class_date,scheduled_start'}); if(error) throw error; await loadData(true); rerender(); }


  function messagesContent(){
    const p=State.profile; const all=(State.data.messages||[]).filter(m=>!(m.sender_id===p.id&&m.deleted_by_sender) && !(m.recipient_id===p.id&&m.deleted_by_recipient));
    const inbox=all.filter(m=>m.recipient_id===p.id&&!m.archived), sent=all.filter(m=>m.sender_id===p.id), archived=all.filter(m=>m.archived && (m.sender_id===p.id||m.recipient_id===p.id));
    const compose = roleTeacher() ? `<form id="t16TeacherMessageForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid email-compose"><label>Alumno/a<select name="recipientId" required>${(State.data.students||[]).map(s=>`<option value="${s.id}">${safe(displayName(s))}</option>`).join('')}</select></label><label>Asunto<input name="subject" maxlength="100" required></label><div class="window-grid"><label>Tamaño<select name="fontSize"><option>14</option><option selected>16</option><option>18</option><option>20</option></select></label><label>Color<select name="textColor"><option value="#1d251d">Negro</option><option value="#0b3d22">Verde Tribeca</option><option value="#8a5a00">Dorado oscuro</option><option value="#9b1c1c">Rojo</option><option value="#234e8f">Azul</option></select></label></div><label>Mensaje<textarea name="body" maxlength="3000" rows="7" required></textarea></label><label>Adjuntar documentos o imágenes<input name="messageFiles" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"><input type="hidden" name="attachmentsJson" value=""><small data-message-file-name></small></label><button class="primary-btn" type="submit">Enviar</button></form>` : `<form id="t16StudentMessageForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid email-compose"><label>Motivo<select name="reason"><option>Necesito ayuda</option><option>No puedo asistir a clase</option><option>Tengo una duda sobre una tarea</option><option>Quiero revisar una calificación</option><option>Otro motivo</option></select></label><label>Asunto<input name="subject" maxlength="100" required></label><div class="window-grid"><label>Tamaño<select name="fontSize"><option>14</option><option selected>16</option><option>18</option><option>20</option></select></label><label>Color<select name="textColor"><option value="#1d251d">Negro</option><option value="#0b3d22">Verde Tribeca</option><option value="#8a5a00">Dorado oscuro</option><option value="#9b1c1c">Rojo</option><option value="#234e8f">Azul</option></select></label></div><label>Mensaje<textarea name="body" maxlength="2000" rows="7" required></textarea></label><label>Adjuntar documentos o imágenes<input name="messageFiles" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"><input type="hidden" name="attachmentsJson" value=""><small data-message-file-name></small></label><button class="primary-btn" type="submit">Enviar a la profesora</button></form>`;
    return `<div class="mail-app"><aside class="mail-sidebar window-panel"><h3>Mensajes</h3><button class="mail-tab is-active" type="button" data-mail-box="inbox">Recibidos <span>${inbox.filter(m=>!m.read_at).length}</span></button><button class="mail-tab" type="button" data-mail-box="sent">Enviados <span>${sent.length}</span></button><button class="mail-tab" type="button" data-mail-box="archived">Archivados <span>${archived.length}</span></button></aside><section class="window-panel mail-compose-panel"><h3>${roleTeacher()?'Escribir mensaje privado':'Mensaje para la profesora'}</h3><p class="meta">Los mensajes son privados entre profesora y alumno/a.</p>${compose}</section><section class="window-panel mail-list-panel"><div class="mail-box" data-mail-box-view="inbox"><h3>Bandeja de entrada</h3>${inbox.length?inbox.map(messageCard).join(''):'<div class="empty-state">No hay mensajes recibidos.</div>'}</div><div class="mail-box" data-mail-box-view="sent" hidden><h3>Enviados</h3>${sent.length?sent.map(messageCard).join(''):'<div class="empty-state">No hay mensajes enviados.</div>'}</div><div class="mail-box" data-mail-box-view="archived" hidden><h3>Archivados</h3>${archived.length?archived.map(messageCard).join(''):'<div class="empty-state">No hay mensajes archivados.</div>'}</div></section></div>`;
  }
  function messageCard(m){ const mine=m.sender_id===State.profile?.id; const atts=Array.isArray(m.attachments)?m.attachments:[]; return `<article class="mail-card ${!m.read_at && !mine?'is-unread':''}"><header><strong>${safe(m.subject||'Sin asunto')}</strong><span>${mine?'Enviado a '+safe(m.recipient_name||studentName(m.recipient_id)):'De '+safe(m.sender_name||studentName(m.sender_id))}</span></header><p style="font-size:${Number(m.font_size||16)}px;color:${safe(m.text_color||'inherit')}">${safe(m.body||'')}</p>${atts.length?`<div class="attachment-list">${atts.map(a=>`<a href="${safe(a.url)}" target="_blank" rel="noopener">📎 ${safe(a.name||'Archivo')}</a>`).join('')}</div>`:''}<footer><small>${fmtDT(m.created_at)}</small><div class="inline-actions">${!mine&&!m.read_at?`<button type="button" data-t28-mark-read="${safe(m.id)}">Marcar como leído</button>`:''}<button type="button" data-t16-archive-message="${safe(m.id)}">Archivar</button><button type="button" data-t28-delete-message="${safe(m.id)}">Eliminar</button></div></footer></article>`; }
  async function sendMessage(form, teacher=false){ const fd=new FormData(form); let recipientId=fd.get('recipientId'); let recipientName='Profesora'; if(!teacher){ const t=await maybe(table('profiles').select('id,full_name,username').eq('role','teacher').limit(1), []); recipientId=t?.[0]?.id; recipientName=displayName(t?.[0]); } else recipientName=studentName(recipientId); if(!recipientId) return toast('No se encontró destinatario.'); let attachments=[]; try{ attachments=fd.get('attachmentsJson')?JSON.parse(fd.get('attachmentsJson')):[]; }catch(_e){} const bodyRaw=String(fd.get('body')||'').trim(); const payload={sender_id:State.profile.id,sender_name:displayName(State.profile),recipient_id:recipientId,recipient_name:recipientName,subject:String(fd.get('subject')||'').trim(),body:teacher?bodyRaw:`${fd.get('reason')}. ${bodyRaw}`,reason:fd.get('reason')||'',font_size:Number(fd.get('fontSize')||16),text_color:fd.get('textColor')||null,attachments,is_draft:false,archived:false}; if(!payload.subject||!bodyRaw) return toast('Completa asunto y mensaje.'); const rpc=await State.client.rpc('tribeca_send_private_message_v28',{p_payload:payload}); if(rpc.error) throw rpc.error; await log('message','Mensaje enviado',{subject:payload.subject}); await loadData(true); toast('Mensaje enviado.'); form.reset(); rerender(); }
  function announcementsContent(){ const rows=visibleAnnouncements(); return `<section class="window-panel"><h3>Anuncios, avisos y noticias</h3>${rows.length?rows.map(a=>`<article class="t16-publication ${a.hidden?'is-hidden-item':''}"><h3>${safe(a.title)}</h3>${a.image_url?`<img src="${safe(a.image_url)}" alt="">`:''}<p style="font-size:${Number(a.font_size||16)}px">${safe(a.body||'')}</p>${a.link_url?`<a href="${safe(a.link_url)}" target="_blank" rel="noopener">Abrir enlace</a>`:''}${attachmentList(a)}${roleTeacher()?`<div class="inline-actions"><button data-t16-toggle-ann="${a.id}">${a.hidden?'Mostrar':'Ocultar'}</button><button data-t16-delete-ann="${a.id}">Eliminar</button></div>`:''}</article>`).join(''):'<div class="empty-state">Todavía no hay anuncios publicados.</div>'}</section>`; }
  function subjectDetailContent(subject){
    const mats=visibleMaterials(subject);
    const byUnit=new Map();
    mats.forEach(m=>{ const u=m.unit_title||m.unit||'Unidad 1'; if(!byUnit.has(u)) byUnit.set(u,[]); byUnit.get(u).push(m); });
    const i=subjectList().indexOf(subject);
    const vis=subjectVisual(subject);
    const units=[...byUnit.entries()];
    const course = roleTeacher() ? (State.selectedSubjectCourse || State.profile?.course || '') : (State.profile?.course || '');
    return `<section class="t16-subject-detail subject-detail-premium">
      <header class="subject-detail-head subject-${Math.max(i,0)%6}" style="--subject-color:${vis.color}">
        <div class="subject-detail-emblem">${safe(vis.glyph)}</div>
        <div class="subject-detail-copy">
          <span class="subject-detail-kicker">${safe(course||'Materia')}</span>
          <h2>${safe(subject)}</h2>
          <p>${mats.length} publicaciones · ${units.length||0} unidades · progreso 0%</p>
          <div class="subject-detail-progress"><span style="width:0%"></span></div>
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
  function materialCard(m){ return `<article class="t16-publication ${m.hidden?'is-hidden-item':''}"><h3>${safe(m.title)}</h3>${m.image_url?`<img src="${safe(m.image_url)}" alt="">`:''}<p style="font-size:${Number(m.font_size||16)}px">${safe(m.body||m.description||'')}</p><small>${safe(m.material_type||'material')}</small>${m.link_url?`<a href="${safe(m.link_url)}" target="_blank" rel="noopener">Abrir enlace</a>`:''}${attachmentList(m)}${roleTeacher()?`<div class="inline-actions"><button data-t16-toggle-mat="${m.id}">${m.hidden?'Mostrar':'Ocultar'}</button><button data-t16-delete-mat="${m.id}">Eliminar</button></div>`:''}</article>`; }



  function teacherSubjectsContent(){
    const stage=State.selectedSubjectStage, course=State.selectedSubjectCourse; const subjects=subjectList({stage,course});
    const custom=(State.data.subjects||[]).filter(x=>x.stage===stage&&x.course===course);
    const edit = State.pendingSubjectEdit || {};
    const editStage = edit.stage || stage, editCourse = edit.course || course, editSubject = edit.subject || '', editId = edit.id || '';
    return `<div class="teacher-subjects-layout"><section class="window-panel"><h3>Materias vistas como alumnado</h3><p class="meta">Selecciona etapa y curso para revisar las materias y sus publicaciones.</p><div class="window-grid"><label>Etapa<select data-t18-subject-stage>${options(stages,stage)}</select></label><label>Curso<select data-t18-subject-course>${options(dynamicCourses(),course)}</select></label></div><div class="subjects-grid teacher-subject-preview">${subjects.map((sub,i)=>subjectCardFor(sub,i,course)).join('')||'<div class="empty-state">Selecciona un curso con materias cargadas.</div>'}</div></section><section class="window-panel subject-editor-panel"><h3>${editSubject?'Editar materia':'Crear curso o materia'}</h3><p class="meta">Cambia etapa, curso, nombre o visibilidad. Para cursos nuevos, escribe el curso y guarda una materia.</p><form id="t27SubjectForm" class="form-grid" method="post" action="javascript:void(0)"><input type="hidden" name="id" value="${safe(editId)}"><label>Etapa<select name="stage">${options(stages,editStage)}</select></label><label>Curso<select name="course">${options(dynamicCourses(),editCourse)}</select></label><label>O escribir curso nuevo<input name="courseCustom" placeholder="Ej.: FP Medio Higiene Bucodental"></label><label>Nombre de la materia<input name="subject" required maxlength="120" value="${safe(editSubject)}" placeholder="Ej.: Cultura Clásica"></label><label class="check-line"><input type="checkbox" name="active" ${edit.active===false?'':'checked'}> Visible para el alumnado</label><div class="inline-actions"><button class="primary-btn" type="button" data-t27-save-subject>Guardar materia</button><button class="secondary-btn" type="button" data-t31-clear-subject-editor>Limpiar editor</button></div><span class="form-status" data-t31-subject-status></span></form><hr><h3>Materias añadidas o modificadas</h3>${custom.map(x=>`<article class="list-item"><strong>${safe(x.subject)}</strong><p>${safe(x.stage)} · ${safe(x.course)} · ${x.active===false?'oculta':'visible'}</p><div class="inline-actions"><button type="button" data-t27-edit-subject="${safe(x.id)}">Editar</button><button type="button" data-t27-delete-subject="${safe(x.id)}">Eliminar</button></div></article>`).join('')||'<div class="empty-state">Todavía no hay materias personalizadas para este curso.</div>'}</section></div>`;
  }
  function subjectCardFor(subject, i, course){ const mats=visibleMaterials(subject); const custom=(State.data.subjects||[]).find(x=>x.stage===State.selectedSubjectStage&&x.course===course&&x.subject===subject); const vis=subjectVisual(subject); return `<article class="subject-card subject-${i%6}" tabindex="0" role="button" data-subject="${safe(subject)}" style="--subject-color:${vis.color}"><div class="subject-top"><span>${safe(course||'')}</span>${roleTeacher()?`<button type="button" class="subject-menu-btn" data-t29-subject-menu="${safe(custom?.id||'')}" data-subject-name="${safe(subject)}">⋯</button>`:''}</div><div class="subject-mark">${safe(vis.glyph)}</div><h3>${safe(subject)}</h3><p>${mats.length} publicaciones · ${new Set(mats.map(m=>m.unit_title||m.unit||'Unidad 1')).size||0} unidades</p><div class="progress-row"><span>Progreso</span><strong>0%</strong></div><div class="progress"><span style="width:0%"></span></div><small>Haz clic para abrir la materia.</small>${roleTeacher()?`<div class="subject-inline-actions"><button type="button" data-t29-new-material="${safe(subject)}">Publicar material</button>${custom?`<button type="button" data-t27-edit-subject="${safe(custom.id)}">Editar</button><button type="button" data-t27-delete-subject="${safe(custom.id)}">Eliminar</button>`:`<button type="button" data-t29-create-custom-subject="${safe(subject)}">Editar/ocultar</button>`}</div>`:''}</article>`; }
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
  function guidanceCard(g,teacher=false){
    const a=Array.isArray(g.attachments)?g.attachments[0]:null;
    const typeLabel=guidanceTypeLabel(g);
    return `<article class="guidance-card-premium ${g.hidden?'is-hidden-item':''}"><div class="guidance-card-icon">${safe(guidanceTypeIcon(g))}</div><div class="guidance-card-body"><div class="guidance-card-top"><span>${safe(typeLabel)}</span>${g.hidden?'<em>Oculto</em>':''}</div><h3>${safe(g.title)}</h3><p>${safe(g.body||'')}</p><div class="guidance-actions">${g.link_url?`<a class="secondary-btn" href="${safe(g.link_url)}" target="_blank" rel="noopener">Abrir recurso</a>`:''}${a?attachmentList({attachments:[a]}):''}${teacher?`<button type="button" data-t35-edit-guidance="${safe(g.id)}">Editar</button><button type="button" data-t18-toggle-guidance="${safe(g.id)}">${g.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t18-delete-guidance="${safe(g.id)}">Eliminar</button>`:''}</div></div></article>`;
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

  function profileContent(){ const p=State.profile, notify=p.notification_preferences||{}; return `<div class="profile-sections"><section class="window-panel"><h3>Icono de perfil</h3><form id="t16ProfileIconForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><div class="icon-grid t16-icon-grid">${icon100.map(ic=>`<button type="button" class="icon-choice ${(p.avatar_icon||'💡')===ic?'is-selected':''}" data-t16-avatar="${safe(ic)}">${safe(ic)}</button>`).join('')}</div><input type="hidden" name="avatarIcon" value="${safe(p.avatar_icon||'💡')}">${roleTeacher()?`<label>Imagen de perfil de profesora<input name="profileImage" type="file" accept="image/png,image/jpeg,image/webp"><input type="hidden" name="avatarImageUrl" value="${safe(p.avatar_image_url||'')}"><span id="profileImagePreview" class="profile-preview-avatar">${p.avatar_image_url?`<img src="${safe(p.avatar_image_url)}" alt="">`:safe(p.avatar_icon||'💡')}</span></label>`:''}<button class="primary-btn" type="submit">Guardar icono</button></form></section><section class="window-panel"><h3>Notificaciones por email</h3><form id="t16ProfileNotificationsForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><label>Email personal<input name="personalEmail" type="email" value="${safe(p.personal_email||'')}"></label><div class="notification-options"><label><input type="checkbox" name="messages" ${notify.messages?'checked':''}> Mensajes</label><label><input type="checkbox" name="calendar" ${notify.calendar?'checked':''}> Calendario</label><label><input type="checkbox" name="announcements" ${notify.announcements?'checked':''}> Anuncios</label><label><input type="checkbox" name="materials" ${notify.materials?'checked':''}> Materiales</label></div><button class="secondary-btn" type="submit">Guardar notificaciones</button></form></section><section class="window-panel"><h3>Seguridad</h3><form id="t16PasswordForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><label>Nueva contraseña<input name="password" type="password" minlength="6" required></label><label>Repetir contraseña<input name="repeat" type="password" minlength="6" required></label><button class="secondary-btn" type="submit">Modificar contraseña</button></form><hr><form id="t16OwnResetForm"><button class="link-button" type="submit">Solicitar recuperación de contraseña</button></form></section>${!roleTeacher()?`<section class="window-panel"><h3>Datos académicos</h3><p>${safe(academicLine(p))}</p><p class="meta">Estos datos solo puede modificarlos la profesora.</p></section>`:''}</div>`; }
  async function saveProfileIcon(form){ const fd=new FormData(form); const patch={avatar_icon:fd.get('avatarIcon')||'💡'}; if(roleTeacher()) patch.avatar_image_url=fd.get('avatarImageUrl')||null; const {error}=await table('profiles').update(patch).eq('id',State.profile.id); if(error) throw error; Object.assign(State.profile,patch); updateTopProfile(); await updatePresence(); toast('Icono guardado correctamente.'); }
  async function saveProfileNotifications(form){ const fd=new FormData(form); const prefs={messages:!!fd.get('messages'),calendar:!!fd.get('calendar'),announcements:!!fd.get('announcements'),materials:!!fd.get('materials')}; const patch={personal_email:fd.get('personalEmail')||null,notification_preferences:prefs}; await maybe(table('profiles').update(patch).eq('id',State.profile.id)); Object.assign(State.profile,patch); toast('Preferencias guardadas.'); }
  async function changePassword(form){ const fd=new FormData(form); if(fd.get('password')!==fd.get('repeat')) return toast('Las contraseñas no coinciden.'); if(!confirm('¿Quieres modificar tu contraseña?')) return; const {error}=await State.client.auth.updateUser({password:fd.get('password')}); if(error) toast('No se pudo modificar la contraseña.'); else {toast('Contraseña modificada correctamente.'); form.reset();} }

  function difficultiesContent(){ const rows=State.data.difficulties||[]; return `<div class="window-grid"><section class="window-panel"><h3>Añadir o modificar materia</h3><form id="t16DifficultyForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><input type="hidden" name="id"><label>Materia<select name="subject">${subjectList().map(s=>`<option>${safe(s)}</option>`).join('')}</select></label><label>Nivel de dificultad<select name="level"><option>Baja</option><option selected>Media</option><option>Alta</option><option>Muy alta</option></select></label><label>Notas<textarea name="notes" rows="4"></textarea></label><button class="primary-btn" type="submit">Guardar</button></form></section><section class="window-panel"><h3>Mis materias con dificultades</h3>${rows.length?rows.map(d=>`<article class="list-item"><strong>${safe(d.subject)}</strong><p>${safe(d.level)} · ${safe(d.notes||'')}</p><button data-t16-edit-diff="${d.id}">Editar</button><button data-t16-delete-diff="${d.id}">Eliminar</button></article>`).join(''):'<div class="empty-state">No has indicado materias con dificultades.</div>'}</section></div>`; }
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
    return `<div class="grades-tool"><section class="window-panel grade-form-panel"><h3>Nueva calificación</h3><p class="meta">Añade tus notas del centro escolar. La media se calcula automáticamente por asignatura y por evaluación.</p><form id="t16GradeForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid grade-form"><input type="hidden" name="id"><label>Materia<select name="subject" required>${subjectOptions}</select></label><label>Unidad didáctica<input name="unit" maxlength="80" required placeholder="Ej.: Unidade 5"></label><label>Evaluación<select name="evaluation" required><option>Primera evaluación</option><option>Segunda evaluación</option><option>Tercera evaluación</option></select></label><label>Tipo de prueba<select name="type" required><option>Examen</option><option>Trabajo</option><option>Presentación</option><option>Examen oral</option></select></label><label>Nota<input name="grade" type="number" step="0.01" min="0" max="10" required placeholder="0-10"></label><label>Ponderación opcional (%)<input name="weight" type="number" step="1" min="0" max="100" placeholder="Vacío = media normal"></label><button class="primary-btn" type="button" data-t29-save-grade onclick="return window.TribecaSaveGradeDirect(this,event)">Guardar calificación</button><div id="gradeSaveStatus" class="form-status" aria-live="polite"></div></form></section><section class="window-panel grade-summary-panel"><h3>Media total de todas las evaluaciones</h3><div class="t16-grade-summary ${overall.cls}"><strong>${overall.avg}</strong><span>${safe(overall.label)}</span></div><h3>Media por asignatura y evaluación</h3><div class="grade-average-grid">${subjectCards}</div></section><section class="window-panel grade-table-panel"><h3>Tabla de calificaciones</h3><div class="table-wrap"><table class="grades-table"><thead><tr><th>Materia</th><th>Unidad</th><th>Evaluación</th><th>Tipo</th><th>Ponderación</th><th>Nota</th><th>Acciones</th></tr></thead><tbody>${tableRows}</tbody></table></div></section></div>`;
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
  function badgesContent(){ const earned=(State.data.userBadges||[]).filter(b=>b.user_id===State.profile.id || b.student_id===State.profile.id); return `<section class="window-panel"><h3>Mis insignias</h3><p class="meta">Las insignias se conceden manualmente desde el panel docente.</p>${earned.length?earned.map(b=>`<article class="r10-badge-card"><span class="badge-icon">${safe(badgeIcon(b.badge_code))}</span><div><strong>${safe(b.badge_name||badgeName(b.badge_code))}</strong><p>Asignada por la profesora.</p></div></article>`).join(''):'<div class="empty-state">Todavía no tienes insignias asignadas.</div>'}</section>`; }

  function claimableMaterials(){ const claimed=new Set((State.data.badgeClaims||[]).filter(c=>c.user_id===State.profile?.id).map(c=>`${c.material_id}:${c.badge_code}`)); return visibleMaterials().filter(m=>Array.isArray(m.badge_codes)&&m.badge_codes.some(c=>!claimed.has(`${m.id}:${c}`))); }
  async function claimBadge(materialId){ const mat=visibleMaterials().find(m=>m.id===materialId); if(!mat) return; for(const code of mat.badge_codes||[]) await maybe(table('badge_claim_requests').insert({user_id:State.profile.id, material_id:mat.id, material_title:mat.title, badge_code:code, status:'pending'})); await log('badge_claim','Insignia reclamada',{material:mat.title}); await loadData(true); toast('Solicitud enviada a la profesora.'); rerender(); }



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
  window.TribecaPrintPaymentsPdf = function(kind){ const title = kind==='student'?'Histórico de pagos del alumno':'Resumen mensual de pagos'; const source = kind==='student' ? document.querySelector('.payment-history-panel') : document.querySelector('.payments-summary'); const html = source ? source.innerHTML : document.querySelector('.payments-layout')?.innerHTML || ''; const w = window.open('', '_blank'); if(!w) return toast('No se pudo abrir la ventana de impresión.'); const logo = 'assets/logo-tribeca.png'; w.document.write(`<html><head><title>${title}</title><style>@page{margin:18mm}body{font-family:Georgia,serif;padding:0;color:#172018}.pdf-head{display:flex;align-items:center;gap:14px;border-bottom:2px solid #b99a3b;padding-bottom:12px;margin-bottom:22px}.pdf-head img{width:54px;height:54px;object-fit:contain}.pdf-head strong{font-size:22px}.pdf-head span{display:block;color:#686052;font-size:12px}h1{font-size:21px;margin:0 0 18px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}.primary-btn,.secondary-btn,button{display:none!important}</style></head><body><header class="pdf-head"><img src="${logo}" alt="Tribeca Aula"><div><strong>Tribeca Aula</strong><span>Documento generado desde el panel docente</span></div></header><h1>${title}</h1>${html}</body></html>`); w.document.close(); setTimeout(()=>w.print(),250); };
  function wireManagedForms(root=document){ root.querySelectorAll('form').forEach(form=>{ if(form.dataset.tribecaWired) return; form.dataset.tribecaWired='1'; form.setAttribute('method','post'); form.setAttribute('action','javascript:void(0)'); form.addEventListener('submit', ev=>window.TribecaSubmitForm(form, ev), true); }); }
  function bindGlobal() {
    window.addEventListener('click', async ev=>{ const btn=ev.target.closest?.('[data-t24-save-student]'); if(btn){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); const f=btn.closest('form'); if(f) await saveStudentProfile(f); } }, true);
    document.addEventListener('click', async ev=>{
      const mailTab=ev.target.closest?.('[data-mail-box]'); if(mailTab){ const box=mailTab.dataset.mailBox; const root=mailTab.closest('.mail-app'); root?.querySelectorAll('.mail-tab').forEach(b=>b.classList.toggle('is-active', b===mailTab)); root?.querySelectorAll('[data-mail-box-view]').forEach(v=>v.hidden=v.dataset.mailBoxView!==box); return; }
      const logout=ev.target.closest?.('#logoutButton,[data-action="logout"]'); if(logout){ ev.preventDefault(); ev.stopImmediatePropagation(); signOut(); return; }
      const prof=ev.target.closest?.('#profileButton'); if(prof){ ev.preventDefault(); ev.stopImmediatePropagation(); openTool('profile'); return; }
      const dataTool=ev.target.closest?.('[data-tool]'); if(dataTool){ ev.preventDefault(); ev.stopImmediatePropagation(); openTool(dataTool.dataset.tool); return; }
      const undoBtn=ev.target.closest?.('[data-t30-undo]'); if(undoBtn){ ev.preventDefault(); ev.stopPropagation(); await undoLast(); return; } const teacherTool=ev.target.closest?.('[data-t16-tool]'); if(teacherTool){ ev.preventDefault(); openTool(teacherTool.dataset.t16Tool); return; }
      if(ev.target.closest?.('[data-t16-close]')){ const w=ev.target.closest('.tool-window'); State.windows.delete(w?.dataset.window); w?.remove(); return; }
      if(ev.target.closest?.('[data-t16-min]')){ ev.target.closest('.tool-window')?.classList.add('is-hidden'); return; }
      if(ev.target.closest?.('[data-t16-max]')){ ev.target.closest('.tool-window')?.classList.toggle('is-maximized'); return; }
      const saveStudentBtn=ev.target.closest?.('[data-t24-save-student],[data-t23-save-student],[data-t22-save-student],[data-t21-save-student]'); if(saveStudentBtn){ const f=saveStudentBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await handleManagedSubmit(f); } return; }
      const saveEventBtn=ev.target.closest?.('[data-t25-save-event]'); if(saveEventBtn){ const f=saveEventBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveEvent(f); } return; }
      const saveGuidanceBtn=ev.target.closest?.('[data-t24-save-guidance]'); if(saveGuidanceBtn){ const f=saveGuidanceBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveGuidance(f); } return; }
      const saveGradeBtn=ev.target.closest?.('[data-t25-save-grade],[data-t26-save-grade],[data-t29-save-grade]'); if(saveGradeBtn){ const f=saveGradeBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveGrade(f); } return; }
      const avatar=ev.target.closest?.('[data-t16-avatar]'); if(avatar){ const f=avatar.closest('form'); f.querySelectorAll('.icon-choice').forEach(b=>b.classList.remove('is-selected')); avatar.classList.add('is-selected'); f.elements.avatarIcon.value=avatar.dataset.t16Avatar; return; }
      const emoji=ev.target.closest?.('[data-t16-emoji]'); if(emoji){ const ta=emoji.closest('form')?.elements.body; if(ta){ta.value+=emoji.dataset.t16Emoji; ta.focus();} return; }
      const day=ev.target.closest?.('[data-t16-day]'); if(day){ State.selectedDate=day.dataset.t16Day; State.selectedEventId=null; State.calendarMonth=startMonth(parseIso(State.selectedDate)); rerender(); return; }
      if(ev.target.closest?.('[data-t16-cal-prev]')){ State.calendarMonth=new Date(State.calendarMonth.getFullYear(),State.calendarMonth.getMonth()-1,1); rerender(); return; }
      if(ev.target.closest?.('[data-t16-cal-next]')){ State.calendarMonth=new Date(State.calendarMonth.getFullYear(),State.calendarMonth.getMonth()+1,1); rerender(); return; }
      const eventBtn=ev.target.closest?.('[data-t16-event]'); if(eventBtn){ State.selectedEventId=eventBtn.dataset.t16Event; const e=relevantEvents().find(x=>x.id===State.selectedEventId); if(e){State.selectedDate=e.date;State.calendarMonth=startMonth(parseIso(e.date));} rerender(); return; }
      const hideE=ev.target.closest?.('[data-t16-hide-event]'); if(hideE){ await maybe(table('calendar_events').update({hidden:true}).eq('id',hideE.dataset.t16HideEvent)); await loadData(true); rerender(); return; }
      const delE=ev.target.closest?.('[data-t16-delete-event]'); if(delE){ if(confirm('¿Eliminar esta fecha?')){ await maybe(table('calendar_events').delete().eq('id',delE.dataset.t16DeleteEvent)); await loadData(true); rerender(); } return; }
      const st=ev.target.closest?.('[data-t16-select-student]'); if(st){ State.selectedStudentId=st.dataset.t16SelectStudent; rerender(); return; }
      const attToggle=ev.target.closest?.('[data-t22-attendance-toggle]'); if(attToggle && !ev.target.closest('button')){ await toggleAttendance(attToggle); return; }
      const attBtn=ev.target.closest?.('[data-t16-attendance]'); if(attBtn){ await saveAttendance(attBtn); return; }
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

      const newMat=ev.target.closest?.('[data-t29-new-material]'); if(newMat){ ev.preventDefault(); ev.stopPropagation(); State.prefillPublicationSubject=newMat.dataset.t29NewMaterial; openTool('newPublication'); return; }
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
    document.addEventListener('submit', async ev=>{ const f=ev.target; const ids=['t16LoginForm','t16ResetForm','t16PublicationForm','t16EventForm','t16AssignBadgeForm','t16StudentProfileForm','t24StudentProfileForm','t16StudentMessageForm','t16TeacherMessageForm','t16ProfileIconForm','t16ProfileNotificationsForm','t16PasswordForm','t16OwnResetForm','t16DifficultyForm','t16GradeForm','t16BillingForm','t18GuidanceForm','t24GuidanceForm','t27SubjectForm','contactForm']; if(!ids.includes(f.id)) return; ev.preventDefault(); ev.stopImmediatePropagation(); await handleManagedSubmit(f); }, true);
    document.addEventListener('input', ev=>{ if(ev.target?.dataset?.t16StudentSearch!==undefined){ const q=ev.target.value.toLowerCase(); ev.target.closest('.window-panel,form')?.querySelectorAll('[data-student-name]').forEach(el=>{el.hidden=q && !el.dataset.studentName.includes(q);}); } }, true);
    document.addEventListener('change', async ev=>{ if(ev.target?.id==='languageSelect'){ applyTranslations(document); return; } if(ev.target?.name==='imageFile' && ev.target.files?.[0]){ const url=await normImage(ev.target.files[0]); ev.target.form.elements.imageUrl.value=url; $('#t16ImagePreview', ev.target.form).innerHTML=`<img src="${safe(url)}" alt="">`; } if(ev.target?.name==='attachmentFiles' && ev.target.files?.length){ const files=await Promise.all(Array.from(ev.target.files).map(async file=>({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}))); ev.target.form.elements.attachmentsJson.value=JSON.stringify(files); const box=$('#attachmentPreview', ev.target.form); if(box) box.textContent=files.map(f=>f.name).join(', '); } if(ev.target?.name==='messageFiles' && ev.target.files?.length){ const files=await Promise.all(Array.from(ev.target.files).map(async file=>({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}))); ev.target.form.elements.attachmentsJson.value=JSON.stringify(files); const n=ev.target.form.querySelector('[data-message-file-name]'); if(n) n.textContent=files.map(f=>f.name).join(', '); } if(ev.target?.name==='guidanceFile' && ev.target.files?.[0]){ const file=ev.target.files[0]; ev.target.form.elements.attachmentJson.value=JSON.stringify({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}); const n=ev.target.form.querySelector('#guidanceFileName'); if(n) n.textContent=file.name; } if(ev.target?.name==='profileImage' && ev.target.files?.[0]){ const url=await normImage(ev.target.files[0]); ev.target.form.elements.avatarImageUrl.value=url; $('#profileImagePreview', ev.target.form).innerHTML=`<img src="${safe(url)}" alt="">`; } if(ev.target?.dataset?.t16BillingMonth!==undefined){ State.billingMonth=ev.target.value; rerender(); } if(ev.target?.dataset?.t18SubjectStage!==undefined){ State.selectedSubjectStage=ev.target.value; localStorage.setItem('tribeca-teacher-subject-stage', ev.target.value); rerender(); } if(ev.target?.dataset?.t18SubjectCourse!==undefined){ State.selectedSubjectCourse=ev.target.value; localStorage.setItem('tribeca-teacher-subject-course', ev.target.value); rerender(); } }, true);
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
  const textSource = new WeakMap();
  function currentLang(){ return document.querySelector('#languageSelect')?.selectedOptions?.[0]?.textContent?.trim() || document.querySelector('#languageSelect')?.value || 'Castellano'; }
  function applyTranslations(root=document){
    const lang=currentLang();
    const target = lang && lang !== 'Castellano' ? lang : null;
    const container = root.body || root;
    const walker=document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {acceptNode:n=>{
      const t=(textSource.get(n) || n.nodeValue || '').trim();
      if(!t || t.length>160) return NodeFilter.FILTER_REJECT;
      if(!textSource.has(n)) textSource.set(n, n.nodeValue.trim());
      const src=textSource.get(n).trim();
      return BASE_TRANSLATIONS[src] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }});
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{ const src=textSource.get(n).trim(); const out=target ? (BASE_TRANSLATIONS[src]?.[target] || src) : src; n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), out); });
    document.documentElement.lang = target==='Galego'?'gl':target==='English'?'en':target==='Français'?'fr':target==='Polski'?'pl':target==='Deutsch'?'de':target==='Português'?'pt':'es';
  }
  async function boot() {
    document.body.classList.remove('is-dark','dark-mode','theme-dark');
    try { localStorage.removeItem('tribeca-theme'); localStorage.removeItem('theme'); } catch(_) {}
    document.querySelectorAll('.theme-toggle,[data-theme-toggle],#themeToggle,#themeSelect').forEach(el=>{ const wrap=el.closest('label,.select-wrap,.control-field')||el; wrap.remove(); });
    State.client = configured && window.supabase?.createClient ? window.supabase.createClient(cfg.url, cfg.anonKey, { auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true} }) : null;
    bindGlobal(); wireManagedForms(); new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{ if(n.nodeType===1){ wireManagedForms(n); applyTranslations(n); } }))).observe(document.body,{childList:true,subtree:true}); if(!State.client){ showLogin(); return; }
    try { await hydrate(true); } catch(e) { console.warn(e); }
    if(State.user && State.profile){ hideLogin(); renderApp(); } else showLogin();
    setInterval(async()=>{ if(!State.profile) return; await updatePresence(); updateBadges(); }, 45000);
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
