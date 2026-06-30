# Tribeca Aula v180 · Orden de publicaciones y eliminación de promoción automática

## Archivos modificados

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v180-orden-publicaciones.sql`

## Cambios

- Las publicaciones dentro de una unidad se muestran en orden lógico: primero numeración/orden manual y, si no hay orden definido, de más antiguas a más recientes.
- Añade campo **“Numeración / lugar dentro de la unidad”** al crear o editar materiales: `1.1`, `1.1.1`, `2.3`, etc.
- La profesora puede mover publicaciones con flechas ↑/↓ o arrastrarlas dentro de la unidad.
- El orden se guarda en Supabase mediante `sort_order` y `display_order`.
- Se elimina la promoción automática del perfil del alumnado.
- Se elimina el botón “Asignar/promocionar a esta clase” del apartado de clases. Queda solo “Guardar lista de esta clase”.

## Supabase

Ejecutar una vez:

`supabase/sql/tribeca-aula-v180-orden-publicaciones.sql`

Ruta: `Supabase > SQL Editor > New query > pegar > Run`.

## GitHub

Sustituir:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

Después hacer Ctrl + F5 en PC y cerrar/reabrir la PWA en móvil.
