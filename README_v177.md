# Tribeca Aula v177 · visor ancho para publicaciones embebidas

## Archivos modificados

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

## Cambios

- Las publicaciones abiertas en pestaña nueva con presentaciones, HTML embebido, iframes, vídeos, esquemas o simulacros pasan a usar un ancho amplio en escritorio: hasta `min(96vw, 1480px)`.
- En móvil se conserva el comportamiento estrecho y cómodo, ocupando solo el ancho propio del dispositivo.
- Los iframes embebidos ganan altura útil en escritorio para aprovechar mejor la pantalla.
- Se actualiza la caché del service worker a v177 para forzar la recarga de estilos y visor.

## Instalación

Sustituir en GitHub Web:

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

No requiere Supabase, SQL, VAPID ni Edge Functions.
