# Tribeca Aula v198 · Fix recursos con assets que no se muestran

## Objetivo

Corrige el caso en el que una publicación aparece creada, pero el recurso embebido queda en blanco aunque se haya subido un ZIP/carpeta con `index.html` y assets.

## Archivos incluidos

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v198-reparar-recursos-con-assets.sql`

## Qué cambia

- Si una publicación no tiene `embed_url`, Tribeca Aula busca automáticamente un HTML embebible dentro de sus adjuntos.
- Si el recurso se subió como paquete completo, se usa el `index.html` del paquete como visor.
- Al guardar una publicación nueva, si hay un paquete con assets en adjuntos, se rellena `embed_url` automáticamente.
- Se evita guardar mientras el ZIP/carpeta aún se está subiendo.
- Si falta el visor, la profesora verá un aviso claro en lugar de un hueco vacío.
- Se actualiza la caché del service worker a v198.

## Instalación

### GitHub

Sustituye:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

### Supabase

Ejecuta una vez:

`supabase/sql/tribeca-aula-v198-reparar-recursos-con-assets.sql`

No hay que tocar VAPID, Edge Functions ni notificaciones.

## Después

Haz Ctrl+F5 en PC. Si el recurso “A arte grega” tenía guardado el paquete como adjunto, debería empezar a verse. Si el SQL devuelve “Revisar: sigue sin visor”, significa que la publicación se guardó sin URL y sin adjunto HTML, y habrá que editarla y volver a subir el ZIP/carpeta completa.
