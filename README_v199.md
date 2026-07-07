# Tribeca Aula v199 · reparación de recursos con assets en blanco

Esta versión corrige el problema detectado en la publicación **“A arte grega”**: la publicación se creó como presentación, pero quedó sin `embed_url`, por eso en el aula aparecía un hueco en blanco.

## Archivos incluidos

- `supabase-auth.js`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v199-reparar-a-arte-grega-y-bloquear-blancos.sql`
- `README_v199.md`

## Instalación en GitHub

Sustituye en GitHub/GitHub Desktop:

- `supabase-auth.js`
- `service-worker.js`

Después haz commit y push.

## Instalación en Supabase

Ejecuta una vez:

`supabase/sql/tribeca-aula-v199-reparar-a-arte-grega-y-bloquear-blancos.sql`

Ruta: **Supabase > SQL Editor > New query > pegar contenido > Run**.

## Qué cambia

- Si subes un ZIP/carpeta completa, Tribeca guarda también el `index.html` en memoria y en el formulario para que no se pierda al publicar.
- Si una publicación es **Presentación**, **Juego**, **Vídeo**, **Test**, **Simulacro** o **Esquema**, ya no se deja guardar sin visor.
- Si el recurso está marcado como interactivo, Tribeca exigirá URL, iframe, código HTML/JSON o paquete ZIP/carpeta subido correctamente.
- El SQL intenta reparar **A arte grega** buscando el HTML subido en Supabase Storage y vinculándolo a la publicación.

## Si el SQL dice que no encontró HTML

Significa que el ZIP/carpeta no se subió realmente a Storage, o que no contenía un archivo `.html` localizable. En ese caso, edita la publicación y vuelve a subir el ZIP completo desde el bloque **Recurso completo con carpeta de assets**. Espera a ver el mensaje **“Recurso completo subido correctamente”** antes de pulsar **Guardar/Publicar**.
