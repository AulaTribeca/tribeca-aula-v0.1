# Tribeca Aula v181 · Promoción automática, actividad y documentos

## Archivos incluidos

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v181-promocion-actividad-documentos.sql`

## Qué hace

- Crea columnas seguras para ocultar o retirar intentos de ejercicios autocorregibles sin perder el registro interno.
- Añade filtros en **Actividad del alumnado** por alumno, materia y unidad.
- Añade botones para ocultar o retirar intentos concretos del histórico visible.
- Añade documentos por alumno: pago mensual, histórico de pagos, asistencia mensual, histórico de asistencia, dossier mensual e histórico de ejercicios.
- Añade promoción automática al curso siguiente dentro del mismo centro educativo.
- Crea las clases necesarias para el curso académico `2026/27`.
- Evita sobrepromocionar alumnado que ya haya sido asignado manualmente a una clase activa `2026/27`.
- Fuerza el caso de Gorka a `1.º Bachillerato` en el centro Fernando Blanco.

## Instalación

### GitHub web

Sustituir:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

### Supabase

Ejecutar una sola vez:

`supabase/sql/tribeca-aula-v181-promocion-actividad-documentos.sql`

Ruta:

`Supabase > SQL Editor > New query > pegar contenido > Run`

## Importante

El SQL ejecuta la promoción una vez al final. También deja creada la función:

`tribeca_promote_all_students_next_course_v181('2026/27')`

para que puedas repetir la promoción desde el botón nuevo de Tribeca Aula si fuese necesario.

No hay que tocar VAPID, Edge Functions ni notificaciones push.
