# Tribeca Aula v175

## Cambios incluidos

- Se elimina el modo verano global de la interfaz.
- El logo de Tribeca Aula queda fijo: no cambia en verano, Halloween, Navidad ni fechas señaladas.
- Se elimina la estética veraniega automática y los iconos de coco, hibisco y ola junto al saludo.
- Las videoclases quedan visibles también para el alumnado aunque todavía no haya ninguna programada.
- En la pantalla principal del alumno aparece el bloque de Videoclases con acceso directo al apartado correspondiente.
- El horario activo deja de depender de un botón global de verano/curso escolar.
- En el perfil del alumno se puede escoger qué horario está activo para ese alumno: curso escolar o verano.
- Los pagos se calculan con el horario activo del alumno concreto.

## Archivos que hay que sustituir en GitHub Web

- `supabase-auth.js`
- `styles.css`
- `service-worker.js`

## Supabase

No hay SQL nuevo.
No hay que tocar Edge Functions.
No hay que tocar VAPID.
No hay que tocar notificaciones push.

## Después de subirlo

- En PC: Ctrl + F5.
- En la PWA móvil: cerrar completamente Tribeca Aula y volver a abrir.
