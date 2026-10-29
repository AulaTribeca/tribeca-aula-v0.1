# Continuación de auditoría · 19/10/2026

## Base verificada

Último commit de main al comenzar: `72850d6a3c7fcff26046f87013d38118e3da5fc3` (v256).
La previsualización v257 de la conversación anterior no corresponde al código publicado.
Esta propuesta v256.1 no convierte esa maqueta en la interfaz definitiva.

## Hallazgos y cambios

1. En Chromium, el acceso publicado mostraba texto y campos a 9,6 px;
   campos de 30 px de alto y enlace de recuperación de 16 px de alto.
   La propuesta establece mínimos de 14 px para texto auxiliar, 16 px para
   campos y 44 px de altura para campos y botones. Respeta ampliaciones superiores.
   Se ajustan espacios y jerarquía del formulario, conservando marca y colores.
   El estado de acceso vacío deja de reservar una franja visual innecesaria;
   los mensajes con contenido siguen visibles y mantienen aria-live.
2. Sin conexión ni caché, `staleWhileRevalidate` podía resolver a null:
   ahora devuelve una Response 503 válida.
3. Documentos de `recursos/` y `assets/ius/presentations/` podían recibir
   index.html en lugar de su material cuando fallaba la red. Solo el punto
   de entrada del aula puede usar ahora esa alternativa.
4. Los fallos de escritura en caché ya no generan rechazos sin gestionar
   ni descartan una respuesta válida de red. La actualización de assets
   mantiene vivo el worker mediante waitUntil.

## Verificación

- Antes del arreglo: tres casos offline fallaban y aparecía un rechazo de
  escritura en caché sin gestionar. Después: ocho pruebas aisladas superadas.
- Doce comprobaciones Playwright superadas sobre el checkout propuesto:
  acceso, tamaño de texto y controles, CSS, teclado, ausencia de desbordamiento,
  navegación por aula/materia/unidad/publicación e interacción con HTML embebido,
  en Chromium escritorio y móvil.
- La navegación interna utiliza exclusivamente el escenario ficticio ya existente.
- Sintaxis JavaScript y diff sin errores.
- Se añade lockfile de las dependencias ya fijadas y CI de la propuesta sin secretos.

No se ha comprobado en esta continuación: cuentas reales, permisos RLS, pagos,
asistencia, progreso persistido, instalación PWA física ni WebKit local.
La batería de worker prueba lógica aislada, no certifica la PWA instalada.

## Contrato de diseño y alcance

Se conserva DESIGN.md: interfaz educativa funcional, encabezados compactos,
fondos claros, contraste, consistencia y adaptación móvil. Sin cambios de
rutas de navegación, anclas, nombres de campos, logotipos ni tokens de marca.
URL nueva: `tribeca-auth-refinement-v256.css?v=256.1`.
Metadato de interfaz: 256.1; caché: tribeca-aula-static-v256-1.

Product Design se ha aplicado en la continuación del 19/10/2026 a las
pantallas públicas de acceso y recuperación, capturadas desde el navegador.
No se ha auditado todavía el panel autenticado.

## Segunda revisión: Product Design

1. Acceso: marca reconocible y acción principal clara; texto excesivamente
   pequeño en la versión publicada. Corregido en esta propuesta.
2. Recuperación: al activar la recuperación permanecían visibles ambos
   formularios. La regla display:grid prevalecía sobre hidden en el formulario
   de acceso. Se añade una regla explícita para hidden y se traslada el foco al
   primer campo del formulario activo, en ambos sentidos.
3. Panel docente/alumno: pendiente de sesión visible autenticada en el navegador.

La nueva regresión de alternancia y foco se ha superado en Chromium escritorio
 y móvil (dos pruebas adicionales). No se ha enviado ninguna solicitud de
recuperación ni modificado ninguna credencial.
URL del script de accesibilidad actualizada: tribeca-ui-accessibility-v253.js?v=256.1.

Pendiente: revisión especializada del panel docente y del alumno, comparación
con la propuesta v257 y pruebas visuales en móvil y escritorio con estados
vacíos, poblados y contenido extenso. La calidad visual global no está certificada.

## Continuación 20/10/2026: teclado en el acceso

El bloqueo visual del fondo no lo excluía del teclado. Se aplica `inert` a
encabezado, contenido, pie y ventanas mientras está activo el acceso, conservando
el estado previo y restaurándolo al salir. El botón de accesibilidad permanece
disponible. No cambian rutas, anclas, etiquetas, campos ni tokens de marca.

Se añaden regresiones para el fondo no enfocable, la disponibilidad del botón
de accesibilidad y la restauración al entrar en el aula ficticia.
Las 8 pruebas aisladas de desconexión vuelven a pasar; sintaxis y diff correctos.
La ejecución E2E local está bloqueada: este entorno no contiene el ejecutable
de Chromium de Playwright. No contabilizar esos intentos como pruebas pasadas.
La validación de navegador queda a cargo del workflow de la propuesta.
Los paneles reales siguen pendientes de sesión autenticada.

## Revisión autenticada del 20/10/2026

Sesión docente confirmada mediante el panel visible tras acceso manual.
Se verificó apertura de una clase y despliegue de materia y unidad, sin editar
datos. La apertura del recurso no se da por verificada: la inspección de pestañas
fue restringida por el navegador después de pulsar Abrir.

Hallazgo: el encabezado indicaba 19–25 de octubre, pero el resumen incluía
26 y 27. La función filtraba desde hoy hasta hoy + 7 días. Se corrige para usar
los límites de lunes a domingo que anuncia el encabezado, incluyendo los días
ya transcurridos de la semana. Los eventos de otras semanas permanecen en el
calendario; no se modifican registros ni permisos.

Siete pruebas de lógica superadas: lunes, martes, domingo/cambio de hora, cambio
de mes y año, exclusión de la semana siguiente sin perder eventos del mismo
día, y semana vacía. Pruebas con datos ficticios y zona Europe/Madrid.
No equivalen a una validación visual del código propuesto.

Versión de interfaz 256.2; URL de script supabase-auth.js?v=256.2; caché
tribeca-aula-static-v256-2. Sin cambios de anclas, etiquetas, campos o marca.
Pendientes: comprobación visual del arreglo, recurso real y perfil de alumno.

## Integración del 26/10/2026 · propuesta v262.1

Se integra main `6bcb9a5a5c45cf48c35fb227377dc474c05554a1` en la propuesta.
Se resuelven los conflictos de index y service worker conservando publicador
v262, recursos didácticos, enlaces LUMEN-V/ITINERA y precarga de Lingua Galega.
Los archivos del publicador y los HTML didácticos no se modifican.

Se recupera el ajuste pendiente del detalle docente: texto auxiliar mínimo
14 px, nombres de materias/materiales 16 px, campos 16 px, controles de 44 px,
etiqueta visible asociada a Nueva unidad y acciones de material en dos columnas
móviles. Los tamaños siguen admitiendo ampliación. Sin cambios de registros.

Validación local sobre la propuesta: 30 casos distintos de Chromium escritorio
 y móvil superados tras corregir la expectativa del test del visor táctil (muestra
el recurso como documento principal, no iframe). Incluye acceso/recuperación,
restauración del teclado, navegación de alumno ficticio, clase docente ficticia,
recurso interactivo y los HTML actuales de Lengua y Lingua Galega. 15 pruebas
Node de fechas y desconexión superadas. Capturas sintéticas revisadas.
Las pruebas de recursos usan la URL base de la propuesta para no confundir una
página publicada con el código que se está comprobando.

No se acredita sesión real actual, Safari/WebKit, PWA instalada ni una auditoría
visual completa. Las capturas usan datos ficticios; no se suben registros privados.

Contrato: nueva etiqueta visible Nombre de la unidad; el nombre de campo title
se conserva. Sin cambios de rutas, anclas, navegación ni tokens de marca.
Versiones: interfaz 262.1; cache tribeca-aula-static-v262-1; script de auth,
accesibilidad y CSS docente con query 262.1. Publicador conserva query 262.
La propuesta continúa en borrador y no se despliega.

## Continuación del 29/10/2026 · propuesta v263.1

Integración de main d6fa7e5, conservando mensualidades privadas v263 y el
recurso de radicales. ResizeObserver actualiza la altura de cabecera al cambiar
su contenido. La nueva aserción de no solapamiento pasa en los cuatro proyectos.

La ejecución 40541698960 superó 55 de 60 casos. Cuatro fallos eran expectativas
obsoletas de versión, sustituidas por comprobaciones de coherencia entre el
script único, su URL en caché y la versión de interfaz. El entorno fijo oficial
Playwright v1.55.1-noble evita reinstalar dependencias de sistema en cada ronda.
La ejecución 40899891537 superó 59 de 60 casos y permitió localizar el fallo
restante: el aviso de instalación PWA interceptaba el botón de recuperación en
WebKit móvil. Se oculta y se vuelve inerte durante auth-locked, restaurando su
estado al salir. Se comprueban ambas fases, además de acceso/recuperación.

La lista PLAN_CALIDAD_TRIBECA.md separa trabajo pendiente y evidencia. Las
pruebas no certifican PWA física, sesiones reales actuales ni accesibilidad
integral. El publicador de HTML/ZIP sigue pendiente como problema general.

Inspección de las cuatro capturas sintéticas de la ejecución 40899891537:
la cabecera ya no tapa el título; el aviso PWA aún cubría contenido al entrar y
los botones secundarios de unidad conservaban estilos nativos diferentes por
navegador. El aviso pasa al flujo normal al final de la página. Los botones
secundarios comparten fondo, borde y tamaños; eliminar mantiene diferenciación
textual/cromática y Crear material conserva la jerarquía principal. En móvil,
las dos acciones secundarias se colocan en dos columnas. Verificación pendiente
en el candidato actualizado; no se han pulsado acciones de modificación real.
