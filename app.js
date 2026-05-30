const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const SETTINGS_VERSION = '0.1.4';

const I18N = {
  es: {
    schoolYear: 'Curso 2025/26', navSubjects: 'Mis materias', navCalendar: 'Calendario', navMessages: 'Mensajes', navChat: 'Chat', navAnnouncements: 'Anuncios', zoomLabel: 'Texto', readingLabel: 'Lectura', fontDefault: 'Por defecto', languageLabel: 'Idioma', themeLight: 'Claro', themeDark: 'Oscuro', profile: 'Mi perfil', profileData: 'Datos académicos', support: 'Soporte', logout: 'Cerrar sesión', welcomeEyebrow: 'Panel personal de aprendizaje', hello: 'Hola', quote: 'La educación es el arma más poderosa que puedes usar para cambiar el mundo.', centerTitle: 'Mi centro educativo', viewAcademicProfile: 'Ver datos académicos', badgesTitle: 'Mis insignias', noBadgesYet: 'Sin insignias todavía.', seeBadges: 'Ver insignias', difficultSubjectsTitle: 'Mis materias con dificultades', difficultSubjectsText: 'Indica dónde necesitas más refuerzo.', viewUpdate: 'Ver o actualizar', gradesTitle: 'Mis calificaciones', gradesText: 'Registra tus notas del centro escolar.', viewGrades: 'Ver calificaciones', subjectsTitle: 'Mis materias', subjectSupport: 'Apoyo personalizado', subjectBio: 'Biología y Geología', subjectFrench: 'Francés', subjectSpanish: 'Lengua Castellana', subjectGalician: 'Lingua Galega', zeroPosts: '0 publicación(es) asignada(s)', zeroUnits: '0 unidad(es)', oneUnit: '1 unidad', progress: 'Progreso', noActivities: 'Sin actividades completadas todavía', legalNotice: 'Aviso legal', contact: 'Contacto', footerDescription: 'Tribeca Academia es un centro de pedagogía y refuerzo educativo que adapta la enseñanza a cada persona, aprovecha sus oportunidades de mejora y ofrece clases desde Primaria hasta adultos.',
    toolCalendar: 'Calendario', toolMessages: 'Mensajes', toolChat: 'Chat instantáneo', toolAnnouncements: 'Anuncios', toolContact: 'Contacto', toolSupport: 'Soporte', toolLegal: 'Aviso legal', toolProfile: 'Datos académicos', toolBadges: 'Insignias', toolDifficulties: 'Materias con dificultades', toolGrades: 'Calificaciones',
    requiredFields: 'Revisa los campos obligatorios antes de enviar.', contactReady: 'Se abrirá tu correo para enviar la consulta a Tribeca Academia.', saved: 'Guardado correctamente.', deleted: 'Eliminado correctamente.', preparedSupabase: 'Acción preparada para la integración con Supabase.', logoutReady: 'Cierre de sesión preparado para la fase de autenticación.',
    noDifficultySelected: 'No has indicado materias con dificultad.', difficultySelected: 'Materias indicadas:', teacherNotice: 'Cambio visible para la profesora. Se mostrará una señal en su panel.', difficultyFormTitle: 'Añadir o modificar materia', subject: 'Materia', level: 'Nivel de dificultad', notes: 'Observaciones', saveDifficulty: 'Guardar materia', currentDifficulties: 'Materias registradas', edit: 'Modificar', remove: 'Eliminar', noRecords: 'No hay registros todavía.', low: 'Leve', medium: 'Media', high: 'Alta',
    badgesIntro: 'El alumnado comienza sin insignias. La profesora podrá asignarlas por valores, actitudes o logros concretos, y algunas se obtendrán al completar actividades.', availableBadges: 'Insignias disponibles', earnedBadges: 'Insignias conseguidas', noEarnedBadges: 'Este alumno todavía no tiene insignias.',
    gradesIntro: 'Introduce las calificaciones que obtienes durante el curso. La media será aritmética si no hay ponderación y ponderada cuando exista alguna ponderación.', addGrade: 'Añadir o modificar calificación', didacticUnit: 'Unidad didáctica', evaluation: 'Evaluación', testType: 'Tipo de prueba', grade: 'Nota', weight: 'Ponderación opcional', saveGrade: 'Guardar calificación', gradeRecords: 'Registros de calificaciones', averages: 'Medias por materia y evaluación', arithmeticMean: 'Media aritmética', weightedMean: 'Media ponderada', firstEval: 'Primera evaluación', secondEval: 'Segunda evaluación', thirdEval: 'Tercera evaluación', exam: 'Examen', project: 'Trabajo', presentation: 'Presentación', oralExam: 'Examen oral', ordinaryWeight: 'Normal',
    calendarUsefulDates: 'Fechas útiles', calendarAddEvent: 'Añadir evento', calendarTitle: 'Título', date: 'Fecha', visibility: 'Visibilidad', onlyMe: 'Solo para mí', wholeClass: 'Publicar evento para toda mi clase', allStudentsTeacher: 'Visible para todo el alumnado y profesora', saveEvent: 'Guardar evento', calendarContext: 'Vista del calendario', today: 'Hoy', eventLegend: 'Leyenda', national: 'Estatal', galicia: 'Galicia', local: 'Local', school: 'Escolar', personal: 'Personal', proposed: 'Propuesta 2026/27', nextUsefulDates: 'Próximas fechas mostradas', noUpcomingEvents: 'No hay fechas próximas en esta vista.',
    messagesSystem: 'Sistema de mensajes', inbox: 'Recibidos', sent: 'Enviados', drafts: 'Borradores', archived: 'Archivados', teacher: 'Profesora', recipient: 'Para', messageSubject: 'Asunto', message: 'Mensaje', saveDraft: 'Guardar borrador', teacherReminder: 'Recuerda revisar las actividades de repaso antes de la próxima clase.', unread: 'No leído', todayShort: 'Hoy',
    chatPrepared: 'Chat instantáneo preparado para conectar usuarios de la plataforma cuando integremos Supabase.', sampleMessage: 'Mensaje de prueba.', writeMessage: 'Escribe un mensaje...', send: 'Enviar',
    announcementsWall: 'Muro de anuncios', welcomeAnnouncementTitle: 'Bienvenida a Tribeca Aula', welcomeAnnouncementText: 'Este espacio recogerá avisos generales de la profesora, comunicaciones y noticias que no pertenezcan a una materia concreta.', allStudents: 'Visible para todo el alumnado', endCourseReminder: 'Recordatorio de final de curso', endCourseText: 'Revisad el calendario y los mensajes privados para confirmar tareas pendientes.', publishedByTeacher: 'Publicado por Patri', newAnnouncement: 'Nueva publicación, profesora', addressees: 'Destinatarios', text: 'Texto', publishAnnouncement: 'Publicar anuncio', concreteGroup: 'Centro, etapa y curso concretos', familiesAdults: 'Solo familias/adultos',
    contactForm: 'Formulario de contacto', contactIntro: 'La consulta se dirigirá a tribecaacademia@gmail.com. En esta versión estática se abrirá el programa de correo del dispositivo.', fullName: 'Nombre y apellidos', phone: 'Teléfono', email: 'Email', inquiryType: 'Tipo de consulta', selectOption: 'Selecciona una opción', prices: 'Información sobre precios', schedules: 'Horarios disponibles', methodology: 'Metodología de trabajo', primaryClasses: 'Clases de Primaria', esoClasses: 'Clases de ESO', bachClasses: 'Clases de Bachillerato', adultClasses: 'Clases para adultos', modality: 'Modalidad presencial u online', platformIssue: 'Incidencia con la plataforma', otherInquiry: 'Otra consulta', shortMessage: 'Mensaje breve, máximo 600 caracteres', prepareEmail: 'Preparar email',
    supportText: 'Para incidencias de acceso, visualización, mensajes o calendario, abre el formulario de contacto y selecciona “Incidencia con la plataforma”.', goContact: 'Ir a contacto',
    legalTitle: 'Aviso legal', legalText1: 'Tribeca Academia, con domicilio en Calle Rafael Juan, 33, 15130, Corcubión, A Coruña, es responsable de este sitio web educativo denominado Tribeca Aula.', legalText2: 'La plataforma se encuentra en fase de desarrollo y prueba. Su uso actual es meramente demostrativo y no debe emplearse todavía para tratar datos personales reales de alumnado, familias o profesorado.', legalText3: 'Los contenidos, materiales, diseños, textos, imágenes y elementos gráficos de Tribeca Aula pertenecen a Tribeca Academia o se utilizan con autorización. No se permite su reproducción, distribución o comunicación pública sin consentimiento previo.', legalText4: 'Antes de la puesta en funcionamiento real deberán incorporarse la política de privacidad, la política de cookies, las condiciones de uso, la información sobre protección de datos y los mecanismos de consentimiento que correspondan.', legalText5: 'El formulario de contacto se dirige a tribecaacademia@gmail.com. La persona usuaria debe facilitar datos veraces y utilizar la plataforma con respeto, diligencia y buena fe.',
    academicData: 'Datos académicos del alumno', assignedByTeacher: 'Centro educativo, asignado por la profesora', stage: 'Etapa', course: 'Curso', academicLocked: 'El alumnado no podrá modificar estos datos. La profesora podrá cambiarlos en cualquier momento y el sistema promocionará automáticamente el curso cuando proceda.', preparedCenters: 'Centros preparados', promotionRules: 'Promoción automática', promotionText: 'Cada nuevo curso el alumnado promocionará al curso siguiente. En 4.º de ESO y 2.º de Bachillerato se avisará a la profesora para revisar manualmente el centro, etapa y curso.',
    demoContext: 'Usuario demo: Academia en Corcubión', ceeContext: 'Alumno/a del IES Fernando Blanco, Cee', fisterraContext: 'Alumno/a del IES Fin do Camiño, Fisterra', corcubionContext: 'Alumno/a del CEIP Praia de Quenxe, Corcubión'
  },
  gl: {}, en: {}, fr: {}, pl: {}, de: {}, pt: {}
};

Object.assign(I18N.gl, {
  schoolYear:'Curso 2025/26', navSubjects:'As miñas materias', navCalendar:'Calendario', navMessages:'Mensaxes', navChat:'Chat', navAnnouncements:'Anuncios', zoomLabel:'Texto', readingLabel:'Lectura', fontDefault:'Por defecto', languageLabel:'Idioma', themeLight:'Claro', themeDark:'Escuro', profile:'O meu perfil', profileData:'Datos académicos', support:'Soporte', logout:'Pechar sesión', welcomeEyebrow:'Panel persoal de aprendizaxe', hello:'Ola', quote:'A educación é a arma máis poderosa que podes usar para cambiar o mundo.', centerTitle:'O meu centro educativo', viewAcademicProfile:'Ver datos académicos', badgesTitle:'As miñas insignias', noBadgesYet:'Aínda sen insignias.', seeBadges:'Ver insignias', difficultSubjectsTitle:'Materias con dificultade', difficultSubjectsText:'Indica onde precisas máis reforzo.', viewUpdate:'Ver ou actualizar', gradesTitle:'As miñas cualificacións', gradesText:'Rexistra as túas notas do centro escolar.', viewGrades:'Ver cualificacións', subjectsTitle:'As miñas materias', subjectSupport:'Apoio personalizado', subjectBio:'Bioloxía e Xeoloxía', subjectFrench:'Francés', subjectSpanish:'Lingua Castelá', subjectGalician:'Lingua Galega', zeroPosts:'0 publicación(s) asignada(s)', zeroUnits:'0 unidade(s)', oneUnit:'1 unidade', progress:'Progreso', noActivities:'Sen actividades completadas aínda', legalNotice:'Aviso legal', contact:'Contacto', footerDescription:'Tribeca Academia é un centro de pedagoxía e reforzo educativo que adapta o ensino a cada persoa, aproveita as súas oportunidades de mellora e ofrece clases desde Primaria ata adultos.', toolCalendar:'Calendario', toolMessages:'Mensaxes', toolChat:'Chat instantáneo', toolAnnouncements:'Anuncios', toolContact:'Contacto', toolSupport:'Soporte', toolLegal:'Aviso legal', toolProfile:'Datos académicos', toolBadges:'Insignias', toolDifficulties:'Materias con dificultade', toolGrades:'Cualificacións'
});
Object.assign(I18N.en, {
  schoolYear:'School year 2025/26', navSubjects:'My subjects', navCalendar:'Calendar', navMessages:'Messages', navChat:'Chat', navAnnouncements:'Announcements', zoomLabel:'Text', readingLabel:'Reading', fontDefault:'Default', languageLabel:'Language', themeLight:'Light', themeDark:'Dark', profile:'My profile', profileData:'Academic data', support:'Support', logout:'Log out', welcomeEyebrow:'Personal learning panel', hello:'Hello', quote:'Education is the most powerful weapon which you can use to change the world.', centerTitle:'My school', viewAcademicProfile:'View academic data', badgesTitle:'My badges', noBadgesYet:'No badges yet.', seeBadges:'View badges', difficultSubjectsTitle:'Subjects I find difficult', difficultSubjectsText:'Indicate where you need more support.', viewUpdate:'View or update', gradesTitle:'My grades', gradesText:'Record your school marks.', viewGrades:'View grades', subjectsTitle:'My subjects', subjectSupport:'Personalized support', subjectBio:'Biology and Geology', subjectFrench:'French', subjectSpanish:'Spanish Language', subjectGalician:'Galician Language', zeroPosts:'0 assigned post(s)', zeroUnits:'0 unit(s)', oneUnit:'1 unit', progress:'Progress', noActivities:'No completed activities yet', legalNotice:'Legal notice', contact:'Contact', footerDescription:'Tribeca Academia is a pedagogy and educational support centre that adapts teaching to each person, makes use of every learner’s opportunities for improvement and offers classes from Primary Education to adults.', toolCalendar:'Calendar', toolMessages:'Messages', toolChat:'Instant chat', toolAnnouncements:'Announcements', toolContact:'Contact', toolSupport:'Support', toolLegal:'Legal notice', toolProfile:'Academic data', toolBadges:'Badges', toolDifficulties:'Difficult subjects', toolGrades:'Grades'
});
Object.assign(I18N.fr, {
  schoolYear:'Année 2025/26', navSubjects:'Mes matières', navCalendar:'Calendrier', navMessages:'Messages', navChat:'Chat', navAnnouncements:'Annonces', zoomLabel:'Texte', readingLabel:'Lecture', fontDefault:'Par défaut', languageLabel:'Langue', themeLight:'Clair', themeDark:'Sombre', profile:'Mon profil', profileData:'Données scolaires', support:'Support', logout:'Se déconnecter', welcomeEyebrow:'Tableau personnel d’apprentissage', hello:'Bonjour', quote:'L’éducation est l’arme la plus puissante que vous puissiez utiliser pour changer le monde.', centerTitle:'Mon établissement', viewAcademicProfile:'Voir les données scolaires', badgesTitle:'Mes badges', noBadgesYet:'Aucun badge pour le moment.', seeBadges:'Voir les badges', difficultSubjectsTitle:'Matières difficiles', difficultSubjectsText:'Indique où tu as besoin de soutien.', viewUpdate:'Voir ou modifier', gradesTitle:'Mes notes', gradesText:'Enregistre tes notes scolaires.', viewGrades:'Voir les notes', subjectsTitle:'Mes matières', subjectSupport:'Soutien personnalisé', subjectBio:'Biologie et Géologie', subjectFrench:'Français', subjectSpanish:'Langue espagnole', subjectGalician:'Langue galicienne', zeroPosts:'0 publication(s) assignée(s)', zeroUnits:'0 unité(s)', oneUnit:'1 unité', progress:'Progression', noActivities:'Aucune activité terminée pour le moment', legalNotice:'Mentions légales', contact:'Contact', footerDescription:'Tribeca Academia est un centre de pédagogie et de soutien éducatif qui adapte l’enseignement à chaque personne, valorise ses possibilités d’amélioration et propose des cours du primaire aux adultes.', toolCalendar:'Calendrier', toolMessages:'Messages', toolChat:'Chat instantané', toolAnnouncements:'Annonces', toolContact:'Contact', toolSupport:'Support', toolLegal:'Mentions légales', toolProfile:'Données scolaires', toolBadges:'Badges', toolDifficulties:'Matières difficiles', toolGrades:'Notes'
});
Object.assign(I18N.pl, {
  schoolYear:'Rok szkolny 2025/26', navSubjects:'Moje przedmioty', navCalendar:'Kalendarz', navMessages:'Wiadomości', navChat:'Czat', navAnnouncements:'Ogłoszenia', zoomLabel:'Tekst', readingLabel:'Czytanie', fontDefault:'Domyślnie', languageLabel:'Język', themeLight:'Jasny', themeDark:'Ciemny', profile:'Mój profil', profileData:'Dane edukacyjne', support:'Pomoc', logout:'Wyloguj', welcomeEyebrow:'Osobisty panel nauki', hello:'Witaj', quote:'Edukacja jest najpotężniejszą bronią, której możesz użyć, aby zmienić świat.', centerTitle:'Moja szkoła', viewAcademicProfile:'Zobacz dane edukacyjne', badgesTitle:'Moje odznaki', noBadgesYet:'Brak odznak.', seeBadges:'Zobacz odznaki', difficultSubjectsTitle:'Trudniejsze przedmioty', difficultSubjectsText:'Wskaż, gdzie potrzebujesz więcej wsparcia.', viewUpdate:'Zobacz lub zmień', gradesTitle:'Moje oceny', gradesText:'Zapisuj swoje oceny szkolne.', viewGrades:'Zobacz oceny', subjectsTitle:'Moje przedmioty', subjectSupport:'Wsparcie indywidualne', subjectBio:'Biologia i Geologia', subjectFrench:'Francuski', subjectSpanish:'Język hiszpański', subjectGalician:'Język galicyjski', zeroPosts:'0 przypisanych wpisów', zeroUnits:'0 jednostek', oneUnit:'1 jednostka', progress:'Postęp', noActivities:'Brak ukończonych aktywności', legalNotice:'Nota prawna', contact:'Kontakt', footerDescription:'Tribeca Academia to centrum pedagogiki i wsparcia edukacyjnego, które dostosowuje nauczanie do każdej osoby, wykorzystuje jej możliwości rozwoju i oferuje zajęcia od szkoły podstawowej po dorosłych.', toolCalendar:'Kalendarz', toolMessages:'Wiadomości', toolChat:'Czat na żywo', toolAnnouncements:'Ogłoszenia', toolContact:'Kontakt', toolSupport:'Pomoc', toolLegal:'Nota prawna', toolProfile:'Dane edukacyjne', toolBadges:'Odznaki', toolDifficulties:'Trudniejsze przedmioty', toolGrades:'Oceny'
});
Object.assign(I18N.de, {
  schoolYear:'Schuljahr 2025/26', navSubjects:'Meine Fächer', navCalendar:'Kalender', navMessages:'Nachrichten', navChat:'Chat', navAnnouncements:'Ankündigungen', zoomLabel:'Text', readingLabel:'Lesen', fontDefault:'Standard', languageLabel:'Sprache', themeLight:'Hell', themeDark:'Dunkel', profile:'Mein Profil', profileData:'Schuldaten', support:'Support', logout:'Abmelden', welcomeEyebrow:'Persönliches Lernpanel', hello:'Hallo', quote:'Bildung ist die mächtigste Waffe, mit der man die Welt verändern kann.', centerTitle:'Meine Bildungseinrichtung', viewAcademicProfile:'Schuldaten ansehen', badgesTitle:'Meine Abzeichen', noBadgesYet:'Noch keine Abzeichen.', seeBadges:'Abzeichen ansehen', difficultSubjectsTitle:'Fächer mit Schwierigkeiten', difficultSubjectsText:'Gib an, wo du mehr Unterstützung brauchst.', viewUpdate:'Ansehen oder ändern', gradesTitle:'Meine Noten', gradesText:'Trage deine Schulnoten ein.', viewGrades:'Noten ansehen', subjectsTitle:'Meine Fächer', subjectSupport:'Individuelle Unterstützung', subjectBio:'Biologie und Geologie', subjectFrench:'Französisch', subjectSpanish:'Spanische Sprache', subjectGalician:'Galicische Sprache', zeroPosts:'0 zugewiesene Beiträge', zeroUnits:'0 Einheiten', oneUnit:'1 Einheit', progress:'Fortschritt', noActivities:'Noch keine abgeschlossenen Aktivitäten', legalNotice:'Impressum', contact:'Kontakt', footerDescription:'Tribeca Academia ist ein pädagogisches Förderzentrum, das den Unterricht an jede Person anpasst, individuelle Entwicklungschancen nutzt und Kurse von der Grundschule bis zu Erwachsenen anbietet.', toolCalendar:'Kalender', toolMessages:'Nachrichten', toolChat:'Sofortchat', toolAnnouncements:'Ankündigungen', toolContact:'Kontakt', toolSupport:'Support', toolLegal:'Impressum', toolProfile:'Schuldaten', toolBadges:'Abzeichen', toolDifficulties:'Fächer mit Schwierigkeiten', toolGrades:'Noten'
});
Object.assign(I18N.pt, {
  schoolYear:'Ano letivo 2025/26', navSubjects:'As minhas disciplinas', navCalendar:'Calendário', navMessages:'Mensagens', navChat:'Chat', navAnnouncements:'Anúncios', zoomLabel:'Texto', readingLabel:'Leitura', fontDefault:'Predefinido', languageLabel:'Idioma', themeLight:'Claro', themeDark:'Escuro', profile:'O meu perfil', profileData:'Dados académicos', support:'Suporte', logout:'Terminar sessão', welcomeEyebrow:'Painel pessoal de aprendizagem', hello:'Olá', quote:'A educação é a arma mais poderosa que podes usar para mudar o mundo.', centerTitle:'O meu centro educativo', viewAcademicProfile:'Ver dados académicos', badgesTitle:'As minhas insígnias', noBadgesYet:'Ainda sem insígnias.', seeBadges:'Ver insígnias', difficultSubjectsTitle:'Disciplinas com dificuldades', difficultSubjectsText:'Indica onde precisas de mais apoio.', viewUpdate:'Ver ou atualizar', gradesTitle:'As minhas classificações', gradesText:'Regista as tuas notas escolares.', viewGrades:'Ver classificações', subjectsTitle:'As minhas disciplinas', subjectSupport:'Apoio personalizado', subjectBio:'Biologia e Geologia', subjectFrench:'Francês', subjectSpanish:'Língua Espanhola', subjectGalician:'Língua Galega', zeroPosts:'0 publicação(ões) atribuída(s)', zeroUnits:'0 unidade(s)', oneUnit:'1 unidade', progress:'Progresso', noActivities:'Sem atividades concluídas ainda', legalNotice:'Aviso legal', contact:'Contacto', footerDescription:'Tribeca Academia é um centro de pedagogia e reforço educativo que adapta o ensino a cada pessoa, aproveita as suas oportunidades de melhoria e oferece aulas desde o Ensino Primário até adultos.', toolCalendar:'Calendário', toolMessages:'Mensagens', toolChat:'Chat instantâneo', toolAnnouncements:'Anúncios', toolContact:'Contacto', toolSupport:'Suporte', toolLegal:'Aviso legal', toolProfile:'Dados académicos', toolBadges:'Insígnias', toolDifficulties:'Disciplinas com dificuldades', toolGrades:'Classificações'
});

const extraKeys = {
  gl: { requiredFields:'Revisa os campos obrigatorios antes de enviar.', contactReady:'Abrirase o teu correo para enviar a consulta a Tribeca Academia.', saved:'Gardado correctamente.', deleted:'Eliminado correctamente.', preparedSupabase:'Acción preparada para a integración con Supabase.', logoutReady:'Peche de sesión preparado para a fase de autenticación.', noDifficultySelected:'Non indicaches materias con dificultade.', difficultySelected:'Materias indicadas:', teacherNotice:'Cambio visible para a profesora. Mostrarase un sinal no seu panel.', difficultyFormTitle:'Engadir ou modificar materia', subject:'Materia', level:'Nivel de dificultade', notes:'Observacións', saveDifficulty:'Gardar materia', currentDifficulties:'Materias rexistradas', edit:'Modificar', remove:'Eliminar', noRecords:'Aínda non hai rexistros.', low:'Leve', medium:'Media', high:'Alta', badgesIntro:'O alumnado comeza sen insignias. A profesora poderá asignalas por valores, actitudes ou logros, e algunhas obteranse ao completar actividades.', availableBadges:'Insignias dispoñibles', earnedBadges:'Insignias conseguidas', noEarnedBadges:'Este alumno aínda non ten insignias.', gradesIntro:'Introduce as cualificacións do curso. A media será aritmética se non hai ponderación e ponderada cando exista algunha.', addGrade:'Engadir ou modificar cualificación', didacticUnit:'Unidade didáctica', evaluation:'Avaliación', testType:'Tipo de proba', grade:'Nota', weight:'Ponderación opcional', saveGrade:'Gardar cualificación', gradeRecords:'Rexistros de cualificacións', averages:'Medias por materia e avaliación', arithmeticMean:'Media aritmética', weightedMean:'Media ponderada', firstEval:'Primeira avaliación', secondEval:'Segunda avaliación', thirdEval:'Terceira avaliación', exam:'Exame', project:'Traballo', presentation:'Presentación', oralExam:'Exame oral', ordinaryWeight:'Normal', calendarUsefulDates:'Datas útiles', calendarAddEvent:'Engadir evento', calendarTitle:'Título', date:'Data', visibility:'Visibilidade', onlyMe:'Só para min', wholeClass:'Publicar evento para toda a miña clase', allStudentsTeacher:'Visible para todo o alumnado e profesora', saveEvent:'Gardar evento', calendarContext:'Vista do calendario', today:'Hoxe', eventLegend:'Lenda', national:'Estatal', galicia:'Galicia', local:'Local', school:'Escolar', personal:'Persoal', proposed:'Proposta 2026/27', nextUsefulDates:'Próximas datas mostradas', noUpcomingEvents:'Non hai datas próximas nesta vista.', messagesSystem:'Sistema de mensaxes', inbox:'Recibidos', sent:'Enviados', drafts:'Borradores', archived:'Arquivados', teacher:'Profesora', recipient:'Para', messageSubject:'Asunto', message:'Mensaxe', saveDraft:'Gardar borrador', teacherReminder:'Lembra revisar as actividades de repaso antes da próxima clase.', unread:'Non lido', todayShort:'Hoxe', chatPrepared:'Chat instantáneo preparado para conectar usuarios cando integremos Supabase.', sampleMessage:'Mensaxe de proba.', writeMessage:'Escribe unha mensaxe...', send:'Enviar', announcementsWall:'Muro de anuncios', welcomeAnnouncementTitle:'Benvida a Tribeca Aula', welcomeAnnouncementText:'Este espazo recollerá avisos xerais, comunicacións e novas que non pertenzan a unha materia concreta.', allStudents:'Visible para todo o alumnado', endCourseReminder:'Recordatorio de final de curso', endCourseText:'Revisade o calendario e as mensaxes privadas para confirmar tarefas pendentes.', publishedByTeacher:'Publicado por Patri', newAnnouncement:'Nova publicación, profesora', addressees:'Destinatarios', text:'Texto', publishAnnouncement:'Publicar anuncio', concreteGroup:'Centro, etapa e curso concretos', familiesAdults:'Só familias/adultos', contactForm:'Formulario de contacto', contactIntro:'A consulta dirixirase a tribecaacademia@gmail.com. Nesta versión estática abrirase o programa de correo do dispositivo.', fullName:'Nome e apelidos', phone:'Teléfono', email:'Email', inquiryType:'Tipo de consulta', selectOption:'Selecciona unha opción', prices:'Información sobre prezos', schedules:'Horarios dispoñibles', methodology:'Metodoloxía de traballo', primaryClasses:'Clases de Primaria', esoClasses:'Clases de ESO', bachClasses:'Clases de Bacharelato', adultClasses:'Clases para adultos', modality:'Modalidade presencial ou en liña', platformIssue:'Incidencia coa plataforma', otherInquiry:'Outra consulta', shortMessage:'Mensaxe breve, máximo 600 caracteres', prepareEmail:'Preparar email', supportText:'Para incidencias de acceso, visualización, mensaxes ou calendario, abre o formulario de contacto e selecciona “Incidencia coa plataforma”.', goContact:'Ir a contacto', legalTitle:'Aviso legal', legalText1:'Tribeca Academia, con domicilio na Calle Rafael Juan, 33, 15130, Corcubión, A Coruña, é responsable deste sitio web educativo denominado Tribeca Aula.', legalText2:'A plataforma está en fase de desenvolvemento e proba. O seu uso actual é demostrativo e non debe empregarse aínda para tratar datos persoais reais.', legalText3:'Os contidos, materiais, deseños, textos, imaxes e elementos gráficos pertencen a Tribeca Academia ou úsanse con autorización.', legalText4:'Antes do funcionamento real deberán incorporarse a política de privacidade, cookies, condicións de uso e protección de datos.', legalText5:'O formulario de contacto diríxese a tribecaacademia@gmail.com. A persoa usuaria debe facilitar datos veraces e utilizar a plataforma con respecto e boa fe.', academicData:'Datos académicos do alumno', assignedByTeacher:'Centro educativo, asignado pola profesora', stage:'Etapa', course:'Curso', academicLocked:'O alumnado non poderá modificar estes datos. A profesora poderá cambialos en calquera momento.', preparedCenters:'Centros preparados', promotionRules:'Promoción automática', promotionText:'Cada novo curso o alumnado promocionará ao curso seguinte. En 4.º de ESO e 2.º de Bacharelato avisarase á profesora.', demoContext:'Usuario demo: Academia en Corcubión', ceeContext:'Alumno/a do IES Fernando Blanco, Cee', fisterraContext:'Alumno/a do IES Fin do Camiño, Fisterra', corcubionContext:'Alumno/a do CEIP Praia de Quenxe, Corcubión' },
  en: { requiredFields:'Check the required fields before sending.', contactReady:'Your email client will open to send the enquiry to Tribeca Academia.', saved:'Saved successfully.', deleted:'Deleted successfully.', preparedSupabase:'Action prepared for Supabase integration.', logoutReady:'Log out prepared for the authentication phase.', noDifficultySelected:'You have not added difficult subjects.', difficultySelected:'Selected subjects:', teacherNotice:'Change visible to the teacher. A notification will appear on her panel.', difficultyFormTitle:'Add or edit subject', subject:'Subject', level:'Difficulty level', notes:'Notes', saveDifficulty:'Save subject', currentDifficulties:'Registered subjects', edit:'Edit', remove:'Delete', noRecords:'No records yet.', low:'Low', medium:'Medium', high:'High', badgesIntro:'Students start without badges. The teacher may assign them for values, attitudes or achievements, and some will be earned by completing activities.', availableBadges:'Available badges', earnedBadges:'Earned badges', noEarnedBadges:'This student has no badges yet.', gradesIntro:'Enter your marks during the school year. The mean will be arithmetic if there is no weighting and weighted when any weighting applies.', addGrade:'Add or edit grade', didacticUnit:'Didactic unit', evaluation:'Evaluation', testType:'Assessment type', grade:'Grade', weight:'Optional weight', saveGrade:'Save grade', gradeRecords:'Grade records', averages:'Averages by subject and evaluation', arithmeticMean:'Arithmetic mean', weightedMean:'Weighted mean', firstEval:'First evaluation', secondEval:'Second evaluation', thirdEval:'Third evaluation', exam:'Exam', project:'Project', presentation:'Presentation', oralExam:'Oral exam', ordinaryWeight:'Normal', calendarUsefulDates:'Useful dates', calendarAddEvent:'Add event', calendarTitle:'Title', date:'Date', visibility:'Visibility', onlyMe:'Only me', wholeClass:'Publish event for my whole class', allStudentsTeacher:'Visible to all students and teacher', saveEvent:'Save event', calendarContext:'Calendar view', today:'Today', eventLegend:'Legend', national:'National', galicia:'Galicia', local:'Local', school:'School', personal:'Personal', proposed:'2026/27 proposal', nextUsefulDates:'Next displayed dates', noUpcomingEvents:'No upcoming dates in this view.', messagesSystem:'Message system', inbox:'Inbox', sent:'Sent', drafts:'Drafts', archived:'Archived', teacher:'Teacher', recipient:'To', messageSubject:'Subject', message:'Message', saveDraft:'Save draft', teacherReminder:'Remember to review the revision activities before the next class.', unread:'Unread', todayShort:'Today', chatPrepared:'Instant chat prepared to connect platform users when Supabase is integrated.', sampleMessage:'Test message.', writeMessage:'Write a message...', send:'Send', announcementsWall:'Announcements wall', welcomeAnnouncementTitle:'Welcome to Tribeca Aula', welcomeAnnouncementText:'This area will show general teacher notices, communications and news not linked to a specific subject.', allStudents:'Visible to all students', endCourseReminder:'End of year reminder', endCourseText:'Check the calendar and private messages to confirm pending tasks.', publishedByTeacher:'Published by Patri', newAnnouncement:'New post, teacher', addressees:'Recipients', text:'Text', publishAnnouncement:'Publish announcement', concreteGroup:'Specific school, stage and course', familiesAdults:'Families/adults only', contactForm:'Contact form', contactIntro:'The enquiry will be addressed to tribecaacademia@gmail.com. In this static version, the device email client will open.', fullName:'Full name', phone:'Phone', email:'Email', inquiryType:'Type of enquiry', selectOption:'Select an option', prices:'Information about prices', schedules:'Available schedules', methodology:'Working methodology', primaryClasses:'Primary classes', esoClasses:'ESO classes', bachClasses:'Baccalaureate classes', adultClasses:'Adult classes', modality:'In-person or online mode', platformIssue:'Platform issue', otherInquiry:'Other enquiry', shortMessage:'Brief message, maximum 600 characters', prepareEmail:'Prepare email', supportText:'For access, display, message or calendar issues, open the contact form and select “Platform issue”.', goContact:'Go to contact', legalTitle:'Legal notice', legalText1:'Tribeca Academia, located at Calle Rafael Juan, 33, 15130, Corcubión, A Coruña, is responsible for this educational website called Tribeca Aula.', legalText2:'The platform is in development and testing. Its current use is demonstrative and it must not yet process real personal data.', legalText3:'The contents, materials, designs, texts, images and graphic elements belong to Tribeca Academia or are used with authorization.', legalText4:'Before real operation, the privacy policy, cookie policy, terms of use and data protection information must be incorporated.', legalText5:'The contact form is addressed to tribecaacademia@gmail.com. Users must provide truthful data and use the platform respectfully and in good faith.', academicData:'Student academic data', assignedByTeacher:'School, assigned by the teacher', stage:'Stage', course:'Course', academicLocked:'Students cannot modify these data. The teacher may change them at any time.', preparedCenters:'Prepared schools', promotionRules:'Automatic promotion', promotionText:'Each new school year, students move to the next course. In 4th ESO and 2nd Baccalaureate, the teacher will be notified for manual review.', demoContext:'Demo user: Academy in Corcubión', ceeContext:'Student from IES Fernando Blanco, Cee', fisterraContext:'Student from IES Fin do Camiño, Fisterra', corcubionContext:'Student from CEIP Praia de Quenxe, Corcubión' }
};
['fr','pl','de','pt'].forEach(lang => { I18N[lang] = { ...I18N.en, ...I18N[lang] }; });
Object.assign(I18N.fr, { requiredFields:'Vérifie les champs obligatoires avant l’envoi.', saved:'Enregistré correctement.', deleted:'Supprimé correctement.', preparedSupabase:'Action préparée pour l’intégration avec Supabase.', noRecords:'Aucun enregistrement pour le moment.', edit:'Modifier', remove:'Supprimer', subject:'Matière', grade:'Note', date:'Date', send:'Envoyer', today:'Aujourd’hui' });
Object.assign(I18N.pl, { requiredFields:'Sprawdź wymagane pola przed wysłaniem.', saved:'Zapisano poprawnie.', deleted:'Usunięto poprawnie.', preparedSupabase:'Działanie przygotowane do integracji z Supabase.', noRecords:'Brak rekordów.', edit:'Edytuj', remove:'Usuń', subject:'Przedmiot', grade:'Ocena', date:'Data', send:'Wyślij', today:'Dziś' });
Object.assign(I18N.de, { requiredFields:'Prüfe die Pflichtfelder vor dem Senden.', saved:'Erfolgreich gespeichert.', deleted:'Erfolgreich gelöscht.', preparedSupabase:'Aktion für die Supabase-Integration vorbereitet.', noRecords:'Noch keine Einträge.', edit:'Ändern', remove:'Löschen', subject:'Fach', grade:'Note', date:'Datum', send:'Senden', today:'Heute' });
Object.assign(I18N.pt, { requiredFields:'Revê os campos obrigatórios antes de enviar.', saved:'Guardado corretamente.', deleted:'Eliminado corretamente.', preparedSupabase:'Ação preparada para a integração com Supabase.', noRecords:'Ainda não há registos.', edit:'Modificar', remove:'Eliminar', subject:'Disciplina', grade:'Nota', date:'Data', send:'Enviar', today:'Hoje' });


Object.assign(I18N.fr, {
  contactReady:'Votre messagerie s’ouvrira pour envoyer la demande à Tribeca Academia.', logoutReady:'Déconnexion préparée pour la phase d’authentification.', noDifficultySelected:'Aucune matière difficile indiquée.', difficultySelected:'Matières indiquées :', teacherNotice:'Modification visible par la professeure. Un signal apparaîtra dans son panneau.', difficultyFormTitle:'Ajouter ou modifier une matière', level:'Niveau de difficulté', notes:'Observations', saveDifficulty:'Enregistrer la matière', currentDifficulties:'Matières enregistrées', low:'Faible', medium:'Moyen', high:'Élevé', badgesIntro:'Les élèves commencent sans badges. La professeure pourra les attribuer pour des valeurs, attitudes ou réussites, et certains seront obtenus en réalisant des activités.', availableBadges:'Badges disponibles', earnedBadges:'Badges obtenus', noEarnedBadges:'Cet élève n’a pas encore de badge.', gradesIntro:'Saisis les notes obtenues pendant l’année. La moyenne sera arithmétique sans pondération et pondérée lorsqu’une pondération existe.', addGrade:'Ajouter ou modifier une note', didacticUnit:'Unité didactique', evaluation:'Évaluation', testType:'Type d’épreuve', weight:'Pondération facultative', saveGrade:'Enregistrer la note', gradeRecords:'Registres de notes', averages:'Moyennes par matière et évaluation', arithmeticMean:'Moyenne arithmétique', weightedMean:'Moyenne pondérée', firstEval:'Première évaluation', secondEval:'Deuxième évaluation', thirdEval:'Troisième évaluation', exam:'Examen', project:'Travail', presentation:'Présentation', oralExam:'Examen oral', ordinaryWeight:'Normal', calendarUsefulDates:'Dates utiles', calendarAddEvent:'Ajouter un événement', calendarTitle:'Titre', visibility:'Visibilité', onlyMe:'Seulement pour moi', wholeClass:'Publier l’événement pour toute ma classe', allStudentsTeacher:'Visible par tous les élèves et la professeure', saveEvent:'Enregistrer l’événement', calendarContext:'Vue du calendrier', eventLegend:'Légende', national:'National', galicia:'Galice', local:'Local', school:'Scolaire', personal:'Personnel', proposed:'Proposition 2026/27', nextUsefulDates:'Prochaines dates affichées', noUpcomingEvents:'Aucune date prochaine dans cette vue.', messagesSystem:'Système de messages', inbox:'Reçus', sent:'Envoyés', drafts:'Brouillons', archived:'Archivés', teacher:'Professeure', recipient:'À', messageSubject:'Objet', message:'Message', saveDraft:'Enregistrer le brouillon', teacherReminder:'N’oublie pas de réviser les activités avant le prochain cours.', unread:'Non lu', todayShort:'Aujourd’hui', chatPrepared:'Chat instantané prêt à connecter les utilisateurs lorsque Supabase sera intégré.', sampleMessage:'Message de test.', writeMessage:'Écris un message...', announcementsWall:'Mur d’annonces', welcomeAnnouncementTitle:'Bienvenue sur Tribeca Aula', welcomeAnnouncementText:'Cet espace recueillera les avis généraux, communications et nouvelles de la professeure qui ne relèvent pas d’une matière précise.', allStudents:'Visible par tous les élèves', endCourseReminder:'Rappel de fin d’année', endCourseText:'Consultez le calendrier et les messages privés pour confirmer les tâches en attente.', publishedByTeacher:'Publié par Patri', newAnnouncement:'Nouvelle publication, professeure', addressees:'Destinataires', text:'Texte', publishAnnouncement:'Publier l’annonce', concreteGroup:'Établissement, niveau et classe précis', familiesAdults:'Familles/adultes uniquement', contactForm:'Formulaire de contact', contactIntro:'La demande sera adressée à tribecaacademia@gmail.com. Dans cette version statique, le client de messagerie de l’appareil s’ouvrira.', fullName:'Nom et prénom', phone:'Téléphone', email:'Email', inquiryType:'Type de demande', selectOption:'Sélectionne une option', prices:'Informations sur les tarifs', schedules:'Horaires disponibles', methodology:'Méthodologie de travail', primaryClasses:'Cours de primaire', esoClasses:'Cours d’ESO', bachClasses:'Cours de Bachillerato', adultClasses:'Cours pour adultes', modality:'Modalité présentielle ou en ligne', platformIssue:'Incident avec la plateforme', otherInquiry:'Autre demande', shortMessage:'Message bref, maximum 600 caractères', prepareEmail:'Préparer l’email', supportText:'Pour les problèmes d’accès, d’affichage, de messages ou de calendrier, ouvre le formulaire de contact et sélectionne “Incident avec la plateforme”.', goContact:'Aller au contact', legalTitle:'Mentions légales', legalText1:'Tribeca Academia, domiciliée Calle Rafael Juan, 33, 15130, Corcubión, A Coruña, est responsable de ce site web éducatif appelé Tribeca Aula.', legalText2:'La plateforme est en phase de développement et d’essai. Son usage actuel est démonstratif et ne doit pas encore traiter de données personnelles réelles.', legalText3:'Les contenus, matériels, designs, textes, images et éléments graphiques appartiennent à Tribeca Academia ou sont utilisés avec autorisation.', legalText4:'Avant la mise en service réelle, la politique de confidentialité, la politique de cookies, les conditions d’utilisation et l’information sur la protection des données devront être intégrées.', legalText5:'Le formulaire de contact est adressé à tribecaacademia@gmail.com. L’utilisateur doit fournir des données exactes et utiliser la plateforme avec respect et bonne foi.', academicData:'Données scolaires de l’élève', assignedByTeacher:'Établissement, attribué par la professeure', stage:'Niveau', course:'Cours', academicLocked:'Les élèves ne pourront pas modifier ces données. La professeure pourra les changer à tout moment.', preparedCenters:'Établissements préparés', promotionRules:'Promotion automatique', promotionText:'Chaque nouvelle année scolaire, les élèves passeront au cours suivant. En 4.º ESO et 2.º Bachillerato, la professeure sera avertie pour une révision manuelle.', demoContext:'Utilisateur démo : académie à Corcubión', ceeContext:'Élève de l’IES Fernando Blanco, Cee', fisterraContext:'Élève de l’IES Fin do Camiño, Fisterra', corcubionContext:'Élève du CEIP Praia de Quenxe, Corcubión'
});
Object.assign(I18N.pt, {
  contactReady:'O teu correio será aberto para enviar a consulta à Tribeca Academia.', logoutReady:'Fim de sessão preparado para a fase de autenticação.', noDifficultySelected:'Não indicaste disciplinas com dificuldade.', difficultySelected:'Disciplinas indicadas:', teacherNotice:'Alteração visível para a professora. Será apresentado um sinal no seu painel.', difficultyFormTitle:'Adicionar ou modificar disciplina', level:'Nível de dificuldade', notes:'Observações', saveDifficulty:'Guardar disciplina', currentDifficulties:'Disciplinas registadas', low:'Ligeira', medium:'Média', high:'Alta', badgesIntro:'O alumnado começa sem insígnias. A professora poderá atribuí-las por valores, atitudes ou conquistas, e algumas serão obtidas ao completar atividades.', availableBadges:'Insígnias disponíveis', earnedBadges:'Insígnias conseguidas', noEarnedBadges:'Este aluno ainda não tem insígnias.', gradesIntro:'Introduz as classificações obtidas durante o curso. A média será aritmética se não houver ponderação e ponderada quando existir alguma.', addGrade:'Adicionar ou modificar classificação', didacticUnit:'Unidade didática', evaluation:'Avaliação', testType:'Tipo de prova', weight:'Ponderação opcional', saveGrade:'Guardar classificação', gradeRecords:'Registos de classificações', averages:'Médias por disciplina e avaliação', arithmeticMean:'Média aritmética', weightedMean:'Média ponderada', firstEval:'Primeira avaliação', secondEval:'Segunda avaliação', thirdEval:'Terceira avaliação', exam:'Exame', project:'Trabalho', presentation:'Apresentação', oralExam:'Exame oral', ordinaryWeight:'Normal', calendarUsefulDates:'Datas úteis', calendarAddEvent:'Adicionar evento', calendarTitle:'Título', visibility:'Visibilidade', onlyMe:'Só para mim', wholeClass:'Publicar evento para toda a minha turma', allStudentsTeacher:'Visível para todo o alumnado e professora', saveEvent:'Guardar evento', calendarContext:'Vista do calendário', eventLegend:'Legenda', national:'Nacional', galicia:'Galiza', local:'Local', school:'Escolar', personal:'Pessoal', proposed:'Proposta 2026/27', nextUsefulDates:'Próximas datas apresentadas', noUpcomingEvents:'Não há datas próximas nesta vista.', messagesSystem:'Sistema de mensagens', inbox:'Recebidas', sent:'Enviadas', drafts:'Rascunhos', archived:'Arquivadas', teacher:'Professora', recipient:'Para', messageSubject:'Assunto', message:'Mensagem', saveDraft:'Guardar rascunho', teacherReminder:'Lembra-te de rever as atividades de revisão antes da próxima aula.', unread:'Não lida', todayShort:'Hoje', chatPrepared:'Chat instantâneo preparado para ligar utilizadores quando integrarmos o Supabase.', sampleMessage:'Mensagem de teste.', writeMessage:'Escreve uma mensagem...', announcementsWall:'Mural de anúncios', welcomeAnnouncementTitle:'Bem-vindo/a à Tribeca Aula', welcomeAnnouncementText:'Este espaço reunirá avisos gerais, comunicações e notícias da professora que não pertençam a uma disciplina concreta.', allStudents:'Visível para todo o alumnado', endCourseReminder:'Lembrete de fim de curso', endCourseText:'Revede o calendário e as mensagens privadas para confirmar tarefas pendentes.', publishedByTeacher:'Publicado por Patri', newAnnouncement:'Nova publicação, professora', addressees:'Destinatários', text:'Texto', publishAnnouncement:'Publicar anúncio', concreteGroup:'Centro, etapa e curso concretos', familiesAdults:'Só famílias/adultos', contactForm:'Formulário de contacto', contactIntro:'A consulta será dirigida a tribecaacademia@gmail.com. Nesta versão estática, abrir-se-á o programa de correio do dispositivo.', fullName:'Nome e apelidos', phone:'Telefone', email:'Email', inquiryType:'Tipo de consulta', selectOption:'Seleciona uma opção', prices:'Informação sobre preços', schedules:'Horários disponíveis', methodology:'Metodologia de trabalho', primaryClasses:'Aulas de Primária', esoClasses:'Aulas de ESO', bachClasses:'Aulas de Bacharelato', adultClasses:'Aulas para adultos', modality:'Modalidade presencial ou online', platformIssue:'Incidência com a plataforma', otherInquiry:'Outra consulta', shortMessage:'Mensagem breve, máximo 600 caracteres', prepareEmail:'Preparar email', supportText:'Para incidências de acesso, visualização, mensagens ou calendário, abre o formulário de contacto e seleciona “Incidência com a plataforma”.', goContact:'Ir para contacto', legalTitle:'Aviso legal', legalText1:'Tribeca Academia, com domicílio na Calle Rafael Juan, 33, 15130, Corcubión, A Coruña, é responsável por este sítio web educativo denominado Tribeca Aula.', legalText2:'A plataforma está em fase de desenvolvimento e teste. O seu uso atual é demonstrativo e ainda não deve tratar dados pessoais reais.', legalText3:'Os conteúdos, materiais, desenhos, textos, imagens e elementos gráficos pertencem à Tribeca Academia ou são utilizados com autorização.', legalText4:'Antes do funcionamento real deverão ser integradas a política de privacidade, a política de cookies, as condições de uso e a informação sobre proteção de dados.', legalText5:'O formulário de contacto é dirigido a tribecaacademia@gmail.com. A pessoa utilizadora deve fornecer dados verídicos e usar a plataforma com respeito e boa-fé.', academicData:'Dados académicos do aluno', assignedByTeacher:'Centro educativo, atribuído pela professora', stage:'Etapa', course:'Curso', academicLocked:'O alumnado não poderá modificar estes dados. A professora poderá alterá-los em qualquer momento.', preparedCenters:'Centros preparados', promotionRules:'Promoção automática', promotionText:'A cada novo curso o alumnado passará ao curso seguinte. Em 4.º de ESO e 2.º de Bacharelato a professora será notificada para revisão manual.', demoContext:'Utilizador demo: Academia em Corcubión', ceeContext:'Aluno/a do IES Fernando Blanco, Cee', fisterraContext:'Aluno/a do IES Fin do Camiño, Fisterra', corcubionContext:'Aluno/a do CEIP Praia de Quenxe, Corcubión'
});
Object.assign(I18N.de, {
  contactReady:'Dein E-Mail-Programm wird geöffnet, um die Anfrage an Tribeca Academia zu senden.', logoutReady:'Abmeldung für die Authentifizierungsphase vorbereitet.', noDifficultySelected:'Du hast keine schwierigen Fächer angegeben.', difficultySelected:'Angegebene Fächer:', teacherNotice:'Änderung für die Lehrerin sichtbar. In ihrem Panel erscheint ein Hinweis.', difficultyFormTitle:'Fach hinzufügen oder ändern', level:'Schwierigkeitsgrad', notes:'Anmerkungen', saveDifficulty:'Fach speichern', currentDifficulties:'Registrierte Fächer', low:'Gering', medium:'Mittel', high:'Hoch', badgesIntro:'Schülerinnen und Schüler beginnen ohne Abzeichen. Die Lehrerin kann sie für Werte, Haltungen oder Erfolge vergeben, einige werden durch abgeschlossene Aktivitäten erworben.', availableBadges:'Verfügbare Abzeichen', earnedBadges:'Erworbene Abzeichen', noEarnedBadges:'Dieser Schüler hat noch keine Abzeichen.', gradesIntro:'Trage die während des Schuljahres erhaltenen Noten ein. Der Durchschnitt ist arithmetisch ohne Gewichtung und gewichtet, wenn eine Gewichtung vorliegt.', addGrade:'Note hinzufügen oder ändern', didacticUnit:'Unterrichtseinheit', evaluation:'Bewertung', testType:'Prüfungsart', weight:'Optionale Gewichtung', saveGrade:'Note speichern', gradeRecords:'Noteneinträge', averages:'Durchschnitte nach Fach und Bewertung', arithmeticMean:'Arithmetischer Mittelwert', weightedMean:'Gewichteter Mittelwert', firstEval:'Erste Bewertung', secondEval:'Zweite Bewertung', thirdEval:'Dritte Bewertung', exam:'Prüfung', project:'Arbeit', presentation:'Präsentation', oralExam:'Mündliche Prüfung', ordinaryWeight:'Normal', calendarUsefulDates:'Nützliche Termine', calendarAddEvent:'Termin hinzufügen', calendarTitle:'Titel', visibility:'Sichtbarkeit', onlyMe:'Nur für mich', wholeClass:'Termin für meine ganze Klasse veröffentlichen', allStudentsTeacher:'Für alle Schüler und die Lehrerin sichtbar', saveEvent:'Termin speichern', calendarContext:'Kalenderansicht', eventLegend:'Legende', national:'Staatlich', galicia:'Galicien', local:'Lokal', school:'Schule', personal:'Persönlich', proposed:'Vorschlag 2026/27', nextUsefulDates:'Nächste angezeigte Termine', noUpcomingEvents:'Keine kommenden Termine in dieser Ansicht.', messagesSystem:'Nachrichtensystem', inbox:'Eingang', sent:'Gesendet', drafts:'Entwürfe', archived:'Archiviert', teacher:'Lehrerin', recipient:'An', messageSubject:'Betreff', message:'Nachricht', saveDraft:'Entwurf speichern', teacherReminder:'Denke daran, die Wiederholungsaufgaben vor der nächsten Stunde zu prüfen.', unread:'Ungelesen', todayShort:'Heute', chatPrepared:'Sofortchat vorbereitet, um Plattformnutzer zu verbinden, sobald Supabase integriert ist.', sampleMessage:'Testnachricht.', writeMessage:'Nachricht schreiben...', announcementsWall:'Ankündigungswand', welcomeAnnouncementTitle:'Willkommen bei Tribeca Aula', welcomeAnnouncementText:'Dieser Bereich enthält allgemeine Hinweise, Mitteilungen und Nachrichten der Lehrerin, die keinem bestimmten Fach zugeordnet sind.', allStudents:'Für alle Schüler sichtbar', endCourseReminder:'Erinnerung zum Schuljahresende', endCourseText:'Bitte Kalender und private Nachrichten prüfen, um offene Aufgaben zu bestätigen.', publishedByTeacher:'Veröffentlicht von Patri', newAnnouncement:'Neue Veröffentlichung, Lehrerin', addressees:'Empfänger', text:'Text', publishAnnouncement:'Ankündigung veröffentlichen', concreteGroup:'Bestimmte Schule, Stufe und Kurs', familiesAdults:'Nur Familien/Erwachsene', contactForm:'Kontaktformular', contactIntro:'Die Anfrage geht an tribecaacademia@gmail.com. In dieser statischen Version öffnet sich das E-Mail-Programm des Geräts.', fullName:'Vor- und Nachname', phone:'Telefon', email:'E-Mail', inquiryType:'Art der Anfrage', selectOption:'Option auswählen', prices:'Informationen zu Preisen', schedules:'Verfügbare Zeiten', methodology:'Arbeitsmethodik', primaryClasses:'Grundschulunterricht', esoClasses:'ESO-Unterricht', bachClasses:'Bachillerato-Unterricht', adultClasses:'Unterricht für Erwachsene', modality:'Präsenz- oder Onlineform', platformIssue:'Problem mit der Plattform', otherInquiry:'Andere Anfrage', shortMessage:'Kurze Nachricht, höchstens 600 Zeichen', prepareEmail:'E-Mail vorbereiten', supportText:'Bei Problemen mit Zugang, Anzeige, Nachrichten oder Kalender öffne das Kontaktformular und wähle “Problem mit der Plattform”.', goContact:'Zum Kontakt', legalTitle:'Impressum', legalText1:'Tribeca Academia mit Sitz in Calle Rafael Juan, 33, 15130, Corcubión, A Coruña, ist verantwortlich für diese Bildungswebsite namens Tribeca Aula.', legalText2:'Die Plattform befindet sich in Entwicklung und Testphase. Die aktuelle Nutzung ist demonstrativ und darf noch keine realen personenbezogenen Daten verarbeiten.', legalText3:'Inhalte, Materialien, Designs, Texte, Bilder und grafische Elemente gehören Tribeca Academia oder werden mit Genehmigung genutzt.', legalText4:'Vor dem realen Betrieb müssen Datenschutzrichtlinie, Cookie-Richtlinie, Nutzungsbedingungen und Datenschutzinformationen integriert werden.', legalText5:'Das Kontaktformular ist an tribecaacademia@gmail.com gerichtet. Nutzer müssen wahrheitsgemäße Daten angeben und die Plattform respektvoll und in gutem Glauben nutzen.', academicData:'Schuldaten des Schülers', assignedByTeacher:'Bildungseinrichtung, von der Lehrerin zugewiesen', stage:'Stufe', course:'Kurs', academicLocked:'Schüler können diese Daten nicht ändern. Die Lehrerin kann sie jederzeit ändern.', preparedCenters:'Vorbereitete Einrichtungen', promotionRules:'Automatische Versetzung', promotionText:'In jedem neuen Schuljahr werden die Schüler in den nächsten Kurs versetzt. In 4.º ESO und 2.º Bachillerato wird die Lehrerin zur manuellen Prüfung benachrichtigt.', demoContext:'Demo-Nutzer: Akademie in Corcubión', ceeContext:'Schüler/in des IES Fernando Blanco, Cee', fisterraContext:'Schüler/in des IES Fin do Camiño, Fisterra', corcubionContext:'Schüler/in des CEIP Praia de Quenxe, Corcubión'
});
Object.assign(I18N.pl, {
  contactReady:'Program pocztowy zostanie otwarty, aby wysłać zapytanie do Tribeca Academia.', logoutReady:'Wylogowanie przygotowane do etapu uwierzytelniania.', noDifficultySelected:'Nie wskazano trudniejszych przedmiotów.', difficultySelected:'Wskazane przedmioty:', teacherNotice:'Zmiana widoczna dla nauczycielki. W jej panelu pojawi się powiadomienie.', difficultyFormTitle:'Dodaj lub zmień przedmiot', level:'Poziom trudności', notes:'Uwagi', saveDifficulty:'Zapisz przedmiot', currentDifficulties:'Zarejestrowane przedmioty', low:'Niski', medium:'Średni', high:'Wysoki', badgesIntro:'Uczniowie zaczynają bez odznak. Nauczycielka może przyznawać je za wartości, postawy lub osiągnięcia, a część będzie zdobywana po ukończeniu aktywności.', availableBadges:'Dostępne odznaki', earnedBadges:'Zdobyte odznaki', noEarnedBadges:'Ten uczeń nie ma jeszcze odznak.', gradesIntro:'Wpisz oceny uzyskane w ciągu roku. Średnia będzie arytmetyczna bez wag i ważona, gdy pojawi się jakakolwiek waga.', addGrade:'Dodaj lub zmień ocenę', didacticUnit:'Jednostka dydaktyczna', evaluation:'Ewaluacja', testType:'Rodzaj sprawdzianu', weight:'Opcjonalna waga', saveGrade:'Zapisz ocenę', gradeRecords:'Rejestr ocen', averages:'Średnie według przedmiotu i ewaluacji', arithmeticMean:'Średnia arytmetyczna', weightedMean:'Średnia ważona', firstEval:'Pierwsza ewaluacja', secondEval:'Druga ewaluacja', thirdEval:'Trzecia ewaluacja', exam:'Egzamin', project:'Praca', presentation:'Prezentacja', oralExam:'Egzamin ustny', ordinaryWeight:'Normalnie', calendarUsefulDates:'Przydatne daty', calendarAddEvent:'Dodaj wydarzenie', calendarTitle:'Tytuł', visibility:'Widoczność', onlyMe:'Tylko dla mnie', wholeClass:'Opublikuj wydarzenie dla całej mojej klasy', allStudentsTeacher:'Widoczne dla wszystkich uczniów i nauczycielki', saveEvent:'Zapisz wydarzenie', calendarContext:'Widok kalendarza', eventLegend:'Legenda', national:'Państwowe', galicia:'Galicja', local:'Lokalne', school:'Szkolne', personal:'Osobiste', proposed:'Propozycja 2026/27', nextUsefulDates:'Najbliższe pokazane daty', noUpcomingEvents:'Brak nadchodzących dat w tym widoku.', messagesSystem:'System wiadomości', inbox:'Odebrane', sent:'Wysłane', drafts:'Szkice', archived:'Archiwum', teacher:'Nauczycielka', recipient:'Do', messageSubject:'Temat', message:'Wiadomość', saveDraft:'Zapisz szkic', teacherReminder:'Pamiętaj, aby przejrzeć ćwiczenia powtórkowe przed następną lekcją.', unread:'Nieprzeczytane', todayShort:'Dziś', chatPrepared:'Czat na żywo przygotowany do połączenia użytkowników platformy po integracji z Supabase.', sampleMessage:'Wiadomość testowa.', writeMessage:'Napisz wiadomość...', announcementsWall:'Tablica ogłoszeń', welcomeAnnouncementTitle:'Witamy w Tribeca Aula', welcomeAnnouncementText:'To miejsce będzie zawierać ogólne ogłoszenia, komunikaty i wiadomości nauczycielki niezwiązane z konkretnym przedmiotem.', allStudents:'Widoczne dla wszystkich uczniów', endCourseReminder:'Przypomnienie na koniec roku', endCourseText:'Sprawdź kalendarz i prywatne wiadomości, aby potwierdzić zaległe zadania.', publishedByTeacher:'Opublikowane przez Patri', newAnnouncement:'Nowy wpis, nauczycielka', addressees:'Adresaci', text:'Tekst', publishAnnouncement:'Opublikuj ogłoszenie', concreteGroup:'Konkretna szkoła, etap i klasa', familiesAdults:'Tylko rodziny/dorośli', contactForm:'Formularz kontaktowy', contactIntro:'Zapytanie zostanie skierowane do tribecaacademia@gmail.com. W tej statycznej wersji otworzy się program pocztowy urządzenia.', fullName:'Imię i nazwisko', phone:'Telefon', email:'Email', inquiryType:'Rodzaj zapytania', selectOption:'Wybierz opcję', prices:'Informacje o cenach', schedules:'Dostępne godziny', methodology:'Metodyka pracy', primaryClasses:'Zajęcia dla szkoły podstawowej', esoClasses:'Zajęcia ESO', bachClasses:'Zajęcia Bachillerato', adultClasses:'Zajęcia dla dorosłych', modality:'Tryb stacjonarny lub online', platformIssue:'Problem z platformą', otherInquiry:'Inne zapytanie', shortMessage:'Krótka wiadomość, maksymalnie 600 znaków', prepareEmail:'Przygotuj email', supportText:'W przypadku problemów z dostępem, wyświetlaniem, wiadomościami lub kalendarzem otwórz formularz kontaktowy i wybierz “Problem z platformą”.', goContact:'Przejdź do kontaktu', legalTitle:'Nota prawna', legalText1:'Tribeca Academia, z siedzibą przy Calle Rafael Juan, 33, 15130, Corcubión, A Coruña, odpowiada za edukacyjną stronę internetową Tribeca Aula.', legalText2:'Platforma jest w fazie rozwoju i testów. Obecne użycie ma charakter demonstracyjny i nie powinno jeszcze przetwarzać rzeczywistych danych osobowych.', legalText3:'Treści, materiały, projekty, teksty, obrazy i elementy graficzne należą do Tribeca Academia lub są używane za zgodą.', legalText4:'Przed rzeczywistym uruchomieniem należy dodać politykę prywatności, politykę plików cookie, warunki użytkowania i informacje o ochronie danych.', legalText5:'Formularz kontaktowy jest kierowany na tribecaacademia@gmail.com. Użytkownik musi podawać prawdziwe dane i korzystać z platformy z szacunkiem oraz w dobrej wierze.', academicData:'Dane edukacyjne ucznia', assignedByTeacher:'Szkoła przypisana przez nauczycielkę', stage:'Etap', course:'Klasa', academicLocked:'Uczniowie nie mogą zmieniać tych danych. Nauczycielka może zmienić je w dowolnym momencie.', preparedCenters:'Przygotowane szkoły', promotionRules:'Automatyczna promocja', promotionText:'W każdym nowym roku szkolnym uczniowie przejdą do następnej klasy. W 4.º ESO i 2.º Bachillerato nauczycielka otrzyma powiadomienie do ręcznej weryfikacji.', demoContext:'Użytkownik demo: akademia w Corcubión', ceeContext:'Uczeń/uczennica IES Fernando Blanco, Cee', fisterraContext:'Uczeń/uczennica IES Fin do Camiño, Fisterra', corcubionContext:'Uczeń/uczennica CEIP Praia de Quenxe, Corcubión'
});


Object.assign(I18N.es, { assignedCenter:'Centro sin asignar', classmate:'Alumno/a de mi clase', eventPlaceholder:'Ej.: No voy a clase', unitPlaceholder:'Unidad 1' });
Object.assign(I18N.gl, { assignedCenter:'Centro sen asignar', classmate:'Alumno/a da miña clase', eventPlaceholder:'Ex.: Non vou á clase', unitPlaceholder:'Unidade 1' });
Object.assign(I18N.en, { assignedCenter:'Unassigned school', classmate:'Student from my class', eventPlaceholder:'E.g.: I will not attend class', unitPlaceholder:'Unit 1' });

Object.assign(I18N.es, {
  selectedDay: 'Día seleccionado', eventsOnDay: 'Eventos de este día', clickDateHint: 'Pulsa cualquier día del calendario para ver sus eventos o crear uno nuevo en esa fecha.',
  tribecaClosed: 'Tribeca Academia no abre este día.', eventType: 'Tipo de evento', classEvent: 'Clase', teacherEvent: 'Profesora',
  noEventsDay: 'No hay eventos registrados en este día.', failNotice: 'Hay calificaciones suspensas. Se notificará en el panel de la profesora.',
  insufficient: 'Suspenso', passGood: 'Aprobado/Bien', notableExcellent: 'Notable/Sobresaliente', emoji: 'Emoji', waveTouch: 'Toque', sendTouch: 'Enviar toque',
  national: 'Estatal', galicia: 'Galicia', local: 'Local', school: 'Escolar', personal: 'Personal', proposed: 'Propuesta 2026/27', classEvent: 'Clase', teacherEvent: 'Profesora'
});
Object.assign(I18N.gl, { selectedDay:'Día seleccionado', eventsOnDay:'Eventos deste día', clickDateHint:'Preme calquera día do calendario para ver os seus eventos ou crear un novo nesa data.', tribecaClosed:'Tribeca Academia non abre este día.', eventType:'Tipo de evento', classEvent:'Clase', teacherEvent:'Profesora', noEventsDay:'Non hai eventos rexistrados neste día.', failNotice:'Hai cualificacións suspensas. Notificarase no panel da profesora.', insufficient:'Suspenso', passGood:'Aprobado/Ben', notableExcellent:'Notable/Sobresaliente', emoji:'Emoji', waveTouch:'Toque', sendTouch:'Enviar toque' });
Object.assign(I18N.en, { selectedDay:'Selected day', eventsOnDay:'Events on this day', clickDateHint:'Click any day on the calendar to view its events or create a new one on that date.', tribecaClosed:'Tribeca Academia is closed on this day.', eventType:'Event type', classEvent:'Class', teacherEvent:'Teacher', noEventsDay:'There are no events registered for this day.', failNotice:'There are failed marks. The teacher panel will be notified.', insufficient:'Fail', passGood:'Pass/Good', notableExcellent:'Very good/Excellent', emoji:'Emoji', waveTouch:'Wave', sendTouch:'Send wave' });
Object.assign(I18N.fr, { selectedDay:'Jour sélectionné', eventsOnDay:'Événements de ce jour', clickDateHint:'Cliquez sur un jour du calendrier pour voir ses événements ou en créer un nouveau.', tribecaClosed:'Tribeca Academia est fermée ce jour-là.', eventType:'Type d’événement', classEvent:'Classe', teacherEvent:'Professeure', noEventsDay:'Aucun événement enregistré ce jour-là.', failNotice:'Il y a des notes insuffisantes. Le panneau de la professeure sera notifié.', insufficient:'Insuffisant', passGood:'Admis/Bien', notableExcellent:'Très bien/Excellent', emoji:'Emoji', waveTouch:'Salut', sendTouch:'Envoyer un salut' });
Object.assign(I18N.pl, { selectedDay:'Wybrany dzień', eventsOnDay:'Wydarzenia tego dnia', clickDateHint:'Kliknij dowolny dzień w kalendarzu, aby zobaczyć wydarzenia lub utworzyć nowe.', tribecaClosed:'Tribeca Academia jest tego dnia zamknięta.', eventType:'Typ wydarzenia', classEvent:'Klasa', teacherEvent:'Nauczycielka', noEventsDay:'Brak wydarzeń w tym dniu.', failNotice:'Są oceny niedostateczne. Panel nauczycielki otrzyma powiadomienie.', insufficient:'Niedostateczny', passGood:'Zaliczony/Dobry', notableExcellent:'Bardzo dobry/Celujący', emoji:'Emoji', waveTouch:'Gest', sendTouch:'Wyślij gest' });
Object.assign(I18N.de, { selectedDay:'Ausgewählter Tag', eventsOnDay:'Ereignisse an diesem Tag', clickDateHint:'Klicke auf einen Kalendertag, um Ereignisse zu sehen oder ein neues zu erstellen.', tribecaClosed:'Tribeca Academia ist an diesem Tag geschlossen.', eventType:'Ereignistyp', classEvent:'Klasse', teacherEvent:'Lehrerin', noEventsDay:'Für diesen Tag sind keine Ereignisse eingetragen.', failNotice:'Es gibt nicht bestandene Noten. Das Lehrerinnen-Panel wird benachrichtigt.', insufficient:'Nicht bestanden', passGood:'Bestanden/Gut', notableExcellent:'Sehr gut/Ausgezeichnet', emoji:'Emoji', waveTouch:'Gruß', sendTouch:'Gruß senden' });
Object.assign(I18N.pt, { selectedDay:'Dia selecionado', eventsOnDay:'Eventos deste dia', clickDateHint:'Clique em qualquer dia do calendário para ver eventos ou criar um novo nessa data.', tribecaClosed:'A Tribeca Academia não abre neste dia.', eventType:'Tipo de evento', classEvent:'Turma', teacherEvent:'Professora', noEventsDay:'Não há eventos registados neste dia.', failNotice:'Há classificações negativas. O painel da professora será notificado.', insufficient:'Negativa', passGood:'Aprovado/Bom', notableExcellent:'Muito bom/Excelente', emoji:'Emoji', waveTouch:'Toque', sendTouch:'Enviar toque' });

Object.assign(I18N.fr, { assignedCenter:'Établissement non attribué', classmate:'Élève de ma classe', eventPlaceholder:'Ex. : je ne vais pas en cours', unitPlaceholder:'Unité 1' });
Object.assign(I18N.pl, { assignedCenter:'Szkoła nieprzypisana', classmate:'Uczeń z mojej klasy', eventPlaceholder:'Np.: nie przyjdę na zajęcia', unitPlaceholder:'Jednostka 1' });
Object.assign(I18N.de, { assignedCenter:'Keine Bildungseinrichtung zugewiesen', classmate:'Schüler/in meiner Klasse', eventPlaceholder:'z. B.: Ich komme nicht zum Unterricht', unitPlaceholder:'Einheit 1' });
Object.assign(I18N.pt, { assignedCenter:'Centro não atribuído', classmate:'Aluno/a da minha turma', eventPlaceholder:'Ex.: Não vou à aula', unitPlaceholder:'Unidade 1' });

function tr(key) {
  const lang = $('#languageSelect')?.value || 'es';
  return I18N[lang]?.[key] || I18N.es[key] || key;
}

const demoUser = {
  name: 'Demo 1.º ESO',
  center: 'Centro sin asignar',
  stage: 'ESO',
  course: '1.º ESO',
  academyMunicipality: 'Corcubión',
  schoolMunicipality: ''
};

const subjects = [
  'Apoyo personalizado', 'Biología y Geología', 'English', 'Francés', 'Lengua Castellana', 'Lingua Galega', 'Matemáticas', 'Geografía e Historia', 'Física y Química'
];

const centers = [
  { name: 'CEIP Plurilingüe de Ponte do Porto', location: 'Ponte do Porto, Camariñas', offer: 'Infantil y Primaria', municipality: 'Camariñas' },
  { name: 'CEIP O Areal', location: 'Camariñas', offer: 'Infantil y Primaria', municipality: 'Camariñas' },
  { name: 'CEIP de Camelle', location: 'Camelle, Camariñas', offer: 'Infantil y Primaria', municipality: 'Camariñas' },
  { name: 'IES Pedra da Aguia', location: 'Ponte do Porto, Camariñas', offer: 'ESO, Bachillerato y FP', municipality: 'Camariñas' },
  { name: 'CEIP do Pindo', location: 'O Pindo, Carnota', offer: 'Infantil y Primaria', municipality: 'Carnota' },
  { name: 'CEIP Plurilingüe de Carnota', location: 'Carnota', offer: 'Infantil y Primaria', municipality: 'Carnota' },
  { name: 'IES Lamas de Castelo', location: 'Carnota', offer: 'ESO y Bachillerato', municipality: 'Carnota' },
  { name: 'EEI da Pereiriña', location: 'A Pereiriña, Cee', offer: 'Infantil', municipality: 'Cee' },
  { name: 'CEIP de Brens', location: 'Brens, Cee', offer: 'Infantil y Primaria', municipality: 'Cee' },
  { name: 'CEIP Plurilingüe Vila de Cee', location: 'Cee', offer: 'Infantil y Primaria', municipality: 'Cee' },
  { name: 'IES Agra de Raíces', location: 'Cee', offer: 'ESO, Bachillerato, FP sanitaria, idiomas', municipality: 'Cee' },
  { name: 'IES Fernando Blanco', location: 'Cee', offer: 'ESO, Bachillerato, FP industrial, administrativa y automoción', municipality: 'Cee' },
  { name: 'CPR Plurilingüe Manuela Rial Mouzo', location: 'Cee', offer: 'Infantil, Primaria y ESO', municipality: 'Cee' },
  { name: 'CEIP Praia de Quenxe', location: 'Corcubión', offer: 'Infantil, Primaria y ESO', municipality: 'Corcubión' },
  { name: 'CEIP Plurilingüe Santa Eulalia de Dumbría', location: 'Dumbría', offer: 'Infantil y Primaria', municipality: 'Dumbría' },
  { name: 'CEIP Mar de Fóra', location: 'Fisterra', offer: 'Infantil y Primaria', municipality: 'Fisterra' },
  { name: 'CEIP Areouta', location: 'Sardiñeiro, Fisterra', offer: 'Infantil y Primaria', municipality: 'Fisterra' },
  { name: 'IES Fin do Camiño', location: 'Fisterra', offer: 'ESO y Bachillerato', municipality: 'Fisterra' },
  { name: 'CPR Ntra. Sra. del Carmen', location: 'Fisterra', offer: 'Infantil, Primaria y ESO', municipality: 'Fisterra' }
];

const availableBadges = [
  { icon: '😎', name: '67 sixseven', type: 'Asignable por la profesora' },
  { icon: '🤝', name: 'Compañerismo', type: 'Valores y actitudes' },
  { icon: '🌱', name: 'Constancia', type: 'Valores y actitudes' },
  { icon: '🎯', name: 'Esfuerzo sostenido', type: 'Valores y actitudes' },
  { icon: '💬', name: 'Comunicación respetuosa', type: 'Valores y actitudes' },
  { icon: '🏅', name: 'Primera actividad completada', type: 'Actividad completada' },
  { icon: '📚', name: 'Semana de estudio completa', type: 'Logro de trabajo' },
  { icon: '✨', name: 'Mejora destacada', type: 'Logro académico' }
];

const calendarContexts = {
  demo: { labelKey: 'demoContext', schoolMunicipality: '', academyMunicipality: 'Corcubión' },
  cee: { labelKey: 'ceeContext', schoolMunicipality: 'Cee', academyMunicipality: 'Corcubión' },
  fisterra: { labelKey: 'fisterraContext', schoolMunicipality: 'Fisterra', academyMunicipality: 'Corcubión' },
  corcubion: { labelKey: 'corcubionContext', schoolMunicipality: 'Corcubión', academyMunicipality: 'Corcubión' }
};

const baseCalendarEvents = [
  { date:'2026-01-01', title:'Año Nuevo', type:'national' },
  { date:'2026-01-06', title:'Epifanía del Señor, Reyes', type:'national' },
  { date:'2026-03-19', title:'San José', type:'galicia' },
  { date:'2026-04-02', title:'Jueves Santo', type:'galicia' },
  { date:'2026-04-03', title:'Viernes Santo', type:'national' },
  { date:'2026-05-01', title:'Fiesta del Trabajo', type:'national' },
  { date:'2026-06-24', title:'San Juan', type:'galicia' },
  { date:'2026-07-25', title:'Día Nacional de Galicia, Santiago Apóstol', type:'galicia' },
  { date:'2026-08-15', title:'Asunción de la Virgen', type:'national' },
  { date:'2026-10-12', title:'Fiesta Nacional de España', type:'national' },
  { date:'2026-12-08', title:'Inmaculada Concepción', type:'national' },
  { date:'2026-12-25', title:'Natividad del Señor', type:'national' },
  { date:'2026-04-06', title:'Lunes de Pascua, Cee', type:'local', municipality:'Cee' },
  { date:'2026-06-16', title:'San Adrián, Cee', type:'local', municipality:'Cee' },
  { date:'2026-06-29', title:'San Pedro, Corcubión', type:'local', municipality:'Corcubión' },
  { date:'2026-07-16', title:'Fiesta del Carmen, Corcubión', type:'local', municipality:'Corcubión' },
  { date:'2026-04-06', title:'Lunes de Pascua, Fisterra', type:'local', municipality:'Fisterra' },
  { date:'2026-09-08', title:'Fiesta local de Fisterra', type:'local', municipality:'Fisterra' },
  { date:'2025-10-31', title:'Día de la Enseñanza', type:'school' },
  { date:'2025-11-03', title:'Día no lectivo', type:'school' },
  { date:'2026-04-13', title:'Evaluación de diagnóstico en 2.º de ESO, inicio', type:'school' },
  { date:'2026-04-20', title:'Evaluación de diagnóstico en 4.º de Primaria, inicio', type:'school' },
  { date:'2026-05-31', title:'Entrega de actividades de repaso', type:'personal' },
  { date:'2026-06-04', title:'Simulacro de examen de Inglés', type:'personal' },
  { date:'2026-09-09', title:'Inicio lectivo propuesto 2026/27', type:'proposed' },
  { date:'2026-12-07', title:'Día de la Enseñanza propuesto 2026/27', type:'proposed' },
  { date:'2027-02-08', title:'Entroido propuesto 2026/27, inicio', type:'proposed' },
  { date:'2027-03-22', title:'Semana Santa propuesta 2026/27, inicio', type:'proposed' }
];

const ranges = [
  { start:'2025-12-22', end:'2026-01-07', title:'Vacaciones de Navidad', type:'school' },
  { start:'2026-02-16', end:'2026-02-18', title:'Entroido/Carnaval', type:'school' },
  { start:'2026-03-30', end:'2026-04-06', title:'Vacaciones de Semana Santa', type:'school' },
  { start:'2026-06-08', end:'2026-06-08', title:'Evaluación final ordinaria 1.º Bachillerato y 1.º FP básica, inicio', type:'school' },
  { start:'2026-06-17', end:'2026-06-19', title:'Pruebas extraordinarias 1.º Bachillerato y 1.º FP básica', type:'school' },
  { start:'2026-12-21', end:'2027-01-06', title:'Navidad propuesta 2026/27', type:'proposed' },
  { start:'2027-03-22', end:'2027-03-29', title:'Semana Santa propuesta 2026/27', type:'proposed' }
];

let calendarMonth = startOfMonth(new Date());
let selectedCalendarDate = toIsoDate(new Date());
const openWindows = new Map();
let zIndex = 3001;

function allCalendarEvents() {
  const expanded = [...baseCalendarEvents];
  ranges.forEach(range => {
    eachDate(range.start, range.end).forEach(date => expanded.push({ date, title: range.title, type: range.type, range: true }));
  });
  return [...expanded, ...getUserEvents()];
}

function getDifficulties() { return JSON.parse(localStorage.getItem('tribeca-difficulties') || '[]'); }
function setDifficulties(items) { localStorage.setItem('tribeca-difficulties', JSON.stringify(items)); }
function getGrades() { return JSON.parse(localStorage.getItem('tribeca-grades') || '[]'); }
function setGrades(items) { localStorage.setItem('tribeca-grades', JSON.stringify(items)); }
function getUserEvents() { return JSON.parse(localStorage.getItem('tribeca-user-events') || '[]'); }
function setUserEvents(items) { localStorage.setItem('tribeca-user-events', JSON.stringify(items)); }

function applyTranslations() {
  const lang = $('#languageSelect').value;
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  $('#themeText').textContent = document.body.classList.contains('is-dark') ? tr('themeDark') : tr('themeLight');
  renderStaticUserTexts();
  renderQuickCards();
  rerenderOpenWindows();
}

function renderStaticUserTexts() {
  $('#studentHeroName').textContent = demoUser.name;
  const centerName = demoUser.center === 'Centro sin asignar' ? tr('assignedCenter') : demoUser.center;
  const academicLine = `${centerName} · ${demoUser.stage} · ${demoUser.course}`;
  $('#studentCenterLine').textContent = academicLine;
  $('#quickCenterText').textContent = academicLine;
  $('#todayLine').textContent = formatLongDate(new Date());
}

function setHeaderHeight() {
  const header = $('#appHeader');
  if (!header) return;
  document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function applyZoom(value) {
  document.documentElement.style.setProperty('--font-size-base', `${16 * Number(value) / 100}px`);
  requestAnimationFrame(setHeaderHeight);
  localStorage.setItem('tribeca-zoom', value);
}

function applyFont(value) {
  document.body.classList.remove('font-default', 'font-comic', 'font-opendyslexic');
  document.body.classList.add(`font-${value}`);
  localStorage.setItem('tribeca-font', value);
  requestAnimationFrame(setHeaderHeight);
}

function toggleTheme() {
  document.body.classList.toggle('is-dark');
  localStorage.setItem('tribeca-theme', document.body.classList.contains('is-dark') ? 'dark' : 'light');
  $('#themeText').textContent = document.body.classList.contains('is-dark') ? tr('themeDark') : tr('themeLight');
}

function toolTitle(id) { return tr(`tool${id.charAt(0).toUpperCase()}${id.slice(1)}`); }

function createDockItem(id) {
  let dockItem = $(`.dock-item[data-window="${id}"]`);
  if (dockItem) return dockItem;
  dockItem = document.createElement('button');
  dockItem.type = 'button';
  dockItem.className = 'dock-item';
  dockItem.dataset.window = id;
  dockItem.textContent = toolTitle(id);
  dockItem.addEventListener('click', () => restoreWindow(id));
  $('#windowDock').appendChild(dockItem);
  return dockItem;
}

function openTool(id) {
  $('#profileMenu').hidden = true;
  if (!openWindows.has(id)) {
    const win = buildWindow(id);
    openWindows.set(id, win);
    $('#windowLayer').appendChild(win);
  }
  restoreWindow(id);
}

function buildWindow(id) {
  const win = document.createElement('section');
  win.className = `tool-window ${id}-window`;
  win.dataset.window = id;
  win.style.left = `calc(50% + ${Math.min(openWindows.size * 1.2, 4)}rem)`;
  win.style.top = `calc(50% + ${Math.min(openWindows.size * 0.8, 3)}rem)`;
  win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = windowMarkup(id);
  $('[data-window-action="min"]', win).addEventListener('click', () => minimizeWindow(id));
  $('[data-window-action="max"]', win).addEventListener('click', () => win.classList.toggle('is-maximized'));
  $('[data-window-action="close"]', win).addEventListener('click', () => closeWindow(id));
  win.addEventListener('pointerdown', () => { win.style.zIndex = ++zIndex; });
  enableWindowDrag(win);
  requestAnimationFrame(() => bindWindowForms(win, id));
  return win;
}

function enableWindowDrag(win) {
  const titlebar = $('.window-titlebar', win);
  if (!titlebar) return;
  titlebar.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || win.classList.contains('is-maximized')) return;
    const layerRect = $('#windowLayer').getBoundingClientRect();
    const winRect = win.getBoundingClientRect();
    const offsetX = event.clientX - winRect.left;
    const offsetY = event.clientY - winRect.top;
    win.style.transform = 'none';
    titlebar.setPointerCapture(event.pointerId);
    titlebar.classList.add('is-dragging');
    const move = moveEvent => {
      const maxLeft = Math.max(0, layerRect.width - win.offsetWidth);
      const maxTop = Math.max(0, layerRect.height - win.offsetHeight);
      const left = Math.min(Math.max(moveEvent.clientX - layerRect.left - offsetX, 0), maxLeft);
      const top = Math.min(Math.max(moveEvent.clientY - layerRect.top - offsetY, 0), maxTop);
      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
    };
    const stop = () => {
      titlebar.classList.remove('is-dragging');
      titlebar.removeEventListener('pointermove', move);
      titlebar.removeEventListener('pointerup', stop);
      titlebar.removeEventListener('pointercancel', stop);
    };
    titlebar.addEventListener('pointermove', move);
    titlebar.addEventListener('pointerup', stop);
    titlebar.addEventListener('pointercancel', stop);
  });
}

function windowMarkup(id) {
  return `
    <header class="window-titlebar">
      <strong>${toolTitle(id)}</strong>
      <div class="window-actions">
        <button type="button" data-window-action="min" aria-label="Minimizar">−</button>
        <button type="button" data-window-action="max" aria-label="Maximizar">□</button>
        <button type="button" data-window-action="close" aria-label="Cerrar">×</button>
      </div>
    </header>
    <div class="window-body">${toolContent(id)}</div>
  `;
}

function rerenderOpenWindows() {
  openWindows.forEach((win, id) => {
    const hidden = win.classList.contains('is-hidden');
    const maximized = win.classList.contains('is-maximized');
    win.innerHTML = windowMarkup(id);
    if (hidden) win.classList.add('is-hidden');
    if (maximized) win.classList.add('is-maximized');
    $('[data-window-action="min"]', win).addEventListener('click', () => minimizeWindow(id));
    $('[data-window-action="max"]', win).addEventListener('click', () => win.classList.toggle('is-maximized'));
    $('[data-window-action="close"]', win).addEventListener('click', () => closeWindow(id));
    enableWindowDrag(win);
    bindWindowForms(win, id);
  });
  $$('.dock-item').forEach(item => item.textContent = toolTitle(item.dataset.window));
}

function minimizeWindow(id) {
  const win = openWindows.get(id);
  if (win) win.classList.add('is-hidden');
  createDockItem(id);
}

function restoreWindow(id) {
  const win = openWindows.get(id) || buildWindow(id);
  if (!openWindows.has(id)) {
    openWindows.set(id, win);
    $('#windowLayer').appendChild(win);
  }
  win.classList.remove('is-hidden');
  win.style.zIndex = ++zIndex;
  const dockItem = $(`.dock-item[data-window="${id}"]`);
  if (dockItem) dockItem.remove();
}

function closeWindow(id) {
  const win = openWindows.get(id);
  if (win) win.remove();
  openWindows.delete(id);
  const dockItem = $(`.dock-item[data-window="${id}"]`);
  if (dockItem) dockItem.remove();
}

function toolContent(id) {
  if (id === 'calendar') return calendarContent();
  if (id === 'messages') return messagesContent();
  if (id === 'chat') return chatContent();
  if (id === 'announcements') return announcementsContent();
  if (id === 'contact') return contactContent();
  if (id === 'support') return supportContent();
  if (id === 'legal') return legalContent();
  if (id === 'profile') return profileContent();
  if (id === 'badges') return badgesContent();
  if (id === 'difficulties') return difficultiesContent();
  if (id === 'grades') return gradesContent();
  return `<p>${tr('preparedSupabase')}</p>`;
}

function badgesContent() {
  return `
    <div class="window-grid">
      <section class="window-panel">
        <h3>${tr('earnedBadges')}</h3>
        <p>${tr('badgesIntro')}</p>
        <div class="empty-state">${tr('noEarnedBadges')}</div>
      </section>
      <section class="window-panel">
        <h3>${tr('availableBadges')}</h3>
        <div class="badge-list">
          ${availableBadges.map(b => `<article class="badge-option"><span class="badge-icon">${b.icon}</span><strong>${escapeHtml(b.name)}</strong><span class="meta">${escapeHtml(b.type)}</span></article>`).join('')}
        </div>
      </section>
    </div>`;
}

function difficultiesContent() {
  const items = getDifficulties();
  return `
    <div class="window-grid">
      <section class="window-panel">
        <h3>${tr('difficultyFormTitle')}</h3>
        <form class="form-grid" id="difficultyForm">
          <input type="hidden" name="id" />
          <div class="form-row"><label>${tr('subject')} *</label><select name="subject" required><option value="">${tr('selectOption')}</option>${subjects.map(s => `<option>${escapeHtml(s)}</option>`).join('')}</select></div>
          <div class="form-row"><label>${tr('level')} *</label><select name="level" required><option>${tr('low')}</option><option>${tr('medium')}</option><option>${tr('high')}</option></select></div>
          <div class="form-row"><label>${tr('notes')}</label><textarea name="notes" maxlength="500"></textarea></div>
          <button class="primary-btn" type="submit">${tr('saveDifficulty')}</button>
        </form>
        <p class="meta">${tr('teacherNotice')}</p>
      </section>
      <section class="window-panel">
        <h3>${tr('currentDifficulties')}</h3>
        <div class="item-list" id="difficultyList">${renderDifficultyList(items)}</div>
      </section>
    </div>`;
}

function renderDifficultyList(items) {
  if (!items.length) return `<div class="empty-state">${tr('noRecords')}</div>`;
  return items.map(item => `
    <article class="list-item" data-id="${item.id}">
      <strong>${escapeHtml(item.subject)}</strong>
      <p>${tr('level')}: ${escapeHtml(item.level)}</p>
      ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
      <div class="inline-actions">
        <button class="secondary-btn" type="button" data-edit-difficulty="${item.id}">${tr('edit')}</button>
        <button class="danger-btn" type="button" data-delete-difficulty="${item.id}">${tr('remove')}</button>
      </div>
    </article>`).join('');
}

function gradesContent() {
  const grades = getGrades();
  return `
    <div class="window-grid">
      <section class="window-panel">
        <h3>${tr('addGrade')}</h3>
        <p>${tr('gradesIntro')}</p>
        <form class="form-grid" id="gradeForm">
          <input type="hidden" name="id" />
          <div class="window-grid">
            <div class="form-row"><label>${tr('subject')} *</label><select name="subject" required><option value="">${tr('selectOption')}</option>${subjects.map(s => `<option>${escapeHtml(s)}</option>`).join('')}</select></div>
            <div class="form-row"><label>${tr('didacticUnit')} *</label><input name="unit" required maxlength="80" placeholder="${tr('unitPlaceholder')}" /></div>
          </div>
          <div class="window-grid">
            <div class="form-row"><label>${tr('evaluation')} *</label><select name="evaluation" required><option>${tr('firstEval')}</option><option>${tr('secondEval')}</option><option>${tr('thirdEval')}</option></select></div>
            <div class="form-row"><label>${tr('testType')} *</label><select name="type" required><option>${tr('exam')}</option><option>${tr('project')}</option><option>${tr('presentation')}</option><option>${tr('oralExam')}</option></select></div>
          </div>
          <div class="window-grid">
            <div class="form-row"><label>${tr('grade')} *</label><input name="grade" type="number" min="0" max="10" step="0.01" required /></div>
            <div class="form-row"><label>${tr('weight')}</label><input name="weight" type="number" min="0.1" max="100" step="0.1" placeholder="${tr('ordinaryWeight')}" /></div>
          </div>
          <button class="primary-btn" type="submit">${tr('saveGrade')}</button>
        </form>
      </section>
      <section class="window-panel">
        <h3>${tr('averages')}</h3>
        <div class="summary-grid" id="averagesList">${renderAverages(grades)}</div>
      </section>
    </div>
    <section class="window-panel" style="margin-top:1rem;">
      <h3>${tr('gradeRecords')}</h3>
      <div class="table-wrap" id="gradesTable">${renderGradesTable(grades)}</div>
    </section>`;
}

function renderGradesTable(grades) {
  if (!grades.length) return `<div class="empty-state">${tr('noRecords')}</div>`;
  return `<table><thead><tr><th>${tr('subject')}</th><th>${tr('didacticUnit')}</th><th>${tr('evaluation')}</th><th>${tr('testType')}</th><th>${tr('grade')}</th><th>${tr('weight')}</th><th></th></tr></thead><tbody>${grades.map(g => `<tr data-id="${g.id}"><td>${escapeHtml(g.subject)}</td><td>${escapeHtml(g.unit)}</td><td>${escapeHtml(g.evaluation)}</td><td>${escapeHtml(g.type)}</td><td>${Number(g.grade).toFixed(2)}</td><td>${g.weight ? escapeHtml(String(g.weight)) : tr('ordinaryWeight')}</td><td><button type="button" data-edit-grade="${g.id}">${tr('edit')}</button> <button type="button" data-delete-grade="${g.id}">${tr('remove')}</button></td></tr>`).join('')}</tbody></table>`;
}

function renderAverages(grades) {
  if (!grades.length) return `<div class="empty-state">${tr('noRecords')}</div>`;
  const groups = new Map();
  grades.forEach(g => {
    const key = `${g.subject}||${g.evaluation}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  });
  return [...groups.entries()].map(([key, items]) => {
    const [subject, evaluation] = key.split('||');
    const weighted = items.some(item => Number(item.weight) > 0);
    const average = weighted
      ? items.reduce((sum, item) => sum + Number(item.grade) * (Number(item.weight) || 1), 0) / items.reduce((sum, item) => sum + (Number(item.weight) || 1), 0)
      : items.reduce((sum, item) => sum + Number(item.grade), 0) / items.length;
    const statusClass = gradeStatusClass(average);
    return `<article class="summary-card ${statusClass}"><strong>${escapeHtml(subject)}</strong><span>${escapeHtml(evaluation)}</span><span>${weighted ? tr('weightedMean') : tr('arithmeticMean')}</span><b>${average.toFixed(2)}</b><small>${gradeStatusLabel(average)}</small></article>`;
  }).join('');
}

function gradeStatusClass(value) {
  if (value < 5) return 'grade-fail';
  if (value < 7) return 'grade-pass';
  return 'grade-excellent';
}

function gradeStatusLabel(value) {
  if (value < 5) return tr('insufficient');
  if (value < 7) return tr('passGood');
  return tr('notableExcellent');
}

function calendarContent() {
  const selectedContext = localStorage.getItem('tribeca-calendar-context') || 'demo';
  return `
    <div class="calendar-shell">
      <section class="window-panel">
        <div class="calendar-toolbar">
          <button type="button" data-calendar-prev aria-label="Anterior">‹</button>
          <h3 id="calendarMonthLabel">${formatMonth(calendarMonth)}</h3>
          <button type="button" data-calendar-next aria-label="Siguiente">›</button>
        </div>
        <p class="calendar-hint">${tr('clickDateHint')}</p>
        <div class="calendar-grid" id="largeCalendar">${renderCalendarGrid(calendarMonth, selectedContext)}</div>
        <div class="calendar-legend">
          ${legendPill('today', tr('today'))}
          ${legendPill('national', tr('national'))}
          ${legendPill('galicia', tr('galicia'))}
          ${legendPill('local', tr('local'))}
          ${legendPill('school', tr('school'))}
          ${legendPill('personal', tr('personal'))}
          ${legendPill('class', tr('classEvent'))}
          ${legendPill('teacher', tr('teacherEvent'))}
        </div>
      </section>
      <section class="window-panel">
        <h3>${tr('calendarUsefulDates')}</h3>
        <div class="form-row"><label>${tr('calendarContext')}</label><select id="calendarContextSelect">${Object.entries(calendarContexts).map(([value, ctx]) => `<option value="${value}" ${value === selectedContext ? 'selected' : ''}>${tr(ctx.labelKey)}</option>`).join('')}</select></div>
        <section class="selected-day-panel">
          <h3>${tr('selectedDay')}</h3>
          <p class="selected-date"><strong>${formatShortDate(selectedCalendarDate)}</strong></p>
          <div class="item-list">${renderDayEvents(selectedContext, selectedCalendarDate)}</div>
        </section>
        <h3 style="margin-top:1rem;">${tr('nextUsefulDates')}</h3>
        <div class="item-list" id="calendarEventList">${renderCalendarEventList(selectedContext)}</div>
        <hr />
        <h3>${tr('calendarAddEvent')}</h3>
        <form class="form-grid" id="eventForm">
          <div class="form-row"><label>${tr('calendarTitle')} *</label><input name="title" required maxlength="80" placeholder="${tr('eventPlaceholder')}" /></div>
          <div class="form-row"><label>${tr('date')} *</label><input type="date" name="date" required value="${selectedCalendarDate}" /></div>
          <div class="form-row"><label>${tr('visibility')}</label><select name="scope"><option value="personal">${tr('onlyMe')}</option><option value="class">${tr('wholeClass')}</option><option value="teacher">${tr('allStudentsTeacher')}</option></select></div>
          <button class="primary-btn" type="submit">${tr('saveEvent')}</button>
        </form>
      </section>
    </div>`;
}

function legendPill(type, label) {
  return `<span class="legend-pill"><i class="day-event-dot event-${type}"></i>${label}</span>`;
}

function renderCalendarGrid(monthDate, contextKey) {
  const weekdays = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  const first = startOfMonth(monthDate);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const todayIso = toIsoDate(new Date());
  const contextEvents = eventsForContext(contextKey);
  let html = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`).join('');
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    const iso = toIsoDate(date);
    const dayEvents = contextEvents.filter(event => event.date === iso);
    html += `<button type="button" class="calendar-day ${date.getMonth() !== monthDate.getMonth() ? 'is-other' : ''} ${iso === todayIso ? 'is-today' : ''} ${iso === selectedCalendarDate ? 'is-selected' : ''}" data-date="${iso}" title="${dayEvents.map(e => escapeHtml(e.title)).join(' | ')}"><span class="day-number">${date.getDate()}</span>${dayEvents.slice(0, 3).map(e => `<span class="day-event-label"><i class="day-event-dot event-${eventVisualType(e)}"></i>${escapeHtml(e.title)}</span>`).join('')}</button>`;
  }
  return html;
}

function renderCalendarEventList(contextKey) {
  const today = stripTime(new Date());
  const upcoming = eventsForContext(contextKey)
    .filter(event => parseIso(event.date) >= today)
    .sort((a, b) => parseIso(a.date) - parseIso(b.date))
    .slice(0, 10);
  if (!upcoming.length) return `<div class="empty-state">${tr('noUpcomingEvents')}</div>`;
  return upcoming.map(renderEventItem).join('');
}

function renderDayEvents(contextKey, isoDate) {
  const events = eventsForContext(contextKey)
    .filter(event => event.date === isoDate)
    .sort((a, b) => eventVisualType(a).localeCompare(eventVisualType(b)));
  if (!events.length) return `<div class="empty-state">${tr('noEventsDay')}</div>`;
  return events.map(renderEventItem).join('');
}

function renderEventItem(event) {
  return `<article class="list-item event-item event-${eventVisualType(event)}"><strong>${escapeHtml(event.title)}</strong><p class="meta"><i class="day-event-dot event-${eventVisualType(event)}"></i>${formatShortDate(event.date)} · ${translateEventType(event.type)}</p>${isTribecaClosed(event) ? `<p class="closure-note">${tr('tribecaClosed')}</p>` : ''}</article>`;
}

function eventsForContext(contextKey) {
  const ctx = calendarContexts[contextKey] || calendarContexts.demo;
  return allCalendarEvents().filter(event => {
    if (['national', 'galicia', 'school', 'personal', 'proposed', 'class', 'teacher'].includes(event.type)) return true;
    if (event.type === 'local') return event.municipality === ctx.academyMunicipality || event.municipality === ctx.schoolMunicipality;
    return true;
  });
}

function isTribecaClosed(event) {
  return event.type === 'national' || event.type === 'galicia' || (event.type === 'local' && event.municipality === 'Corcubión');
}

function eventVisualType(event) {
  if (event.type === 'local' && event.municipality === 'Corcubión') return 'local';
  return event.type;
}

function translateEventType(type) {
  return ({ national: tr('national'), galicia: tr('galicia'), local: tr('local'), school: tr('school'), personal: tr('personal'), proposed: tr('proposed'), class: tr('classEvent'), teacher: tr('teacherEvent') })[type] || type;
}

function messagesContent() {
  return `
    <div class="mail-layout">
      <aside class="mail-folders"><button>${tr('inbox')} · 1</button><button>${tr('sent')}</button><button>${tr('drafts')}</button><button>${tr('archived')}</button></aside>
      <section class="window-panel">
        <h3>${tr('messagesSystem')}</h3>
        <div class="item-list"><article class="list-item"><strong>Patri · ${tr('teacher')}</strong><p>${tr('teacherReminder')}</p><p class="meta">${tr('todayShort')} · ${tr('unread')}</p></article></div>
        <hr />
        <form class="form-grid" id="messageForm">
          <div class="form-row"><label>${tr('recipient')}</label><select><option>${tr('teacher')}</option><option>${tr('classmate')}</option></select></div>
          <div class="form-row"><label>${tr('messageSubject')}</label><input required maxlength="90" /></div>
          <div class="form-row"><label>${tr('message')}</label><textarea required maxlength="1200"></textarea></div>
          <button class="primary-btn" type="submit">${tr('saveDraft')}</button>
        </form>
      </section>
    </div>`;
}

function chatContent() {
  return `
    <section class="window-panel chat-box">
      <div class="chat-thread" id="chatThread">
        <div class="chat-effect" id="chatEffect" aria-hidden="true"></div>
        <div class="chat-bubble"><strong>Patri</strong><br />${tr('chatPrepared')}</div>
        <div class="chat-bubble me"><strong>Demo</strong><br />${tr('sampleMessage')}</div>
      </div>
      <div class="emoji-row" aria-label="${tr('emoji')}">
        ${['😊','👏','📚','⭐','💪','🎯','😂','👍'].map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('')}
        <button class="touch-btn" type="button" data-touch>👋 ${tr('waveTouch')}</button>
      </div>
      <form class="form-grid" id="chatForm" style="grid-template-columns:1fr auto;">
        <input required maxlength="300" placeholder="${tr('writeMessage')}" />
        <button class="primary-btn" type="submit">${tr('send')}</button>
      </form>
    </section>`;
}

function announcementsContent() {
  return `
    <div class="window-grid">
      <section class="window-panel">
        <h3>${tr('announcementsWall')}</h3>
        <div class="item-list">
          <article class="list-item announcement"><strong>${tr('welcomeAnnouncementTitle')}</strong><p>${tr('welcomeAnnouncementText')}</p><span class="meta">${tr('allStudents')}</span></article>
          <article class="list-item announcement"><strong>${tr('endCourseReminder')}</strong><p>${tr('endCourseText')}</p><span class="meta">${tr('publishedByTeacher')}</span></article>
        </div>
      </section>
      <section class="window-panel">
        <h3>${tr('newAnnouncement')}</h3>
        <form class="form-grid" id="announcementForm">
          <div class="form-row"><label>${tr('calendarTitle')}</label><input required maxlength="90" /></div>
          <div class="form-row"><label>${tr('addressees')}</label><select><option>${tr('allStudents')}</option><option>${tr('concreteGroup')}</option><option>${tr('familiesAdults')}</option></select></div>
          <div class="form-row"><label>${tr('text')}</label><textarea required maxlength="1600"></textarea></div>
          <button class="primary-btn" type="submit">${tr('publishAnnouncement')}</button>
        </form>
      </section>
    </div>`;
}

function contactContent() {
  return `
    <section class="window-panel">
      <h3>${tr('contactForm')}</h3>
      <p>${tr('contactIntro')}</p>
      <form class="form-grid" id="contactForm">
        <div class="window-grid"><div class="form-row"><label>${tr('fullName')} *</label><input name="name" required maxlength="90" /></div><div class="form-row"><label>${tr('phone')} *</label><input name="phone" required inputmode="tel" pattern="[0-9 +()-]{7,20}" /></div></div>
        <div class="window-grid"><div class="form-row"><label>${tr('email')} *</label><input name="email" type="email" required maxlength="120" /></div><div class="form-row"><label>${tr('inquiryType')} *</label><select name="topic" required><option value="">${tr('selectOption')}</option><option>${tr('prices')}</option><option>${tr('schedules')}</option><option>${tr('methodology')}</option><option>${tr('primaryClasses')}</option><option>${tr('esoClasses')}</option><option>${tr('bachClasses')}</option><option>${tr('adultClasses')}</option><option>${tr('modality')}</option><option>${tr('platformIssue')}</option><option>${tr('otherInquiry')}</option></select></div></div>
        <div class="form-row"><label>${tr('shortMessage')} *</label><textarea name="message" maxlength="600" required></textarea></div>
        <button class="primary-btn" type="submit">${tr('prepareEmail')}</button>
      </form>
    </section>`;
}

function supportContent() {
  return `<section class="window-panel"><h3>${tr('support')}</h3><p>${tr('supportText')}</p><button class="primary-btn" type="button" data-open-contact>${tr('goContact')}</button></section>`;
}

function legalContent() {
  return `<section class="window-panel"><h3>${tr('legalTitle')}</h3><p>${tr('legalText1')}</p><p>${tr('legalText2')}</p><p>${tr('legalText3')}</p><p>${tr('legalText4')}</p><p>${tr('legalText5')}</p></section>`;
}

function profileContent() {
  return `
    <div class="window-grid">
      <section class="window-panel">
        <h3>${tr('academicData')}</h3>
        <div class="form-grid">
          <div class="form-row"><label>${tr('assignedByTeacher')}</label><input value="${escapeHtml(demoUser.center)}" disabled /></div>
          <div class="window-grid"><div class="form-row"><label>${tr('stage')}</label><input value="${escapeHtml(demoUser.stage)}" disabled /></div><div class="form-row"><label>${tr('course')}</label><input value="${escapeHtml(demoUser.course)}" disabled /></div></div>
          <p class="meta">${tr('academicLocked')}</p>
        </div>
        <hr />
        <h3>${tr('promotionRules')}</h3>
        <p>${tr('promotionText')}</p>
      </section>
      <section class="window-panel">
        <h3>${tr('preparedCenters')}</h3>
        <div class="item-list" style="max-height:24rem; overflow:auto;">${centers.map(c => `<article class="list-item"><strong>${escapeHtml(c.name)}</strong><p>${escapeHtml(c.location)}</p><p class="meta">${escapeHtml(c.offer)}</p></article>`).join('')}</div>
      </section>
    </div>`;
}

function bindWindowForms(win, id) {
  const contact = $('#contactForm', win);
  if (contact) contact.addEventListener('submit', handleContactSubmit);

  const eventForm = $('#eventForm', win);
  if (eventForm) eventForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(eventForm).entries());
    const items = getUserEvents();
    items.push({ id: uid(), date: data.date, title: data.title, type: data.scope || 'personal', scope: data.scope || 'personal' });
    setUserEvents(items);
    showToast(tr('saved'));
    updateCalendarBadge();
    rerenderOpenWindows();
  });

  const contextSelect = $('#calendarContextSelect', win);
  if (contextSelect) contextSelect.addEventListener('change', event => {
    localStorage.setItem('tribeca-calendar-context', event.target.value);
    rerenderOpenWindows();
  });
  const prev = $('[data-calendar-prev]', win);
  const next = $('[data-calendar-next]', win);
  if (prev) prev.addEventListener('click', () => { calendarMonth = addMonths(calendarMonth, -1); rerenderOpenWindows(); });
  if (next) next.addEventListener('click', () => { calendarMonth = addMonths(calendarMonth, 1); rerenderOpenWindows(); });
  $$('.calendar-day[data-date]', win).forEach(day => day.addEventListener('click', () => {
    selectedCalendarDate = day.dataset.date;
    calendarMonth = startOfMonth(parseIso(selectedCalendarDate));
    rerenderOpenWindows();
  }));

  const difficultyForm = $('#difficultyForm', win);
  if (difficultyForm) difficultyForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(difficultyForm).entries());
    const items = getDifficulties();
    if (data.id) {
      const index = items.findIndex(item => item.id === data.id);
      if (index >= 0) items[index] = { id: data.id, subject: data.subject, level: data.level, notes: data.notes };
    } else {
      items.push({ id: uid(), subject: data.subject, level: data.level, notes: data.notes });
    }
    setDifficulties(items);
    localStorage.setItem('tribeca-difficulty-teacher-notice', '1');
    showToast(tr('saved'));
    renderQuickCards();
    rerenderOpenWindows();
  });
  $$('[data-edit-difficulty]', win).forEach(button => button.addEventListener('click', () => {
    const item = getDifficulties().find(d => d.id === button.dataset.editDifficulty);
    const form = $('#difficultyForm', win);
    if (!item || !form) return;
    form.elements.id.value = item.id;
    form.elements.subject.value = item.subject;
    form.elements.level.value = item.level;
    form.elements.notes.value = item.notes || '';
  }));
  $$('[data-delete-difficulty]', win).forEach(button => button.addEventListener('click', () => {
    setDifficulties(getDifficulties().filter(item => item.id !== button.dataset.deleteDifficulty));
    localStorage.setItem('tribeca-difficulty-teacher-notice', '1');
    showToast(tr('deleted'));
    renderQuickCards();
    rerenderOpenWindows();
  }));

  const gradeForm = $('#gradeForm', win);
  if (gradeForm) gradeForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(gradeForm).entries());
    const items = getGrades();
    const record = { id: data.id || uid(), subject: data.subject, unit: data.unit, evaluation: data.evaluation, type: data.type, grade: Number(data.grade), weight: data.weight ? Number(data.weight) : '' };
    if (data.id) {
      const index = items.findIndex(item => item.id === data.id);
      if (index >= 0) items[index] = record;
    } else {
      items.push(record);
    }
    setGrades(items);
    updateGradeTeacherNotice(items);
    showToast(tr('saved'));
    renderQuickCards();
    rerenderOpenWindows();
  });
  $$('[data-edit-grade]', win).forEach(button => button.addEventListener('click', () => {
    const item = getGrades().find(g => g.id === button.dataset.editGrade);
    const form = $('#gradeForm', win);
    if (!item || !form) return;
    form.elements.id.value = item.id;
    form.elements.subject.value = item.subject;
    form.elements.unit.value = item.unit;
    form.elements.evaluation.value = item.evaluation;
    form.elements.type.value = item.type;
    form.elements.grade.value = item.grade;
    form.elements.weight.value = item.weight || '';
  }));
  $$('[data-delete-grade]', win).forEach(button => button.addEventListener('click', () => {
    const updated = getGrades().filter(item => item.id !== button.dataset.deleteGrade);
    setGrades(updated);
    updateGradeTeacherNotice(updated);
    showToast(tr('deleted'));
    renderQuickCards();
    rerenderOpenWindows();
  }));

  const chatForm = $('#chatForm', win);
  if (chatForm) chatForm.addEventListener('submit', event => {
    event.preventDefault();
    const input = $('input', chatForm);
    const value = input.value.trim();
    if (!value) return;
    $('#chatThread', win).insertAdjacentHTML('beforeend', `<div class="chat-bubble me is-new"><strong>Demo</strong><br />${escapeHtml(value)}</div>`);
    animateChatEffect(win, value.slice(-2));
    input.value = '';
  });
  $$('[data-emoji]', win).forEach(button => button.addEventListener('click', () => {
    const input = $('#chatForm input', win);
    input.value = `${input.value}${button.dataset.emoji}`;
    input.focus();
  }));
  const touchButton = $('[data-touch]', win);
  if (touchButton) touchButton.addEventListener('click', () => {
    $('#chatThread', win).insertAdjacentHTML('beforeend', `<div class="chat-bubble me is-new"><strong>Demo</strong><br />👋 ${tr('waveTouch')}</div>`);
    animateChatEffect(win, '👋', 1500, true);
  });

  $$('form', win).forEach(form => {
    if (['contactForm', 'eventForm', 'chatForm', 'difficultyForm', 'gradeForm'].includes(form.id)) return;
    form.addEventListener('submit', event => { event.preventDefault(); showToast(tr('preparedSupabase')); });
  });

  const contactButton = $('[data-open-contact]', win);
  if (contactButton) contactButton.addEventListener('click', () => openTool('contact'));
}

function animateChatEffect(win, content, duration = 1000, isWave = false) {
  const effect = $('#chatEffect', win);
  if (!effect) return;
  effect.textContent = content || '✨';
  effect.className = `chat-effect show ${isWave ? 'wave-effect' : ''}`;
  window.clearTimeout(effect.timer);
  effect.timer = window.setTimeout(() => {
    effect.className = 'chat-effect';
    effect.textContent = '';
  }, duration);
}

function handleContactSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) {
    showToast(tr('requiredFields'));
    form.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const subject = encodeURIComponent(`Consulta Tribeca Aula: ${data.topic}`);
  const body = encodeURIComponent(`Nombre y apellidos: ${data.name}\nTeléfono: ${data.phone}\nEmail: ${data.email}\nTipo de consulta: ${data.topic}\n\nMensaje:\n${data.message}`);
  showToast(tr('contactReady'));
  window.location.href = `mailto:tribecaacademia@gmail.com?subject=${subject}&body=${body}`;
}

function renderQuickCards() {
  const difficulties = getDifficulties();
  const grades = getGrades();
  $('#badgesPreview').textContent = tr('noBadgesYet');
  $('#difficultyPreview').textContent = difficulties.length ? `${tr('difficultySelected')} ${difficulties.map(d => d.subject).join(', ')}` : tr('difficultSubjectsText');
  $('#difficultyNoticeDot').hidden = localStorage.getItem('tribeca-difficulty-teacher-notice') !== '1';
  const hasFail = grades.some(g => Number(g.grade) < 5);
  $('#gradesPreview').textContent = hasFail ? tr('failNotice') : (grades.length ? `${grades.length} ${tr('gradeRecords').toLowerCase()}` : tr('gradesText'));
  const gradeDot = $('#gradeNoticeDot');
  if (gradeDot) gradeDot.hidden = !hasFail;
}

function updateGradeTeacherNotice(grades = getGrades()) {
  const hasFail = grades.some(g => Number(g.grade) < 5);
  if (hasFail) localStorage.setItem('tribeca-grade-teacher-notice', '1');
  else localStorage.removeItem('tribeca-grade-teacher-notice');
}

function updateCalendarBadge() {
  const today = stripTime(new Date());
  const seven = addDays(today, 7);
  const context = localStorage.getItem('tribeca-calendar-context') || 'demo';
  const count = eventsForContext(context).filter(event => {
    const d = parseIso(event.date);
    return d >= today && d <= seven;
  }).length;
  const badge = $('#calendarBadge');
  badge.textContent = String(Math.min(count, 9));
  badge.hidden = count === 0;
}

function migrateSettings() {
  const previous = localStorage.getItem('tribeca-settings-version');
  const currentZoom = localStorage.getItem('tribeca-zoom');
  if (previous !== SETTINGS_VERSION && (!currentZoom || currentZoom === '85')) {
    localStorage.setItem('tribeca-zoom', '60');
  }
  localStorage.setItem('tribeca-settings-version', SETTINGS_VERSION);
}


function renderCalendarGrid(monthDate, contextKey) {
  const baseMonday = new Date(2026, 0, 5);
  const weekdays = Array.from({length:7}, (_, i) => new Intl.DateTimeFormat(localeForCurrentLang(), { weekday:'short' }).format(addDays(baseMonday, i)).replace('.', ''));
  const first = startOfMonth(monthDate);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const todayIso = toIsoDate(new Date());
  const contextEvents = eventsForContext(contextKey);
  let html = weekdays.map(day => `<div class="calendar-weekday">${escapeHtml(day)}</div>`).join('');
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    const iso = toIsoDate(date);
    const dayEvents = contextEvents.filter(event => event.date === iso);
    html += `<button type="button" class="calendar-day ${date.getMonth() !== monthDate.getMonth() ? 'is-other' : ''} ${iso === todayIso ? 'is-today' : ''} ${iso === selectedCalendarDate ? 'is-selected' : ''} ${dayEvents.length ? 'has-events' : ''}" data-date="${iso}" title="${dayEvents.map(e => escapeHtml(e.title)).join(' | ')}"><span class="day-number">${date.getDate()}</span>${dayEvents.slice(0, 3).map(e => `<span class="day-event-label"><i class="day-event-dot event-${eventVisualType(e)}"></i>${escapeHtml(e.title)}</span>`).join('')}</button>`;
  }
  return html;
}

function init() {
  migrateSettings();
  const savedZoom = localStorage.getItem('tribeca-zoom') || '60';
  const savedFont = localStorage.getItem('tribeca-font') || 'default';
  const savedTheme = localStorage.getItem('tribeca-theme') || 'light';
  $('#zoomSelect').value = savedZoom;
  $('#fontSelect').value = savedFont;
  applyZoom(savedZoom);
  applyFont(savedFont);
  if (savedTheme === 'dark') document.body.classList.add('is-dark');
  applyTranslations();
  updateCalendarBadge();
  setHeaderHeight();

  $('#zoomSelect').addEventListener('change', event => applyZoom(event.target.value));
  $('#fontSelect').addEventListener('change', event => applyFont(event.target.value));
  $('#languageSelect').addEventListener('change', () => { applyTranslations(); updateCalendarBadge(); });
  $('#themeToggle').addEventListener('click', toggleTheme);

  $$('.nav-btn[data-route="subjects"]').forEach(button => button.addEventListener('click', () => {
    $$('.nav-btn').forEach(b => b.classList.remove('is-active'));
    button.classList.add('is-active');
    $('#subjects').scrollIntoView({ block: 'start' });
  }));

  $$('[data-tool]').forEach(button => button.addEventListener('click', () => openTool(button.dataset.tool)));

  $('#profileButton').addEventListener('click', () => {
    const menu = $('#profileMenu');
    menu.hidden = !menu.hidden;
    $('#profileButton').setAttribute('aria-expanded', String(!menu.hidden));
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.profile-area')) $('#profileMenu').hidden = true;
  });

  $('[data-action="logout"]')?.addEventListener('click', () => showToast(tr('logoutReady')));
  window.addEventListener('resize', setHeaderHeight);
}


function uid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function stripTime(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function addMonths(date, months) { return new Date(date.getFullYear(), date.getMonth() + months, 1); }
function parseIso(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function toIsoDate(date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }
function eachDate(start, end) { const result = []; for (let d = parseIso(start); d <= parseIso(end); d = addDays(d, 1)) result.push(toIsoDate(d)); return result; }
function formatLongDate(date) { return new Intl.DateTimeFormat(localeForCurrentLang(), { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(date).replace(/^./, c => c.toUpperCase()); }
function formatShortDate(iso) { return new Intl.DateTimeFormat(localeForCurrentLang(), { day:'numeric', month:'short', year:'numeric' }).format(parseIso(iso)); }
function formatMonth(date) { return new Intl.DateTimeFormat(localeForCurrentLang(), { month:'long', year:'numeric' }).format(date).replace(/^./, c => c.toUpperCase()); }
function localeForCurrentLang() { return ({ es:'es-ES', gl:'gl-ES', en:'en-GB', fr:'fr-FR', pl:'pl-PL', de:'de-DE', pt:'pt-PT' })[$('#languageSelect')?.value || 'es']; }
function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char])); }



/* Revisión 4: asignaturas por curso, perfil ampliado, materia, panel docente y políticas */
const avatarIcons = ['💡','📚','🧠','⭐','🌟','✨','🔥','🌈','☀️','🌙','⚡','🎯','🏆','🥇','🎓','🖊️','✏️','📝','📐','🔬','🧪','🧬','🌍','🗺️','🏛️','🎨','🎭','🎵','🎧','🎮','🧩','♟️','🦉','🐝','🦋','🐢','🐬','🦊','🐱','🐶','🐼','🐧','🐸','🦁','🐯','🐴','🐳','🦄','🍀','🌻','🌸','🌿','🍄','🍎','🍓','🍉','🍍','🍕','🥐','⚽','🏀','🏐','🎾','🚀','🛸','✈️','🚲','🏖️','🏔️','🏰','💎','🔔','🧭','🪄','🛡️','📣','🪐','☕','🧋','🎁'];

const subjectCatalog = {
  'Primaria-1.º Primaria': ['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
  'Primaria-2.º Primaria': ['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
  'Primaria-3.º Primaria': ['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
  'Primaria-4.º Primaria': ['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
  'Primaria-5.º Primaria': ['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
  'Primaria-6.º Primaria': ['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Música y Danza','Educación en Valores Cívicos y Éticos'],
  'ESO-1.º ESO': ['Apoyo personalizado','Biología y Geología','Educación Física','Educación Plástica, Visual y Audiovisual','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Segunda Lengua Extranjera','Tecnología y Digitalización','Geografía e Historia'],
  'ESO-2.º ESO': ['Apoyo personalizado','Educación Física','Física y Química','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Música','Segunda Lengua Extranjera','Tecnología y Digitalización','Geografía e Historia'],
  'ESO-3.º ESO': ['Apoyo personalizado','Biología y Geología','Educación en Valores Cívicos y Éticos','Educación Física','Educación Plástica, Visual y Audiovisual','Física y Química','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas','Música','Geografía e Historia','Cultura Clásica','Educación Digital','Oratoria','Segunda Lengua Extranjera'],
  'ESO-4.º ESO': ['Apoyo personalizado','Educación Física','Lengua Castellana y Literatura','Lengua Extranjera','Lengua Gallega y Literatura','Matemáticas A','Matemáticas B','Geografía e Historia','Biología y Geología','Digitalización','Economía y Emprendimiento','Expresión Artística','Física y Química','Formación y Orientación Personal y Profesional','Latín','Música','Segunda Lengua Extranjera','Tecnología','Cultura Clásica','Filosofía','Oratoria'],
  'Bachillerato-1.º Bachillerato Sociales': ['Educación Física','Filosofía','Lengua Castellana y Literatura I','Lengua Extranjera I','Lengua Gallega y Literatura I','Latín I','Matemáticas Aplicadas a las Ciencias Sociales I','Economía','Griego I','Historia del Mundo Contemporáneo','Literatura Universal','Anatomía Aplicada','Antropología','Cultura Científica','Segunda Lengua Extranjera I','Literatura Gallega del Siglo XX y de la Actualidad','TIC I'],
  'Bachillerato-1.º Bachillerato Humanidades': ['Educación Física','Filosofía','Lengua Castellana y Literatura I','Lengua Extranjera I','Lengua Gallega y Literatura I','Latín I','Matemáticas Aplicadas a las Ciencias Sociales I','Economía','Griego I','Historia del Mundo Contemporáneo','Literatura Universal','Anatomía Aplicada','Antropología','Cultura Científica','Segunda Lengua Extranjera I','Literatura Gallega del Siglo XX y de la Actualidad','TIC I'],
  'Bachillerato-2.º Bachillerato Sociales': ['Lengua Castellana y Literatura II','Lengua Extranjera II','Lengua Gallega y Literatura II','Historia de España','Historia de la Filosofía','Latín II','Matemáticas Aplicadas a las Ciencias Sociales II','Empresa y Diseño de Modelos de Negocio','Geografía','Griego II','Historia del Arte','Métodos Estadísticos y Numéricos','Psicología','Segunda Lengua Extranjera II','TIC II','Geografía, Historia, Arte y Patrimonio de Galicia'],
  'Bachillerato-2.º Bachillerato Humanidades': ['Lengua Castellana y Literatura II','Lengua Extranjera II','Lengua Gallega y Literatura II','Historia de España','Historia de la Filosofía','Latín II','Matemáticas Aplicadas a las Ciencias Sociales II','Empresa y Diseño de Modelos de Negocio','Geografía','Griego II','Historia del Arte','Métodos Estadísticos y Numéricos','Psicología','Segunda Lengua Extranjera II','TIC II','Geografía, Historia, Arte y Patrimonio de Galicia']
};

const publicStudentImportPlan = [
  { alias:'Alumno/a 01', stage:'Primaria', course:'5.º Primaria', center:'CEIP Praia de Quenxe' },
  { alias:'Alumno/a 02', stage:'Primaria', course:'5.º Primaria', center:'CEIP Praia de Quenxe' },
  { alias:'Alumno/a 03', stage:'ESO', course:'4.º ESO', center:'IES Agra de Raíces' },
  { alias:'Alumno/a 04', stage:'ESO', course:'4.º ESO', center:'IES Agra de Raíces' },
  { alias:'Alumno/a 05', stage:'ESO', course:'3.º ESO', center:'CPR Plurilingüe Manuela Rial Mouzo' },
  { alias:'Alumno/a 06', stage:'ESO', course:'1.º ESO', center:'IES Fernando Blanco' },
  { alias:'Alumno/a 07', stage:'ESO', course:'1.º ESO', center:'IES Fernando Blanco' },
  { alias:'Alumno/a 08', stage:'ESO', course:'1.º ESO', center:'CPR Plurilingüe Manuela Rial Mouzo' },
  { alias:'Alumno/a 09', stage:'ESO', course:'2.º ESO', center:'CPR Plurilingüe Manuela Rial Mouzo' },
  { alias:'Alumno/a 10', stage:'ESO', course:'2.º ESO', center:'CPR Plurilingüe Manuela Rial Mouzo' },
  { alias:'Alumno/a 11', stage:'ESO', course:'2.º ESO', center:'CPR Plurilingüe Manuela Rial Mouzo' },
  { alias:'Alumno/a 12', stage:'ESO', course:'4.º ESO', center:'CPR Plurilingüe Manuela Rial Mouzo' },
  { alias:'Alumno/a 13', stage:'ESO', course:'4.º ESO', center:'IES Fernando Blanco' },
  { alias:'Alumno/a 14', stage:'Bachillerato', course:'1.º Bachillerato Sociales', center:'IES Agra de Raíces' },
  { alias:'Alumno/a 15', stage:'ESO', course:'3.º ESO PDC', center:'Centro pendiente' },
  { alias:'Alumno/a 16', stage:'ESO', course:'2.º ESO', center:'CPR Ntra. Sra. del Carmen' },
  { alias:'Alumno/a 17', stage:'Primaria', course:'6.º Primaria', center:'CPR Ntra. Sra. del Carmen' },
  { alias:'Alumno/a 18', stage:'Bachillerato', course:'1.º Bachillerato Sociales', center:'IES Fernando Blanco' },
  { alias:'Alumno/a 19', stage:'Bachillerato', course:'1.º Bachillerato Humanidades', center:'IES Agra de Raíces' }
];

Object.assign(I18N.es, {
  teacherPanel:'Panel profesora', profilePreferences:'Preferencias personales', preferredName:'Nombre por el que quieres que te llamen', profileIcon:'Icono de perfil', notificationPrefs:'Preferencias de email', personalEmail:'Email personal para avisos', notifyMessages:'Mensajes nuevos', notifyCalendar:'Eventos próximos', notifyAnnouncements:'Anuncios', notifyMaterials:'Materiales nuevos', saveProfile:'Guardar perfil', subjectWindow:'Materia', unitsAndMaterials:'Unidades y materiales', materialTeacherNote:'La profesora podrá ver, subir, modificar, ocultar o eliminar estos materiales desde su panel.', unit:'Unidad', notesMaterial:'Apuntes', testMaterial:'Test', worksheetMaterial:'Boletín', mockExamMaterial:'Simulacro de examen', gameMaterial:'Juego', challengeMaterial:'Desafío', hiddenMaterial:'Oculto', teacherOnly:'Gestión de profesora', teacherPanelIntro:'Panel preparado para administrar alumnado, materias, insignias, materiales, mensajes, anuncios, calendario y alertas.', privacyWarning:'Por seguridad, los nombres reales del alumnado no se insertan en archivos públicos de GitHub. La alta real se hará en Supabase, en privado.', usersPrepared:'Usuarios preparados para alta privada', teacherAlerts:'Alertas de seguimiento', failedGradesAlert:'Suspensos pendientes de revisión', difficultyAlert:'Cambios en materias con dificultades', noAlerts:'No hay alertas pendientes.', approved:'Aprobado', good:'Bien', notable:'Notable', outstanding:'Sobresaliente', privacyPolicy:'Política de privacidad', cookiesPolicy:'Política de cookies', termsOfUse:'Condiciones de uso', dataProtection:'Protección de datos', legalIntro:'Información provisional para fase de desarrollo. Antes de la apertura real se revisará jurídicamente y se adaptará al tratamiento efectivo de datos.', profileSaved:'Perfil actualizado.', demoLoginNotice:'Inicio de sesión real pendiente de Supabase. Esta maqueta no debe contener contraseñas ni datos personales reales en el código público.'
});
Object.assign(I18N.gl, { teacherPanel:'Panel profesora', profilePreferences:'Preferencias persoais', preferredName:'Nome polo que queres que te chamen', profileIcon:'Icona de perfil', notificationPrefs:'Preferencias de email', personalEmail:'Email persoal para avisos', notifyMessages:'Mensaxes novas', notifyCalendar:'Eventos próximos', notifyAnnouncements:'Anuncios', notifyMaterials:'Materiais novos', saveProfile:'Gardar perfil', subjectWindow:'Materia', unitsAndMaterials:'Unidades e materiais', materialTeacherNote:'A profesora poderá ver, subir, modificar, ocultar ou eliminar estes materiais desde o seu panel.', unit:'Unidade', notesMaterial:'Apuntamentos', testMaterial:'Test', worksheetMaterial:'Boletín', mockExamMaterial:'Simulacro de exame', gameMaterial:'Xogo', challengeMaterial:'Desafío', hiddenMaterial:'Oculto', teacherOnly:'Xestión da profesora', teacherPanelIntro:'Panel preparado para administrar alumnado, materias, insignias, materiais, mensaxes, anuncios, calendario e alertas.', privacyWarning:'Por seguridade, os nomes reais do alumnado non se insertan en arquivos públicos de GitHub. A alta real farase en Supabase, en privado.', usersPrepared:'Usuarios preparados para alta privada', teacherAlerts:'Alertas de seguimento', failedGradesAlert:'Suspensos pendentes de revisión', difficultyAlert:'Cambios en materias con dificultade', noAlerts:'Non hai alertas pendentes.', approved:'Aprobado', good:'Ben', notable:'Notable', outstanding:'Sobresaliente', privacyPolicy:'Política de privacidade', cookiesPolicy:'Política de cookies', termsOfUse:'Condicións de uso', dataProtection:'Protección de datos', legalIntro:'Información provisional para fase de desenvolvemento. Antes da apertura real revisarase xuridicamente e adaptarase ao tratamento efectivo de datos.', profileSaved:'Perfil actualizado.', demoLoginNotice:'Inicio de sesión real pendente de Supabase. Esta maqueta non debe conter contrasinais nin datos persoais reais no código público.' });
Object.assign(I18N.en, { teacherPanel:'Teacher panel', profilePreferences:'Personal preferences', preferredName:'Name you want to be called', profileIcon:'Profile icon', notificationPrefs:'Email preferences', personalEmail:'Personal email for alerts', notifyMessages:'New messages', notifyCalendar:'Upcoming events', notifyAnnouncements:'Announcements', notifyMaterials:'New materials', saveProfile:'Save profile', subjectWindow:'Subject', unitsAndMaterials:'Units and materials', materialTeacherNote:'The teacher will be able to view, upload, edit, hide or delete these materials from her panel.', unit:'Unit', notesMaterial:'Notes', testMaterial:'Test', worksheetMaterial:'Worksheet', mockExamMaterial:'Mock exam', gameMaterial:'Game', challengeMaterial:'Challenge', hiddenMaterial:'Hidden', teacherOnly:'Teacher management', teacherPanelIntro:'Panel prepared to manage students, subjects, badges, materials, messages, announcements, calendar and alerts.', privacyWarning:'For safety, real student names are not inserted in public GitHub files. Real account creation will be done privately in Supabase.', usersPrepared:'Users prepared for private creation', teacherAlerts:'Tracking alerts', failedGradesAlert:'Failed marks pending review', difficultyAlert:'Changes in difficult subjects', noAlerts:'No pending alerts.', approved:'Pass', good:'Good', notable:'Very good', outstanding:'Excellent', privacyPolicy:'Privacy policy', cookiesPolicy:'Cookies policy', termsOfUse:'Terms of use', dataProtection:'Data protection', legalIntro:'Provisional information for development stage. Before real launch it must be legally reviewed and adapted to actual data processing.', profileSaved:'Profile updated.', demoLoginNotice:'Real login is pending Supabase. This mock-up must not contain passwords or real personal data in public code.' });
Object.assign(I18N.fr, { teacherPanel:'Panneau professeure', profilePreferences:'Préférences personnelles', preferredName:'Nom par lequel tu veux être appelé(e)', profileIcon:'Icône de profil', notificationPrefs:'Préférences email', personalEmail:'Email personnel pour les avis', notifyMessages:'Nouveaux messages', notifyCalendar:'Événements proches', notifyAnnouncements:'Annonces', notifyMaterials:'Nouveaux matériels', saveProfile:'Enregistrer le profil', subjectWindow:'Matière', unitsAndMaterials:'Unités et matériels', materialTeacherNote:'La professeure pourra voir, téléverser, modifier, masquer ou supprimer ces matériels depuis son panneau.', unit:'Unité', notesMaterial:'Notes', testMaterial:'Test', worksheetMaterial:'Fiche', mockExamMaterial:'Examen blanc', gameMaterial:'Jeu', challengeMaterial:'Défi', hiddenMaterial:'Masqué', teacherOnly:'Gestion professeure', teacherPanelIntro:'Panneau prêt pour gérer élèves, matières, badges, matériels, messages, annonces, calendrier et alertes.', privacyWarning:'Par sécurité, les vrais noms des élèves ne sont pas insérés dans les fichiers publics GitHub. La création réelle se fera dans Supabase, en privé.', usersPrepared:'Utilisateurs préparés pour création privée', teacherAlerts:'Alertes de suivi', failedGradesAlert:'Notes insuffisantes à réviser', difficultyAlert:'Changements dans les matières difficiles', noAlerts:'Aucune alerte.', approved:'Admis', good:'Bien', notable:'Très bien', outstanding:'Excellent', privacyPolicy:'Politique de confidentialité', cookiesPolicy:'Politique de cookies', termsOfUse:'Conditions d’utilisation', dataProtection:'Protection des données', legalIntro:'Information provisoire pour la phase de développement. Avant l’ouverture réelle, elle devra être vérifiée juridiquement.', profileSaved:'Profil mis à jour.', demoLoginNotice:'Connexion réelle en attente de Supabase. Cette maquette ne doit pas contenir de mots de passe ni de données personnelles réelles dans le code public.' });
Object.assign(I18N.pl, { teacherPanel:'Panel nauczycielki', profilePreferences:'Preferencje osobiste', preferredName:'Imię, którym chcesz być nazywany/a', profileIcon:'Ikona profilu', notificationPrefs:'Preferencje email', personalEmail:'Prywatny email do powiadomień', notifyMessages:'Nowe wiadomości', notifyCalendar:'Nadchodzące wydarzenia', notifyAnnouncements:'Ogłoszenia', notifyMaterials:'Nowe materiały', saveProfile:'Zapisz profil', subjectWindow:'Przedmiot', unitsAndMaterials:'Jednostki i materiały', materialTeacherNote:'Nauczycielka będzie mogła przeglądać, dodawać, edytować, ukrywać lub usuwać te materiały ze swojego panelu.', unit:'Jednostka', notesMaterial:'Notatki', testMaterial:'Test', worksheetMaterial:'Zestaw ćwiczeń', mockExamMaterial:'Egzamin próbny', gameMaterial:'Gra', challengeMaterial:'Wyzwanie', hiddenMaterial:'Ukryte', teacherOnly:'Zarządzanie nauczycielki', teacherPanelIntro:'Panel przygotowany do zarządzania uczniami, przedmiotami, odznakami, materiałami, wiadomościami, ogłoszeniami, kalendarzem i alertami.', privacyWarning:'Ze względów bezpieczeństwa prawdziwe nazwiska uczniów nie są umieszczane w publicznych plikach GitHub. Rzeczywiste konta zostaną utworzone prywatnie w Supabase.', usersPrepared:'Użytkownicy przygotowani do prywatnego utworzenia', teacherAlerts:'Alerty', failedGradesAlert:'Oceny niedostateczne do sprawdzenia', difficultyAlert:'Zmiany w trudnych przedmiotach', noAlerts:'Brak alertów.', approved:'Zaliczony', good:'Dobry', notable:'Bardzo dobry', outstanding:'Celujący', privacyPolicy:'Polityka prywatności', cookiesPolicy:'Polityka cookies', termsOfUse:'Warunki użytkowania', dataProtection:'Ochrona danych', legalIntro:'Informacja tymczasowa na etap rozwoju. Przed uruchomieniem wymaga przeglądu prawnego.', profileSaved:'Profil zaktualizowany.', demoLoginNotice:'Prawdziwe logowanie czeka na Supabase. Ta makieta nie może zawierać haseł ani prawdziwych danych osobowych w publicznym kodzie.' });
Object.assign(I18N.de, { teacherPanel:'Lehrerinnen-Panel', profilePreferences:'Persönliche Einstellungen', preferredName:'Name, mit dem du angesprochen werden möchtest', profileIcon:'Profil-Symbol', notificationPrefs:'E-Mail-Einstellungen', personalEmail:'Private E-Mail für Hinweise', notifyMessages:'Neue Nachrichten', notifyCalendar:'Bevorstehende Termine', notifyAnnouncements:'Ankündigungen', notifyMaterials:'Neue Materialien', saveProfile:'Profil speichern', subjectWindow:'Fach', unitsAndMaterials:'Einheiten und Materialien', materialTeacherNote:'Die Lehrerin kann diese Materialien in ihrem Panel ansehen, hochladen, ändern, ausblenden oder löschen.', unit:'Einheit', notesMaterial:'Notizen', testMaterial:'Test', worksheetMaterial:'Arbeitsblatt', mockExamMaterial:'Probeprüfung', gameMaterial:'Spiel', challengeMaterial:'Herausforderung', hiddenMaterial:'Ausgeblendet', teacherOnly:'Verwaltung der Lehrerin', teacherPanelIntro:'Panel zur Verwaltung von Schülerinnen und Schülern, Fächern, Abzeichen, Materialien, Nachrichten, Ankündigungen, Kalender und Warnungen.', privacyWarning:'Aus Sicherheitsgründen werden echte Schülernamen nicht in öffentliche GitHub-Dateien eingefügt. Die reale Anlage erfolgt privat in Supabase.', usersPrepared:'Benutzer für private Anlage vorbereitet', teacherAlerts:'Warnungen', failedGradesAlert:'Nicht bestandene Noten zur Prüfung', difficultyAlert:'Änderungen bei schwierigen Fächern', noAlerts:'Keine Warnungen.', approved:'Bestanden', good:'Gut', notable:'Sehr gut', outstanding:'Ausgezeichnet', privacyPolicy:'Datenschutzerklärung', cookiesPolicy:'Cookie-Richtlinie', termsOfUse:'Nutzungsbedingungen', dataProtection:'Datenschutz', legalIntro:'Vorläufige Information für die Entwicklungsphase. Vor dem echten Start rechtlich prüfen und anpassen.', profileSaved:'Profil aktualisiert.', demoLoginNotice:'Echte Anmeldung wartet auf Supabase. Diese Demo darf keine Passwörter oder echten personenbezogenen Daten im öffentlichen Code enthalten.' });
Object.assign(I18N.pt, { teacherPanel:'Painel da professora', profilePreferences:'Preferências pessoais', preferredName:'Nome pelo qual queres ser chamado/a', profileIcon:'Ícone de perfil', notificationPrefs:'Preferências de email', personalEmail:'Email pessoal para avisos', notifyMessages:'Novas mensagens', notifyCalendar:'Eventos próximos', notifyAnnouncements:'Anúncios', notifyMaterials:'Novos materiais', saveProfile:'Guardar perfil', subjectWindow:'Disciplina', unitsAndMaterials:'Unidades e materiais', materialTeacherNote:'A professora poderá ver, carregar, modificar, ocultar ou eliminar estes materiais no seu painel.', unit:'Unidade', notesMaterial:'Apontamentos', testMaterial:'Teste', worksheetMaterial:'Ficha', mockExamMaterial:'Simulacro de exame', gameMaterial:'Jogo', challengeMaterial:'Desafio', hiddenMaterial:'Oculto', teacherOnly:'Gestão da professora', teacherPanelIntro:'Painel preparado para gerir alunos, disciplinas, insígnias, materiais, mensagens, anúncios, calendário e alertas.', privacyWarning:'Por segurança, os nomes reais dos alunos não são inseridos em ficheiros públicos do GitHub. A criação real será feita no Supabase, em privado.', usersPrepared:'Utilizadores preparados para criação privada', teacherAlerts:'Alertas de acompanhamento', failedGradesAlert:'Notas negativas para revisão', difficultyAlert:'Alterações em disciplinas difíceis', noAlerts:'Não há alertas pendentes.', approved:'Aprovado', good:'Bom', notable:'Muito bom', outstanding:'Excelente', privacyPolicy:'Política de privacidade', cookiesPolicy:'Política de cookies', termsOfUse:'Condições de uso', dataProtection:'Proteção de dados', legalIntro:'Informação provisória para fase de desenvolvimento. Antes da abertura real deverá ser revista juridicamente.', profileSaved:'Perfil atualizado.', demoLoginNotice:'Início de sessão real pendente do Supabase. Esta maqueta não deve conter palavras-passe nem dados pessoais reais no código público.' });


Object.assign(I18N.es, { alias:'Alias', privacyText:'Tribeca Academia tratará únicamente los datos necesarios para gestionar el aula virtual, la comunicación educativa, el seguimiento académico y la atención de consultas. La base jurídica, los plazos de conservación, los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, así como los posibles encargados del tratamiento, deberán concretarse antes de la apertura real.', cookiesText:'En esta fase la maqueta solo usa almacenamiento local del navegador para preferencias visuales y pruebas funcionales. Antes de activar servicios externos, analítica o cookies no técnicas, se incorporará un panel de consentimiento específico.', termsText:'La plataforma deberá usarse con respeto, diligencia, veracidad y finalidad educativa. No se permitirá publicar contenidos ofensivos, suplantar identidades, compartir credenciales ni difundir materiales sin autorización.', dataProtectionText:'No deben introducirse datos personales reales, contraseñas reales ni información académica sensible mientras el proyecto continúe alojado como maqueta pública. La versión operativa deberá funcionar con autenticación, permisos y reglas de seguridad en Supabase.' });
Object.assign(I18N.gl, { alias:'Alias', privacyText:'Tribeca Academia tratará só os datos necesarios para xestionar a aula virtual, a comunicación educativa, o seguimento académico e a atención de consultas. A base xurídica, os prazos de conservación, os dereitos e os posibles encargados do tratamento deberán concretarse antes da apertura real.', cookiesText:'Nesta fase a maqueta só usa almacenamento local do navegador para preferencias visuais e probas funcionais. Antes de activar servizos externos, analítica ou cookies non técnicas, incorporarase un panel de consentimento específico.', termsText:'A plataforma deberá empregarse con respecto, dilixencia, veracidade e finalidade educativa. Non se permitirá publicar contidos ofensivos, suplantar identidades, compartir credenciais nin difundir materiais sen autorización.', dataProtectionText:'Non deben introducirse datos persoais reais, contrasinais reais nin información académica sensible mentres o proxecto continúe aloxado como maqueta pública. A versión operativa deberá funcionar con autenticación, permisos e regras de seguridade en Supabase.' });
Object.assign(I18N.en, { alias:'Alias', privacyText:'Tribeca Academia will process only the data needed to manage the virtual classroom, educational communication, academic monitoring and enquiries. The legal basis, retention periods, user rights and possible data processors must be specified before the real launch.', cookiesText:'At this stage the mock-up only uses browser local storage for visual preferences and functional tests. Before enabling external services, analytics or non-technical cookies, a specific consent panel will be added.', termsText:'The platform must be used respectfully, diligently, truthfully and for educational purposes. Offensive content, impersonation, credential sharing and unauthorised distribution of materials will not be allowed.', dataProtectionText:'Real personal data, real passwords or sensitive academic information must not be entered while the project remains hosted as a public mock-up. The operational version must use authentication, permissions and security rules in Supabase.' });
Object.assign(I18N.fr, { alias:'Alias', privacyText:'Tribeca Academia traitera uniquement les données nécessaires à la gestion de la classe virtuelle, de la communication éducative, du suivi scolaire et des demandes. La base juridique, les durées de conservation, les droits des personnes et les éventuels sous-traitants devront être précisés avant l’ouverture réelle.', cookiesText:'À ce stade, la maquette utilise seulement le stockage local du navigateur pour les préférences visuelles et les essais fonctionnels. Avant d’activer des services externes, de l’analytique ou des cookies non techniques, un panneau de consentement sera ajouté.', termsText:'La plateforme devra être utilisée avec respect, diligence, véracité et finalité éducative. Les contenus offensants, l’usurpation d’identité, le partage d’identifiants et la diffusion non autorisée de matériels ne seront pas autorisés.', dataProtectionText:'Aucune donnée personnelle réelle, aucun mot de passe réel ni aucune information scolaire sensible ne doivent être saisis tant que le projet reste une maquette publique. La version opérationnelle devra utiliser l’authentification, les autorisations et les règles de sécurité dans Supabase.' });
Object.assign(I18N.pl, { alias:'Alias', privacyText:'Tribeca Academia będzie przetwarzać wyłącznie dane potrzebne do zarządzania wirtualną klasą, komunikacją edukacyjną, monitorowaniem nauki i obsługą zapytań. Podstawa prawna, okresy przechowywania, prawa użytkowników i ewentualni podwykonawcy muszą zostać określeni przed rzeczywistym uruchomieniem.', cookiesText:'Na tym etapie makieta używa tylko lokalnej pamięci przeglądarki do preferencji wizualnych i testów funkcjonalnych. Przed włączeniem usług zewnętrznych, analityki lub nietechnicznych cookies zostanie dodany panel zgody.', termsText:'Platforma musi być używana z szacunkiem, starannością, prawdziwością i w celu edukacyjnym. Treści obraźliwe, podszywanie się, udostępnianie danych logowania i nieautoryzowana dystrybucja materiałów nie będą dozwolone.', dataProtectionText:'Nie należy wprowadzać prawdziwych danych osobowych, prawdziwych haseł ani wrażliwych informacji szkolnych, dopóki projekt pozostaje publiczną makietą. Wersja operacyjna musi działać z uwierzytelnianiem, uprawnieniami i regułami bezpieczeństwa w Supabase.' });
Object.assign(I18N.de, { alias:'Alias', privacyText:'Tribeca Academia verarbeitet nur die Daten, die für die Verwaltung des virtuellen Klassenraums, die pädagogische Kommunikation, die schulische Begleitung und Anfragen erforderlich sind. Rechtsgrundlage, Aufbewahrungsfristen, Rechte der Betroffenen und mögliche Auftragsverarbeiter müssen vor dem echten Start festgelegt werden.', cookiesText:'In dieser Phase verwendet die Demo nur lokalen Browserspeicher für Anzeigeeinstellungen und Funktionstests. Vor der Aktivierung externer Dienste, Analytik oder nicht technischer Cookies wird ein eigenes Einwilligungsfeld ergänzt.', termsText:'Die Plattform ist respektvoll, sorgfältig, wahrheitsgemäß und zu Bildungszwecken zu nutzen. Beleidigende Inhalte, Identitätsmissbrauch, Weitergabe von Zugangsdaten und unbefugte Verbreitung von Materialien sind nicht erlaubt.', dataProtectionText:'Solange das Projekt als öffentliche Demo gehostet wird, dürfen keine echten personenbezogenen Daten, echten Passwörter oder sensiblen schulischen Informationen eingegeben werden. Die operative Version muss mit Authentifizierung, Berechtigungen und Sicherheitsregeln in Supabase arbeiten.' });
Object.assign(I18N.pt, { alias:'Alias', privacyText:'A Tribeca Academia tratará apenas os dados necessários para gerir a aula virtual, a comunicação educativa, o acompanhamento académico e as consultas. A base jurídica, os prazos de conservação, os direitos dos utilizadores e eventuais subcontratantes deverão ser definidos antes da abertura real.', cookiesText:'Nesta fase, a maqueta usa apenas armazenamento local do navegador para preferências visuais e testes funcionais. Antes de ativar serviços externos, analítica ou cookies não técnicos, será incorporado um painel específico de consentimento.', termsText:'A plataforma deverá ser usada com respeito, diligência, veracidade e finalidade educativa. Não serão permitidos conteúdos ofensivos, usurpação de identidade, partilha de credenciais nem difusão não autorizada de materiais.', dataProtectionText:'Não devem ser introduzidos dados pessoais reais, palavras-passe reais nem informação académica sensível enquanto o projeto continuar alojado como maqueta pública. A versão operacional deverá funcionar com autenticação, permissões e regras de segurança no Supabase.' });

let currentSubjectName = '';
function getProfileSettings() { return JSON.parse(localStorage.getItem('tribeca-profile-settings') || '{"icon":"💡","preferredName":"","email":"","notify":{}}'); }
function setProfileSettings(settings) { localStorage.setItem('tribeca-profile-settings', JSON.stringify(settings)); }
function userDisplayName() { return getProfileSettings().preferredName || demoUser.name; }
function getUserSubjects() {
  const key = `${demoUser.stage}-${demoUser.course}`;
  return subjectCatalog[key] || subjectCatalog['ESO-1.º ESO'];
}
function subjectVisual(subject, index) {
  const marks = ['◎','✦','GB','FR','✧','▰','π','GH','FQ','EV','TD','MU'];
  const classes = ['subject-support','subject-bio','subject-english','subject-french','subject-castilian','subject-galician'];
  return { mark: marks[index % marks.length], cls: classes[index % classes.length] };
}
function renderSubjectsGrid() {
  const grid = $('#subjectsGrid');
  if (!grid) return;
  const list = getUserSubjects();
  grid.innerHTML = list.map((subject, index) => {
    const visual = subjectVisual(subject, index);
    return `<article class="subject-card ${visual.cls}" tabindex="0" role="button" data-subject="${escapeHtml(subject)}">
      <div class="subject-top"><span>${escapeHtml(demoUser.course)}</span><button type="button" aria-label="Opciones">•••</button></div>
      <div class="subject-mark">${visual.mark}</div>
      <h3>${escapeHtml(subject)}</h3>
      <p><span>${tr('zeroPosts')}</span> · <span>${index === 2 ? tr('oneUnit') : tr('zeroUnits')}</span></p>
      <div class="progress-row"><span>${tr('progress')}</span><strong>0%</strong></div>
      <div class="progress"><span style="width:0%"></span></div>
      <small>${tr('noActivities')}</small>
    </article>`;
  }).join('');
  $$('.subject-card', grid).forEach(card => {
    const open = () => { currentSubjectName = card.dataset.subject; openTool('subjectDetail'); };
    card.addEventListener('click', event => { if (!event.target.closest('button')) open(); });
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
}

function renderStaticUserTexts() {
  $('#studentHeroName').textContent = userDisplayName();
  const settings = getProfileSettings();
  const avatar = $('#profileAvatar');
  if (avatar) avatar.textContent = settings.icon || '💡';
  const centerName = demoUser.center === 'Centro sin asignar' ? tr('assignedCenter') : demoUser.center;
  const academicLine = `${centerName} · ${demoUser.stage} · ${demoUser.course}`;
  $('#studentCenterLine').textContent = academicLine;
  $('#quickCenterText').textContent = academicLine;
  $('#todayLine').textContent = formatLongDate(new Date());
}

function applyTranslations() {
  const lang = $('#languageSelect').value;
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  $('#themeText').textContent = document.body.classList.contains('is-dark') ? tr('themeDark') : tr('themeLight');
  renderStaticUserTexts();
  renderQuickCards();
  renderSubjectsGrid();
  rerenderOpenWindows();
}

function toolTitle(id) {
  if (id === 'subjectDetail') return currentSubjectName || tr('subjectWindow');
  if (id === 'teacherPanel') return tr('teacherPanel');
  return tr(`tool${id.charAt(0).toUpperCase()}${id.slice(1)}`) || tr(id) || id;
}

function toolContent(id) {
  if (id === 'calendar') return calendarContent();
  if (id === 'messages') return messagesContent();
  if (id === 'chat') return chatContent();
  if (id === 'announcements') return announcementsContent();
  if (id === 'contact') return contactContent();
  if (id === 'support') return supportContent();
  if (id === 'legal') return legalContent();
  if (id === 'profile') return profileContent();
  if (id === 'badges') return badgesContent();
  if (id === 'difficulties') return difficultiesContent();
  if (id === 'grades') return gradesContent();
  if (id === 'subjectDetail') return subjectContent(currentSubjectName);
  if (id === 'teacherPanel') return teacherPanelContent();
  return `<p>${tr('preparedSupabase')}</p>`;
}

function gradeStatusClass(value) {
  if (value < 5) return 'grade-fail';
  if (value < 6) return 'grade-approved';
  if (value < 7) return 'grade-good';
  if (value < 9) return 'grade-notable';
  return 'grade-outstanding';
}
function gradeStatusLabel(value) {
  if (value < 5) return tr('insufficient');
  if (value < 6) return tr('approved');
  if (value < 7) return tr('good');
  if (value < 9) return tr('notable');
  return tr('outstanding');
}

function difficultiesContent() {
  const items = getDifficulties();
  const list = getUserSubjects();
  return `<div class="window-grid"><section class="window-panel"><h3>${tr('difficultyFormTitle')}</h3><form class="form-grid" id="difficultyForm"><input type="hidden" name="id" /><div class="form-row"><label>${tr('subject')} *</label><select name="subject" required><option value="">${tr('selectOption')}</option>${list.map(s => `<option>${escapeHtml(s)}</option>`).join('')}</select></div><div class="form-row"><label>${tr('level')} *</label><select name="level" required><option>${tr('low')}</option><option>${tr('medium')}</option><option>${tr('high')}</option></select></div><div class="form-row"><label>${tr('notes')}</label><textarea name="notes" maxlength="500"></textarea></div><button class="primary-btn" type="submit">${tr('saveDifficulty')}</button></form><p class="meta">${tr('teacherNotice')}</p></section><section class="window-panel"><h3>${tr('currentDifficulties')}</h3><div class="item-list" id="difficultyList">${renderDifficultyList(items)}</div></section></div>`;
}
function gradesContent() {
  const grades = getGrades();
  const list = getUserSubjects();
  return `<div class="window-grid"><section class="window-panel"><h3>${tr('addGrade')}</h3><p>${tr('gradesIntro')}</p><form class="form-grid" id="gradeForm"><input type="hidden" name="id" /><div class="window-grid"><div class="form-row"><label>${tr('subject')} *</label><select name="subject" required><option value="">${tr('selectOption')}</option>${list.map(s => `<option>${escapeHtml(s)}</option>`).join('')}</select></div><div class="form-row"><label>${tr('didacticUnit')} *</label><input name="unit" required maxlength="80" placeholder="${tr('unitPlaceholder')}" /></div></div><div class="window-grid"><div class="form-row"><label>${tr('evaluation')} *</label><select name="evaluation" required><option>${tr('firstEval')}</option><option>${tr('secondEval')}</option><option>${tr('thirdEval')}</option></select></div><div class="form-row"><label>${tr('testType')} *</label><select name="type" required><option>${tr('exam')}</option><option>${tr('project')}</option><option>${tr('presentation')}</option><option>${tr('oralExam')}</option></select></div></div><div class="window-grid"><div class="form-row"><label>${tr('grade')} *</label><input name="grade" type="number" min="0" max="10" step="0.01" required /></div><div class="form-row"><label>${tr('weight')}</label><input name="weight" type="number" min="0.1" max="100" step="0.1" placeholder="${tr('ordinaryWeight')}" /></div></div><button class="primary-btn" type="submit">${tr('saveGrade')}</button></form></section><section class="window-panel"><h3>${tr('averages')}</h3><div class="summary-grid" id="averagesList">${renderAverages(grades)}</div></section></div><section class="window-panel" style="margin-top:1rem;"><h3>${tr('gradeRecords')}</h3><div class="table-wrap" id="gradesTable">${renderGradesTable(grades)}</div></section>`;
}

function subjectContent(subject) {
  const materials = [
    { unit:'1', type:tr('notesMaterial'), title:`${tr('notesMaterial')} · ${subject}` },
    { unit:'1', type:tr('testMaterial'), title:`${tr('testMaterial')} · ${subject}` },
    { unit:'2', type:tr('worksheetMaterial'), title:`${tr('worksheetMaterial')} · ${subject}` },
    { unit:'2', type:tr('mockExamMaterial'), title:`${tr('mockExamMaterial')} · ${subject}` },
    { unit:'3', type:tr('gameMaterial'), title:`${tr('gameMaterial')} · ${subject}` },
    { unit:'3', type:tr('challengeMaterial'), title:`${tr('challengeMaterial')} · ${subject}`, hidden:true }
  ];
  return `<div class="window-grid"><section class="window-panel"><h3>${tr('unitsAndMaterials')}</h3><p>${tr('materialTeacherNote')}</p><div class="subject-material-grid">${materials.map(m => `<article class="material-card"><span class="material-type">${escapeHtml(m.type)}</span><strong>${escapeHtml(m.title)}</strong><p class="meta">${tr('unit')} ${m.unit}${m.hidden ? ` · ${tr('hiddenMaterial')}` : ''}</p><div class="inline-actions"><button class="secondary-btn" type="button">${tr('edit')}</button><button class="secondary-btn" type="button">${tr('hiddenMaterial')}</button><button class="danger-btn" type="button">${tr('remove')}</button></div></article>`).join('')}</div></section><section class="window-panel"><h3>${tr('teacherOnly')}</h3><form class="form-grid" id="materialForm"><div class="form-row"><label>${tr('calendarTitle')}</label><input maxlength="90" /></div><div class="form-row"><label>${tr('testType')}</label><select><option>${tr('notesMaterial')}</option><option>${tr('testMaterial')}</option><option>${tr('worksheetMaterial')}</option><option>${tr('mockExamMaterial')}</option><option>${tr('gameMaterial')}</option><option>${tr('challengeMaterial')}</option></select></div><div class="form-row"><label>${tr('unit')}</label><input maxlength="40" /></div><button class="primary-btn" type="submit">${tr('preparedSupabase')}</button></form></section></div>`;
}

function profileContent() {
  const settings = getProfileSettings();
  const notify = settings.notify || {};
  return `<div class="window-grid"><section class="window-panel"><h3>${tr('profilePreferences')}</h3><form class="form-grid" id="profileForm"><div class="form-row"><label>${tr('preferredName')}</label><input name="preferredName" maxlength="50" value="${escapeHtml(settings.preferredName || '')}" /></div><div class="form-row"><label>${tr('profileIcon')}</label><div class="icon-grid">${avatarIcons.map(icon => `<button type="button" class="icon-choice ${settings.icon === icon ? 'is-selected' : ''}" data-avatar="${icon}">${icon}</button>`).join('')}</div><input type="hidden" name="icon" value="${escapeHtml(settings.icon || '💡')}" /></div><div class="form-row"><label>${tr('personalEmail')}</label><input name="email" type="email" maxlength="120" value="${escapeHtml(settings.email || '')}" /></div><h3>${tr('notificationPrefs')}</h3><div class="notification-options"><label><input type="checkbox" name="notifyMessages" ${notify.messages ? 'checked' : ''}> ${tr('notifyMessages')}</label><label><input type="checkbox" name="notifyCalendar" ${notify.calendar ? 'checked' : ''}> ${tr('notifyCalendar')}</label><label><input type="checkbox" name="notifyAnnouncements" ${notify.announcements ? 'checked' : ''}> ${tr('notifyAnnouncements')}</label><label><input type="checkbox" name="notifyMaterials" ${notify.materials ? 'checked' : ''}> ${tr('notifyMaterials')}</label></div><button class="primary-btn" type="submit">${tr('saveProfile')}</button></form></section><section class="window-panel"><h3>${tr('academicData')}</h3><div class="form-grid"><div class="form-row"><label>${tr('assignedByTeacher')}</label><input value="${escapeHtml(demoUser.center)}" disabled /></div><div class="window-grid"><div class="form-row"><label>${tr('stage')}</label><input value="${escapeHtml(demoUser.stage)}" disabled /></div><div class="form-row"><label>${tr('course')}</label><input value="${escapeHtml(demoUser.course)}" disabled /></div></div><p class="meta">${tr('academicLocked')}</p><p class="login-note">${tr('demoLoginNotice')}</p></div><hr /><h3>${tr('promotionRules')}</h3><p>${tr('promotionText')}</p></section></div>`;
}

function teacherPanelContent() {
  const failed = getGrades().some(g => Number(g.grade) < 5);
  const diffNotice = localStorage.getItem('tribeca-difficulty-teacher-notice') === '1';
  return `<div class="window-grid"><section class="window-panel"><h3>${tr('teacherPanel')}</h3><p>${tr('teacherPanelIntro')}</p><p class="login-note">${tr('privacyWarning')}</p><h3>${tr('teacherAlerts')}</h3><div class="item-list">${failed ? `<article class="list-item teacher-alert"><strong>${tr('failedGradesAlert')}</strong><p>${tr('failNotice')}</p></article>` : ''}${diffNotice ? `<article class="list-item teacher-alert"><strong>${tr('difficultyAlert')}</strong><p>${tr('teacherNotice')}</p></article>` : ''}${(!failed && !diffNotice) ? `<div class="empty-state">${tr('noAlerts')}</div>` : ''}</div></section><section class="window-panel"><h3>${tr('usersPrepared')}</h3><div class="table-wrap"><table><thead><tr><th>${tr('alias')}</th><th>${tr('stage')}</th><th>${tr('course')}</th><th>${tr('centerTitle')}</th></tr></thead><tbody>${publicStudentImportPlan.map(s => `<tr><td>${s.alias}</td><td>${escapeHtml(s.stage)}</td><td>${escapeHtml(s.course)}</td><td>${escapeHtml(s.center)}</td></tr>`).join('')}</tbody></table></div></section></div>`;
}

function legalContent() {
  return `<section class="window-panel privacy-section"><h3>${tr('legalTitle')}</h3><p>${tr('legalIntro')}</p><h4>${tr('legalNotice')}</h4><p>${tr('legalText1')}</p><p>${tr('legalText2')}</p><p>${tr('legalText3')}</p><h4>${tr('privacyPolicy')}</h4><p>${tr('privacyText')}</p><h4>${tr('cookiesPolicy')}</h4><p>${tr('cookiesText')}</p><h4>${tr('termsOfUse')}</h4><p>${tr('termsText')}</p><h4>${tr('dataProtection')}</h4><p>${tr('dataProtectionText')}</p><p>${tr('legalText5')}</p></section>`;
}

function bindWindowForms(win, id) {
  const contact = $('#contactForm', win);
  if (contact) contact.addEventListener('submit', handleContactSubmit);
  const eventForm = $('#eventForm', win);
  if (eventForm) eventForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(eventForm).entries()); const items = getUserEvents(); items.push({ id: uid(), date: data.date, title: data.title, type: data.scope || 'personal', scope: data.scope || 'personal' }); setUserEvents(items); showToast(tr('saved')); updateCalendarBadge(); rerenderOpenWindows(); });
  const contextSelect = $('#calendarContextSelect', win);
  if (contextSelect) contextSelect.addEventListener('change', event => { localStorage.setItem('tribeca-calendar-context', event.target.value); rerenderOpenWindows(); });
  const prev = $('[data-calendar-prev]', win); const next = $('[data-calendar-next]', win);
  if (prev) prev.addEventListener('click', () => { calendarMonth = addMonths(calendarMonth, -1); rerenderOpenWindows(); });
  if (next) next.addEventListener('click', () => { calendarMonth = addMonths(calendarMonth, 1); rerenderOpenWindows(); });
  $$('.calendar-day[data-date]', win).forEach(day => day.addEventListener('click', () => { selectedCalendarDate = day.dataset.date; calendarMonth = startOfMonth(parseIso(selectedCalendarDate)); rerenderOpenWindows(); }));
  const difficultyForm = $('#difficultyForm', win);
  if (difficultyForm) difficultyForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(difficultyForm).entries()); const items = getDifficulties(); if (data.id) { const index = items.findIndex(item => item.id === data.id); if (index >= 0) items[index] = { id: data.id, subject: data.subject, level: data.level, notes: data.notes }; } else { items.push({ id: uid(), subject: data.subject, level: data.level, notes: data.notes }); } setDifficulties(items); localStorage.setItem('tribeca-difficulty-teacher-notice', '1'); showToast(tr('saved')); renderQuickCards(); rerenderOpenWindows(); });
  $$('[data-edit-difficulty]', win).forEach(button => button.addEventListener('click', () => { const item = getDifficulties().find(d => d.id === button.dataset.editDifficulty); const form = $('#difficultyForm', win); if (!item || !form) return; form.elements.id.value = item.id; form.elements.subject.value = item.subject; form.elements.level.value = item.level; form.elements.notes.value = item.notes || ''; }));
  $$('[data-delete-difficulty]', win).forEach(button => button.addEventListener('click', () => { setDifficulties(getDifficulties().filter(item => item.id !== button.dataset.deleteDifficulty)); localStorage.setItem('tribeca-difficulty-teacher-notice', '1'); showToast(tr('deleted')); renderQuickCards(); rerenderOpenWindows(); }));
  const gradeForm = $('#gradeForm', win);
  if (gradeForm) gradeForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(gradeForm).entries()); const items = getGrades(); const record = { id: data.id || uid(), subject: data.subject, unit: data.unit, evaluation: data.evaluation, type: data.type, grade: Number(data.grade), weight: data.weight ? Number(data.weight) : '' }; if (data.id) { const index = items.findIndex(item => item.id === data.id); if (index >= 0) items[index] = record; } else items.push(record); setGrades(items); updateGradeTeacherNotice(items); showToast(tr('saved')); renderQuickCards(); rerenderOpenWindows(); });
  $$('[data-edit-grade]', win).forEach(button => button.addEventListener('click', () => { const item = getGrades().find(g => g.id === button.dataset.editGrade); const form = $('#gradeForm', win); if (!item || !form) return; form.elements.id.value = item.id; form.elements.subject.value = item.subject; form.elements.unit.value = item.unit; form.elements.evaluation.value = item.evaluation; form.elements.type.value = item.type; form.elements.grade.value = item.grade; form.elements.weight.value = item.weight || ''; }));
  $$('[data-delete-grade]', win).forEach(button => button.addEventListener('click', () => { const updated = getGrades().filter(item => item.id !== button.dataset.deleteGrade); setGrades(updated); updateGradeTeacherNotice(updated); showToast(tr('deleted')); renderQuickCards(); rerenderOpenWindows(); }));
  const profileForm = $('#profileForm', win);
  if (profileForm) profileForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(profileForm).entries()); setProfileSettings({ preferredName:data.preferredName || '', icon:data.icon || '💡', email:data.email || '', notify:{ messages:!!data.notifyMessages, calendar:!!data.notifyCalendar, announcements:!!data.notifyAnnouncements, materials:!!data.notifyMaterials } }); showToast(tr('profileSaved')); renderStaticUserTexts(); rerenderOpenWindows(); });
  $$('.icon-choice', win).forEach(button => button.addEventListener('click', () => { const form = $('#profileForm', win); if (!form) return; form.elements.icon.value = button.dataset.avatar; $$('.icon-choice', win).forEach(b => b.classList.remove('is-selected')); button.classList.add('is-selected'); }));
  const chatForm = $('#chatForm', win);
  if (chatForm) chatForm.addEventListener('submit', event => { event.preventDefault(); const input = $('input', chatForm); const value = input.value.trim(); if (!value) return; $('#chatThread', win).insertAdjacentHTML('beforeend', `<div class="chat-bubble me is-new"><strong>${escapeHtml(userDisplayName())}</strong><br />${escapeHtml(value)}</div>`); animateChatEffect(win, value.slice(-2)); input.value = ''; });
  $$('[data-emoji]', win).forEach(button => button.addEventListener('click', () => { const input = $('#chatForm input', win); input.value = `${input.value}${button.dataset.emoji}`; input.focus(); }));
  const touchButton = $('[data-touch]', win);
  if (touchButton) touchButton.addEventListener('click', () => { $('#chatThread', win).insertAdjacentHTML('beforeend', `<div class="chat-bubble me is-new"><strong>${escapeHtml(userDisplayName())}</strong><br />👋 ${tr('waveTouch')}</div>`); animateChatEffect(win, '👋', 1500, true); });
  $$('form', win).forEach(form => { if (['contactForm','eventForm','chatForm','difficultyForm','gradeForm','profileForm'].includes(form.id)) return; form.addEventListener('submit', event => { event.preventDefault(); showToast(tr('preparedSupabase')); }); });
  const contactButton = $('[data-open-contact]', win); if (contactButton) contactButton.addEventListener('click', () => openTool('contact'));
}


function renderCalendarGrid(monthDate, contextKey) {
  const baseMonday = new Date(2026, 0, 5);
  const weekdays = Array.from({length:7}, (_, i) => new Intl.DateTimeFormat(localeForCurrentLang(), { weekday:'short' }).format(addDays(baseMonday, i)).replace('.', ''));
  const first = startOfMonth(monthDate);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const todayIso = toIsoDate(new Date());
  const contextEvents = eventsForContext(contextKey);
  let html = weekdays.map(day => `<div class="calendar-weekday">${escapeHtml(day)}</div>`).join('');
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    const iso = toIsoDate(date);
    const dayEvents = contextEvents.filter(event => event.date === iso);
    html += `<button type="button" class="calendar-day ${date.getMonth() !== monthDate.getMonth() ? 'is-other' : ''} ${iso === todayIso ? 'is-today' : ''} ${iso === selectedCalendarDate ? 'is-selected' : ''} ${dayEvents.length ? 'has-events' : ''}" data-date="${iso}" title="${dayEvents.map(e => escapeHtml(e.title)).join(' | ')}"><span class="day-number">${date.getDate()}</span>${dayEvents.slice(0, 3).map(e => `<span class="day-event-label"><i class="day-event-dot event-${eventVisualType(e)}"></i>${escapeHtml(e.title)}</span>`).join('')}</button>`;
  }
  return html;
}

function init() {
  migrateSettings();
  const savedZoom = localStorage.getItem('tribeca-zoom') || '60';
  const savedFont = localStorage.getItem('tribeca-font') || 'default';
  const savedTheme = localStorage.getItem('tribeca-theme') || 'light';
  $('#zoomSelect').value = savedZoom; $('#fontSelect').value = savedFont;
  applyZoom(savedZoom); applyFont(savedFont); if (savedTheme === 'dark') document.body.classList.add('is-dark');
  applyTranslations(); updateCalendarBadge(); setHeaderHeight();
  $('#zoomSelect').addEventListener('change', event => applyZoom(event.target.value));
  $('#fontSelect').addEventListener('change', event => applyFont(event.target.value));
  $('#languageSelect').addEventListener('change', () => { applyTranslations(); updateCalendarBadge(); });
  $('#themeToggle').addEventListener('click', toggleTheme);
  $$('.nav-btn[data-route="subjects"]').forEach(button => button.addEventListener('click', () => { $$('.nav-btn').forEach(b => b.classList.remove('is-active')); button.classList.add('is-active'); $('#subjects').scrollIntoView({ block: 'start' }); }));
  $$('[data-tool]').forEach(button => button.addEventListener('click', () => openTool(button.dataset.tool)));
  $('#profileButton').addEventListener('click', () => { const menu = $('#profileMenu'); menu.hidden = !menu.hidden; $('#profileButton').setAttribute('aria-expanded', String(!menu.hidden)); });
  document.addEventListener('click', event => { if (!event.target.closest('.profile-area')) $('#profileMenu').hidden = true; });
  $$('[data-action="logout"]').forEach(btn => btn.addEventListener('click', () => showToast(tr('logoutReady'))));
  window.addEventListener('resize', setHeaderHeight);
}

document.addEventListener('DOMContentLoaded', init);

/* =========================================================
   Tribeca Aula · revisión 7: calendario editable, publicaciones
   reales y reclamación de insignias
   ========================================================= */
Object.assign(I18N.es, {
  toolPublicationsManager:'Publicaciones y materiales', toolNewPublication:'Nueva publicación', toolNewDate:'Nueva fecha', toolStudentGroups:'Grupos de alumnado', toolActivityLog:'Actividad reciente', toolClassChats:'Chats del aula', toolTeacherAlertsTool:'Alertas docentes', toolClassOverview:'Vista general del aula', toolSubjectImage:'Imagen de asignatura', toolAssignBadge:'Asignar insignia', toolPasswordRequests:'Recuperación de contraseña', toolManageStudents:'Gestionar alumnado', toolStudentProfiles:'Perfiles del alumnado',
  publicationManagerTitle:'Publicaciones y materiales', publicationManagerIntro:'Desde aquí puedes crear, editar, ocultar o eliminar publicaciones y materiales. También puedes actuar en bloque por materia, unidad o tipo.', noPublicationsYet:'Todavía no hay publicaciones reales creadas por la profesora.', newPublicationTitle:'Nueva publicación', title:'Título', bodyText:'Cuerpo de la publicación', imageUrl:'URL de imagen visible', linkUrl:'Enlace externo', fontSize:'Tamaño de fuente', earnableBadges:'Insignias que se podrán ganar', materialType:'Tipo de material', visible:'Visible', hidden:'Oculto', hide:'Ocultar', show:'Mostrar', quickDelete:'Eliminar rápido', editEvent:'Editar fecha', hideEvent:'Ocultar fecha', teacherCalendarActions:'Acciones docentes', claimBadge:'Reclamar mi insignia', claimBadgeIntro:'Podrás reclamar esta insignia cuando hayas superado la actividad. La profesora revisará la solicitud antes de asignarla.', badgeClaimSent:'Solicitud de insignia enviada a la profesora.', publicationSaved:'Publicación guardada correctamente.', publicationDeleted:'Publicación eliminada.', publicationHidden:'Publicación ocultada.', publicationVisible:'Publicación visible de nuevo.', confirmDelete:'¿Seguro que quieres eliminarlo?', quickEdit:'Edición rápida', eventSaved:'Fecha guardada correctamente.', eventHidden:'Fecha ocultada.', eventDeleted:'Fecha eliminada.', officialEventLocked:'Las fechas oficiales no se eliminan; solo sirven como referencia.'
});
Object.assign(I18N.gl, { publicationManagerTitle:'Publicacións e materiais', noPublicationsYet:'Aínda non hai publicacións reais creadas pola profesora.', newPublicationTitle:'Nova publicación', title:'Título', bodyText:'Corpo da publicación', imageUrl:'URL da imaxe visible', linkUrl:'Ligazón externa', fontSize:'Tamaño da fonte', earnableBadges:'Insignias que se poderán gañar', materialType:'Tipo de material', visible:'Visible', hidden:'Oculto', hide:'Ocultar', show:'Mostrar', quickDelete:'Eliminar rápido', editEvent:'Editar data', hideEvent:'Ocultar data', teacherCalendarActions:'Accións docentes', claimBadge:'Reclamar a miña insignia', claimBadgeIntro:'Poderás reclamar esta insignia cando superes a actividade. A profesora revisará a solicitude antes de asignala.', badgeClaimSent:'Solicitude de insignia enviada á profesora.' });
Object.assign(I18N.en, { publicationManagerTitle:'Publications and materials', noPublicationsYet:'There are no real teacher publications yet.', newPublicationTitle:'New publication', title:'Title', bodyText:'Publication body', imageUrl:'Visible image URL', linkUrl:'External link', fontSize:'Font size', earnableBadges:'Badges that can be earned', materialType:'Material type', visible:'Visible', hidden:'Hidden', hide:'Hide', show:'Show', quickDelete:'Quick delete', editEvent:'Edit date', hideEvent:'Hide date', teacherCalendarActions:'Teacher actions', claimBadge:'Claim my badge', claimBadgeIntro:'You can claim this badge once you have completed the activity. The teacher will review the request before awarding it.', badgeClaimSent:'Badge request sent to the teacher.' });
Object.assign(I18N.fr, I18N.en); Object.assign(I18N.pl, I18N.en); Object.assign(I18N.de, I18N.en); Object.assign(I18N.pt, I18N.en);

function isTeacherRole() {
  return window.TribecaAuth?.profile?.role === 'teacher' || document.body.classList.contains('is-teacher');
}

function publicationStorageKey() { return 'tribeca-publications'; }
function getPublicationRecords() {
  try { return JSON.parse(localStorage.getItem(publicationStorageKey()) || '[]').filter(Boolean); } catch (_) { return []; }
}
function setPublicationRecords(items) {
  localStorage.setItem(publicationStorageKey(), JSON.stringify(items || []));
  if (typeof window.syncPublicationRecords === 'function') window.syncPublicationRecords(items || []);
}
function materialTypeOptions() {
  return [
    ['apuntes','Apuntes'], ['test','Test'], ['boletin','Boletín'], ['simulacro','Simulacro de examen'],
    ['juego','Juego'], ['desafio','Desafío'], ['tarea','Tarea'], ['aviso','Aviso'], ['noticia','Noticia']
  ];
}
function badgeOptionsForForms() {
  return (typeof availableBadges !== 'undefined' ? availableBadges : [])
    .map((badge, index) => ({ code: badge.code || badge.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `badge_${index}`, icon: badge.icon, name: badge.name }));
}
function normalizePublicationRecord(data, current = {}) {
  return {
    id: current.id || data.id || uid(),
    subject: data.subject || current.subject || '',
    unit: data.unit || current.unit || 'Unidad 1',
    type: data.type || current.type || 'apuntes',
    title: data.title || current.title || '',
    body: data.body || current.body || '',
    imageUrl: data.imageUrl || current.imageUrl || '',
    linkUrl: data.linkUrl || current.linkUrl || '',
    fontSize: Number(data.fontSize || current.fontSize || 16),
    badgeCodes: Array.isArray(data.badgeCodes) ? data.badgeCodes : (typeof data.badgeCodes === 'string' && data.badgeCodes ? data.badgeCodes.split(',') : (current.badgeCodes || [])),
    hidden: data.hidden === 'on' || data.hidden === true || current.hidden === true,
    createdAt: current.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
function publicationsForSubject(subject) {
  return getPublicationRecords().filter(p => p.subject === subject && (isTeacherRole() || !p.hidden));
}
function renderPublicationBadgeList(pub) {
  const badges = badgeOptionsForForms().filter(b => (pub.badgeCodes || []).includes(b.code));
  if (!badges.length) return '';
  return `<div class="publication-badges">${badges.map(b => `<span class="publication-badge">${escapeHtml(b.icon)} ${escapeHtml(b.name)}</span>`).join('')}</div>`;
}
function renderPublicationMedia(pub) {
  const image = pub.imageUrl ? `<figure class="publication-image"><img src="${escapeHtml(pub.imageUrl)}" alt="${escapeHtml(pub.title)}" loading="lazy" /></figure>` : '';
  const link = pub.linkUrl ? `<p><a class="publication-link" href="${escapeHtml(pub.linkUrl)}" target="_blank" rel="noopener">${escapeHtml(pub.linkUrl)}</a></p>` : '';
  return image + link;
}
function renderPublicationCard(pub, compact = false) {
  const teacherActions = isTeacherRole()
    ? `<div class="inline-actions publication-actions"><button class="secondary-btn" type="button" data-edit-publication="${escapeHtml(pub.id)}">${tr('edit')}</button><button class="secondary-btn" type="button" data-toggle-publication="${escapeHtml(pub.id)}">${pub.hidden ? tr('show') : tr('hide')}</button><button class="danger-btn" type="button" data-delete-publication="${escapeHtml(pub.id)}">${tr('quickDelete')}</button></div>`
    : '';
  const claim = !isTeacherRole() && (pub.badgeCodes || []).length
    ? `<div class="badge-claim-box"><p>${tr('claimBadgeIntro')}</p><button type="button" class="secondary-btn" data-claim-badge="${escapeHtml(pub.id)}">${tr('claimBadge')}</button></div>`
    : '';
  return `<article class="publication-card ${pub.hidden ? 'is-hidden-publication' : ''}" data-publication-card="${escapeHtml(pub.id)}"><div class="publication-meta"><span class="material-type">${escapeHtml(materialTypeOptions().find(t => t[0] === pub.type)?.[1] || pub.type)}</span><span>${escapeHtml(pub.unit)}</span><span>${pub.hidden ? tr('hidden') : tr('visible')}</span></div><h3 class="publication-title-display">${escapeHtml(pub.title)}</h3>${renderPublicationMedia(pub)}<div class="publication-body" style="font-size:${Math.max(12, Math.min(28, Number(pub.fontSize) || 16))}px">${escapeHtml(pub.body || '').replace(/\n/g, '<br>')}</div>${renderPublicationBadgeList(pub)}${claim}${teacherActions}</article>`;
}

function subjectContent(subject) {
  const materials = publicationsForSubject(subject);
  const grouped = new Map();
  materials.forEach(item => { const key = item.unit || 'Unidad 1'; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(item); });
  const unitsHtml = materials.length ? [...grouped.entries()].map(([unit, items]) => `<section class="subject-unit-block"><h3>${escapeHtml(unit)}</h3><div class="subject-material-grid publications-in-subject">${items.map(p => renderPublicationCard(p, true)).join('')}</div></section>`).join('') : `<div class="empty-state">${tr('noPublicationsYet')}</div>`;
  const teacherCreate = isTeacherRole() ? `<section class="window-panel"><h3>${tr('newPublicationTitle')}</h3>${publicationFormMarkup(subject)}</section>` : '';
  return `<div class="subject-window-layout"><section class="window-panel"><h3>${escapeHtml(subject)}</h3><p class="meta">${tr('unitsAndMaterials')}</p>${unitsHtml}</section>${teacherCreate}</div>`;
}

function publicationFormMarkup(defaultSubject = '') {
  const subjectsList = typeof getUserSubjects === 'function' ? getUserSubjects() : subjects;
  const badges = badgeOptionsForForms();
  return `<form class="form-grid publication-editor-form" id="publicationForm"><input type="hidden" name="id" /><div class="window-grid"><div class="form-row"><label>${tr('subject')} *</label><select name="subject" required><option value="">${tr('selectOption')}</option>${subjectsList.map(s => `<option ${s === defaultSubject ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></div><div class="form-row"><label>${tr('didacticUnit')} *</label><input name="unit" required maxlength="80" value="Unidad 1" /></div></div><div class="window-grid"><div class="form-row"><label>${tr('materialType')} *</label><select name="type" required>${materialTypeOptions().map(([value,label]) => `<option value="${value}">${label}</option>`).join('')}</select></div><div class="form-row"><label>${tr('fontSize')}</label><select name="fontSize"><option value="14">14</option><option value="16" selected>16</option><option value="18">18</option><option value="20">20</option><option value="22">22</option><option value="24">24</option></select></div></div><div class="form-row"><label>${tr('title')} *</label><input class="publication-title-input" name="title" required maxlength="120" /></div><div class="emoji-row publication-emoji-row">${['😊','👏','📚','⭐','💪','🎯','✅','🧠','✍️','🏆','⚠️','📌'].map(e => `<button type="button" data-publication-emoji="${e}">${e}</button>`).join('')}</div><div class="form-row"><label>${tr('bodyText')} *</label><textarea name="body" required maxlength="2500"></textarea></div><div class="window-grid"><div class="form-row"><label>${tr('imageUrl')}</label><input name="imageUrl" type="url" placeholder="https://..." /></div><div class="form-row"><label>${tr('linkUrl')}</label><input name="linkUrl" type="url" placeholder="https://..." /></div></div><div class="form-row"><label>${tr('earnableBadges')}</label><div class="badge-checkbox-grid">${badges.map(b => `<label><input type="checkbox" name="badgeCodes" value="${escapeHtml(b.code)}"> ${escapeHtml(b.icon)} ${escapeHtml(b.name)}</label>`).join('')}</div></div><label class="checkbox-line"><input type="checkbox" name="hidden"> ${tr('hidden')}</label><button class="primary-btn" type="submit">${tr('publishAnnouncement')}</button></form>`;
}

function calendarContent() {
  const selectedContext = localStorage.getItem('tribeca-calendar-context') || 'demo';
  return `<div class="calendar-shell"><section class="window-panel"><div class="calendar-toolbar"><button type="button" data-calendar-prev aria-label="Anterior">‹</button><h3 id="calendarMonthLabel">${formatMonth(calendarMonth)}</h3><button type="button" data-calendar-next aria-label="Siguiente">›</button></div><p class="calendar-hint">${tr('clickDateHint')}</p><div class="calendar-grid" id="largeCalendar">${renderCalendarGrid(calendarMonth, selectedContext)}</div><div class="calendar-legend">${legendPill('today', tr('today'))}${legendPill('national', tr('national'))}${legendPill('galicia', tr('galicia'))}${legendPill('local', tr('local'))}${legendPill('school', tr('school'))}${legendPill('personal', tr('personal'))}${legendPill('class', tr('classEvent'))}${legendPill('teacher', tr('teacherEvent'))}</div></section><section class="window-panel"><h3>${tr('calendarUsefulDates')}</h3><div class="form-row"><label>${tr('calendarContext')}</label><select id="calendarContextSelect">${Object.entries(calendarContexts).map(([value, ctx]) => `<option value="${value}" ${value === selectedContext ? 'selected' : ''}>${tr(ctx.labelKey)}</option>`).join('')}</select></div><section class="selected-day-panel"><h3>${tr('selectedDay')}</h3><p class="selected-date"><strong>${formatShortDate(selectedCalendarDate)}</strong></p><div class="item-list">${renderDayEvents(selectedContext, selectedCalendarDate)}</div></section><h3 style="margin-top:1rem;">${tr('nextUsefulDates')}</h3><div class="item-list" id="calendarEventList">${renderCalendarEventList(selectedContext)}</div><hr /><h3>${tr('calendarAddEvent')}</h3><form class="form-grid" id="eventForm"><input type="hidden" name="id" /><div class="form-row"><label>${tr('calendarTitle')} *</label><input name="title" required maxlength="90" placeholder="${tr('eventPlaceholder')}" /></div><div class="form-row"><label>${tr('date')} *</label><input type="date" name="date" required value="${selectedCalendarDate}" /></div><div class="window-grid"><div class="form-row"><label>${tr('visibility')}</label><select name="scope"><option value="personal">${tr('onlyMe')}</option><option value="class">${tr('wholeClass')}</option>${isTeacherRole() ? `<option value="teacher">${tr('allStudentsTeacher')}</option>` : ''}</select></div><div class="form-row"><label>${tr('eventType')}</label><select name="eventType"><option value="personal">${tr('personal')}</option><option value="class">${tr('classEvent')}</option><option value="teacher">${tr('teacherEvent')}</option></select></div></div><button class="primary-btn" type="submit">${tr('saveEvent')}</button></form></section></div>`;
}
function allCalendarEvents() {
  const expanded = [...baseCalendarEvents];
  ranges.forEach(range => eachDate(range.start, range.end).forEach(date => expanded.push({ date, title: range.title, type: range.type, range: true, official: true })));
  return [...expanded.map(e => ({...e, official: true})), ...getUserEvents().filter(e => !e.hidden)];
}
function renderCalendarEventList(contextKey) {
  const today = stripTime(new Date());
  const upcoming = eventsForContext(contextKey).filter(event => parseIso(event.date) >= today).sort((a,b) => parseIso(a.date) - parseIso(b.date)).slice(0, 12);
  if (!upcoming.length) return `<div class="empty-state">${tr('noUpcomingEvents')}</div>`;
  return upcoming.map(renderEventItem).join('');
}
function renderDayEvents(contextKey, isoDate) {
  const events = eventsForContext(contextKey).filter(event => event.date === isoDate).sort((a,b) => eventVisualType(a).localeCompare(eventVisualType(b)));
  if (!events.length) return `<div class="empty-state">${tr('noEventsDay')}</div>`;
  return events.map(renderEventItem).join('');
}
function renderEventItem(event) {
  const canEdit = isTeacherRole() && event.id && !event.official;
  const actions = canEdit ? `<div class="inline-actions calendar-actions"><button class="secondary-btn" type="button" data-edit-event="${escapeHtml(event.id)}">${tr('editEvent')}</button><button class="secondary-btn" type="button" data-hide-event="${escapeHtml(event.id)}">${tr('hideEvent')}</button><button class="danger-btn" type="button" data-delete-event="${escapeHtml(event.id)}">${tr('quickDelete')}</button></div>` : '';
  return `<article class="list-item event-item event-${eventVisualType(event)}" data-event-item="${escapeHtml(event.id || '')}"><strong>${escapeHtml(event.title)}</strong><p class="meta"><i class="day-event-dot event-${eventVisualType(event)}"></i>${formatShortDate(event.date)} · ${translateEventType(event.type)}</p>${isTribecaClosed(event) ? `<p class="closure-note">${tr('tribecaClosed')}</p>` : ''}${actions}</article>`;
}

function bindWindowForms(win, id) {
  const contact = $('#contactForm', win);
  if (contact) contact.addEventListener('submit', handleContactSubmit);
  const eventForm = $('#eventForm', win);
  if (eventForm) eventForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(eventForm).entries()); const items = getUserEvents(); const record = { id: data.id || uid(), date:data.date, title:data.title, type:data.eventType || data.scope || 'personal', scope:data.scope || 'personal', hidden:false, createdAt:new Date().toISOString() }; if (data.id) { const idx = items.findIndex(i => i.id === data.id); if (idx >= 0) items[idx] = { ...items[idx], ...record, updatedAt:new Date().toISOString() }; else items.push(record); } else items.push(record); setUserEvents(items); showToast(tr('eventSaved')); updateCalendarBadge(); rerenderOpenWindows(); });
  const contextSelect = $('#calendarContextSelect', win);
  if (contextSelect) contextSelect.addEventListener('change', event => { localStorage.setItem('tribeca-calendar-context', event.target.value); rerenderOpenWindows(); });
  const prev = $('[data-calendar-prev]', win); const next = $('[data-calendar-next]', win);
  if (prev) prev.addEventListener('click', () => { calendarMonth = addMonths(calendarMonth, -1); rerenderOpenWindows(); });
  if (next) next.addEventListener('click', () => { calendarMonth = addMonths(calendarMonth, 1); rerenderOpenWindows(); });
  $$('.calendar-day[data-date]', win).forEach(day => day.addEventListener('click', () => { selectedCalendarDate = day.dataset.date; calendarMonth = startOfMonth(parseIso(selectedCalendarDate)); rerenderOpenWindows(); }));
  $$('[data-edit-event]', win).forEach(button => button.addEventListener('click', () => { const item = getUserEvents().find(e => e.id === button.dataset.editEvent); const form = $('#eventForm', win); if (!item || !form) return; selectedCalendarDate = item.date; form.elements.id.value = item.id; form.elements.title.value = item.title || ''; form.elements.date.value = item.date; if (form.elements.scope) form.elements.scope.value = item.scope || 'personal'; if (form.elements.eventType) form.elements.eventType.value = item.type || 'personal'; form.scrollIntoView({ block:'center', behavior:'smooth' }); }));
  $$('[data-delete-event]', win).forEach(button => button.addEventListener('click', () => { if (!confirm(tr('confirmDelete'))) return; setUserEvents(getUserEvents().filter(item => item.id !== button.dataset.deleteEvent)); showToast(tr('eventDeleted')); updateCalendarBadge(); rerenderOpenWindows(); }));
  $$('[data-hide-event]', win).forEach(button => button.addEventListener('click', () => { const items = getUserEvents().map(item => item.id === button.dataset.hideEvent ? { ...item, hidden:true, updatedAt:new Date().toISOString() } : item); setUserEvents(items); showToast(tr('eventHidden')); updateCalendarBadge(); rerenderOpenWindows(); }));

  const publicationForm = $('#publicationForm', win);
  if (publicationForm) publicationForm.addEventListener('submit', event => { event.preventDefault(); const fd = new FormData(publicationForm); const data = Object.fromEntries(fd.entries()); data.badgeCodes = fd.getAll('badgeCodes'); const items = getPublicationRecords(); const current = data.id ? items.find(p => p.id === data.id) : null; const record = normalizePublicationRecord(data, current || {}); if (data.id && current) { const index = items.findIndex(p => p.id === data.id); items[index] = record; } else items.unshift(record); setPublicationRecords(items); showToast(tr('publicationSaved')); renderSubjectsGrid?.(); rerenderOpenWindows(); });
  $$('[data-publication-emoji]', win).forEach(button => button.addEventListener('click', () => { const textarea = $('#publicationForm textarea[name="body"]', win); if (!textarea) return; const start = textarea.selectionStart || textarea.value.length; textarea.value = textarea.value.slice(0,start) + button.dataset.publicationEmoji + textarea.value.slice(start); textarea.focus(); }));
  $$('[data-edit-publication]', win).forEach(button => button.addEventListener('click', () => { const item = getPublicationRecords().find(p => p.id === button.dataset.editPublication); const form = $('#publicationForm', win) || (openTool('publicationsManager'), null); if (!item || !form) return; form.elements.id.value = item.id; form.elements.subject.value = item.subject; form.elements.unit.value = item.unit; form.elements.type.value = item.type; form.elements.title.value = item.title; form.elements.body.value = item.body || ''; form.elements.imageUrl.value = item.imageUrl || ''; form.elements.linkUrl.value = item.linkUrl || ''; form.elements.fontSize.value = String(item.fontSize || 16); form.elements.hidden.checked = !!item.hidden; $$('input[name="badgeCodes"]', form).forEach(cb => cb.checked = (item.badgeCodes || []).includes(cb.value)); form.scrollIntoView({ block:'center', behavior:'smooth' }); }));
  $$('[data-delete-publication]', win).forEach(button => button.addEventListener('click', () => { if (!confirm(tr('confirmDelete'))) return; setPublicationRecords(getPublicationRecords().filter(p => p.id !== button.dataset.deletePublication)); showToast(tr('publicationDeleted')); renderSubjectsGrid?.(); rerenderOpenWindows(); }));
  $$('[data-toggle-publication]', win).forEach(button => button.addEventListener('click', () => { const items = getPublicationRecords().map(p => p.id === button.dataset.togglePublication ? { ...p, hidden: !p.hidden, updatedAt:new Date().toISOString() } : p); const hidden = items.find(p => p.id === button.dataset.togglePublication)?.hidden; setPublicationRecords(items); showToast(hidden ? tr('publicationHidden') : tr('publicationVisible')); renderSubjectsGrid?.(); rerenderOpenWindows(); }));
  $$('[data-bulk-hide]', win).forEach(button => button.addEventListener('click', () => { const kind = button.dataset.bulkHide; const value = button.dataset.bulkValue; setPublicationRecords(getPublicationRecords().map(p => p[kind] === value ? { ...p, hidden:true } : p)); showToast(tr('publicationHidden')); rerenderOpenWindows(); }));
  $$('[data-claim-badge]', win).forEach(button => button.addEventListener('click', () => { const pub = getPublicationRecords().find(p => p.id === button.dataset.claimBadge); if (typeof window.requestPublicationBadge === 'function') window.requestPublicationBadge(pub); else { const claims = JSON.parse(localStorage.getItem('tribeca-badge-claims') || '[]'); claims.push({ id:uid(), publicationId:pub?.id, title:pub?.title, badgeCodes:pub?.badgeCodes || [], createdAt:new Date().toISOString() }); localStorage.setItem('tribeca-badge-claims', JSON.stringify(claims)); showToast(tr('badgeClaimSent')); } }));

  const difficultyForm = $('#difficultyForm', win);
  if (difficultyForm) difficultyForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(difficultyForm).entries()); const items = getDifficulties(); if (data.id) { const index = items.findIndex(item => item.id === data.id); if (index >= 0) items[index] = { id: data.id, subject: data.subject, level: data.level, notes: data.notes }; } else { items.push({ id: uid(), subject: data.subject, level: data.level, notes: data.notes }); } setDifficulties(items); localStorage.setItem('tribeca-difficulty-teacher-notice', '1'); showToast(tr('saved')); renderQuickCards(); rerenderOpenWindows(); });
  $$('[data-edit-difficulty]', win).forEach(button => button.addEventListener('click', () => { const item = getDifficulties().find(d => d.id === button.dataset.editDifficulty); const form = $('#difficultyForm', win); if (!item || !form) return; form.elements.id.value = item.id; form.elements.subject.value = item.subject; form.elements.level.value = item.level; form.elements.notes.value = item.notes || ''; }));
  $$('[data-delete-difficulty]', win).forEach(button => button.addEventListener('click', () => { setDifficulties(getDifficulties().filter(item => item.id !== button.dataset.deleteDifficulty)); localStorage.setItem('tribeca-difficulty-teacher-notice', '1'); showToast(tr('deleted')); renderQuickCards(); rerenderOpenWindows(); }));
  const gradeForm = $('#gradeForm', win);
  if (gradeForm) gradeForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(gradeForm).entries()); const items = getGrades(); const record = { id: data.id || uid(), subject: data.subject, unit: data.unit, evaluation: data.evaluation, type: data.type, grade: Number(data.grade), weight: data.weight ? Number(data.weight) : '' }; if (data.id) { const index = items.findIndex(item => item.id === data.id); if (index >= 0) items[index] = record; } else items.push(record); setGrades(items); updateGradeTeacherNotice(items); showToast(tr('saved')); renderQuickCards(); rerenderOpenWindows(); });
  $$('[data-edit-grade]', win).forEach(button => button.addEventListener('click', () => { const item = getGrades().find(g => g.id === button.dataset.editGrade); const form = $('#gradeForm', win); if (!item || !form) return; form.elements.id.value = item.id; form.elements.subject.value = item.subject; form.elements.unit.value = item.unit; form.elements.evaluation.value = item.evaluation; form.elements.type.value = item.type; form.elements.grade.value = item.grade; form.elements.weight.value = item.weight || ''; }));
  $$('[data-delete-grade]', win).forEach(button => button.addEventListener('click', () => { const updated = getGrades().filter(item => item.id !== button.dataset.deleteGrade); setGrades(updated); updateGradeTeacherNotice(updated); showToast(tr('deleted')); renderQuickCards(); rerenderOpenWindows(); }));
  const profileForm = $('#profileForm', win);
  if (profileForm) profileForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(profileForm).entries()); setProfileSettings({ preferredName:data.preferredName || '', icon:data.icon || '💡', email:data.email || '', notify:{ messages:!!data.notifyMessages, calendar:!!data.notifyCalendar, announcements:!!data.notifyAnnouncements, materials:!!data.notifyMaterials } }); showToast(tr('profileSaved')); renderStaticUserTexts(); rerenderOpenWindows(); });
  $$('.icon-choice', win).forEach(button => button.addEventListener('click', () => { const form = $('#profileForm', win); if (!form) return; form.elements.icon.value = button.dataset.avatar; $$('.icon-choice', win).forEach(b => b.classList.remove('is-selected')); button.classList.add('is-selected'); }));
  const chatForm = $('#chatForm', win);
  if (chatForm) chatForm.addEventListener('submit', event => { event.preventDefault(); const input = $('input', chatForm); const value = input.value.trim(); if (!value) return; $('#chatThread', win).insertAdjacentHTML('beforeend', `<div class="chat-bubble me is-new"><strong>${escapeHtml(userDisplayName())}</strong><br />${escapeHtml(value)}</div>`); animateChatEffect(win, value.slice(-2)); input.value = ''; });
  $$('[data-emoji]', win).forEach(button => button.addEventListener('click', () => { const input = $('#chatForm input', win); input.value = `${input.value}${button.dataset.emoji}`; input.focus(); }));
  const touchButton = $('[data-touch]', win);
  if (touchButton) touchButton.addEventListener('click', () => { $('#chatThread', win).insertAdjacentHTML('beforeend', `<div class="chat-bubble me is-new"><strong>${escapeHtml(userDisplayName())}</strong><br />👋 ${tr('waveTouch')}</div>`); animateChatEffect(win, '👋', 1500, true); });
  $$('form', win).forEach(form => { if (['contactForm','eventForm','chatForm','difficultyForm','gradeForm','profileForm','publicationForm'].includes(form.id)) return; form.addEventListener('submit', event => { event.preventDefault(); showToast(tr('preparedSupabase')); }); });
  const contactButton = $('[data-open-contact]', win); if (contactButton) contactButton.addEventListener('click', () => openTool('contact'));
}
