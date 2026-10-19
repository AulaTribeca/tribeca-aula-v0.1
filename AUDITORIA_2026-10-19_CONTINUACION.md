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
