# Tribeca Aula v176 · Fix desplegable A miña conta en web

Esta versión corrige el desplegable de **A miña conta / Mi cuenta** en la versión web de escritorio.

## Archivos modificados

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

## Qué corrige

- El menú deja de abrirse en la esquina izquierda de la pantalla.
- El menú queda anclado bajo el botón **A miña conta / Mi cuenta**.
- Se mantiene el comportamiento modal en móvil.
- Se actualiza la caché del service worker a v176 para que el cambio se cargue correctamente en la PWA y en la web.

## Instalación

Sustituir los tres archivos en GitHub Web y esperar al despliegue. Después hacer Ctrl + F5 en PC y cerrar/reabrir la PWA si hiciera falta.

No requiere Supabase, SQL, VAPID ni Edge Functions.
