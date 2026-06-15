# Tribeca Aula v169 · IUS para Carla Caamaño

## Qué incluye

Esta versión añade un nuevo tipo de publicación dentro de materiales de materias:

- **🖥️ Presentación**, para embeber y visualizar dentro de Tribeca Aula presentaciones tipo PowerPoint, Canva, Genially, Google Slides o HTML.

También deja preparada la materia privada:

- **⚖️ IUS: iniciación al Derecho y latinismos jurídicos**
- Clase privada visible únicamente para Carla Caamaño.
- Primera tanda de publicaciones ya sembrada por SQL.
- Tres presentaciones HTML vistosas y embebibles.

## Archivos para GitHub

Sustituir/subir en GitHub:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `assets/ius/presentations/ius-01-bienvenida.html`
- `assets/ius/presentations/ius-02-de-facto-de-iure.html`
- `assets/ius/presentations/ius-03-fuentes-derecho.html`

## Supabase obligatorio

Ejecutar una sola vez en Supabase SQL Editor:

- `supabase/sql/tribeca-aula-v169-ius-carlasolo-presentaciones.sql`

Ese SQL crea o revisa:

- tipo `presentacion` en `subject_materials`;
- clase privada IUS;
- asignación única de Carla Caamaño;
- materia IUS;
- tres unidades;
- ocho publicaciones iniciales.

## Importante

No hay que tocar VAPID.
No hay que cambiar Edge Functions.
No hay que modificar las notificaciones push.

Si el SQL no encuentra a Carla Caamaño, no crea nada y muestra un error claro para revisar el nombre del perfil en `profiles`.
