# Tribeca Aula v186 · clases, multiclase e Izam

## Archivos incluidos

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v186-celia-clases-multiclase-izam.sql`

## Qué corrige y añade

- Quita a Celia Trillo Valbuena de la clase del CPR Plurilingüe Manuela Rial y la deja únicamente en 2.º ESO del IES Agra de Raíces.
- Añade herramientas para quitar manualmente a un alumno de una clase desde su perfil y desde la gestión de clases.
- Corrige la selección de alumnado en clases cuando un alumno pertenece a más de una clase.
- Permite publicar un mismo material en varias clases del mismo nivel/curso a la vez.
- Mantiene la edición segura: editar una publicación no la mueve de aula salvo que se indique expresamente.
- Añade un sistema privado de medallas de unidades para Izam Sánchez.
- Izam verá sus medallas en su pantalla; la profesora puede concederlas desde el perfil de Izam.

## Pasos de instalación

### GitHub web

Sustituir:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

### Supabase

Ejecutar una vez:

`supabase/sql/tribeca-aula-v186-celia-clases-multiclase-izam.sql`

Ruta:

`Supabase > SQL Editor > New query > pegar contenido > Run`

No hay que tocar VAPID ni Edge Functions.
