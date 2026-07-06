# Tribeca Aula v196 · Fix juego Izam material 1.3 visible

## Qué corrige

- Repara el material `1.3` de Izam si se abrió en blanco.
- Fuerza el material a tipo `presentacion`.
- Usa URL absoluta de GitHub Pages para evitar que una ventana `about:blank` resuelva mal la ruta relativa.
- Oculta duplicados antiguos como `1.3. Reto final` dentro de la misma unidad.
- Mantiene la carpeta completa del juego v21.5 random.

## GitHub Desktop

Copia el contenido del ZIP encima de tu repositorio local y acepta combinar/reemplazar.

Elementos relevantes:

- `service-worker.js`
- `assets/izam/tecnicas-estudio/unidad-1/gimnasio-1-pueblo-palabra/`
- `supabase/sql/tribeca-aula-v196-fix-izam-juego-material-1-3-visible.sql`

Haz commit y push.

## Supabase

Ejecuta una vez:

`supabase/sql/tribeca-aula-v196-fix-izam-juego-material-1-3-visible.sql`

No ejecutes otra vez el SQL de la v195.

## Comprobación

Primero abre directamente:

`https://aulatribeca.github.io/tribeca-aula-v0.1/assets/izam/tecnicas-estudio/unidad-1/gimnasio-1-pueblo-palabra/index.html`

Después abre el material 1.3 en el aula de Izam.
