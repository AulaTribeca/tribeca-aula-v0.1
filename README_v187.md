# Tribeca Aula v187 · Izam: aula simplificada y medallas pendientes

## Archivos incluidos

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

## Qué cambia

- En la pantalla del alumno **Izam Sánchez** ya no aparece el apartado de **Videoclases**.
- Cuando Izam entra en el aula virtual verá únicamente:
  - el saludo inicial;
  - el panel de medallas;
  - su aula de **Técnicas de estudio**.
- El panel de medallas de Izam ya no muestra una lista de futuras medallas con nombres que todavía no están decididos.
- Por ahora solo aparece una medalla pendiente: **Pendiente: medalla Palabras clave**.
- En el perfil docente de Izam también queda disponible solo esa medalla pendiente para concederla cuando corresponda.

## Instalación

En GitHub web, sustituye:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

No hay SQL nuevo. No hay que tocar Supabase, Edge Functions, VAPID ni notificaciones.

Después de subir los archivos, haz `Ctrl + F5` en PC y cierra/reabre la PWA en móvil.
