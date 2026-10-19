# Ensayo aislado de aulas y recursos (fase 1)

**Estado:** propuesta de auditoría, todavía no publicada.

## Qué se ha construido

- Una clase ficticia denominada **Aula ficticia de auditoría**.
- Una materia ficticia (Matemáticas), una unidad de fracciones y dos publicaciones.
- Un documento textual y un HTML interactivo mínimo que permite comprobar la
  carga de un iframe y la respuesta a un clic.
- Los registros se añaden exclusivamente a `window.TribecaAuth.data` en la
  pestaña automatizada. No se insertan en Supabase, no quedan matriculados
  alumnos reales y no se añade ninguna clase al panel docente.
- Para la batería pública, se simula además el usuario sin iniciar sesión ni
  conceder ningún token: el cliente Supabase se desactiva y el acceso a
  `/rest/v1/` queda bloqueado.

## Hallazgo técnico real

La prueba pública inicial de 19/10/2026 recorrió correctamente:
**inicio > clase > materia > unidad > publicación** en Chromium escritorio,
Chromium móvil y WebKit iPad. Sin embargo, los tres navegadores no encontraron
el HTML de un recurso embebido dentro de su iframe.

La inspección de `resource-progress.js` identificó la causa probable:
`injectBridgeIntoHtml` usaba un **cierre de script escapado**
`<\/script>` (caracteres barra invertida + barra), en lugar del
cierre HTML válido `</script>`. Un parser HTML no cierra con él la etiqueta
`script`, y el resto de la página del recurso puede no renderizarse.

Se ha preparado un cambio de **una única expresión de cierre** en
`resource-progress.js`, solamente dentro de esta rama.

Para probarlo **antes de publicarlo**, la batería anónima de Playwright
intercepta exclusivamente la solicitud del archivo `resource-progress.js` de
GitHub Pages y le proporciona el archivo corregido desde el checkout de la rama.
Así el diagnóstico queda aislado y GitHub Pages sigue sin modificaciones.

## Qué sí y qué no prueban estas baterías

Sí:
- Renderizado y navegación por clases, materias y unidades.
- Desplegado de materiales y estado visible.
- Renderizado de contenido HTML y ejecución básica de un botón embebido.
- Chromium de escritorio, Chromium móvil y WebKit iPad en GitHub Actions.

No:
- Autorización y RLS de clases y materiales (la clase es solo de memoria).
- Guardado de progreso, calificaciones, pagos ni asistencia.
- Archivos ZIP con assets externos, PWA instalada o iPhone físico.
- Clases y recursos del alumnado real.

## Criterios para publicar el arreglo

1. El test de iframe debe superar los tres proyectos con el archivo corregido.
2. El archivo corregido debe conservar la sintaxis JavaScript.
3. La solicitud de cambio se revisa y se aprueba antes de fusionar el código.
4. Una vez publicada la corrección, se elimina el interceptor de vista previa
   para que Playwright compruebe el **archivo real** servido desde GitHub Pages.
5. Se contrastan recursos existentes, ZIP y PWA en una prueba autenticada
   posterior, sin alterar sus datos.

El repositorio GitHub es público: las pruebas anónimas pueden mostrar detalles
del HTML sintético, pero nunca autenticaciones, respuestas privadas ni secretos.
