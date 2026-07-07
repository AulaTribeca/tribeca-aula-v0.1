# Tribeca Aula v197 · publicaciones con recursos completos y carpeta de assets

## Archivos incluidos

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v197-storage-recursos-con-assets.sql`

## Qué añade

Esta versión prepara el apartado de publicaciones para que, además de recursos interactivos simples, puedas añadir recursos completos que dependen de una carpeta de assets.

Permite:

- subir un ZIP completo con `index.html` y sus carpetas de assets;
- subir una carpeta completa del recurso;
- subir un HTML principal y una carpeta de assets por separado;
- conservar rutas relativas como `assets/audio.mp3`, `assets/style.css`, `assets/script.js`, imágenes, audios y otros recursos;
- publicar el recurso dentro de una materia como presentación, juego o recurso embebido;
- probar el recurso antes de guardar la publicación.

## Supabase

Ejecutar una vez:

`supabase/sql/tribeca-aula-v197-storage-recursos-con-assets.sql`

El SQL crea el bucket público:

`tribeca-public-assets`

Ese bucket se usa para alojar los archivos del recurso completo. No toca VAPID, Edge Functions ni notificaciones.

## GitHub

Sustituir:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

## Uso recomendado

En el panel docente:

1. Nueva publicación.
2. Selecciona materia, unidad y tipo de publicación.
3. En “Recurso completo con carpeta de assets”, usa una de estas opciones:
   - ZIP del recurso completo;
   - carpeta completa del recurso;
   - HTML principal + carpeta de assets.
4. Espera a que aparezca “Recurso completo subido correctamente”.
5. Pulsa “Probar recurso” si quieres comprobarlo.
6. Publica o guarda cambios.

Para recursos con juegos, audio, imágenes y scripts, esta opción es preferible a pegar HTML en el cuadro de código.
