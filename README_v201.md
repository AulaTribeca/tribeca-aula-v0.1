# Tribeca Aula v201 · ZIP/assets robusto

Esta versión corrige el problema de las publicaciones con ZIP/carpeta de assets que se guardaban pero quedaban con el visor en blanco.

## Archivos incluidos

- `supabase-auth.js`
- `service-worker.js`
- `supabase/sql/tribeca-aula-v201-recursos-zip-assets-robusto.sql`
- `README_v201.md`

## Qué cambia

- Si subes un ZIP completo, Tribeca Aula lo sube automáticamente antes de guardar, aunque no haya saltado bien el evento de subida.
- Si por error subes el ZIP en “Archivos adjuntos” y el tipo es Presentación/Juego/Test/Esquema, lo trata como recurso completo.
- No deja guardar presentaciones, juegos, tests, simulacros o esquemas sin visor.
- Rellena `embed_url` con el `index.html` subido.
- Refuerza el bucket público `tribeca-public-assets`.
- Intenta reparar publicaciones antiguas sin visor cuando el HTML sí está en Storage.

## Instalación

### GitHub

Sustituye:

- `supabase-auth.js`
- `service-worker.js`

### Supabase

Ejecuta:

`supabase/sql/tribeca-aula-v201-recursos-zip-assets-robusto.sql`

## Cómo usarlo

1. Edita o crea la publicación.
2. Elige tipo **Presentación** o **Juego**.
3. En “Recurso completo con carpeta de assets”, sube el ZIP completo.
4. Espera a que aparezca “Recurso completo subido correctamente”.
5. Pulsa “Probar recurso”.
6. Guarda la publicación.

Si aun así se usa por error el campo de “Archivos adjuntos”, v201 intentará detectar el ZIP y subirlo como recurso completo antes de guardar.
